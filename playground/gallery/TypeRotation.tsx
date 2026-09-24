import { useState } from "react";
import type { CSSProperties } from "react";
import "./typography.css";

/** Each note leans by its own multiple of the tilt: one generation of copying. */
const NOTES = [
  {
    lean: 0.3,
    text: "The first note was written flat on a table, in good light, by someone with the time to rule a margin."
  },
  {
    lean: -1,
    text: "The second was copied from the first against a wall, standing up, between one thing and the next."
  },
  {
    lean: 1.6,
    text: "The third was copied from the second by somebody who had never seen the table."
  },
  {
    lean: -2.2,
    text: "The fourth is the copy that was filed, and nobody has straightened it since."
  }
];

const STATES = [
  { label: "Square", tilt: 0, note: "Set square, the four notes are one document." },
  { label: "As filed", tilt: 1.8, note: "Each copy keeps the angle of the surface it was made on." },
  { label: "Past caring", tilt: 3.4, note: "The stack has become a pile: the order is still there, and you no longer trust it." }
];

/**
 * Blocks set at an angle to each other. React holds one number and hands it to
 * CSS as `--tilt`, where it is multiplied by each block's own `--lean`, so the
 * four angles are a stylesheet sum rather than four inline transforms.
 *
 * The rotation is presentational and nothing more: the notes sit in the document
 * in reading order at every angle, so a screen reader, a find-in-page and a
 * copy-paste all get the flat version.
 */
export function TypeRotation() {
  const [state, setState] = useState(STATES[1]);

  return (
    <div className="playground__type-rotation">
      <div className="playground__case-controls" role="group" aria-label="How crooked the copies are">
        {STATES.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={option.tilt === state.tilt}
            className={option.tilt === state.tilt ? "is-active" : undefined}
            onClick={() => setState(option)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="playground__type-stack" style={{ "--tilt": state.tilt } as CSSProperties}>
        {NOTES.map((note, index) => (
          <p key={index} className="playground__type-leaf" style={{ "--lean": note.lean } as CSSProperties}>
            <span className="playground__type-leaf-mark">{`copy ${index + 1}`}</span>{" "}
            {note.text}
          </p>
        ))}
      </div>

      <p className="playground__case-note">
        {`${state.note} `}
        The angle never reaches the text: the order of the four notes in the document is the same at
        every setting.
      </p>
    </div>
  );
}
