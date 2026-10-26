import * as z from "zod/mini";

import type { Position } from "../geo";

export type Place = {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly position: Position;
};
const optionalText = z.optional(z.string());
const collection = z.object({
  features: z.array(
    z.object({
      geometry: z.object({
        type: z.literal("Point"),
        coordinates: z.tuple([z.number(), z.number()]),
      }),
      properties: z.object({
        osm_id: z.number(),
        osm_type: z.string(),
        name: optionalText,
        street: optionalText,
        housenumber: optionalText,
        postcode: optionalText,
        city: optionalText,
      }),
    }),
  ),
});

export function parsePlaces(json: unknown): readonly Place[] {
  return collection
    .parse(json)
    .features.filter(
      ({
        geometry: {
          coordinates: [lon, lat],
        },
      }) => lon >= 16.18 && lon <= 16.58 && lat >= 48.11 && lat <= 48.33,
    )
    .map(
      ({
        geometry: {
          coordinates: [longitude, latitude],
        },
        properties: p,
      }) => ({
        id: `${p.osm_type}${String(p.osm_id)}`,
        name: p.name ?? p.street ?? "Ort in Wien",
        address: [p.street, p.housenumber, p.postcode, p.city].filter(Boolean).join(" "),
        position: { latitude, longitude },
      }),
    );
}

export async function findPlaces(term: string, signal: AbortSignal): Promise<readonly Place[]> {
  const params = new URLSearchParams({
    q: term,
    bbox: "16.18,48.11,16.58,48.33",
    limit: "5",
    lang: "de",
  });
  const base = import.meta.env["VITE_GEOCODER_URL"] ?? "https://photon.komoot.io/api/";
  const response = await fetch(`${base}?${params.toString()}`, { signal });
  if (!response.ok) throw new Error("Die Ortssuche ist gerade nicht erreichbar.");
  const json: unknown = await response.json();
  return parsePlaces(json);
}
