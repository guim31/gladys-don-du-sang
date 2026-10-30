// -----------------------------------------------------------------------------
// The drive days (occurrences, see src/source.js) against the clock: which are
// still to come, which fall in a period.
// -----------------------------------------------------------------------------

import { addDays, localParts, zonedInstant } from './time.js';

/** The periods of the widget and of the scene action. Never rename. */
export const PERIODS = ['today', 'tomorrow', 'week', 'month'];

/** The end of a drive day: its last slot, midnight when the hours are unknown. */
export function endOf(occurrence) {
  const last = occurrence.slots.at(-1);
  if (!last) {
    return zonedInstant(addDays(occurrence.date, 1));
  }
  const [hour, minute] = last[1].split(':').map(Number);
  return zonedInstant(occurrence.date, hour, minute);
}

/** The drive days not over yet, soonest first. */
export const upcoming = (occurrences, now) =>
  occurrences.filter((occurrence) => endOf(occurrence) > now);

/** The first and last day (included) of a period, local dates. */
export function periodDays(period, now) {
  const today = localParts(now).date;
  switch (period) {
    case 'today':
      return [today, today];
    case 'tomorrow':
      return [addDays(today, 1), addDays(today, 1)];
    case 'week':
      return [today, addDays(today, 6)];
    default:
      return [today, addDays(today, 29)];
  }
}

/** The drive days of a period still to come, soonest first. */
export function inPeriod(occurrences, period, now) {
  const [from, to] = periodDays(period, now);
  return upcoming(occurrences, now).filter(
    (occurrence) => occurrence.date >= from && occurrence.date <= to,
  );
}
