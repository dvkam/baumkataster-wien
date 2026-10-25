import { useId, useState } from "react";
import type { SubmitEvent } from "react";

import type { DevicePosition, Navigate } from "../app";
import { withTreeNumber } from "../search";
import type { Search } from "../search";
import { parseTreeNumber } from "../trees";
import { LocateIcon, SearchIcon } from "./icons.tsx";

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

function initialNumber(search: Search): string {
  return search.kind === "treeNumber" || search.kind === "nearby" ? (search.treeNumber ?? "") : "";
}

/** A typed Tree number becomes a Search, or "invalid" if it can't be on a tag. */
function searchFor(input: string, search: Search, device: DevicePosition): Search | "invalid" {
  const blank = input.trim() === "";
  const treeNumber = blank ? null : parseTreeNumber(input);
  if (!blank && treeNumber === null) return "invalid";
  return withTreeNumber(search, treeNumber, device.kind === "located" ? device.position : null);
}

export function SearchBar({ search, device, following, navigate, locate, stop }: SearchBarProps) {
  const inputId = useId();
  const hintId = useId();
  const [invalid, setInvalid] = useState(false);
  const hint = deviceHint(device, following);

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = new FormData(event.currentTarget).get("treeNumber");
    const next = searchFor(typeof input === "string" ? input : "", search, device);
    setInvalid(next === "invalid");
    if (next !== "invalid") navigate(next);
  };

  return (
    <search className="search-bar">
      <form className="search-form" onSubmit={submit} noValidate>
        <label htmlFor={inputId} className="visually-hidden">
          Baumnummer
        </label>
        <div className="field" data-invalid={invalid || undefined}>
          <SearchIcon className="field-icon" />
          <input
            id={inputId}
            key={initialNumber(search)}
            name="treeNumber"
            defaultValue={initialNumber(search)}
            placeholder="Nummer am Baumschild"
            autoComplete="off"
            enterKeyHint="search"
            spellCheck={false}
            aria-invalid={invalid}
            aria-describedby={invalid ? hintId : undefined}
            onInput={() => {
              setInvalid(false);
            }}
          />
        </div>
        <button type="submit" className="button button-primary pressable">
          Suchen
        </button>
      </form>
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
        <p className="hint" id={hintId} aria-live="polite">
          {invalid ? "Diese Nummer kann auf keinem Baumschild stehen." : hint}
          {!invalid && following && device.kind === "located" ? (
            <span aria-hidden="true">{` (± ${String(Math.round(device.accuracyMeters))} m)`}</span>
          ) : null}
        </p>
      </div>
    </search>
  );
}
