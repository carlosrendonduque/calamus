import { useState } from "react";
import "./structure.css";

type Snapshot = { name: string; route: string[] };

const NODES = ["the quay", "the market", "the light"];

export function PathSnapshots() {
  const [route, setRoute] = useState<string[]>([]);
  const [saved, setSaved] = useState<Snapshot[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const pair = saved.filter((entry) => picked.includes(entry.name));
  const both = pair.length === 2;
  const rows = both ? Math.max(pair[0].route.length, pair[1].route.length) : 0;
  // Where the two walks stop agreeing. No disagreement at all means they are one walk.
  const agree = Array.from({ length: rows }, (unused, step) => pair[0].route[step] === pair[1].route[step]);
  const part = agree.indexOf(false) === -1 ? rows : agree.indexOf(false);

  const keep = () => {
    setSaved((previous) => [...previous, { name: `Route ${previous.length + 1}`, route }]);
    setRoute([]);
  };

  // Two picks at most: three routes held together is a table, not a reading.
  const pick = (name: string) =>
    setPicked((previous) =>
      previous.includes(name) ? previous.filter((entry) => entry !== name) : [...previous, name].slice(-2)
    );

  return (
    <div className="playground__snapshot">
      <p>Walk the town, keep the walk, then walk it another way and hold the two up against each other.</p>
      <div className="playground__snapshot-choices">
        {NODES.map((node) => (
          <button key={node} type="button" onClick={() => setRoute((previous) => [...previous, node])}>
            {`Go to ${node}`}
          </button>
        ))}
      </div>
      <ol className="playground__snapshot-route" role="list" aria-label="The walk you are on" aria-live="polite">
        {route.map((node, index) => (
          <li key={index} aria-current={index === route.length - 1 ? "step" : undefined}>{node}</li>
        ))}
      </ol>
      <div className="playground__case-controls">
        <button type="button" disabled={route.length === 0} onClick={keep}>
          Keep this walk
        </button>
        {saved.map((snapshot) => (
          <button
            key={snapshot.name}
            type="button"
            aria-pressed={picked.includes(snapshot.name)}
            className={picked.includes(snapshot.name) ? "is-active" : undefined}
            onClick={() => pick(snapshot.name)}
          >
            {`${snapshot.name}${picked.includes(snapshot.name) ? ", comparing" : ""}`}
          </button>
        ))}
      </div>
      {both ? (
        <div className="playground__snapshot-compare" role="status">
          <p className="playground__snapshot-heads">
            <span>{pair[0].name}</span> <span>{pair[1].name}</span>
          </p>
          <ol className="playground__snapshot-rows" role="list">
            {agree.map((same, index) => (
              <li key={index} className={same ? "is-shared" : undefined}>
                <span>{pair[0].route[index] ?? "(ended)"}</span>
                <span>{pair[1].route[index] ?? "(ended)"}</span>
                <span className="playground__snapshot-flag">{same ? "shared" : "differs"}</span>
              </li>
            ))}
          </ol>
          <p className="playground__case-note">
            {part === rows
              ? "The two walks are the same, step for step."
              : `They agree for ${part} step${part === 1 ? "" : "s"}, and part at step ${part + 1}.`}
          </p>
        </div>
      ) : (
        <p className="playground__case-note" role="status">{`Walks kept: ${saved.length}. Pick two.`}</p>
      )}
    </div>
  );
}
