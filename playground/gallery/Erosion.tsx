import { Fragment, useState } from "react";
import type { CSSProperties } from "react";
import "./typography.css";

const PASSAGE =
  "The tide came in over the letters cut into the stone, and went out again, and came in, " +
  "until the name on the stone was a suggestion rather than a name.";

const WORDS = PASSAGE.split(" ");

/**
 * How much of the erosion each word takes: a ramp along the sentence, so the
 * tide reaches the last words hardest, plus a fixed wobble so the line does not
 * fade evenly. No randomness, so the same slider value always looks the same.
 */
function wear(index: number): number {
  const ramp = index / (WORDS.length - 1);
  const wobble = ((index * 37) % 11) / 11;
  return Math.min(1, ramp * 0.78 + wobble * 0.3);
}

export function Erosion() {
  const [level, setLevel] = useState(0);

  return (
    <div className="playground__erosion" style={{ "--erosion": level / 100 } as CSSProperties}>
      <div className="control control--range">
        <label className="control__label" htmlFor="erosion-level">
          erosion
        </label>
        <span className="control__range">
          <input
            id="erosion-level"
            type="range"
            min={0}
            max={100}
            step={1}
            value={level}
            onChange={(event) => setLevel(Number(event.target.value))}
          />
          <output htmlFor="erosion-level">{`${level}%`}</output>
        </span>
      </div>
      <p className="playground__eroded">
        {WORDS.map((word, index) => (
          // The space lives between the words, not inside them: the passage can
          // still be selected, copied and found in the page at any erosion.
          <Fragment key={index}>
            <span className="playground__eroded-word" style={{ "--wear": wear(index) } as CSSProperties}>
              {word}
            </span>{" "}
          </Fragment>
        ))}
      </p>
      <p className="playground__case-note">
        One number drives opacity, letter-spacing and displacement. The words themselves are never
        touched, so the passage stays whole for a screen reader and for a search.
      </p>
    </div>
  );
}
