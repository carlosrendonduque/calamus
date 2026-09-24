import { useState } from "react";
import "./voice.css";

type Minute = { time: string; gate: string; warden: string; agrees: boolean };

/** One hour, kept twice. The agreeing minute is there so the others read as a choice. */
const MINUTES: Minute[] = [
  { time: "03:14", gate: "Door six opened.", warden: "Nothing to report.", agrees: false },
  { time: "03:16", gate: "Lights on in the yard.", warden: "Lights on in the yard.", agrees: true },
  { time: "03:17", gate: "A metal sound, twice.", warden: "Wind in the duct, as it is most nights.", agrees: false },
  { time: "03:22", gate: "Signal lost.", warden: "Equipment working normally.", agrees: false }
];

const DISPUTED = MINUTES.filter((minute) => !minute.agrees).length;

export function Discrepancy() {
  const [onlyDisputed, setOnlyDisputed] = useState(false);
  const shown = onlyDisputed ? MINUTES.filter((minute) => !minute.agrees) : MINUTES;

  return (
    <div className="playground__dispute">
      <div className="playground__case-controls">
        <button
          type="button"
          aria-pressed={onlyDisputed}
          className={onlyDisputed ? "is-active" : undefined}
          onClick={() => setOnlyDisputed((previous) => !previous)}
        >
          Only the minutes they dispute
        </button>
      </div>

      <ol className="playground__dispute-rows" role="list">
        {shown.map((minute) => (
          <li
            key={minute.time}
            className={minute.agrees ? "playground__dispute-row" : "playground__dispute-row is-split"}
          >
            <p className="playground__dispute-time">
              <span>{minute.time}</span>
              {/* The verdict is a word first. The rule down the side only repeats it. */}
              <span className="playground__dispute-verdict">{minute.agrees ? "agreed" : "disputed"}</span>
            </p>
            <dl className="playground__dispute-sources">
              <div>
                <dt>Gate log</dt>
                <dd>{minute.gate}</dd>
              </div>
              <div>
                <dt>Night warden</dt>
                <dd>{minute.warden}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>

      <p className="playground__case-note" role="status">
        {`Showing ${shown.length} of ${MINUTES.length} minutes. The two logs disagree about ${DISPUTED} of them.`}
      </p>
    </div>
  );
}
