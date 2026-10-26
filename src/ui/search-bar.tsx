import { useId } from "react";

import type { DevicePosition, Navigate } from "../app";
import { speciesOf, treeNumberOf } from "../search";
import type { Search } from "../search";
import { LocateIcon } from "./icons.tsx";
import { UnifiedSearch } from "./unified-search.tsx";
type SearchBarProps = {
  readonly search: Search;
  readonly device: DevicePosition;
  readonly following: boolean;
  readonly navigate: Navigate;
  readonly locate: () => void;
  readonly stop: () => void;
};
function deviceHint(device: DevicePosition, following: boolean): string | null {
  switch (device.kind) {
    case "off": {
      return null;
    }
    case "locating": {
      return "Standort wird bestimmt …";
    }
    case "located": {
      return following ? "Folgt deinem Standort" : null;
    }
    case "denied": {
      return "Kein Zugriff auf den Standort. Erlaube ihn in den Browser-Einstellungen.";
    }
    case "unsupported": {
      return "Dieses Gerät liefert keinen Standort.";
    }
    case "unavailable": {
      return "Standort gerade nicht verfügbar, es wird weiter versucht.";
    }
    default: {
      const exhaustive: never = device;
      return exhaustive;
    }
  }
}
export function SearchBar({ search, device, following, navigate, locate, stop }: SearchBarProps) {
  const hintId = useId();
  const hint = deviceHint(device, following);
  return (
    <search className="search-bar">
      <UnifiedSearch
        key={speciesOf(search) ?? treeNumberOf(search) ?? ""}
        search={search}
        device={device}
        navigate={navigate}
        stop={stop}
      />
      <div className="locate-row">
        <button
          type="button"
          className="button button-chip pressable"
          aria-pressed={following}
          disabled={device.kind === "unsupported"}
          onClick={following ? stop : locate}
        >
          <LocateIcon
            className="chip-icon"
            data-pulsing={device.kind === "locating" || undefined}
          />
          In meiner Nähe
        </button>
        {search.kind === "nearby" &&
        (search.treeNumber !== null || search.species !== undefined) ? (
          <button
            type="button"
            className="button button-quiet"
            onClick={() => {
              stop();
              const species = speciesOf(search);
              if (species !== null) {
                navigate({ kind: "species", term: species });
                return;
              }
              if (search.treeNumber !== null) {
                navigate({ kind: "treeNumber", treeNumber: search.treeNumber });
                return;
              }
              navigate({ kind: "none" });
            }}
          >
            In ganz Wien suchen
          </button>
        ) : null}
        <p className="hint" id={hintId} aria-live="polite">
          {hint}
        </p>
      </div>
    </search>
  );
}
