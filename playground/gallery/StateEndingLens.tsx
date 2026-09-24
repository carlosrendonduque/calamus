import { useState } from "react";
import "./state-cases.css";

/** The three facts every ending has to account for. None of them ever changes. */
const FACTS = [
  "The door was locked from the inside.",
  "The register carries a name in a hand nobody recognised.",
  "The clerk left at eleven and did not come back."
];

const LENSES = [
  {
    id: "haunting",
    label: "as haunting",
    ending:
      "So the room was sealed, and the name was written by a hand that had no business in the " +
      "building, and the clerk understood which of those two facts he could not stay beside. He " +
      "left at eleven, and the lock was the last honest thing in the account."
  },
  {
    id: "grief",
    label: "as grief",
    ending:
      "So the room was sealed from the inside, which is what a man does when he wants an hour " +
      "alone with a name. He wrote it himself, in the only hand he had left for it, and at " +
      "eleven he went out into the cold and kept going."
  },
  {
    id: "fraud",
    label: "as fraud",
    ending:
      "So the room was sealed from the inside, because a locked door is the cheapest alibi there " +
      "is. The name in the register was invented, and the man who invented it left at eleven, on " +
      "time, with the file already copied."
  }
];

export function EndingLens() {
  const [lensId, setLensId] = useState(LENSES[0].id);
  const lens = LENSES.find((entry) => entry.id === lensId) ?? LENSES[0];

  return (
    <div className="playground__lens">
      <ul className="playground__lens-facts">
        {FACTS.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      <div className="playground__case-controls" role="group" aria-label="Read the ending">
        {LENSES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === lens.id}
            className={entry.id === lens.id ? "is-active" : undefined}
            onClick={() => setLensId(entry.id)}
          >
            {`Read ${entry.label}`}
          </button>
        ))}
      </div>
      <p className="playground__lens-ending" role="status" aria-live="polite">
        {lens.ending}
      </p>
      <p className="playground__case-note">
        The list above is fixed; only the closing paragraph is swapped. Nothing is added to the
        evidence and nothing is taken away, so whichever ending you are holding, it has to be built
        out of the same three sentences.
      </p>
    </div>
  );
}
