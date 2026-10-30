// -----------------------------------------------------------------------------
// The integration at runtime: the position of the zone, the drives read from
// the EFS, the device offered in the Discover tab and its states, the scene
// triggers.
//
// Data flow: the EFS is read every 12 hours (twice a day at most, a light
// load on a public service). Every 10 minutes, without reading anything, the
// counts and the next drive are computed again against the clock and published
// when they change. A reading bringing drive days never seen before fires
// `new_collection`; the first pass after 08:00 fires `collection_today`, the
// first pass after 18:00 `collection_tomorrow`. What was already announced is
// kept in /data, so a restart announces nothing twice; a new zone (another
// point or radius) is read once as the reference, without announcements.
// -----------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import { createLogger } from '@gladysassistant/integration-sdk';
import { DEFAULT_CONFIG, normalizeConfig } from './config.js';
import { endOf, upcoming } from './collections.js';
import { AREA_TYPE, buildAreaDevice, areaStates } from './devices.js';
import { REPORTS, allLanguages, bookingText, formatHours, formatWhen, pick } from './messages.js';
import { EFS_SITE, fuzzyCentre, readCollections } from './source.js';
import { createStore } from './store.js';
import { truncate } from './text.js';
import { addDays, localParts } from './time.js';

const logger = createLogger({ name: 'don-du-sang' });

// Twice a day at most: the EFS updates its planning during the working day.
export const READ_EVERY_MS = 12 * 3600 * 1000;
// A pass a little early still reads at the 12th hour.
const READ_MARGIN_MS = 5 * 60 * 1000;
// A failed reading is tried again after this, the known drives kept.
export const RETRY_MS = 3600 * 1000;
// The EFS never read: tried again after this.
export const FIRST_RETRY_MS = 10 * 60 * 1000;
// The counts are computed again against the clock this often (no network).
export const TICK_MS = 10 * 60 * 1000;
// Unchanged states are sent again this often, or the dashboard shows "no
// recent value" after 48 hours.
export const HEARTBEAT_MS = 6 * 3600 * 1000;
// `collection_today` from this hour on, `collection_tomorrow` from that one.
export const TODAY_HOUR = 8;
export const TOMORROW_HOUR = 18;
// Trigger events fired in one pass, at most (the core takes 300 a minute).
export const MAX_EVENTS = 30;

export const TRIGGERS = {
  NEW_COLLECTION: 'new_collection',
  COLLECTION_TODAY: 'collection_today',
  COLLECTION_TOMORROW: 'collection_tomorrow',
};
export const WIDGET_KEY = 'upcoming_collections';

export class DonDuSang {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake)
   * @param {typeof fetch} [options.fetch]
   * @param {() => number} [options.now]
   * @param {boolean} [options.timers] false in the tests: they call refresh()
   * @param {string} [options.dataDir] where the state is kept (/data)
   */
  constructor({ gladys, fetch = globalThis.fetch, now = Date.now, timers = true, dataDir }) {
    this.gladys = gladys;
    this.fetch = fetch;
    this.now = now;
    this.useTimers = timers;
    this.store = createStore(dataDir);
    this.config = normalizeConfig(DEFAULT_CONFIG);
    this.house = null; // { lat, lon } of the first located house
    this.houseError = false;
    this.collections = null; // array, null before the first reading of the zone
    this.zoneKey = null; // the zone of `collections`
    this.readAt = null;
    this.retryAt = null;
    this.error = null;
    this.discoveredSignature = null;
    this.publishFailed = false;
    this.discoveryFailed = false;
    this.fireFailed = false;
    this.timer = null;
    this.stopped = false;
    this.refreshing = null;
    this.loading = Promise.resolve();
  }

  // --- lifecycle --------------------------------------------------------------

  async start(config) {
    this.config = config;
    await this.store.load();
    await this.locate();
    this.schedule();
    logger.info(
      this.position()
        ? `Started: ${config.radiusKm} km around ${config.point ? 'the point entered' : 'the house'}`
        : 'Started: no position yet (house not located, no point entered)',
    );
    // The first reading in the background: the widget and the scene action
    // wait for it.
    this.loading = this.refresh({ discover: true });
  }

  /** Gladys restarted: everything again, the house and the states included. */
  async resync(config) {
    await this.refreshing;
    this.config = config;
    await this.locate();
    this.gladys.forgetPublishedStates?.();
    await this.refresh({ discover: true });
  }

  async reconfigure(config) {
    await this.refreshing;
    this.config = config;
    await this.locate();
    await this.refresh({ discover: true });
    this.refreshWidget();
  }

  async stop() {
    this.stopped = true;
    clearInterval(this.timer);
    await this.refreshing;
  }

  schedule() {
    if (!this.useTimers || this.stopped) {
      return;
    }
    clearInterval(this.timer);
    this.timer = setInterval(() => this.refresh(), TICK_MS);
    this.timer.unref?.();
  }

  /** The position of the house, used when no point is entered. */
  async locate() {
    if (this.config.point) {
      return;
    }
    try {
      const houses = await this.gladys.getHouses();
      const located = (houses ?? []).find(
        (h) => Number.isFinite(h?.latitude) && Number.isFinite(h?.longitude),
      );
      this.house = located ? { lat: located.latitude, lon: located.longitude } : null;
      if (this.houseError) {
        logger.info('Location of the house read again');
      }
      this.houseError = false;
    } catch (err) {
      if (!this.houseError) {
        logger.warn(`Cannot read the location of the house: ${err.message}`);
      }
      this.houseError = true;
    }
  }

  /** The centre of the zone: the point entered, else the house; null when none. */
  position() {
    return this.config.point ?? this.house;
  }

  /** A key of the zone: the drives read for another one are not its drives. */
  currentZoneKey() {
    const at = this.position();
    return at ? `${at.lat.toFixed(4)},${at.lon.toFixed(4)},${this.config.radiusKm}` : null;
  }

  // --- device -------------------------------------------------------------------

  /** The device added in Gladys, or null. */
  watched() {
    const id = this.gladys.externalIds(AREA_TYPE, 'main').device;
    const device = (this.gladys.devices ?? []).find((d) => d.external_id === id);
    return device ? { deviceId: device.external_id, name: device.name } : null;
  }

  /** The drive days of the zone; null before its first reading. */
  zoneCollections() {
    return this.zoneKey !== null && this.zoneKey === this.currentZoneKey()
      ? this.collections
      : null;
  }

  /** Waits for the first reading (at most `ms`), for a widget or a scene action asked at start. */
  async firstReading(ms = 10000) {
    let timer;
    await Promise.race([
      this.loading,
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      }),
    ]);
    clearTimeout(timer);
  }

  async publishDiscovered({ force = false } = {}) {
    // Offered once the zone has a centre; an added device stays listed.
    const list =
      this.position() || this.watched() ? [buildAreaDevice(this.gladys, this.config.language)] : [];
    const signature = JSON.stringify(list.map((d) => [d.external_id, d.name, d.features]));
    if (!force && signature === this.discoveredSignature) {
      return;
    }
    try {
      await this.gladys.publishDiscoveredDevices(list);
      this.discoveredSignature = signature;
      if (this.discoveryFailed) {
        this.discoveryFailed = false;
        logger.info('Discovered device published again');
      }
    } catch (err) {
      if (!this.discoveryFailed) {
        logger.warn(`Cannot publish the discovered device: ${err.message}`);
      }
      this.discoveryFailed = true;
    }
  }

  async publish(states) {
    if (states.length === 0) {
      return;
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
      if (this.publishFailed) {
        this.publishFailed = false;
        logger.info('States published again');
      }
    } catch (err) {
      if (!this.publishFailed) {
        logger.warn(`Cannot publish ${states.length} state(s): ${err.message}`);
      }
      this.publishFailed = true;
    }
  }

  /** The device was just added in Gladys: its states, all of them, now. */
  async onDeviceCreated(device) {
    if (device?.external_id !== this.gladys.externalIds(AREA_TYPE, 'main').device) {
      return;
    }
    if (!this.config.point && !this.house) {
      await this.locate();
    }
    await this.refresh();
    const collections = this.zoneCollections();
    if (collections) {
      // The SDK forgot what was published before the creation (dropped by Gladys).
      await this.publish(areaStates(this.gladys, collections, this.config.language, this.now()));
    }
    this.refreshWidget();
  }

  refreshWidget() {
    this.gladys.requestWidgetRefresh?.(WIDGET_KEY)?.catch?.(() => {});
  }

  // --- refresh ------------------------------------------------------------------

  /** One pass: the reading when due, then the states; concurrent calls share it. */
  refresh({ discover = false } = {}) {
    if (!this.refreshing) {
      this.refreshing = this.refreshAll(discover)
        .catch((err) => logger.warn(`Refresh failed: ${err.message}`))
        .finally(() => {
          this.refreshing = null;
        });
      return this.refreshing;
    }
    return discover ? this.refreshing.then(() => this.refresh({ discover })) : this.refreshing;
  }

  async refreshAll(forceDiscovery) {
    if (this.stopped) {
      return;
    }
    // The house is read again before each reading: a corrected position is
    // followed without a restart.
    if (!this.config.point && (!this.house || this.readingDue())) {
      await this.locate();
    }
    const fresh = await this.read();
    await this.publishDiscovered({ force: forceDiscovery });
    const collections = this.zoneCollections();
    if (collections === null) {
      // No position any more, or the new zone not readable: no drive of the
      // old zone left on the device.
      if (this.watched() && (!this.position() || this.error)) {
        await this.publish(areaStates(this.gladys, [], this.config.language, this.now()));
      }
      return;
    }
    const now = this.now();
    if (this.watched()) {
      await this.publish(areaStates(this.gladys, collections, this.config.language, now));
    }
    this.dayMarks = { today: this.store.get('today'), tomorrow: this.store.get('tomorrow') };
    const marks = JSON.stringify([this.dayMarks.today, this.dayMarks.tomorrow]);
    const triggers = [
      ...(fresh ? this.newCollections(collections) : []),
      ...this.dayCollections(collections, 'today'),
      ...this.dayCollections(collections, 'tomorrow'),
    ];
    if (triggers.length > MAX_EVENTS) {
      logger.debug(`${triggers.length} trigger events, only the first ${MAX_EVENTS} fired`);
    }
    // What could not be fired is not marked as done: a new drive day is
    // announced at the next reading, a day pass is run again at the next tick
    // when none of its events went through.
    const passed = new Set();
    const failed = new Set();
    for (const { key, data, id } of triggers.slice(0, MAX_EVENTS)) {
      if (await this.fire(key, data)) {
        passed.add(key);
      } else {
        failed.add(key);
        if (id) {
          delete this.seen?.[id];
        }
      }
    }
    for (const [which, key] of [
      ['today', TRIGGERS.COLLECTION_TODAY],
      ['tomorrow', TRIGGERS.COLLECTION_TOMORROW],
    ]) {
      if (failed.has(key) && !passed.has(key)) {
        this.store.set(which, this.dayMarks?.[which]);
      }
    }
    if (fresh) {
      this.refreshWidget();
    }
    // /data is written only when its content changed: a reading, a new day.
    if (fresh || marks !== JSON.stringify([this.store.get('today'), this.store.get('tomorrow')])) {
      await this.store.save();
    }
  }

  /** True when the 12-hour reading is due (retries aside). */
  readingDue() {
    return !this.collections || this.now() - this.readAt >= READ_EVERY_MS - READ_MARGIN_MS;
  }

  /** Reads the EFS when due; true when a new list was read. A failure keeps the known one. */
  async read() {
    const at = this.position();
    if (!at) {
      return false;
    }
    const now = this.now();
    const zone = this.currentZoneKey();
    const sameZone = this.zoneKey === zone;
    if (sameZone && this.collections && now - this.readAt < READ_EVERY_MS - READ_MARGIN_MS) {
      return false;
    }
    if (sameZone && this.retryAt !== null && now < this.retryAt) {
      return false;
    }
    try {
      const collections = await readCollections(
        this.fetch,
        at,
        this.config.radiusKm,
        localParts(now).date,
      );
      this.collections = collections;
      this.zoneKey = zone;
      this.readAt = now;
      this.retryAt = null;
      logger.debug(`${collections.length} drive day(s) read`);
      if (this.error) {
        logger.info('EFS drives back');
      }
      this.error = null;
      return true;
    } catch (err) {
      if (!sameZone) {
        // Another zone: what was read for the old one is not shown.
        this.collections = null;
        this.zoneKey = zone;
      }
      this.retryAt = now + (this.collections ? RETRY_MS : FIRST_RETRY_MS);
      if (!this.error) {
        logger.warn(`EFS drives unavailable: ${err.message}`);
      }
      this.error = err.message;
      return false;
    }
  }

  /**
   * `new_collection`: the drive days never seen before in this zone; the first
   * reading of a zone is the reference. A day gone is forgotten.
   */
  newCollections(collections) {
    const today = localParts(this.now()).date;
    // A fingerprint of the rounded centre sent to the EFS (never the exact
    // position of the house) and of the radius.
    const centre = fuzzyCentre(this.position());
    const stamp = createHash('sha256')
      .update(`${centre.lat},${centre.lon},${this.config.radiusKm}`)
      .digest('hex')
      .slice(0, 16);
    const zone = this.store.get('zone');
    const known = this.store.get('seen');
    const reference = zone !== stamp || !known || typeof known !== 'object';
    // id → its day, kept until the day is gone.
    const seen = Object.fromEntries(
      Object.entries(reference || Array.isArray(known) ? {} : known).filter(
        ([, date]) => typeof date === 'string' && date >= today,
      ),
    );
    const fresh = collections.filter((occurrence) => seen[occurrence.id] === undefined);
    for (const occurrence of collections) {
      seen[occurrence.id] = occurrence.date;
    }
    this.store.set('seen', seen);
    this.seen = seen;
    this.store.set('zone', stamp);
    if (reference) {
      return [];
    }
    return upcoming(fresh, this.now()).map((occurrence) => ({
      key: TRIGGERS.NEW_COLLECTION,
      data: this.eventData(occurrence),
      id: occurrence.id,
    }));
  }

  /**
   * `collection_today` (from 08:00) and `collection_tomorrow` (from 18:00):
   * once a day, the drive days of that day still to come.
   */
  dayCollections(collections, which) {
    const now = this.now();
    const { date: today, hour } = localParts(now);
    const from = which === 'today' ? TODAY_HOUR : TOMORROW_HOUR;
    if (hour < from || this.store.get(which) === today) {
      return [];
    }
    this.store.set(which, today);
    const day = which === 'today' ? today : addDays(today, 1);
    const key = which === 'today' ? TRIGGERS.COLLECTION_TODAY : TRIGGERS.COLLECTION_TOMORROW;
    return upcoming(collections, now)
      .filter((occurrence) => occurrence.date === day)
      .map((occurrence) => ({ key, data: this.eventData(occurrence) }));
  }

  /** The variables of a scene event (strings: a scene event string holds 1000 characters at most). */
  eventData(occurrence) {
    const language = this.config.language;
    const today = localParts(this.now()).date;
    return {
      place: truncate(occurrence.place, 300),
      city: occurrence.city ?? '',
      address: truncate(occurrence.address ?? '', 300),
      date: formatWhen(occurrence, language, today),
      day: occurrence.date,
      hours: formatHours(occurrence.slots, language),
      distance_km: String(Math.round(occurrence.distance * 10) / 10),
      booking: bookingText(occurrence, language),
      url: occurrence.url ?? EFS_SITE,
      end: new Date(endOf(occurrence)).toISOString(),
    };
  }

  /** Fires a scene event; false when Gladys refused it. */
  async fire(key, data) {
    try {
      await this.gladys.publishSceneEvent(key, data);
      if (this.fireFailed) {
        this.fireFailed = false;
        logger.info('Scene triggers fired again');
      }
      return true;
    } catch (err) {
      if (!this.fireFailed) {
        logger.warn(`Cannot fire the ${key} trigger: ${err.message}`);
      }
      this.fireFailed = true;
      return false;
    }
  }

  // --- configuration action -----------------------------------------------------

  /** The "Check" action: the position, the reading, the device, as one message. */
  async status() {
    await this.firstReading();
    const now = this.now();
    const collections = this.zoneCollections();
    return allLanguages((language) => {
      const report = pick(REPORTS, language);
      const lines = [];
      if (this.config.pointError) {
        lines.push(report.pointError);
      }
      if (!this.position()) {
        lines.push(report.noPosition);
      } else {
        lines.push(
          report.zone(this.config.point ? report.point : report.house, this.config.radiusKm),
        );
        lines.push(
          collections === null
            ? report.waiting
            : report.read(collections.length, Math.round((now - this.readAt) / 3600000)),
        );
      }
      if (this.error) {
        lines.push(report.error(this.error));
      }
      lines.push(report.device(Boolean(this.watched())));
      return lines.join('\n');
    });
  }
}
