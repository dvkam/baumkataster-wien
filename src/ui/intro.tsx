import { TreeIcon } from "./icons.tsx";

/** What the page says before the person has asked anything. */
export function Intro() {
  return (
    <section className="intro" aria-labelledby="intro-title">
      <TreeIcon className="intro-icon" />
      <h2 id="intro-title" className="intro-title">
        Welcher Baum ist das?
      </h2>
      <p>
        Fast jeder Stadtbaum in Wien trägt ein kleines Schild mit einer Nummer. Tippe die Nummer ein
        oder zeig dir alle Bäume in deiner Nähe: mit Art, Pflanzjahr und Größe.
      </p>
    </section>
  );
}
