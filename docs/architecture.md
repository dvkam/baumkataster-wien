# Architecture

The app uses TanStack Router for search URLs, TanStack Query for network state, Photon for places and Leaflet for the map.

## Usage sketch (written first)

```tsx
// main.tsx: the only place that knows where the WFS lives
const catalog = createCatalog({
  baseUrl:
    import.meta.env.VITE_OGD_BASE_URL ?? (import.meta.env.DEV ? "/ogd" : "https://data.wien.gv.at"),
  fetch,
});
const router = createAppRouter(catalog);
createRoot(root).render(<RouterProvider router={router} />);

// baumkataster.tsx: everything derives from the Search in the address
const { search, navigate, back } = useSearch();
const { state, retry } = useFindings(catalog, search);
const { device, locate, stop } = useNearby(search, navigate);

navigate({ kind: "treeNumber", treeNumber }); // a Tree number search
navigate({ kind: "tree", treeId: finding.tree.id }); // open one Tree
```

## Module map

```
src/
  geo/        Position, distanceMeters, boundingBox                 pure
  trees/      Tree, TreeId, TreeNumber, Species, SizeClass,         pure, owns source column names
              parseTreeCollection
  search/     Search, parseSearch(params), searchToParams(search)   pure
  catalog/    createCatalog({ baseUrl, fetch }) → Catalog           deep module, the only network seam
              Catalog.lookup(search, signal) → Promise<Findings>
              CatalogError
  app/        useSearch, useFindings, useNearby                     React wiring, thin
  ui/         SearchBar, FindingList, TreeDetail, StatusLine, …     presentational
```

Dependencies point one way: `ui → app → catalog → (search, trees, geo)`. Each folder exposes an `index.ts`; nothing imports a sibling folder's internals (enforced by oxlint's `no-restricted-imports`).

## Type sketch

```ts
type Position = { readonly latitude: number; readonly longitude: number };

type TreeId = number & { readonly __brand: "TreeId" };
type TreeNumber = string & { readonly __brand: "TreeNumber" };

type SizeClass =
  | { readonly kind: "range"; readonly minMeters: number; readonly maxMeters: number }
  | { readonly kind: "over"; readonly meters: number };

type Tree = {
  readonly id: TreeId;
  readonly number: TreeNumber | null;
  readonly species: { readonly scientificName: string; readonly commonName: string | null } | null;
  readonly location: {
    readonly name: string | null;
    readonly district: number | null;
    readonly area: string | null;
  };
  readonly plantedIn: number | null;
  readonly trunkCircumferenceCm: number | null;
  readonly height: SizeClass | null;
  readonly crownDiameter: SizeClass | null;
  readonly position: Position;
};

type Search =
  | { readonly kind: "none" }
  | { readonly kind: "tree"; readonly treeId: TreeId }
  | { readonly kind: "treeNumber"; readonly treeNumber: TreeNumber }
  | { readonly kind: "nearby"; readonly near: Position; readonly treeNumber: TreeNumber | null };

type Finding = { readonly tree: Tree; readonly distanceMeters: number | null };
type Findings = { readonly items: readonly Finding[]; readonly truncated: boolean };

type Catalog = { lookup(search: ActiveSearch, signal: AbortSignal): Promise<Findings> };
type ActiveSearch = Exclude<Search, { kind: "none" }>;
```

## Design it twice

**Candidate A, "mirror the original".** A `TreeRepository` with `byNumber`, `byId`, `inBox`, plus a client `filters` registry like the original's `filter_function`s, and the UI combining them. Rejected: shallow (callers coordinate three methods and a filter pass for one Search), two ways to filter (server and client, which is exactly how the original's two distance formulas drifted), and the radius cut leaks into the UI.

**Candidate B, "one question, one answer".** A single `lookup(search)` that takes the whole Search union and returns ranked Findings. Chosen: small interface, everything the WFS needs (CQL, axis order, limits, parsing, radius cut, ordering) is hidden behind it, and the Search union is already the domain's own description of "what the person asked".

Synthesis: B, with the request lifecycle (loading / done / failed, cancellation) kept out of the catalog and modelled once in `useFindings`, so the catalog stays a plain async function that is trivial to test with a fake `fetch`.

## Red-flag screen (pstack `design-red-flags.md`)

| Flag                    | Status                                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shallow module          | `Catalog` has one method; `trees` exposes a parse function and types only.                                                                                              |
| Information leakage     | Source column names (`OBJECTID`, `BAUMNUMMER`, `SHAPE`…) appear only in `trees/`, which exports them as `TREE_SOURCE` for the CQL builder. Wire types are not exported. |
| Temporal decomposition  | No load/validate/transform/save modules; folders follow domain concepts.                                                                                                |
| Pass-through            | Hooks add lifecycle policy; none forward unchanged.                                                                                                                     |
| Split ownership         | The address is the only owner of the Search (ADR 0002).                                                                                                                 |
| Two ways to do one task | One Distance function, one place that filters by radius.                                                                                                                |
| Importable internals    | Folder `index.ts` barrels; deep imports are a lint error.                                                                                                               |
| Hand-synced list        | Size class tables are derived from one formula per measurement.                                                                                                         |
