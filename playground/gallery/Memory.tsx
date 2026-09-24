import { useState } from "react";

/** The paragraph the reader gets depends on how many times they have asked for it. */
const OPENINGS = [
  "You have just arrived, so the paragraph introduces itself. There is a corridor, and at the end of the corridor there are two doors.",
  "You have read this once already. The corridor is shorter this time, and the paragraph takes the doors as given.",
  "Third reading. The corridor is gone. Only the doors are left, and they are the only thing worth describing.",
  "You keep coming back. The paragraph has stopped describing anything at all and is simply counting you."
];

const DOORS = ["the north door", "the south door"];

// The example opens mid-reading on purpose. Starting from nothing, the text has
// no trace to show, so the idea only arrives after the visitor trusts a button.
const FIRST_READING = 2;
const ALREADY_OPENED = [DOORS[0]];

export function Memory() {
  const [readings, setReadings] = useState(FIRST_READING);
  const [chosen, setChosen] = useState<string[]>(ALREADY_OPENED);
  const last = chosen[chosen.length - 1];
  const countOf = (door: string) => chosen.filter((entry) => entry === door).length;

  return (
    <div className="playground__memory">
      <p>{OPENINGS[Math.min(readings, OPENINGS.length) - 1]}</p>
      <p>
        {last
          ? `You went through ${last} last, and you have gone through it ${countOf(last)} time${
              countOf(last) === 1 ? "" : "s"
            }. The other door has been used ${countOf(DOORS.find((door) => door !== last) as string)} times.`
          : "Neither door has been opened yet, which is the only reason this sentence is still polite."}
      </p>
      <div className="playground__case-controls">
        <button type="button" onClick={() => setReadings((previous) => previous + 1)}>
          Read it again
        </button>
        {DOORS.map((door) => (
          <button key={door} type="button" onClick={() => setChosen((previous) => [...previous, door])}>
            {`Go through ${door}`}
          </button>
        ))}
        <button
          type="button"
          disabled={readings === 1 && chosen.length === 0}
          onClick={() => {
            setReadings(1);
            setChosen([]);
          }}
        >
          Forget me
        </button>
      </div>
      <p className="playground__case-note" role="status">
        {`Readings: ${readings}. Doors opened: ${chosen.length}.`}
      </p>
    </div>
  );
}
