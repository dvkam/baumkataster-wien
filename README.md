# Baumkataster Wien

Find trees in Vienna by the number on their tag or by location. The app shows species, planting year, trunk circumference, height and crown diameter where the city has recorded them.

[Source code](https://github.com/dvkam/baumkataster-wien)

The interface is in German. It uses React and queries Vienna's public WFS directly. No database, API key or application backend is required.

## Start locally

Install Node.js 24 LTS and Git, then run:

```sh
git clone https://github.com/dvkam/baumkataster-wien.git
cd baumkataster-wien
npm ci
npm run dev
```

Open the local address printed by Vite. If you use nvm, `nvm use` selects the version in `.nvmrc`.

## Use the app

Enter a tree number and select **Suchen**. Numbers repeat across Vienna, so the search may return several trees.

Select **In meiner Nähe** to request location access. Results cover a radius of 1 km and sort by distance. Selecting the button again stops location tracking. While tracking, moving more than 100 metres starts a new search.

The home page also has links for the Hundertwasserhaus, Stadtpark and Volksgarten. These use fixed public coordinates and need no location permission.

Select a result to see its recorded measurements and a link to OpenStreetMap. Search criteria are part of the URL, so browser history and copied links work. Nearby URLs contain coordinates. Share them only if you intend to share that location.

## Data source

The source is [Baumkataster der Stadt Wien](https://www.data.gv.at/datasets/c91a4635-8b7d-43fe-9b27-d95dec8392a7?locale=de), provided by Stadt Wien through data.wien.gv.at under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

| Setting      | Value                                                           |
| ------------ | --------------------------------------------------------------- |
| Endpoint     | `https://data.wien.gv.at/daten/geo`                             |
| Service      | WFS 1.1.0, `GetFeature`                                         |
| Layer        | `ogdwien:BAUMKATOGD`                                            |
| Response     | GeoJSON, `EPSG:4326`                                            |
| Filters      | `CQL_FILTER`, tree number, object ID or bounding box            |
| Geometry     | `SHAPE`, longitude then latitude in GeoJSON                     |
| Result limit | 5,000 usable records, with an extra record to detect truncation |

The app requests a bounding box for nearby searches, calculates Haversine distances and removes results beyond 1 km. The result list reveals 30 items at a time. This is local pagination of one bounded response, not server pagination. A notice appears if the server response exceeds the limit.

`BAUMNUMMER` is a label, not a unique key. Detail URLs use `OBJECTID`. Do not assume an object ID is permanent across data replacements.

Height and crown diameter are size classes, not exact measurements. The parser converts the city's class codes into ranges. Missing values stay missing. It validates the response with Zod and rejects coordinates outside geographic bounds.

The app keeps the last eight successful searches in memory. It does not download the whole city dataset, store your location on an application server or use analytics. Location searches send a bounding box to the city's service.

## Coverage and research

On 26 October 2026, [Vienna's city-tree information page](https://www.wien.gv.at/umwelt/stadtbaeume) stated that the municipal register documents over 393,000 trees, including over 99,000 street trees. Those figures describe the municipal register. They are not the number of records available through this app.

An unfiltered WFS response during this review reported 233,102 records. Later requests returned empty collections, including requests without a search filter. The service subsequently returned records again and passed the live nearby, number and object ID tests. These are dated observations, not a maintained total. The app does not display a fixed citywide count or invent a last-updated date.

The open data includes street and park trees but is not a census of every tree in Vienna. An absent record does not prove that a tree is absent or has been removed. Consult the [official Umweltgut map](https://www.wien.gv.at/umwelt/umweltgut) for the city's own presentation.

## Tooling

These versions matched the npm `latest` tags checked on 26 October 2026:

| Package             | Version |
| ------------------- | ------- |
| React and React DOM | 19.3.1  |
| TypeScript          | 7.0.2   |
| Vite                | 8.3.5   |
| Oxlint              | 1.89.0  |
| Oxfmt               | 0.74.0  |

Dependencies are pinned and `package-lock.json` records the installation. Oxlint runs type-aware rules and fails on warnings. Oxfmt formats source and documentation.

TypeScript enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, unused-code checks, `noUncheckedSideEffectImports`, `verbatimModuleSyntax` and `erasableSyntaxOnly`. Unreachable code and unused labels are errors.

`skipLibCheck` remains enabled for external declaration files. Turning it off exposed a Happy DOM declaration referring to `UnderlyingDefaultSource`, which the installed Node declarations do not export. Application code still receives the strict checks above.

## Checks

```sh
npm run check
npm run build
npm run preview
```

`check` runs TypeScript, Oxlint, Oxfmt and Vitest. Tests cover coordinate calculations, response parsing, search URLs, result ranking, navigation, location handling and the app's search interactions. CI also builds the production bundle.

The optional live test contacts the city, so it requires network access and a working upstream service:

```sh
# macOS, Linux or WSL
VITE_LIVE_WFS=1 npm test -- src/catalog/live.test.ts
```

```powershell
# PowerShell
$env:VITE_LIVE_WFS = '1'
npm test -- src/catalog/live.test.ts
Remove-Item Env:VITE_LIVE_WFS
```

The live test checks nearby, number and object ID lookups with the same parser as the app. Empty upstream results fail the test. Ordinary CI keeps this test disabled so an upstream outage does not block unrelated changes.

## Hosting

`npm run build` produces static files in `dist/`. Upload that directory to a static HTTPS host. Relative asset paths support hosting under a repository subdirectory.

Development uses Vite's `/ogd` proxy. Production calls `https://data.wien.gv.at` directly by default. The city's response included `Access-Control-Allow-Origin: *` during the review. If that policy changes, configure a host-side proxy and build with `VITE_OGD_BASE_URL=/ogd`. The proxy must forward `/ogd/*` to `https://data.wien.gv.at/*` after removing `/ogd`.

Vite's preview server is for checking the build locally. It is not a production server. Location access requires HTTPS or localhost.

## Code and design

| Directory     | Responsibility                             |
| ------------- | ------------------------------------------ |
| `src/geo`     | Coordinates, distance and bounding boxes   |
| `src/trees`   | Tree types and source-data validation      |
| `src/search`  | Search types and URL parsing               |
| `src/catalog` | WFS requests, result limits and sorting    |
| `src/app`     | React state, navigation and location hooks |
| `src/ui`      | Search controls, results and detail views  |

The design takes inspiration from Hundertwasser's tree forms, irregular outlines and coloured architectural details. The illustration is an original SVG. Text and controls remain simple, with keyboard focus indicators, a skip link, dark mode and reduced-motion support. The project has no affiliation with Hundertwasser's estate or the City of Vienna.

The PHP application [plepe/baumkataster-wien](https://github.com/plepe/baumkataster-wien) supplied the original idea. This repository uses a React implementation with direct WFS queries. See `docs/` for the search model and architecture decisions.
