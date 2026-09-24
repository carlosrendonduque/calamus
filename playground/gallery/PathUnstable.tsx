import { useState } from "react";
import "./structure.css";

type Turn = { name: string; line: string };

const TURNS: Turn[] = [
  { name: "the gap in the hedge", line: "The field beyond has been mown since you last looked at it." },
  { name: "the pump house", line: "Unlocked, and the water still moving somewhere under the floor." },
  { name: "the low wall", line: "Someone has set the copings back in the wrong order." },
  { name: "the line of hives", line: "Quiet, and the quiet has plainly been arranged." },
  { name: "the gate off the map", line: "Which is how you know the map was drawn by someone who came this way twice." }
];

/**
 * A rotation by a step-dependent pivot: every turning that is left moves, so the
 * reader cannot navigate by position. Unstable to read, reproducible to write.
 */
function reorder(turns: Turn[], step: number): Turn[] {
  if (turns.length < 2) {
    return turns;
  }

  const pivot = 1 + ((step * 5) % (turns.length - 1));
  return [...turns.slice(pivot), ...turns.slice(0, pivot)];
}

export function PathUnstable() {
  const [left, setLeft] = useState<Turn[]>(TURNS);
  const [taken, setTaken] = useState<Turn[]>([]);

  const take = (turn: Turn) => {
    setTaken((previous) => [...previous, turn]);
    setLeft((previous) => reorder(previous.filter((entry) => entry !== turn), taken.length + 1));
  };

  return (
    <div className="playground__unstable">
      <p>
        Five ways out of the orchard. Take one and it closes behind you, and the ones you did not take
        change places while you are reading, so the same turning is never twice in the same spot.
      </p>
      <div className="playground__unstable-passage" aria-live="polite">
        {taken.length === 0 ? (
          <p>You are standing in the middle of the trees, and every way out is still open.</p>
        ) : (
          taken.map((turn) => (
            <p key={turn.name}>
              <span className="playground__unstable-name">{turn.name}.</span> {turn.line}
            </p>
          ))
        )}
      </div>
      <ul className="playground__unstable-turns" role="list">
        {left.map((turn) => (
          <li key={turn.name}>
            <button type="button" onClick={() => take(turn)}>
              {`Go by ${turn.name}`}
            </button>
          </li>
        ))}
      </ul>
      <p className="playground__case-note" role="status">
        {left.length === 0
          ? "Nothing is left to take. The paragraph above is the orchard in the order you made."
          : `${left.length} turning${left.length === 1 ? "" : "s"} left, and not where you last saw them.`}
      </p>
      {taken.length > 0 ? (
        <p className="playground__case-note">{`Closed behind you: ${taken.map((turn) => turn.name).join(", ")}.`}</p>
      ) : null}
      <div className="playground__case-controls">
        <button
          type="button"
          disabled={taken.length === 0}
          onClick={() => {
            setTaken([]);
            setLeft(TURNS);
          }}
        >
          Put the orchard back
        </button>
      </div>
    </div>
  );
}
