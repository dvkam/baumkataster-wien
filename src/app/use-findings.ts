import { useCallback, useEffect, useState } from "react";

import { CatalogError } from "../catalog";
import type { Catalog, Findings } from "../catalog";
import { searchToParams } from "../search";
import type { Search } from "../search";

export type FindingsState =
  | { readonly kind: "idle" }
  /** `stale` keeps the previous list on screen while the next one loads. */
  | { readonly kind: "loading"; readonly stale: Findings | null }
  | { readonly kind: "ready"; readonly findings: Findings }
  | { readonly kind: "failed"; readonly error: CatalogError };

/** Any state in which a Search is on screen. */
export type ActiveFindingsState = Exclude<FindingsState, { kind: "idle" }>;

type Outcome = Extract<FindingsState, { kind: "ready" | "failed" }>;

type Answers = {
  /** Recent successful answers by Search, oldest first, so back/forward is instant. */
  readonly ready: ReadonlyMap<string, Findings>;
  /** The latest failure. Not remembered beyond the Search and attempt it belongs to. */
  readonly failure: {
    readonly key: string;
    readonly attempt: number;
    readonly error: CatalogError;
  } | null;
  /** The most recent list of Trees, shown while the next list loads. */
  readonly lastList: Findings | null;
};

const NO_ANSWERS: Answers = { ready: new Map(), failure: null, lastList: null };

const REMEMBERED_ANSWERS = 8;

const keyOf = (search: Search): string => searchToParams(search).toString();

function remember(answers: Answers, search: Search, attempt: number, outcome: Outcome): Answers {
  const key = keyOf(search);
  if (outcome.kind === "failed") {
    return { ...answers, failure: { key, attempt, error: outcome.error } };
  }
  const ready = new Map(answers.ready);
  ready.delete(key);
  ready.set(key, outcome.findings);
  for (const oldest of ready.keys()) {
    if (ready.size <= REMEMBERED_ANSWERS) break;
    ready.delete(oldest);
  }
  const lastList = search.kind === "tree" ? answers.lastList : outcome.findings;
  return { ready, failure: null, lastList };
}

function derive(search: Search, attempt: number, answers: Answers): FindingsState {
  if (search.kind === "none") return { kind: "idle" };
  const key = keyOf(search);
  const findings = answers.ready.get(key);
  if (findings !== undefined) return { kind: "ready", findings };
  const { failure } = answers;
  if (failure?.key === key && failure.attempt === attempt) {
    return { kind: "failed", error: failure.error };
  }
  return { kind: "loading", stale: search.kind === "tree" ? null : answers.lastList };
}

/**
 * Looks up the Findings for the current Search. Loading is derived (there is no answer for this
 * Search yet), so no flag can drift. A newer Search aborts the older request; recent answers
 * are remembered so going back is instant.
 */
export function useFindings(
  catalog: Catalog,
  search: Search,
): { readonly state: FindingsState; readonly retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Answers>(NO_ANSWERS);
  const state = derive(search, attempt, answers);
  const needsLookup = state.kind === "loading";

  useEffect(() => {
    if (!needsLookup || search.kind === "none") return undefined;
    const controller = new AbortController();
    const settle = (outcome: Outcome) => {
      setAnswers((previous) => remember(previous, search, attempt, outcome));
    };
    void (async () => {
      try {
        settle({ kind: "ready", findings: await catalog.lookup(search, controller.signal) });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof CatalogError) {
          settle({ kind: "failed", error });
          return;
        }
        // Anything else is a bug: rethrow during render so the error boundary shows it.
        setAnswers(() => {
          throw error;
        });
      }
    })();
    return () => {
      controller.abort();
    };
  }, [catalog, search, attempt, needsLookup]);

  const retry = useCallback(() => {
    setAnswers((previous) => {
      const ready = new Map(previous.ready);
      ready.delete(keyOf(search));
      return { ...previous, ready };
    });
    setAttempt((previous) => previous + 1);
  }, [search]);

  return { state, retry };
}
