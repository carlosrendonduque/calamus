import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ReaderContent, ReaderProps, ReaderTheme } from "./types";
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

function ScrollMode({ content }: { content: ReaderContent }) {
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
        {content.subtitle ? <p className="calamus__subtitle">{content.subtitle}</p> : null}
      </header>
      <div className="calamus__body">{renderParagraphs(content.body)}</div>
    </article>
  );
}

function BookMode({ content }: { content: ReaderContent }) {
  return (
    <section className="calamus calamus--book-frame" aria-label="Book reading mode">
      <div className="calamus__book-page">
        <header className="calamus__head calamus__head--book">
          <p className="calamus__mode-label">less --book</p>
          <h1 className="calamus__title">{content.title}</h1>
          {content.subtitle ? <p className="calamus__subtitle">{content.subtitle}</p> : null}
        </header>
        <article className="calamus__body">{renderParagraphs(content.body)}</article>
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
  children
}: ReaderProps) {
  const mergedStyle = {
    ...themeToCssVars(theme),
    ...style
  };

  const rootClassName = ["calamus-root", className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName} style={mergedStyle}>
      {mode === "terminal" ? <TerminalMode content={content} /> : null}
      {mode === "scroll" ? <ScrollMode content={content} /> : null}
      {mode === "book" ? <BookMode content={content} /> : null}
      {mode === "editorial" ? <EditorialReader content={content} /> : null}
      {mode === "hypertext" ? <HypertextReader content={content}>{children}</HypertextReader> : null}
    </div>
  );
}
