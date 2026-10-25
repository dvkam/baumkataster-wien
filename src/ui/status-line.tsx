import type { ActiveFindingsState } from "../app";
import type { CatalogErrorKind } from "../catalog";
import { SEARCH_RADIUS_METERS } from "../catalog";
import type { ActiveSearch } from "../search";
import { formatCount, formatDistance } from "./format.ts";

const failureText: Record<CatalogErrorKind, string> = {
  network: "Der Baumkataster ist gerade nicht erreichbar.",
  http: "Der Baumkataster hat mit einem Fehler geantwortet.",
  format: "Der Baumkataster hat unerwartete Daten geliefert.",
};

function summary(search: ActiveSearch, count: number): string {
  const trees = formatCount(count, "Baum", "Bäume");
  switch (search.kind) {
    case "nearby": {
      const radius = `im Umkreis von ${formatDistance(SEARCH_RADIUS_METERS)}`;
      return search.treeNumber === null
        ? `${trees} ${radius}`
        : `${trees} mit Nr. ${search.treeNumber} ${radius}`;
    }
    case "treeNumber": {
      return `${trees} mit Nr. ${search.treeNumber}`;
    }
    case "tree": {
      return count === 0 ? "Für diesen Baum liefert der Baumkataster gerade keinen Eintrag." : "";
    }
    default: {
      const exhaustive: never = search;
      return exhaustive;
    }
  }
}

function note(search: ActiveSearch, count: number, truncated: boolean): string | null {
  if (count === 0)
    return "Prüfe die Suche oder versuche es später erneut. Auch der Datendienst kann vorübergehend leere Ergebnisse liefern.";
  if (truncated) return "Sehr viele Treffer: die Liste ist unvollständig.";
  if (search.kind === "treeNumber" && count > 1) {
    return "Baumnummern wiederholen sich in Wien. Mit „In meiner Nähe“ siehst du nur die Bäume um dich.";
  }
  if (search.kind === "nearby" && search.treeNumber !== null && count > 1) {
    return "Mehrere Bäume in deiner Nähe tragen diese Nummer. Die Entfernung hilft beim Zuordnen.";
  }
  return null;
}

type StatusLineProps = {
  readonly search: ActiveSearch;
  readonly state: ActiveFindingsState;
  readonly retry: () => void;
};

/** One line that says what is on screen; announced to screen readers. */
export function StatusLine({ search, state, retry }: StatusLineProps) {
  if (state.kind === "failed") {
    return (
      <div className="status status-failed" role="alert">
        <p>{failureText[state.error.kind]}</p>
        <button type="button" className="button button-quiet pressable" onClick={retry}>
          Erneut versuchen
        </button>
      </div>
    );
  }
  const text =
    state.kind === "loading"
      ? "Suche im Baumkataster …"
      : summary(search, state.findings.items.length);
  const detail =
    state.kind === "ready"
      ? note(search, state.findings.items.length, state.findings.truncated)
      : null;
  return (
    <output className="status">
      <span className="status-text">
        {state.kind === "loading" ? <span className="spinner" aria-hidden="true" /> : null}
        {text}
      </span>
      {detail === null ? null : <span className="status-note">{detail}</span>}
      {state.kind === "ready" && state.findings.items.length === 0 ? (
        <button type="button" className="button button-quiet pressable" onClick={retry}>
          Erneut versuchen
        </button>
      ) : null}
    </output>
  );
}
