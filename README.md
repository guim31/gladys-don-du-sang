# Don du sang for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) integration for the upcoming **blood drives of the
Établissement français du sang (EFS)** around your house, read from the public map of the EFS (the
one behind [dondesang.efs.sante.fr](https://dondesang.efs.sante.fr/trouver-une-collecte)). **No
account, no key.**

## Features

- **One device, the zone**: around the house located in Gladys, or around a point you enter, within
  5 to 50 km.
- The number of drive days in the **next 7 days** and the **next 30 days**, and the **next drive**:
  place and town, day and hours, distance, online appointment and free slots.
- **Widget** "Blood drives": the next drives of the zone, with day, hours, distance, an "online
  appointment" badge and a link to book.
- **Scene triggers**: "New blood drive announced", "Blood drive today" (every morning around 8),
  "Blood drive tomorrow" (every evening around 6 pm).
- **Scene action** "Nearby blood drives": the drives of a period in one sentence, ready to send or
  to say.
- Texts in English, French, German and Spanish.

Always check the drive and the donation criteria on the EFS website before going.

## Requirements

- Gladys Assistant **5.3.0** or later.
- Internet access from Gladys (`oudonner.api.efs.sante.fr`).
- The house located in Gladys, or a point entered in the configuration.

## Installation

In Gladys, **Integrations → Install from GitHub**, then enter
`https://github.com/guim31/gladys-don-du-sang`. Choose the radius (and another point if you want),
save, then add the device from the **Discover** tab. Full guide: [English](docs/en.md),
[français](docs/fr.md), [Deutsch](docs/de.md), [español](docs/es.md).

## How it works

- One request to the EFS map API (`carto-api` v3, `samplingcollection/searchinsquare`) **every 12
  hours**: the drives from today on, in the square around the zone. The API is public, published on
  data.gouv.fr ("Lieux et horaires des collectes de sang") under the Licence Ouverte 2.0; two
  requests a day are a light load.
- The centre sent is **rounded to about a kilometre**: the exact position of the house never leaves
  Gladys. The radius and the distances are applied in the container.
- Drives reserved to a company, a school or an army unit (`isPublic: false`) are left out. The
  API's own `HidePrivateCollects` filter is not used: it also drops public drives.
- A drive over several half-days or days becomes one entry per day. The counts and the next drive
  are computed again every 10 minutes against the clock, and only changes are sent to Gladys.
- The drive days already announced and the days of the last "today" / "tomorrow" passes are kept in
  `/data/state.json`, so a restart announces nothing twice.

## Limitations

- Mobile drives only: the permanent donation centres ("Maisons du don") are not listed.
- Distances are as the crow flies.
- Tested against the real EFS API and the fake Gladys of the SDK; feedback from a real Gladys is
  welcome.

## Credits

- Data: [Établissement français du sang](https://efs.sante.fr), Licence Ouverte 2.0
  ([data.gouv.fr](https://www.data.gouv.fr/datasets/lieux-et-horaires-des-collectes-de-sang)).
- Cover: the logo of the EFS, from
  [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Logo_EFS_2026.svg) (public domain).
- Built on the [Gladys Assistant integration SDK](https://github.com/GladysAssistant/integration-sdk-js)
  and its [JavaScript template](https://github.com/GladysAssistant/integration-template-js).

Not affiliated with the Établissement français du sang.

## Development

```bash
npm ci
npm run format:check && npm run lint && npm test
npx -y github:GladysAssistant/integration-store --skip-image-check .
```

The tests run against a real answer of the EFS API (`test/fixtures/efs-toulouse.json`, public data)
and the SDK's fake Gladys; nothing touches the network.

## License

[Apache-2.0](LICENSE).
