import { useQuery } from "@tanstack/react-query";

import { CatalogError } from "../catalog";
import type { Catalog, Findings } from "../catalog";
import { searchToParams } from "../search";
import type { Search } from "../search";

export type FindingsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading"; readonly stale: Findings | null }
  | { readonly kind: "ready"; readonly findings: Findings }
  | { readonly kind: "failed"; readonly error: CatalogError };

export type ActiveFindingsState = Exclude<FindingsState, { kind: "idle" }>;

export function useFindings(
  catalog: Catalog,
  search: Search,
): {
  readonly state: FindingsState;
  readonly retry: () => void;
} {
  const query = useQuery({
    queryKey: ["trees", searchToParams(search).toString()],
    enabled: search.kind !== "none",
    queryFn: ({ signal }) => {
      if (search.kind === "none") throw new Error("A search is required");
      return catalog.lookup(search, signal);
    },
    placeholderData: (previous) => (search.kind === "tree" ? undefined : previous),
    throwOnError: (error) => !(error instanceof CatalogError),
  });
  const retry = () => {
    void query.refetch();
  };
  if (search.kind === "none") return { state: { kind: "idle" }, retry };
  if (query.error instanceof CatalogError)
    return { state: { kind: "failed", error: query.error }, retry };
  if (query.isPending || query.isPlaceholderData || query.data === undefined) {
    return { state: { kind: "loading", stale: query.data ?? null }, retry };
  }
  return { state: { kind: "ready", findings: query.data }, retry };
}
