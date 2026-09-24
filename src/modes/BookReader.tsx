import { useMemo } from "react";
import type { ReadingView } from "./view";
import { renderSnapPoints, turnAnimationClassName, usePager } from "../internal/pagination";

/**
 * `book`: one column, paginated.
 *
 * What makes this able to hold a document rather than a list of strings is
 * decision 32: the flow renders its children into a multi-column scrollport and
 * nothing is measured per block, so a region that opens in the middle of a
 * chapter, a loop that grows, a control and a slot all paginate the same way a
 * paragraph does. `usePager` is handed the revision so a reveal re-measures.
 */
export function BookReader({ title, subtitle, body, controls, exits, announcer, transition, labels, revision }: ReadingView) {
  const pager = usePager(transition, revision);
  const {
    pagerRef,
    flowRef,
    totalPages,
    currentPage,
    direction,
    hasTurned,
    turnTick,
    goPrevious,
    goNext,
    handleKeyDown
  } = pager;

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;
  const pageStatus = labels.page(currentPage + 1, totalPages);
  const snapPoints = useMemo(() => renderSnapPoints(totalPages), [totalPages]);

  return (
    <section
      className="calamus calamus--book-frame"
      aria-label={labels.readingMode("book")}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="calamus__book-page">
        <header className="calamus__head calamus__head--book">
          <p className="calamus__mode-label">less --book</p>
          <h1 className="calamus__title">{title}</h1>
          {subtitle ? <p className="calamus__subtitle">{subtitle}</p> : null}
        </header>
        {controls}
        {/*
          The page is a window one page wide over a flow that holds the whole
          chapter. CSS columns decide where the breaks fall, the window scrolls
          and snaps to them, and the only thing JavaScript measures is how many
          windows wide the flow turned out to be.
        */}
        <div
          ref={pagerRef}
          className="calamus__body calamus__book-body calamus__pager"
          data-current-page={currentPage + 1}
          data-total-pages={totalPages}
          data-nav-direction={direction}
        >
          <div
            ref={flowRef}
            className={`calamus__pager-flow calamus__book-page-content ${turnAnimationClassName(
              transition,
              turnTick,
              "calamus__book-page-content"
            )}`}
          >
            {body}
            {exits}
          </div>
          {snapPoints}
        </div>
        <div className="calamus__book-nav" role="group" aria-label={labels.pageNavigation}>
          <button
            type="button"
            className="calamus__book-nav-button"
            onClick={goPrevious}
            disabled={!canGoPrevious}
            aria-label={labels.previousPage}
          >
            ←
          </button>
          <span className="calamus__book-nav-status">{pageStatus}</span>
          <span className="calamus__sr-only" role="status" aria-live="polite">
            {hasTurned ? pageStatus : ""}
          </span>
          <button
            type="button"
            className="calamus__book-nav-button"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label={labels.nextPage}
          >
            →
          </button>
        </div>
        {announcer}
      </div>
    </section>
  );
}
