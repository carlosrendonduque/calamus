import { useState } from "react";
import "./structure.css";

type Entry = { place: string; struck: boolean };

/** All four places stay open all the time: the record is the subject, not the map. */
const PLACES = ["the reading room", "the map case", "the annex stair", "the courtyard"];

export function PathTrail() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const kept = entries.filter((entry) => !entry.struck);
  const here = kept[kept.length - 1];
  const returns = here ? kept.filter((entry) => entry.place === here.place).length : 0;

  const sign = (place: string) => setEntries((previous) => [...previous, { place, struck: false }]);

  // Striking a line is itself an entry: nothing leaves the book, it is only marked.
  const strike = () =>
    setEntries((previous) => {
      const target = previous.map((entry) => entry.struck).lastIndexOf(false);
      return previous.map((entry, index) => (index === target ? { ...entry, struck: true } : entry));
    });

  return (
    <div className="playground__trail">
      <p>
        You are asked to sign the book each time you move. The porter will not rub anything out, and
        a line you withdraw stays on the page with the withdrawal written beside it.
      </p>
      <nav aria-label="The visitors' book">
        <ol className="playground__trail-book" role="list">
          {entries.map((entry, index) => (
            <li
              key={index}
              className={entry.struck ? "is-struck" : undefined}
              aria-current={!entry.struck && entry === here ? "step" : undefined}
            >
              {entry.place}
              {entry.struck ? <span className="playground__trail-mark">struck</span> : null}
            </li>
          ))}
          {entries.length === 0 ? <li className="playground__trail-empty">no lines yet</li> : null}
        </ol>
      </nav>
      <ul className="playground__trail-choices" role="list">
        {PLACES.map((place) => (
          <li key={place}>
            <button type="button" onClick={() => sign(place)}>
              {`Cross to ${place}`}
            </button>
          </li>
        ))}
      </ul>
      <p className="playground__case-note" aria-live="polite">
        {here
          ? `${kept.length} line${kept.length === 1 ? "" : "s"} standing, ${
              entries.length - kept.length
            } struck. The book has you in ${here.place} ${returns} time${returns === 1 ? "" : "s"}.`
          : "The book is open and empty. Nothing you write in it can be taken out again."}
      </p>
      <div className="playground__case-controls">
        <button type="button" disabled={kept.length === 0} onClick={strike}>
          Withdraw the last line
        </button>
        <button type="button" disabled={entries.length === 0} onClick={() => setEntries([])}>
          Close the book
        </button>
      </div>
    </div>
  );
}
