import { useState } from "react";

import type { Navigate } from "../app";
import type { Finding, Findings } from "../catalog";
import type { Tree } from "../trees";
import {
  formatDistance,
  formatDistrict,
  formatSizeClass,
  speciesSubtitle,
  speciesTitle,
} from "./format.ts";
import { SearchLink } from "./search-link.tsx";

/** How many Findings are shown at once; the original app showed 30 too. */
const PAGE_SIZE = 30;

function facts(tree: Tree): readonly string[] {
  return [
    tree.plantedIn === null ? null : `Gepflanzt ${String(tree.plantedIn)}`,
    tree.height === null ? null : `Höhe ${formatSizeClass(tree.height)}`,
    tree.crownDiameter === null ? null : `Krone ${formatSizeClass(tree.crownDiameter)}`,
    tree.trunkCircumferenceCm === null ? null : `Stamm ${String(tree.trunkCircumferenceCm)} cm`,
  ].filter((fact) => fact !== null);
}

function place(tree: Tree): string {
  return [
    tree.number === null ? null : `Nr. ${tree.number}`,
    tree.location.name,
    tree.location.district === null ? null : formatDistrict(tree.location.district),
  ]
    .filter((part) => part !== null)
    .join(" · ");
}

function FindingCard({ finding, navigate }: { finding: Finding; navigate: Navigate }) {
  const { tree, distanceMeters } = finding;
  const subtitle = speciesSubtitle(tree.species);
  return (
    <SearchLink
      to={{ kind: "tree", treeId: tree.id }}
      navigate={navigate}
      className="card pressable"
    >
      <span className="card-head">
        <span className="card-title">{speciesTitle(tree.species)}</span>
        {distanceMeters === null ? null : (
          <span className="card-distance">{formatDistance(distanceMeters)}</span>
        )}
      </span>
      {subtitle === null ? null : <span className="card-subtitle">{subtitle}</span>}
      <span className="card-place">{place(tree)}</span>
      <span className="card-facts">
        {facts(tree).map((fact) => (
          <span key={fact} className="fact">
            {fact}
          </span>
        ))}
      </span>
    </SearchLink>
  );
}

type FindingListProps = {
  readonly findings: Findings;
  /** Changes when the person asks something else; following the device keeps the same key. */
  readonly listKey: string;
  readonly stale: boolean;
  readonly navigate: Navigate;
};

export function FindingList({ findings, listKey, stale, navigate }: FindingListProps) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const [shownFor, setShownFor] = useState(listKey);
  if (shownFor !== listKey) {
    setShownFor(listKey);
    setShown(PAGE_SIZE);
  }
  const visible = findings.items.slice(0, shown);
  const remaining = findings.items.length - visible.length;

  return (
    <div className="findings" data-stale={stale || undefined} aria-busy={stale}>
      <ol className="finding-list" aria-label="Bäume">
        {visible.map((finding) => (
          <li key={finding.tree.id}>
            <FindingCard finding={finding} navigate={navigate} />
          </li>
        ))}
      </ol>
      {remaining > 0 ? (
        <button
          type="button"
          className="button button-quiet pressable more"
          onClick={() => {
            setShown((count) => count + PAGE_SIZE);
          }}
        >
          {`${String(Math.min(remaining, PAGE_SIZE))} weitere anzeigen`}
        </button>
      ) : null}
    </div>
  );
}
