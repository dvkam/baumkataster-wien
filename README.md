# Baumkataster Wien

Look up any city tree in Vienna: stand next to it, tap **In meiner Nähe**, and see every tree within 1 km, nearest first, with species, planting year and size. Or type the number from the tree's tag.

A rewrite of [plepe/baumkataster-wien](https://github.com/plepe/baumkataster-wien) (PHP + SQLite) as a React app with **no backend**: it asks the city's open-data WFS for exactly the trees a search needs.

## Quick start

```sh
nvm use          # Node 22
npm ci
npm run dev      # http://localhost:5173, /ogd is proxied to data.wien.gv.at
```

| Script            | What it does                                           |
| ----------------- | ------------------------------------------------------ |
| `npm run dev`     | Vite dev server with the `/ogd` proxy                  |
| `npm run build`   | Typecheck (`tsc -b`) and production build              |
| `npm run preview` | Serve the build, also with the `/ogd` proxy            |
| `npm test`        | Vitest (unit and app-level tests)                      |
| `npm run lint`    | oxlint, type-aware, warnings fail                      |
| `npm run format`  | oxfmt                                                  |
| `npm run check`   | typecheck + lint + format check + tests (what CI runs) |

## How it works

```
address (?nahe=… | ?nummer=… | ?baum=…)
   │  useSearch: the address owns the Search
   ▼
Search ──► catalog.lookup(search) ──► WFS GetFeature (GeoJSON, CQL filter)
                │                         ogdwien:BAUMKATOGD
                ▼
           parse (Zod) → Tree[] → distance, 1 km cut, order → Findings
                │
                ▼
           useFindings → StatusLine / FindingList / TreeDetail
```

- **Nearby search** asks for the trees in a bounding box around your position (`BBOX(SHAPE,…)`), then computes exact distances, drops everything beyond 1 km and sorts. While you walk, the search follows you once you've moved more than 100 m.
- **Tree number search** asks for `BAUMNUMMER='…'`. Tree numbers are **not unique** in Vienna, so you usually get several trees; with your location on, the number search is limited to your surroundings.
- **One tree** is addressed by its `OBJECTID` (`?baum=…`), which is unique.
- Every search lives in the address, so links, reload and back/forward work.

The design rationale is in [`docs/`](docs): [spec](docs/spec.md), [architecture](docs/architecture.md), [ADR 0001: query the WFS directly](docs/adr/0001-query-the-wfs-directly.md), [ADR 0002: the address owns the Search](docs/adr/0002-the-address-owns-the-search.md). Domain terms are in [GLOSSARY.md](GLOSSARY.md).

### Source layout

| Folder        | Owns                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `src/geo`     | Position, haversine distance, bounding box                                                     |
| `src/trees`   | The Tree model and parsing the Baumkataster's GeoJSON (the only place that knows column names) |
| `src/search`  | The Search union and its address codec                                                         |
| `src/catalog` | `createCatalog({ baseUrl, fetch }).lookup(search, signal)`, the only network seam              |
| `src/app`     | React hooks: `useSearch`, `useFindings`, `useNearby`                                           |
| `src/ui`      | Presentational components (styles live in `src/styles.css`)                                    |

Modules import each other only through their `index.ts`; oxlint fails on deep imports.

## Deploying

The build is static (`dist/`). The browser needs to reach the WFS at `${VITE_OGD_BASE_URL}/daten/geo`:

- **Same-origin proxy (recommended):** serve `dist/` and proxy `/ogd/*` to `https://data.wien.gv.at/*`. Works regardless of the city's CORS policy. This is the default (`VITE_OGD_BASE_URL` unset → `/ogd`).
- **Direct:** build with `VITE_OGD_BASE_URL=https://data.wien.gv.at` if the city's WFS sends CORS headers for your origin. This wasn't verifiable while building this, so check it in a browser first.

## Things worth knowing

- **Verify against the live WFS once.** The request shape (`outputFormat=json`, `CQL_FILTER`, geometry column `SHAPE`, longitude-first `BBOX` in `EPSG:4326`) follows GeoServer conventions and the original app's CSV import, but the build sandbox couldn't reach data.wien.gv.at. If the city answers differently, `src/catalog/wfs.ts` is the one file to adjust; `src/catalog/catalog.test.ts` pins the current shape.
- **Size classes** (height, crown diameter) are decoded from the city's class codes the same way the original app did: height class _n_ = (5n−4)–5n m, crown class _n_ = (3n−2)–3n m, class 8 = "over".
- **Limits:** up to 5000 trees per request (enough for a 1 km box in the densest districts); the app says when a list was cut off.

## Tooling

React 19.3, TypeScript 7 (strict, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, …), Vite 8, Vitest 5 with Testing Library and happy-dom, oxlint with type-aware rules, oxfmt, Zod 4 (mini).

## Data

[Baumkataster der Stadt Wien](https://www.data.gv.at/katalog/dataset/stadt-wien_baumkatasterderstadtwien), Stadt Wien – data.wien.gv.at, CC BY 4.0.
