/** Test helpers that build Baumkataster GeoJSON the way the city's WFS returns it. */

export type RawProperties = Record<string, string | number | null>;

const defaults: RawProperties = {
  OBJECTID: 1,
  BAUMNUMMER: "1",
  BEZIRK: 1,
  OBJEKT_STRASSE: "Stephansplatz",
  GEBIETSGRUPPE: "Innere Stadt",
  GATTUNG_ART: "Acer platanoides (Spitzahorn)",
  PFLANZJAHR: 1990,
  STAMMUMFANG: 120,
  BAUMHOEHE: 3,
  KRONENDURCHMESSER: 4,
};

export function rawTree(
  properties: RawProperties,
  coordinates: readonly [longitude: number, latitude: number] | null = [16.373, 48.208],
): unknown {
  return {
    type: "Feature",
    id: `BAUMKATOGD.${String(properties["OBJECTID"] ?? defaults["OBJECTID"])}`,
    geometry: coordinates === null ? null : { type: "Point", coordinates },
    properties: { ...defaults, ...properties },
  };
}

export function rawCollection(features: readonly unknown[]): unknown {
  return {
    type: "FeatureCollection",
    features,
    totalFeatures: features.length,
    numberReturned: features.length,
  };
}
