# Spec: Baumkataster Wien

> You may know this document as a PRD.

## Problem Statement

I'm standing next to a city tree in Vienna and want to know what it is: its species, when it was planted, how big it is. The tree has a small tag with a number on it, but tree numbers repeat across the city, and the city's open data is a raw 200,000-row feed that is useless on a phone.

The existing app (plepe/baumkataster-wien) solved this with a PHP server that mirrored the whole feed into SQLite. That needs a server, a manual import, and its data goes stale.

## Solution

A single-page web app with no backend. I can:

- tap **In meiner Nähe** and see every Tree within 1 km, nearest first, updating as I walk;
- type a **Tree number** and see every Tree carrying it, optionally only the ones near me;
- open one Tree to see everything the Baumkataster knows about it, with a link to the map.

The app asks the city's WFS directly for just the Trees a Search needs, so the data is always current.

## User Stories

1. As a passer-by, I want to list the Trees around my Position, so that I can identify the one in front of me.
2. As a passer-by, I want the list ordered by Distance, so that the nearest Tree is at the top.
3. As a passer-by, I want to see the Distance to each Tree, so that I can match the list to what I see.
4. As a walker, I want the Nearby search to follow me, so that I don't have to search again after moving.
5. As a walker, I don't want the list to reload for every metre I move, so that it stays readable (Refetch threshold 100 m).
6. As a passer-by, I want to type the Tree number from the tag, so that I can find that Tree directly.
7. As a passer-by, I want a Tree number search to be narrowed to my surroundings when I have shared my Position, so that I don't see the same number from other districts first.
8. As a passer-by, I want to be told when a Tree number exists in several places, so that I understand why there are several results.
9. As a curious person, I want to see a Tree's Species with both scientific and German name, so that I learn what it is.
10. As a curious person, I want to see the planting year, so that I know how old the Tree is.
11. As a curious person, I want to see height and crown diameter as readable ranges (e.g. "11–15 m"), so that the Size classes make sense without a codebook.
12. As a curious person, I want to see the trunk circumference, so that I can compare Trees.
13. As a curious person, I want to see the street or park and district, so that I know where the Tree is registered.
14. As a curious person, I want to open a Tree's Location on OpenStreetMap, so that I can see it on a map.
15. As a person sharing a find, I want the page address to encode my Search, so that a link reproduces exactly what I see.
16. As a person using browser back/forward, I want to move between my previous Searches and Trees, so that navigation behaves like any website.
17. As a person who denied location access, I want a clear explanation and still be able to search by Tree number, so that the app stays useful.
18. As a person on a device without geolocation, I want the location button to say it isn't available, so that I'm not left waiting.
19. As a person with a slow connection, I want the previous results to stay visible while new ones load, so that the screen doesn't flash empty.
20. As a person whose Search failed, I want to see a short reason and be able to retry, so that I'm not stuck.
21. As a person whose Search found nothing, I want to be told so plainly, so that I don't think it's still loading.
22. As a person in a dense park, I want long result lists to show the first 30 and let me load more, so that the page stays fast.
23. As a person who prefers reduced motion, I want animations limited to fades, so that the app doesn't make me queasy.
24. As a person using a screen reader, I want the result count announced and the list properly labelled, so that I can use the app without sight.
25. As a person using dark mode, I want the app to follow my system theme, so that it isn't blinding at night.
26. As a developer, I want the WFS request built in one place with tests, so that a change on the city's side is a one-function fix.
27. As a developer, I want the city's response validated where it enters the app, so that a schema change fails loudly instead of rendering garbage.
28. As a developer, I want to run the app locally without CORS trouble, so that development doesn't depend on the city's server headers.

## Implementation Decisions

- **No backend.** The browser queries the city's WFS (`ogdwien:BAUMKATOGD`, GeoJSON, EPSG:4326) with a server-side CQL filter. See ADR 0001.
- **Modules, organised by domain knowledge, not by execution step:**
  - _geo_: Position, Distance (haversine), bounding box around a Position for a radius.
  - _trees_: the Tree model and everything about reading one from the Baumkataster: parsing a GeoJSON feature, Species split, Size class decoding. The only module that knows source column names; it exports them (`TREE_SOURCE`, derived from the parse schema) for the request builder.
  - _search_: the Search union and its codec to and from the page address.
  - _catalog_: the deep module. One operation, `lookup(search, signal) → Findings`. Hides URL building, CQL, HTTP, parsing, radius cut and ordering.
  - _app_: React wiring. `useSearch` (address as the single owner, ADR 0002), `useFindings` (request lifecycle; loading is derived from which Search the last answer belongs to), `useNearby` over `useDevicePosition` (geolocation as a state machine, plus the follow-the-device policy).
  - _ui_: presentational components.
- **Search** is a discriminated union. A Nearby search may carry a Tree number filter; a Tree number search without a Position is its own variant; a Tree id lookup is a third. "No criteria" is a separate `none` variant, so a Search with neither Position nor Tree number cannot be built.
- **Branded primitives**: `TreeId` and `TreeNumber` are branded and only made by parse functions.
- **Size classes** are decoded from the numeric class codes the Baumkataster stores (height: class 1 = 0–5 m, n = 5n−4…5n m, 8 = over 35 m; crown: class 1 = 0–3 m, n = 3n−2…3n m, 8 = over 21 m; 0 = not recorded), the same scheme the original app used.
- **Validation at the boundary** with Zod. A response whose shape doesn't match fails the Search with a "format" error. Features without geometry are skipped, because they cannot be placed.
- **Error model**: `CatalogError` with `kind: "network" | "http" | "format"`.
- **Limits**: at most 20,000 records per request; Findings say when that limit was hit.
- **Navigation extras that serve stories 4, 15 and 16**: TanStack Query caches recent successful responses for navigation; an in-app "Zurück" goes back in history when the previous entry is this app; "In meiner Nähe" is a toggle that stops the GPS; a Tree links to all Trees with its number.
- **Libraries.** React 19, TanStack Router, TanStack Query and Leaflet, with plain CSS.
- **Motion** follows Emil Kowalski's design-engineering rules: movement only through `transform` and `opacity` (colour changes on hover and press use plain `ease`), custom ease-out, ≤ 300 ms, `:active` press scale, hover gated behind `(hover: hover)`, short stagger on result entry, fades only under reduced motion.
- **Tooling**: Vite 8, TypeScript 7 with a strict configuration (including `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `erasableSyntaxOnly`), oxlint with type-aware rules, oxfmt, Vitest.

## Testing Decisions

- Tests exercise behaviour through module interfaces only. Expected values come from worked examples, not from re-running the implementation's formula.
- **Seams under test:**
  1. _catalog_ `lookup()` with a fake `fetch`: catches wrong request URLs, wrong parsing, wrong ordering or radius cut, and error mapping. Misses real-server differences (verified manually against the live WFS).
  2. _search_ codec: catches broken links and back/forward state. Misses nothing user-visible on its own.
  3. _geo_ distance against known city distances: catches formula and unit errors.
  4. _App_ rendered with a fake `fetch` (Testing Library, happy-dom): catches wiring between address, Search, Findings and UI. Misses visual design.
- No mocks of internal modules. The only fake is `fetch` (and `navigator.geolocation` in the App test), the two things we can't run locally.

## Out of Scope

- A map view. Each Tree links to OpenStreetMap instead.
- Offline support / caching the whole Baumkataster.
- Editing or reporting Trees to the city.
- Server-side rendering.
- Translations other than German (the original UI is German; the source data is German).

## Further Notes

- The original app's comment claims its bounding box is ~1.5 km; at Vienna's latitude (48.2° N) ±0.0090° latitude and ±0.0135° longitude are both ~1.0 km. The rewrite computes the box from the radius.
- The original computed Distance twice (spherical law of cosines in SQLite with R = 6378.14 km, haversine in the browser with R = 6371 km), so server and client disagreed by ~0.1 %. The rewrite has one Distance function.

## Map and expanded search

The search form distinguishes places, species and tree numbers. Photon resolves addresses and landmarks only after submission. Users select a place before the app requests its nearby trees. Species queries filter `GATTUNG_ART` with a case-insensitive substring match. They can be citywide or combined with a nearby bounding box.

The Leaflet map displays the same tree results as the list. Marker clicks open details. Moving the map does not request tree data until the user selects `Hier suchen`. That action retains the current number or species filter and stops device tracking.
