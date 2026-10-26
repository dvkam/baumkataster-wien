import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import type { SubmitEvent } from "react";

import type { Navigate } from "../app";
import { findPlaces } from "../places";
import { nearby } from "../search";

export function PlaceSearch({
  navigate,
  stop,
}: {
  readonly navigate: Navigate;
  readonly stop: () => void;
}) {
  const id = useId();
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const results = useQuery({
    queryKey: ["places", submitted],
    queryFn: ({ signal }) => findPlaces(submitted, signal),
    enabled: submitted.length >= 2,
    staleTime: 600_000,
  });
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = input.trim();
    if (term.length < 2) return;
    if (term === submitted) {
      void results.refetch();
    } else setSubmitted(term);
  };
  const show = submitted.length >= 2 && submitted === input.trim();
  return (
    <div>
      <form className="search-form" onSubmit={submit}>
        <label htmlFor={id} className="visually-hidden">
          Ort oder Adresse
        </label>
        <div className="field">
          <input
            id={id}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
            placeholder="Hundertwasserhaus, Kegelgasse 36 …"
            minLength={2}
            maxLength={160}
            required
            autoComplete="street-address"
          />
        </div>
        <button className="button button-primary" type="submit" disabled={results.isFetching}>
          Suchen
        </button>
      </form>
      <p className="hint search-help">
        Straße, Hausnummer oder Sehenswürdigkeit in Wien. Wähle dann einen Ort aus.
      </p>
      {show ? (
        <div className="place-results" aria-live="polite">
          {results.isFetching ? <p>Orte werden gesucht …</p> : null}
          {results.isError ? (
            <p role="alert">Die Ortssuche ist gerade nicht erreichbar. Versuche es erneut.</p>
          ) : null}
          {results.isSuccess && results.data.length === 0 ? (
            <p>Kein Ort gefunden. Versuche eine Straße mit Hausnummer.</p>
          ) : null}
          {results.data?.map((place) => (
            <button
              type="button"
              className="place-result"
              key={place.id}
              onClick={() => {
                stop();
                navigate(nearby(place.position));
                setSubmitted("");
              }}
            >
              <strong>{place.name}</strong>
              <span>{place.address}</span>
            </button>
          ))}
          <small>Ortssuche: Photon · © OpenStreetMap-Mitwirkende</small>
        </div>
      ) : null}
    </div>
  );
}
