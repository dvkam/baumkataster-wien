import { useCallback, useMemo, useSyncExternalStore } from "react";

import { parseSearch, searchToParams } from "../search";
import type { Search } from "../search";

export type HistoryMode = "push" | "replace";

/** The only way to change the Search. */
export type Navigate = (search: Search, mode?: HistoryMode) => void;

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

const currentQuery = (): string => window.location.search;

/** Marks history entries this app pushed, so "back" knows whether it stays inside the app. */
const PUSHED_BY_APP = "baumkataster";

function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * The Search, owned by the page address (ADR 0002). `navigate` is the only way to change it,
 * so back/forward, reload and shared links all restore exactly what was on screen.
 */
export function useSearch(): {
  readonly search: Search;
  readonly navigate: Navigate;
  /** Goes back if the previous page is this app, otherwise to the start. */
  readonly back: () => void;
} {
  const query = useSyncExternalStore(subscribe, currentQuery);
  const search = useMemo(() => parseSearch(new URLSearchParams(query)), [query]);

  const navigate = useCallback((next: Search, mode: HistoryMode = "push") => {
    const params = searchToParams(next).toString();
    const url = params === "" ? window.location.pathname : `?${params}`;
    if (params === window.location.search.slice(1)) return;
    if (mode === "push") window.history.pushState(PUSHED_BY_APP, "", url);
    else window.history.replaceState(window.history.state, "", url);
    notify();
  }, []);

  const back = useCallback(() => {
    if (window.history.state === PUSHED_BY_APP) window.history.back();
    else navigate({ kind: "none" }, "replace");
  }, [navigate]);

  return { search, navigate, back };
}
