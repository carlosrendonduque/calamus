import { useState } from "react";

/** A passage is a list of plain strings and passages held back from the reader. */
type Segment = string | { hidden: string };

const REPORT: Segment[][] = [
  [
    "The clerk recorded that the door had been locked from ",
    { hidden: "the inside" },
    ", and wrote nothing else about the door."
  ],
  [
    "Every visitor who signed the register that week gave the same address, which turned out to be ",
    { hidden: "a house standing empty" },
    "."
  ],
  [{ hidden: "The second page of the report" }, " was taken out before the file was copied."]
];

export function Redaction() {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="playground__redaction">
      {REPORT.map((paragraph, line) => (
        <p key={line}>
          {paragraph.map((segment, index) => {
            if (typeof segment === "string") {
              return <span key={index}>{segment}</span>;
            }

            const id = `${line}-${index}`;
            const revealed = open[id] === true;

            return (
              <button
                key={id}
                type="button"
                className={revealed ? "playground__bar is-open" : "playground__bar"}
                aria-pressed={revealed}
                onClick={() => setOpen((previous) => ({ ...previous, [id]: !revealed }))}
              >
                <span className="playground__sr-only">
                  {revealed ? "Hide these words again" : "Reveal the redacted words"}
                </span>
                {/* Kept in the box while hidden, so the bar is exactly as wide as
                    what it covers and the paragraph does not reflow on a reveal. */}
                <span aria-hidden={!revealed}>{segment.hidden}</span>
              </button>
            );
          })}
        </p>
      ))}
    </div>
  );
}
