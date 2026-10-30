// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

/** Radius of the zone, in kilometres (select values, never rename). */
export const RADII = ['5', '10', '20', '30', '50'];

export const DEFAULT_CONFIG = {
  latitude: '',
  longitude: '',
  radius: '20',
  language: 'fr',
};

/**
 * A coordinate typed by the user ("43.6", "43,6", " 1.44 "), or null when
 * empty or out of range.
 */
export function parseCoordinate(value, limit) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim().replace(',', '.');
  if (!/^[+-]?\d{1,3}(\.\d+)?$/.test(text)) {
    return null;
  }
  const number = Number(text);
  return Math.abs(number) <= limit ? number : null;
}

/**
 * @param {Record<string, unknown>} raw the configuration returned by the SDK
 * @returns {{ point: { lat: number, lon: number } | null, pointError: boolean,
 *   radiusKm: number, language: string }}
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const lat = parseCoordinate(source.latitude, 90);
  const lon = parseCoordinate(source.longitude, 180);
  const typed = [source.latitude, source.longitude].some(
    (value) => value !== undefined && value !== null && String(value).trim() !== '',
  );
  const radius = RADII.includes(String(source.radius))
    ? String(source.radius)
    : DEFAULT_CONFIG.radius;
  return {
    // Both coordinates or none: the house of Gladys is used otherwise.
    point: lat !== null && lon !== null ? { lat, lon } : null,
    // Something typed but not usable: said by the "Check" action.
    pointError: typed && (lat === null || lon === null),
    radiusKm: Number(radius),
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
  };
}
