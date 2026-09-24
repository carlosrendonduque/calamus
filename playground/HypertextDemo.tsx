import { useState } from "react";
import { GALLERY_CASES } from "./gallery";
import { SourcePanel } from "./gallery/SourcePanel";

type HypertextDemoProps = {
  /** `content.body`, passed in only so the gallery can say that it is being ignored. */
  lines: string[];
};

/**
 * The children the explorer hands to `hypertext` mode: a gallery of six pieces,
 * each one a different class of thing this mode allows and each one showing its
 * own source. Nothing below the reader's header comes from the library.
 */
export function HypertextDemo({ lines }: HypertextDemoProps) {
  const [caseId, setCaseId] = useState(GALLERY_CASES[0].id);
  const current = GALLERY_CASES.find((entry) => entry.id === caseId) ?? GALLERY_CASES[0];
  const Case = current.render;

  return (
    <div className="playground__gallery">
      <p className="playground__gallery-intro">
        <code>content.body</code> holds{" "}
        {`${lines.length} paragraph${lines.length === 1 ? "" : "s"}`}, and hypertext mode renders
        none of them: everything below the title is markup passed in as <code>children</code>. Six
        examples of what that allows.
      </p>

      <div className="playground__picker" role="group" aria-labelledby="gallery-picker-label">
        <span className="playground__picker-label" id="gallery-picker-label">
          example
        </span>
        <div className="playground__picker-buttons">
          {GALLERY_CASES.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={entry.id === current.id}
              className={entry.id === current.id ? "is-active" : undefined}
              onClick={() => setCaseId(entry.id)}
            >
              {`${index + 1}. ${entry.title}`}
            </button>
          ))}
        </div>
      </div>

      <article className="playground__case" aria-labelledby="gallery-case-title">
        <h3 id="gallery-case-title">{current.title}</h3>
        <p className="playground__case-summary">{current.summary}</p>
        <Case />
        <SourcePanel source={current.source} title={current.title} />
      </article>
    </div>
  );
}
