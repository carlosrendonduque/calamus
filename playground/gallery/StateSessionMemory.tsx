import { useState } from "react";
import "./state-cases.css";

const KEY = "calamus-gallery-session-note";
const SEED = "Left on an earlier visit: the stairs are counted differently going down.";

// Every access is wrapped: storage throws outright in private mode and wherever
// site data is blocked, and the example still has to render.
function readNote(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function writeNote(value: string): boolean {
  try {
    window.localStorage.setItem(KEY, value);
    return true;
  } catch {
    return false;
  }
}

// Opens mid-reading, like the reader-memory example: on a first visit the piece
// seeds the note itself, because a blank box cannot show that anything is kept.
function open(): { stored: string | null; usable: boolean } {
  const existing = readNote();
  if (existing !== null) {
    return { stored: existing, usable: true };
  }
  const usable = writeNote(SEED);
  return { stored: usable ? SEED : null, usable };
}

export function SessionMemory() {
  const [state, setState] = useState(open);
  const [draft, setDraft] = useState(state.stored ?? "");

  const save = () => {
    const usable = writeNote(draft);
    setState({ stored: usable ? draft : null, usable });
  };
  // Cleared as an empty note rather than a removed key, so the starter sentence
  // is not seeded all over again on the next visit.
  const clear = () => {
    setState({ stored: "", usable: writeNote("") });
    setDraft("");
  };

  return (
    <div className="playground__session">
      <p role="status" aria-live="polite">
        {state.stored
          ? `The text has kept one sentence about you: "${state.stored}" It survives closing the tab.`
          : state.usable
            ? "The text is keeping nothing about you. Write a line and it will outlive the page."
            : "This browser will not store anything, so nothing written here can outlive the page."}
      </p>
      <label className="playground__session-label" htmlFor="session-note">
        A line for your next visit
      </label>
      <textarea
        id="session-note"
        rows={3}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="playground__case-controls">
        <button type="button" disabled={!state.usable || draft === state.stored} onClick={save}>
          Keep this
        </button>
        <button type="button" disabled={!state.stored} onClick={clear}>
          Make it forget
        </button>
      </div>
      <p className="playground__case-note">
        Reload the page. The reader-memory example forgets, because its state lives in React; this
        one reads <code>localStorage</code> as it mounts, so the sentence comes back with it.
      </p>
    </div>
  );
}
