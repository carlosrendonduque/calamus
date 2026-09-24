/**
 * How a phrase chooses its clause, and how a clause is filled.
 *
 * The corpus proves the construction; this file pins the mechanism: ordered
 * cases with the first match winning, `is:` as sugar, `of:` as the phrase's
 * subject, `plural:` as a delegation to the registry, and interpolation that is
 * always escaped, never recursive and never silent about what it could not find.
 */

import { describe, expect, it } from "vitest";
import type { Expression, GroupItem, PluralFn } from "../src/document/types";
import type { PhraseLike } from "../src/document/evaluator";
import {
  createScope,
  interpolate,
  interpolateWithDiagnostics,
  resolvePhrase,
  resolvePhraseWithDiagnostics,
} from "../src/document/evaluator";

const read = (path: string): Expression => ({ kind: "read", path });
const lit = (value: string | number | boolean): Expression => ({ kind: "literal", value });

describe("ordered cases", () => {
  const phrase: PhraseLike = {
    on: "n",
    cases: [
      { is: 0, say: "none" },
      { is: 1, say: "one" },
      { say: "many" },
    ],
  };
  const at = (n: number) => createScope({ state: { trail: [], variables: { n }, logs: {}, readings: 1 } });

  it("takes the first case that matches", () => {
    expect(resolvePhrase(phrase, at(0))).toBe("none");
    expect(resolvePhrase(phrase, at(1))).toBe("one");
    expect(resolvePhrase(phrase, at(9))).toBe("many");
  });

  it("is: n is sugar for when: on == n, and order decides when both could match", () => {
    const shadowed: PhraseLike = {
      on: "n",
      cases: [{ when: { kind: "compare", op: ">", left: read("n"), right: lit(0) }, say: "some" }, { is: 1, say: "one" }],
    };
    expect(resolvePhrase(shadowed, at(1))).toBe("some");
  });

  it("matches a boolean, because a two-state label dispatches on one", () => {
    const label: PhraseLike = { on: "shown", cases: [{ is: true, say: "hide" }, { say: "show" }] };
    const on = createScope({ state: { trail: [], variables: { shown: true }, logs: {}, readings: 1 } });
    const off = createScope({ state: { trail: [], variables: { shown: false }, logs: {}, readings: 1 } });
    expect(resolvePhrase(label, on)).toBe("hide");
    expect(resolvePhrase(label, off)).toBe("show");
  });

  it("wants both when a case carries both", () => {
    const both: PhraseLike = {
      on: "n",
      cases: [{ is: 1, when: read("polite"), say: "one, politely" }, { say: "one" }],
    };
    const polite = createScope({ state: { trail: [], variables: { n: 1, polite: true }, logs: {}, readings: 1 } });
    const blunt = createScope({ state: { trail: [], variables: { n: 1, polite: false }, logs: {}, readings: 1 } });
    expect(resolvePhrase(both, polite)).toBe("one, politely");
    expect(resolvePhrase(both, blunt)).toBe("one");
  });

  it("prints a clause rather than nothing when no case matches", () => {
    const short: PhraseLike = { on: "n", cases: [{ is: 1, say: "one" }] };
    const { value, diagnostics } = resolvePhraseWithDiagnostics(short, at(4));
    expect(value).toBe("one");
    expect(diagnostics.some((one) => one.severity === "warning")).toBe(true);
  });

  it("shows a clause whose condition could not be read", () => {
    const broken: PhraseLike = { cases: [{ when: read("nobody-declared-this"), say: "shown" }, { say: "hidden" }] };
    expect(resolvePhrase(broken, at(0))).toBe("shown");
  });
});

describe("of: — the subject of the phrase", () => {
  const item = { id: "a1", floor: 70, plain: "plainly", hedged: "hedged" } as GroupItem;
  const clause: PhraseLike = {
    of: "item",
    cases: [
      { when: { kind: "compare", op: ">=", left: read("trust"), right: read("item.floor") }, say: "{item.plain}" },
      { say: "{item.hedged}" },
    ],
  };
  const at = (trust: number) =>
    createScope({ subject: item, state: { trail: [], variables: { trust }, logs: {}, readings: 1 } });

  it("compares a live variable against a field of what it is printed on", () => {
    expect(resolvePhrase(clause, at(90))).toBe("plainly");
    expect(resolvePhrase(clause, at(10))).toBe("hedged");
  });

  it("lets the author name the subject, because the name is the author's", () => {
    const fila: PhraseLike = { of: "fila", cases: [{ say: "{fila.plain}" }] };
    expect(resolvePhrase(fila, at(90))).toBe("plainly");
  });

  it("dispatches on the subject itself when there is no on:", () => {
    const option: PhraseLike = { of: "option", cases: [{ is: 1, say: "1 column" }, { say: "{option} columns" }] };
    expect(resolvePhrase(option, createScope({ subject: 1 }))).toBe("1 column");
    expect(resolvePhrase(option, createScope({ subject: 3 }))).toBe("3 columns");
  });
});

describe("plural: — a selector from the registry", () => {
  /** Two bands, the way a Slavic language wants them: one, and everything else. */
  const bands: PluralFn = (n) => (n === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 ? 1 : 2);

  const phrase: PhraseLike = {
    on: "n",
    plural: "bands",
    cases: [{ say: "one" }, { say: "a few" }, { say: "many" }],
  };
  const at = (n: number, registered = true) =>
    createScope({
      state: { trail: [], variables: { n }, logs: {}, readings: 1 },
      registry: registered ? { plurals: { bands } } : {},
    });

  it("asks the selector for the case index", () => {
    expect(resolvePhrase(phrase, at(1))).toBe("one");
    expect(resolvePhrase(phrase, at(3))).toBe("a few");
    expect(resolvePhrase(phrase, at(11))).toBe("many");
  });

  it("falls back to ordered matching, and says so, when nobody registered it", () => {
    const { value, diagnostics } = resolvePhraseWithDiagnostics(phrase, at(3, false));
    expect(value).toBe("one");
    expect(diagnostics.some((one) => one.message.includes("bands"))).toBe(true);
  });

  it("matches exactly when no selector is declared at all", () => {
    const exact: PhraseLike = { on: "n", cases: [{ is: 1, say: "one" }, { say: "{n} times" }] };
    expect(resolvePhrase(exact, at(1))).toBe("one");
    expect(resolvePhrase(exact, at(2))).toBe("2 times");
  });
});

describe("interpolation", () => {
  const item = { id: "a1", place: "the annex stair", anchor: "note" } as GroupItem;
  const anchors = [{ id: "note", label: "note 4.2" }] as GroupItem[];
  const scope = createScope({
    state: { trail: [], variables: { standing: 3, note: "" }, logs: {}, readings: 1 },
    groups: {
      anchors: { fields: ["label"], discipline: { keeps: "duplicates", removes: "none", marks: [] }, items: anchors },
    },
    bindings: { entry: item },
  });

  it("fills a name", () => {
    expect(interpolate("Quedan {standing} líneas", scope)).toBe("Quedan 3 líneas");
  });

  it("fills a path of one dot", () => {
    expect(interpolate("in {entry.place}", scope)).toBe("in the annex stair");
  });

  it("fills a path of two dots, resolving a field that references another group", () => {
    expect(interpolate("down to {entry.anchor.label}", scope)).toBe("down to note 4.2");
  });

  it("leaves a name it cannot resolve standing, rather than printing nothing", () => {
    const { value, diagnostics } = interpolateWithDiagnostics("a {missing} b", scope);
    expect(value).toBe("a {missing} b");
    expect(diagnostics.some((one) => one.severity === "error")).toBe(true);
  });

  it("leaves anything that is not a path standing, which is where arithmetic dies", () => {
    expect(interpolate("step {part + 1}.", scope)).toBe("step {part + 1}.");
    expect(interpolate("{count(sheets)}", scope)).toBe("{count(sheets)}");
  });

  it("escapes what it fills in", () => {
    const hostile = createScope({
      state: { trail: [], variables: { note: "<script>alert(1)</script> & more" }, logs: {}, readings: 1 },
    });
    expect(interpolate("«{note}»", hostile)).toBe(
      "«&lt;script&gt;alert(1)&lt;/script&gt; &amp; more»"
    );
  });

  it("never interpolates what it interpolated", () => {
    const quoting = createScope({
      state: { trail: [], variables: { note: "{standing}", standing: 3 }, logs: {}, readings: 1 },
    });
    expect(interpolate("«{note}»", quoting)).toBe("«{standing}»");
  });

  it("prints an empty variable as empty, which is not the same as not resolving", () => {
    expect(interpolate("«{note}»", scope)).toBe("«»");
  });

  it("resolves a phrase named in a clause, because a clause is authored text", () => {
    const withPhrase = createScope({
      state: { trail: [], variables: { standing: 1 }, logs: {}, readings: 1 },
      phrases: {
        "lines-standing": { on: "standing", cases: [{ is: 1, say: "Queda una línea" }, { say: "Quedan {standing} líneas" }] },
      },
    });
    expect(interpolate("{lines-standing} en pie.", withPhrase)).toBe("Queda una línea en pie.");
  });

  it("stops a phrase that prints itself", () => {
    const looping = createScope({
      phrases: { loop: { cases: [{ say: "{loop}" }] } },
    });
    const { value, diagnostics } = interpolateWithDiagnostics("{loop}", looping);
    expect(value).toBe("{loop}");
    expect(diagnostics.some((one) => one.severity === "error")).toBe(true);
  });
});
