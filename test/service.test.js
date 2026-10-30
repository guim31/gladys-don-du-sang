// -----------------------------------------------------------------------------
// The integration at runtime, against the SDK's fake Gladys and the real EFS
// answer: the device offered, its states (all of them when it is added), the
// reading cadence, the scene triggers, what /data keeps across restarts, and
// quiet logs.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_RETRY_MS, READ_EVERY_MS, RETRY_MS, TRIGGERS } from '../src/service.js';
import {
  HOUR,
  announce,
  captureLogs,
  create,
  createClock,
  createFetch,
  createWorld,
  featureId,
  tempData,
  tick,
} from './helpers/world.js';

const strip = (line) => line.text.replace(/^\[[^\]]+\] /, '');
const fired = (world, key) => world.fake.sceneEvents.filter((event) => event.key === key);

test('the device is offered once the zone has a centre: the house, or the point entered', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  assert.deepEqual(
    world.fake.discoveredDevices.map((d) => d.name),
    ['Don du sang'],
  );
  const unlocated = await createWorld({
    houses: [{ id: 'h', name: 'Maison', selector: 'maison', latitude: null, longitude: null }],
  });
  t.after(() => unlocated.app.stop());
  assert.deepEqual(unlocated.fake.discoveredDevices, []);
  assert.equal(unlocated.network.calls.length, 0, 'nothing read without a centre');
  const report = (await unlocated.fake.action('status', {})).data.message;
  assert.match(report.fr, /Aucune position/);
  // A point entered replaces the house.
  await unlocated.fake.configUpdated({ latitude: '43,6', longitude: '1.44' });
  assert.deepEqual(
    unlocated.fake.discoveredDevices.map((d) => d.name),
    ['Don du sang'],
  );
  assert.match(unlocated.network.calls[0].url, /UserLatitude=43\.6&UserLongitude=1\.44/);
});

test('the device added gets all its states at once, then only changes', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const device = await create(world, 'Don du sang');
  const state = (key) => world.fake.lastState(featureId(device, key));
  // Friday 30 October 2026, 02:54: six drive days by Thursday, 28 within 30 days.
  assert.equal(state('week'), 6);
  assert.equal(state('month'), 28);
  assert.equal(state('next_place'), 'SALLE MIDI PYRENEES JOURNEE, TOULOUSE');
  assert.equal(state('next_date'), 'lun. 2 nov., 10:00–12:30, 14:00–16:00');
  assert.equal(state('next_distance'), 1.9);
  assert.equal(state('next_booking'), 'Rendez-vous en ligne · 22 places libres sur 45');
  assert.ok(device.should_poll === false && device.poll_frequency === undefined);
  // An hour later, nothing changed: nothing published.
  const before = world.fake.states.length;
  await tick(world, 1);
  assert.equal(world.fake.states.length, before);
});

test('the clock moves the counts without reading: the drive over, the next one', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const device = await create(world, 'Don du sang');
  const state = (key) => world.fake.lastState(featureId(device, key));
  const reads = world.network.calls.length;
  // Monday 2 November, 16:30 (Paris, winter time): the Toulouse drive is over.
  world.clock.time = Date.parse('2026-11-02T15:30:00Z');
  world.network.status = 503; // a reading failing keeps the known drives
  await world.service.refresh();
  assert.ok(world.network.calls.length > reads);
  assert.equal(state('next_place'), 'SALLE DES FÊTES FELIX VERDUN, POMPERTUZAT');
  assert.equal(state('next_date'), "aujourd'hui, 15:00–19:00");
  assert.equal(state('next_distance'), 13.7);
});

test('the EFS is read twice a day at most; a failure is retried after an hour', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  assert.equal(world.network.calls.length, 1);
  await tick(world, 6);
  assert.equal(world.network.calls.length, 1, 'not before 12 hours');
  await tick(world, READ_EVERY_MS / HOUR - 6);
  assert.equal(world.network.calls.length, 2);
  world.network.down = true;
  await tick(world, READ_EVERY_MS / HOUR);
  assert.equal(world.network.calls.length, 3);
  await tick(world, 0.5);
  assert.equal(world.network.calls.length, 3, 'not before an hour');
  await tick(world, RETRY_MS / HOUR);
  assert.equal(world.network.calls.length, 4);
  const report = (await world.fake.action('status', {})).data.message;
  assert.match(report.fr, /Dernière lecture en échec : fetch failed/);
  world.network.down = false;
  await tick(world, RETRY_MS / HOUR);
  assert.equal(world.service.error, null);
});

test('never read: retried after 10 minutes; the widget says it', async (t) => {
  const network = createFetch();
  network.down = true;
  const world = await createWorld({ network });
  t.after(() => world.app.stop());
  const content = await world.widget({}, 'fr');
  assert.equal(content.components[0].text, "Les collectes de l'EFS n'ont pas encore pu être lues.");
  network.down = false;
  world.clock.advance(FIRST_RETRY_MS);
  await world.service.refresh();
  assert.equal(world.network.calls.length, 2);
  assert.ok(world.service.zoneCollections().length > 0);
});

test('new_collection: the first reading is the reference, then each new drive day once', async (t) => {
  const dataDir = tempData(t);
  const clock = createClock();
  const network = createFetch();
  const world = await createWorld({ dataDir, clock, network });
  t.after(() => world.app.stop());
  assert.deepEqual(fired(world, TRIGGERS.NEW_COLLECTION), []);
  announce(network, { code: '9001', date: '2026-11-04' });
  await tick(world, READ_EVERY_MS / HOUR);
  const events = fired(world, TRIGGERS.NEW_COLLECTION);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].data, {
    place: 'SALLE TEST 9001',
    city: 'TOULOUSE',
    address: events[0].data.address,
    date: 'mer. 4 nov., 15:00–19:00',
    day: '2026-11-04',
    hours: '15:00–19:00',
    distance_km: '1.2',
    booking: events[0].data.booking,
    url: events[0].data.url,
    end: '2026-11-04T18:00:00.000Z',
  });
  // Not again at the next reading, nor after a restart.
  await tick(world, READ_EVERY_MS / HOUR);
  await world.app.stop();
  const again = await createWorld({ dataDir, clock, network });
  t.after(() => again.app.stop());
  await tick(again, READ_EVERY_MS / HOUR);
  assert.deepEqual(fired(again, TRIGGERS.NEW_COLLECTION), []);
  assert.equal(fired(world, TRIGGERS.NEW_COLLECTION).length, 1);
});

test('another zone is read as a new reference: nothing announced', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await world.fake.configUpdated({ radius: '50' });
  assert.equal(world.network.calls.length, 2, 'read again at once');
  assert.deepEqual(fired(world, TRIGGERS.NEW_COLLECTION), []);
});

test('collection_today from 08:00, collection_tomorrow from 18:00, once a day each', async (t) => {
  const dataDir = tempData(t);
  const clock = createClock();
  const network = createFetch();
  announce(network, { code: '9001', date: '2026-10-30' });
  announce(network, { code: '9002', date: '2026-10-31' });
  const world = await createWorld({ dataDir, clock, network });
  t.after(() => world.app.stop());
  // 02:54: too early for both.
  assert.deepEqual(world.fake.sceneEvents, []);
  await tick(world, 5); // 07:54
  assert.deepEqual(world.fake.sceneEvents, []);
  await tick(world, 1); // 08:54
  assert.deepEqual(
    fired(world, TRIGGERS.COLLECTION_TODAY).map((e) => e.data.place),
    ['SALLE TEST 9001'],
  );
  await tick(world, 1);
  assert.equal(fired(world, TRIGGERS.COLLECTION_TODAY).length, 1, 'once a day');
  await tick(world, 9); // 18:54
  assert.deepEqual(
    fired(world, TRIGGERS.COLLECTION_TOMORROW).map((e) => e.data.place),
    ['SALLE TEST 9002'],
  );
  assert.equal(fired(world, TRIGGERS.COLLECTION_TOMORROW)[0].data.date.startsWith('demain'), true);
  // A restart the same evening announces nothing again.
  await world.app.stop();
  const again = await createWorld({ dataDir, clock, network });
  t.after(() => again.app.stop());
  assert.deepEqual(again.fake.sceneEvents, []);
});

test('a normal cycle writes nothing at the info level', async (t) => {
  const logs = captureLogs(t, 'info');
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Don du sang');
  logs.length = 0;
  await tick(world, READ_EVERY_MS / HOUR);
  await tick(world, 1);
  assert.deepEqual(logs.map(strip), []);
  // One line when the EFS goes, one when it comes back.
  world.network.down = true;
  await tick(world, READ_EVERY_MS / HOUR);
  await tick(world, RETRY_MS / HOUR);
  world.network.down = false;
  await tick(world, RETRY_MS / HOUR);
  assert.equal(logs.length, 2, logs.map(strip).join('\n'));
  assert.match(strip(logs[0]), /EFS drives unavailable/);
  assert.match(strip(logs[1]), /EFS drives back/);
});

test('the integration refreshes by its own timer, without Gladys polling', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const world = await createWorld({ connect: false });
  t.after(() => world.app.stop());
  world.service.useTimers = true;
  await world.gladys.connect();
  await world.app.ready;
  await world.service.loading;
  const device = await create(world, 'Don du sang');
  world.clock.time = Date.parse('2026-11-02T15:30:00Z');
  t.mock.timers.tick(10 * 60 * 1000);
  await world.service.refreshing;
  assert.equal(
    world.fake.lastState(featureId(device, 'next_place')),
    'SALLE DES FÊTES FELIX VERDUN, POMPERTUZAT',
  );
});
