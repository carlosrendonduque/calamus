import { Fragment, useState } from "react";
import type { CSSProperties } from "react";
import { ilPleut } from "../../examples/corpus/apollinaire-il-pleut";

/**
 * Apollinaire's five sentences are stored in `content.body` as five ordinary
 * lines. Here each one is placed word by word down a slanting column, which is
 * how the poem is printed: the shape is the reading. The offsets and the angle
 * are handed to CSS as `--step`, so the arithmetic stays in the stylesheet.
 */
export function Calligram() {
  const [asLines, setAsLines] = useState(false);

  return (
    <div className="playground__calligram-case">
      <button
        type="button"
        className="playground__toggle"
        aria-pressed={asLines}
        onClick={() => setAsLines((previous) => !previous)}
      >
        Flatten it back into lines
      </button>
      <div className={asLines ? "playground__calligram is-lines" : "playground__calligram"} lang="fr">
        {ilPleut.body.map((line, column) => (
          <p key={column} className="playground__rain-column">
            {line.split(" ").map((word, step) => (
              // The space is kept outside the word, where a flex column ignores
              // it, so the line is still one readable sentence in the document.
              <Fragment key={step}>
                <span className="playground__rain-word" style={{ "--step": step } as CSSProperties}>
                  {word}
                </span>{" "}
              </Fragment>
            ))}
          </p>
        ))}
      </div>
      <p className="playground__case-note">
        {asLines
          ? "Five sentences, set as prose. This is what content.body holds."
          : "Five columns of rain, one word at a time. Guillaume Apollinaire, Il pleut, 1918."}
      </p>
    </div>
  );
}
