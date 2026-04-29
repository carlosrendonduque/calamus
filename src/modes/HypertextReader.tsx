import type { ReactNode } from "react";
import type { ReaderContent } from "../types";

type HypertextReaderProps = {
  content: ReaderContent;
  children?: ReactNode;
};

export function HypertextReader({ content, children }: HypertextReaderProps) {
  const label = content.subtitle
    ? `reader --hypertext ${content.subtitle}`
    : "reader --hypertext";

  const hasChildren = children !== undefined && children !== null;

  return (
    <section className="calamus calamus--hypertext" aria-label="Hypertext reading mode">
      <header className="calamus__head">
        <p className="calamus__mode-label">{label}</p>
        <h1 className="calamus__title">{content.title}</h1>
      </header>
      <div className="calamus__hypertext-content">
        {hasChildren ? (
          children
        ) : (
          <p className="calamus__hypertext-placeholder">no hypertext content provided</p>
        )}
      </div>
    </section>
  );
}

