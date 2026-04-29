import type { ReaderContent } from "../types";

function renderParagraphs(body: string[]) {
  return body.map((paragraph, index) => (
    <p key={index} className="calamus__paragraph">
      {paragraph}
    </p>
  ));
}

export function EditorialReader({ content }: { content: ReaderContent }) {
  const sourceName = content.subtitle ? `viewer --editorial ${content.subtitle}` : "viewer --editorial";

  return (
    <section className="calamus calamus--editorial" aria-label="Editorial reading mode">
      <header className="calamus__head">
        <p className="calamus__mode-label">{sourceName}</p>
        <h1 className="calamus__title">{content.title}</h1>
      </header>

      <article className="calamus__editorial-article">{renderParagraphs(content.body)}</article>
    </section>
  );
}

