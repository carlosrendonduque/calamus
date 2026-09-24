import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { ReaderContent, ReaderLabels } from "../types";
import { applyScrollAction, getScrollAction } from "../internal/keys";

type HypertextReaderProps = {
  content: ReaderContent;
  labels: Required<ReaderLabels>;
  children?: ReactNode;
};

export function HypertextReader({ content, labels, children }: HypertextReaderProps) {
  const label = content.subtitle
    ? `reader --hypertext ${content.subtitle}`
    : "reader --hypertext";

  const contentRef = useRef<HTMLDivElement | null>(null);
  const hasChildren = children !== undefined && children !== null;

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
        <h1 className="calamus__title">{content.title}</h1>
      </header>
      <div ref={contentRef} className="calamus__hypertext-content">
        {hasChildren ? (
          children
        ) : (
          <p className="calamus__hypertext-placeholder">no hypertext content provided</p>
        )}
      </div>
    </section>
  );
}
