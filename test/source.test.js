// -----------------------------------------------------------------------------
// The EFS answer (the real one of test/fixtures/efs-toulouse.json): the
// request, the drives flattened into drive days, what is dropped, the radius.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, parseCoordinate } from '../src/config.js';
import {
  PLACE_LIMIT,
  distanceKm,
  parseAnswer,
  readCollections,
  requestUrl,
  squareAround,
} from '../src/source.js';
import { HOUSE, createFetch, fixture } from './helpers/world.js';

const home = { lat: HOUSE.latitude, lon: HOUSE.longitude };

test('the request: the square around the zone, from today, every place, no hidden drive', () => {
  const url = new URL(requestUrl(home, 20, '2026-10-30'));
  assert.equal(url.host, 'oudonner.api.efs.sante.fr');
  assert.equal(url.pathname, '/carto-api/v3/samplingcollection/searchinsquare');
  const params = Object.fromEntries(url.searchParams);
  assert.equal(params.MinDate, '2026-10-30');
  // No end date: a drive entering a sliding window is not a new one.
  assert.equal(params.MaxDate, undefined);
  // It also drops public drives: filtered on isPublic instead.
  assert.equal(params.HidePrivateCollects, undefined);
  assert.equal(params.Limit, String(PLACE_LIMIT));
  const square = squareAround(home, 21);
  assert.equal(Number(params.NorthEastLatitude), square.north);
  assert.ok(Math.abs(distanceKm(home, { lat: square.north, lon: home.lon }) - 21) < 0.1);
  assert.ok(Math.abs(distanceKm(home, { lat: home.lat, lon: square.east }) - 21) < 0.1);
});

test('the exact position of the house never leaves: the centre sent is rounded', () => {
  const house = { lat: 43.604512, lon: 1.444087 };
  const url = new URL(requestUrl(house, 5, '2026-10-30'));
  assert.equal(url.searchParams.get('UserLatitude'), '43.6');
  assert.equal(url.searchParams.get('UserLongitude'), '1.44');
  assert.ok(!url.href.includes('604512') && !url.href.includes('444087'));
  // The square still covers the radius around the exact position.
  const square = squareAround(house, 5);
  assert.ok(Number(url.searchParams.get('NorthEastLatitude')) >= square.north);
  assert.ok(Number(url.searchParams.get('SouthWestLatitude')) <= square.south);
  assert.ok(Number(url.searchParams.get('NorthEastLongitude')) >= square.east);
  assert.ok(Number(url.searchParams.get('SouthWestLongitude')) <= square.west);
});

test('the drive days of the real answer: public drives only, one per place and day', () => {
  const body = fixture();
  const occurrences = parseAnswer(body);
  const drives = body.samplingLocationCollections.flatMap((place) => place.collections);
  const reserved = drives.filter((drive) => drive.isPublic !== true);
  assert.ok(reserved.length > 0, 'the capture holds drives reserved to a company or a school');
  const ids = new Set(occurrences.map((o) => o.id));
  assert.equal(ids.size, occurrences.length, 'unique ids');
  for (const drive of reserved) {
    const place = body.samplingLocationCollections.find((p) => p.collections.includes(drive));
    const id = `${place.groupCode}-${place.samplingLocationCode}-${drive.date.slice(0, 10)}`;
    const shared = drives.some(
      (other) =>
        other.isPublic === true &&
        place.collections.includes(other) &&
        [other, ...(other.children ?? [])].some((s) => s.date === drive.date),
    );
    if (!shared) {
      assert.ok(!ids.has(id), `${id} is reserved`);
    }
  }
  // Sorted by day, then by first slot.
  const keys = occurrences.map((o) => `${o.date} ${o.slots[0]?.[0] ?? ''}`);
  assert.deepEqual(keys, [...keys].sort());
  for (const occurrence of occurrences) {
    assert.match(occurrence.date, /^\d{4}-\d{2}-\d{2}$/);
    for (const [from, to] of occurrence.slots) {
      assert.match(from, /^\d{2}:\d{2}$/);
      assert.ok(from < to);
    }
    assert.ok(occurrence.url === null || occurrence.url.startsWith('https://'));
  }
});

test('a drive over a day and a half: its sessions become two drive days, the half-days merged', () => {
  const body = fixture();
  const drive = body.samplingLocationCollections
    .flatMap((place) => place.collections.map((d) => ({ place, d })))
    .find(({ d }) => d.isPublic && d.children?.some((child) => child.date !== d.date));
  assert.ok(drive, 'the capture holds a drive over several days');
  const { place, d } = drive;
  const occurrences = parseAnswer(body).filter((o) =>
    o.id.startsWith(`${place.groupCode}-${place.samplingLocationCode}-`),
  );
  const days = new Set([d, ...d.children].map((session) => session.date.slice(0, 10)));
  for (const day of days) {
    const occurrence = occurrences.find((o) => o.date === day);
    assert.ok(occurrence, day);
    const sessions = [d, ...d.children].filter((s) => s.date.slice(0, 10) === day);
    const halves = sessions.flatMap((s) =>
      [
        [s.morningStartTime, s.morningEndTime],
        [s.afternoonStartTime, s.afternoonEndTime],
      ].filter(([from, to]) => from && to),
    );
    assert.equal(occurrence.slots.length, new Set(halves.map((h) => h.join())).size, day);
  }
  // The slots are counted on the first day only.
  const first = occurrences.find((o) => o.date === d.date.slice(0, 10));
  assert.equal(first.placesTotal, d.nbPlacesTotalesST);
  const later = occurrences.filter((o) => o !== first && days.has(o.date));
  assert.ok(later.length > 0 && later.every((o) => o.placesTotal === null));
});

test('the booking link gets its scheme; a broken answer is an error', () => {
  const body = {
    samplingLocationCollections: [
      {
        groupCode: 'P1',
        samplingLocationCode: '1',
        latitude: 43.6,
        longitude: 1.44,
        name: 'SALLE',
        city: 'VILLE',
        collections: [
          {
            date: '2026-11-02T00:00:00',
            isPublic: true,
            isPublishable: true,
            morningStartTime: null,
            morningEndTime: null,
            afternoonStartTime: '15:00:00',
            afternoonEndTime: '19:00:00',
            urlBlood: 'efs.link/abc',
            proposePlanningRdv: true,
            nbPlacesRestantesST: 0,
            nbPlacesTotalesST: 40,
            children: [],
          },
        ],
      },
    ],
  };
  const [occurrence] = parseAnswer(body);
  assert.equal(occurrence.url, 'https://efs.link/abc');
  assert.deepEqual(occurrence.slots, [['15:00', '19:00']]);
  assert.equal(occurrence.placesLeft, 0);
  body.samplingLocationCollections[0].collections[0].urlBlood = 'javascript:alert(1)';
  assert.equal(parseAnswer(body)[0].url, null);
  assert.throws(() => parseAnswer({}), /unexpected answer/);
  assert.throws(() => parseAnswer(null), /unexpected answer/);
});

test('reading: the drives within the radius only, each with its distance; HTTP errors', async () => {
  const network = createFetch();
  const near = await readCollections(network.fetch, home, 5, '2026-10-30');
  const far = await readCollections(network.fetch, home, 20, '2026-10-30');
  assert.ok(near.length > 0 && near.length < far.length);
  assert.ok(near.every((o) => o.distance <= 5));
  assert.ok(far.some((o) => o.distance > 5));
  assert.match(network.calls[0].url, /MinDate=2026-10-30/);
  network.status = 503;
  await assert.rejects(readCollections(network.fetch, home, 5, '2026-10-30'), /HTTP 503/);
});

test('the coordinates typed: dot or comma, both or none', () => {
  assert.equal(parseCoordinate('43,6045', 90), 43.6045);
  assert.equal(parseCoordinate(' -1.5 ', 180), -1.5);
  assert.equal(parseCoordinate('91', 90), null);
  assert.equal(parseCoordinate('abc', 90), null);
  assert.deepEqual(normalizeConfig({ latitude: '43,6', longitude: '1.44' }).point, {
    lat: 43.6,
    lon: 1.44,
  });
  const half = normalizeConfig({ latitude: '43.6', longitude: '' });
  assert.equal(half.point, null);
  assert.equal(half.pointError, true);
  const none = normalizeConfig({});
  assert.equal(none.point, null);
  assert.equal(none.pointError, false);
  assert.equal(none.radiusKm, 20);
  assert.equal(normalizeConfig({ radius: '7' }).radiusKm, 20);
});
