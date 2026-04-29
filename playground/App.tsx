import { useState } from "react";
import { Reader, type ReaderContent, type ReaderMode } from "../src";

const SAMPLE: ReaderContent = {
  title: "Cuaderno del pasillo interior",
  subtitle: "apunte-07.txt",
  body: [
    "En la casa nueva hay un pasillo que no conduce a ninguna puerta. Por la tarde parece normal; por la noche respira como una garganta larga.",
    "Ayer dejé una taza sobre el mueble del fondo y esta mañana amaneció tibia. No había sol en esa parte de la casa y, sin embargo, el borde conservaba un calor humilde.",
    "Desde entonces camino más despacio. Escucho la madera, cuento los pasos y espero ese instante breve en que el silencio decide de qué lado quedarse.",
    "No estoy buscando explicaciones, solo una forma de atender. Hay lugares que no quieren ser entendidos: quieren ser leídos, como si cada sombra fuera una frase todavía sin corregir.",
    "El pasillo tiene su propia gramática: el crujido es una coma, la bombilla parpadeante una aclaración. Yo intento seguirla sin acelerar, como quien aprende una lengua a través de gestos.",
    "Al apoyar la mano en la pared noto un frío que no es del material sino del recuerdo. A veces imagino que detrás de la pintura hay otra habitación, más antigua, esperando su turno.",
    "Entre tanto, la tarde se llena de sonidos pequeños: el roce de una cortina, el zumbido del refrigerador, la respiración de la casa cuando por fin deja de fingir.",
    "Escribo para no perder el hilo. Pero también escribo para que el hilo se vuelva cuerda, y la cuerda, un lazo: algo que me devuelva hacia lo que todavía no sé decir."
  ]
};

const MODES: ReaderMode[] = ["scroll", "book", "terminal", "editorial", "hypertext"];

const labels: Record<ReaderMode, string> = {
  scroll: "Scroll",
  book: "Book",
  terminal: "Terminal",
  editorial: "Editorial",
  hypertext: "Hypertext"
};

function RotatedQuote({ children }: { children: string }) {
  return (
    <blockquote className="playground__rotated-quote">
      <p>{children}</p>
    </blockquote>
  );
}

function BlinkingNote({ children }: { children: string }) {
  return <div className="playground__blinking-note">{children}</div>;
}

export function App() {
  const [mode, setMode] = useState<ReaderMode>("scroll");

  return (
    <main className="playground">
      <header className="playground__header">
        <h1>calamus playground</h1>
        <p>Mismo contenido, cinco modos de lectura.</p>
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

      <Reader mode={mode} content={SAMPLE}>
        {mode === "hypertext" ? (
          <div className="playground__hypertext-demo">
            <p>
              El pasillo también puede ser un tablero. En vez de avanzar por una sola línea, cada
              bloque abre una forma distinta de atención.
            </p>
            <RotatedQuote>
              "Toda lectura no lineal es una coreografía: el ojo decide su propio itinerario."
            </RotatedQuote>
            <p>
              El texto convive con piezas activas sin perder su voz. Lo importante no es simular
              un libro, sino diseñar una experiencia legible.
            </p>
            <BlinkingNote>signal: branch opened at node /pasillo/nota-3</BlinkingNote>
            <p>
              Cuando termina esta sección, no hay cierre forzado: solo un nuevo punto de entrada.
            </p>
          </div>
        ) : null}
      </Reader>
    </main>
  );
}
