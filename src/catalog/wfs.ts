import { boundingBox } from "../geo";
import type { ActiveSearch } from "../search";
import { TREE_SOURCE } from "../trees";

/** The Search radius of a Nearby search. */
export const SEARCH_RADIUS_METERS = 1_000;

/**
 * Upper bound on Trees per request. A 1 km box in the densest districts holds a few thousand
 * Trees; the WFS cannot order by distance, so the limit must be above that.
 */
export const FEATURE_LIMIT = 5_000;

const cqlString = (value: string): string => `'${value.replaceAll("'", "''")}'`;

/** ECQL filter for a Search. Coordinates are longitude first, matching srsName=EPSG:4326 output. */
export function cqlFilter(search: ActiveSearch): string {
  switch (search.kind) {
    case "tree": {
      return `${TREE_SOURCE.idColumn}=${String(search.treeId)}`;
    }
    case "treeNumber": {
      return `${TREE_SOURCE.numberColumn}=${cqlString(search.treeNumber)}`;
    }
    case "species": {
      return `${TREE_SOURCE.speciesColumn} ILIKE ${cqlString(`%${search.term}%`)}`;
    }
    case "nearby": {
      const box = boundingBox(search.near, SEARCH_RADIUS_METERS);
      const corners = [box.west, box.south, box.east, box.north].map(String).join(",");
      const bbox = `BBOX(${TREE_SOURCE.geometryColumn},${corners},'EPSG:4326')`;
      const number =
        search.treeNumber === null
          ? null
          : `${TREE_SOURCE.numberColumn}=${cqlString(search.treeNumber)}`;
      const species =
        search.species === undefined
          ? null
          : `${TREE_SOURCE.speciesColumn} ILIKE ${cqlString(`%${search.species}%`)}`;
      return [bbox, number, species].filter((part) => part !== null).join(" AND ");
    }
    default: {
      const exhaustive: never = search;
      return exhaustive;
    }
  }
}

/** GetFeature request for a Search, against the WFS at `baseUrl` (e.g. "https://data.wien.gv.at"). */
export function wfsUrl(baseUrl: string, search: ActiveSearch): string {
  const params = new URLSearchParams({
    service: "WFS",
    version: "1.1.0",
    request: "GetFeature",
    typeName: TREE_SOURCE.layer,
    srsName: "EPSG:4326",
    outputFormat: "json",
    propertyName: TREE_SOURCE.columns.join(","),
    maxFeatures: String(FEATURE_LIMIT + 1),
    CQL_FILTER: cqlFilter(search),
  });
  return `${baseUrl.replace(/\/+$/u, "")}/daten/geo?${params.toString()}`;
}
