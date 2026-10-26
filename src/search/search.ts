import type { Position } from "../geo";
import { parseTreeId, parseTreeNumber } from "../trees";
import type { TreeId, TreeNumber } from "../trees";
/** What the person is asking for. The page address is its single owner. */
export type Search =
  | { readonly kind: "none" }
  | { readonly kind: "tree"; readonly treeId: TreeId }
  | { readonly kind: "treeNumber"; readonly treeNumber: TreeNumber }
  | { readonly kind: "species"; readonly term: string }
  | {
      readonly kind: "nearby";
      readonly near: Position;
      readonly treeNumber: TreeNumber | null;
      readonly species?: string;
    };
export type ActiveSearch = Exclude<Search, { kind: "none" }>;
export type NearbySearch = Extract<Search, { kind: "nearby" }>;
const NONE: Search = { kind: "none" };
const PARAM = { tree: "baum", treeNumber: "nummer", near: "nahe", species: "art" } as const;
/** Five decimals is about one metre: precise enough to find a tree, short enough to share. */
const COORDINATE_DECIMALS = 5;
function roundCoordinate(value: number): number {
  const factor = 10 ** COORDINATE_DECIMALS;
  return Math.round(value * factor) / factor;
}
function parsePosition(raw: string): Position | null {
  const parts = raw.split(",").map((part) => part.trim());
  if (parts.length !== 2 || parts.includes("")) return null;
  const [latitude, longitude] = parts.map(Number);
  if (latitude === undefined || longitude === undefined) return null;
  // Beyond ±85° a 1 km box spans most longitudes; nobody is looking for Vienna's trees there.
  if (!(Math.abs(latitude) <= 85 && Math.abs(longitude) <= 180)) return null;
  return { latitude, longitude };
}
export function nearby(
  near: Position,
  treeNumber: TreeNumber | null = null,
  species: string | null = null,
): NearbySearch {
  return {
    kind: "nearby",
    near: { latitude: roundCoordinate(near.latitude), longitude: roundCoordinate(near.longitude) },
    treeNumber,
    ...(species === null ? {} : { species }),
  };
}
/** The Tree number a Search is narrowed to, if any. */
export function treeNumberOf(search: Search): TreeNumber | null {
  switch (search.kind) {
    case "treeNumber":
    case "nearby": {
      return search.treeNumber;
    }
    case "none":
    case "species":
    case "tree": {
      return null;
    }
    default: {
      const exhaustive: never = search;
      return exhaustive;
    }
  }
}
/**
 * The Search for a Tree number (or for none) given what is on screen and where the device is:
 * a Nearby search keeps its Position, otherwise the device's Position is used if known, otherwise
 * the number is searched city-wide.
 */
export function withTreeNumber(
  search: Search,
  treeNumber: TreeNumber | null,
  here: Position | null,
): Search {
  if (search.kind === "nearby") return nearby(search.near, treeNumber);
  if (here !== null) return nearby(here, treeNumber);
  return treeNumber === null ? NONE : { kind: "treeNumber", treeNumber };
}
export function parseSearch(params: URLSearchParams): Search {
  const treeId = parseTreeId(params.get(PARAM.tree) ?? "");
  if (treeId !== null) return { kind: "tree", treeId };
  const treeNumber = parseTreeNumber(params.get(PARAM.treeNumber) ?? "");
  const species = parseSpecies(params.get(PARAM.species) ?? "");
  const near = parsePosition(params.get(PARAM.near) ?? "");
  if (near !== null) return nearby(near, treeNumber, treeNumber === null ? species : null);
  if (treeNumber !== null) return { kind: "treeNumber", treeNumber };
  if (species !== null) return { kind: "species", term: species };
  return NONE;
}
export function searchToParams(search: Search): URLSearchParams {
  switch (search.kind) {
    case "none": {
      return new URLSearchParams();
    }
    case "tree": {
      return new URLSearchParams({ [PARAM.tree]: String(search.treeId) });
    }
    case "treeNumber": {
      return new URLSearchParams({ [PARAM.treeNumber]: search.treeNumber });
    }
    case "species": {
      return new URLSearchParams({ [PARAM.species]: search.term });
    }
    case "nearby": {
      const params = new URLSearchParams({
        [PARAM.near]: `${search.near.latitude},${search.near.longitude}`,
      });
      if (search.treeNumber !== null) params.set(PARAM.treeNumber, search.treeNumber);
      if (search.species !== undefined) params.set(PARAM.species, search.species);
      return params;
    }
    default: {
      const exhaustive: never = search;
      return exhaustive;
    }
  }
}
export function parseSpecies(raw: string): string | null {
  const value = raw.trim().replaceAll(/\s+/gu, " ");
  return /^[\p{L}][\p{L}\p{N} .()'’-]{1,79}$/u.test(value) ? value : null;
}
export function speciesOf(search: Search): string | null {
  if (search.kind === "species") return search.term;
  return search.kind === "nearby" ? (search.species ?? null) : null;
}
