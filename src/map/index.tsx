import { circle, circleMarker, layerGroup, map as createMap, tileLayer } from "leaflet";
import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";

import type { Navigate } from "../app";
import type { Findings } from "../catalog";
import { nearby, speciesOf, treeNumberOf } from "../search";
import type { ActiveSearch } from "../search";

import "leaflet/dist/leaflet.css";

type TreeMapProps = {
  readonly findings: Findings;
  readonly search: ActiveSearch;
  readonly navigate: Navigate;
  readonly stop: () => void;
};

export function TreeMap({ findings, search, navigate, stop }: TreeMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const lastSearch = useRef<ActiveSearch | null>(null);

  useEffect(() => {
    if (container.current === null) return undefined;
    const instance = createMap(container.current, {
      preferCanvas: true,
      scrollWheelZoom: true,
    }).setView([48.20849, 16.37308], 13);
    map.current = instance;
    tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
    }).addTo(instance);
    const resize = new ResizeObserver(() => {
      instance.invalidateSize();
    });
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (instance === null) return undefined;
    const layers = layerGroup().addTo(instance);
    for (const { tree } of findings.items) {
      const label = document.createElement("span");
      label.textContent = `${tree.species?.commonName ?? tree.species?.scientificName ?? "Baum"} · Nr. ${tree.number ?? "unbekannt"}`;
      circleMarker([tree.position.latitude, tree.position.longitude], {
        radius: 5,
        color: "#204b3b",
        weight: 1,
        fillColor: "#78ac61",
        fillOpacity: 0.9,
      })
        .bindTooltip(label)
        .on("click", () => {
          navigate({ kind: "tree", treeId: tree.id });
        })
        .addTo(layers);
    }
    if (search.kind === "nearby") {
      const center: [number, number] = [search.near.latitude, search.near.longitude];
      circle(center, {
        radius: 1_000,
        color: "#477b85",
        weight: 1,
        dashArray: "5 5",
        fill: false,
        interactive: false,
      }).addTo(layers);
      circleMarker(center, {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: "#286cc0",
        fillOpacity: 1,
        interactive: false,
      }).addTo(layers);
      if (lastSearch.current !== search) instance.setView(center, 16);
    } else if (lastSearch.current !== search && findings.items.length > 0) {
      instance.fitBounds(
        findings.items.map(({ tree }) => [tree.position.latitude, tree.position.longitude]),
        { padding: [24, 24], maxZoom: 17 },
      );
    }
    lastSearch.current = search;
    return () => {
      layers.remove();
    };
  }, [findings, search, navigate]);

  return (
    <section className="map-section" aria-label="Karte der Suchergebnisse">
      <div className="map-toolbar">
        <p>Klicke einen Baum für seine Details.</p>
        <button
          type="button"
          className="button button-quiet"
          onClick={() => {
            const center = map.current?.getCenter();
            if (center === undefined) return;
            stop();
            navigate(
              nearby(
                { latitude: center.lat, longitude: center.lng },
                treeNumberOf(search),
                speciesOf(search),
              ),
            );
          }}
        >
          Hier suchen
        </button>
      </div>
      <div ref={container} className="tree-map" aria-label="Interaktive Baumkarte" />
      <p className="hint">
        Grün: erfasste Bäume. Blau: Mittelpunkt der Suche. Verschiebe die Karte und wähle „Hier
        suchen“. Die Bäume stehen auch in der Liste darunter.
      </p>
    </section>
  );
}
