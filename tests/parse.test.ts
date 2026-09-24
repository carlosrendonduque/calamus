import { describe, expect, it } from "vitest";
import { parse } from "../src/document/parse";
import type { Block, Diagnostic, Inline, NodeDef } from "../src/document/types";

const errorsOf = (diagnostics: Diagnostic[]) =>
  diagnostics.filter((diagnostic) => diagnostic.severity === "error");

const paragraphs = (blocks: Block[]): Extract<Block, { kind: "paragraph" }>[] =>
  blocks.filter((block): block is Extract<Block, { kind: "paragraph" }> => block.kind === "paragraph");

const proseOf = (content: Inline[]): string =>
  content
    .map((item) => {
      if (item.kind === "text") return item.text;
      if (item.kind === "interpolation") return `{${item.path}}`;
      if (item.kind === "mark" || item.kind === "affordance" || item.kind === "slot") return proseOf(item.children);
      return "";
    })
    .join("");

describe("the flat case", () => {
  it("reads a document that is a title and a paragraph", () => {
    const { document, diagnostics } = parse(["---", "title: El pasillo", "---", "", "Hay un pasillo."].join("\n"));
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(document.title).toBe("El pasillo");
    expect(document.nodes).toEqual([]);
    expect(document.body).toEqual([
      { kind: "paragraph", attrs: {}, content: [{ kind: "text", text: "Hay un pasillo." }] },
    ]);
  });

  it("keeps a document with no front matter at all", () => {
    const { document, diagnostics } = parse("Sólo prosa.\n");
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(proseOf(paragraphs(document.body)[0].content)).toBe("Sólo prosa.");
  });

  it("joins a soft-wrapped paragraph and separates it from the next", () => {
    const { document } = parse("---\ntitle: T\n---\n\nOne\nline.\n\nAnother.\n");
    expect(document.body).toHaveLength(2);
    expect(proseOf(paragraphs(document.body)[0].content)).toBe("One line.");
  });

  it("reads headings up to the three levels the contract holds", () => {
    const { document, diagnostics } = parse("---\ntitle: T\n---\n\n## Second\n\n#### Fourth\n");
    expect(document.body.map((block) => block.kind)).toEqual(["heading", "heading"]);
    expect((document.body[0] as Extract<Block, { kind: "heading" }>).level).toBe(2);
    expect((document.body[1] as Extract<Block, { kind: "heading" }>).level).toBe(3);
    expect(diagnostics.some((d) => d.severity === "warning" && d.message.includes("4 hashes"))).toBe(true);
    expect(errorsOf(diagnostics)).toEqual([]);
  });
});

describe("front matter", () => {
  it("reads a group's fields, discipline and items", () => {
    const { document, diagnostics } = parse(
      [
        "---",
        "title: T",
        "groups:",
        "  book:",
        "    fields: [place, struck]",
        "    keeps: unique",
        "    removes: last",
        "    marks: [struck]",
        "    items:",
        "      - { id: a, place: the map case, struck: false }",
        "---",
        "",
        "Prose.",
      ].join("\n")
    );
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(document.groups.book).toEqual({
      fields: ["place", "struck"],
      discipline: { keeps: "unique", removes: "last", marks: ["struck"] },
      items: [{ id: "a", place: "the map case", struck: false }],
    });
  });

  it("reads a phrase's cases in the order they were written", () => {
    const { document, diagnostics } = parse(
      [
        "---",
        "title: T",
        "phrases:",
        "  standing:",
        "    on: lines",
        "    of: item",
        "    cases:",
        "      - { is: 0, say: No queda ninguna línea en pie }",
        "      - { is: 1, say: Queda una línea en pie }",
        '      - {        say: "Quedan {lines} líneas en pie" }',
        "---",
        "",
        "Prose.",
      ].join("\n")
    );
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(document.phrases.standing.on).toBe("lines");
    expect(document.phrases.standing.of).toBe("item");
    expect(document.phrases.standing.cases).toEqual([
      { say: "No queda ninguna línea en pie", is: 0 },
      { say: "Queda una línea en pie", is: 1 },
      { say: "Quedan {lines} líneas en pie" },
    ]);
  });

  it("reads a grouping as `over`, `by` and `test`", () => {
    const { document, diagnostics } = parse(
      ["---", "title: T", "names:", "  contradicts: { over: claims, by: question, test: split }", "---", "", "P."].join("\n")
    );
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(document.names.contradicts).toEqual({ kind: "grouped", over: "claims", by: "question", test: "split" });
  });

  it("reads folded block scalars, and keeps an apostrophe out of the quoting", () => {
    const { document } = parse(
      [
        "---",
        "title: T",
        "groups:",
        "  g:",
        "    fields: [text]",
        "    items:",
        "      - { id: a, text: The door was sealed at three o'clock. }",
        "      - id: b",
        "        text: >-",
        "          One line",
        "          and another.",
        "---",
        "",
        "P.",
      ].join("\n")
    );
    expect(document.groups.g.items[0].text).toBe("The door was sealed at three o'clock.");
    expect(document.groups.g.items[1].text).toBe("One line and another.");
  });

  it("reads where a reading opens", () => {
    const { document } = parse("---\ntitle: T\nopens:\n  trail: [platform]\n  readings: 2\n---\n\nP.\n");
    expect(document.opens).toEqual({ trail: ["platform"], readings: 2 });
  });
});

describe("islands", () => {
  const withNodes = [
    "---",
    "title: Platform six",
    "---",
    "",
    "```calamus",
    "node: kiosk",
    "requires: visits(platform) > 0",
    "exits:",
    "  - { to: platform, label: Volver al andén, when: not read }",
    "  - { to: stairs, label: Bajar }",
    "```",
    "",
    "Aquí el andén se ve pequeño.",
    "",
    "```calamus",
    "node: stairs",
    "```",
    "",
    "La escalera gira dos veces.",
  ].join("\n");

  it("gives a node the prose that follows it, up to the next header", () => {
    const { document, diagnostics } = parse(withNodes);
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(document.nodes.map((node: NodeDef) => node.id)).toEqual(["kiosk", "stairs"]);
    expect(proseOf(paragraphs(document.nodes[0].body)[0].content)).toBe("Aquí el andén se ve pequeño.");
    expect(proseOf(paragraphs(document.nodes[1].body)[0].content)).toBe("La escalera gira dos veces.");
    expect(document.body).toEqual([]);
  });

  it("reads both gates: `requires` on the node and `when` on the exit", () => {
    const { document } = parse(withNodes);
    expect(document.nodes[0].requires).toEqual({
      kind: "compare",
      op: ">",
      left: { kind: "visits", node: "platform" },
      right: { kind: "literal", value: 0 },
    });
    expect(document.nodes[0].exits).toEqual([
      { to: "platform", label: "Volver al andén", when: { kind: "not", of: { kind: "read", path: "read" } } },
      { to: "stairs", label: "Bajar" },
    ]);
  });

  it("gives an `each` island the blocks between it and its `end`", () => {
    const { document, diagnostics } = parse(
      [
        "---",
        "title: T",
        "---",
        "",
        "```calamus",
        "each: claims where holds",
        "```",
        "",
        "La declaración dice: {item.text}",
        "",
        "```calamus",
        "end",
        "```",
        "",
        "Después.",
      ].join("\n")
    );
    expect(errorsOf(diagnostics)).toEqual([]);
    const each = document.body[0] as Extract<Block, { kind: "each" }>;
    expect(each.kind).toBe("each");
    expect(each.group).toBe("claims");
    expect(each.where).toEqual({ kind: "read", path: "holds" });
    expect(proseOf(paragraphs(each.body)[0].content)).toBe("La declaración dice: {item.text}");
    expect(proseOf(paragraphs(document.body)[0].content)).toBe("Después.");
  });

  it("ignores `#` comments inside an island", () => {
    const { document, diagnostics } = parse(
      ["---", "title: T", "---", "", "```calamus", "# a note to nobody", "node: one", "```", "", "P."].join("\n")
    );
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(document.nodes[0].id).toBe("one");
  });

  it("keeps an island it cannot name, byte for byte", () => {
    const raw = ["```calamus", "controls:", "  - resets: book", "    label: Close the book", "```"].join("\n");
    const { document, diagnostics } = parse(["---", "title: T", "---", "", raw].join("\n"));
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(document.body).toEqual([{ kind: "unknown", raw }]);
    expect(diagnostics.some((d) => d.severity === "warning" && d.message.includes("controls"))).toBe(true);
  });
});

describe("inline content", () => {
  it("reads a name and a one-dot path in braces", () => {
    const { document, diagnostics } = parse("---\ntitle: T\n---\n\nHas estado {visits-here} veces. Dice {item.label}.\n");
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(paragraphs(document.body)[0].content).toEqual([
      { kind: "text", text: "Has estado " },
      { kind: "interpolation", path: "visits-here" },
      { kind: "text", text: " veces. Dice " },
      { kind: "interpolation", path: "item.label" },
      { kind: "text", text: "." },
    ]);
  });

  it("puts a `:with`'s attributes on the paragraph that follows it", () => {
    const { document, diagnostics } = parse(
      ['---', "title: T", "---", "", ':with{when="visits(kiosk) > 1" lang=fr mark=hedged id=one}', "Has estado aquí antes."].join("\n")
    );
    expect(errorsOf(diagnostics)).toEqual([]);
    const paragraph = paragraphs(document.body)[0];
    expect(paragraph.attrs).toEqual({
      when: { kind: "compare", op: ">", left: { kind: "visits", node: "kiosk" }, right: { kind: "literal", value: 1 } },
      lang: "fr",
      mark: "hedged",
      id: "one",
    });
    expect(proseOf(paragraph.content)).toBe("Has estado aquí antes.");
  });

  it("reads a mark, whose kind is the author's own word", () => {
    const { document, diagnostics } = parse("---\ntitle: T\n---\n\nLista :mark[una puerta]{kind=kept} en el rellano.\n");
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(paragraphs(document.body)[0].content[1]).toEqual({
      kind: "mark",
      markKind: "kept",
      children: [{ kind: "text", text: "una puerta" }],
    });
    expect(document.uses).toContainEqual({ name: "kept", kind: "marks" });
  });

  it("tells the three affordances apart by what they name", () => {
    const { document, diagnostics } = parse(
      ["---", "title: T", "---", "", "El pasillo :go{show=note-3 focus=true} sigue, :go[al kiosco]{to=kiosk} y :do{move=turn-to}."].join("\n")
    );
    expect(errorsOf(diagnostics)).toEqual([]);
    const content = paragraphs(document.body)[0].content.filter((item) => item.kind === "affordance");
    expect(content).toEqual([
      { kind: "affordance", action: "show", target: "note-3", children: [], focus: true },
      { kind: "affordance", action: "go", target: "kiosk", children: [{ kind: "text", text: "al kiosco" }] },
      { kind: "affordance", action: "do", target: "turn-to", children: [] },
    ]);
  });

  it("reads a slot and records the view it reaches for", () => {
    const { document, diagnostics } = parse("---\ntitle: T\n---\n\n:slot[{line}]{name=rewrite when=editing}\n");
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(paragraphs(document.body)[0].content[0]).toEqual({
      kind: "slot",
      name: "rewrite",
      params: { when: "editing" },
      children: [{ kind: "interpolation", path: "line" }],
    });
    expect(document.uses).toContainEqual({ name: "rewrite", kind: "views" });
  });

  it("reads a blank measure as a block", () => {
    const { document, diagnostics } = parse("---\ntitle: T\n---\n\n:blank[3]\n");
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(document.body).toEqual([{ kind: "blank", lines: 3 }]);
  });

  it("keeps children that run over a line break", () => {
    const { document } = parse("---\ntitle: T\n---\n\nla puerta :mark[quedó\nabierta]{kind=kept} entonces.\n");
    expect(proseOf(paragraphs(document.body)[0].content)).toBe("la puerta quedó abierta entonces.");
  });
});

describe("expressions", () => {
  const guardOf = (source: string) => {
    const { document, diagnostics } = parse(`---\ntitle: T\n---\n\n:with{when="${source}"}\nP.\n`);
    return { when: paragraphs(document.body)[0].attrs.when, diagnostics };
  };

  it("reads and, or, not and the comparisons", () => {
    const { when, diagnostics } = guardOf("not a and b >= 2 or c == 'x'");
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(when).toEqual({
      kind: "or",
      of: [
        {
          kind: "and",
          of: [
            { kind: "not", of: { kind: "read", path: "a" } },
            { kind: "compare", op: ">=", left: { kind: "read", path: "b" }, right: { kind: "literal", value: 2 } },
          ],
        },
        { kind: "compare", op: "==", left: { kind: "read", path: "c" }, right: { kind: "literal", value: "x" } },
      ],
    });
  });

  it("reads the counting operators, with and without a filter", () => {
    expect(guardOf("count(book where not struck) > 0").when).toEqual({
      kind: "compare",
      op: ">",
      left: { kind: "count", group: "book", where: { kind: "not", of: { kind: "read", path: "struck" } } },
      right: { kind: "literal", value: 0 },
    });
    expect(guardOf("some(claims)").when).toEqual({ kind: "some", group: "claims" });
    expect(guardOf("visited(kiosk)").when).toEqual({ kind: "visited", node: "kiosk" });
  });

  it("keeps a hyphen inside an authored name and calls a spaced one arithmetic", () => {
    expect(guardOf("crossed-out == 0").when).toEqual({
      kind: "compare",
      op: "==",
      left: { kind: "read", path: "crossed-out" },
      right: { kind: "literal", value: 0 },
    });
    expect(errorsOf(guardOf("crossed - out == 0").diagnostics)).toHaveLength(1);
  });
});

describe("failing towards legible", () => {
  it("keeps the prose of an island that never closes", () => {
    const { document, diagnostics } = parse(
      ["---", "title: T", "---", "", "Antes.", "", "```calamus", "node: kiosk"].join("\n")
    );
    const errors = errorsOf(diagnostics);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("never closes");
    expect(proseOf(paragraphs(document.body)[0].content)).toBe("Antes.");
    expect(document.body[1]).toEqual({ kind: "unknown", raw: "```calamus\nnode: kiosk" });
  });

  it("refuses arithmetic in an expression and still renders the paragraph", () => {
    const { document, diagnostics } = parse('---\ntitle: T\n---\n\n:with{when="part + 1 > 2"}\nLa prosa sigue aquí.\n');
    const errors = errorsOf(diagnostics);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("arithmetic");
    expect(errors[0].message).toContain("decision 26");
    expect(proseOf(paragraphs(document.body)[0].content)).toBe("La prosa sigue aquí.");
  });

  it("refuses an expression between braces and keeps it as text", () => {
    const { document, diagnostics } = parse("---\ntitle: T\n---\n\nQuedan {count(lines)} en pie.\n");
    const errors = errorsOf(diagnostics);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("never an expression");
    expect(proseOf(paragraphs(document.body)[0].content)).toBe("Quedan {count(lines)} en pie.");
  });

  it("refuses a directive it does not know and keeps the words inside it", () => {
    const { document, diagnostics } = parse("---\ntitle: T\n---\n\nEl inventario :whisper[una puerta]{kind=kept} entero.\n");
    const errors = errorsOf(diagnostics);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain(":whisper");
    expect(proseOf(paragraphs(document.body)[0].content)).toBe("El inventario una puerta entero.");
  });

  it("diagnoses front matter it cannot read and still reads the prose", () => {
    const { document, diagnostics } = parse(["---", "title: T", "this line is not a key", "---", "", "La prosa sobrevive."].join("\n"));
    const errors = errorsOf(diagnostics);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(3);
    expect(document.title).toBe("T");
    expect(proseOf(paragraphs(document.body)[0].content)).toBe("La prosa sobrevive.");
  });

  it("reads the whole document as prose when the front matter never closes", () => {
    const { document, diagnostics } = parse("---\ntitle: T\n\nUna línea.\n");
    expect(errorsOf(diagnostics)[0].message).toContain("never closes");
    expect(document.body.length).toBeGreaterThan(0);
  });

  it("never throws, whatever it is given", () => {
    for (const source of ["", "---", "---\n---", ":with{", "{", ":mark[", "```calamus", "---\ntitle: [\n---", "\u0000"]) {
      expect(() => parse(source)).not.toThrow();
    }
  });
});
