import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { KeyboardEvent } from "react";
import type { ReaderContent, ReaderLabels, ReaderProps, ReaderTheme, ReaderTransition } from "./types";
import { EditorialReader } from "./modes/EditorialReader";
import { HypertextReader } from "./modes/HypertextReader";
import { renderSnapPoints, turnAnimationClassName, usePager } from "./internal/pagination";
import { getReadingTimeText } from "./internal/readingTime";
import { mergeLabels } from "./internal/labels";
import { applyScrollAction, getScrollAction } from "./internal/keys";

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
  monoFontFamily: "--calamus-mono-font",
  maxHeight: "--calamus-max-height"
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
          <h1 className="calamus__title">{content.title}</h1>
          {content.subtitle ? <p className="calamus__subtitle">{content.subtitle}</p> : null}
        </header>
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
            {renderParagraphs(content.body)}
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
