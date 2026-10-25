import { useFindings, useNearby, useSearch } from "./app";
import type { ActiveFindingsState, FindingsState, Navigate } from "./app";
import type { Catalog } from "./catalog";
import { treeNumberOf } from "./search";
import type { ActiveSearch, Search } from "./search";
import { FindingList, Intro, SearchBar, StatusLine, TreeDetail, TreeIcon } from "./ui";

function TreeView(props: {
  state: ActiveFindingsState;
  search: ActiveSearch;
  retry: () => void;
  navigate: Navigate;
  back: () => void;
}) {
  const { state, search, retry, navigate, back } = props;
  const tree = state.kind === "ready" ? state.findings.items[0]?.tree : undefined;
  if (tree === undefined) return <StatusLine search={search} state={state} retry={retry} />;
  return <TreeDetail key={tree.id} tree={tree} navigate={navigate} back={back} />;
}

function ListView(props: {
  state: ActiveFindingsState;
  search: ActiveSearch;
  retry: () => void;
  navigate: Navigate;
}) {
  const { state, search, retry, navigate } = props;
  const stale = state.kind === "loading" ? state.stale : null;
  const shown = state.kind === "ready" ? state.findings : stale;
  return (
    <>
      <StatusLine search={search} state={state} retry={retry} />
      {shown === null ? null : (
        <FindingList
          findings={shown}
          listKey={`${search.kind}:${treeNumberOf(search) ?? ""}`}
          stale={state.kind === "loading"}
          navigate={navigate}
        />
      )}
    </>
  );
}

function Content(props: {
  state: FindingsState;
  search: Search;
  retry: () => void;
  navigate: Navigate;
  back: () => void;
}) {
  const { state, search, ...actions } = props;
  if (state.kind === "idle" || search.kind === "none") return <Intro navigate={actions.navigate} />;
  if (search.kind === "tree") return <TreeView state={state} search={search} {...actions} />;
  return <ListView state={state} search={search} {...actions} />;
}

export function Baumkataster({ catalog }: { readonly catalog: Catalog }) {
  const { search, navigate, back } = useSearch();
  const { state, retry } = useFindings(catalog, search);
  const { device, following, locate, stop } = useNearby(search, navigate);

  return (
    <div className="page">
      <a href="#content" className="skip-link">
        Zum Inhalt
      </a>
      <header className="masthead">
        <div className="masthead-inner">
          <h1 className="brand">
            <a
              href="."
              onClick={(event) => {
                event.preventDefault();
                navigate({ kind: "none" });
              }}
            >
              <TreeIcon className="brand-icon" />
              Baumkataster Wien
            </a>
          </h1>
          <SearchBar
            search={search}
            device={device}
            following={following}
            navigate={navigate}
            locate={locate}
            stop={stop}
          />
        </div>
      </header>
      <main id="content" className="content" tabIndex={-1}>
        <Content state={state} search={search} retry={retry} navigate={navigate} back={back} />
      </main>
      <footer className="footer">
        <p>
          Daten:{" "}
          <a href="https://www.data.gv.at/datasets/c91a4635-8b7d-43fe-9b27-d95dec8392a7?locale=de">
            Baumkataster der Stadt Wien
          </a>{" "}
          (CC BY 4.0). Nach einer Idee von{" "}
          <a href="https://github.com/plepe/baumkataster-wien">plepe/baumkataster-wien</a>.
        </p>
        <p>
          Unabhängige Anwendung. Keine Website der Stadt Wien.{" "}
          <a href="https://github.com/dvkam/baumkataster-wien">Quellcode</a>
        </p>
      </footer>
    </div>
  );
}
