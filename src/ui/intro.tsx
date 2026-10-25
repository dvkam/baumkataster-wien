import type { Navigate } from "../app";
import { nearby } from "../search";
import { SearchLink } from "./search-link.tsx";

/** What the page says before the person has asked anything. */
export function Intro({ navigate }: { readonly navigate: Navigate }) {
  return (
    <section className="intro" aria-labelledby="intro-title">
      <p className="eyebrow">Wien, Baum für Baum</p>
      <h2 id="intro-title" className="intro-title">
        Welcher Baum ist das?
      </h2>
      <p>
        Gib die Nummer vom Baumschild ein oder suche in deiner Nähe. Du findest die Baumart, das
        Pflanzjahr und die erfassten Maße.
      </p>
      <img
        className="city-garden"
        src={`${import.meta.env.BASE_URL}city-garden.svg`}
        width="720"
        height="260"
        alt=""
      />
      <div className="explore">
        <p>Ohne Standortfreigabe ausprobieren</p>
        <nav className="place-links" aria-label="Orte erkunden">
          <SearchLink to={nearby({ latitude: 48.20717, longitude: 16.39416 })} navigate={navigate}>
            Beim Hundertwasserhaus <span aria-hidden="true">↗</span>
          </SearchLink>
          <SearchLink to={nearby({ latitude: 48.20455, longitude: 16.37956 })} navigate={navigate}>
            Im Stadtpark <span aria-hidden="true">↗</span>
          </SearchLink>
          <SearchLink to={nearby({ latitude: 48.20851, longitude: 16.35846 })} navigate={navigate}>
            Im Volksgarten <span aria-hidden="true">↗</span>
          </SearchLink>
        </nav>
      </div>
      <aside className="data-note">
        <h3>Was du hier findest</h3>
        <p>
          Die offenen Baumdaten der Stadt Wien enthalten Straßenbäume und Bäume in Parks. Sie zeigen
          nicht jeden Baum der Stadt. Ein fehlender Eintrag bedeutet nicht, dass dort kein Baum
          steht.
        </p>
        <a href="https://www.wien.gv.at/umwelt/stadtbaeume">Mehr über den Wiener Baumkataster</a>
      </aside>
    </section>
  );
}
