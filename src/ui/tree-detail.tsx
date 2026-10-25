import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import type { Navigate } from "../app";
import type { Tree } from "../trees";
import {
  formatAge,
  formatDistrict,
  formatSizeClass,
  speciesSubtitle,
  speciesTitle,
} from "./format.ts";
import { BackIcon, ExternalIcon } from "./icons.tsx";
import { SearchLink } from "./search-link.tsx";

/** Ages are relative to when the page was opened; a session doesn't span a new year often. */
const OPENED_AT = new Date();

const coordinates = new Intl.NumberFormat("de-AT", {
  minimumFractionDigits: 5,
  maximumFractionDigits: 5,
});

function openStreetMapUrl(tree: Tree): string {
  const { latitude, longitude } = tree.position;
  const params = new URLSearchParams({ mlat: String(latitude), mlon: String(longitude) });
  return `https://www.openstreetmap.org/?${params.toString()}#map=19/${String(latitude)}/${String(longitude)}`;
}

type Row = readonly [label: string, value: ReactNode];

function rows(tree: Tree, now: Date): readonly Row[] {
  const all: readonly (Row | null)[] = [
    tree.number === null ? null : ["Baumnummer", tree.number],
    tree.plantedIn === null
      ? null
      : ["Gepflanzt", `${String(tree.plantedIn)} · ${formatAge(tree.plantedIn, now)}`],
    tree.height === null ? null : ["Höhe", formatSizeClass(tree.height)],
    tree.crownDiameter === null ? null : ["Kronendurchmesser", formatSizeClass(tree.crownDiameter)],
    tree.trunkCircumferenceCm === null
      ? null
      : ["Stammumfang", `${String(tree.trunkCircumferenceCm)} cm`],
    tree.location.name === null ? null : ["Standort", tree.location.name],
    tree.location.district === null ? null : ["Bezirk", formatDistrict(tree.location.district)],
    tree.location.area === null ? null : ["Gebiet", tree.location.area],
    [
      "Koordinaten",
      <span key="coordinates" className="numeric">
        {coordinates.format(tree.position.latitude)}, {coordinates.format(tree.position.longitude)}
      </span>,
    ],
  ];
  return all.filter((row) => row !== null);
}

type TreeDetailProps = {
  readonly tree: Tree;
  readonly navigate: Navigate;
  readonly back: () => void;
};

export function TreeDetail({ tree, navigate, back }: TreeDetailProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const subtitle = speciesSubtitle(tree.species);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <article className="detail" aria-labelledby={`tree-${String(tree.id)}`}>
      <button type="button" className="button button-quiet pressable back" onClick={back}>
        <BackIcon />
        Zurück
      </button>
      <header className="detail-head">
        <h2 id={`tree-${String(tree.id)}`} ref={heading} tabIndex={-1} className="detail-title">
          {speciesTitle(tree.species)}
        </h2>
        {subtitle === null ? null : <p className="detail-subtitle">{subtitle}</p>}
      </header>
      <dl className="facts-table">
        {rows(tree, OPENED_AT).map(([label, value]) => (
          <div key={label} className="facts-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="detail-actions">
        <a
          className="button button-primary pressable"
          href={openStreetMapUrl(tree)}
          target="_blank"
          rel="noreferrer"
        >
          Auf der Karte
          <ExternalIcon />
        </a>
        {tree.number === null ? null : (
          <SearchLink
            to={{ kind: "treeNumber", treeNumber: tree.number }}
            navigate={navigate}
            className="button button-quiet pressable"
          >
            Alle mit Nr. {tree.number}
          </SearchLink>
        )}
      </div>
    </article>
  );
}
