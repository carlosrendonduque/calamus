/**
 * The renderer, as data.
 *
 * Everything asserted here is a decision the renderer makes about a block, an
 * inline or a gesture, and every one of them is checkable without a DOM: the
 * render is a pure function of a document and a reading state, and what it
 * returns is a tree of React elements that can be walked as an object
 * (decision 6 — no jsdom, and none added).
 *
 * The one thing these tests deliberately do not cover is anything that needs
 * layout: focus movement, pagination, the announcer's timing in a live tree.
 * Those are listed as the gap they are.
 */

import { describe, expect, it } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { isValidElement } from "react";
import { parse } from "../src/document/parse";
import { renderDocument } from "../src/document/render";
import type { RenderResult } from "../src/document/render";
import { documentFromContent, emptyDocument, wordsOf } from "../src/document/content";
import { emptyState, initialState, reduce } from "../src/document/evaluator";
import type { Gesture } from "../src/document/moves";
import { openingValues, resetOf, revealableRegions } from "../src/document/moves";
import { DEGRADATION, isPermutation, missingEntries } from "../src/document/registry";
import { decodeText, plainText } from "../src/document/text";
import { createScope } from "../src/document/evaluator";
import { createHolder } from "../src/document/hold";
import type { NarrativeDocument, ReadingState } from "../src/document/types";

/* -------------------------------------------------------------------------- */
/* Walking a tree of elements without a DOM                                    */
/* -------------------------------------------------------------------------- */

type Element = ReactElement<Record<string, unknown>>;

function elements(node: ReactNode): Element[] {
  const found: Element[] = [];

  const walk = (value: ReactNode): void => {
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry as ReactNode);
      return;
    }

    if (!isValidElement(value)) return;

    found.push(value as Element);
    walk((value.props as { children?: ReactNode }).children);
  };

  walk(node);
  return found;
}

function textIn(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((entry) => textIn(entry as ReactNode)).join("");
  if (isValidElement(node)) return textIn((node.props as { children?: ReactNode }).children);
  return "";
}

const tagged = (node: ReactNode, tag: string): Element[] =>
  elements(node).filter((element) => element.type === tag);

const withClass = (node: ReactNode, className: string): Element[] =>
  elements(node).filter((element) => String(element.props.className ?? "").split(" ").includes(className));

/* -------------------------------------------------------------------------- */
/* Rendering one source                                                        */
/* -------------------------------------------------------------------------- */

type Press = { gestures: Gesture[]; result: RenderResult; document: NarrativeDocument; state: ReadingState };

function read(source: string, state?: ReadingState, extra: Record<string, unknown> = {}): Press {
  const { document } = parse(source);
  const gestures: Gesture[] = [];
  const reading = state ?? initialState(document.opens ?? {});

  const result = renderDocument({
    document,
    state: reading,
    onGesture: (gesture) => gestures.push(gesture),
    ...extra,
  });

  return { gestures, result, document, state: reading };
}

/** Press the first control whose visible words contain `words`. */
function press(node: ReactNode, words: string): void {
  const control = elements(node).find(
    (element) =>
      (element.type === "button" || element.type === "a") && textIn(element).includes(words)
  );

  if (!control) {
    throw new Error(`no control reads "${words}"`);
  }

  (control.props.onClick as (event: { preventDefault: () => void }) => void)({
    preventDefault: () => undefined,
  });
}

const frontMatter = (body: string, matter = "title: A\nlang: en\n"): string => `---\n${matter}---\n\n${body}\n`;

/* -------------------------------------------------------------------------- */
/* Blocks                                                                      */
/* -------------------------------------------------------------------------- */

describe("blocks become elements", () => {
  it("a paragraph is a paragraph, and its `:with` travels as data", () => {
    const { result } = read(frontMatter(`:with{lang=fr role=caption voice=clerk}\nUn coup de dés.`));
    const [paragraph] = tagged(result.body, "p");

    expect(paragraph.props.lang).toBe("fr");
    // `role` and `voice` are names the author chose, so they are data and never
    // an ARIA role: an authored word in `role=` either invents an invalid role
    // or lands on a real one and changes what the paragraph means.
    expect(paragraph.props["data-role"]).toBe("caption");
    expect(paragraph.props["data-voice"]).toBe("clerk");
    expect(paragraph.props.role).toBeUndefined();
    expect(textIn(paragraph)).toBe("Un coup de dés.");
  });

  it("a heading is the level below the mode's title", () => {
    const { result } = read(frontMatter(`## A section\n\nProse.`));

    expect(tagged(result.body, "h3")).toHaveLength(1);
    expect(tagged(result.body, "h1")).toHaveLength(0);
  });

  it("a blank measure is an element with a count, not a margin", () => {
    const { result } = read(frontMatter(`:blank[3]`));
    const [blank] = withClass(result.body, "calamus__blank");

    expect(blank.props["aria-hidden"]).toBe("true");
    expect((blank.props.style as Record<string, string>)["--calamus-blank-lines"]).toBe("3");
  });

  it("an unknown island is kept whole and hidden, never dropped", () => {
    const { result, document } = read(frontMatter("Prose.\n\n```calamus\nnonsense: 3\nmore: keys\n```\n"));
    const [kept] = withClass(result.body, "calamus__unknown");

    expect(document.body.some((block) => block.kind === "unknown")).toBe(true);
    expect(kept.props.hidden).toBe(true);
    expect(textIn(kept)).toContain("nonsense: 3");
    expect(textIn(kept)).toContain("more: keys");
  });
});

describe("`when` gates a block, and an unreadable gate shows it", () => {
  const source = frontMatter(
    `:with{when="open"}\nThe visible line.\n\n:with{when="not open"}\nThe hidden line.\n`,
    "title: A\nlang: en\nvariables:\n  open: { type: boolean, default: true }\n"
  );

  it("prints what the condition allows", () => {
    const { result } = read(source);

    expect(textIn(result.body)).toContain("The visible line.");
    expect(textIn(result.body)).not.toContain("The hidden line.");
  });

  it("follows the state rather than the declaration", () => {
    const { document } = parse(source);
    const state = reduce(initialState(), { kind: "set", name: "open", value: false });
    const result = renderDocument({ document, state });

    expect(textIn(result.body)).toContain("The hidden line.");
  });

  it("shows a block whose condition cannot be read at all", () => {
    const { result } = read(frontMatter(`:with{when="nobody-declared-this"}\nStill readable.`));

    // Decision 28: an expression that does not evaluate shows its fragment
    // rather than hiding it. Hiding on a mistake silently deletes prose.
    expect(textIn(result.body)).toContain("Still readable.");
  });
});

/* -------------------------------------------------------------------------- */
/* Inline                                                                      */
/* -------------------------------------------------------------------------- */

describe("inline content", () => {
  it("fills an interpolation from the reading, not the declaration", () => {
    const source = frontMatter(
      `Kept: {held}.`,
      "title: A\nlang: en\nvariables:\n  held: { type: number, default: 2 }\n"
    );
    const { document } = parse(source);
    const state = reduce(initialState(), { kind: "set", name: "held", value: 7 });

    expect(textIn(renderDocument({ document, state }).body)).toContain("Kept: 7.");
  });

  it("leaves a name that does not resolve standing in its braces", () => {
    const { result } = read(frontMatter(`Kept: {nothing-declares-this}.`));

    expect(textIn(result.body)).toContain("{nothing-declares-this}");
  });

  it("escapes reader-written text exactly once", () => {
    // `interpolate` escapes for an HTML text position because the deliverable
    // is a compiler (decision 25); React escapes for itself. Both would give
    // `&amp;lt;`, which is the bug this guards.
    const source = frontMatter(
      `They wrote {note}.`,
      "title: A\nlang: en\nvariables:\n  note: { type: string, default: \"\" }\n"
    );
    const { document } = parse(source);
    const state = reduce(initialState(), {
      kind: "set",
      name: "note",
      value: "<script>alert(1)</script> & co",
    });

    const said = textIn(renderDocument({ document, state }).body);

    expect(said).toContain("<script>alert(1)</script> & co");
    expect(said).not.toContain("&amp;");
    expect(said).not.toContain("&lt;");
  });

  it("never scans the result of an interpolation again", () => {
    const source = frontMatter(
      `{note}`,
      "title: A\nlang: en\nvariables:\n  note: { type: string, default: \"\" }\n  other: { type: string, default: secret }\n"
    );
    const { document } = parse(source);
    const state = reduce(initialState(), { kind: "set", name: "note", value: "{other}" });

    expect(textIn(renderDocument({ document, state }).body)).toBe("{other}");
  });

  it("undoes exactly the escape `escapeText` makes, and no more", () => {
    expect(decodeText("&amp;lt;")).toBe("&lt;");
    expect(decodeText("&lt;p&gt;")).toBe("<p>");
    expect(decodeText("&quot;")).toBe("&quot;");
  });

  it("keeps a mark's words when nothing is registered for its kind", () => {
    const source = frontMatter(
      `The inventory lists :mark[a door]{kind=kept} on the landing.`,
      "title: A\nlang: en\nmarks:\n  kept: { note: A thing kept }\n"
    );
    const { result } = read(source);
    const [mark] = withClass(result.body, "calamus__mark");

    expect(textIn(result.body)).toBe("The inventory lists a door on the landing.");
    // The kind is the author's word, so it travels as data.
    expect(mark.props["data-mark"]).toBe("kept");
    // And the author's accessible note survives the missing entry.
    expect(mark.props.title).toBe("A thing kept");
  });
});

/* -------------------------------------------------------------------------- */
/* Affordances                                                                 */
/* -------------------------------------------------------------------------- */

describe("affordances are real controls", () => {
  const revealing = frontMatter(
    `The corridor :go[goes on]{show=note-3 focus=true} to the end.\n\n\`\`\`calamus\nregion: note-3\n\`\`\`\n\nWhat unfolds.\n\n\`\`\`calamus\nend\n\`\`\`\n`
  );

  it("a reveal is a button, with the state of what it controls", () => {
    const { result } = read(revealing);
    const [button] = tagged(result.body, "button");

    expect(button.props.type).toBe("button");
    expect(button.props["aria-expanded"]).toBe(false);
    expect(String(button.props["aria-controls"])).toContain("note-3");
    // Never a span with a handler.
    expect(withClass(result.body, "calamus__affordance").every((element) => element.type !== "span" || element.props.onClick === undefined)).toBe(true);
  });

  it("a reveal asks for the region and for the focus", () => {
    const { result, gestures } = read(revealing);

    press(result.body, "goes on");

    expect(gestures).toHaveLength(1);
    expect(gestures[0].show).toEqual(["note-3"]);
    expect(gestures[0].focus).toBe("note-3");
    expect(gestures[0].moves).toEqual([]);
  });

  it("a second press closes what the first opened", () => {
    const { result, gestures } = read(revealing, undefined, { shown: new Set(["note-3"]) });

    press(result.body, "goes on");

    expect(gestures[0].hide).toEqual(["note-3"]);
    expect(gestures[0].show).toEqual([]);
  });

  it("a region starts closed only when something can open it", () => {
    const opened = read(frontMatter("```calamus\nregion: orphan\n```\n\nNothing opens this.\n\n```calamus\nend\n```\n"));
    const [region] = withClass(opened.result.body, "calamus__region");

    // A region nothing names would take its prose out of the reading and never
    // give it back, which decision 28 does not allow.
    expect(region.props.hidden).toBeUndefined();
    expect(textIn(opened.result.body)).toContain("Nothing opens this.");

    const { result } = read(revealing);
    const [closed] = withClass(result.body, "calamus__region");

    expect(closed.props.hidden).toBe(true);
  });

  it("`revealableRegions` finds what prose and declared moves can open", () => {
    const { document } = parse(revealing);

    expect([...revealableRegions(document)]).toEqual(["note-3"]);
  });

  it("a navigation is a link with a real target", () => {
    const source = `---\ntitle: A\nlang: en\n---\n\n\`\`\`calamus\nnode: hall\nexits:\n  - { to: yard, label: Out to the yard }\n\`\`\`\n\nThe hall.\n\n\`\`\`calamus\nnode: yard\n\`\`\`\n\nThe yard.\n`;
    const { result, gestures } = read(source);
    const [link] = tagged(result.exits, "a");

    expect(link.props.href).toContain("yard");

    press(result.exits, "Out to the yard");

    expect(gestures[0].moves).toEqual([{ kind: "enter", node: "yard" }]);
  });

  it("an affordance behind a false condition keeps its words and loses its button", () => {
    const source = frontMatter(
      `The corridor :go[goes on]{show=x when="open"} to the end.`,
      "title: A\nlang: en\nvariables:\n  open: { type: boolean, default: false }\n"
    );
    const { result } = read(source);

    expect(textIn(result.body)).toContain("goes on");
    expect(tagged(result.body, "button")).toHaveLength(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Declared moves                                                              */
/* -------------------------------------------------------------------------- */

describe("a declared move becomes moves the reducer knows", () => {
  const redaction = `---
title: A
lang: en
variables:
  inside: { type: boolean, default: false }
marks:
  withheld: { as: cover }
moves:
  show-inside:
    writes: [inside]
    sets: { inside: toggle }
    to: toggle
    note: "{inside-label}"
phrases:
  inside-label:
    on: inside
    cases:
      - { is: true, say: Hide these words again }
      - { say: Reveal the redacted words }
---

The door was locked from :mark[:do[the inside]{move=show-inside}]{kind=withheld}.
`;

  it("`sets: { x: toggle }` flips the value rather than writing the word", () => {
    const { result, gestures } = read(redaction);

    press(result.body, "the inside");

    expect(gestures[0].moves).toEqual([{ kind: "set", name: "inside", value: true }]);
  });

  it("takes its accessible name and its pressed state from the author", () => {
    const { result } = read(redaction);
    const [button] = tagged(result.body, "button");

    expect(button.props["aria-label"]).toBe("Reveal the redacted words");
    expect(button.props["aria-pressed"]).toBe(false);

    const { document } = parse(redaction);
    const after = reduce(initialState(), { kind: "set", name: "inside", value: true });
    const [pressed] = tagged(renderDocument({ document, state: after }).body, "button");

    expect(pressed.props["aria-label"]).toBe("Hide these words again");
    expect(pressed.props["aria-pressed"]).toBe(true);
  });

  it("a move that is not a toggle reports no pressed state at all", () => {
    const source = `---
title: A
lang: en
groups:
  taken: { fields: [name], keeps: duplicates, removes: none }
moves:
  go-by:
    writes: [taken]
    logs: { taken: { name: the hedge } }
---

:do[Go by the hedge]{move=go-by}
`;
    const { result } = read(source);
    const [button] = tagged(result.body, "button");

    expect(button.props["aria-pressed"]).toBeUndefined();
  });

  it("grows a log, with the item of the loop bound", () => {
    const source = `---
title: A
lang: en
groups:
  turns:
    fields: [name]
    items:
      - { id: hedge, name: the gap in the hedge }
      - { id: pump, name: the pump house }
  taken: { fields: [name], keeps: duplicates, removes: none }
moves:
  go-by:
    writes: [taken]
    logs: { taken: { name: "{item.name}" } }
---

\`\`\`calamus
each: turns
\`\`\`

:do[Go by {item.name}]{move=go-by}

\`\`\`calamus
end
\`\`\`
`;
    const { result, gestures, document } = read(source);

    press(result.body, "the pump house");

    expect(gestures[0].moves).toEqual([{ kind: "add", log: "taken", entry: { name: "the pump house" } }]);

    const after = reduce(initialState(), gestures[0].moves[0], { groups: document.groups });

    expect(after.logs.taken).toEqual([{ name: "the pump house" }]);
  });

  it("names a move nothing declares without throwing, and without writing", () => {
    const { result, gestures } = read(frontMatter(`:do[Press]{move=nothing-declares-this}`));

    press(result.body, "Press");

    // The press is heard and changes nothing: an empty gesture, with the reason
    // written down. `useReading` drops it before it reaches the reducer.
    expect(gestures[0].moves).toEqual([]);
    expect(gestures[0].show).toEqual([]);
    expect(result.diagnostics.map((entry) => entry.message).join("\n")).toContain(
      "nothing-declares-this"
    );
  });
});

describe("resets return a name to what it opened on", () => {
  const source = `---
title: A
lang: en
variables:
  depth: { type: number, default: 2 }
groups:
  chain: { fields: [note], keeps: duplicates, removes: last }
opens:
  logs:
    chain: [{ note: n1 }]
---

Prose.
`;

  it("reads the opening values out of the declaration and the `opens:`", () => {
    const { document } = parse(source);
    const opening = openingValues(document);

    expect(opening.variables.depth).toBe(2);
    expect(opening.logs.chain).toEqual([{ note: "n1" }]);
  });

  it("builds one reset that names its destination", () => {
    const { document } = parse(source);

    expect(resetOf(["chain", "depth"], document)).toEqual({
      kind: "reset",
      variables: { depth: 2 },
      logs: { chain: [{ note: "n1" }] },
    });
  });

  it("puts the reading back where it opened", () => {
    const { document } = parse(source);
    const opened = initialState(document.opens ?? {});
    const moved = reduce(
      reduce(opened, { kind: "set", name: "depth", value: 9 }),
      { kind: "add", log: "chain", entry: { note: "n2" } },
      { groups: document.groups }
    );

    expect(moved.variables.depth).toBe(9);
    expect(moved.logs.chain).toHaveLength(2);

    const back = reduce(moved, resetOf(["chain", "depth"], document));

    expect(back.variables.depth).toBe(2);
    expect(back.logs.chain).toEqual(opened.logs.chain);
  });
});

/* -------------------------------------------------------------------------- */
/* Loops                                                                       */
/* -------------------------------------------------------------------------- */

describe("a loop prints a group", () => {
  const source = `---
title: A
lang: en
groups:
  facts:
    fields: [text]
    items:
      - { id: lock, text: The door was locked. }
      - { id: name, text: A hand nobody knew. }
  nothing: { fields: [text], keeps: duplicates, removes: none }
---

\`\`\`calamus
each: facts
label: The three facts
as: list
\`\`\`

{item.text}

\`\`\`calamus
end
\`\`\`

\`\`\`calamus
each: nothing
empty: Nothing is left to take.
\`\`\`

{item.text}

\`\`\`calamus
end
\`\`\`
`;

  it("prints one item per member, in document order", () => {
    const { result } = read(source);
    const items = withClass(result.body, "calamus__each-item");

    expect(items).toHaveLength(2);
    expect(textIn(items[0])).toContain("The door was locked.");
    expect(textIn(items[1])).toContain("A hand nobody knew.");
  });

  it("carries the author's label as the group's accessible name", () => {
    const { result } = read(source);
    const [list] = tagged(result.body, "ul");

    expect(list.props["aria-label"]).toBe("The three facts");
  });

  it("prints `empty:` when nothing matches, because that is prose", () => {
    const { result } = read(source);

    expect(textIn(result.body)).toContain("Nothing is left to take.");
  });

  it("falls to document order when no `orders` entry is registered, and says so", () => {
    const ordered = `---
title: A
lang: en
groups:
  turns:
    fields: [name]
    items:
      - { id: a, name: one }
      - { id: b, name: two }
---

\`\`\`calamus
each: turns
order: unstable
\`\`\`

{item.name}

\`\`\`calamus
end
\`\`\`
`;
    const { result } = read(ordered);

    expect(textIn(result.body).replace(/\s+/g, " ")).toContain("one");
    expect(result.diagnostics.map((entry) => entry.message).join("\n")).toContain("`unstable`");
  });

  it("uses a registered order, and refuses one that is not a permutation", () => {
    const ordered = `---
title: A
lang: en
groups:
  turns:
    fields: [name]
    items:
      - { id: a, name: one }
      - { id: b, name: two }
      - { id: c, name: three }
---

\`\`\`calamus
each: turns
order: unstable
\`\`\`

{item.name}

\`\`\`calamus
end
\`\`\`
`;
    const { document } = parse(ordered);
    const state = initialState();

    const turned = renderDocument({
      document,
      state,
      registry: { orders: { unstable: (ids) => [...ids].reverse() } },
    });

    expect(withClass(turned.body, "calamus__each-item").map((item) => textIn(item).trim())).toEqual([
      "three",
      "two",
      "one",
    ]);

    const lost = renderDocument({
      document,
      state,
      registry: { orders: { unstable: (ids) => ids.slice(1) } },
    });

    // An ordering that drops an id drops prose, so it is refused whole.
    expect(withClass(lost.body, "calamus__each-item")).toHaveLength(3);
    expect(lost.diagnostics.map((entry) => entry.message).join("\n")).toContain("permutation");
  });
});

/* -------------------------------------------------------------------------- */
/* Controls                                                                    */
/* -------------------------------------------------------------------------- */

describe("a variable with a control renders one", () => {
  const source = `---
title: A
lang: en
groups:
  lenses:
    fields: [id, label]
    items:
      - { id: haunting, label: as haunting }
      - { id: grief, label: as grief }
variables:
  gutter:
    type: number
    min: 0
    max: 64
    step: 2
    default: 28
    unit: px
    control: range
    control-at: panel
    label: gutter
  lens:
    type: enum
    of: lenses
    default: haunting
    control: choice
    control-label: Read the ending
  silent:
    type: boolean
    default: false
    control: toggle
    control-at: prose
---

Prose.
`;

  it("draws a range with its bounds and its step, and prints its unit", () => {
    const { result } = read(source);
    const [range] = elements(result.controls).filter((element) => element.props.type === "range");

    expect(range.props.min).toBe(0);
    expect(range.props.max).toBe(64);
    expect(range.props.step).toBe(2);
    expect(range.props.value).toBe(28);
    expect(textIn(result.controls)).toContain("28px");
  });

  it("takes the options of a choice from the group the author named", () => {
    const { result } = read(source);
    const options = withClass(result.controls, "calamus__control-option");

    expect(options).toHaveLength(2);
    expect(textIn(options[0])).toBe("haunting");
    expect(textIn(options[1])).toBe("grief");
  });

  it("moves the variable through the reducer, not around it", () => {
    const { result, gestures, document } = read(source);
    const [range] = elements(result.controls).filter((element) => element.props.type === "range");

    (range.props.onChange as (event: { currentTarget: { value: string } }) => void)({
      currentTarget: { value: "40" },
    });

    expect(gestures[0].moves).toEqual([{ kind: "set", name: "gutter", value: 40 }]);
    expect(reduce(initialState(), gestures[0].moves[0]).variables.gutter).toBe(40);
    expect(document.variables.gutter.unit).toBe("px");
  });

  it("leaves a control the author put in the prose to the prose", () => {
    const { result } = read(source);

    // `control-at: prose` means the gesture is written in the sentence.
    // Emitting a panel control as well would be two places to press for one
    // effect, which is a defect rather than a convenience.
    expect(textIn(result.controls)).not.toContain("silent");
  });

  it("labels an option with one clause read with the option bound", () => {
    // The shape `VariableDef.optionLabels` holds as a string, which the corpus
    // writes and the parser does not yet carry through.
    const { document } = parse(source);
    document.variables.lens.optionLabels = "Read {item.label}";

    const result = renderDocument({ document, state: initialState() });
    const options = withClass(result.controls, "calamus__control-option");

    expect(textIn(options[0])).toBe("Read as haunting");
    expect(textIn(options[1])).toBe("Read as grief");
  });

  it("labels an option from a map, one label per option", () => {
    const { document } = parse(source);
    document.variables.lens.optionLabels = { haunting: "As a haunting", grief: "As grief" };

    const options = withClass(renderDocument({ document, state: initialState() }).controls, "calamus__control-option");

    expect(textIn(options[0])).toBe("As a haunting");
  });
});

/* -------------------------------------------------------------------------- */
/* The registry, and its degradation table                                     */
/* -------------------------------------------------------------------------- */

describe("the registry degrades by class", () => {
  const withSlot = `---
title: A
lang: en
---

\`\`\`calamus
slot: route-compare
of: kept
\`\`\`

The prose of the region.
`;

  it("a missing view leaves residue; a missing order leaves none", () => {
    expect(DEGRADATION.views.atRuntime).toBe("prose");
    expect(DEGRADATION.views.atCompile).toBe("warning");
    expect(DEGRADATION.orders.atRuntime).toBe("document-order");
    // The asymmetry that decides the defaults: a page served in the wrong order
    // looks perfect and is a different work.
    expect(DEGRADATION.orders.atCompile).toBe("error");
    expect(DEGRADATION.marks.atRuntime).toBe("unmarked");
    expect(DEGRADATION.derivations.atCompile).toBe("error");
    expect(DEGRADATION.plurals.atRuntime).toBe("exact");
  });

  it("names what a registry cannot serve before anything renders", () => {
    const { document } = parse(withSlot);

    expect(missingEntries(document.uses, {})).toEqual([
      { name: "route-compare", kind: "views", degradation: DEGRADATION.views },
    ]);

    expect(missingEntries(document.uses, { views: { "route-compare": () => null } })).toEqual([]);
  });

  it("an unregistered view keeps the reading legible and diagnoses itself", () => {
    const { result } = read(withSlot);

    expect(textIn(result.body)).toContain("The prose of the region.");
    expect(result.diagnostics.map((entry) => entry.message).join("\n")).toContain("`route-compare`");
  });

  it("a registered view receives a projection and not the document", () => {
    const source = `---
title: A
lang: en
groups:
  kept:
    fields: [name, route]
    items:
      - { id: one, name: Route 1, route: quay }
variables:
  walks: { type: number, default: 3 }
---

\`\`\`calamus
slot: route-compare
of: kept
vars: [walks]
writes: [pick]
\`\`\`
`;
    const { document } = parse(source);
    let seen: Record<string, unknown> = {};

    renderDocument({
      document,
      state: initialState(),
      registry: {
        views: {
          "route-compare": (ctx) => {
            seen = ctx as unknown as Record<string, unknown>;
            return null;
          },
        },
      },
    });

    expect((seen.items as unknown[]).length).toBe(1);
    expect(seen.vars).toEqual({ walks: 3 });
    expect(seen.name).toBe("route-compare");
    // What is absent is the contract: no document, no graph, no paginator.
    expect(seen.document).toBeUndefined();
    expect(seen.state).toBeUndefined();
    expect(seen.nodes).toBeUndefined();
    expect(seen.box).toBeNull();
  });

  it("refuses a write a slot's `writes:` does not list", () => {
    const source = `---
title: A
lang: en
variables:
  open: { type: boolean, default: false }
moves:
  reveal: { writes: [open], sets: { open: toggle } }
  hide: { writes: [open], sets: { open: false } }
---

\`\`\`calamus
slot: board
writes: [reveal]
\`\`\`
`;
    const { document } = parse(source);
    const gestures: Gesture[] = [];
    let allowed: boolean | null = null;
    let refused: boolean | null = null;

    const result = renderDocument({
      document,
      state: initialState(),
      onGesture: (gesture) => gestures.push(gesture),
      registry: {
        views: {
          board: (ctx) => {
            allowed = ctx.commit("reveal");
            refused = ctx.commit("hide");
            return null;
          },
        },
      },
    });

    expect(allowed).toBe(true);
    expect(refused).toBe(false);
    expect(gestures).toHaveLength(1);
    expect(gestures[0].moves).toEqual([{ kind: "set", name: "open", value: true }]);
    expect(result.diagnostics.map((entry) => entry.message).join("\n")).toContain("`writes:`");
  });

  it("gives a slot props for a native control, never a handler of its own", () => {
    const source = `---
title: A
lang: en
variables:
  open: { type: boolean, default: false }
moves:
  reveal: { writes: [open], sets: { open: toggle }, to: toggle, note: Open it }
---

\`\`\`calamus
slot: board
writes: [reveal]
\`\`\`
`;
    const { document } = parse(source);
    let props: Record<string, unknown> = {};

    renderDocument({
      document,
      state: initialState(),
      registry: {
        views: {
          board: (ctx) => {
            props = ctx.affordance("reveal") as unknown as Record<string, unknown>;
            return null;
          },
        },
      },
    });

    expect(props.type).toBe("button");
    expect(props["aria-label"]).toBe("Open it");
    expect(props["aria-pressed"]).toBe(false);
    expect(props["data-calamus-move"]).toBe("reveal");
  });

  it("refuses a write that is not inside a real press", () => {
    const source = `---
title: A
lang: en
variables:
  open: { type: boolean, default: false }
moves:
  reveal: { writes: [open], sets: { open: toggle } }
---

\`\`\`calamus
slot: board
writes: [reveal]
\`\`\`
`;
    const { document } = parse(source);
    const holder = createHolder();
    let onRender: boolean | null = null;
    let inGesture: boolean | null = null;

    const result = renderDocument({
      document,
      state: initialState(),
      holder,
      registry: {
        views: {
          board: (ctx) => {
            // A slot that writes while rendering would write on every render,
            // which is a loop rather than a gesture. Outside a press `commit` is
            // inert, so the author sees it not happen.
            onRender = ctx.commit("reveal");
            inGesture = holder.duringGesture(() => ctx.commit("reveal"));
            return null;
          },
        },
      },
    });

    expect(onRender).toBe(false);
    expect(inGesture).toBe(true);
    expect(result.diagnostics.map((entry) => entry.message).join("\n")).toContain("outside a gesture");
  });

  it("refuses everything in the measuring pass, absently rather than loudly", () => {
    const source = `---
title: A
lang: en
variables:
  open: { type: boolean, default: false }
moves:
  reveal: { writes: [open], sets: { open: toggle } }
---

\`\`\`calamus
slot: board
writes: [reveal]
\`\`\`
`;
    const { document } = parse(source);
    let wrote: boolean | null = null;
    let held: unknown = "not called";

    renderDocument({
      document,
      state: initialState(),
      pass: "measure",
      registry: {
        views: {
          board: (ctx) => {
            wrote = ctx.commit("reveal");
            held = ctx.hold("tone", () => ({}), () => undefined);
            return null;
          },
        },
      },
    });

    expect(wrote).toBe(false);
    // A slot has to render with `null`, which is what makes it drawable without
    // its resource.
    expect(held).toBeNull();
  });

  it("only lets a slot announce a phrase of the document", () => {
    const source = `---
title: A
lang: en
phrases:
  parting: { say: The two walks part here. }
---

\`\`\`calamus
slot: board
\`\`\`
`;
    const { document } = parse(source);
    const gestures: Gesture[] = [];

    const result = renderDocument({
      document,
      state: initialState(),
      onGesture: (gesture) => gestures.push(gesture),
      registry: {
        views: {
          board: (ctx) => {
            ctx.announce("parting");
            ctx.announce("something the slot made up");
            return null;
          },
        },
      },
    });

    expect(gestures).toHaveLength(1);
    expect(gestures[0].announce).toBe("The two walks part here.");
    expect(result.diagnostics.map((entry) => entry.message).join("\n")).toContain("not a phrase");
  });

  it("a view that throws does not take the reading with it", () => {
    const { document } = parse(withSlot);

    const result = renderDocument({
      document,
      state: initialState(),
      registry: {
        views: {
          "route-compare": () => {
            throw new Error("a registry entry with a bug");
          },
        },
      },
    });

    expect(result.diagnostics.map((entry) => entry.message).join("\n")).toContain("threw");
  });

  it("checks a permutation the way the contract asks", () => {
    expect(isPermutation(["a", "b"], ["b", "a"])).toBe(true);
    expect(isPermutation(["a", "b"], ["a", "a"])).toBe(false);
    expect(isPermutation(["a", "b"], ["a"])).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Live blocks, and the announcer's silence                                    */
/* -------------------------------------------------------------------------- */

describe("the library owns every live region", () => {
  const source = frontMatter(
    `:with{live=status}\nShowing 4 of 4 minutes.`
  );

  it("does not put `aria-live` on the block itself", () => {
    const { result } = read(source);
    const [paragraph] = tagged(result.body, "p");

    // Decision 14b: mounting renders and re-paginates, and a block cannot tell
    // a measurement from an intention. The politeness the author asked for is
    // kept as data; the one announcer is the reader's.
    expect(paragraph.props["aria-live"]).toBeUndefined();
    expect(paragraph.props.role).toBeUndefined();
    expect(paragraph.props["data-live"]).toBe("status");
  });

  it("gathers what a live block says, for the announcer to say later", () => {
    const { result } = read(source);

    expect(result.live).toBe("Showing 4 of 4 minutes.");
  });

  it("announces the state the gesture produces, not the one it left", () => {
    // `note:` and the button's label are the same phrase in `redaction`, and it
    // dispatches on the variable the same gesture flips. Read too early it would
    // say "Reveal the redacted words" at the moment the words became visible.
    const source = `---
title: A
lang: en
variables:
  inside: { type: boolean, default: false }
moves:
  show-inside:
    writes: [inside]
    sets: { inside: toggle }
    to: toggle
    note: "{inside-label}"
phrases:
  inside-label:
    on: inside
    cases:
      - { is: true, say: These words are showing }
      - { say: These words are hidden }
---

:do[the inside]{move=show-inside}
`;
    const { result, gestures } = read(source);
    const [button] = tagged(result.body, "button");

    // The label describes the button now; the announcement describes what the
    // press did. They are the same phrase read a move apart.
    expect(button.props["aria-label"]).toBe("These words are hidden");

    press(result.body, "the inside");

    expect(gestures[0].announce).toBe("These words are showing");
  });

  it("names a region to go back to before the same gesture clears the name", () => {
    // The opposite case, and the corpus writes it: a return names the span it
    // left through a variable, and clears that variable in the same breath.
    const source = `---
title: A
lang: en
variables:
  away: { type: string, default: note }
moves:
  back-up:
    writes: [away]
    show: "anchor-mark-{away}"
    focus: true
    sets: { away: "" }
---

:do[Back to the line you left]{move=back-up}
`;
    const { result, gestures } = read(source);

    press(result.body, "Back to the line you left");

    expect(gestures[0].show).toEqual(["anchor-mark-note"]);
    expect(gestures[0].focus).toBe("anchor-mark-note");
    expect(gestures[0].moves).toEqual([{ kind: "set", name: "away", value: "" }]);
  });

  it("says the prose the author declared on the move, when there is one", () => {
    const source = `---
title: A
lang: en
variables:
  inside: { type: boolean, default: false }
moves:
  show-inside: { writes: [inside], sets: { inside: toggle }, note: Reveal the redacted words }
---

:do[the inside]{move=show-inside}
`;
    const { result, gestures } = read(source);

    press(result.body, "the inside");

    expect(gestures[0].announce).toBe("Reveal the redacted words");
  });
});

/* -------------------------------------------------------------------------- */
/* Decision 22: the flat text is the degenerate document                       */
/* -------------------------------------------------------------------------- */

describe("a flat document is what the four presentation modes render", () => {
  const content = { title: "A chapter", subtitle: "a note", body: ["First.", "Second."] };

  it("turns flat prose into a document with no nodes and no directives", () => {
    const document = documentFromContent(content);

    expect(document.nodes).toEqual([]);
    expect(document.variables).toEqual({});
    expect(document.body).toHaveLength(2);
    expect(document.body.every((block) => block.kind === "paragraph")).toBe(true);
  });

  it("renders it as the paragraphs the modes have always rendered", () => {
    const result = renderDocument({ document: documentFromContent(content), state: emptyState() });
    const paragraphs = tagged(result.body, "p");

    expect(paragraphs).toHaveLength(2);
    expect(textIn(paragraphs[0])).toBe("First.");
    expect(result.here).toBeNull();
    expect(result.controls).toBeNull();
    expect(result.exits).toBeNull();
  });

  it("does not read a host's paragraph as a document", () => {
    // A colon and a brace in an English sentence are a colon and a brace. Only
    // an authored document has directives.
    const odd = documentFromContent({ title: "A", body: [":do{move=x} and {name}"] });
    const result = renderDocument({ document: odd, state: emptyState() });

    expect(textIn(result.body)).toBe(":do{move=x} and {name}");
    expect(tagged(result.body, "button")).toHaveLength(0);
  });

  it("counts the words of a document for the reading time", () => {
    expect(wordsOf(documentFromContent(content))).toEqual(["First.", "Second."]);
    expect(wordsOf(emptyDocument("A"))).toEqual([]);
  });

  it("renders an authored document with no directives identically", () => {
    const { result } = read(frontMatter("First.\n\nSecond."));

    expect(tagged(result.body, "p").map((paragraph) => textIn(paragraph))).toEqual(["First.", "Second."]);
  });
});

/* -------------------------------------------------------------------------- */
/* Escaping, in the position it is going into                                  */
/* -------------------------------------------------------------------------- */

describe("escaping goes by position", () => {
  const scope = createScope({ state: { ...emptyState(), variables: { note: `a "quoted" <b>` } } });

  it("a text position keeps the quotes, because an apostrophe is prose", () => {
    // `escapeText` leaves quotes alone on purpose: escaping them would corrupt
    // "the clerk's" and "l'intérieur", and three of the corpus languages need it.
    expect(plainText("{note}", scope)).toBe(`a "quoted" <b>`);
  });
});
