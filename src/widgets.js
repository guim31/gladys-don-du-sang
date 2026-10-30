// -----------------------------------------------------------------------------
// The "Blood drives" widget: the next drive days of the zone in a period,
// soonest first: place and city, day and hours, distance; a badge for the
// online appointment (setting `show_booking`); a tap opens the address, the
// hours and the booking link.
//
// Budget of the core: an optional caption (setting `show_count`), one
// card-list of 8 rows at most (the core's cap for a list), and one body text
// only when there is something to explain.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { PERIODS, inPeriod } from './collections.js';
import {
  PERIOD_LABELS,
  TEXT,
  bookingText,
  formatKm,
  formatWhen,
  pick,
  placeText,
} from './messages.js';
import { WIDGET_KEY } from './service.js';
import { EFS_SITE } from './source.js';
import { truncate } from './text.js';
import { localParts } from './time.js';

export const DEFAULT_PERIOD = 'month';
/** Rows of a `list` card-list: the core's cap. */
export const MAX_ROWS = 8;
/** The dates are relative ("tomorrow"): re-pulled every quarter of an hour. */
const TTL_SECONDS = 900;

function row(occurrence, language, today, showBooking) {
  const text = pick(TEXT, language);
  const when = formatWhen(occurrence, language, today);
  const away = text.away(formatKm(occurrence.distance, language));
  const item = {
    title: truncate(placeText(occurrence), 60),
    subtitle: truncate(`${when} · ${away}`, 60),
    description: truncate(
      [occurrence.address, when, away, bookingText(occurrence, language)]
        .filter(Boolean)
        .join('\n'),
      2000,
    ),
    links: [
      occurrence.url
        ? { url: occurrence.url, label: text.book }
        : { url: EFS_SITE, label: text.efsSite },
    ],
  };
  if (showBooking && occurrence.booking) {
    item.badge = {
      text: occurrence.placesLeft === 0 ? text.badgeFull : text.badge,
      color: occurrence.placesLeft === 0 ? WIDGET_COLORS.WARNING : WIDGET_COLORS.SUCCESS,
    };
  }
  return item;
}

async function upcomingContent(service, { settings = {}, language = 'en' }) {
  await service.firstReading();
  const text = pick(TEXT, language);
  const message = (key, ttl = TTL_SECONDS) => ({
    version: 1,
    ttl_seconds: ttl,
    components: [{ type: 'text', variant: 'body', text: text[key] }],
  });
  if (!service.position()) {
    return message('noPosition');
  }
  const collections = service.zoneCollections();
  if (collections === null) {
    return message(service.error ? 'noData' : 'loading', 60);
  }
  const now = service.now();
  const today = localParts(now).date;
  const period = PERIODS.includes(settings.period) ? settings.period : DEFAULT_PERIOD;
  const selected = inPeriod(collections, period, now);
  const components = [];
  if (settings.show_count !== false) {
    components.push({
      type: 'text',
      variant: 'caption',
      text: truncate(
        `${pick(PERIOD_LABELS, language)[period]} · ${text.count(selected.length)}`,
        80,
      ),
    });
  }
  if (selected.length > 0) {
    components.push({
      type: 'card-list',
      display: 'list',
      items: selected
        .slice(0, MAX_ROWS)
        .map((occurrence) => row(occurrence, language, today, settings.show_booking !== false)),
    });
  } else {
    components.push({ type: 'text', variant: 'body', text: text.nothing });
  }
  if (service.error && selected.length > 0) {
    components.push({ type: 'text', variant: 'body', text: text.unavailable });
  }
  return { version: 1, ttl_seconds: TTL_SECONDS, components };
}

export const WIDGETS = {
  [WIDGET_KEY]: { get: upcomingContent },
};
