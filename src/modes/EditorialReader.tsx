import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, TouchEvent } from "react";
import type { ReaderContent } from "../types";

type EditorialReaderProps = {
  content: ReaderContent;
  readingTimeText: string;
};

type EditorialSheet = number[][];

function paginateEditorialParagraphs(
  paragraphHeights: number[],
  availableHeight: number,
  columnCount: number
): EditorialSheet[] {
  if (paragraphHeights.length === 0) {
    return [[[]]];
  }

  if (availableHeight <= 0) {
    return [[paragraphHeights.map((_, index) => index)]];
  }

  const sheets: EditorialSheet[] = [];
  let currentSheet: EditorialSheet = Array.from({ length: columnCount }, () => []);
  let currentColumn = 0;
  let currentColumnHeight = 0;

  paragraphHeights.forEach((height, index) => {
    const fitsCurrentColumn = currentColumnHeight + height <= availableHeight;

    if (fitsCurrentColumn || currentSheet[currentColumn].length === 0) {
      currentSheet[currentColumn].push(index);
      currentColumnHeight += height;
      return;
    }

    if (currentColumn < columnCount - 1) {
      currentColumn += 1;
      currentSheet[currentColumn].push(index);
      currentColumnHeight = height;
      return;
    }

    sheets.push(currentSheet);
    currentSheet = Array.from({ length: columnCount }, () => []);
    currentColumn = 0;
    currentSheet[currentColumn].push(index);
    currentColumnHeight = height;
  });

  sheets.push(currentSheet);
  return sheets;
}

export function EditorialReader({ content, readingTimeText }: EditorialReaderProps) {
  const sourceName = content.subtitle ? `viewer --editorial ${content.subtitle}` : "viewer --editorial";
  const bodyRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [sheets, setSheets] = useState<EditorialSheet[]>([[content.body.map((_, index) => index)]]);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [columnCount, setColumnCount] = useState(1);
  const [navDirection, setNavDirection] = useState<"forward" | "backward">("forward");
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

  const goPrevious = () => {
    if (!canGoPrevious) {
      return;
    }

    setNavDirection("backward");
    setCurrentSheet((sheet) => Math.max(0, sheet - 1));
  };

  const goNext = () => {
    if (!canGoNext) {
      return;
    }

    setNavDirection("forward");
    setCurrentSheet((sheet) => Math.min(totalSheets - 1, sheet + 1));
  };

  const handleEditorialKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrevious();
      return;
    }

    if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      goNext();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setNavDirection("backward");
      setCurrentSheet(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setNavDirection("forward");
      setCurrentSheet(Math.max(0, totalSheets - 1));
    }
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

  return (
    <section
      className="calamus calamus--editorial"
      aria-label="Editorial reading mode"
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
          key={`${currentSheet}-${navDirection}`}
          className="calamus__editorial-sheet-content"
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
      <div className="calamus__editorial-nav" aria-label="Editorial sheet navigation">
        <button
          type="button"
          className="calamus__editorial-nav-button"
          onClick={goPrevious}
          disabled={!canGoPrevious}
          aria-label="Previous sheet"
        >
          ←
        </button>
        <span className="calamus__editorial-nav-status">{`Hoja ${currentSheet + 1} de ${totalSheets}`}</span>
        <button
          type="button"
          className="calamus__editorial-nav-button"
          onClick={goNext}
          disabled={!canGoNext}
          aria-label="Next sheet"
        >
          →
        </button>
      </div>
      <div ref={measureRef} className="calamus__editorial-measure" aria-hidden="true" />
    </section>
  );
}

