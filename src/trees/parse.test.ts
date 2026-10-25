import { describe, expect, it } from "vitest";

import { rawCollection, rawTree } from "./fixtures.ts";
import { parseTreeCollection, parseTreeId, parseTreeNumber, TreeFormatError } from "./index.ts";

const parseOne = (properties: Parameters<typeof rawTree>[0]) => {
  const [tree] = parseTreeCollection(rawCollection([rawTree(properties)])).trees;
  if (tree === undefined) throw new Error("expected one tree");
  return tree;
};

describe("parseTreeCollection", () => {
  it("reads a Baumkataster feature into a Tree", () => {
    const tree = parseOne({
      OBJECTID: 4711,
      BAUMNUMMER: "1026",
      BEZIRK: 21,
      OBJEKT_STRASSE: "Brünner Straße",
      GEBIETSGRUPPE: "Floridsdorf",
      GATTUNG_ART: "Tilia cordata 'Greenspire' (Winterlinde)",
      PFLANZJAHR: 2004,
      STAMMUMFANG: 95,
      BAUMHOEHE: 2,
      KRONENDURCHMESSER: 3,
    });

    expect(tree).toEqual({
      id: 4711,
      number: "1026",
      species: { scientificName: "Tilia cordata 'Greenspire'", commonName: "Winterlinde" },
      location: { name: "Brünner Straße", district: 21, area: "Floridsdorf" },
      plantedIn: 2004,
      trunkCircumferenceCm: 95,
      height: { kind: "range", minMeters: 6, maxMeters: 10 },
      crownDiameter: { kind: "range", minMeters: 7, maxMeters: 9 },
      position: { latitude: 48.208, longitude: 16.373 },
    });
  });

  it("reads coordinates longitude first", () => {
    const [tree] = parseTreeCollection(rawCollection([rawTree({}, [16.4, 48.2])])).trees;
    expect(tree?.position).toEqual({ latitude: 48.2, longitude: 16.4 });
  });

  it.each([
    [1, { kind: "range", minMeters: 0, maxMeters: 5 }],
    [2, { kind: "range", minMeters: 6, maxMeters: 10 }],
    [7, { kind: "range", minMeters: 31, maxMeters: 35 }],
    [8, { kind: "over", meters: 35 }],
    [0, null],
    [9, null],
  ])("decodes height class %i", (code, expected) => {
    expect(parseOne({ BAUMHOEHE: code }).height).toEqual(expected);
  });

  it.each([
    [1, { kind: "range", minMeters: 0, maxMeters: 3 }],
    [2, { kind: "range", minMeters: 4, maxMeters: 6 }],
    [7, { kind: "range", minMeters: 19, maxMeters: 21 }],
    [8, { kind: "over", meters: 21 }],
    [0, null],
  ])("decodes crown diameter class %i", (code, expected) => {
    expect(parseOne({ KRONENDURCHMESSER: code }).crownDiameter).toEqual(expected);
  });

  it("keeps a species without a common name as scientific name only", () => {
    expect(parseOne({ GATTUNG_ART: "Platanus x acerifolia" }).species).toEqual({
      scientificName: "Platanus x acerifolia",
      commonName: null,
    });
  });

  it("treats 0, empty and missing values as not recorded", () => {
    const tree = parseOne({
      BAUMNUMMER: " ",
      GATTUNG_ART: "",
      PFLANZJAHR: 0,
      STAMMUMFANG: null,
      BEZIRK: "0",
    });
    expect(tree).toMatchObject({
      number: null,
      species: null,
      plantedIn: null,
      trunkCircumferenceCm: null,
      location: { district: null },
    });
  });

  it("treats properties the WFS left out as not recorded", () => {
    const feature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [16.4, 48.2] },
      properties: { OBJECTID: 3 },
    };
    const [tree] = parseTreeCollection(rawCollection([feature])).trees;
    expect(tree).toMatchObject({ id: 3, number: null, species: null, plantedIn: null });
  });

  it("accepts numbers delivered as strings", () => {
    const tree = parseOne({ OBJECTID: "12", PFLANZJAHR: "1999", STAMMUMFANG: "80" });
    expect(tree).toMatchObject({ id: 12, plantedIn: 1999, trunkCircumferenceCm: 80 });
  });

  it("skips features without geometry but still counts them", () => {
    const { trees, featureCount } = parseTreeCollection(
      rawCollection([rawTree({ OBJECTID: 1 }, null), rawTree({ OBJECTID: 2 })]),
    );
    expect(trees.map((tree) => tree.id)).toEqual([2]);
    expect(featureCount).toBe(2);
  });

  it("rejects a response that isn't a FeatureCollection", () => {
    expect(() => parseTreeCollection({ error: "Service unavailable" })).toThrow(TreeFormatError);
  });

  it("rejects a feature whose id is not a positive integer", () => {
    expect(() => parseOne({ OBJECTID: "abc" })).toThrow(TreeFormatError);
  });
});

describe("parseTreeId", () => {
  it.each([
    ["42", 42],
    [" 7 ", 7],
    ["0", null],
    ["-3", null],
    ["1.5", null],
    ["", null],
  ])("parses %j as %j", (raw, expected) => {
    expect(parseTreeId(raw)).toBe(expected);
  });
});

describe("parseTreeNumber", () => {
  it.each([
    ["1026", "1026"],
    [" 12a ", "12a"],
    ["3/1", "3/1"],
    ["", null],
    ["   ", null],
    ["A 12-3", "A 12-3"],
    ["x".repeat(40), "x".repeat(40)],
    ["'; DROP", null],
    ["-12", null],
    ["12\\", null],
    ["x".repeat(41), null],
  ])("parses %j as %j", (raw, expected) => {
    expect(parseTreeNumber(raw)).toBe(expected);
  });
});
