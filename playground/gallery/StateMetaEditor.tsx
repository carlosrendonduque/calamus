import { useState } from "react";
import "./state-cases.css";

/** The house style of whoever is editing the text after it was written. */
const RULES = [
  { from: "I saw", to: "I believe I saw" },
  { from: "does not", to: "appears not to" },
  { from: "certainly", to: "perhaps" }
];

const OPENING = "I saw the second door, and the plan does not show it.";

type Part = string | { was: string; now: string };

/** Splits the line into untouched runs and substitutions, so the edits can be marked. */
function edit(line: string): Part[] {
  let parts: Part[] = [line];

  for (const rule of RULES) {
    parts = parts.flatMap((part) =>
      typeof part === "string"
        ? part
            .split(rule.from)
            .flatMap((chunk, index) => (index ? [{ was: rule.from, now: rule.to }, chunk] : [chunk]))
        : [part]
    );
  }

  return parts.filter((part) => part !== "");
}

export function MetaEditor() {
  const [line, setLine] = useState(OPENING);
  const [editing, setEditing] = useState(true);
  const parts = edit(line);
  const changes = parts.filter((part) => typeof part !== "string").length;

  return (
    <div className="playground__meta">
      <label className="playground__session-label" htmlFor="meta-line">
        Your sentence, before anyone else touches it
      </label>
      <input id="meta-line" type="text" value={line} onChange={(event) => setLine(event.target.value)} />
      <div className="control control--toggle">
        <input
          id="meta-editing"
          type="checkbox"
          checked={editing}
          onChange={(event) => setEditing(event.target.checked)}
        />
        <label className="control__label" htmlFor="meta-editing">
          the editor's hand
        </label>
      </div>
      <p className="playground__meta-line" role="status" aria-live="polite">
        {editing
          ? parts.map((part, index) =>
              typeof part === "string" ? (
                <span key={index}>{part}</span>
              ) : (
                <span key={index} className="playground__meta-edit">
                  {part.now}
                  <span className="playground__sr-only">{` (was: ${part.was})`}</span>
                </span>
              )
            )
          : line}
      </p>
      <p className="playground__case-note">
        {editing
          ? `${changes} substitution${changes === 1 ? "" : "s"}, underlined, and each one tells a ` +
              "screen reader the words it replaced."
          : "The editor is off: this is the sentence as you typed it."}
      </p>
      <p className="playground__case-note">
        Type <code>certainly</code> into the line, or take out <code>does not</code>, and watch the
        rules find their material. They only ever weaken an assertion:{" "}
        {RULES.map((rule) => `${rule.from} to ${rule.to}`).join("; ")}.
      </p>
    </div>
  );
}
