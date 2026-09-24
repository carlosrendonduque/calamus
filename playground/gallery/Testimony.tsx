import { useState } from "react";
import "./voice.css";

type Point = { id: string; subject: string; transcript: string; log: string };

/** Three things the two accounts of one night cannot both be right about. */
const POINTS: Point[] = [
  {
    id: "hour",
    subject: "The hour",
    transcript: "The call reached the desk at twenty past three.",
    log: "I made the call at ten to four, from the gate, and not before."
  },
  {
    id: "wall",
    subject: "The wall",
    transcript: "The wall of the store room had moved out by about a hand's width.",
    log: "Nothing in the store room had moved. I said so at the time and I say so here."
  },
  {
    id: "signal",
    subject: "The signal",
    transcript: "We were off the radio for four minutes, perhaps five.",
    log: "The radio worked all night. Nobody called me on it."
  }
];

const SOURCES = [
  { id: "transcript", name: "Transcript of the call" },
  { id: "log", name: "Field log, same night" }
] as const;

export function Testimony() {
  const [marked, setMarked] = useState<string | null>(null);
  const point = POINTS.find((entry) => entry.id === marked);

  return (
    <div className="playground__accounts">
      <div className="playground__case-controls" role="group" aria-label="Line the two accounts up on one point">
        {POINTS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === marked}
            className={entry.id === marked ? "is-active" : undefined}
            onClick={() => setMarked((previous) => (previous === entry.id ? null : entry.id))}
          >
            {entry.subject}
          </button>
        ))}
      </div>

      {/* Two columns on a wide screen, one column on a narrow one. The marker is a
          word and a rule, so the pair can be found without seeing both at once. */}
      <div className="playground__accounts-pair">
        {SOURCES.map((source) => (
          <article key={source.id} className="playground__account" aria-label={source.name}>
            <h4>{source.name}</h4>
            {POINTS.map((entry) => (
              <p
                key={entry.id}
                className={entry.id === marked ? "playground__account-line is-marked" : "playground__account-line"}
              >
                <span className="playground__account-subject">{entry.subject}</span>
                {source.id === "transcript" ? entry.transcript : entry.log}
                {entry.id === marked ? <span className="playground__sr-only"> (the point you marked)</span> : null}
              </p>
            ))}
          </article>
        ))}
      </div>

      <p className="playground__case-note" role="status">
        {point
          ? `${point.subject}: marked in both accounts, which do not agree about it.`
          : "Mark a point to find it in both columns."}
      </p>
    </div>
  );
}
