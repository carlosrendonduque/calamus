import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ReadingView } from "./view";
import { applyScrollAction, getScrollAction } from "../internal/keys";

/** `terminal`: the same document, with a monospaced chrome around it. */
export function TerminalReader({ title, subtitle, body, controls, exits, announcer, labels, revision }: ReadingView) {
  const sourceName = subtitle ?? "document.txt";
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
  }, [revision, title, subtitle]);

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
      <h1 className="calamus__title"># {title}</h1>
      {controls}
      {body}
      {exits}
      <footer className="calamus__eof">[EOF]</footer>
      <div className="calamus__terminal-progress" aria-hidden="true">
        <div className="calamus__terminal-progress-line">
          <div className="calamus__terminal-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="calamus__terminal-progress-value">{`(${percent}%)`}</span>
      </div>
      {/* Text equivalent of the bar above, readable on demand rather than announced on every scroll. */}
      <p className="calamus__sr-only">{labels.progress(percent)}</p>
      {announcer}
    </section>
  );
}
