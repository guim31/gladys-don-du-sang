// -----------------------------------------------------------------------------
// Local time. The EFS publishes calendar dates and wall-clock hours, without
// offset, in the time of the place (mainland France or overseas): they are
// read in the time zone of Gladys (TZ, injected by the supervisor), Paris when
// it is missing. Instants are milliseconds; calendar dates are 'YYYY-MM-DD'
// strings, whose arithmetic runs on UTC midnights (no 23- or 25-hour day).
// -----------------------------------------------------------------------------

export const DEFAULT_TIME_ZONE = 'Europe/Paris';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

const WEEKDAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const formatters = new Map();

/** The time zone of Gladys, Paris when unset or unknown. */
export function timeZone() {
  const zone = process.env.TZ;
  if (zone && !formatters.has(zone)) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: zone });
    } catch {
      return DEFAULT_TIME_ZONE;
    }
  }
  return zone || DEFAULT_TIME_ZONE;
}

function partsFormatter() {
  const zone = timeZone();
  if (!formatters.has(zone)) {
    formatters.set(
      zone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
        hourCycle: 'h23',
      }),
    );
  }
  return formatters.get(zone);
}

/**
 * The calendar date, ISO weekday (1 = Monday) and time of an instant.
 * @param {number} instant
 * @returns {{ date: string, weekday: number, hour: number, minute: number }}
 */
export function localParts(instant) {
  const parts = Object.fromEntries(
    partsFormatter()
      .formatToParts(new Date(instant))
      .map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS[parts.weekday],
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

/** The date `days` days after `date` (before it when negative). */
export function addDays(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` ('YYYY-MM-DD'). */
export const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/**
 * The instant of a wall-clock time. Two passes on the offset cover the
 * daylight saving changes; a time skipped in spring lands an hour later, a
 * repeated one in autumn on its first occurrence.
 * @param {string} date 'YYYY-MM-DD'
 * @param {number} [hour]
 * @param {number} [minute]
 */
export function zonedInstant(date, hour = 0, minute = 0) {
  const wall = Date.parse(`${date}T00:00:00Z`) + hour * HOUR_MS + minute * 60_000;
  let instant = wall;
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = localParts(instant);
    const seen =
      Date.parse(`${parts.date}T00:00:00Z`) + parts.hour * HOUR_MS + parts.minute * 60_000;
    instant += wall - seen;
  }
  return instant;
}
