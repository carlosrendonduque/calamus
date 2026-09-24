/**
 * The expression language, the two gates and the derived names.
 *
 * Two things are being asserted throughout: that `visits()` counts repeats
 * rather than collecting a set (decision 26), and that nothing here throws —
 * what cannot be read comes back with a diagnostic and opens the gate it
 * guards (decision 28).
 */

import { describe, expect, it } from "vitest";
import type { Comparison, DerivationFn, Exit, Expression, GroupItem, NameDef, ReadingState } from "../src/document/types";
import {
  canEnter,
  canLeave,
  createScope,
  escapeAttribute,
  escapeText,
  evaluate,
  evaluateWithDiagnostics,
  resolveGroup,
  resolveName,
  resolveNameWithDiagnostics,
  truthy,
} from "../src/document/evaluator";

const read = (path: string): Expression => ({ kind: "read", path });
const lit = (value: string | number | boolean): Expression => ({ kind: "literal", value });
const compare = (op: Comparison, left: Expression, right: Expression): Expression => ({
  kind: "compare",
  op,
  left,
  right,
});
const count = (group: string, where?: Expression): Expression => ({ kind: "count", group, where });

const state = (partial: Partial<ReadingState> = {}): ReadingState => ({
  trail: [],
  variables: {},
  logs: {},
  readings: 1,
  ...partial,
});

const sheets = [
  { id: "A", floor: 70, open: true },
  { id: "B", floor: 45, open: false },
  { id: "C", floor: 80, open: true },
] as GroupItem[];

const listed = (items: GroupItem[]) => ({
  fields: Object.keys(items[0] ?? {}),
  discipline: { keeps: "duplicates" as const, removes: "none" as const, marks: [] },
  items,
});

describe("values and comparisons", () => {
  const scope = createScope({ state: state({ variables: { trust: 72, open: "", name: "A" } }) });

  it("reads a variable", () => {
    expect(evaluate(read("trust"), scope)).toBe(72);
  });

  it("compares numbers", () => {
    expect(evaluate(compare(">=", read("trust"), lit(70)), scope)).toBe(true);
    expect(evaluate(compare("<", read("trust"), lit(70)), scope)).toBe(false);
  });

  it("compares strings", () => {
    expect(evaluate(compare("==", read("name"), lit("A")), scope)).toBe(true);
    expect(evaluate(compare("!=", read("name"), lit("A")), scope)).toBe(false);
  });

  it("treats an empty string, a zero and an empty list as false", () => {
    expect(truthy("")).toBe(false);
    expect(truthy(0)).toBe(false);
    expect(truthy([])).toBe(false);
    expect(truthy("A")).toBe(true);
  });

  it("and, or, not", () => {
    expect(evaluate({ kind: "and", of: [lit(true), lit(true)] }, scope)).toBe(true);
    expect(evaluate({ kind: "and", of: [lit(true), lit(false)] }, scope)).toBe(false);
    expect(evaluate({ kind: "or", of: [lit(false), lit(true)] }, scope)).toBe(true);
    expect(evaluate({ kind: "not", of: read("open") }, scope)).toBe(true);
  });

  it("has no arithmetic at all, and no way to smuggle one in", () => {
    const kinds = ["literal", "read", "compare", "not", "and", "or", "visits", "visited", "count", "some"];
    expect(kinds).not.toContain("add");
    const nonsense = { kind: "add", of: [lit(1), lit(1)] } as unknown as Expression;
    const { value, diagnostics } = evaluateWithDiagnostics(nonsense, scope);
    expect(value).toBeUndefined();
    expect(diagnostics[0].severity).toBe("error");
  });
});

describe("visits", () => {
  const scope = createScope({
    state: state({ trail: ["platform", "stairs", "platform", "kiosk", "platform"] }),
  });

  it("counts repeats, and is not a set", () => {
    expect(evaluate({ kind: "visits", node: "platform" }, scope)).toBe(3);
    expect(evaluate({ kind: "visits", node: "stairs" }, scope)).toBe(1);
    expect(evaluate({ kind: "visits", node: "office" }, scope)).toBe(0);
  });

  it("answers visited() from the same count", () => {
    expect(evaluate({ kind: "visited", node: "kiosk" }, scope)).toBe(true);
    expect(evaluate({ kind: "visited", node: "office" }, scope)).toBe(false);
  });

  it("counts the node the trail ends on, without the schema spelling its name", () => {
    expect(evaluate({ kind: "visits", node: "here" }, scope)).toBe(3);
  });

  it("goes down again when the trail shortens", () => {
    const back = createScope({ state: state({ trail: ["platform", "stairs"] }) });
    expect(evaluate({ kind: "visits", node: "platform" }, back)).toBe(1);
  });
});

describe("counts over groups", () => {
  const scope = createScope({
    state: state({ variables: { trust: 60 }, logs: { read: [{ id: "r0", sheet: "A" }] as GroupItem[] } }),
    groups: { sheets: listed(sheets) },
  });

  it("counts a whole group", () => {
    expect(evaluate(count("sheets"), scope)).toBe(3);
  });

  it("counts a filtered group, the item's own fields in scope", () => {
    expect(evaluate(count("sheets", read("open")), scope)).toBe(2);
    expect(evaluate(count("sheets", { kind: "not", of: read("open") }), scope)).toBe(1);
  });

  it("compares a live variable against a field of the item", () => {
    expect(evaluate(count("sheets", compare(">=", read("trust"), read("floor"))), scope)).toBe(1);
  });

  it("answers some() without counting out loud", () => {
    expect(evaluate({ kind: "some", group: "sheets", where: read("open") }, scope)).toBe(true);
    expect(
      evaluate({ kind: "some", group: "sheets", where: compare("==", read("id"), lit("Z")) }, scope)
    ).toBe(false);
  });

  it("counts a log the same way it counts a group", () => {
    expect(evaluate(count("read"), scope)).toBe(1);
  });

  it("reports a group that does not exist instead of throwing", () => {
    const { value, diagnostics } = evaluateWithDiagnostics(count("nothing"), scope);
    expect(value).toBeUndefined();
    expect(diagnostics.map((one) => one.message).join()).toContain("nothing");
  });

  it("two counts over one group, filtered two ways, in place of a subtraction", () => {
    const standing = evaluate(count("sheets", read("open")), scope);
    const struck = evaluate(count("sheets", { kind: "not", of: read("open") }), scope);
    expect([standing, struck]).toEqual([2, 1]);
  });
});

describe("first, last and in", () => {
  const scope = createScope({
    state: state({ logs: { read: [{ id: "r0", sheet: "A" }, { id: "r1", sheet: "C" }] as GroupItem[] } }),
    groups: { sheets: listed(sheets) },
  });

  it("takes the first item matching a filter", () => {
    const first = { kind: "first", group: "sheets", where: { kind: "not", of: read("open") } } as unknown as Expression;
    expect(evaluate(first, scope)).toMatchObject({ id: "B" });
  });

  it("takes a field off the last entry", () => {
    const last = { kind: "last", group: "read", field: "sheet" } as unknown as Expression;
    expect(evaluate(last, scope)).toBe("C");
  });

  it("asks whether a log carries an entry for an item", () => {
    const inRead = (item: GroupItem): Expression =>
      ({ kind: "in", group: "read", of: { kind: "literal", value: item.id } }) as unknown as Expression;
    expect(evaluate(inRead(sheets[0]), scope)).toBe(true);
    expect(evaluate(inRead(sheets[1]), scope)).toBe(false);
  });
});

describe("derived names", () => {
  it("resolves an expression", () => {
    const scope = createScope({ state: state({ variables: { trust: 72 } }) });
    expect(resolveName({ kind: "expression", of: read("trust") }, scope)).toBe(72);
  });

  it("groups before it quantifies: the contradiction is inside one question", () => {
    const statements = [
      { id: "s1", claim: "door", holds: false },
      { id: "s2", claim: "door", holds: true },
      { id: "s3", claim: "entry", holds: false },
    ] as GroupItem[];
    const scope = createScope({ groups: { statements: listed(statements) } });
    const broken: NameDef = { kind: "grouped", over: "statements", by: "claim", test: "split" };
    expect(resolveName(broken, scope)).toEqual([{ id: "door", claim: "door" }]);
  });

  it("does not call two statements answering different questions a contradiction", () => {
    const statements = [
      { id: "s1", claim: "door", holds: false },
      { id: "s3", claim: "entry", holds: true },
    ] as GroupItem[];
    const scope = createScope({ groups: { statements: listed(statements) } });
    const broken: NameDef = { kind: "grouped", over: "statements", by: "claim", test: "split" };
    expect(resolveName(broken, scope)).toEqual([]);
  });

  it("answers the other side of the same question", () => {
    const statements = [
      { id: "s1", claim: "door", holds: true },
      { id: "s2", claim: "door", holds: true },
    ] as GroupItem[];
    const scope = createScope({ groups: { statements: listed(statements) } });
    const agreeing: NameDef = { kind: "grouped", over: "statements", by: "claim", test: "agree" };
    expect(resolveName(agreeing, scope)).toEqual([{ id: "door", claim: "door" }]);
  });

  it("asks the registry for a derivation and takes its items", () => {
    const scope = createScope({
      registry: {
        derivations: {
          // `DerivationFn` returns `{ items?: GroupItem[] } & Record<string, Scalar>`,
          // an intersection no literal can satisfy: `items` is not a Scalar.
          unstable: (() => ({ items: [{ id: "x" }] as GroupItem[] })) as unknown as DerivationFn,
        },
      },
    });
    const derived: NameDef = { kind: "derivation", name: "unstable", params: {} };
    expect(resolveName(derived, scope)).toEqual([{ id: "x" }]);
  });

  it("reports a derivation nobody registered", () => {
    const scope = createScope();
    const derived: NameDef = { kind: "derivation", name: "unstable", params: {} };
    const { value, diagnostics } = resolveNameWithDiagnostics(derived, scope);
    expect(value).toBeUndefined();
    expect(diagnostics[0].message).toContain("unstable");
  });

  it("stops a name that resolves through itself instead of hanging", () => {
    const scope = createScope({ names: { loop: { kind: "expression", of: read("loop") } } });
    const { value, diagnostics } = evaluateWithDiagnostics(read("loop"), scope);
    expect(value).toBeUndefined();
    expect(diagnostics.some((one) => one.message.includes("through itself"))).toBe(true);
  });
});

describe("groups resolved by name", () => {
  it("filters one group into another with a live variable", () => {
    const scope = createScope({
      state: state({ variables: { trust: 72 } }),
      groups: {
        account: listed(sheets),
        said: { of: "account", where: compare(">=", read("trust"), read("floor")) },
      },
    });
    expect(resolveGroup("said", scope).value?.map((item) => item.id)).toEqual(["A", "B"]);
  });
});

describe("the two gates", () => {
  const scope = createScope({ state: state({ trail: ["platform"], variables: { read: false } }) });

  it("lets a reader in when the node asks nothing", () => {
    expect(canEnter({}, scope)).toBe(true);
  });

  it("asks the node whether it may be entered", () => {
    expect(canEnter({ requires: compare(">", { kind: "visits", node: "platform" }, lit(0)) }, scope)).toBe(true);
    expect(canEnter({ requires: compare(">", { kind: "visits", node: "kiosk" }, lit(0)) }, scope)).toBe(false);
  });

  it("asks the exit whether it may be walked, which is a different question", () => {
    const open: Exit = { to: "platform", label: "back" };
    const unread: Exit = { to: "platform", label: "back", when: { kind: "not", of: read("read") } };
    const alreadyRead: Exit = { to: "platform", label: "back", when: read("read") };
    expect(canLeave(open, scope)).toBe(true);
    expect(canLeave(unread, scope)).toBe(true);
    expect(canLeave(alreadyRead, scope)).toBe(false);
  });

  it("opens rather than closes when the expression cannot be read at all", () => {
    expect(canEnter({ requires: read("nobody-declared-this") }, scope)).toBe(true);
    const broken: Exit = { to: "x", label: "x", when: count("no-such-group") };
    expect(canLeave(broken, scope)).toBe(true);
  });
});

describe("escaping", () => {
  it("escapes what makes markup, in a text position", () => {
    expect(escapeText("<script>&</script>")).toBe("&lt;script&gt;&amp;&lt;/script&gt;");
  });

  it("leaves an apostrophe alone, because it is prose in three languages", () => {
    expect(escapeText("the clerk's, l'intérieur")).toBe("the clerk's, l'intérieur");
  });

  it("escapes quotes in an attribute position, where they end the value", () => {
    expect(escapeAttribute(`a "b" c's`)).toBe("a &quot;b&quot; c&#39;s");
  });
});

describe("nothing throws", () => {
  const scope = createScope();

  it("survives rubbish where an expression should be", () => {
    for (const rubbish of [undefined, null, 3, "read", {}, []]) {
      expect(() => evaluate(rubbish as unknown as Expression, scope)).not.toThrow();
    }
  });

  it("survives a path that is not a path", () => {
    const { value, diagnostics } = evaluateWithDiagnostics(read("part + 1"), scope);
    expect(value).toBeUndefined();
    expect(diagnostics[0].severity).toBe("error");
  });
});
