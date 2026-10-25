import { describe, expect, it } from "vitest";

import { boundingBox, distanceMeters } from "./index.ts";

const stephansdom = { latitude: 48.208_49, longitude: 16.373_08 };
const riesenrad = { latitude: 48.216_67, longitude: 16.395_83 };

describe("distanceMeters", () => {
  it("is zero between a position and itself", () => {
    expect(distanceMeters(stephansdom, stephansdom)).toBe(0);
  });

  it("measures Stephansdom to Riesenrad as about 1.92 km", () => {
    // Worked example: 910 m north and 1688 m east on a local flat grid, √(910² + 1688²) ≈ 1917 m.
    expect(distanceMeters(stephansdom, riesenrad)).toBeCloseTo(1_917, -1);
  });

  it("is symmetric", () => {
    expect(distanceMeters(riesenrad, stephansdom)).toBe(distanceMeters(stephansdom, riesenrad));
  });

  it("measures one degree of latitude as about 111.2 km", () => {
    const north = { latitude: 49.208_49, longitude: 16.373_08 };
    expect(distanceMeters(stephansdom, north)).toBeCloseTo(111_195, -1);
  });
});

describe("boundingBox", () => {
  it("spans about ±0.009° latitude and ±0.0135° longitude for 1 km in Vienna", () => {
    const box = boundingBox(stephansdom, 1_000);
    expect(stephansdom.latitude - box.south).toBeCloseTo(0.009, 4);
    expect(box.east - stephansdom.longitude).toBeCloseTo(0.0135, 4);
  });

  it("has edges exactly one radius away from the centre", () => {
    const box = boundingBox(stephansdom, 1_000);
    const northEdge = { latitude: box.north, longitude: stephansdom.longitude };
    const eastEdge = { latitude: stephansdom.latitude, longitude: box.east };
    expect(distanceMeters(stephansdom, northEdge)).toBeCloseTo(1_000, 3);
    expect(distanceMeters(stephansdom, eastEdge)).toBeCloseTo(1_000, 0);
  });
});
