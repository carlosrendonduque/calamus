import { useRef } from "react";
import type { KeyboardEvent } from "react";
import type { ReadingView } from "./view";
import { applyScrollAction, getScrollAction } from "../internal/keys";

/**
 * `hypertext` used to be the odd one: it ignored `content.body` and rendered
 * `children`. After decision 22 it is the ordinary one — it renders the document
 * like the other four — and `children` becomes what it should always have been:
 * a host's own nodes, after the reading rather than instead of it.
 */
export function HypertextReader({ title, subtitle, body, controls, exits, announcer, labels, children }: ReadingView) {
  const label = subtitle ? `reader --hypertext ${subtitle}` : "reader --hypertext";
  const contentRef = useRef<HTMLDivElement | null>(null);

  const handleHypertextKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // Host children own their own keys; only scroll when the region itself has focus.
    if (event.target !== event.currentTarget) {
      return;
    }

    const element = contentRef.current;

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
    <section
      className="calamus calamus--hypertext"
      aria-label={labels.readingMode("hypertext")}
      tabIndex={0}
      onKeyDown={handleHypertextKeyDown}
    >
      <header className="calamus__head">
        <p className="calamus__mode-label">{label}</p>
        <h1 className="calamus__title">{title}</h1>
      </header>
      {controls}
      <div ref={contentRef} className="calamus__hypertext-content">
        {body}
        {exits}
        {children}
      </div>
      {announcer}
    </section>
  );
}
