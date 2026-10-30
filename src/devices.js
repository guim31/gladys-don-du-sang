// -----------------------------------------------------------------------------
// The one Gladys device of the integration, the zone (around the house or the
// point entered), and its states:
//   week           counter-sensor/integer   drive days in the next 7 days
//   month          counter-sensor/integer   drive days in the next 30 days
//   next_place     text/text                place of the next drive, city
//   next_date      text/text                its day and hours
//   next_distance  distance-sensor/decimal  its distance, km
//   next_booking   text/text                online appointment, slots free
//
// Read-only, no polling: the integration reads the EFS on its own timer
// (src/service.js), Gladys never polls (`should_poll: false`).
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as C,
  DEVICE_FEATURE_TYPES as T,
} from '@gladysassistant/integration-sdk';
import { inPeriod, upcoming } from './collections.js';
import { NAMES, TEXT, bookingText, formatWhen, pick, placeText } from './messages.js';
import { truncate } from './text.js';
import { localParts } from './time.js';

export const AREA_TYPE = 'area';
export const AREA_ID = 'main';
export const MAX_COUNT = 10000;
export const MAX_DISTANCE = 100;
const MAX_TEXT = 200;

export const FEATURE_KEYS = [
  'week',
  'month',
  'next_place',
  'next_date',
  'next_distance',
  'next_booking',
];

function featureOf(key) {
  if (key === 'week' || key === 'month') {
    return { category: C.COUNTER_SENSOR, type: T.SENSOR.INTEGER, min: 0, max: MAX_COUNT };
  }
  if (key === 'next_distance') {
    return {
      category: C.DISTANCE_SENSOR,
      type: T.SENSOR.DECIMAL,
      unit: 'km',
      min: 0,
      max: MAX_DISTANCE,
    };
  }
  return { category: C.TEXT, type: T.TEXT.TEXT, min: 0, max: 0 };
}

/** The device of the zone. */
export function buildAreaDevice(gladys, language) {
  const ids = gladys.externalIds(AREA_TYPE, AREA_ID);
  const names = pick(NAMES, language);
  return {
    name: names.device,
    external_id: ids.device,
    should_poll: false,
    features: FEATURE_KEYS.map((key) => ({
      name: names[key],
      external_id: ids.feature(key),
      ...featureOf(key),
      read_only: true,
      has_feedback: false,
    })),
  };
}

/**
 * The states of the zone device. Without a next drive, the distance is not
 * published (no fake 0 km): the place says "None".
 * @param {object[]} occurrences the drive days of the zone
 */
export function areaStates(gladys, occurrences, language, now) {
  const ids = gladys.externalIds(AREA_TYPE, AREA_ID);
  const none = pick(TEXT, language).none;
  const today = localParts(now).date;
  const next = upcoming(occurrences, now)[0];
  const values = {
    week: Math.min(MAX_COUNT, inPeriod(occurrences, 'week', now).length),
    month: Math.min(MAX_COUNT, inPeriod(occurrences, 'month', now).length),
    next_place: next ? truncate(placeText(next), MAX_TEXT) : none,
    next_date: next ? truncate(formatWhen(next, language, today), MAX_TEXT) : none,
    next_distance: next ? Math.min(MAX_DISTANCE, Math.round(next.distance * 10) / 10) : null,
    next_booking: next ? truncate(bookingText(next, language), MAX_TEXT) : none,
  };
  return FEATURE_KEYS.filter((key) => values[key] !== null).map((key) =>
    typeof values[key] === 'string'
      ? { device_feature_external_id: ids.feature(key), text: values[key] }
      : { device_feature_external_id: ids.feature(key), state: values[key] },
  );
}
