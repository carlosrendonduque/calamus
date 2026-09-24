/**
 * Three gaps the parser used to drop, each one a case where the contract and the
 * renderer both hold the thing and only the parser was missing:
 *
 * 1. `Inline.affordance.item` and `.id` — the argument to a move, so one move
 *    serves many spans, and the span being left, so a return knows where to put
 *    the focus back. Without them `recover-anchor` has no working anchor at all.
 * 2. `Block.each.as` and `.current` — what the loop is presented as, and which
 *    item the reader is on. `current` is a value, so it is read.
 * 3. `VariableDef.optionLabels` as a single clause read with the option bound,
 *    which is the shape every document taking its options from a group writes.
 *
 * The first is proved end to end rather than asserted: the document is parsed,
 * rendered, pressed, reduced and rendered again, and what is checked is the
 * element tree — `react-dom` is never asked for a DOM (decision 6 is untouched).
 */

/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { parse } from "../src/document/parse";
import { renderDocument } from "../src/document/render";
import { initialState, reduce } from "../src/document/evaluator";
import { emptyGesture, type Gesture } from "../src/document/moves";
import type { Block, Inline, NarrativeDocument, ReadingState } from "../src/document/types";

const corpus: Record<string, string> = import.meta.glob("../docs/conformance-v1/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const sources = new Map(
  Object.entries(corpus).map(([path, source]) => [path.slice(path.lastIndexOf("/") + 1), source] as const)
);

const read = (name: string) => parse(sources.get(name) ?? "");

const document = (...lines: string[]) => parse(lines.join("\n"));

const warningsOf = (name: string) =>
  read(name).diagnostics.filter((diagnostic) => diagnostic.severity === "warning");

/* -------------------------------------------------------------------------- */
/* Walking the structures                                                      */
/* -------------------------------------------------------------------------- */

const everyBlock = (blocks: Block[]): Block[] =>
  blocks.flatMap((block) => [
    block,
    ...("body" in block ? everyBlock(block.body) : []),
    ...(block.kind === "each" && block.empty ? everyBlock(block.empty) : []),
  ]);

const allBlocks = (doc: NarrativeDocument): Block[] =>
  everyBlock([...doc.body, ...doc.nodes.flatMap((node) => node.body)]);

const everyInline = (content: Inline[]): Inline[] =>
  content.flatMap((item) => [item, ...("children" in item ? everyInline(item.children) : [])]);

const allInlines = (doc: NarrativeDocument): Inline[] =>
  allBlocks(doc).flatMap((block) =>
    block.kind === "paragraph" || block.kind === "heading" ? everyInline(block.content) : []
  );

/** Every React element of a rendered tree, parents before children. */
const elements = (node: ReactNode): ReactElement[] => {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement(node)) return [];
  const props = node.props as { children?: ReactNode };
  return [node, ...elements(props.children)];
};

type Props = Record<string, unknown>;
const propsOf = (element: ReactElement): Props => element.props as Props;

const withId = (tree: ReactNode, id: string): ReactElement | undefined =>
  elements(tree).find((element) => propsOf(element).id === id);

/** Every string in a rendered tree, in order: what a reader would read. */
const words = (node: ReactNode): string => {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(words).join("");
  if (!isValidElement(node)) return "";
  return words((node.props as { children?: ReactNode }).children);
};

/* -------------------------------------------------------------------------- */
/* 1. `item` and `id` on an affordance                                         */
/* -------------------------------------------------------------------------- */

describe("an affordance carries the move's argument and the span it leaves", () => {
  it("reads `item=` and `id=` off a `:do` and keeps them, with nothing to warn about", () => {
    const { document: doc, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      "The bridge :do[note 4.2]{move=down-to item=note id=anchor-mark-note} was passed.",
    );
    expect(diagnostics).toEqual([]);
    const affordances = allInlines(doc).filter((item) => item.kind === "affordance");
    expect(affordances).toHaveLength(1);
    expect(affordances[0]).toMatchObject({
      kind: "affordance",
      action: "do",
      target: "down-to",
      item: "note",
      id: "anchor-mark-note",
    });
  });

  it("keeps them on a reveal and on a navigation too, beside `focus` and `when`", () => {
    const { document: doc, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      'The corridor :go[on]{show=note-3 focus=true item=third id=mark-third when="away"} runs.',
    );
    expect(diagnostics).toEqual([]);
    const [affordance] = allInlines(doc).filter((item) => item.kind === "affordance");
    expect(affordance).toMatchObject({
      kind: "affordance",
      action: "show",
      target: "note-3",
      focus: true,
      item: "third",
      id: "mark-third",
    });
    expect((affordance as Extract<Inline, { kind: "affordance" }>).when).toEqual({
      kind: "read",
      path: "away",
    });
  });

  it("leaves an empty `item=` or `id=` off rather than carrying an empty name", () => {
    const { document: doc } = document(
      "---",
      "title: T",
      "---",
      "",
      'A span :do[here]{move=down-to item="" id=""} stands.',
    );
    const [affordance] = allInlines(doc).filter((item) => item.kind === "affordance");
    expect(affordance).not.toHaveProperty("item");
    expect(affordance).not.toHaveProperty("id");
  });

  it("gives `recover-anchor` both spans, so one move serves both anchors", () => {
    const { document: doc } = read("recover-anchor.md");
    const anchors = allInlines(doc).filter(
      (item): item is Extract<Inline, { kind: "affordance" }> => item.kind === "affordance"
    );
    expect(anchors.map((anchor) => [anchor.target, anchor.item, anchor.id])).toEqual([
      ["down-to", "note", "anchor-mark-note"],
      ["down-to", "appendix", "anchor-mark-appendix"],
    ]);
  });

  it("warns about neither of them any more", () => {
    expect(warningsOf("recover-anchor.md")).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* 2. `as` and `current` on a loop                                             */
/* -------------------------------------------------------------------------- */

describe("what a loop is presented as, and which item the reader is on", () => {
  it("keeps `as:` as the author's word and reads `current:` as a value", () => {
    const { document: doc, diagnostics } = document(
      "---",
      "title: T",
      "groups:",
      "  jumps: { fields: [way], keeps: duplicates, removes: none }",
      "---",
      "",
      "```calamus",
      "each: jumps",
      "as: apparatus",
      "current: last(jumps)",
      "```",
      "",
      "{item.way}",
      "",
      "```calamus",
      "end",
      "```",
    );
    expect(diagnostics).toEqual([]);
    const [loop] = allBlocks(doc).filter(
      (block): block is Extract<Block, { kind: "each" }> => block.kind === "each"
    );
    expect(loop.as).toBe("apparatus");
    expect(loop.current).toEqual({ kind: "last", group: "jumps" });
  });

  it("reads a `current:` that is a declared name as a read of that name", () => {
    const { document: doc, diagnostics } = document(
      "---",
      "title: T",
      "groups:",
      "  book: { fields: [place] }",
      "names:",
      "  here: last(book)",
      "---",
      "",
      "```calamus",
      "each: book",
      "as: list",
      "current: here",
      "```",
      "",
      "{item.place}",
      "",
      "```calamus",
      "end",
      "```",
    );
    expect(diagnostics).toEqual([]);
    const [loop] = allBlocks(doc).filter(
      (block): block is Extract<Block, { kind: "each" }> => block.kind === "each"
    );
    expect(loop.current).toEqual({ kind: "read", path: "here" });
  });

  it("says so when `current:` is not a value it can read, and keeps the loop", () => {
    const { document: doc, diagnostics } = document(
      "---",
      "title: T",
      "groups:",
      "  book: { fields: [place] }",
      "---",
      "",
      "```calamus",
      "each: book",
      "current:",
      "  - one",
      "  - two",
      "```",
      "",
      "{item.place}",
      "",
      "```calamus",
      "end",
      "```",
    );
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    const [loop] = allBlocks(doc).filter(
      (block): block is Extract<Block, { kind: "each" }> => block.kind === "each"
    );
    expect(loop.current).toBeUndefined();
    expect(loop.group).toBe("book");
    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("`current:`"))).toBe(true);
  });

  it("gives the four documents that write them what they wrote", () => {
    const loops = (name: string) =>
      allBlocks(read(name).document).filter(
        (block): block is Extract<Block, { kind: "each" }> => block.kind === "each"
      );

    expect(loops("ending-lens.md").map((loop) => loop.as)).toContain("list");
    expect(loops("two-accounts.md").filter((loop) => loop.as === "column")).toHaveLength(2);

    const anchors = loops("recover-anchor.md");
    expect(anchors[0].as).toBe("apparatus");
    expect(anchors[1].current).toEqual({ kind: "last", group: "jumps" });

    expect(loops("reader-path.md").some((loop) => loop.current !== undefined)).toBe(true);
    expect(loops("route-snapshots.md").some((loop) => loop.current !== undefined)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* 3. One clause read with the option bound                                    */
/* -------------------------------------------------------------------------- */

describe("the label of an option", () => {
  it("keeps the single clause the corpus writes, per document", () => {
    expect(read("ending-lens.md").document.variables.lens.optionLabels).toBe("Read {item.label}");
    expect(read("narrators.md").document.variables.voice.optionLabels).toBe("{item.who}");
    expect(read("two-accounts.md").document.variables.marked.optionLabels).toBe("{item.subject}");
  });

  it("still reads one label per option when that is what was written", () => {
    const { document: doc, diagnostics } = document(
      "---",
      "title: T",
      "variables:",
      "  lens:",
      "    type: enum",
      "    of: [haunting, grief]",
      "    default: haunting",
      "    option-label: { haunting: as haunting, grief: as grief }",
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(doc.variables.lens.optionLabels).toEqual({ haunting: "as haunting", grief: "as grief" });
  });

  it("labels an option of a group with the option's own field, and not with its id", () => {
    const doc = read("narrators.md").document;
    const declared = doc.variables.voice;
    const clause = declared.optionLabels;
    expect(typeof clause).toBe("string");

    // What the clause names, taken from the document rather than written here:
    // `{item.<field>}` over the items of the group the options come from.
    const field = String(clause).replace(/^\{item\.(.*)\}$/, "$1");
    const items = doc.groups[declared.optionsFrom ?? ""].items;
    const expected = items.map((item) => String(item[field]));
    const ids = items.map((item) => String(item.id));

    const rendered = renderDocument({ document: doc, state: initialState(doc.opens ?? {}) });
    const labels = elements(rendered.controls)
      .filter((element) => element.type === "label")
      .map((element) => words(element));

    expect(labels).toEqual(expected);
    // The consequence the gap had: the raw ids labelled the options.
    expect(labels).not.toEqual(ids);
  });
});

/* -------------------------------------------------------------------------- */
/* `recover-anchor`, end to end                                                */
/* -------------------------------------------------------------------------- */

describe("recover-anchor: the anchors resolve, one opens, and the return knows its span", () => {
  const doc = read("recover-anchor.md").document;

  const renderAt = (state: ReadingState, shown: Set<string>) => {
    let pressed: Gesture = emptyGesture();
    const result = renderDocument({
      document: doc,
      state,
      shown,
      onGesture: (gesture) => {
        pressed = gesture;
      },
    });
    return { result, gesture: () => pressed };
  };

  const press = (element: ReactElement | undefined): void => {
    const onClick = element && (propsOf(element).onClick as (() => void) | undefined);
    expect(typeof onClick).toBe("function");
    (onClick as () => void)();
  };

  const opening = initialState(doc.opens ?? {});

  it("gives each anchor span the id the document wrote on it", () => {
    const { result } = renderAt(opening, new Set());
    // `id=` is what makes these stable: without it the parser dropped the name
    // and the renderer fell back to the span's position in the walk.
    expect(withId(result.body, "calamus-anchor-mark-note")?.type).toBe("button");
    expect(withId(result.body, "calamus-anchor-mark-appendix")?.type).toBe("button");
  });

  it("resolves `show: anchor-body-{item.id}` to one region per item, all closed", () => {
    const { result } = renderAt(opening, new Set());
    for (const id of ["calamus-anchor-body-note", "calamus-anchor-body-appendix"]) {
      const item = withId(result.body, id);
      expect(item?.type).toBe("li");
      expect(propsOf(item as ReactElement).hidden).toBe(true);
    }
  });

  it("asks, on a press, for the anchor of the item the span names", () => {
    const { result, gesture } = renderAt(opening, new Set());
    press(withId(result.body, "calamus-anchor-mark-note"));

    const asked = gesture();
    // `item=note` is the argument: one `down-to` serves both spans, and this is
    // the press that proves which one it served.
    expect(asked.show).toEqual(["anchor-body-note"]);
    expect(asked.focus).toBe("anchor-body-note");
    // `id=` is the span being left, which is what the return needs.
    expect(asked.from).toBe("anchor-mark-note");
    expect(asked.moves).toEqual([
      { kind: "set", name: "away", value: "note" },
      { kind: "add", log: "jumps", entry: { way: "down", anchor: "note" } },
    ]);
    expect(asked.diagnostics).toEqual([]);
  });

  it("asks for the other anchor from the other span, on the same move", () => {
    const { result, gesture } = renderAt(opening, new Set());
    press(withId(result.body, "calamus-anchor-mark-appendix"));
    expect(gesture().show).toEqual(["anchor-body-appendix"]);
    expect(gesture().from).toBe("anchor-mark-appendix");
  });

  it("opens that anchor, and prints its prose", () => {
    const { result, gesture } = renderAt(opening, new Set());
    press(withId(result.body, "calamus-anchor-mark-note"));

    const after = gesture().moves.reduce(
      (carried, move) => reduce(carried, move, { groups: doc.groups }),
      opening
    );
    expect(after.variables.away).toBe("note");
    expect(after.logs.jumps).toHaveLength(1);

    const opened = renderAt(after, new Set(gesture().show)).result;
    const anchor = withId(opened.body, "calamus-anchor-body-note");
    expect(anchor?.type).toBe("li");
    expect(propsOf(anchor as ReactElement).hidden).toBeUndefined();
    // Its sibling stays shut: the move served one span, not the apparatus.
    expect(propsOf(withId(opened.body, "calamus-anchor-body-appendix") as ReactElement).hidden).toBe(
      true
    );

    expect(words(anchor)).toContain("The pier was gauged twice that morning");
  });

  it("fires the return, which names the span the reader left and finds it on the page", () => {
    const { result, gesture } = renderAt(opening, new Set());
    press(withId(result.body, "calamus-anchor-mark-note"));
    const after = gesture().moves.reduce(
      (carried, move) => reduce(carried, move, { groups: doc.groups }),
      opening
    );

    const away = renderAt(after, new Set(["anchor-body-note"]));
    // The first of the two controls the document declares is the return, and it
    // is only on the page because `away` was written. Its label is its prose, so
    // the label is what finds it.
    const [control] = allBlocks(doc).filter(
      (block): block is Extract<Block, { kind: "affordance" }> => block.kind === "affordance"
    );
    const back = elements(away.result.body).find(
      (element) => element.type === "button" && words(element) === control.label
    );
    expect(back).toBeDefined();
    press(back);

    const returning = away.gesture();
    // `show: "anchor-mark-{away}"` resolves to the span `id=` gave a name to,
    // and the focus goes back to it.
    expect(returning.show).toEqual(["anchor-mark-note"]);
    expect(returning.focus).toBe("anchor-mark-note");
    // And that id is on the page: the return has somewhere to put the focus.
    expect(withId(away.result.body, "calamus-anchor-mark-note")).toBeDefined();
  });

  it("marks the entry the reader is on, which is what `current:` is for", () => {
    const { result, gesture } = renderAt(opening, new Set());
    press(withId(result.body, "calamus-anchor-mark-note"));
    const after = gesture().moves.reduce(
      (carried, move) => reduce(carried, move, { groups: doc.groups }),
      opening
    );

    const opened = renderAt(after, new Set(["anchor-body-note"])).result;
    const marked = elements(opened.body).filter(
      (element) => propsOf(element)["aria-current"] === "true"
    );
    expect(marked).toHaveLength(1);
  });
});
