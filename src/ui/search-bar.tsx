import { useId, useState } from "react";
import type { SubmitEvent } from "react";

import type { DevicePosition, Navigate } from "../app";
import { nearby, parseSpecies, speciesOf, withTreeNumber } from "../search";
import type { Search } from "../search";
import { parseTreeNumber } from "../trees";
import { LocateIcon, SearchIcon } from "./icons.tsx";
import { PlaceSearch } from "./place-search.tsx";
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
type SearchMode = "place" | "species" | "number";
function initialMode(search: Search): SearchMode {
  if (speciesOf(search) !== null) return "species";
  if (search.kind === "treeNumber" || (search.kind === "nearby" && search.treeNumber !== null))
    return "number";
  return "place";
}
function initialInput(search: Search): string {
  const species = speciesOf(search);
  if (species !== null) return species;
  return search.kind === "treeNumber" || search.kind === "nearby" ? (search.treeNumber ?? "") : "";
}
export function SearchBar({ search, device, following, navigate, locate, stop }: SearchBarProps) {
  const inputId = useId();
  const hintId = useId();
  const modeId = useId();
  const [mode, setMode] = useState<SearchMode>(() => initialMode(search));
  const [invalid, setInvalid] = useState(false);
  const hint = deviceHint(device, following);
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = new FormData(event.currentTarget).get("term");
    const input = typeof raw === "string" ? raw.trim() : "";
    if (mode === "species") {
      const term = parseSpecies(input);
      setInvalid(term === null);
      if (term === null) return;
      if (search.kind === "nearby") navigate(nearby(search.near, null, term));
      else navigate({ kind: "species", term });
      return;
    }
    const number = input === "" ? null : parseTreeNumber(input);
    setInvalid(input !== "" && number === null);
    if (input === "" || number !== null)
      navigate(withTreeNumber(search, number, device.kind === "located" ? device.position : null));
  };
  return (
    <search className="search-bar">
      <div className="search-mode">
        <label htmlFor={modeId}>Suchen nach</label>
        <select
          id={modeId}
          aria-label="Suchart"
          value={mode}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "place" || value === "species" || value === "number") {
              setMode(value);
              setInvalid(false);
            }
          }}
        >
          <option value="place">Ort oder Adresse</option>
          <option value="species">Baumart</option>
          <option value="number">Baumnummer</option>
        </select>
      </div>
      {mode === "place" ? (
        <PlaceSearch navigate={navigate} stop={stop} />
      ) : (
        <>
          <form className="search-form" onSubmit={submit} noValidate>
            <label htmlFor={inputId} className="visually-hidden">
              {mode === "number" ? "Baumnummer" : "Baumart"}
            </label>
            <div className="field" data-invalid={invalid || undefined}>
              <SearchIcon className="field-icon" />
              <input
                id={inputId}
                key={`${mode}:${initialInput(search)}`}
                name="term"
                defaultValue={initialInput(search)}
                placeholder={
                  mode === "number" ? "Nummer am Baumschild, z. B. 1026" : "Ahorn, Linde, Acer …"
                }
                autoComplete="off"
                enterKeyHint="search"
                spellCheck={false}
                aria-invalid={invalid}
                aria-describedby={hintId}
                onInput={() => {
                  setInvalid(false);
                }}
              />
            </div>
            <button type="submit" className="button button-primary pressable">
              Suchen
            </button>
          </form>
          <p className="hint search-help">
            {mode === "number"
              ? "Die Nummer steht am Baumschild und kann sich in Wien wiederholen."
              : "Deutscher oder botanischer Name, auch ein Teil davon."}{" "}
            {search.kind === "nearby"
              ? "Suche im angezeigten Umkreis von 1 km."
              : "Suche in ganz Wien."}
          </p>
        </>
      )}
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
        {search.kind === "nearby" && mode !== "place" ? (
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
          {invalid
            ? "Bitte prüfe die Eingabe. Baumarten brauchen mindestens zwei Buchstaben."
            : hint}
        </p>
      </div>
    </search>
  );
}
