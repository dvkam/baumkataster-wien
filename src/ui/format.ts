import type { SizeClass, Species } from "../trees";

const LOCALE = "de-AT";

const metres = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const kilometres = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const count = new Intl.NumberFormat(LOCALE);

export function formatDistance(meters: number): string {
  if (meters < 1_000) return `${metres.format(meters)} m`;
  return `${kilometres.format(meters / 1_000)} km`;
}

export function formatSizeClass(size: SizeClass): string {
  switch (size.kind) {
    case "range": {
      return `${String(size.minMeters)}–${String(size.maxMeters)} m`;
    }
    case "over": {
      return `über ${String(size.meters)} m`;
    }
    default: {
      const exhaustive: never = size;
      return exhaustive;
    }
  }
}

export function formatCount(value: number, one: string, many: string): string {
  return `${count.format(value)} ${value === 1 ? one : many}`;
}

export const formatDistrict = (district: number): string => `${String(district)}. Bezirk`;

/** The name people know a Species by: the German name if there is one. */
export const speciesTitle = (species: Species | null): string =>
  species?.commonName ?? species?.scientificName ?? "Art nicht erfasst";

/** The secondary line under the title, or null when the title already is the scientific name. */
export const speciesSubtitle = (species: Species | null): string | null =>
  species?.commonName === null || species === null ? null : species.scientificName;

export function formatAge(plantedIn: number, now: Date): string {
  const years = now.getFullYear() - plantedIn;
  if (years < 1) return "dieses Jahr gepflanzt";
  return formatCount(years, "Jahr", "Jahre");
}
