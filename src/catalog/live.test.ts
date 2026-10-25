import { describe, expect, it } from "vitest";

import { nearby } from "../search";
import type { Tree } from "../trees";
import type { Finding } from "./catalog.ts";
import { createCatalog } from "./catalog.ts";

function numberedTree(items: readonly Finding[]): Tree & { number: NonNullable<Tree["number"]> } {
  const tree = items.find((item) => item.tree.number !== null)?.tree;
  if (tree === undefined || tree.number === null)
    throw new Error("Expected a numbered tree in the live response");
  return { ...tree, number: tree.number };
}

describe.skipIf(import.meta.env["VITE_LIVE_WFS"] !== "1")("Vienna WFS live contract", () => {
  it("supports nearby, number, and object ID searches with the production parser", async () => {
    const catalog = createCatalog({ baseUrl: "https://data.wien.gv.at", fetch: globalThis.fetch });
    const signal = AbortSignal.timeout(30_000);
    const results = await catalog.lookup(
      nearby({ latitude: 48.20717, longitude: 16.39416 }),
      signal,
    );
    expect(results.items.length).toBeGreaterThan(0);
    for (const item of results.items) {
      expect(item.distanceMeters).not.toBeNull();
      expect(item.distanceMeters).toBeLessThanOrEqual(1_000);
    }
    const tree = numberedTree(results.items);
    const detail = await catalog.lookup({ kind: "tree", treeId: tree.id }, signal);
    expect(detail.items.map((item) => item.tree.id)).toEqual([tree.id]);
    const numbered = await catalog.lookup({ kind: "treeNumber", treeNumber: tree.number }, signal);
    expect(numbered.items.some((item) => item.tree.id === tree.id)).toBe(true);
    expect(numbered.items.every((item) => item.tree.number === tree.number)).toBe(true);
  }, 35_000);
});
