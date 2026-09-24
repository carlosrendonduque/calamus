import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { unCoupDeDes } from "../../examples/corpus/mallarme-un-coup-de-des";
import "./typography.css";

/**
 * Four fragments of the poem and the distance between them, which in Mallarmé is
 * not spacing but grammar: `blanks` is how many empty lines a fragment waits
 * behind, handed to CSS and turned into space there.
 */
const SHEETS = [
  { line: 0, blanks: 0 }, // UN COUP DE DÉS
  { line: 1, blanks: 6 }, // JAMAIS
  { line: 5, blanks: 9 }, // SOIT
  { line: 7, blanks: 5 } // l'Abîme
];

/**
 * A near-empty page, where the emptiness is the mechanism. `content.body` can
 * hold these four fragments but not the silence between them, so as a list of
 * lines the poem loses its syntax. Here the silence is real: it is taller than
 * the field, and reaching the next word costs a press. What you are made to do
 * to read it is the reading.
 */
export function TypeSparse() {
  const [reached, setReached] = useState(0);
  const field = useRef<HTMLOListElement>(null);

  const goTo = (index: number) => {
    setReached(index);
    const target = field.current?.children[index] as HTMLElement | undefined;
    if (!field.current || !target) {
      return;
    }
    // Scrolled by hand rather than with `scrollIntoView`, which would take the
    // whole page with it, and instantly where the reader has asked for less motion.
    field.current.scrollTo({
      top: target.offsetTop - field.current.clientHeight / 2 + target.clientHeight / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  };

  const last = reached === SHEETS.length - 1;

  return (
    <div className="playground__type-sparse">
      <div className="playground__case-controls">
        <button type="button" disabled={last} onClick={() => goTo(reached + 1)}>
          Cross to the next word
        </button>
        <button type="button" disabled={reached === 0} onClick={() => goTo(0)}>
          Back to the opening
        </button>
      </div>

      <ol
        className="playground__type-field"
        ref={field}
        tabIndex={0}
        aria-label="Un coup de dés, four fragments across the blank"
      >
        {SHEETS.map((sheet) => (
          <li key={sheet.line} className="playground__type-sheet" style={{ "--blanks": sheet.blanks } as CSSProperties}>
            <span className="playground__type-void">{sheet.blanks === 0 ? "opening" : `${sheet.blanks} empty lines`}</span>
            {/* The French is marked here and not on the list, whose own labels are English. */}
            <span className="playground__type-fragment" lang="fr">
              {unCoupDeDes.body[sheet.line]}
            </span>
          </li>
        ))}
      </ol>

      <p className="playground__case-note" role="status">
        {`Fragment ${reached + 1} of ${SHEETS.length}, ${SHEETS[reached].blanks} empty lines behind it. `}
        {last ? "Four words, and most of the poem was the distance." : "Stéphane Mallarmé, Un coup de dés, 1897."}
      </p>
    </div>
  );
}
