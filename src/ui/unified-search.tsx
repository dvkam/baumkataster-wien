import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import type { SubmitEvent } from "react";

import type { DevicePosition, Navigate } from "../app";
import { findPlaces } from "../places";
import { nearby, parseSpecies, speciesOf, treeNumberOf, withTreeNumber } from "../search";
import type { Search } from "../search";
import { parseTreeNumber } from "../trees";
import { SearchIcon } from "./icons.tsx";

const COMMON_SPECIES = [
  ["Ahorn", "Acer"],
  ["Linde", "Tilia"],
  ["Platane", "Platanus"],
  ["Esche", "Fraxinus"],
  ["Kastanie", "Aesculus"],
  ["Eiche", "Quercus"],
  ["Birke", "Betula"],
  ["Buche", "Fagus"],
  ["Ulme", "Ulmus"],
  ["Pappel", "Populus"],
  ["Weide", "Salix"],
  ["Robinie", "Robinia"],
  ["Kiefer", "Pinus"],
  ["Fichte", "Picea"],
  ["Ginkgo", "Ginkgo"],
] as const;

function automaticNumber(input: string) {
  const value = input.replace(/^nr\.?\s*/iu, "");
  return /^(?=.*\d)[\p{L}\d/.-]+$/u.test(value) ? parseTreeNumber(value) : null;
}

export function UnifiedSearch({
  search,
  device,
  navigate,
  stop,
}: {
  readonly search: Search;
  readonly device: DevicePosition;
  readonly navigate: Navigate;
  readonly stop: () => void;
}) {
  const id = useId();
  const suggestions = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState(speciesOf(search) ?? treeNumberOf(search) ?? "");
  const [settled, setSettled] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const term = input.trim();
  const number = automaticNumber(term);
  const species = parseSpecies(term);
  const matches =
    term.length < 2
      ? []
      : COMMON_SPECIES.filter((names) =>
          names.some((name) => name.toLocaleLowerCase("de").includes(term.toLocaleLowerCase("de"))),
        );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettled(term);
    }, 350);
    return () => {
      window.clearTimeout(timer);
    };
  }, [term]);
  const places = useQuery({
    queryKey: ["places", settled],
    queryFn: ({ signal }) => findPlaces(settled, signal),
    enabled: expanded && settled === term && term.length >= 2 && number === null && !invalid,
    staleTime: 600_000,
  });
  const choose = (next: Search) => {
    setExpanded(false);
    navigate(next);
  };
  const chooseSpecies = (value: string) => {
    setInput(value);
    choose(
      search.kind === "nearby"
        ? nearby(search.near, null, value)
        : { kind: "species", term: value },
    );
  };
  const chooseNumber = () => {
    choose(withTreeNumber(search, number, device.kind === "located" ? device.position : null));
  };
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (number !== null || term === "") {
      chooseNumber();
      return;
    }
    const known = COMMON_SPECIES.some((names) =>
      names.some((name) => name.toLocaleLowerCase("de") === term.toLocaleLowerCase("de")),
    );
    if (known) {
      chooseSpecies(term);
      return;
    }
    const valid = /^[\p{L}\p{N}]/u.test(term) && term.length >= 2;
    setInvalid(!valid);
    setExpanded(valid);
    setSettled(term);
    if (valid && places.isError) void places.refetch();
  };
  return (
    <div>
      <form className="search-form" onSubmit={submit} noValidate>
        <label htmlFor={id} className="visually-hidden">
          Suche
        </label>
        <div className="field" data-invalid={invalid || undefined}>
          <SearchIcon className="field-icon" />
          <input
            id={id}
            value={input}
            placeholder="Adresse, Baumart oder Baumnummer …"
            maxLength={160}
            autoComplete="off"
            enterKeyHint="search"
            spellCheck={false}
            aria-invalid={invalid}
            aria-describedby={`${id}-help`}
            onChange={(event) => {
              setInput(event.target.value);
              setExpanded(true);
              setInvalid(false);
            }}
            onFocus={() => {
              setExpanded(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setExpanded(false);
              if (event.key === "ArrowDown") {
                event.preventDefault();
                suggestions.current?.querySelector("button")?.focus();
              }
            }}
          />
        </div>
        <button type="submit" className="button button-primary">
          Suchen
        </button>
      </form>
      <p id={`${id}-help`} className="hint search-help">
        Zum Beispiel Hundertwasserhaus, Ahorn oder 1026. Wähle einen Vorschlag.
      </p>
      {invalid ? (
        <p role="alert">Bitte gib mindestens zwei Buchstaben oder eine Baumnummer ein.</p>
      ) : null}
      {expanded && term.length > 0 && !invalid ? (
        <div ref={suggestions} className="place-results" aria-label="Suchvorschläge">
          {number === null ? null : (
            <button className="place-result" type="button" onClick={chooseNumber}>
              Baumnummer {number} suchen
            </button>
          )}
          {matches.map(([name, botanical]) => (
            <button
              className="place-result"
              type="button"
              key={name}
              onClick={() => {
                chooseSpecies(name);
              }}
            >
              <strong>{name}</strong>
              <span>Baumart · {botanical}</span>
            </button>
          ))}
          {number === null && term.length >= 2 ? (
            <>
              {settled !== term || places.isFetching ? (
                <output>Orte werden gesucht …</output>
              ) : null}
              {settled === term && places.isError ? (
                <p role="alert">
                  Die Ortssuche ist gerade nicht erreichbar. Mit Suchen erneut versuchen.
                </p>
              ) : null}
              {settled === term
                ? places.data?.map((place) => (
                    <button
                      className="place-result"
                      type="button"
                      key={place.id}
                      onClick={() => {
                        stop();
                        setInput(place.name);
                        choose(nearby(place.position));
                      }}
                    >
                      <strong>{place.name}</strong>
                      <span>{place.address}</span>
                    </button>
                  ))
                : null}
              {settled === term && places.isSuccess && places.data.length === 0 ? (
                <p>Kein Ort gefunden. Versuche eine Straße mit Hausnummer.</p>
              ) : null}
              <small>Ortsvorschläge: Photon · © OpenStreetMap-Mitwirkende</small>
            </>
          ) : null}
          {species !== null && !matches.some((names) => names.some((name) => name === species)) ? (
            <button
              className="place-result"
              type="button"
              onClick={() => {
                chooseSpecies(species);
              }}
            >
              Baumarten mit „{species}“ suchen
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
