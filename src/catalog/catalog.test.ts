import { describe, expect, it, vi } from "vitest";

import { nearby } from "../search";
import type { ActiveSearch } from "../search";
import { parseTreeId, parseTreeNumber } from "../trees";
import type { TreeId, TreeNumber } from "../trees";
import { rawCollection, rawTree } from "../trees/fixtures.ts";
import { CatalogError, createCatalog } from "./index.ts";
import type { Catalog } from "./index.ts";

type Fetch = typeof globalThis.fetch;

const stephansdom = { latitude: 48.208_49, longitude: 16.373_08 };
const treeNumber = (raw: string) => parseTreeNumber(raw) as TreeNumber;
const treeId = (raw: number) => parseTreeId(raw) as TreeId;

function catalogAnswering(body: unknown, init: ResponseInit = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const fetch = vi.fn<Fetch>(() => Promise.resolve(new Response(text, init)));
  return { catalog: createCatalog({ baseUrl: "https://data.wien.gv.at", fetch }), fetch };
}

function urlOf(input: Parameters<Fetch>[0] | undefined): string {
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.href;
  return input ?? "";
}

function requestedUrl(fetch: { mock: { calls: Parameters<Fetch>[] } }): URL {
  return new URL(urlOf(fetch.mock.calls[0]?.[0]), "https://app.invalid");
}

/** [west, south, east, north] from a `BBOX(SHAPE,…)` filter. */
function bboxOf(url: URL): number[] {
  const match = /^BBOX\(SHAPE,([\d.]+),([\d.]+),([\d.]+),([\d.]+),'EPSG:4326'\)/u.exec(
    url.searchParams.get("CQL_FILTER") ?? "",
  );
  return match === null ? [] : match.slice(1).map(Number);
}

const lookup = async (catalog: Catalog, search: ActiveSearch) =>
  await catalog.lookup(search, new AbortController().signal);

describe("catalog.lookup for a Nearby search", () => {
  it("asks the WFS for Trees in a box around the Position, longitude first", async () => {
    const { catalog, fetch } = catalogAnswering(rawCollection([]));
    await lookup(catalog, nearby(stephansdom));

    const url = requestedUrl(fetch);
    expect(url.origin + url.pathname).toBe("https://data.wien.gv.at/daten/geo");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      service: "WFS",
      request: "GetFeature",
      typeName: "ogdwien:BAUMKATOGD",
      srsName: "EPSG:4326",
      outputFormat: "json",
    });
    const [west, south, east, north] = bboxOf(url);
    expect(west).toBeCloseTo(16.3596, 4);
    expect(south).toBeCloseTo(48.1995, 4);
    expect(east).toBeCloseTo(16.3866, 4);
    expect(north).toBeCloseTo(48.2175, 4);
  });

  it("returns only Trees within 1 km, nearest first, with their Distance", async () => {
    const fiveHundredMetresNorth = rawTree({ OBJECTID: 1 }, [16.373_08, 48.212_99]);
    const hundredMetresNorth = rawTree({ OBJECTID: 2 }, [16.373_08, 48.209_39]);
    const inBoxCornerButTooFar = rawTree({ OBJECTID: 3 }, [16.386, 48.217]);
    const { catalog } = catalogAnswering(
      rawCollection([fiveHundredMetresNorth, hundredMetresNorth, inBoxCornerButTooFar]),
    );
    const findings = await lookup(catalog, nearby(stephansdom));

    expect(findings.items.map((item) => item.tree.id)).toEqual([2, 1]);
    expect(findings.items[0]?.distanceMeters).toBeCloseTo(100, 0);
    expect(findings.items[1]?.distanceMeters).toBeCloseTo(500, 0);
    expect(findings.truncated).toBe(false);
  });

  it("narrows to a Tree number when one is given", async () => {
    const { catalog, fetch } = catalogAnswering(rawCollection([]));
    await lookup(catalog, nearby(stephansdom, treeNumber("1026")));
    expect(requestedUrl(fetch).searchParams.get("CQL_FILTER")).toMatch(
      /^BBOX\(SHAPE,.+\) AND BAUMNUMMER='1026'$/u,
    );
  });
});

describe("catalog.lookup for a Tree number search", () => {
  it("asks for every Tree with that number and orders them by district", async () => {
    const { catalog, fetch } = catalogAnswering(
      rawCollection([
        rawTree({ OBJECTID: 1, BEZIRK: 21, OBJEKT_STRASSE: "Brünner Straße" }),
        rawTree({ OBJECTID: 2, BEZIRK: 3, OBJEKT_STRASSE: "Stadtpark" }),
        rawTree({ OBJECTID: 3, BEZIRK: 3, OBJEKT_STRASSE: "Arenbergpark" }),
      ]),
    );
    const findings = await lookup(catalog, { kind: "treeNumber", treeNumber: treeNumber("12") });

    expect(requestedUrl(fetch).searchParams.get("CQL_FILTER")).toBe("BAUMNUMMER='12'");
    expect(findings.items.map((item) => item.tree.id)).toEqual([3, 2, 1]);
    expect(findings.items.map((item) => item.distanceMeters)).toEqual([null, null, null]);
  });
});

describe("catalog.lookup for one Tree", () => {
  it("asks for the Tree id", async () => {
    const { catalog, fetch } = catalogAnswering(rawCollection([rawTree({ OBJECTID: 4711 })]));
    const findings = await lookup(catalog, { kind: "tree", treeId: treeId(4711) });

    expect(requestedUrl(fetch).searchParams.get("CQL_FILTER")).toBe("OBJECTID=4711");
    expect(findings.items.map((item) => item.tree.id)).toEqual([4711]);
  });

  it("accepts a relative proxy path with a trailing slash as base URL", async () => {
    const fetch = vi.fn<Fetch>(() => Promise.resolve(Response.json(rawCollection([]))));
    const catalog = createCatalog({ baseUrl: "/ogd/", fetch });
    await lookup(catalog, { kind: "tree", treeId: treeId(1) });
    expect(urlOf(fetch.mock.calls[0]?.[0])).toMatch(/^\/ogd\/daten\/geo\?/u);
  });
});

describe("catalog.lookup limits", () => {
  it("counts features without geometry when deciding the list was cut off", async () => {
    const features = [
      rawTree({ OBJECTID: 1 }, null),
      ...Array.from({ length: 5_000 }, (_, index) => rawTree({ OBJECTID: index + 2 })),
    ];
    const { catalog } = catalogAnswering(rawCollection(features));
    const findings = await lookup(catalog, { kind: "treeNumber", treeNumber: treeNumber("1") });
    expect(findings.truncated).toBe(true);
  });

  it("says when the Baumkataster had more matches than one request returns", async () => {
    const features = Array.from({ length: 5_001 }, (_, index) => rawTree({ OBJECTID: index + 1 }));
    const { catalog } = catalogAnswering(rawCollection(features));
    const findings = await lookup(catalog, { kind: "treeNumber", treeNumber: treeNumber("1") });

    expect(findings.truncated).toBe(true);
    expect(findings.items).toHaveLength(5_000);
  });
});

describe("catalog.lookup failures", () => {
  const search = { kind: "treeNumber", treeNumber: treeNumber("1") } as const;

  it("reports an unreachable server as a network error", async () => {
    const fetch = vi.fn<Fetch>(() => Promise.reject(new TypeError("Failed to fetch")));
    const catalog = createCatalog({ baseUrl: "", fetch });
    await expect(lookup(catalog, search)).rejects.toMatchObject({ kind: "network" });
  });

  it("reports an error status as an http error", async () => {
    const { catalog } = catalogAnswering("Service Unavailable", { status: 503 });
    await expect(lookup(catalog, search)).rejects.toMatchObject({
      name: "CatalogError",
      kind: "http",
    });
  });

  it("reports a WFS exception report (XML) as a format error", async () => {
    const { catalog } = catalogAnswering("<ows:ExceptionReport/>");
    await expect(lookup(catalog, search)).rejects.toMatchObject({ kind: "format" });
  });

  it("reports JSON of the wrong shape as a format error", async () => {
    const { catalog } = catalogAnswering({ type: "FeatureCollection", features: [{}] });
    await expect(lookup(catalog, search)).rejects.toBeInstanceOf(CatalogError);
  });

  it("passes an abort through instead of reporting it as a failure", async () => {
    const controller = new AbortController();
    const fetch = vi.fn<Fetch>(() => {
      controller.abort();
      return Promise.reject(new DOMException("The operation was aborted.", "AbortError"));
    });
    const catalog = createCatalog({ baseUrl: "", fetch });
    await expect(catalog.lookup(search, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
