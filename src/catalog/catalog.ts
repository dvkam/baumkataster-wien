import { distanceMeters } from "../geo";
import type { ActiveSearch } from "../search";
import { parseTreeCollection, TreeFormatError } from "../trees";
import type { Tree, TreeCollection } from "../trees";
import { FEATURE_LIMIT, SEARCH_RADIUS_METERS, wfsUrl } from "./wfs.ts";

export type Finding = {
  readonly tree: Tree;
  /** Distance from the Search's Position; null when the Search has no Position. */
  readonly distanceMeters: number | null;
};

export type Findings = {
  readonly items: readonly Finding[];
  /** True when the Baumkataster had more matches than one request may return. */
  readonly truncated: boolean;
};

export type Catalog = {
  /** Rejects with CatalogError, or with the signal's AbortError when aborted. */
  readonly lookup: (search: ActiveSearch, signal: AbortSignal) => Promise<Findings>;
};

export type CatalogErrorKind = "network" | "http" | "format";

export class CatalogError extends Error {
  override readonly name = "CatalogError";
  readonly kind: CatalogErrorKind;

  constructor(kind: CatalogErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.kind = kind;
  }
}

export type CatalogOptions = {
  /** Origin of the city's open data services, e.g. "https://data.wien.gv.at" or a proxy path. */
  readonly baseUrl: string;
  readonly fetch: typeof globalThis.fetch;
};

const UNKNOWN_DISTRICT_LAST = Number.POSITIVE_INFINITY;

const byDistrictThenPlace = (a: Finding, b: Finding): number =>
  (a.tree.location.district ?? UNKNOWN_DISTRICT_LAST) -
    (b.tree.location.district ?? UNKNOWN_DISTRICT_LAST) ||
  (a.tree.location.name ?? "").localeCompare(b.tree.location.name ?? "", "de");

const byDistance = (a: Finding, b: Finding): number =>
  (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);

function rank(search: ActiveSearch, trees: readonly Tree[]): readonly Finding[] {
  if (search.kind !== "nearby") {
    return trees.map((tree) => ({ tree, distanceMeters: null })).toSorted(byDistrictThenPlace);
  }
  return trees
    .map((tree) => ({ tree, distanceMeters: distanceMeters(search.near, tree.position) }))
    .filter((finding) => finding.distanceMeters <= SEARCH_RADIUS_METERS)
    .toSorted(byDistance);
}

async function request(
  options: CatalogOptions,
  url: string,
  signal: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await options.fetch(url, { signal, headers: { Accept: "application/json" } });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new CatalogError("network", "The Baumkataster could not be reached.", { cause: error });
  }
  if (!response.ok) {
    throw new CatalogError("http", `The Baumkataster answered ${String(response.status)}.`);
  }
  try {
    return await response.json();
  } catch (error) {
    if (signal.aborted) throw error;
    throw new CatalogError("format", "The Baumkataster did not answer with JSON.", {
      cause: error,
    });
  }
}

export function createCatalog(options: CatalogOptions): Catalog {
  return {
    async lookup(search, signal) {
      const json = await request(options, wfsUrl(options.baseUrl, search), signal);
      let collection: TreeCollection;
      try {
        collection = parseTreeCollection(json);
      } catch (error) {
        if (!(error instanceof TreeFormatError)) throw error;
        throw new CatalogError("format", error.message, { cause: error });
      }
      return {
        items: rank(search, collection.trees.slice(0, FEATURE_LIMIT)),
        truncated: collection.featureCount > FEATURE_LIMIT,
      };
    },
  };
}
