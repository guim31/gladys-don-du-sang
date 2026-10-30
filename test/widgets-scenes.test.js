// -----------------------------------------------------------------------------
// The "Blood drives" widget (core vocabulary and budget, settings) and the
// "Nearby blood drives" scene action (one sentence, outputs, errors).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { PERIODS } from '../src/collections.js';
import { buildAreaDevice } from '../src/devices.js';
import { MAX_ROWS } from '../src/widgets.js';
import { create, createWorld } from './helpers/world.js';

test('every period, in the four languages, fits the core vocabulary and budget', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  for (const language of ['en', 'fr', 'de', 'es']) {
    for (const period of PERIODS) {
      const content = await world.widget({ period }, language);
      assert.deepEqual(validateWidgetContent(content), [], `${language} ${period}`);
      assert.ok(content.components.length <= 8);
      assert.ok(content.components.filter((c) => c.type === 'text').length <= 2);
      const list = content.components.find((c) => c.type === 'card-list');
      assert.ok(!list || list.items.length <= MAX_ROWS);
    }
  }
});

test('the rows: place, day and hours, distance, badge, booking link; settings hide blocks', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const content = await world.widget({ period: 'week' }, 'fr');
  const [caption, list] = content.components;
  assert.equal(caption.text, '7 prochains jours · 6 collectes');
  assert.deepEqual(list.items[0], {
    title: 'SALLE MIDI PYRENEES JOURNEE, TOULOUSE',
    subtitle: 'lun. 2 nov., 10:00–12:30, 14:00–16:00 · à 1,9 km',
    description: [
      '10 CHEMIN DU RAISIN 31500 TOULOUSE',
      'lun. 2 nov., 10:00–12:30, 14:00–16:00',
      'à 1,9 km',
      'Rendez-vous en ligne · 22 places libres sur 45',
    ].join('\n'),
    links: [{ url: 'https://efs.link/98UkC', label: 'Prendre rendez-vous' }],
    badge: { text: 'RDV en ligne', color: 'success' },
  });
  const bare = await world.widget({ period: 'week', show_count: false, show_booking: false }, 'fr');
  assert.equal(bare.components[0].type, 'card-list');
  assert.ok(bare.components[0].items.every((item) => item.badge === undefined));
  const month = await world.widget({}, 'en');
  assert.equal(month.components[0].text, 'Next 30 days · 28 drives');
  assert.equal(month.components[1].items.length, MAX_ROWS);
});

test('the widget explains an empty period and a missing position', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const today = await world.widget({ period: 'today' }, 'fr');
  assert.equal(today.components[1].text, 'Aucune collecte de sang sur la période.');
  const unlocated = await createWorld({ houses: [] });
  t.after(() => unlocated.app.stop());
  const content = await unlocated.widget({}, 'de');
  assert.equal(
    content.components[0].text,
    'Verorte das Haus in Gladys oder gib einen Punkt in der Konfiguration ein.',
  );
});

test('the widget is refreshed when the device is added', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const before = world.fake.widgetRefreshes.length;
  await create(world, 'Don du sang');
  assert.deepEqual(world.fake.widgetRefreshes.slice(before), ['upcoming_collections']);
  assert.deepEqual(world.fake.discoveredDevices, [buildAreaDevice(world.gladys, 'fr')]);
});

test('the scene action: one sentence, the drives named, the others counted', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const ack = await world.summary({ period: 'week', max_items: 2 });
  assert.equal(ack.success, true);
  assert.deepEqual(ack.data.outputs, {
    summary:
      '7 prochains jours : 6 collectes de sang près de chez toi, ' +
      'SALLE MIDI PYRENEES JOURNEE, TOULOUSE (lun. 2 nov., 10:00–12:30, 14:00–16:00, à 1,9 km), ' +
      'SALLE DES FÊTES FELIX VERDUN, POMPERTUZAT (lun. 2 nov., 15:00–19:00, à 13,7 km) et 4 autres.',
    count: 6,
    next_place: 'SALLE MIDI PYRENEES JOURNEE, TOULOUSE',
    next_date: 'lun. 2 nov., 10:00–12:30, 14:00–16:00',
    next_url: 'https://efs.link/98UkC',
  });
  const none = await world.summary({ period: 'today' });
  assert.deepEqual(none.data.outputs, {
    summary: "Aujourd'hui : aucune collecte de sang près de chez toi.",
    count: 0,
    next_place: '',
    next_date: '',
    next_url: '',
  });
  // Without position, a clear failure.
  const unlocated = await createWorld({ houses: [] });
  t.after(() => unlocated.app.stop());
  const failed = await unlocated.summary({});
  assert.equal(failed.success, false);
  assert.match(failed.error, /Localise la maison/);
});
