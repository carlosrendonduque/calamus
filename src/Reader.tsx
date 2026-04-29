import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { KeyboardEvent, TouchEvent } from "react";
import type { ReaderContent, ReaderProps, ReaderTheme, ReaderTransition } from "./types";
import { EditorialReader } from "./modes/EditorialReader";
import { HypertextReader } from "./modes/HypertextReader";

const THEME_TO_VAR: Record<keyof ReaderTheme, string> = {
  background: "--calamus-bg",
  foreground: "--calamus-fg",
  muted: "--calamus-muted",
  accent: "--calamus-accent",
  border: "--calamus-border",
  panel: "--calamus-panel",
  terminalBackground: "--calamus-terminal-bg",
  terminalForeground: "--calamus-terminal-fg",
  terminalMuted: "--calamus-terminal-muted",
  terminalEmphasis: "--calamus-terminal-emphasis",
  terminalEof: "--calamus-terminal-eof",
  terminalBorder: "--calamus-terminal-border",
  serifFontFamily: "--calamus-serif-font",
  monoFontFamily: "--calamus-mono-font"
};

function themeToCssVars(theme?: ReaderTheme): CSSProperties {
  if (!theme) {
    return {};
  }

  const vars: CSSProperties = {};

  for (const [key, value] of Object.entries(theme) as [keyof ReaderTheme, string][]) {
    (vars as Record<string, string>)[THEME_TO_VAR[key]] = value;
  }

  return vars;
}

function renderParagraphs(body: string[]) {
  return body.map((paragraph, index) => (
    <p key={index} className="calamus__paragraph">
      {paragraph}
    </p>
  ));
}

function getWordCount(body: string[]) {
  return body.reduce((total, paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean).length;
    return total + words;
  }, 0);
}

function getReadingTimeText(content: ReaderContent, readingTimeLabel: string) {
  const words = getWordCount(content.body);
  const minutes = Math.max(1, Math.ceil(words / 250));
  return `${minutes} ${readingTimeLabel}`;
}

function paginateParagraphs(paragraphHeights: number[], availableHeight: number): number[][] {
  if (paragraphHeights.length === 0) {
    return [[]];
  }

  if (availableHeight <= 0) {
    return [paragraphHeights.map((_, index) => index)];
  }

  const pages: number[][] = [];
  let currentPage: number[] = [];
  let currentHeight = 0;

  paragraphHeights.forEach((height, index) => {
    if (currentPage.length === 0) {
      currentPage = [index];
      currentHeight = height;
      return;
    }

    if (currentHeight + height <= availableHeight) {
      currentPage.push(index);
      currentHeight += height;
      return;
    }

    pages.push(currentPage);
    currentPage = [index];
    currentHeight = height;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function TerminalMode({ content }: { content: ReaderContent }) {
  const sourceName = content.subtitle ?? "document.txt";
  const containerRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateProgress = () => {
      const maxScrollable = element.scrollHeight - element.clientHeight;

      if (maxScrollable <= 0) {
        setProgress(0);
        return;
      }

      setProgress(Math.min(1, Math.max(0, element.scrollTop / maxScrollable)));
    };

    updateProgress();
    element.addEventListener("scroll", updateProgress, { passive: true });

    const observer = new ResizeObserver(() => {
      updateProgress();
    });

    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", updateProgress);
      observer.disconnect();
    };
  }, [content.body, content.subtitle, content.title]);

  return (
    <section
      ref={containerRef}
      className="calamus calamus--terminal"
      aria-label="Terminal reading mode"
    >
      <header className="calamus__terminal-header">$ cat {sourceName}</header>
      <h1 className="calamus__title"># {content.title}</h1>
      {renderParagraphs(content.body)}
      <footer className="calamus__eof">[EOF]</footer>
      <div className="calamus__terminal-progress" aria-hidden="true">
        <div className="calamus__terminal-progress-line">
          <div
            className="calamus__terminal-progress-fill"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <span className="calamus__terminal-progress-value">{`(${Math.round(progress * 100)}%)`}</span>
      </div>
    </section>
  );
}

function ScrollMode({
  content,
  readingTimeText
}: {
  content: ReaderContent;
  readingTimeText: string;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateProgress = () => {
      const maxScrollable = element.scrollHeight - element.clientHeight;

      if (maxScrollable <= 0) {
        setProgress(0);
        return;
      }

      setProgress(Math.min(1, Math.max(0, element.scrollTop / maxScrollable)));
    };

    updateProgress();
    element.addEventListener("scroll", updateProgress, { passive: true });

    const observer = new ResizeObserver(() => {
      updateProgress();
    });

    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", updateProgress);
      observer.disconnect();
    };
  }, [content.body, content.subtitle, content.title]);

  return (
    <article
      ref={containerRef}
      className="calamus calamus--scroll"
      aria-label="Scroll reading mode"
    >
      <div className="calamus__scroll-progress-track" aria-hidden="true">
        <div className="calamus__scroll-progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <header className="calamus__head">
        <p className="calamus__mode-label">reader --scroll</p>
        <h1 className="calamus__title">{content.title}</h1>
        <p className="calamus__reading-time">{readingTimeText}</p>
        {content.subtitle ? <p className="calamus__subtitle">{content.subtitle}</p> : null}
      </header>
      <div className="calamus__body">{renderParagraphs(content.body)}</div>
    </article>
  );
}

function BookMode({ content, transition }: { content: ReaderContent; transition: ReaderTransition }) {
  const bodyRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<number[][]>([content.body.map((_, index) => index)]);
  const [currentPage, setCurrentPage] = useState(0);
  const [navDirection, setNavDirection] = useState<"forward" | "backward">("forward");

  useEffect(() => {
    const bodyElement = bodyRef.current;
    const measureElement = measureRef.current;
    if (!bodyElement || !measureElement) {
      return;
    }

    const recalculatePagination = () => {
      const width = bodyElement.clientWidth;
      const availableHeight = bodyElement.clientHeight;

      if (width <= 0 || availableHeight <= 0) {
        return;
      }

      measureElement.style.width = `${width}px`;
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

      const nextPages = paginateParagraphs(paragraphHeights, availableHeight);
      setPages(nextPages);
    };

    recalculatePagination();

    const observer = new ResizeObserver(() => {
      recalculatePagination();
    });

    observer.observe(bodyElement);

    return () => {
      observer.disconnect();
    };
  }, [content.body, content.subtitle, content.title]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, Math.max(0, pages.length - 1)));
  }, [pages]);

  const currentPageParagraphs = useMemo(() => {
    const page = pages[currentPage] ?? [];
    return page.map((index) => content.body[index]);
  }, [content.body, currentPage, pages]);

  const totalPages = pages.length;
  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchCurrentRef = useRef<{ x: number; y: number } | null>(null);

  const goPrevious = () => {
    if (!canGoPrevious) {
      return;
    }

    setNavDirection("backward");
    setCurrentPage((page) => Math.max(0, page - 1));
  };

  const goNext = () => {
    if (!canGoNext) {
      return;
    }

    setNavDirection("forward");
    setCurrentPage((page) => Math.min(totalPages - 1, page + 1));
  };

  const handleBookKeyDown = (event: KeyboardEvent<HTMLElement>) => {
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
      setCurrentPage(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setNavDirection("forward");
      setCurrentPage(Math.max(0, totalPages - 1));
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

  const transitionClassName =
    transition === "none"
      ? "calamus__book-page-content--none"
      : transition === "slide"
        ? navDirection === "forward"
          ? "calamus__book-page-content--slide-forward"
          : "calamus__book-page-content--slide-backward"
        : "calamus__book-page-content--fade";

  return (
    <section
      className="calamus calamus--book-frame"
      aria-label="Book reading mode"
      tabIndex={0}
      onKeyDown={handleBookKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="calamus__book-page">
        <header className="calamus__head calamus__head--book">
          <p className="calamus__mode-label">less --book</p>
          <h1 className="calamus__title">{content.title}</h1>
          {content.subtitle ? <p className="calamus__subtitle">{content.subtitle}</p> : null}
        </header>
        <article
          ref={bodyRef}
          className="calamus__body calamus__book-body"
          data-current-page={currentPage + 1}
          data-total-pages={totalPages}
        >
          <div
            key={`${currentPage}-${transition}-${navDirection}`}
            className={`calamus__book-page-content ${transitionClassName}`}
          >
            {renderParagraphs(currentPageParagraphs)}
          </div>
        </article>
        <div className="calamus__book-nav" aria-label="Book page navigation">
          <button
            type="button"
            className="calamus__book-nav-button"
            onClick={goPrevious}
            disabled={!canGoPrevious}
            aria-label="Previous page"
          >
            ←
          </button>
          <span className="calamus__book-nav-status">{`Pagina ${currentPage + 1} de ${totalPages}`}</span>
          <button
            type="button"
            className="calamus__book-nav-button"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label="Next page"
          >
            →
          </button>
        </div>
        <div ref={measureRef} className="calamus__book-measure" aria-hidden="true" />
      </div>
    </section>
  );
}

export function Reader({
  content,
  mode = "scroll",
  theme,
  className,
  style,
  children,
  readingTimeLabel = "min de lectura",
  transition = "fade"
}: ReaderProps) {
  const mergedStyle = {
    ...themeToCssVars(theme),
    ...style
  };

  const rootClassName = ["calamus-root", className].filter(Boolean).join(" ");
  const readingTimeText = getReadingTimeText(content, readingTimeLabel);

  return (
    <div className={rootClassName} style={mergedStyle}>
      {mode === "terminal" ? <TerminalMode content={content} /> : null}
      {mode === "scroll" ? <ScrollMode content={content} readingTimeText={readingTimeText} /> : null}
      {mode === "book" ? <BookMode content={content} transition={transition} /> : null}
      {mode === "editorial" ? (
        <EditorialReader content={content} readingTimeText={readingTimeText} />
      ) : null}
      {mode === "hypertext" ? <HypertextReader content={content}>{children}</HypertextReader> : null}
    </div>
  );
}
