import { useState } from "react";
import "./state-cases.css";

/** Four exhibits at fixed places on the board, so a connection can be drawn. */
const ITEMS = [
  { id: "register", label: "the register", x: 18, y: 16 },
  { id: "photograph", label: "the corridor photograph", x: 80, y: 15 },
  { id: "note", label: "the clerk's note", x: 22, y: 50 },
  { id: "key", label: "the second key", x: 76, y: 49 }
];

// Opens with two exhibits already pinned: one pin draws no line, so a board with
// nothing on it cannot show what the piece is about.
const OPENING = ["register", "note"];

export function InvestigatorBoard() {
  const [pins, setPins] = useState<string[]>(OPENING);
  const pinned = pins.map((id) => ITEMS.find((item) => item.id === id) as (typeof ITEMS)[number]);
  const links = pinned.slice(1).map((item, index) => [pinned[index], item] as const);

  const toggle = (id: string) =>
    setPins((previous) =>
      previous.includes(id) ? previous.filter((entry) => entry !== id) : [...previous, id]
    );

  return (
    <div className="playground__board">
      <div className="playground__case-controls">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={pins.includes(item.id)}
            className={pins.includes(item.id) ? "is-active" : undefined}
            onClick={() => toggle(item.id)}
          >
            {`${pins.includes(item.id) ? "Unpin" : "Pin"} ${item.label}`}
          </button>
        ))}
      </div>

      {/* Decorative: the same order and the same pairs are written out below. */}
      <svg className="playground__board-svg" viewBox="0 0 100 62" aria-hidden="true" focusable="false">
        {links.map(([from, to]) => (
          <line key={`${from.id}-${to.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
        ))}
        {ITEMS.map((item) => (
          <g key={item.id} className={pins.includes(item.id) ? "is-pinned" : undefined}>
            <circle cx={item.x} cy={item.y} r={pins.includes(item.id) ? 3.6 : 2.2} />
            {/* Above the pins on the top row, below on the bottom one, so a label never crosses a line. */}
            <text x={item.x} y={item.y < 30 ? item.y - 6 : item.y + 8} textAnchor="middle">
              {item.label.replace("the ", "")}
            </text>
          </g>
        ))}
      </svg>

      <div role="status" aria-live="polite">
        <p>
          {pinned.length
            ? `On the board, in the order you pinned them: ${pinned.map((item) => item.label).join(", ")}.`
            : "The board is empty, and an empty board is not a story."}
        </p>
        <ol className="playground__board-links">
          {links.length ? (
            links.map(([from, to]) => (
              <li key={`${from.id}-${to.id}`}>{`${from.label} is strung to ${to.label}`}</li>
            ))
          ) : (
            <li>No connection yet: one exhibit on its own explains nothing.</li>
          )}
        </ol>
      </div>

      <p className="playground__case-note">
        The lines are inline SVG, drawn from the same array that writes the sentences, and the SVG is
        marked decorative. Nothing is said by a line alone, so the board reads out loud as well.
      </p>
    </div>
  );
}
