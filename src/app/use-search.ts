import { useRouter, useRouterState } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import type { AppRouter } from "../app-router.tsx";
import { parseSearch, searchToParams } from "../search";
import type { Search } from "../search";

export type HistoryMode = "push" | "replace";
export type Navigate = (search: Search, mode?: HistoryMode) => void;

export function useSearch(): {
  readonly search: Search;
  readonly navigate: Navigate;
  readonly back: () => void;
} {
  const router = useRouter<AppRouter>();
  const query = useRouterState({ router, select: (state) => state.location.searchStr });
  const search = useMemo(() => parseSearch(new URLSearchParams(query)), [query]);
  const navigate = useCallback(
    (next: Search, mode: HistoryMode = "push") => {
      void router.navigate({
        to: "/",
        search: Object.fromEntries(searchToParams(next)),
        replace: mode === "replace",
      });
    },
    [router],
  );
  const back = useCallback(() => {
    if (router.history.canGoBack()) router.history.back();
    else navigate({ kind: "none" }, "replace");
  }, [router, navigate]);
  return { search, navigate, back };
}
