import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ReadingView } from "./view";
import { applyScrollAction, getScrollAction } from "../internal/keys";

/**
 * `scroll`: the whole reading in one column, and a progress bar that is
 * decorative on purpose.
 *
 * Decision 14a: the bar is `aria-hidden` and carries a text equivalent instead
 * of `role="progressbar"`, because some screen readers narrate every value
 * change and a value that moves with the scroll would talk without stopping.
 */
export function ScrollReader({ title, subtitle, body, controls, exits, announcer, readingTimeText, labels, revision }: ReadingView) {
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
        <h1 className="calamus__title">{title}</h1>
        <p className="calamus__reading-time">{readingTimeText}</p>
        {subtitle ? <p className="calamus__subtitle">{subtitle}</p> : null}
      </header>
      {controls}
      <div className="calamus__body">
        {body}
        {exits}
      </div>
      {announcer}
    </article>
  );
}
