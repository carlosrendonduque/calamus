/**
 * The conformance suite: the nineteen documents in `docs/conformance-v1/`.
 *
 * They were written against the format before this parser existed, so they are
 * the only measure of it that is not circular. Each must parse with no error
 * diagnostic, and the structures below are checked against what the document
 * says rather than against what the parser happened to produce.
 */

/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { parse } from "../src/document/parse";
import type { Block, Diagnostic, NarrativeDocument } from "../src/document/types";

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

const read = (name: string): { document: NarrativeDocument; diagnostics: Diagnostic[] } =>
  parse(sources.get(name) ?? "");

const flatten = (blocks: Block[]): Block[] =>
  blocks.flatMap((block) => ("body" in block ? [block, ...flatten(block.body)] : [block]));

const allBlocks = (document: NarrativeDocument): Block[] =>
  flatten([...document.body, ...document.nodes.flatMap((node) => node.body)]);

describe("the nineteen documents of the conformance suite", () => {
  it("finds all nineteen", () => {
    expect(documents).toHaveLength(19);
  });

  for (const name of documents) {
    it(`${name} parses with no error`, () => {
      const { diagnostics } = read(name);
      expect(diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    });

    it(`${name} comes back titled, and with prose`, () => {
      const { document } = read(name);
      expect(document.title.length).toBeGreaterThan(0);
      expect(document.lang).toBe("en");
      const paragraphs = allBlocks(document).filter((block) => block.kind === "paragraph");
      expect(paragraphs.length).toBeGreaterThan(0);
    });
  }

  it("loses no island it could not read: every one is kept verbatim", () => {
    for (const name of documents) {
      const source = sources.get(name) ?? "";
      const { document } = read(name);
      for (const block of allBlocks(document)) {
        if (block.kind === "unknown") expect(source).toContain(block.raw);
      }
    }
  });
});

describe("labyrinth: six nodes, and the two gates", () => {
  const { document } = read("labyrinth.md");

  it("makes one node of each header and gives it the prose that follows", () => {
    expect(document.nodes.map((node) => node.id)).toEqual(["platform", "stairs", "kiosk", "tunnel", "office", "bridge"]);
    const platform = document.nodes[0];
    expect(platform.body).toHaveLength(2);
    expect(platform.body[0]).toMatchObject({ kind: "paragraph" });
  });

  it("reads the exits of a node in order", () => {
    expect(document.nodes[3].exits.map((exit) => exit.to)).toEqual(["office", "bridge", "stairs", "back", "start"]);
    expect(document.nodes[3].exits[0].label).toBe("Try the only door");
  });

  it("opens on a trail that already has the starting node in it", () => {
    expect(document.opens).toEqual({ trail: ["platform"] });
  });

  it("reads `visits(here)` as a count of repeats", () => {
    expect(document.names.stands).toEqual({ kind: "expression", of: { kind: "visits", node: "here" } });
  });

  it("keeps the trail's discipline: duplicates kept, the last one removable", () => {
    expect(document.groups.trail.discipline).toEqual({ keeps: "duplicates", removes: "last", marks: [] });
  });

  it("keeps the clause of a case whose braces sit in an unquoted flow scalar", () => {
    expect(document.phrases.stood.cases![1].say).toBe("You have stood here {stands} times.");
  });
});

describe("reader-path: a log that marks rather than removes", () => {
  const { document } = read("reader-path.md");

  it("declares the book's fields and its three axes of discipline", () => {
    expect(document.groups.book.fields).toEqual(["place", "struck"]);
    expect(document.groups.book.discipline).toEqual({ keeps: "duplicates", removes: "none", marks: ["struck"] });
  });

  it("reads two counts over the same group filtered two ways", () => {
    expect(document.names.standing).toEqual({
      kind: "expression",
      of: { kind: "count", group: "book", where: { kind: "not", of: { kind: "read", path: "struck" } } },
    });
    expect(document.names["crossed-out"]).toEqual({
      kind: "expression",
      of: { kind: "count", group: "book", where: { kind: "read", path: "struck" } },
    });
  });

  it("orders the cases of `lines-standing` singular first", () => {
    expect(document.phrases["lines-standing"].on).toBe("standing");
    expect(document.phrases["lines-standing"].cases).toEqual([
      { say: "1 line standing", is: 1 },
      { say: "{standing} lines standing" },
    ]);
  });

  it("gives the `each` island the paragraph between it and its `end`", () => {
    const regions = allBlocks(document).filter((block) => block.kind === "each");
    expect(regions.map((region) => (region as Extract<Block, { kind: "each" }>).group)).toEqual(["book", "places"]);
    const book = regions[0] as Extract<Block, { kind: "each" }>;
    expect(book.body).toHaveLength(1);
    expect(book.body[0]).toMatchObject({ kind: "paragraph", attrs: { mark: "withdrawn" } });
  });
});

describe("evidence-score: a phrase that sees the item it prints on", () => {
  const { document } = read("evidence-score.md");

  it("binds the phrase to the item and compares a live variable to the item's own field", () => {
    expect(document.phrases.clause.of).toBe("item");
    expect(document.phrases.clause.cases![0].when).toEqual({
      kind: "compare",
      op: ">=",
      left: { kind: "read", path: "trust" },
      right: { kind: "read", path: "item.floor" },
    });
    expect(document.phrases.clause.cases![1]).toEqual({ say: "{item.hedged}" });
  });

  it("reads the variable the dial moves, unit and all", () => {
    expect(document.variables.trust).toMatchObject({
      type: "number",
      min: 0,
      max: 100,
      default: 72,
      unit: "%",
      control: "range",
    });
  });

  it("keeps the author's field names and nothing of its own", () => {
    expect(document.groups.account.fields).toEqual(["plain", "hedged", "floor", "keep"]);
    expect(document.groups.account.items[1].floor).toBe(45);
  });
});

describe("contradiction: grouped before it is quantified", () => {
  const { document } = read("contradiction.md");

  it("reads `by` and `test` as operators over the author's own field", () => {
    expect(document.names.broken).toEqual({ kind: "grouped", over: "chosen", by: "claim", test: "split" });
  });

  it("keeps the held log unique and removable by identity", () => {
    expect(document.groups.held.discipline).toEqual({ keeps: "unique", removes: "any", marks: [] });
  });

  it("keeps a clause carrying a colon", () => {
    expect(document.phrases.verdict.cases![0].say).toBe(
      "Cannot all stand. Your selection answers {both-ways} both ways."
    );
  });
});

describe("disputed-hour: interpolation inside a region", () => {
  const { document } = read("disputed-hour.md");

  it("reads the paths the region prints", () => {
    const region = allBlocks(document).find((block) => block.kind === "each") as Extract<Block, { kind: "each" }>;
    expect(region.group).toBe("shown");
    const first = region.body[0] as Extract<Block, { kind: "paragraph" }>;
    expect(first.content[0]).toEqual({ kind: "interpolation", path: "item.time" });
    expect(first.content[2]).toEqual({ kind: "interpolation", path: "verdict" });
  });

  it("orders the tally singular first and keeps its folded clause whole", () => {
    expect(document.phrases.tally.cases![0].is).toBe(1);
    expect(document.phrases.tally.cases![0].say).toBe(
      "Showing 1 of {kept} minutes. The two logs disagree about {split} of them."
    );
  });
});

describe("document-packet: `2 of 3` needs a unique log", () => {
  const { document } = read("document-packet.md");

  it("keeps the log unique, which is what keeps decision 26 honest", () => {
    expect(document.groups.read.discipline.keeps).toBe("unique");
    expect(document.groups.read.fields).toEqual(["sheet"]);
  });

  it("puts the `when` of a `:with` on the paragraph it opens", () => {
    const paragraph = allBlocks(document).find(
      (block) => block.kind === "paragraph" && block.attrs.when !== undefined
    ) as Extract<Block, { kind: "paragraph" }>;
    expect(paragraph.attrs.when).toEqual({
      kind: "compare",
      op: "==",
      left: { kind: "read", path: "open" },
      right: { kind: "read", path: "item.id" },
    });
  });
});

describe("motif-passes: marks in the prose, named by the author", () => {
  const { document } = read("motif-passes.md");

  it("reads every mark and takes its kind from the document", () => {
    const paragraph = allBlocks(document).find((block) => block.kind === "paragraph") as Extract<
      Block,
      { kind: "paragraph" }
    >;
    const marks = paragraph.content.filter((item) => item.kind === "mark");
    expect(marks.map((mark) => (mark as Extract<(typeof marks)[number], { kind: "mark" }>).markKind)).toEqual([
      "kept",
      "struck",
      "kept",
      "struck",
    ]);
    expect(document.uses).toContainEqual({ name: "kept", kind: "marks" });
  });
});

describe("two-accounts: regions that nest", () => {
  const { document } = read("two-accounts.md");

  it("puts the two columns inside the pair that holds them", () => {
    const pair = document.body[0] as Extract<Block, { kind: "region" }>;
    expect(pair.kind).toBe("region");
    expect(pair.id).toBe("accounts");
    expect(pair.body.map((block) => block.kind)).toEqual(["each", "each"]);
    expect((pair.body[0] as Extract<Block, { kind: "each" }>).group).toBe("points");
  });
});

describe("column-lab: a surface phrase, and Sterne", () => {
  const { document } = read("column-lab.md");

  it("reads a phrase written as a single `say`", () => {
    expect(document.phrases.surface.cases).toEqual([{ say: "{cols} up, {gutter}px gutter" }]);
  });

  it("keeps the variable's unit out of the sentence and on the variable", () => {
    expect(document.variables.gutter).toMatchObject({ type: "number", default: 28, unit: "px", min: 0, max: 64 });
  });

  it("keeps the three paragraphs of the digression", () => {
    const region = document.body.find((block) => block.kind === "region") as Extract<Block, { kind: "region" }>;
    expect(region.body.filter((block) => block.kind === "paragraph")).toHaveLength(3);
  });
});
