import { useState } from "react";
import "./state-cases.css";

/**
 * One clause of the account. `floor` is the reliability at which the clause may
 * be stated plainly; below it the clause is hedged, and below `keep` it is not
 * said at all. The dial is graded, so the sentence loses its grammar of
 * certainty by degrees rather than switching between two drafts.
 */
type Clause = { plain: string; hedged: string; floor: number; keep: number };

const ACCOUNT: Clause[] = [
  {
    plain: "The door was locked from the inside.",
    hedged: "The door is described as having been locked from the inside.",
    floor: 70,
    keep: 0
  },
  {
    plain: "The clerk turned the visitor away at eleven.",
    hedged: "Someone, probably the clerk, turned a visitor away late in the evening.",
    floor: 45,
    keep: 15
  },
  {
    plain: "The register gives the visitor's name in full.",
    hedged: "The register gives a name, in a hand that is not the clerk's.",
    floor: 80,
    keep: 35
  }
];

export function EvidenceScore() {
  const [trust, setTrust] = useState(72);
  const said = ACCOUNT.filter((clause) => trust >= clause.keep);

  return (
    <div className="playground__trust">
      <div className="control control--range">
        <label className="control__label" htmlFor="evidence-trust">
          reliability
        </label>
        <span className="control__range">
          <input
            id="evidence-trust"
            type="range"
            min={0}
            max={100}
            step={1}
            value={trust}
            onChange={(event) => setTrust(Number(event.target.value))}
          />
          <output htmlFor="evidence-trust">{`${trust}%`}</output>
        </span>
      </div>
      <div className="playground__trust-account" role="status" aria-live="polite">
        {said.map((clause) => (
          <p key={clause.plain} className={trust >= clause.floor ? "is-plain" : "is-hedged"}>
            {trust >= clause.floor ? clause.plain : clause.hedged}
          </p>
        ))}
        <p className="playground__case-note">
          {`${said.length} of ${ACCOUNT.length} claims survive at this reliability; ` +
            `${said.filter((clause) => trust >= clause.floor).length} are stated without hedging.`}
        </p>
      </div>
      <p className="playground__case-note">
        The dial does not tint the page or add a badge: it changes the verbs. Drag it down and the
        account stops asserting, then stops mentioning. Each claim has its own threshold, so the
        paragraph degrades unevenly, the way a file does.
      </p>
    </div>
  );
}
