import * as z from "zod/mini";

import { parseTreeId, parseTreeNumber } from "./tree.ts";
import type { SizeClass, Species, Tree } from "./tree.ts";

/** A positive number, or null for the source's "not recorded" values (0, "", null, missing). */
const recorded = z.pipe(
  z.optional(z.union([z.number(), z.string(), z.null()])),
  z.transform((raw): number | null => {
    if (raw === null || raw === undefined) return null;
    const value = typeof raw === "number" ? raw : Number(raw.trim().replace(",", "."));
    return Number.isFinite(value) && value > 0 ? value : null;
  }),
);

const text = z.pipe(
  z.optional(z.union([z.string(), z.number(), z.null()])),
  z.transform((raw): string | null => {
    if (raw === null || raw === undefined) return null;
    const value = String(raw).trim();
    return value === "" ? null : value;
  }),
);

const treeProperties = z.object({
  OBJECTID: z.union([z.number(), z.string()]),
  BAUMNUMMER: text,
  BEZIRK: recorded,
  OBJEKT_STRASSE: text,
  GEBIETSGRUPPE: text,
  GATTUNG_ART: text,
  PFLANZJAHR: recorded,
  STAMMUMFANG: recorded,
  BAUMHOEHE: recorded,
  KRONENDURCHMESSER: recorded,
});

type Column = keyof typeof treeProperties.shape;

const GEOMETRY_COLUMN = "SHAPE";

/**
 * Where the Baumkataster lives in the city's WFS and what its columns are called. The column
 * list is derived from the schema, so asking for a new field is one edit.
 */
export const TREE_SOURCE = {
  layer: "ogdwien:BAUMKATOGD",
  idColumn: "OBJECTID" satisfies Column,
  speciesColumn: "GATTUNG_ART" satisfies Column,
  numberColumn: "BAUMNUMMER" satisfies Column,
  geometryColumn: GEOMETRY_COLUMN,
  columns: [...Object.keys(treeProperties.shape), GEOMETRY_COLUMN],
} as const;

const point = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple(
    [
      z.number().check(z.minimum(-180), z.maximum(180)),
      z.number().check(z.minimum(-90), z.maximum(90)),
    ],
    z.number(),
  ),
});

const treeFeature = z.object({
  type: z.literal("Feature"),
  geometry: z.nullable(point),
  properties: treeProperties,
});

const treeCollection = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(treeFeature),
});

type TreeFeature = z.infer<typeof treeFeature>;

export class TreeFormatError extends Error {
  override readonly name = "TreeFormatError";
}

/**
 * Height classes: 1 = 0–5 m, n = (5n−4)–5n m, 8 = over 35 m.
 * Crown diameter classes: 1 = 0–3 m, n = (3n−2)–3n m, 8 = over 21 m.
 * 0 or any other code means not recorded.
 */
function sizeClass(code: number | null, step: number): SizeClass | null {
  if (code === null || !Number.isInteger(code) || code > 8) return null;
  if (code === 8) return { kind: "over", meters: 7 * step };
  if (code === 1) return { kind: "range", minMeters: 0, maxMeters: step };
  return { kind: "range", minMeters: step * (code - 1) + 1, maxMeters: step * code };
}

const SPECIES_WITH_COMMON_NAME = /^(?<scientific>.+?)\s*\((?<common>[^()]+)\)$/u;

function species(raw: string | null): Species | null {
  if (raw === null) return null;
  const match = SPECIES_WITH_COMMON_NAME.exec(raw);
  const scientific = match?.groups?.["scientific"];
  const common = match?.groups?.["common"];
  if (scientific === undefined || common === undefined) {
    return { scientificName: raw, commonName: null };
  }
  return { scientificName: scientific.trim(), commonName: common.trim() };
}

function toTree({ geometry, properties: p }: TreeFeature): Tree | null {
  if (geometry === null) return null;
  const id = parseTreeId(p.OBJECTID);
  if (id === null) throw new TreeFormatError(`Invalid OBJECTID: ${String(p.OBJECTID)}`);
  const [longitude, latitude] = geometry.coordinates;
  return {
    id,
    number: p.BAUMNUMMER === null ? null : parseTreeNumber(p.BAUMNUMMER),
    species: species(p.GATTUNG_ART),
    location: { name: p.OBJEKT_STRASSE, district: p.BEZIRK, area: p.GEBIETSGRUPPE },
    plantedIn: p.PFLANZJAHR,
    trunkCircumferenceCm: p.STAMMUMFANG,
    height: sizeClass(p.BAUMHOEHE, 5),
    crownDiameter: sizeClass(p.KRONENDURCHMESSER, 3),
    position: { latitude, longitude },
  };
}

export type TreeCollection = {
  readonly trees: readonly Tree[];
  /** Features in the response, including the ones skipped for lack of geometry. */
  readonly featureCount: number;
};

/**
 * Parses a Baumkataster GeoJSON FeatureCollection (EPSG:4326, longitude first).
 * Features without geometry are skipped; any other mismatch throws TreeFormatError.
 */
export function parseTreeCollection(json: unknown): TreeCollection {
  const result = treeCollection.safeParse(json);
  if (!result.success) throw new TreeFormatError(z.prettifyError(result.error));
  const { features } = result.data;
  return {
    trees: features.map(toTree).filter((tree) => tree !== null),
    featureCount: features.length,
  };
}
