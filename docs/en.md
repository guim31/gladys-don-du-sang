# Don du sang (blood donation)

The upcoming **blood drives of the Établissement français du sang (EFS)** around your house, in
Gladys: how many in the next days, where and when the next one is, whether you can book online,
and alerts in your scenes. The data comes from the public map of the EFS, the one behind
[dondesang.efs.sante.fr](https://dondesang.efs.sante.fr/trouver-une-collecte): **no account, no
key**.

Mainland France and the overseas departments served by the EFS.

## What you get

- One device, **the zone**: around the house located in Gladys, or around a point you enter, within
  5 to 50 km.
- Its sensors: the number of drive days in the **next 7 days** and in the **next 30 days**, and the
  **next drive**: place and town, day and hours, distance, online appointment and free slots.
- A **dashboard widget** "Blood drives": the next drives of the zone (8 at most), with day, hours,
  distance and a link to book.
- **Scene triggers**: "New blood drive announced", "Blood drive today" (every morning around 8)
  and "Blood drive tomorrow" (every evening around 6 pm).
- A **scene action** "Nearby blood drives": the drives of a period in one sentence, ready to send or
  to say.
- Texts in English, French, German and Spanish.

Always check the drive and the donation criteria on the EFS website before going: hours can change,
and not everyone can give blood on a given day.

## Requirements

- Gladys Assistant **5.3.0** or later.
- Internet access from Gladys (`oudonner.api.efs.sante.fr`).
- The house located in Gladys (Settings → Houses), or a point entered in the configuration.

## Installation

In Gladys, open **Integrations → Install from GitHub** and enter the address of this repository:
`https://github.com/guim31/gladys-don-du-sang`. Gladys downloads the image and starts the
integration.

## Configuration

### Settings

- **Radius**: 5, 10, 20 (default), 30 or 50 km around the centre of the zone, as the crow flies.
- **Latitude / Longitude of another point**: leave both empty to use the house located in Gladys.
  Enter both (decimal degrees, dot or comma: `43.6045` and `1.4440`) to follow another place: your
  office, your parents' town.
- **Language of names and messages**: the language of the feature names, of the scene texts and of
  the "Check" report (French by default). Places and towns stay as the EFS writes them.

### Add the device

Save the configuration, then open the **Discover** tab of the integration and add the device
"Don du sang" ("Blood donation" in English). Its names are fixed when it is added: choose the
language first.

### Check

The **Check** button shows the zone used (house or point, radius), the last reading of the EFS and
its result, and whether the device is added.

## Device

| Feature                    | Type          | Content                                        |
| -------------------------- | ------------- | ---------------------------------------------- |
| Drives in the next 7 days  | counter       | drive days from today to the 6th day after     |
| Drives in the next 30 days | counter       | drive days from today to the 29th day after    |
| Next drive: place          | text          | `SALLE DES FÊTES, MURET`                       |
| Next drive: date           | text          | `tomorrow, 10:00–13:30, 14:30–19:00`           |
| Next drive: distance       | distance (km) | from the centre of the zone, as the crow flies |
| Next drive: appointment    | text          | `Online appointment · 19 of 44 slots free`     |

A drive over two days counts as two drive days. A drive leaves "next" when its last slot ends.

## Dashboard widget

Add the widget **Blood drives** to a dashboard. Settings: the period (today, tomorrow, next 7 days,
next 30 days), the caption with the count, and the "Book online" badge. Each row shows the place,
the day and hours, the distance; a tap opens the address, the free slots and the link to book on
the EFS website.

## Scene triggers

- **New blood drive announced**: the EFS publishes a new drive day in the zone (read twice a day).
  The first reading of a zone is the reference: nothing is announced at installation, nor when you
  change the zone.
- **Blood drive today**: every morning around 8, for each drive of the zone that day.
- **Blood drive tomorrow**: every evening around 6 pm, for each drive of the zone the next day.

Variables: place, town, address, date and hours, day (`YYYY-MM-DD`), hours, distance (km),
appointment, booking link, end (ISO 8601).

## Scene action

**Nearby blood drives**: choose a period and the number of drives named; the action returns a
sentence ("Next 7 days: 6 blood drives nearby, …"), the number of drive days (to continue only if
there is one), the place, the date and the booking link of the next drive.

## Scene examples

- "Blood drive tomorrow" → send a message: `Blood drive tomorrow at {{place}}, {{city}}:
{{hours}}. Eat well and drink plenty of water! {{url}}`.
- Every Monday at 8 → "Nearby blood drives" (next 7 days) → continue only if the number is above
  0 → say the sentence on the speaker.
- "New blood drive announced" → a notification with the place and the date.

## Data and refresh

- Source: the map API of the EFS (`oudonner.api.efs.sante.fr/carto-api`, v3), published on
  data.gouv.fr ("Lieux et horaires des collectes de sang") under the Licence Ouverte 2.0.
- One request **every 12 hours** (twice a day at most), for the drives from today on. A failed
  reading is tried again after an hour; the known drives stay shown.
- Around Paris, the EFS takes up to a minute to answer: the first reading after a start can take
  that long.
- Every 10 minutes, without network, the counts and the next drive follow the clock.
- The request carries the centre of the zone **rounded to about a kilometre**: the exact position
  of your house is not sent. Distances are computed by the integration.
- Drives reserved to the staff of a company, a school or an army unit are left out.
- What was already announced is kept in `/data/state.json`, so a restart announces nothing twice.

## Troubleshooting

- **No device in the Discover tab**: the house is not located in Gladys and no point is entered.
  The "Check" button says it.
- **Counts at 0**: no public drive within the radius; try a larger radius. The EFS publishes about
  ten weeks ahead.
- **"Last reading failed"**: the EFS website is unreachable; the integration tries again every hour.
- **A drive is missing or different**: the EFS is the reference; check its website.
- Logs: set `LOG_LEVEL=debug` for the detail of each reading.

## Limitations

- Only the mobile drives (village halls, companies open to the public, universities); the permanent
  donation centres ("Maisons du don") have their own opening hours and are not listed.
- The appointment information is the one of the EFS map: online booking offered, free slots for
  blood donation. Plasma and platelet donations are by appointment in donation centres.
- Distances are as the crow flies.
- Not affiliated with the Établissement français du sang.

## Credits

- Data: [Établissement français du sang](https://efs.sante.fr), Licence Ouverte 2.0
  ([data.gouv.fr](https://www.data.gouv.fr/datasets/lieux-et-horaires-des-collectes-de-sang)).
- Built on the [Gladys Assistant integration SDK](https://github.com/GladysAssistant/integration-sdk-js).
