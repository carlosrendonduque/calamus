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
    const raw = ["```calamus", "engraving:", "  - plate: iv", "    caption: The north stair", "```"].join("\n");
    const { document, diagnostics } = parse(["---", "title: T", "---", "", raw].join("\n"));
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(document.body).toEqual([{ kind: "unknown", raw }]);
    expect(diagnostics.some((d) => d.severity === "warning" && d.message.includes("engraving"))).toBe(true);
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

/* -------------------------------------------------------------------------- */
/* What the contract holds and the parser had not caught up with               */
/* -------------------------------------------------------------------------- */

const document = (...lines: string[]) => parse(lines.join("\n"));

const warningsOf = (diagnostics: Diagnostic[]) =>
  diagnostics.filter((diagnostic) => diagnostic.severity === "warning");

describe("nodes and exits", () => {
  it("keeps a node's title and an exit's note and resets", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      "```calamus",
      "node: platform",
      "title: Platform six",
      "exits:",
      '  - { to: stairs, label: Take the stairs down, note: "{seen}" }',
      "  - { to: start, label: Return to the start, resets: trail }",
      "```",
      "",
      "Aquí.",
    );
    expect(diagnostics).toEqual([]);
    const node: NodeDef = read.nodes[0];
    expect(node.title).toBe("Platform six");
    expect(node.exits[0].note).toBe("{seen}");
    expect(node.exits[0].resets).toBeUndefined();
    expect(node.exits[1].resets).toEqual(["trail"]);
  });

  it("reads a node reached by a path, not only one named outright", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "phrases:",
      "  seen:",
      "    of: exit",
      "    cases:",
      '      - { when: "visited(exit.to)", say: seen }',
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.phrases.seen.cases![0].when).toEqual({ kind: "visited", node: "exit.to" });
  });
});

describe("paragraph attributes", () => {
  it("keeps the politeness an author asks a live region for", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      ":with{live=polite}",
      "Uno.",
      "",
      ":with{live}",
      "Dos.",
      "",
      ":with{live=false}",
      "Tres.",
    );
    expect(diagnostics).toEqual([]);
    expect(paragraphs(read.body).map((block) => block.attrs.live)).toEqual(["polite", true, false]);
  });

  it("keeps a role the author names, which is not a weight", () => {
    const { document: read, diagnostics } = document("---", "title: T", "---", "", ":with{role=time}", "03:14");
    expect(diagnostics).toEqual([]);
    expect(paragraphs(read.body)[0].attrs).toEqual({ role: "time" });
  });
});

describe("the expression operators the contract holds", () => {
  const expressionOf = (source: string) => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "names:",
      `  n: ${source}`,
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    const name = read.names.n;
    return name.kind === "expression" ? name.of : null;
  };

  it("reads `first` and `last` over a group, filtered or whole", () => {
    expect(expressionOf("first(lenses where id == lens)")).toEqual({
      kind: "first",
      group: "lenses",
      where: { kind: "compare", op: "==", left: { kind: "read", path: "id" }, right: { kind: "read", path: "lens" } },
    });
    expect(expressionOf("last(chain)")).toEqual({ kind: "last", group: "chain" });
  });

  it("reads `in` as membership, which takes a group and a value", () => {
    expect(expressionOf('"in(held, item)"')).toEqual({
      kind: "in",
      group: "held",
      value: { kind: "read", path: "item" },
    });
  });

  it("nests `in` inside the filter of another call", () => {
    expect(expressionOf('"first(exhibits where not in(read, item))"')).toEqual({
      kind: "first",
      group: "exhibits",
      where: { kind: "not", of: { kind: "in", group: "read", value: { kind: "read", path: "item" } } },
    });
  });

  it("reads `persisted`, named or asking after the store itself", () => {
    expect(expressionOf("persisted()")).toEqual({ kind: "persisted", name: "" });
    expect(expressionOf("persisted(note)")).toEqual({ kind: "persisted", name: "note" });
  });

  it("reads a path of more than one dot as one path", () => {
    expect(expressionOf("item.note.child")).toEqual({ kind: "read", path: "item.note.child" });
    const { document: read, diagnostics } = document("---", "title: T", "---", "", "Dice {item.note.mark}.");
    expect(diagnostics).toEqual([]);
    expect(paragraphs(read.body)[0].content[1]).toEqual({ kind: "interpolation", path: "item.note.mark" });
  });
});

describe("the declared vocabularies", () => {
  it("keeps a mark declaration whole and follows only its registry name", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "marks:",
      '  withdrawn: { as: strike, when: "item.struck", note: withdrawn }',
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.marks.withdrawn).toEqual({ as: "strike", when: "item.struck", note: "withdrawn" });
    expect(read.uses).toContainEqual({ name: "strike", kind: "marks" });
  });

  it("keeps what a move writes, and the rest of the gesture beside it", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "moves:",
      "  cross-to:",
      "    writes: [book]",
      '    logs: { book: { place: "{item.place}" } }',
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.moves["cross-to"].writes).toEqual(["book"]);
    expect(read.moves["cross-to"]).toMatchObject({ logs: { book: { place: "{item.place}" } } });
  });

  it("keeps a condition on a mark inside a sentence", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      "El inventario lista una :mark[puerta]{kind=kept when=keeping} en el rellano.",
    );
    expect(diagnostics).toEqual([]);
    const mark = paragraphs(read.body)[0].content[1] as Extract<Inline, { kind: "mark" }>;
    expect(mark.markKind).toBe("kept");
    expect(mark.when).toEqual({ kind: "read", path: "keeping" });
  });
});

describe("groups, names, phrases and variables", () => {
  it("reads a group that is a filtered view of another", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "groups:",
      '  said: { of: account, where: "trust >= keep" }',
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.groups.said.derivedFrom).toEqual({
      group: "account",
      where: { kind: "compare", op: ">=", left: { kind: "read", path: "trust" }, right: { kind: "read", path: "keep" } },
    });
    expect(read.groups.said.items).toEqual([]);
  });

  it("keeps the author's field carrying the answer of a grouping", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "names:",
      "  broken: { over: chosen, by: claim, answer: holds, test: split }",
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.names.broken).toEqual({
      kind: "grouped",
      over: "chosen",
      by: "claim",
      answer: "holds",
      test: "split",
    });
  });

  it("reads `is: true` as the sugar it is, without writing it out", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "phrases:",
      "  label:",
      "    on: inside",
      "    cases:",
      "      - { is: true, say: Hide these words again }",
      "      - { say: Reveal the redacted words }",
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.phrases.label.cases![0]).toEqual({ is: true, say: "Hide these words again" });
  });

  it("reads a joined list in the nested form the contract holds", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "phrases:",
      "  closed-behind:",
      "    list:",
      "      of: taken",
      "      field: name",
      '      sep: ", "',
      "    cases:",
      '      - { say: "{closed-behind.list}" }',
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.phrases["closed-behind"].list).toEqual({ of: "taken", field: "name", sep: ", " });
  });

  it("reads the flat spelling of a joined list as the same thing, and says so", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "phrases:",
      "  joined:",
      "    list: taken",
      "    field: name",
      '    sep: ", "',
      '    last: ", and "',
      "    cases:",
      '      - { say: "{joined.list}" }',
      "---",
      "",
      "P.",
    );
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(read.phrases.joined.list).toEqual({ of: "taken", field: "name", sep: ", ", last: ", and " });
    expect(warningsOf(diagnostics)).toHaveLength(1);
  });

  it("keeps the label of a control, which is prose someone reads", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "variables:",
      "  gutter:",
      "    type: number",
      "    default: 28",
      "    control: range",
      "    unit: px",
      "    label: Cuánto se ha borrado",
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.variables.gutter).toEqual({
      type: "number",
      default: 28,
      control: "range",
      unit: "px",
      label: "Cuánto se ha borrado",
    });
  });

  it("opens with a log already holding entries and a variable already moved", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "opens:",
      "  readings: 2",
      "  logs:",
      "    chosen: [{ door: north }]",
      "    readings: 2",
      "  variables:",
      "    note: Una línea de antes.",
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.opens).toEqual({
      readings: 2,
      logs: { chosen: [{ door: "north" }], readings: 2 },
      variables: { note: "Una línea de antes." },
    });
  });
});

describe("the islands the format opens", () => {
  it("gives an `each` island its order and the prose of its empty branch", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      "```calamus",
      "each: exits",
      "order: unstable",
      "empty: |",
      "  Ya no queda nada que tomar.",
      "```",
      "",
      "Sale por {item.label}.",
      "",
      "```calamus",
      "end",
      "```",
    );
    expect(diagnostics).toEqual([]);
    const each = read.body[0] as Extract<Block, { kind: "each" }>;
    expect(each.group).toBe("exits");
    expect(each.order).toBe("unstable");
    expect(proseOf(paragraphs(each.empty!)[0].content)).toBe("Ya no queda nada que tomar.");
    expect(proseOf(paragraphs(each.body)[0].content)).toBe("Sale por {item.label}.");
    expect(read.uses).toContainEqual({ name: "unstable", kind: "orders" });
  });

  it("opens a region with its own island, as a node opens a node", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      "```calamus",
      "region: nota-3",
      "```",
      "",
      "El texto que se despliega al tocarla.",
      "",
      "```calamus",
      "end",
      "```",
      "",
      "Fuera.",
    );
    expect(diagnostics).toEqual([]);
    const region = read.body[0] as Extract<Block, { kind: "region" }>;
    expect(region.kind).toBe("region");
    expect(region.id).toBe("nota-3");
    expect(proseOf(paragraphs(region.body)[0].content)).toBe("El texto que se despliega al tocarla.");
    expect(proseOf(paragraphs(read.body)[0].content)).toBe("Fuera.");
  });

  it("makes a button of each control of a `controls:` island", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      "```calamus",
      "controls:",
      "  - move: turn-to-next",
      "    label: Open the next unread sheet",
      '    when: "seen < total"',
      "```",
    );
    expect(diagnostics).toEqual([]);
    expect(read.body).toEqual([
      {
        kind: "affordance",
        action: "do",
        target: "turn-to-next",
        label: "Open the next unread sheet",
        when: {
          kind: "compare",
          op: "<",
          left: { kind: "read", path: "seen" },
          right: { kind: "read", path: "total" },
        },
      },
    ]);
  });

  it("keeps the label of a control whose gesture `Move` cannot carry", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      "```calamus",
      "controls:",
      "  - move: { removes: chain }",
      "    label: Back up one note",
      "```",
    );
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(read.body).toEqual([{ kind: "affordance", action: "do", target: "", label: "Back up one note" }]);
    expect(warningsOf(diagnostics)).toHaveLength(1);
    expect(warningsOf(diagnostics)[0].message).toContain("removes");
  });
});

describe("an affordance standing on its own", () => {
  it("makes a block of a labelled directive that is the whole paragraph", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      ':do{move=forget label="Olvídame" when="readings > 1"}',
    );
    expect(diagnostics).toEqual([]);
    expect(read.body).toEqual([
      {
        kind: "affordance",
        action: "do",
        target: "forget",
        label: "Olvídame",
        when: { kind: "compare", op: ">", left: { kind: "read", path: "readings" }, right: { kind: "literal", value: 1 } },
      },
    ]);
  });

  it("leaves an affordance inside a sentence inline, where its prose is", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      "El pasillo :go{show=note-3 focus=true} sigue hasta el fondo.",
    );
    expect(diagnostics).toEqual([]);
    const paragraph = paragraphs(read.body)[0];
    expect(paragraph.content[1]).toEqual({ kind: "affordance", action: "show", target: "note-3", focus: true, children: [] });
  });
});

/* -------------------------------------------------------------------------- */
/* The second catch-up: what the contract gained after the first pass          */
/* -------------------------------------------------------------------------- */

describe("a variable the reader can move", () => {
  it("reads where the control sits, its step and its rows", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "variables:",
      "  note:",
      "    type: string",
      '    default: ""',
      "    control: text",
      "    control-at: panel",
      "    label: A line for your next visit",
      "    rows: 3",
      "  gutter:",
      "    type: number",
      "    default: 28",
      "    control: range",
      "    step: 2",
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.variables.note).toMatchObject({ placement: "panel", rows: 3, label: "A line for your next visit" });
    expect(read.variables.gutter.step).toBe(2);
  });

  it("reads `control-label` as the one label a control has", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "variables:",
      "  cols: { type: number, default: 2, control: choice, control-label: Column count }",
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.variables.cols.label).toBe("Column count");
  });

  it("tells the options themselves from the group they come from", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "variables:",
      "  cols: { type: enum, of: [1, 2, 3], default: 2 }",
      "  lens: { type: enum, of: lenses, default: haunting }",
      "---",
      "",
      "P.",
    );
    expect(diagnostics).toEqual([]);
    expect(read.variables.cols.of).toEqual([1, 2, 3]);
    expect(read.variables.cols.optionsFrom).toBeUndefined();
    expect(read.variables.lens.optionsFrom).toBe("lenses");
    expect(read.variables.lens.of).toBeUndefined();
  });

  it("reads a label per option, and says so when there is one clause for all", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "variables:",
      "  lens:",
      "    type: enum",
      "    of: [haunting, grief]",
      "    default: haunting",
      "    option-label: { haunting: as haunting, grief: as grief }",
      "  voice:",
      "    type: enum",
      "    of: voices",
      "    default: surveyor",
      '    option-label: "{item.who}"',
      "---",
      "",
      "P.",
    );
    expect(errorsOf(diagnostics)).toEqual([]);
    expect(read.variables.lens.optionLabels).toEqual({ haunting: "as haunting", grief: "as grief" });
    expect(read.variables.voice.optionLabels).toBeUndefined();
    expect(warningsOf(diagnostics)).toHaveLength(1);
    expect(warningsOf(diagnostics)[0].message).toContain("{item.who}");
  });
});

describe("what a loop and a region carry", () => {
  it("gives an `each` island its heading, its label and the attributes of a paragraph", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      "```calamus",
      "each: points",
      "heading: Transcript of the call",
      "label: Transcript of the call",
      "live: polite",
      "id: column-one",
      "```",
      "",
      "{item.transcript}",
      "",
      "```calamus",
      "end",
      "```",
    );
    expect(diagnostics).toEqual([]);
    const each = read.body[0] as Extract<Block, { kind: "each" }>;
    expect(each.heading).toBe("Transcript of the call");
    expect(each.label).toBe("Transcript of the call");
    expect(each.attrs).toEqual({ live: "polite", id: "column-one" });
  });

  it("gives a region island the attributes of a paragraph, its own id apart", () => {
    const { document: read, diagnostics } = document(
      "---",
      "title: T",
      "---",
      "",
      "```calamus",
      "region: quotation",
      'voice: "{speaking.id}"',
      "live: polite",
      "```",
      "",
      "La cita.",
      "",
      "```calamus",
      "end",
      "```",
    );
    expect(diagnostics).toEqual([]);
    const region = read.body[0] as Extract<Block, { kind: "region" }>;
    expect(region.id).toBe("quotation");
    expect(region.attrs).toEqual({ voice: "{speaking.id}", live: "polite" });
  });
});

describe("a gesture spelled out where the control stands", () => {
  const controls = (...island: string[]) =>
    document("---", "title: T", "---", "", "```calamus", "controls:", ...island, "```");

  it("reads a reset, a set and a log grown by one entry", () => {
    const { document: read, diagnostics } = controls(
      "  - resets: book",
      "    label: Close the book",
      '  - sets: { open: "" }',
      "    label: Shut the envelope",
      "  - logs: { readings: {} }",
      "    label: Read it again",
    );
    expect(diagnostics).toEqual([]);
    const gestures = (read.body as Extract<Block, { kind: "affordance" }>[]).map((block) => block.gesture);
    expect(gestures).toEqual([
      [{ kind: "reset", names: ["book"] }],
      [{ kind: "set", name: "open", value: "" }],
      [{ kind: "add", log: "readings", entry: {} }],
    ]);
  });

  it("reads a mark on an entry of a log, named by the entry it marks", () => {
    const { document: read, diagnostics } = controls(
      "  - mark: { log: book, entry: here, field: struck }",
      "    label: Withdraw the last line",
      '    when: "standing > 0"',
    );
    expect(diagnostics).toEqual([]);
    const control = read.body[0] as Extract<Block, { kind: "affordance" }>;
    expect(control.gesture).toEqual([{ kind: "mark", log: "book", field: "struck", address: { at: "here" } }]);
    expect(control.label).toBe("Withdraw the last line");
    expect(control.when).toBeDefined();
  });

  it("keeps a declared move as the target and spells nothing out", () => {
    const { document: read, diagnostics } = controls("  - move: turn-to-next", "    label: Open the next sheet");
    expect(diagnostics).toEqual([]);
    expect(read.body[0]).toEqual({
      kind: "affordance",
      action: "do",
      target: "turn-to-next",
      label: "Open the next sheet",
    });
  });

  it("reads a `move:` whose value is the gesture itself", () => {
    const { document: read, diagnostics } = controls(
      '  - move: { sets: { open: "" } }',
      "    label: Shut it",
    );
    expect(diagnostics).toEqual([]);
    const control = read.body[0] as Extract<Block, { kind: "affordance" }>;
    expect(control.target).toBe("");
    expect(control.gesture).toEqual([{ kind: "set", name: "open", value: "" }]);
  });
});
