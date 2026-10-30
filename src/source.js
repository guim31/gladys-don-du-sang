// -----------------------------------------------------------------------------
// The blood donation drives of the Établissement français du sang (EFS), from
// its public map API ("API Carto" v3, the one behind dondesang.efs.sante.fr,
// listed on data.gouv.fr under the Licence Ouverte 2.0). No account, no key.
//
// One request per reading: `samplingcollection/searchinsquare` over the square
// around the zone, from today on, without end date: a drive day entering a
// sliding window would look newly announced every day (about ten weeks are
// published ahead). The answer groups the drives by
// place (`samplingLocationCollections`); a drive (`collections[]`) holds its
// first session, and `children[]` the other half-days or days. They are
// flattened here into one entry per place and day ("occurrence").
//
// Two traps of the API, measured on 2026-10-30:
// - `HidePrivateCollects=true` also drops public drives (a village hall in
//   the Toulouse area): the drives reserved to a company, a school or an army
//   unit are dropped here instead, on `isPublic`.
// - Without `Limit`, the answer stops at an arbitrary number of places.
// -----------------------------------------------------------------------------

export const API_URL =
  'https://oudonner.api.efs.sante.fr/carto-api/v3/samplingcollection/searchinsquare';
export const EFS_SITE = 'https://dondesang.efs.sante.fr/trouver-une-collecte';
export const PLACE_LIMIT = 500;
// Measured on 2026-10-30: 1.7 s around Toulouse, 55 to 60 s (650 to 850 kB) around Paris.
const TIMEOUT_MS = 120000;
const KM_PER_DEGREE = 111.32;

const DATE = /^(\d{4}-\d{2}-\d{2})T/;
const TIME = /^(\d{2}):(\d{2})/;

/** The square around a point: `radiusKm` to each side. */
export function squareAround({ lat, lon }, radiusKm) {
  const dLat = radiusKm / KM_PER_DEGREE;
  const dLon = radiusKm / (KM_PER_DEGREE * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  const round = (value) => Math.round(value * 1e5) / 1e5;
  return {
    north: round(Math.min(90, lat + dLat)),
    south: round(Math.max(-90, lat - dLat)),
    east: round(lon + dLon),
    west: round(lon - dLon),
  };
}

/**
 * The centre sent to the EFS: rounded to 0.01° (about a kilometre), so the
 * request does not carry the exact position of the house. The square is
 * widened by the rounding; the distances are computed here, exactly.
 */
export const fuzzyCentre = ({ lat, lon }) => ({
  lat: Math.round(lat * 100) / 100,
  lon: Math.round(lon * 100) / 100,
});
const FUZZ_KM = 1;

/** The request of a reading. */
export function requestUrl(point, radiusKm, today) {
  const centre = fuzzyCentre(point);
  const square = squareAround(centre, radiusKm + FUZZ_KM);
  const params = new URLSearchParams({
    NorthEastLatitude: String(square.north),
    NorthEastLongitude: String(square.east),
    SouthWestLatitude: String(square.south),
    SouthWestLongitude: String(square.west),
    UserLatitude: String(centre.lat),
    UserLongitude: String(centre.lon),
    MinDate: today,
    Limit: String(PLACE_LIMIT),
  });
  return `${API_URL}?${params}`;
}

/** Great-circle distance in kilometres. */
export function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const text = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);
const hhmm = (value) => {
  const match = TIME.exec(value ?? '');
  return match ? `${match[1]}:${match[2]}` : null;
};
const count = (value) => (Number.isInteger(value) && value >= 0 ? value : null);

/** The booking link of the EFS (written without scheme in the answer). */
function bookingUrl(value) {
  const url = text(value);
  if (!url || url.length > 300) {
    return null;
  }
  const full = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    return new URL(full).protocol === 'https:' ? full : null;
  } catch {
    return null;
  }
}

/** The half-day slots of a session: [['10:00', '13:30'], ['14:30', '19:00']]. */
function slotsOf(session) {
  const slots = [];
  for (const [start, end] of [
    [session.morningStartTime, session.morningEndTime],
    [session.afternoonStartTime, session.afternoonEndTime],
  ]) {
    const from = hhmm(start);
    const to = hhmm(end);
    if (from && to && from < to) {
      slots.push([from, to]);
    }
  }
  return slots;
}

/**
 * The occurrences (one per place and day) of an answer of the API, public
 * drives only, sorted by day then first slot.
 * @param {unknown} body the parsed JSON answer
 */
export function parseAnswer(body) {
  const places = body?.samplingLocationCollections;
  if (!Array.isArray(places)) {
    throw new Error('unexpected answer (no samplingLocationCollections)');
  }
  const byId = new Map();
  for (const place of places) {
    const lat = Number(place?.latitude);
    const lon = Number(place?.longitude);
    const placeCode = [text(place?.groupCode), text(String(place?.samplingLocationCode ?? ''))];
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || placeCode.includes(null)) {
      continue;
    }
    for (const drive of Array.isArray(place.collections) ? place.collections : []) {
      // Reserved to the staff of a company, a school, a unit: not for us.
      if (drive?.isPublic !== true || drive.isPublishable === false) {
        continue;
      }
      const firstDate = DATE.exec(drive.date ?? '')?.[1];
      const sessions = [drive, ...(Array.isArray(drive.children) ? drive.children : [])];
      for (const session of sessions) {
        const date = DATE.exec(session?.date ?? '')?.[1];
        if (!date) {
          continue;
        }
        const id = `${placeCode.join('-')}-${date}`;
        let occurrence = byId.get(id);
        if (!occurrence) {
          occurrence = {
            id,
            date,
            slots: [],
            place: text(place.name) ?? text(place.convocationLabel) ?? text(place.city) ?? '?',
            city: text(place.city) ?? text(place.ville),
            postCode: text(place.postCode),
            address: text(place.fullAddress),
            lat,
            lon,
            booking: drive.proposePlanningRdv === true,
            url: bookingUrl(drive.urlBlood),
            placesLeft: null,
            placesTotal: null,
          };
          byId.set(id, occurrence);
        }
        occurrence.slots.push(...slotsOf(session));
        // The places are counted on the drive, read on its first day.
        if (date === firstDate && count(drive.nbPlacesTotalesST)) {
          occurrence.placesLeft = count(drive.nbPlacesRestantesST);
          occurrence.placesTotal = count(drive.nbPlacesTotalesST);
        }
        occurrence.booking ||= drive.proposePlanningRdv === true;
        occurrence.url ??= bookingUrl(drive.urlBlood);
      }
    }
  }
  const occurrences = [...byId.values()];
  for (const occurrence of occurrences) {
    const unique = new Map(occurrence.slots.map((slot) => [slot.join('-'), slot]));
    occurrence.slots = [...unique.values()].sort((a, b) => a[0].localeCompare(b[0]));
  }
  return occurrences.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || (a.slots[0]?.[0] ?? '').localeCompare(b.slots[0]?.[0] ?? ''),
  );
}

/**
 * Reads the drives around a point, within `radiusKm`, each with its distance.
 * @param {typeof fetch} fetchFn
 * @param {{ lat: number, lon: number }} point
 * @param {number} radiusKm
 * @param {string} today 'YYYY-MM-DD', local
 */
export async function readCollections(fetchFn, point, radiusKm, today) {
  const response = await fetchFn(requestUrl(point, radiusKm, today), {
    headers: { accept: 'application/json', 'user-agent': 'gladys-don-du-sang' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`EFS API: HTTP ${response.status}`);
  }
  const occurrences = parseAnswer(await response.json());
  return occurrences
    .map((occurrence) => ({ ...occurrence, distance: distanceKm(point, occurrence) }))
    .filter((occurrence) => occurrence.distance <= radiusKm);
}
