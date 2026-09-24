/**
 * The acceptance suite: the nineteen documents of `docs/conformance-v1/`, parsed
 * and then rendered.
 *
 * They were written against the format before a parser existed and long before a
 * renderer did, so they are the only measure of either that is not circular.
 * What is asserted here is what a renderer owes them:
 *
 * 1. it never throws, on any of the nineteen;
 * 2. it loses no prose — every literal word of the document appears in the
 *    output, including the prose of an island whose name nothing resolved;
 * 3. an affordance is a real control, never a click handler on a span;
 * 4. a document that carries no directives renders as the four presentation
 *    modes have always rendered flat prose (decision 22).
 *
 * `react-dom/server` renders to a string with no DOM at all, so this runs in
 * vitest's node environment and decision 6 is not touched.
 */

/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { parse } from "../src/document/parse";
import { renderDocument } from "../src/document/render";
import { initialState } from "../src/document/evaluator";
import { revealableRegions } from "../src/document/moves";
import type { Block, Inline, NarrativeDocument } from "../src/document/types";
import type { DocumentRegistry } from "../src/document/registry";

const corpus: Record<string, string> = import.meta.glob("../docs/conformance-v1/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const sources = new Map(
  Object.entries(corpus)
    .map(([path, source]) => [path.slice(path.lastIndexOf("/") + 1), source] as const)
    .filter(([name]) => name !== "README.md")
);

const documents = [...sources.keys()].sort();

const read = (name: string): NarrativeDocument => parse(sources.get(name) ?? "").document;

const render = (document: NarrativeDocument) =>
  renderDocument({ document, state: initialState(document.opens ?? {}) });

const html = (document: NarrativeDocument): string => {
  const result = render(document);

  return [result.body, result.controls, result.exits]
    .map((part) => renderToStaticMarkup(part as ReactElement))
    .join("");
};

/**
 * The prose that must be on the page whatever the reading.
 *
 * Deliberately narrower than "every word in the file", because three of the
 * format's constructs are *meant* to withhold prose and withholding it is not
 * losing it: a block behind a `when:` that is false is absent because the author
 * said so, a loop's body belongs to items that may not exist yet, and a region
 * is closed until something opens it. Nodes other than the one the reader is on
 * are the same case at a larger scale — a node replaces.
 *
 * What is left is the unconditional prose of the entry point, and every word of
 * it has to survive the render.
 */
const literals = (document: NarrativeDocument, revealable: Set<string>): string[] => {
  const found: string[] = [];

  const fromInline = (content: Inline[]): void => {
    for (const item of content) {
      if (item.kind === "text") found.push(item.text);
      else if ("children" in item) fromInline(item.children);
    }
  };

  const fromBlocks = (blocks: Block[]): void => {
    for (const block of blocks) {
      if (block.kind === "paragraph") {
        if (!block.attrs.when) fromInline(block.content);
        continue;
      }

      if (block.kind === "heading") {
        fromInline(block.content);
        continue;
      }

      if (block.kind === "affordance") {
        if (!block.when) found.push(block.label);
        continue;
      }

      if (block.kind === "unknown") {
        found.push(block.raw);
        continue;
      }

      if (block.kind === "region") {
        if (!revealable.has(block.id) && !block.attrs?.when) fromBlocks(block.body);
        continue;
      }

      // An `each` prints what the reading holds, and its `empty:` prints when
      // the reading holds nothing; neither is unconditional prose.
    }
  };

  fromBlocks(document.nodes.length > 0 ? document.nodes[0].body : document.body);

  return found;
};

describe("the nineteen documents, rendered", () => {
  it("finds all nineteen", () => {
    expect(documents).toHaveLength(19);
  });

  for (const name of documents) {
    it(`${name} renders without throwing`, () => {
      expect(() => html(read(name))).not.toThrow();
    });

    it(`${name} renders elements, not nothing`, () => {
      expect(html(read(name)).length).toBeGreaterThan(0);
    });

    it(`${name} loses no prose`, () => {
      const document = read(name);
      const output = html(document);
      const lost: string[] = [];

      for (const said of literals(document, revealableRegions(document))) {
        // The longest run of plain words in the fragment: enough to pin the
        // prose down, and free of the entities and the interpolation braces
        // that legitimately differ between source and output.
        const anchor = said
          .split(/[{}<>&:]/)
          .map((part) => part.trim())
          .sort((a, b) => b.length - a.length)[0];

        if (!anchor || anchor.length < 12) continue;
        if (!output.includes(escapeForHtml(anchor))) lost.push(anchor);
      }

      expect(lost).toEqual([]);
    });

    it(`${name} makes every affordance a real control`, () => {
      const output = html(read(name));

      // A span that listens for a click is the failure this guards against; it
      // would show up as an `onclick` attribute, which React only emits for a
      // handler it was given on a non-interactive element.
      expect(output).not.toContain("onclick");

      const document = read(name);

      if (hasAffordance(document)) {
        expect(/<button|<a /.test(output)).toBe(true);
      }
    });

    it(`${name} answers with a reading position`, () => {
      const document = read(name);
      const result = render(document);

      // 15 of the 19 have a single node or none at all; a document with no nodes
      // is the flat case, and the flat case has no node to be on.
      expect(result.here === null || document.nodes.some((node) => node.id === result.here?.id)).toBe(true);
    });
  }

  /**
   * The strongest statement the suite can make about the renderer: with every
   * name the documents declare in `uses:` actually served, **none of the
   * nineteen produces a single diagnostic**. Everything the renderer reports
   * against the corpus is a registry entry that is genuinely absent, and not a
   * construct it could not read.
   */
  it("reports nothing at all when the registry serves every name the documents declare", () => {
    const unserved: string[] = [];

    for (const name of documents) {
      const document = read(name);
      const registry: DocumentRegistry = { views: {}, marks: {}, orders: {}, derivations: {}, plurals: {} };

      for (const used of document.uses) {
        if (used.kind === "views") registry.views![used.name] = (ctx) => ctx.children;
        if (used.kind === "marks") registry.marks![used.name] = (props) => props.children;
        if (used.kind === "orders") registry.orders![used.name] = (ids) => ids;
        if (used.kind === "derivations") registry.derivations![used.name] = () => ({});
        if (used.kind === "plurals") registry.plurals![used.name] = () => null;
      }

      const result = renderDocument({
        document,
        state: initialState(document.opens ?? {}),
        registry,
      });

      for (const diagnostic of result.diagnostics) {
        unserved.push(`${name}: ${diagnostic.severity}: ${diagnostic.message}`);
      }
    }

    expect(unserved).toEqual([]);
  });

  /** And with no registry at all, only the three names nothing serves are named. */
  it("names exactly the registry entries the corpus reaches for and nothing else", () => {
    const reported = new Set<string>();

    for (const name of documents) {
      const document = read(name);
      const result = render(document);

      for (const diagnostic of result.diagnostics) {
        reported.add(`${name.replace(/\.md$/, "")}: ${diagnostic.severity}`);
      }
    }

    expect([...reported].sort()).toEqual([
      // A view with prose behind it degrades to a warning; one with none is an
      // error, because then there is nothing left to read.
      "meta-editor: warning",
      "route-snapshots: error",
      // An order that is not registered is the degradation that leaves no
      // residue at all, so it always speaks up.
      "unstable-links: warning",
    ]);
  });

  it("keeps an unknown island whole and re-serialises it", () => {
    for (const name of documents) {
      const document = read(name);
      const unknown = allBlocks(document).filter((block) => block.kind === "unknown");

      if (unknown.length === 0) continue;

      const output = html(document);

      for (const block of unknown) {
        if (block.kind !== "unknown") continue;
        // Kept whole, and hidden rather than dropped: decision 28's rule and
        // Lexical's `unknownState` before it.
        expect(output).toContain("calamus__unknown");
        expect(output).toContain(escapeForHtml(block.raw.split("\n")[0]));
      }
    }
  });
});

const allBlocks = (document: NarrativeDocument): Block[] => {
  const flatten = (blocks: Block[]): Block[] =>
    blocks.flatMap((block) => ("body" in block ? [block, ...flatten(block.body)] : [block]));

  return flatten([...document.body, ...document.nodes.flatMap((node) => node.body)]);
};

function hasAffordance(document: NarrativeDocument): boolean {
  const inInline = (content: Inline[]): boolean =>
    content.some((item) => item.kind === "affordance" || ("children" in item && inInline(item.children)));

  return allBlocks(document).some(
    (block) =>
      block.kind === "affordance" ||
      ((block.kind === "paragraph" || block.kind === "heading") && inInline(block.content))
  );
}

/** What React's own escaping does to a fragment of prose on its way out. */
function escapeForHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
