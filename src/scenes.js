// -----------------------------------------------------------------------------
// Scene actions (manifest `scene_actions`, Gladys 5.1+).
//
// - collections_summary: the drives of a period (the next 7 days by default)
//   in one sentence ready for a message or a speaker ("7 prochains jours :
//   2 collectes de sang près de chez toi, SALLE DES FÊTES, MURET (demain,
//   10:00–13:30, à 12,3 km) et …"), with the number of drive days for a
//   "Continue only if" step.
//
// A scene action does not receive the user's language: the sentence follows
// the `language` of the configuration. Outputs are numbers or strings, never
// booleans: the core's "Continue only if" compares with ===.
// -----------------------------------------------------------------------------

import { PERIODS, inPeriod } from './collections.js';
import { PERIOD_LABELS, TEXT, formatKm, formatWhen, pick, placeText } from './messages.js';
import { EFS_SITE } from './source.js';
import { truncate } from './text.js';
import { localParts } from './time.js';

export class SceneError extends Error {}

export const SUMMARY_DEFAULTS = Object.freeze({ period: 'week', max_items: 3 });
export const SUMMARY_MAX_ITEMS = 10;
const MAX_SENTENCE = 1000;

function maxItems(value) {
  const number = Math.round(Number(value));
  if (value === '' || value === null || value === undefined || !Number.isFinite(number)) {
    return SUMMARY_DEFAULTS.max_items;
  }
  return Math.min(SUMMARY_MAX_ITEMS, Math.max(1, number));
}

/** "SALLE DES FÊTES, MURET (demain, 10:00–13:30, à 12,3 km)". */
function mention(occurrence, language, today) {
  const text = pick(TEXT, language);
  const details = [
    formatWhen(occurrence, language, today),
    text.away(formatKm(occurrence.distance, language)),
  ];
  return `${truncate(placeText(occurrence), 90)} (${details.join(', ')})`;
}

export const SCENE_ACTIONS = {
  async collections_summary(service, { fields = {} }) {
    const language = service.config.language;
    const text = pick(TEXT, language);
    await service.firstReading();
    if (!service.position()) {
      throw new SceneError(text.noPosition);
    }
    const collections = service.zoneCollections();
    if (collections === null) {
      throw new SceneError(text.noData);
    }
    const now = service.now();
    const today = localParts(now).date;
    const period = PERIODS.includes(fields.period) ? fields.period : SUMMARY_DEFAULTS.period;
    const label = pick(PERIOD_LABELS, language)[period];
    const selected = inPeriod(collections, period, now);
    if (selected.length === 0) {
      return {
        summary: text.summaryNone(label),
        count: 0,
        next_place: '',
        next_date: '',
        next_url: '',
      };
    }
    const shown = selected.slice(0, maxItems(fields.max_items));
    const parts = shown.map((occurrence) => mention(occurrence, language, today));
    const rest = selected.length - shown.length;
    if (rest > 0) {
      parts.push(text.others(rest));
    }
    const list =
      parts.length > 1 ? `${parts.slice(0, -1).join(', ')} ${text.and} ${parts.at(-1)}` : parts[0];
    const first = selected[0];
    return {
      summary: truncate(text.summarySome(label, selected.length, list), MAX_SENTENCE),
      count: selected.length,
      next_place: placeText(first),
      next_date: formatWhen(first, language, today),
      next_url: first.url ?? EFS_SITE,
    };
  },
};
