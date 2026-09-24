/**
 * Decision 22, made flesh: **the flat text is the degenerate document.**
 *
 * There used to be two contracts under one prop — four modes that took
 * `{ title, subtitle?, body: string[] }` and a fifth that took `children` and
 * ignored `body` entirely. This file removes the second one by removing the
 * first: `ReaderContent` is turned into a `NarrativeDocument` with no nodes, no
 * variables and no directives, and from there every mode renders a document.
 *
 * The conversion is structural and not a parse. A host's paragraph is a string
 * the host wrote, and a colon or a brace in it is a colon or a brace: running it
 * through the document parser would silently turn `:do` in an English sentence
 * into an affordance. So each paragraph becomes one `text` inline, which is the
 * one inline kind that is never interpolated and never re-scanned.
 */

import type { Block, Inline, NarrativeDocument } from "./types";
import type { ReaderContent } from "../types";
import { parse } from "./parse";

export function emptyDocument(title = ""): NarrativeDocument {
  return {
    title,
    variables: {},
    groups: {},
    names: {},
    phrases: {},
    uses: [],
    marks: {},
    moves: {},
    controls: {},
    nodes: [],
    body: [],
  };
}

export function documentFromContent(content: ReaderContent): NarrativeDocument {
  const document = emptyDocument(content.title ?? "");

  if (content.subtitle !== undefined) {
    document.subtitle = content.subtitle;
  }

  document.body = (content.body ?? []).map(
    (paragraph): Block => ({ kind: "paragraph", attrs: {}, content: [{ kind: "text", text: paragraph }] })
  );

  return document;
}

/** The authored source, read. Diagnostics are carried, never thrown. */
export function documentFromSource(source: string): ReturnType<typeof parse> {
  return parse(source);
}

/** The words of a document, for the reading-time estimate. */
export function wordsOf(document: NarrativeDocument): string[] {
  const said: string[] = [];

  // Only literal prose is counted. An interpolation is a name until a reading
  // fills it, and counting a name as a word would make the estimate depend on
  // where the reader happens to be.
  const fromInline = (content: Inline[]): string =>
    content.map((item) => (item.kind === "text" ? item.text : "children" in item ? fromInline(item.children) : "")).join("");

  const fromBlocks = (blocks: Block[]): void => {
    for (const block of blocks) {
      if (block.kind === "paragraph" || block.kind === "heading") {
        said.push(fromInline(block.content));
      }

      if (block.kind === "affordance") said.push(block.label);
      if ("body" in block) fromBlocks(block.body);
      if (block.kind === "each" && block.empty) fromBlocks(block.empty);
    }
  };

  fromBlocks(document.body);

  for (const node of document.nodes) fromBlocks(node.body);

  return said.filter(Boolean);
}
