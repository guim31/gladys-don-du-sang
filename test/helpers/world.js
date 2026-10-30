// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake `fetch` serving a real
// answer of the EFS map API (the drives of the Toulouse area, captured on
// 2026-10-30 at 02:54 in Paris, see test/fixtures/efs-toulouse.json), a manual
// clock, a temporary /data, and the integration wired on top through
// registerHandlers. Nothing touches the network.
// -----------------------------------------------------------------------------

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';

process.env.LOG_LEVEL ??= 'silent';
// The EFS hours are local: the tests run in the time zone of mainland France.
process.env.TZ = 'Europe/Paris';

export const fixture = () =>
  JSON.parse(readFileSync(new URL('../fixtures/efs-toulouse.json', import.meta.url), 'utf8'));

// 2026-10-30 01:54:50 UTC (02:54 in Paris, a Friday), the time of the capture.
export const FIXTURE_TIME = 1793325290191;
export const HOUR = 3600 * 1000;

// A house in the centre of Toulouse, not a real address (the point of the capture).
export const HOUSE = {
  id: 'h1',
  name: 'Maison',
  selector: 'maison',
  latitude: 43.6,
  longitude: 1.44,
};

/**
 * A fake `fetch`. `data` is the answer served (editable by the tests); `down`
 * makes it fail, `status` answers an HTTP error. Every call is recorded.
 */
export function createFetch() {
  const network = { data: fixture(), calls: [], down: false, status: null };
  network.fetch = async (url, init = {}) => {
    network.calls.push({ url, headers: init.headers ?? {} });
    if (new URL(url).host !== 'oudonner.api.efs.sante.fr') {
      return new Response('not found', { status: 404 });
    }
    if (network.down) {
      throw new TypeError('fetch failed');
    }
    if (network.status) {
      return new Response('error', { status: network.status });
    }
    return new Response(JSON.stringify(network.data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return network;
}

/** A manual clock. */
export function createClock(start = FIXTURE_TIME) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
  };
  return clock;
}

/** A temporary /data, removed after the test. */
export function tempData(t) {
  const dir = mkdtempSync(join(tmpdir(), 'efs-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {object} [options.network] from createFetch
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {Array} [options.houses] houses of Gladys
 * @param {string} [options.dataDir] the /data of the integration
 * @param {boolean} [options.connect]
 */
export async function createWorld({
  config = {},
  network = createFetch(),
  devices = [],
  houses = [HOUSE],
  dataDir,
  connect = true,
  clock = createClock(),
} = {}) {
  const gladys = createFakeGladys({ config, devices, houses });
  const app = registerHandlers(gladys, {
    fetch: network.fetch,
    timers: false,
    now: clock.now,
    dataDir: dataDir ?? mkdtempSync(join(tmpdir(), 'efs-')),
  });
  const world = {
    gladys,
    fake: gladys.fake,
    app,
    service: app.service,
    network,
    clock,
    async widget(settings = {}, language = 'fr') {
      const ack = await gladys.fake.widgetGet('upcoming_collections', {
        settings,
        language,
        units: 'metric',
      });
      if (!ack.success) {
        throw new Error(ack.error);
      }
      return ack.data.content;
    },
    async summary(fields = {}) {
      return gladys.fake.sceneAction('collections_summary', fields);
    },
  };
  if (connect) {
    await gladys.connect();
    await app.ready;
    await app.service.loading;
  }
  return world;
}

/** The device published for a name part, from the last discovery list. */
export const discovered = (world, part) =>
  world.fake.discoveredDevices.find((d) => d.name.includes(part));

/** Create a discovered device in Gladys, as the user would. */
export async function create(world, part) {
  const device = discovered(world, part);
  if (!device) {
    throw new Error(`${part} is not in the discovered devices`);
  }
  await world.fake.deviceCreated(device);
  return device;
}

/** External id of one feature of a device. */
export const featureId = (device, key) =>
  device.features.find((feature) => feature.external_id.endsWith(`:${key}`))?.external_id;

/** One pass of the timer, `hours` later. */
export async function tick(world, hours = 1) {
  world.clock.advance(hours * HOUR);
  await world.service.refresh();
}

/** Captures what the integration logs, at a level. */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const text = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(text);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}

/**
 * A new drive in the answer: a copy of a real place (the nearest of the
 * capture) with a new code, one session on `date`, 15:00 to 19:00.
 */
export function announce(network, { code = '9001', date = '2026-11-04' } = {}) {
  const sample = network.data.samplingLocationCollections.find(
    (place) => place.groupCode === 'P31523' && place.samplingLocationCode === '5',
  );
  const place = structuredClone(sample);
  place.samplingLocationCode = code;
  place.name = `SALLE TEST ${code}`;
  place.collections = [
    {
      ...place.collections[0],
      date: `${date}T00:00:00`,
      morningStartTime: null,
      morningEndTime: null,
      afternoonStartTime: '15:00:00',
      afternoonEndTime: '19:00:00',
      children: [],
    },
  ];
  network.data.samplingLocationCollections.push(place);
  return place;
}
