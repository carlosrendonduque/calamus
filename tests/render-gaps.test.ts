/**
 * Six defects the suite could not see, each one visible on the deployed demo and
 * invisible to a test that only asks whether something rendered.
 *
 * 1. **A document with nodes never rendered its own body.** `labyrinth` writes
 *    its trail before the first node header, so the walkable labyrinth had no
 *    trail — the one thing it exists to show.
 * 2. **A region a declared move could reveal started closed**, even when nothing
 *    on screen could open it. `recover-anchor` opened as one sentence with
 *    nothing to press.
 * 3. **A mark whose condition failed still wrote `data-mark`**, so a host could
 *    not tell a mark that applied from one that did not.
 * 4. **A mark's declared `when:` was never evaluated.** `reader-path` badged
 *    every standing line "struck" while the line under it counted none.
 * 5. **A block-level `mark=` never reached the registry and carried no
 *    condition.** `two-accounts` and `evidence-score` both write it, and neither
 *    was ever drawn.
 * 6. **`slots:` parameters were dropped**, so a host could not implement a view:
 *    the entry received empty `params`, `bind` and `items`.
 *
 * Everything below is checked on the element tree, without a DOM (decision 6).
 */

/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { parse } from "../src/document/parse";
import { renderDocument } from "../src/document/render";
import { initialState, reduce } from "../src/document/evaluator";
import { gestureFor, revealableRegions, type Gesture } from "../src/document/moves";
import type { DocumentRegistry, SlotContext } from "../src/document/registry";
import type { NarrativeDocument, ReadingState } from "../src/document/types";

const corpus: Record<string, string> = import.meta.glob("../docs/conformance-v1/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const sources = new Map(
  Object.entries(corpus).map(([path, source]) => [path.slice(path.lastIndexOf("/") + 1), source] as const)
);

const read = (name: string): NarrativeDocument => parse(sources.get(name) ?? "").document;

const frontMatter = (body: string, matter = "title: A\nlang: en\n"): string => `---\n${matter}---\n\n${body}\n`;

type Props = Record<string, unknown>;

const elements = (node: ReactNode): ReactElement[] => {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement(node)) return [];
  return [node, ...elements((node.props as { children?: ReactNode }).children)];
};

const propsOf = (element: ReactElement): Props => element.props as Props;

const words = (node: ReactNode): string => {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(words).join("");
  if (!isValidElement(node)) return "";
  return words((node.props as { children?: ReactNode }).children);
};

const marked = (node: ReactNode): string[] =>
  elements(node)
    .filter((element) => propsOf(element)["data-mark"] !== undefined)
    .map((element) => String(propsOf(element)["data-mark"]));

type Reading = { result: ReturnType<typeof renderDocument>; gestures: Gesture[] };

function render(
  document: NarrativeDocument,
  state?: ReadingState,
  extra: Record<string, unknown> = {}
): Reading {
  const gestures: Gesture[] = [];

  const result = renderDocument({
    document,
    state: state ?? initialState(document.opens ?? {}),
    onGesture: (gesture) => gestures.push(gesture),
    ...extra,
  });

  return { result, gestures };
}

/** Press the first control whose visible words contain `said`. */
function press(node: ReactNode, said: string): void {
  const control = elements(node).find(
    (element) => (element.type === "button" || element.type === "a") && words(element).includes(said)
  );

  if (!control) throw new Error(`no control reads "${said}"`);

  (propsOf(control).onClick as (event: { preventDefault: () => void }) => void)({
    preventDefault: () => undefined,
  });
}

/** The reading a gesture leaves, which is what the component does with one. */
const after = (document: NarrativeDocument, state: ReadingState, gesture: Gesture): ReadingState =>
  gesture.moves.reduce((carried, move) => reduce(carried, move, { groups: document.groups }), state);

/* -------------------------------------------------------------------------- */
/* 1. A document's own body frames the node it is on                           */
/* -------------------------------------------------------------------------- */

describe("a document's own body frames every node", () => {
  const source = frontMatter(
    "The frame.\n\n```calamus\nnode: one\nexits:\n  - { to: two, label: Onward }\n```\n\nThe first room.\n\n```calamus\nnode: two\n```\n\nThe second room."
  );

  it("prints the prose before the first header on the first node, and before it", () => {
    const { document } = parse(source);
    const { result } = render(document);

    expect(words(result.body).indexOf("The frame.")).toBe(0);
    expect(words(result.body)).toContain("The first room.");
  });

  it("prints it again on every other node, because a frame that leaves is prose lost", () => {
    const { document } = parse(source);
    const { result } = render(document, { trail: ["two"], variables: {}, logs: {}, readings: 1 });

    expect(words(result.body)).toContain("The frame.");
    expect(words(result.body)).toContain("The second room.");
    expect(words(result.body)).not.toContain("The first room.");
  });

  it("says nothing about it: prose that belongs to the document is not a defect", () => {
    expect(parse(source).diagnostics).toEqual([]);
  });

  it("gives `labyrinth` the trail it prints, and grows it as the reader walks", () => {
    const document = read("labyrinth.md");
    const opening = initialState(document.opens ?? {});

    const first = render(document, opening);
    expect(words(first.result.body)).toContain("Platform six");

    press(first.result.exits, "Take the stairs down");
    const walked = after(document, opening, first.gestures[0]);

    const second = render(document, walked);
    const route = words(second.result.body);

    // The trail is the document's own body, so it is on the second room too —
    // and it now names both rooms, in the order they were walked.
    expect(route.indexOf("Platform six")).toBeLessThan(route.indexOf("The stairwell"));
    expect(route).toContain("It turns twice");
  });

  it("puts the trail back when an exit returns the reader to the start", () => {
    const document = read("labyrinth.md");
    let state = initialState(document.opens ?? {});

    const first = render(document, state);
    press(first.result.exits, "Take the stairs down");
    state = after(document, state, first.gestures[0]);
    expect(state.trail).toEqual(["platform", "stairs"]);

    const second = render(document, state);
    press(second.result.exits, "Return to the start");
    state = after(document, state, second.gestures[0]);

    // `to: start` is the schema's older sugar for `opens:`, not a node. Entered
    // as one it left a step in the trail that named nothing.
    expect(state.trail).toEqual(["platform"]);
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Which regions start closed                                               */
/* -------------------------------------------------------------------------- */

describe("a region starts closed only when the reading can put it back", () => {
  it("closes a region a `:go{show=}` names, because a second press reopens it", () => {
    const { document } = parse(
      frontMatter("The corridor :go[goes on]{show=note-3} to the end.\n\n```calamus\nregion: note-3\n```\n\nWhat unfolds.\n\n```calamus\nend\n```")
    );

    expect([...revealableRegions(document)]).toEqual(["note-3"]);
  });

  it("leaves open a region a declared move names by its literal name", () => {
    const { document } = parse(
      frontMatter(
        "```calamus\nregion: main\n```\n\nThe line itself.\n\n```calamus\nend\n```",
        "title: A\nlang: en\nmoves:\n  put-back:\n    writes: []\n    show: main\n"
      )
    );

    // A move's `show:` can only ever open. Counted as a reveal it would take the
    // document's own line out of the reading with nothing able to give it back.
    expect(revealableRegions(document).has("main")).toBe(false);

    const { result } = render(document);
    const [region] = elements(result.body).filter((element) =>
      String(propsOf(element).className ?? "").includes("calamus__region")
    );

    expect(propsOf(region).hidden).toBeUndefined();
    expect(words(result.body)).toContain("The line itself.");
  });

  it("still closes a family a declared move names by template", () => {
    const document = read("recover-anchor.md");

    expect(revealableRegions(document).has("anchor-body-{item.id}")).toBe(true);
    expect(revealableRegions(document).has("anchor-main")).toBe(false);
  });

  it("opens `recover-anchor` on its main line, with both anchors to press", () => {
    const document = read("recover-anchor.md");
    const { result } = render(document);

    expect(words(result.body)).toContain("The bridge was passed as sound on the fourteenth");
    expect(elements(result.body).filter((element) => element.type === "button")).toHaveLength(2);

    // And the apparatus is still shut: one entry at a time is what it is for.
    for (const id of ["calamus-anchor-body-note", "calamus-anchor-body-appendix"]) {
      const entry = elements(result.body).find((element) => propsOf(element).id === id);
      expect(propsOf(entry as ReactElement).hidden).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 3 and 4. A mark's two conditions                                            */
/* -------------------------------------------------------------------------- */

describe("a mark claims to be there only when it is", () => {
  const registry: DocumentRegistry = { marks: { pass: ({ children }) => children } };

  it("keeps the words of a mark whose use-site condition is false, and drops the claim", () => {
    const { document } = parse(
      frontMatter(
        "The inventory lists one :mark[door]{kind=kept when=keeping} on the landing.",
        "title: A\nlang: en\nvariables:\n  keeping: { type: boolean, default: false }\nmarks:\n  kept: { as: pass, note: kept }\n"
      )
    );

    const { result } = render(document, undefined, { registry });

    // The words are the sentence's, so taking them out would leave "The
    // inventory lists one on the landing."
    expect(words(result.body)).toContain("The inventory lists one door on the landing.");
    expect(marked(result.body)).toEqual([]);
  });

  it("writes `data-mark` and calls the entry when the condition holds", () => {
    const { document } = parse(
      frontMatter(
        "The inventory lists one :mark[door]{kind=kept when=keeping} on the landing.",
        "title: A\nlang: en\nvariables:\n  keeping: { type: boolean, default: true }\nmarks:\n  kept: { as: pass, note: kept }\n"
      )
    );

    const { result } = render(document, undefined, { registry });

    expect(marked(result.body)).toEqual(["kept"]);
  });

  it("evaluates the `when:` written beside the declaration, not only the one at the use site", () => {
    const { document } = parse(
      frontMatter(
        "The landing was :mark[empty]{kind=struck}.",
        "title: A\nlang: en\nvariables:\n  striking: { type: boolean, default: false }\nmarks:\n  struck: { as: pass, when: striking }\n"
      )
    );

    const { result } = render(document, undefined, { registry });

    expect(words(result.body)).toContain("The landing was empty.");
    expect(marked(result.body)).toEqual([]);
  });

  it("keeps the author's note on a mark that applies but has no entry registered", () => {
    const { document } = parse(
      frontMatter("A :mark[door]{kind=kept} on the landing.", "title: A\nlang: en\nmarks:\n  kept: { note: A thing kept }\n")
    );

    const { result } = render(document);
    const [mark] = elements(result.body).filter((element) => propsOf(element)["data-mark"] === "kept");

    expect(propsOf(mark).title).toBe("A thing kept");
    expect(words(result.body)).toContain("A door on the landing.");
  });

  it("does not badge a standing line of `reader-path` while the report counts none", () => {
    const document = read("reader-path.md");
    const state: ReadingState = {
      trail: [],
      variables: {},
      logs: { book: [{ place: "the reading room" }, { place: "the map case" }] },
      readings: 1,
    };

    const { result } = render(document, state);

    expect(marked(result.body)).toEqual([]);
    expect(words(result.body)).toContain("2 lines standing, 0 struck");
  });

  it("badges the one line the reader withdrew, and only that one", () => {
    const document = read("reader-path.md");
    let state: ReadingState = {
      trail: [],
      variables: {},
      logs: { book: [{ place: "the reading room" }, { place: "the map case" }] },
      readings: 1,
    };

    const first = render(document, state);
    press(first.result.body, "Withdraw the last line");

    // `entry: here` names an entry through a declared name, and an entry of a
    // growing log has no id of its own: the caller has to resolve both.
    state = after(document, state, first.gestures[0]);
    expect(state.logs.book).toEqual([{ place: "the reading room" }, { place: "the map case", struck: true }]);

    const second = render(document, state);

    // The strike-through is a mark, because the line is always there and only
    // its treatment changes. The word "struck" is a phrase with an empty
    // clause, because the word itself is only sometimes there -- a conditional
    // mark cannot do that, since a marked span's children always print.
    expect(marked(second.result.body).sort()).toEqual(["withdrawn"]);
    expect(words(second.result.body)).toContain("the map case struck");
    expect(words(second.result.body)).not.toContain("the reading room struck");
    expect(words(second.result.body)).toContain("1 line standing, 1 struck");
  });
});

/* -------------------------------------------------------------------------- */
/* 5. A mark on a whole block                                                  */
/* -------------------------------------------------------------------------- */

describe("a block-level `mark=` is the same mark as an inline one", () => {
  it("does not mark the claims of `evidence-score` that are stated plainly", () => {
    const document = read("evidence-score.md");
    const { result } = render(document);

    // Three claims, thresholds 70, 45 and 80, with the dial at 72: exactly one
    // is hedged, and the sentence beneath says "2 are stated without hedging".
    expect(marked(result.body)).toEqual(["hedged"]);
    expect(words(result.body)).toContain("2 are stated without hedging");
  });

  it("marks more of them as the reader takes the dial down", () => {
    const document = read("evidence-score.md");
    const { result } = render(document, {
      trail: [],
      variables: { trust: 30 },
      logs: {},
      readings: 1,
    });

    expect(marked(result.body)).toEqual(["hedged", "hedged"]);
  });

  it("marks neither column of `two-accounts` until the reader marks a point", () => {
    const document = read("two-accounts.md");

    expect(marked(render(document).result.body).filter((kind) => kind === "disputed")).toEqual([]);

    const { result } = render(document, { trail: [], variables: { marked: "wall" }, logs: {}, readings: 1 });

    // One row in each column, which is what "marked in both accounts" means.
    expect(marked(result.body).filter((kind) => kind === "disputed")).toHaveLength(2);
  });

  it("draws the block mark with the entry the author's `as:` names", () => {
    const document = read("two-accounts.md");
    const drawn: string[] = [];

    render(document, { trail: [], variables: { marked: "wall" }, logs: {}, readings: 1 }, {
      registry: {
        marks: {
          rule: ({ children, markKind, note }) => {
            drawn.push(`${markKind}/${note}`);
            return children;
          },
        },
      } satisfies DocumentRegistry,
    });

    // The kind is the author's word, the entry is the host's, and the note is
    // prose the author wrote beside the mark.
    expect(drawn).toEqual(["disputed/the point you marked", "disputed/the point you marked"]);
  });

  it("keeps the line whatever the mark does, because the line is always there", () => {
    const document = read("two-accounts.md");
    const said = words(render(document).result.body);

    expect(said).toContain("The wall of the store room had moved out by about a hand's width.");
    expect(said).toContain("Nothing in the store room had moved.");
  });
});

/* -------------------------------------------------------------------------- */
/* 6. What a `slots:` declaration hands a view                                 */
/* -------------------------------------------------------------------------- */

describe("a slot receives what its declaration said", () => {
  const seenBy = (document: NarrativeDocument, name: string): SlotContext => {
    let seen: SlotContext | null = null;

    renderDocument({
      document,
      state: initialState(document.opens ?? {}),
      registry: {
        views: {
          [name]: (ctx) => {
            seen = ctx;
            return ctx.children;
          },
        },
      },
    }).body;

    if (!seen) throw new Error(`the view \`${name}\` was never called`);

    return seen;
  };

  it("carries `meta-editor`'s declaration to the appearance that uses the name", () => {
    const document = read("meta-editor.md");
    const ctx = seenBy(document, "rewrite");

    expect(ctx.params).toMatchObject({ with: "rules", over: "line", mark: "edited", counts: "edits" });
    // And what the use site wrote, over the declaration.
    expect(ctx.params.when).toBe("editing");
  });

  it("says nothing about it any more: the parameters are kept, not dropped", () => {
    const parsed = parse(sources.get("meta-editor.md") ?? "");

    expect(parsed.diagnostics).toEqual([]);
  });

  it("projects `of:`, `vars:` and `bind:` from the declaration, as the contract spells them", () => {
    const { document } = parse(
      frontMatter(
        "```calamus\nslot: compare\n```",
        [
          "title: A",
          "lang: en",
          "variables:",
          "  walks: { type: number, default: 3 }",
          "groups:",
          "  picked:",
          "    fields: [name, route]",
          "    items:",
          "      - { id: one, name: First, route: north }",
          "slots:",
          "  compare:",
          "    of: picked",
          "    vars: [walks]",
          "    bind: { label: name, series: route }",
          "    writes: [pick]",
          "",
        ].join("\n")
      )
    );

    const ctx = seenBy(document, "compare");

    // The entry declares roles and never learns the author's field names.
    expect(ctx.bind).toEqual({ label: "name", series: "route" });
    expect(ctx.vars).toEqual({ walks: 3 });
    expect(ctx.items).toEqual([{ id: "one", name: "First", route: "north" }]);
  });

  it("reads a nested map on the island itself, which a scalar read wrote as null", () => {
    const { document } = parse(
      frontMatter("```calamus\nslot: compare\nbind: { label: name }\nreserve: { aspect: 3/2 }\n```")
    );

    const ctx = seenBy(document, "compare");

    expect(ctx.bind).toEqual({ label: "name" });
    expect(ctx.params.reserve).toEqual({ aspect: "3/2" });
  });
});

/* -------------------------------------------------------------------------- */
/* What none of the above may cost                                             */
/* -------------------------------------------------------------------------- */

describe("the nineteen keep what they had", () => {
  const names = [...sources.keys()].filter((name) => name !== "README.md");

  it("still finds all nineteen", () => {
    expect(names).toHaveLength(19);
  });

  for (const name of names) {
    it(`${name} still renders, with a reading position and no throw`, () => {
      const document = read(name);
      expect(() => render(document)).not.toThrow();

      const { result } = render(document);
      expect(result.here === null || document.nodes.some((node) => node.id === result.here?.id)).toBe(true);
    });
  }

  it("marks nothing in a document whose marks have no conditions and no entries", () => {
    const document = read("redaction.md");
    const kinds = marked(render(document).result.body);

    // `withheld` has no `when:`, so it applies and says so; nothing else does.
    expect(new Set(kinds)).toEqual(new Set(["withheld"]));
  });

  it("does not reach for a group named like the trail when the author filled one", () => {
    const { document } = parse(
      frontMatter(
        "```calamus\nnode: one\n```\n\n:each{of=trail}\n{item.name}",
        "title: A\nlang: en\ngroups:\n  trail:\n    fields: [name]\n    items:\n      - { id: a, name: The author's own }\n"
      )
    );

    expect(words(render(document).result.body)).toContain("The author's own");
  });
});

/* -------------------------------------------------------------------------- */
/* A gesture the six touched                                                   */
/* -------------------------------------------------------------------------- */

describe("a node named `start` is still a node", () => {
  it("enters it rather than treating it as the opening", () => {
    const { document } = parse(
      frontMatter("```calamus\nnode: one\nexits:\n  - { to: start, label: Onward }\n```\n\nOne.\n\n```calamus\nnode: start\n```\n\nThe start room.")
    );

    const gesture = gestureFor(
      { action: "go", target: "start" },
      document,
      { state: initialState(), variables: {}, groups: {}, names: {}, phrases: {}, bindings: {}, registry: {}, accessors: { item: "item", here: "here" }, persisted: false, resolving: [] }
    );

    expect(gesture.moves).toEqual([{ kind: "enter", node: "start" }]);
  });
});
