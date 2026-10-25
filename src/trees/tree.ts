import type { Position } from "../geo";

/** Unique identifier of a Tree in the Baumkataster (`OBJECTID`). */
export type TreeId = number & { readonly __brand: "TreeId" };

/** The number on a Tree's tag. Not unique across the city. */
export type TreeNumber = string & { readonly __brand: "TreeNumber" };

export type Species = {
  readonly scientificName: string;
  readonly commonName: string | null;
};

/** A bucketed measurement: either a closed range or "over" an upper bound. */
export type SizeClass =
  | { readonly kind: "range"; readonly minMeters: number; readonly maxMeters: number }
  | { readonly kind: "over"; readonly meters: number };

export type TreeLocation = {
  /** Street, park or facility the Tree is registered to. */
  readonly name: string | null;
  /** Vienna district, 1–23. */
  readonly district: number | null;
  readonly area: string | null;
};

export type Tree = {
  readonly id: TreeId;
  readonly number: TreeNumber | null;
  readonly species: Species | null;
  readonly location: TreeLocation;
  readonly plantedIn: number | null;
  readonly trunkCircumferenceCm: number | null;
  readonly height: SizeClass | null;
  readonly crownDiameter: SizeClass | null;
  readonly position: Position;
};

function isTreeId(value: number): value is TreeId {
  return Number.isSafeInteger(value) && value > 0;
}

export function parseTreeId(raw: string | number): TreeId | null {
  const value = typeof raw === "number" ? raw : Number(raw.trim());
  return isTreeId(value) ? value : null;
}

function isTreeNumber(value: string): value is TreeNumber {
  return /^[\p{L}\p{N}][^\p{C}'"\\]{0,39}$/u.test(value);
}

/**
 * Accepts what can be printed on a tag: starts with a letter or digit, up to 40 characters,
 * no quotes, backslashes or control characters.
 */
export function parseTreeNumber(raw: string): TreeNumber | null {
  const value = raw.trim();
  return isTreeNumber(value) ? value : null;
}
