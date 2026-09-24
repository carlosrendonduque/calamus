/**
 * The reading state machine, against the two documents that are hard:
 * `labyrinth`, whose trail keeps repeats and shortens again, and `reader-path`,
 * whose book marks what it will not remove. `footnotes` is here too, because
 * its chain pops.
 */

import { describe, expect, it } from "vitest";
import type { Expression, GroupDef, GroupItem, ReadingState } from "../src/document/types";
import type { Move, MoveContext } from "../src/document/evaluator";
import { applyMove, createScope, evaluate, initialState, reduce } from "../src/document/evaluator";

const read = (path: string): Expression => ({ kind: "read", path });
const count = (group: string, where?: Expression): Expression => ({ kind: "count", group, where });
const visits = (node: string): Expression => ({ kind: "visits", node });

const group = (
  fields: string[],
  keeps: "duplicates" | "unique",
  removes: "none" | "last" | "any",
  marks: string[] = []
): GroupDef => ({ fields, discipline: { keeps, removes, marks }, items: [] });

const walk = (state: ReadingState, moves: Move[], context?: MoveContext): ReadingState =>
  moves.reduce((carried, move) => reduce(carried, move, context), state);

const at = (state: ReadingState, groups?: Record<string, GroupDef>) =>
  createScope({ state, groups: groups ?? {} });

/* -------------------------------------------------------------------------- */

describe("the trail", () => {
  const context: MoveContext = { groups: { trail: group([], "duplicates", "last") } };

  it("opens with the starting node already in it", () => {
    const state = initialState({ trail: ["platform"] });
    expect(evaluate(visits("platform"), at(state))).toBe(1);
  });

  it("appends every entry, repeats and all", () => {
    const state = walk(initialState({ trail: ["platform"] }), [
      { kind: "enter", node: "stairs" },
      { kind: "enter", node: "platform" },
      { kind: "enter", node: "kiosk" },
      { kind: "enter", node: "platform" },
    ], context);
    expect(state.trail).toEqual(["platform", "stairs", "platform", "kiosk", "platform"]);
    expect(evaluate(visits("platform"), at(state))).toBe(3);
  });

  it("shortens when the reader steps back, so a count goes down with it", () => {
    const before = walk(initialState({ trail: ["platform"] }), [
      { kind: "enter", node: "stairs" },
      { kind: "enter", node: "platform" },
    ], context);
    expect(evaluate(visits("platform"), at(before))).toBe(2);
    const after = reduce(before, { kind: "back" }, context);
    expect(after.trail).toEqual(["platform", "stairs"]);
    expect(evaluate(visits("platform"), at(after))).toBe(1);
  });

  it("keeps the reader somewhere: there is no standing in no node", () => {
    const state = initialState({ trail: ["platform"] });
    const { value, diagnostics } = applyMove(state, { kind: "back" }, context);
    expect(value.trail).toEqual(["platform"]);
    expect(diagnostics).toHaveLength(1);
  });

  it("returns to the start when an exit says so", () => {
    const state = walk(initialState({ trail: ["platform"] }), [
      { kind: "enter", node: "stairs" },
      { kind: "enter", node: "tunnel" },
      { kind: "reset", trail: ["platform"] },
    ], context);
    expect(state.trail).toEqual(["platform"]);
    expect(evaluate(visits("tunnel"), at(state))).toBe(0);
  });
});

describe("a log keeps what its discipline says it keeps", () => {
  it("keeps duplicates by default, which is what counting by appending needs", () => {
    const context: MoveContext = { groups: { chosen: group(["door"], "duplicates", "none") } };
    const state = walk(initialState(), [
      { kind: "add", log: "chosen", entry: { door: "north" } },
      { kind: "add", log: "chosen", entry: { door: "north" } },
      { kind: "add", log: "chosen", entry: { door: "south" } },
    ], context);
    expect(state.logs.chosen).toHaveLength(3);
    expect(evaluate(count("chosen"), at(state))).toBe(3);
  });

  it("keeps a sheet once, which is what keeps decision 26 out of arithmetic", () => {
    const context: MoveContext = { groups: { read: group(["sheet"], "unique", "none") } };
    const state = walk(initialState({ logs: { read: [{ id: "r0", sheet: "A" }] as GroupItem[] } }), [
      { kind: "add", log: "read", entry: { sheet: "B" } },
      { kind: "add", log: "read", entry: { sheet: "A" } },
      { kind: "add", log: "read", entry: { sheet: "B" } },
    ], context);
    expect(state.logs.read).toHaveLength(2);
    // "2 of 3 sheets opened", counted and never subtracted.
    expect(evaluate(count("read"), at(state))).toBe(2);
  });
});

describe("a log removes only the way its discipline says", () => {
  it("removes nothing when the porter rubs nothing out", () => {
    const context: MoveContext = { groups: { book: group(["place"], "duplicates", "none", ["struck"]) } };
    const state = walk(initialState(), [{ kind: "add", log: "book", entry: { place: "the map case" } }], context);
    const { value, diagnostics } = applyMove(state, { kind: "remove", log: "book" }, context);
    expect(value.logs.book).toHaveLength(1);
    expect(diagnostics[0].severity).toBe("warning");
  });

  it("takes the last note off the chain, and only the last", () => {
    const context: MoveContext = { groups: { chain: group(["note"], "unique", "last") } };
    const state = walk(initialState(), [
      { kind: "add", log: "chain", entry: { note: "n1" } },
      { kind: "add", log: "chain", entry: { note: "n11" } },
      { kind: "add", log: "chain", entry: { note: "n11a" } },
    ], context);
    expect(evaluate(count("chain"), at(state))).toBe(3);
    const backed = reduce(state, { kind: "remove", log: "chain" }, context);
    expect(backed.logs.chain.map((entry) => entry.note)).toEqual(["n1", "n11"]);
    const refused = applyMove(backed, { kind: "remove", log: "chain", address: { match: { note: "n1" } } }, context);
    expect(refused.value.logs.chain).toHaveLength(2);
    expect(refused.diagnostics[0].severity).toBe("warning");
  });

  it("takes a checkbox off by identity, which is not the same as by being last", () => {
    const context: MoveContext = { groups: { held: group(["statement"], "unique", "any") } };
    const state = walk(initialState(), [
      { kind: "add", log: "held", entry: { statement: "s1" } },
      { kind: "add", log: "held", entry: { statement: "s2" } },
      { kind: "add", log: "held", entry: { statement: "s3" } },
    ], context);
    const after = reduce(state, { kind: "remove", log: "held", address: { match: { statement: "s2" } } }, context);
    expect(after.logs.held.map((entry) => entry.statement)).toEqual(["s1", "s3"]);
  });
});

describe("a log marks what it will not remove", () => {
  const context: MoveContext = { groups: { book: group(["place", "struck"], "duplicates", "none", ["struck"]) } };
  const written = walk(initialState(), [
    { kind: "add", log: "book", entry: { place: "the reading room", struck: false } },
    { kind: "add", log: "book", entry: { place: "the map case", struck: false } },
    { kind: "add", log: "book", entry: { place: "the annex stair", struck: false } },
  ], context);

  it("writes a field of an entry already written", () => {
    const after = reduce(
      written,
      { kind: "mark", log: "book", field: "struck", value: true, address: { match: { struck: false } } },
      context
    );
    expect(after.logs.book.map((entry) => entry.struck)).toEqual([false, false, true]);
    expect(after.logs.book).toHaveLength(3);
  });

  it("counts the two sides of the book without subtracting one from the other", () => {
    const after = reduce(
      written,
      { kind: "mark", log: "book", field: "struck", value: true, address: { match: { struck: false } } },
      context
    );
    const scope = at(after);
    expect(evaluate(count("book", { kind: "not", of: read("struck") }), scope)).toBe(2);
    expect(evaluate(count("book", read("struck")), scope)).toBe(1);
    expect(evaluate(count("book"), scope)).toBe(3);
  });

  it("refuses a field the author did not declare markable", () => {
    const { value, diagnostics } = applyMove(
      written,
      { kind: "mark", log: "book", field: "place", value: "somewhere else" },
      context
    );
    expect(value).toBe(written);
    expect(diagnostics[0].message).toContain("place");
  });
});

describe("resets, readings and gestures", () => {
  it("resets to the destination it was given, which is not zero and not opens:", () => {
    const state = walk(initialState({ logs: { readings: 2, chosen: [{ id: "c0", door: "north" }] as GroupItem[] } }), [
      { kind: "add", log: "readings", entry: {} },
      { kind: "reset", logs: { readings: 1, chosen: [] } },
    ]);
    expect(state.logs.readings).toHaveLength(1);
    expect(state.logs.chosen).toHaveLength(0);
  });

  it("opens a log at a literal length rather than making the author write blanks", () => {
    const state = initialState({ logs: { readings: 2 } });
    expect(state.logs.readings).toHaveLength(2);
    expect(evaluate(count("readings"), at(state))).toBe(2);
  });

  it("opens mid-reading, with a variable already seeded", () => {
    const state = initialState({ variables: { note: "left on an earlier visit" }, readings: 2 });
    expect(state.variables.note).toBe("left on an earlier visit");
    expect(state.readings).toBe(2);
    expect(reduce(state, { kind: "read" }).readings).toBe(3);
  });

  it("carries three effects in one gesture", () => {
    const context: MoveContext = { groups: { chain: group(["note"], "unique", "last"), jumps: group(["way"], "duplicates", "none") } };
    const state = walk(initialState(), [{ kind: "add", log: "chain", entry: { note: "n1" } }], context);
    const after = reduce(
      state,
      {
        kind: "gesture",
        moves: [
          { kind: "reset", logs: { chain: [] } },
          { kind: "add", log: "chain", entry: { note: "n1" } },
          { kind: "set", name: "away", value: "note" },
        ],
      },
      context
    );
    expect(after.logs.chain).toHaveLength(1);
    expect(after.variables.away).toBe("note");
  });
});

describe("the machine is pure", () => {
  const before = initialState({ trail: ["platform"], logs: { book: [{ id: "b0", place: "here" }] as GroupItem[] } });

  it("never writes on the state it was given", () => {
    const snapshot = JSON.stringify(before);
    reduce(before, { kind: "enter", node: "stairs" });
    reduce(before, { kind: "add", log: "book", entry: { place: "there" } });
    reduce(before, { kind: "set", name: "trust", value: 10 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("hands back the same state and a diagnostic when a move makes no sense", () => {
    const { value, diagnostics } = applyMove(before, { kind: "fly" } as unknown as Move);
    expect(value).toBe(before);
    expect(diagnostics[0].severity).toBe("error");
  });

  it("does not throw on rubbish", () => {
    for (const rubbish of [undefined, null, 3, "enter", {}]) {
      expect(() => reduce(before, rubbish as unknown as Move)).not.toThrow();
    }
  });
});
