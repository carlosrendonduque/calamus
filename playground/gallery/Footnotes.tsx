import { useState } from "react";

type Note = { mark: string; text: string; child?: string };

/** A chain, not a list: every note carries the mark of the note inside it. */
const NOTES: Record<string, Note> = {
  "1": { mark: "1", text: "The word evening is doing a great deal of work in that sentence.", child: "1.1" },
  "1.1": { mark: "1.1", text: "It was, strictly speaking, still the afternoon.", child: "1.1.a" },
  "1.1.a": { mark: "1.1.a", text: "The clock in the hall had been ten minutes wrong for a decade.", child: "1.1.a.i" },
  "1.1.a.i": { mark: "1.1.a.i", text: "Nobody tall enough to reach it had ever been told." }
};

export function Footnotes() {
  const [chain, setChain] = useState<string[]>([]);

  return (
    <div className="playground__notes">
      <p>
        They had agreed to meet in the evening
        <button
          type="button"
          className="playground__note-mark"
          aria-expanded={chain.length > 0}
          onClick={() => setChain(["1"])}
        >
          1
        </button>
        , and only one of them arrived.
      </p>
      <ol className="playground__note-chain" role="list">
        {chain.map((id, depth) => (
          <li key={id} style={{ marginInlineStart: `${depth * 1.1}rem` }}>
            <p>
              <span className="playground__note-number">{NOTES[id].mark}</span> {NOTES[id].text}
            </p>
            {depth === chain.length - 1 && NOTES[id].child ? (
              <button
                type="button"
                className="playground__note-mark"
                onClick={() => setChain((previous) => [...previous, NOTES[id].child as string])}
              >
                {NOTES[NOTES[id].child as string].mark}
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="playground__note-depth" role="status">
        {chain.length === 0
          ? "Nothing opened yet. The chain is four notes deep."
          : `Depth ${chain.length} of 4: note ${chain[chain.length - 1]}.`}
      </p>
      <div className="playground__case-controls">
        <button type="button" disabled={chain.length === 0} onClick={() => setChain((p) => p.slice(0, -1))}>
          Back up one note
        </button>
        <button type="button" disabled={chain.length === 0} onClick={() => setChain([])}>
          Close the chain
        </button>
      </div>
    </div>
  );
}
