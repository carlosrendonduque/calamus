import { useState } from "react";
import { Reader, type ReaderContent, type ReaderMode } from "../src";
import { tristramShandy } from "../examples/corpus/sterne-tristram-shandy";
import { unCoupDeDes } from "../examples/corpus/mallarme-un-coup-de-des";
import { ilPleut } from "../examples/corpus/apollinaire-il-pleut";

const MODES: ReaderMode[] = ["scroll", "book", "terminal", "editorial", "hypertext"];

const labels: Record<ReaderMode, string> = {
  scroll: "Scroll",
  book: "Book",
  terminal: "Terminal",
  editorial: "Editorial",
  hypertext: "Hypertext"
};

const CONTENT_BY_MODE: Record<ReaderMode, ReaderContent> = {
  scroll: tristramShandy,
  book: tristramShandy,
  terminal: tristramShandy,
  editorial: unCoupDeDes,
  hypertext: ilPleut
};

// The two French poems are announced as French, so screen readers and
// hyphenation do not treat them as English.
const LANG_BY_MODE: Record<ReaderMode, string> = {
  scroll: "en",
  book: "en",
  terminal: "en",
  editorial: "fr",
  hypertext: "fr"
};

const CAPTIONS: Record<ReaderMode, string> = {
  scroll: "Sterne reads as prose: one continuous column, with a progress bar.",
  book: "The same chapter, measured and broken into pages.",
  terminal: "The same chapter again, as a file being paged through.",
  editorial: "Mallarmé in fragments, spread across columns and horizontal sheets.",
  hypertext: "Apollinaire as a calligram: the reader hands the page to the host."
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

function RainLine({ index, children }: { index: number; children: string }) {
  return (
    <p className="playground__rain-line" style={{ marginInlineStart: `${index * 1.4}rem` }}>
      {children}
    </p>
  );
}

export function App() {
  const [mode, setMode] = useState<ReaderMode>("scroll");

  return (
    <main className="playground">
      <header className="playground__header">
        <h1>calamus playground</h1>
        <p>Five reading modes, one demo corpus. Pick a mode to see what it does to a text.</p>
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

      <p className="playground__caption">{CAPTIONS[mode]}</p>

      <Reader mode={mode} content={CONTENT_BY_MODE[mode]} transition="fade" lang={LANG_BY_MODE[mode]}>
        {mode === "hypertext" ? (
          <div className="playground__hypertext-demo">
            <p>
              In hypertext mode the reader renders its header and then steps aside: everything
              below this point is your own markup, passed in as <code>children</code>.
            </p>
            <div className="playground__rain" lang="fr">
              {ilPleut.body.map((line, index) => (
                <RainLine key={index} index={index}>
                  {line}
                </RainLine>
              ))}
            </div>
            <RotatedQuote>
              "A layout is an argument about how a text wants to be read."
            </RotatedQuote>
            <p>
              On Apollinaire's page these five lines fall as five slanting columns of rain, one
              letter at a time. The library has no opinion about that, which is the point: it gives
              you the frame and the typography, and lets the piece keep its own shape.
            </p>
            <BlinkingNote>node /calligrammes/il-pleut — 5 lines, 1 direction: down</BlinkingNote>
            <p>
              Mix prose with components, animation or media here. Nothing in this block is
              paginated, measured or reflowed by calamus.
            </p>
          </div>
        ) : null}
      </Reader>
    </main>
  );
}
