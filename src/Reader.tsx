import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { KeyboardEvent, TouchEvent } from "react";
import type { ReaderContent, ReaderLabels, ReaderProps, ReaderTheme, ReaderTransition } from "./types";
import { EditorialReader } from "./modes/EditorialReader";
import { HypertextReader } from "./modes/HypertextReader";
import { paginateParagraphs } from "./internal/pagination";
import { getReadingTimeText } from "./internal/readingTime";
import { mergeLabels } from "./internal/labels";
import { applyScrollAction, getPageAction, getScrollAction } from "./internal/keys";

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

function TerminalMode({ content, labels }: { content: ReaderContent; labels: Required<ReaderLabels> }) {
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

  const handleTerminalKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const action = getScrollAction(event.key, event.shiftKey);
    if (!action) {
      return;
    }

    event.preventDefault();
    applyScrollAction(element, action);
  };

  const percent = Math.round(progress * 100);

  return (
    <section
      ref={containerRef}
      className="calamus calamus--terminal"
      aria-label={labels.readingMode("terminal")}
      tabIndex={0}
      onKeyDown={handleTerminalKeyDown}
    >
      <header className="calamus__terminal-header">$ cat {sourceName}</header>
      <h1 className="calamus__title"># {content.title}</h1>
      {renderParagraphs(content.body)}
      <footer className="calamus__eof">[EOF]</footer>
      <div className="calamus__terminal-progress" aria-hidden="true">
        <div className="calamus__terminal-progress-line">
          <div
            className="calamus__terminal-progress-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="calamus__terminal-progress-value">{`(${percent}%)`}</span>
      </div>
      {/* Text equivalent of the bar above, readable on demand rather than announced on every scroll. */}
      <p className="calamus__sr-only">{labels.progress(percent)}</p>
    </section>
  );
}

function ScrollMode({
  content,
  readingTimeText,
  labels
}: {
  content: ReaderContent;
  readingTimeText: string;
  labels: Required<ReaderLabels>;
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

  const handleScrollKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const action = getScrollAction(event.key, event.shiftKey);
    if (!action) {
      return;
    }

    event.preventDefault();
    applyScrollAction(element, action);
  };

  return (
    <article
      ref={containerRef}
      className="calamus calamus--scroll"
      aria-label={labels.readingMode("scroll")}
      tabIndex={0}
      onKeyDown={handleScrollKeyDown}
    >
      <div className="calamus__scroll-progress-track" aria-hidden="true">
        <div className="calamus__scroll-progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      {/* Text equivalent of the bar above, readable on demand rather than announced on every scroll. */}
      <p className="calamus__sr-only">{labels.progress(Math.round(progress * 100))}</p>
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

function BookMode({
  content,
  transition,
  labels
}: {
  content: ReaderContent;
  transition: ReaderTransition;
  labels: Required<ReaderLabels>;
}) {
  const bodyRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<number[][]>([content.body.map((_, index) => index)]);
  const [currentPage, setCurrentPage] = useState(0);
  const [navDirection, setNavDirection] = useState<"forward" | "backward">("forward");
  const [hasTurned, setHasTurned] = useState(false);

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

  const goToPage = (nextPage: number) => {
    const target = Math.min(Math.max(0, nextPage), Math.max(0, totalPages - 1));

    if (target === currentPage) {
      return;
    }

    setNavDirection(target > currentPage ? "forward" : "backward");
    setCurrentPage(target);
    // The live region stays empty until the reader turns a page, so mounting and
    // re-pagination are silent and only real page turns are announced.
    setHasTurned(true);
  };

  const goPrevious = () => {
    goToPage(currentPage - 1);
  };

  const goNext = () => {
    goToPage(currentPage + 1);
  };

  const handleBookKeyDown = (event: KeyboardEvent<HTMLElement>) => {
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

    goToPage(action === "first" ? 0 : totalPages - 1);
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

  const pageStatus = labels.page(currentPage + 1, totalPages);

  return (
    <section
      className="calamus calamus--book-frame"
      aria-label={labels.readingMode("book")}
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
  labels,
  lang,
  transition = "fade"
}: ReaderProps) {
  const mergedStyle = {
    ...themeToCssVars(theme),
    ...style
  };

  const rootClassName = ["calamus-root", className].filter(Boolean).join(" ");
  const mergedLabels = mergeLabels(labels);
  const readingTimeText = getReadingTimeText(content, mergedLabels.readingTime);

  return (
    <div className={rootClassName} style={mergedStyle} lang={lang}>
      {mode === "terminal" ? <TerminalMode content={content} labels={mergedLabels} /> : null}
      {mode === "scroll" ? (
        <ScrollMode content={content} readingTimeText={readingTimeText} labels={mergedLabels} />
      ) : null}
      {mode === "book" ? <BookMode content={content} transition={transition} labels={mergedLabels} /> : null}
      {mode === "editorial" ? (
        <EditorialReader
          content={content}
          readingTimeText={readingTimeText}
          transition={transition}
          labels={mergedLabels}
        />
      ) : null}
      {mode === "hypertext" ? (
        <HypertextReader content={content} labels={mergedLabels}>
          {children}
        </HypertextReader>
      ) : null}
    </div>
  );
}
