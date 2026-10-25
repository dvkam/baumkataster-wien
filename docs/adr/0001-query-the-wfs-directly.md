# 1. Query the city's WFS directly instead of mirroring it

## Status

Accepted

## Context

The original PHP app (plepe/baumkataster-wien) downloaded the whole Baumkataster as CSV, stored it in SQLite and served queries from there through `data.php`. That gave it a fast bounding-box and attribute filter, at the cost of a server, a cron-style import and stale data between imports.

The city publishes the same layer (`ogdwien:BAUMKATOGD`) through an OGC Web Feature Service that can filter on the server and return GeoJSON. A Nearby search only needs the Trees inside a ~1 km box: hundreds in most districts, a few thousand in the densest ones.

## Decision

The app asks the WFS directly from the browser for exactly the Trees a Search needs, as GeoJSON, filtered on the server with a CQL filter (`BBOX(...)`, `BAUMNUMMER = ...`, `OBJECTID = ...`). The exact Distance, the Search radius cut and ordering happen in the browser.

The WFS origin is configurable (`VITE_OGD_BASE_URL`). In development Vite proxies `/ogd` to `https://data.wien.gv.at`, so local work never depends on the city's CORS headers.

## Consequences

- No backend or import job. Results depend on the availability and contents of the city service.
- Every Search is one network request to the city. A static host in production must either be allowed by the WFS's CORS policy or put the same `/ogd` reverse proxy in front of it.
- The request shape (CQL syntax, axis order, geometry column `SHAPE`) lives in one file, `src/catalog/wfs.ts` (`wfsUrl`, `cqlFilter`), with tests; the column names come from `TREE_SOURCE` in `src/trees`. If the city changes its server, that is the one place to change.
- On 26 October 2026 the WFS returned `Access-Control-Allow-Origin: *`. Production uses the city URL directly by default. If that policy changes, use a same-origin proxy. See `docs/verification.md` for the live-service checks.
