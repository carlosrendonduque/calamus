import { useMemo } from "react";
import type { ReaderContent, ReaderLabels, ReaderTransition } from "../types";
import { renderSnapPoints, turnAnimationClassName, usePager } from "../internal/pagination";

type EditorialReaderProps = {
  content: ReaderContent;
  readingTimeText: string;
  transition: ReaderTransition;
  labels: Required<ReaderLabels>;
};

/**
 * `editorial` is `book` with more than one column on the sheet, and that is now
 * the whole difference. The count lives in `--calamus-editorial-columns`, which
 * an `@container` rule sets and `column-count` consumes; nothing in JavaScript
 * reads it any more, because nothing in JavaScript needs it. Decision 29 fixed a
 * paginator that disagreed with the grid it was filling by making the stylesheet
 * the single source of truth for the count; this removes the second reader of
 * that truth altogether, so there is no longer anything to disagree.
 *
 * Do not put a column count back into this file. The sheet count comes out of
 * `scrollWidth / clientWidth`, which already has the columns folded into it: a
 * sheet is a scrollport wide whether it holds one column or four.
 */
export function EditorialReader({ content, readingTimeText, transition, labels }: EditorialReaderProps) {
  const sourceName = content.subtitle ? `viewer --editorial ${content.subtitle}` : "viewer --editorial";
  const pager = usePager(transition, content.body);
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
  const sheetStatus = labels.sheet(currentPage + 1, totalPages);
  const snapPoints = useMemo(() => renderSnapPoints(totalPages), [totalPages]);

  return (
    <section
      className="calamus calamus--editorial"
      aria-label={labels.readingMode("editorial")}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <header className="calamus__head">
        <p className="calamus__mode-label">{sourceName}</p>
        <h1 className="calamus__title">{content.title}</h1>
        <p className="calamus__reading-time">{readingTimeText}</p>
      </header>

      <div
        ref={pagerRef}
        className="calamus__editorial-article calamus__editorial-sheet calamus__pager"
        data-current-sheet={currentPage + 1}
        data-total-sheets={totalPages}
        data-nav-direction={direction}
      >
        <div
          ref={flowRef}
          className={`calamus__pager-flow calamus__editorial-sheet-content ${turnAnimationClassName(
            transition,
            turnTick,
            "calamus__editorial-sheet-content"
          )}`}
        >
          {content.body.map((paragraph, index) => (
            <p key={index} className="calamus__paragraph">
              {paragraph}
            </p>
          ))}
        </div>
        {snapPoints}
      </div>
      <div className="calamus__editorial-nav" role="group" aria-label={labels.sheetNavigation}>
        <button
          type="button"
          className="calamus__editorial-nav-button"
          onClick={goPrevious}
          disabled={!canGoPrevious}
          aria-label={labels.previousSheet}
        >
          ←
        </button>
        <span className="calamus__editorial-nav-status">{sheetStatus}</span>
        <span className="calamus__sr-only" role="status" aria-live="polite">
          {hasTurned ? sheetStatus : ""}
        </span>
        <button
          type="button"
          className="calamus__editorial-nav-button"
          onClick={goNext}
          disabled={!canGoNext}
          aria-label={labels.nextSheet}
        >
          →
        </button>
      </div>
    </section>
  );
}
