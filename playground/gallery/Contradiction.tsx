import { useState } from "react";
import "./voice.css";

type Statement = { id: string; text: string; claim: string; holds: boolean };

/** What each claim is about, in words, so the verdict can name it. */
const CLAIMS: Record<string, string> = {
  door: "whether the door was open at three",
  entry: "whether anything was entered after three"
};

const STATEMENTS: Statement[] = [
  { id: "s1", text: "The main door was sealed at three o'clock.", claim: "door", holds: false },
  { id: "s2", text: "At two minutes past three the main door still stood open.", claim: "door", holds: true },
  { id: "s3", text: "No opening was recorded after that hour.", claim: "entry", holds: false },
  { id: "s4", text: "The register carries one entry timed at half past three.", claim: "entry", holds: true }
];

/** A contradiction is two held statements that answer the same claim differently. */
function contradicted(held: Statement[]) {
  return Object.keys(CLAIMS).filter((claim) => {
    const answers = held.filter((statement) => statement.claim === claim);
    return answers.some((statement) => statement.holds) && answers.some((statement) => !statement.holds);
  });
}

export function Contradiction() {
  const [held, setHeld] = useState<string[]>([]);
  const chosen = STATEMENTS.filter((statement) => held.includes(statement.id));
  const broken = contradicted(chosen);

  const toggle = (id: string) =>
    setHeld((previous) => (previous.includes(id) ? previous.filter((entry) => entry !== id) : [...previous, id]));

  return (
    <div className="playground__claims">
      <ul className="playground__claim-list" role="list">
        {STATEMENTS.map((statement) => (
          <li key={statement.id}>
            <label className={held.includes(statement.id) ? "playground__claim is-held" : "playground__claim"}>
              <input type="checkbox" checked={held.includes(statement.id)} onChange={() => toggle(statement.id)} />
              {statement.text}
            </label>
          </li>
        ))}
      </ul>

      {/* Nothing is hard-coded to one pair: the clash falls out of the claims the
          held statements answer, so a fifth statement would work the same way. */}
      <p
        className={broken.length > 0 ? "playground__claim-verdict is-broken" : "playground__claim-verdict"}
        role="status"
      >
        {broken.length > 0
          ? `Cannot all stand. Your selection answers ${broken.map((claim) => CLAIMS[claim]).join(", and ")} both ways.`
          : chosen.length < 2
            ? "Hold two statements at once and see whether the file can keep them both."
            : `These ${chosen.length} can stand together.`}
      </p>

      <div className="playground__case-controls">
        <button type="button" disabled={held.length === 0} onClick={() => setHeld([])}>
          Let them all go
        </button>
      </div>
    </div>
  );
}
