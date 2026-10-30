// -----------------------------------------------------------------------------
// Every text the code produces, in the four languages of the Gladys interface.
// German says "du", Spanish "usted". The widget follows the language of the
// person looking at it; feature names, scene texts and the action report
// follow the `language` setting (Gladys does not tell them who reads). Places
// and cities stay as the EFS wrote them, in French.
// -----------------------------------------------------------------------------

import { addDays } from './time.js';

export const LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

/** The language of a table, English when unknown. */
export function pick(table, language) {
  return table[language] ?? table.en;
}

/** The four languages of a text, for a multi-language message. */
export function allLanguages(render) {
  return Object.fromEntries(Object.keys(LOCALES).map((language) => [language, render(language)]));
}

/** Device and feature names (fixed when the device is added to Gladys). */
export const NAMES = {
  en: {
    device: 'Blood donation',
    week: 'Drives in the next 7 days',
    month: 'Drives in the next 30 days',
    next_place: 'Next drive: place',
    next_date: 'Next drive: date',
    next_distance: 'Next drive: distance',
    next_booking: 'Next drive: appointment',
  },
  fr: {
    device: 'Don du sang',
    week: 'Collectes sur 7 jours',
    month: 'Collectes sur 30 jours',
    next_place: 'Prochaine collecte : lieu',
    next_date: 'Prochaine collecte : date',
    next_distance: 'Prochaine collecte : distance',
    next_booking: 'Prochaine collecte : rendez-vous',
  },
  de: {
    device: 'Blutspende',
    week: 'Blutspendetermine in 7 Tagen',
    month: 'Blutspendetermine in 30 Tagen',
    next_place: 'Nächster Termin: Ort',
    next_date: 'Nächster Termin: Datum',
    next_distance: 'Nächster Termin: Entfernung',
    next_booking: 'Nächster Termin: Reservierung',
  },
  es: {
    device: 'Donación de sangre',
    week: 'Colectas en 7 días',
    month: 'Colectas en 30 días',
    next_place: 'Próxima colecta: lugar',
    next_date: 'Próxima colecta: fecha',
    next_distance: 'Próxima colecta: distancia',
    next_booking: 'Próxima colecta: cita',
  },
};

/** The periods of the widget and of the scene action. */
export const PERIOD_LABELS = {
  en: { today: 'Today', tomorrow: 'Tomorrow', week: 'Next 7 days', month: 'Next 30 days' },
  fr: {
    today: "Aujourd'hui",
    tomorrow: 'Demain',
    week: '7 prochains jours',
    month: '30 prochains jours',
  },
  de: { today: 'Heute', tomorrow: 'Morgen', week: 'Nächste 7 Tage', month: 'Nächste 30 Tage' },
  es: { today: 'Hoy', tomorrow: 'Mañana', week: 'Próximos 7 días', month: 'Próximos 30 días' },
};

export const TEXT = {
  en: {
    none: 'None',
    today: 'today',
    tomorrow: 'tomorrow',
    hoursUnknown: 'hours on the EFS website',
    booking: 'Online appointment',
    noBooking: 'No online appointment',
    places: (left, total) => `${left} of ${total} slots free`,
    full: 'Full online',
    badge: 'Book online',
    badgeFull: 'Full online',
    count: (n) => (n === 1 ? '1 drive' : `${n} drives`),
    nothing: 'No blood drive in this period.',
    loading: 'Reading the EFS drives…',
    unavailable: 'EFS website unreachable: the drives shown may be out of date.',
    noDevice: 'Add the Blood donation device from the Discover tab of the integration.',
    noPosition: 'Locate the house in Gladys, or enter a point in the configuration.',
    noData: 'The EFS drives could not be read yet.',
    book: 'Book an appointment',
    efsSite: 'EFS website',
    away: (km) => `${km} km away`,
    summaryNone: (period) => `${period}: no blood drive nearby.`,
    summarySome: (period, n, list) =>
      `${period}: ${n === 1 ? '1 blood drive' : `${n} blood drives`} nearby, ${list}.`,
    others: (n) => (n === 1 ? '1 other' : `${n} others`),
    and: 'and',
  },
  fr: {
    none: 'Aucune',
    today: "aujourd'hui",
    tomorrow: 'demain',
    hoursUnknown: "horaires sur le site de l'EFS",
    booking: 'Rendez-vous en ligne',
    noBooking: 'Pas de rendez-vous en ligne',
    places: (left, total) => `${left} places libres sur ${total}`,
    full: 'Complet en ligne',
    badge: 'RDV en ligne',
    badgeFull: 'Complet en ligne',
    count: (n) => (n === 1 ? '1 collecte' : `${n} collectes`),
    nothing: 'Aucune collecte de sang sur la période.',
    loading: "Lecture des collectes de l'EFS…",
    unavailable: "Site de l'EFS injoignable : les collectes affichées peuvent dater.",
    noDevice: "Ajoute l'appareil Don du sang depuis l'onglet Découverte de l'intégration.",
    noPosition: 'Localise la maison dans Gladys, ou saisis un point dans la configuration.',
    noData: "Les collectes de l'EFS n'ont pas encore pu être lues.",
    book: 'Prendre rendez-vous',
    efsSite: "Site de l'EFS",
    away: (km) => `à ${km} km`,
    summaryNone: (period) => `${period} : aucune collecte de sang près de chez toi.`,
    summarySome: (period, n, list) =>
      `${period} : ${n === 1 ? '1 collecte de sang' : `${n} collectes de sang`} près de chez toi, ${list}.`,
    others: (n) => (n === 1 ? '1 autre' : `${n} autres`),
    and: 'et',
  },
  de: {
    none: 'Keiner',
    today: 'heute',
    tomorrow: 'morgen',
    hoursUnknown: 'Uhrzeiten auf der EFS-Website',
    booking: 'Online-Reservierung',
    noBooking: 'Keine Online-Reservierung',
    places: (left, total) => `${left} von ${total} Plätzen frei`,
    full: 'Online ausgebucht',
    badge: 'Online buchen',
    badgeFull: 'Ausgebucht',
    count: (n) => (n === 1 ? '1 Termin' : `${n} Termine`),
    nothing: 'Kein Blutspendetermin in diesem Zeitraum.',
    loading: 'EFS-Termine werden gelesen…',
    unavailable: 'EFS-Website nicht erreichbar: die Termine sind eventuell veraltet.',
    noDevice: 'Füge das Gerät Blutspende im Reiter Entdecken der Integration hinzu.',
    noPosition: 'Verorte das Haus in Gladys oder gib einen Punkt in der Konfiguration ein.',
    noData: 'Die EFS-Termine konnten noch nicht gelesen werden.',
    book: 'Termin reservieren',
    efsSite: 'EFS-Website',
    away: (km) => `${km} km entfernt`,
    summaryNone: (period) => `${period}: kein Blutspendetermin in deiner Nähe.`,
    summarySome: (period, n, list) =>
      `${period}: ${n === 1 ? '1 Blutspendetermin' : `${n} Blutspendetermine`} in deiner Nähe, ${list}.`,
    others: (n) => (n === 1 ? '1 weiterer' : `${n} weitere`),
    and: 'und',
  },
  es: {
    none: 'Ninguna',
    today: 'hoy',
    tomorrow: 'mañana',
    hoursUnknown: 'horario en el sitio del EFS',
    booking: 'Cita en línea',
    noBooking: 'Sin cita en línea',
    places: (left, total) => `${left} plazas libres de ${total}`,
    full: 'Completo en línea',
    badge: 'Cita en línea',
    badgeFull: 'Completo',
    count: (n) => (n === 1 ? '1 colecta' : `${n} colectas`),
    nothing: 'Ninguna colecta de sangre en el periodo.',
    loading: 'Leyendo las colectas del EFS…',
    unavailable: 'Sitio del EFS inaccesible: las colectas mostradas pueden estar desfasadas.',
    noDevice:
      'Añada el dispositivo Donación de sangre desde la pestaña Descubrir de la integración.',
    noPosition: 'Ubique la casa en Gladys, o introduzca un punto en la configuración.',
    noData: 'Las colectas del EFS aún no se han podido leer.',
    book: 'Pedir cita',
    efsSite: 'Sitio del EFS',
    away: (km) => `a ${km} km`,
    summaryNone: (period) => `${period}: ninguna colecta de sangre cerca de usted.`,
    summarySome: (period, n, list) =>
      `${period}: ${n === 1 ? '1 colecta de sangre' : `${n} colectas de sangre`} cerca de usted, ${list}.`,
    others: (n) => (n === 1 ? '1 más' : `${n} más`),
    and: 'y',
  },
};

/** The lines of the "Check" action. */
export const REPORTS = {
  en: {
    waiting: 'The EFS drives have not been read yet.',
    read: (n, hours) => `${n} drive day(s) in the zone, read ${hours} h ago.`,
    error: (message) => `Last reading failed: ${message}.`,
    noPosition: 'No position: locate the house in Gladys, or enter a latitude and a longitude.',
    pointError: 'The point entered is not valid: the house is used.',
    zone: (where, km) => `Zone: ${km} km around ${where}.`,
    house: 'the house',
    point: 'the point entered',
    device: (added) => (added ? 'Device added in Gladys.' : 'Device not added yet (Discover tab).'),
  },
  fr: {
    waiting: "Les collectes de l'EFS n'ont pas encore été lues.",
    read: (n, hours) => `${n} journée(s) de collecte dans la zone, lues il y a ${hours} h.`,
    error: (message) => `Dernière lecture en échec : ${message}.`,
    noPosition:
      'Aucune position : localise la maison dans Gladys, ou saisis une latitude et une longitude.',
    pointError: "Le point saisi n'est pas valide : la maison est utilisée.",
    zone: (where, km) => `Zone : ${km} km autour de ${where}.`,
    house: 'la maison',
    point: 'le point saisi',
    device: (added) =>
      added ? 'Appareil ajouté dans Gladys.' : 'Appareil pas encore ajouté (onglet Découverte).',
  },
  de: {
    waiting: 'Die EFS-Termine wurden noch nicht gelesen.',
    read: (n, hours) => `${n} Spendetag(e) in der Zone, vor ${hours} h gelesen.`,
    error: (message) => `Letztes Lesen fehlgeschlagen: ${message}.`,
    noPosition: 'Keine Position: verorte das Haus in Gladys oder gib Breiten- und Längengrad ein.',
    pointError: 'Der eingegebene Punkt ist ungültig: das Haus wird verwendet.',
    zone: (where, km) => `Zone: ${km} km um ${where}.`,
    house: 'das Haus',
    point: 'den eingegebenen Punkt',
    device: (added) =>
      added ? 'Gerät in Gladys hinzugefügt.' : 'Gerät noch nicht hinzugefügt (Reiter Entdecken).',
  },
  es: {
    waiting: 'Las colectas del EFS aún no se han leído.',
    read: (n, hours) => `${n} día(s) de colecta en la zona, leídos hace ${hours} h.`,
    error: (message) => `Última lectura fallida: ${message}.`,
    noPosition: 'Sin posición: ubique la casa en Gladys, o introduzca una latitud y una longitud.',
    pointError: 'El punto introducido no es válido: se usa la casa.',
    zone: (where, km) => `Zona: ${km} km alrededor de ${where}.`,
    house: 'la casa',
    point: 'el punto introducido',
    device: (added) =>
      added ? 'Dispositivo añadido en Gladys.' : 'Dispositivo aún no añadido (pestaña Descubrir).',
  },
};

export const INIT_FAILED = {
  en: 'The Blood donation integration could not start: see its logs.',
  fr: "L'intégration Don du sang n'a pas pu démarrer : consulte ses journaux.",
  de: 'Die Integration Blutspende konnte nicht starten: sieh dir ihre Protokolle an.',
  es: 'La integración Donación de sangre no pudo iniciarse: consulte sus registros.',
};

const formatters = new Map();

function formatter(key, create) {
  if (!formatters.has(key)) {
    formatters.set(key, create());
  }
  return formatters.get(key);
}

/** "today", "tomorrow" or "mar. 3 nov." for a calendar date. */
export function formatDay(date, language, today) {
  const text = pick(TEXT, language);
  if (date === today) {
    return text.today;
  }
  if (date === addDays(today, 1)) {
    return text.tomorrow;
  }
  const locale = pick(LOCALES, language);
  return formatter(
    `day:${locale}`,
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
  ).format(new Date(`${date}T00:00:00Z`));
}

/** "10:00–13:30, 14:30–19:00". */
export function formatHours(slots, language) {
  if (!slots.length) {
    return pick(TEXT, language).hoursUnknown;
  }
  return slots.map(([from, to]) => `${from}–${to}`).join(', ');
}

/** "mar. 3 nov., 15:00–19:00". */
export const formatWhen = (occurrence, language, today) =>
  `${formatDay(occurrence.date, language, today)}, ${formatHours(occurrence.slots, language)}`;

/** "4.2" / "4,2" (kilometres, one decimal). */
export function formatKm(km, language) {
  const locale = pick(LOCALES, language);
  return formatter(
    `km:${locale}`,
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
  ).format(km);
}

/** "SALLE DES FÊTES, MURET". */
export const placeText = (occurrence) =>
  [occurrence.place, occurrence.city].filter(Boolean).join(', ');

/** "Online appointment · 19 of 44 slots free", or "No online appointment". */
export function bookingText(occurrence, language) {
  const text = pick(TEXT, language);
  if (!occurrence.booking) {
    return text.noBooking;
  }
  if (occurrence.placesTotal) {
    const places =
      occurrence.placesLeft === 0
        ? text.full
        : occurrence.placesLeft === null
          ? null
          : text.places(occurrence.placesLeft, occurrence.placesTotal);
    return [text.booking, places].filter(Boolean).join(' · ');
  }
  return text.booking;
}
