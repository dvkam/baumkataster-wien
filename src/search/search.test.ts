import { describe, expect, it } from "vitest";

import { parseTreeId, parseTreeNumber } from "../trees";
import type { TreeId, TreeNumber } from "../trees";
import { nearby, parseSearch, searchToParams, treeNumberOf, withTreeNumber } from "./index.ts";
import type { Search } from "./index.ts";

const treeId = (raw: number): TreeId => parseTreeId(raw) as TreeId;
const treeNumber = (raw: string): TreeNumber => parseTreeNumber(raw) as TreeNumber;
const fromAddress = (query: string): Search => parseSearch(new URLSearchParams(query));

describe("parseSearch", () => {
  it("reads nothing as no Search", () => {
    expect(fromAddress("")).toEqual({ kind: "none" });
  });

  it("reads a Tree id", () => {
    expect(fromAddress("baum=4711")).toEqual({ kind: "tree", treeId: 4711 });
  });

  it("reads a Tree number", () => {
    expect(fromAddress("nummer=1026")).toEqual({ kind: "treeNumber", treeNumber: "1026" });
  });

  it("reads a Nearby search", () => {
    expect(fromAddress("nahe=48.20849,16.37308")).toEqual({
      kind: "nearby",
      near: { latitude: 48.208_49, longitude: 16.373_08 },
      treeNumber: null,
    });
  });

  it("reads a Nearby search narrowed to a Tree number", () => {
    expect(fromAddress("nahe=48.2,16.4&nummer=12")).toMatchObject({
      kind: "nearby",
      treeNumber: "12",
    });
  });

  it("lets a Tree id win over other criteria", () => {
    expect(fromAddress("nummer=12&nahe=48.2,16.4&baum=9")).toEqual({ kind: "tree", treeId: 9 });
  });

  it.each([
    "baum=abc",
    "baum=0",
    "nummer=%20",
    "nahe=48.2",
    "nahe=91,16",
    "nahe=90,0",
    "nahe=a,b",
    "nahe=48.2,",
  ])("ignores the malformed criterion in %j", (query) => {
    expect(fromAddress(query)).toEqual({ kind: "none" });
  });
});

describe("searchToParams", () => {
  it.each<Search>([
    { kind: "none" },
    { kind: "tree", treeId: treeId(4711) },
    { kind: "treeNumber", treeNumber: treeNumber("12a") },
    nearby({ latitude: 48.208_49, longitude: 16.373_08 }),
    nearby({ latitude: 48.208_49, longitude: 16.373_08 }, treeNumber("7")),
  ])("round-trips %j through the address", (search) => {
    expect(parseSearch(searchToParams(search))).toEqual(search);
  });

  it("writes readable parameters", () => {
    const search = nearby({ latitude: 48.208_49, longitude: 16.373_08 }, treeNumber("7"));
    expect(searchToParams(search).toString()).toBe("nahe=48.20849%2C16.37308&nummer=7");
  });
});

describe("nearby", () => {
  it("rounds the Position to about one metre", () => {
    expect(nearby({ latitude: 48.208_494_9, longitude: 16.373_075_1 })).toMatchObject({
      near: { latitude: 48.208_49, longitude: 16.373_08 },
    });
  });
});

describe("withTreeNumber", () => {
  const here = { latitude: 48.2, longitude: 16.4 };
  const there = { latitude: 48.25, longitude: 16.3 };

  it("narrows a Nearby search on screen, keeping its Position", () => {
    expect(withTreeNumber(nearby(there), treeNumber("7"), here)).toEqual(
      nearby(there, treeNumber("7")),
    );
  });

  it("searches around the device when there is no Nearby search on screen", () => {
    expect(withTreeNumber({ kind: "none" }, treeNumber("7"), here)).toEqual(
      nearby(here, treeNumber("7")),
    );
  });

  it("searches city-wide without a Position", () => {
    expect(withTreeNumber({ kind: "tree", treeId: treeId(1) }, treeNumber("7"), null)).toEqual({
      kind: "treeNumber",
      treeNumber: "7",
    });
  });

  it("clears the number back to the plain Nearby search or to nothing", () => {
    expect(withTreeNumber(nearby(there, treeNumber("7")), null, null)).toEqual(nearby(there));
    expect(withTreeNumber({ kind: "treeNumber", treeNumber: treeNumber("7") }, null, null)).toEqual(
      { kind: "none" },
    );
  });
});

describe("treeNumberOf", () => {
  it("reads the number of Tree number and Nearby searches only", () => {
    expect(treeNumberOf({ kind: "treeNumber", treeNumber: treeNumber("7") })).toBe("7");
    expect(treeNumberOf(nearby({ latitude: 48.2, longitude: 16.4 }, treeNumber("8")))).toBe("8");
    expect(treeNumberOf({ kind: "tree", treeId: treeId(1) })).toBeNull();
  });
});
