import { describe, expect, it } from "vitest";

import { parsePlaces } from "./index.ts";

describe("place results", () => {
  it("keeps Vienna results and rejects coordinates outside the requested area", () => {
    const properties = {
      osm_id: 42,
      osm_type: "N",
      name: "Hundertwasserhaus",
      street: "Kegelgasse",
      housenumber: "36",
      city: "Wien",
    };
    const result = parsePlaces({
      features: [
        { geometry: { type: "Point", coordinates: [16.394, 48.207] }, properties },
        { geometry: { type: "Point", coordinates: [13.4, 52.5] }, properties },
      ],
    });
    expect(result).toEqual([
      {
        id: "N42",
        name: "Hundertwasserhaus",
        address: "Kegelgasse 36 Wien",
        position: { longitude: 16.394, latitude: 48.207 },
      },
    ]);
  });
  it("rejects malformed geocoder data", () => {
    expect(() => parsePlaces({ features: [{}] })).toThrow(/Invalid input/u);
  });
});
