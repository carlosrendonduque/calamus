import { useState } from "react";
import "./structure.css";

type Anchor = { id: string; label: string; text: string };

const ANCHORS: Anchor[] = [
  { id: "note", label: "note 4.2", text: "The pier was gauged twice that morning, and the figures differ." },
  { id: "appendix", label: "appendix C", text: "The figure that was filed is in a hand nobody will own." }
];

/** An anchor is an id, and a jump to one has to carry the reader's focus with it. */
const goTo = (id: string) => document.getElementById(id)?.focus();

export function PathAnchors() {
  const [log, setLog] = useState<string[]>([]);
  const [away, setAway] = useState<Anchor | null>(null);

  const jump = (anchor: Anchor) => {
    setLog((previous) => [...previous, `down to ${anchor.label}`]);
    setAway(anchor);
    goTo(`anchor-body-${anchor.id}`);
  };

  const back = () => {
    if (!away) return;
    setLog((previous) => [...previous, `up from ${away.label}`]);
    setAway(null);
    goTo(`anchor-mark-${away.id}`);
  };

  const mark = (anchor: Anchor) => (
    <button id={`anchor-mark-${anchor.id}`} type="button" onClick={() => jump(anchor)}>
      {anchor.label}
    </button>
  );

  return (
    <div className="playground__anchor">
      <p className="playground__anchor-line" id="anchor-main" tabIndex={-1}>
        The bridge was passed as sound on the fourteenth {mark(ANCHORS[0])} on a sheet the engineer of
        record never read {mark(ANCHORS[1])} and it has carried the mail every day since.
      </p>
      <div className="playground__anchor-apparatus">
        {ANCHORS.map((anchor) => (
          <section key={anchor.id} id={`anchor-body-${anchor.id}`} tabIndex={-1} aria-label={anchor.label}>
            <h4>{anchor.label}</h4>
            <p>{anchor.text}</p>
          </section>
        ))}
      </div>
      <div className="playground__anchor-log" aria-live="polite">
        <p className="playground__case-note">
          {away
            ? `You are in ${away.label}, off the main line.`
            : log.length === 0
              ? "The main line is stable: you have not left it yet."
              : "Back on the main line. The log keeps every move you made."}
        </p>
        <ol className="playground__anchor-jumps" role="list">
          {log.map((entry, index) => (
            <li key={index} aria-current={index === log.length - 1 ? "step" : undefined}>
              {entry}
            </li>
          ))}
        </ol>
      </div>
      <div className="playground__case-controls">
        <button type="button" disabled={!away} onClick={back}>
          Back to the line you left
        </button>
        <button
          type="button"
          disabled={log.length === 0}
          onClick={() => {
            setLog([]);
            setAway(null);
            goTo("anchor-main");
          }}
        >
          Re-anchor the reading
        </button>
      </div>
    </div>
  );
}
