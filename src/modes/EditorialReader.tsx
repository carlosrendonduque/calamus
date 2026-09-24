import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, TouchEvent } from "react";
import type { ReaderContent, ReaderLabels, ReaderTransition } from "../types";
import { paginateEditorialParagraphs, type EditorialSheet } from "../internal/pagination";
import { getPageAction } from "../internal/keys";

type EditorialReaderProps = {
  content: ReaderContent;
  readingTimeText: string;
  transition: ReaderTransition;
  labels: Required<ReaderLabels>;
};

export function EditorialReader({ content, readingTimeText, transition, labels }: EditorialReaderProps) {
  const sourceName = content.subtitle ? `viewer --editorial ${content.subtitle}` : "viewer --editorial";
  const bodyRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [sheets, setSheets] = useState<EditorialSheet[]>([[content.body.map((_, index) => index)]]);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [columnCount, setColumnCount] = useState(1);
  const [navDirection, setNavDirection] = useState<"forward" | "backward">("forward");
  const [hasTurned, setHasTurned] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchCurrentRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const bodyElement = bodyRef.current;
    const measureElement = measureRef.current;
    if (!bodyElement || !measureElement) {
      return;
    }

    const recalculateSheets = () => {
      const width = bodyElement.clientWidth;
      const availableHeight = bodyElement.clientHeight;

      if (width <= 0 || availableHeight <= 0) {
        return;
      }

      const nextColumnCount = window.matchMedia("(min-width: 768px)").matches ? 2 : 1;
      setColumnCount(nextColumnCount);

      const measuredColumnWidth =
        nextColumnCount === 2 ? (width - parseFloat(getComputedStyle(bodyElement).columnGap || "0")) / 2 : width;

      measureElement.style.width = `${Math.max(0, measuredColumnWidth)}px`;
      measureElement.innerHTML = "";

      const paragraphHeights = content.body.map((paragraph) => {
        const node = document.createElement("p");
        node.className = "calamus__paragraph";
        node.textContent = paragraph;
        measureElement.appendChild(node);

        const computed = window.getComputedStyle(node);
        const marginBottom = Number.parseFloat(computed.marginBottom) || 0;
        return node.getBoundingClientRect().height + marginBottom;
      });

      setSheets(paginateEditorialParagraphs(paragraphHeights, availableHeight, nextColumnCount));
    };

    recalculateSheets();

    const observer = new ResizeObserver(() => {
      recalculateSheets();
    });

    observer.observe(bodyElement);

    return () => {
      observer.disconnect();
    };
  }, [content.body, content.subtitle, content.title]);

  useEffect(() => {
    setCurrentSheet((prev) => Math.min(prev, Math.max(0, sheets.length - 1)));
  }, [sheets]);

  const currentColumns = useMemo(() => {
    const sheet = sheets[currentSheet] ?? Array.from({ length: columnCount }, () => []);
    return sheet.map((column) => column.map((index) => content.body[index]));
  }, [columnCount, content.body, currentSheet, sheets]);

  const totalSheets = sheets.length;
  const canGoPrevious = currentSheet > 0;
  const canGoNext = currentSheet < totalSheets - 1;

  const goToSheet = (nextSheet: number) => {
    const target = Math.min(Math.max(0, nextSheet), Math.max(0, totalSheets - 1));

    if (target === currentSheet) {
      return;
    }

    setNavDirection(target > currentSheet ? "forward" : "backward");
    setCurrentSheet(target);
    // The live region stays empty until the reader turns a sheet, so mounting and
    // re-pagination are silent and only real sheet turns are announced.
    setHasTurned(true);
  };

  const goPrevious = () => {
    goToSheet(currentSheet - 1);
  };

  const goNext = () => {
    goToSheet(currentSheet + 1);
  };

  const handleEditorialKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const action = getPageAction(event.key, event.shiftKey);
    if (!action) {
      return;
    }

    event.preventDefault();

    if (action === "previous") {
      goPrevious();
      return;
    }

    if (action === "next") {
      goNext();
      return;
    }

    goToSheet(action === "first" ? 0 : totalSheets - 1);
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchCurrentRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    touchCurrentRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    const start = touchStartRef.current;
    const current = touchCurrentRef.current;
    touchStartRef.current = null;
    touchCurrentRef.current = null;

    if (!start || !current) {
      return;
    }

    const deltaX = current.x - start.x;
    const deltaY = current.y - start.y;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);

    if (horizontalDistance < 50 || horizontalDistance <= verticalDistance) {
      return;
    }

    if (deltaX < 0) {
      goNext();
      return;
    }

    goPrevious();
  };

  const transitionClassName =
    transition === "none"
      ? "calamus__editorial-sheet-content--none"
      : transition === "slide"
        ? navDirection === "forward"
          ? "calamus__editorial-sheet-content--slide-forward"
          : "calamus__editorial-sheet-content--slide-backward"
        : "calamus__editorial-sheet-content--fade";

  const sheetStatus = labels.sheet(currentSheet + 1, totalSheets);

  return (
    <section
      className="calamus calamus--editorial"
      aria-label={labels.readingMode("editorial")}
      tabIndex={0}
      onKeyDown={handleEditorialKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <header className="calamus__head">
        <p className="calamus__mode-label">{sourceName}</p>
        <h1 className="calamus__title">{content.title}</h1>
        <p className="calamus__reading-time">{readingTimeText}</p>
      </header>

      <article
        ref={bodyRef}
        className="calamus__editorial-article calamus__editorial-sheet"
        data-current-sheet={currentSheet + 1}
        data-total-sheets={totalSheets}
      >
        <div
          key={`${currentSheet}-${transition}-${navDirection}`}
          className={`calamus__editorial-sheet-content ${transitionClassName}`}
          data-nav-direction={navDirection}
        >
          {currentColumns.map((columnParagraphs, columnIndex) => (
            <div key={columnIndex} className="calamus__editorial-column">
              {columnParagraphs.map((paragraph, paragraphIndex) => (
                <p key={`${columnIndex}-${paragraphIndex}`} className="calamus__paragraph">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      </article>
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
      <div ref={measureRef} className="calamus__editorial-measure" aria-hidden="true" />
    </section>
  );
}
