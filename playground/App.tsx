import { useState } from "react";
import { Reader, type ReaderContent, type ReaderMode } from "../src";

const SAMPLE: ReaderContent = {
  title: "Cuaderno del pasillo interior",
  subtitle: "apunte-07.txt",
  body: [
    "En la casa nueva hay un pasillo que no conduce a ninguna puerta. Por la tarde parece normal; por la noche respira como una garganta larga.",
    "Ayer dejé una taza sobre el mueble del fondo y esta mañana amaneció tibia. No había sol en esa parte de la casa y, sin embargo, el borde conservaba un calor humilde.",
    "Desde entonces camino más despacio. Escucho la madera, cuento los pasos y espero ese instante breve en que el silencio decide de qué lado quedarse.",
    "No estoy buscando explicaciones, solo una forma de atender. Hay lugares que no quieren ser entendidos: quieren ser leídos, como si cada sombra fuera una frase todavía sin corregir."
  ]
};

const MODES: ReaderMode[] = ["scroll", "book", "terminal"];

const labels: Record<ReaderMode, string> = {
  scroll: "Scroll",
  book: "Book",
  terminal: "Terminal"
};

export function App() {
  const [mode, setMode] = useState<ReaderMode>("scroll");

  return (
    <main className="playground">
      <header className="playground__header">
        <h1>calamus playground</h1>
        <p>Mismo contenido, tres modos de lectura.</p>
      </header>

      <nav className="playground__modes" aria-label="Reader mode">
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            aria-pressed={mode === item}
            className={mode === item ? "is-active" : undefined}
          >
            {labels[item]}
          </button>
        ))}
      </nav>

      <Reader mode={mode} content={SAMPLE} />
    </main>
  );
}
