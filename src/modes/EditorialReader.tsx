import { useEffect, useMemo, useRef, useState } from "react";
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

  return (
    <section className="calamus calamus--editorial" aria-label="Editorial reading mode">
      <header className="calamus__head">
        <p className="calamus__mode-label">{sourceName}</p>
        <h1 className="calamus__title">{content.title}</h1>
        <p className="calamus__reading-time">{readingTimeText}</p>
      </header>

      <article
        ref={bodyRef}
        className="calamus__editorial-article calamus__editorial-sheet"
        data-current-sheet={currentSheet + 1}
        data-total-sheets={sheets.length}
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
      </article>
      <div ref={measureRef} className="calamus__editorial-measure" aria-hidden="true" />
    </section>
  );
}

