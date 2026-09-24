import { useEffect, useMemo, useRef, useState } from "react";
import { CatalogueNav } from "./gallery/CatalogueNav";
import {
  CATALOGUE_CASES,
  CATALOGUE_IDS,
  POPULATED_CATEGORIES,
  countByCategory,
  filterCases,
  groupCases,
  indexOfCase,
  type CategoryFilter
} from "./gallery/CatalogueCases";
import { caseHash, useCaseRoute } from "./gallery/CatalogueRoute";
import { SourcePanel } from "./gallery/SourcePanel";
import { CATEGORY_LABELS } from "./gallery/types";
import "./gallery/catalogue.css";

type HypertextDemoProps = {
  /** `content.body`, passed in only so the gallery can say that it is being ignored. */
  lines: string[];
};

/**
 * The children the explorer hands to `hypertext` mode: a catalogue of every
 * piece in the gallery, and below it the one piece being read, with its source.
 * The catalogue is navigation and stays small; the example is the content.
 * Nothing below the reader's header comes from the library.
 */
export function HypertextDemo({ lines }: HypertextDemoProps) {
  const [caseId, selectCase] = useCaseRoute(CATALOGUE_IDS);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  const matches = useMemo(() => filterCases(CATALOGUE_CASES, category, query), [category, query]);
  const counts = useMemo(() => countByCategory(CATALOGUE_CASES, query), [query]);
  const groups = useMemo(() => groupCases(matches), [matches]);

  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const catalogueRef = useRef<HTMLHeadingElement | null>(null);
  // Set by the controls that change the example, not by a URL change: a hash
  // arriving from the back button must not pull focus out from under anyone.
  const wantsFocus = useRef(false);

  const total = CATALOGUE_CASES.length;
  const index = Math.max(indexOfCase(caseId), 0);
  const current = CATALOGUE_CASES[index];

  useEffect(() => {
    if (!wantsFocus.current) {
      return;
    }

    wantsFocus.current = false;
    // Focusing the title both announces the change and scrolls the example in.
    titleRef.current?.focus();
  }, [caseId]);

  if (!current) {
    return <p className="playground__gallery-intro">The gallery registry is empty.</p>;
  }

  const choose = (id: string) => {
    wantsFocus.current = true;
    selectCase(id);
  };

  const step = (delta: number) => {
    const next = CATALOGUE_CASES[index + delta];

    if (next) {
      choose(next.id);
    }
  };

  const Case = current.render;
  const hash = caseHash(current.id);

  return (
    <div className="playground__gallery">
      <p className="playground__gallery-intro">
        <code>content.body</code> holds{" "}
        {`${lines.length} paragraph${lines.length === 1 ? "" : "s"}`}, and hypertext mode renders
        none of them: everything below the title is markup passed in as <code>children</code>.{" "}
        {`${total} example${total === 1 ? "" : "s"} of what that allows, in ${POPULATED_CATEGORIES} ${
          POPULATED_CATEGORIES === 1 ? "category" : "categories"
        }.`}
      </p>

      <CatalogueNav
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
        counts={counts}
        groups={groups}
        matchCount={matches.length}
        total={total}
        selectedId={current.id}
        selectedCategory={current.category}
        onSelect={choose}
        headingRef={catalogueRef}
      />

      <article className="playground__case" aria-labelledby="gallery-case-title">
        <div className="playground__case-head">
          <h3
            className="playground__case-title"
            id="gallery-case-title"
            ref={titleRef}
            tabIndex={-1}
          >
            {current.title}
          </h3>
          <p className="playground__case-meta" role="status">
            <span className="playground__sr-only">{`Showing ${current.title}. `}</span>
            {`${CATEGORY_LABELS[current.category]} · ${index + 1} of ${total}`}
          </p>
        </div>
        <p className="playground__case-summary">{current.summary}</p>

        <div className="playground__case-controls playground__case-walk">
          <button type="button" disabled={index === 0} onClick={() => step(-1)}>
            Previous example
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => step(1)}>
            Next example
          </button>
          <button type="button" onClick={() => catalogueRef.current?.focus()}>
            Back to the catalogue
          </button>
          {/* The address of this example, visible so it can be copied for a link. */}
          <a className="playground__case-link" href={hash}>
            <code>{hash}</code>
          </a>
        </div>

        <Case />
        <SourcePanel source={current.source} title={current.title} />
      </article>
    </div>
  );
}
