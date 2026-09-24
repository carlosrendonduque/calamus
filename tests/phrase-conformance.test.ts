/**
 * The acceptance suite: every reader-facing clause of `docs/conformance-v1`,
 * in Spanish, English and French, asserted as an exact string.
 *
 * The Spanish rows are the point of the construction: the number lives in the
 * verb and the verb comes before the noun, `ninguna`/`una` is gender, `vez`/
 * `veces` is a stem, and `tachadas` agrees ten words from the number that
 * decides it. Every one of them is a whole clause here, and none of them is a
 * root with a suffix.
 */

import { describe, expect, it } from "vitest";
import type { Comparison, Expression, GroupItem, NameDef, Scalar } from "../src/document/types";
import type { PhraseLike, Scope, Value } from "../src/document/evaluator";
import { createScope, interpolate, resolvePhrase } from "../src/document/evaluator";

/* -------------------------------------------------------------------------- */
/* Writing expressions by hand, the way a parser would hand them over          */
/* -------------------------------------------------------------------------- */

const read = (path: string): Expression => ({ kind: "read", path });
const lit = (value: Scalar): Expression => ({ kind: "literal", value });
const cmp = (op: Comparison, left: Expression, right: Expression): Expression => ({
  kind: "compare",
  op,
  left,
  right,
});
const eq = (path: string, value: Scalar): Expression => cmp("==", read(path), lit(value));
const not = (of: Expression): Expression => ({ kind: "not", of });
const all = (...of: Expression[]): Expression => ({ kind: "and", of });
const count = (group: string, where?: Expression): Expression => ({ kind: "count", group, where });
const visited = (node: string): Expression => ({ kind: "visited", node });
const visits = (node: string): Expression => ({ kind: "visits", node });
const first = (group: string, where?: Expression, field?: string): Expression =>
  ({ kind: "first", group, where, field }) as unknown as Expression;
const last = (group: string, where?: Expression, field?: string): Expression =>
  ({ kind: "last", group, where, field }) as unknown as Expression;
const within = (group: string, of: Expression): Expression =>
  ({ kind: "in", group, of }) as unknown as Expression;
const persisted = (): Expression => ({ kind: "persisted" }) as unknown as Expression;
const named = (of: Expression): NameDef => ({ kind: "expression", of });

type Lang = "en" | "es" | "fr";
const langs: Lang[] = ["en", "es", "fr"];

/** One clause, three languages, one situation. */
function says(
  phrases: Record<Lang, PhraseLike>,
  scope: (lang: Lang) => Scope,
  expected: Record<Lang, string>
): void {
  for (const lang of langs) {
    expect(resolvePhrase(phrases[lang], scope(lang)), `${lang}`).toBe(expected[lang]);
  }
}

/* -------------------------------------------------------------------------- */
/* redaction — a two-state label, dispatched on a boolean                      */
/* -------------------------------------------------------------------------- */

describe("redaction", () => {
  const label: Record<Lang, PhraseLike> = {
    en: {
      on: "inside",
      cases: [{ is: true, say: "Hide these words again" }, { say: "Reveal the redacted words" }],
    },
    es: {
      on: "inside",
      cases: [{ is: true, say: "Volver a taparlas" }, { say: "Mostrar las palabras tachadas" }],
    },
    fr: {
      on: "inside",
      cases: [{ is: true, say: "Les masquer de nouveau" }, { say: "Révéler les mots supprimés" }],
    },
  };
  const scope = (inside: boolean) => () =>
    createScope({ state: { trail: [], variables: { inside }, logs: {}, readings: 1 } });

  it("is: true", () => {
    says(label, scope(true), {
      en: "Hide these words again",
      es: "Volver a taparlas",
      fr: "Les masquer de nouveau",
    });
  });

  it("otherwise", () => {
    says(label, scope(false), {
      en: "Reveal the redacted words",
      es: "Mostrar las palabras tachadas",
      fr: "Révéler les mots supprimés",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* labyrinth — visits(here), which counts repeats, and a badge on an exit      */
/* -------------------------------------------------------------------------- */

describe("labyrinth", () => {
  const stood: Record<Lang, PhraseLike> = {
    en: {
      on: "stands",
      cases: [
        { is: 1, say: "You have stood here once." },
        { say: "You have stood here {stands} times." },
      ],
    },
    es: {
      on: "stands",
      cases: [
        { is: 1, say: "Has estado aquí una vez." },
        { say: "Has estado aquí {stands} veces." },
      ],
    },
    fr: {
      on: "stands",
      cases: [
        { is: 1, say: "Vous êtes venu ici une fois." },
        { say: "Vous êtes venu ici {stands} fois." },
      ],
    },
  };
  const seen: Record<Lang, PhraseLike> = {
    en: { of: "exit", cases: [{ when: visited("stairs"), say: "seen" }, { say: "" }] },
    es: { of: "exit", cases: [{ when: visited("stairs"), say: "ya visto" }, { say: "" }] },
    fr: { of: "exit", cases: [{ when: visited("stairs"), say: "déjà vu" }, { say: "" }] },
  };
  const walked = (trail: string[]) => () =>
    createScope({
      state: { trail, variables: {}, logs: {}, readings: 1 },
      names: { stands: named(visits("here")) },
    });

  it("is: 1 — and the starting node is already in the trail", () => {
    says(stood, walked(["platform"]), {
      en: "You have stood here once.",
      es: "Has estado aquí una vez.",
      fr: "Vous êtes venu ici une fois.",
    });
  });

  it("otherwise — the trail keeps repeats, so three visits are three", () => {
    says(stood, walked(["platform", "stairs", "platform", "kiosk", "platform"]), {
      en: "You have stood here 3 times.",
      es: "Has estado aquí 3 veces.",
      fr: "Vous êtes venu ici 3 fois.",
    });
  });

  it("the exit badge", () => {
    says(seen, walked(["platform", "stairs", "platform"]), {
      en: "seen",
      es: "ya visto",
      fr: "déjà vu",
    });
    says(seen, walked(["platform"]), { en: "", es: "", fr: "" });
  });
});

/* -------------------------------------------------------------------------- */
/* reader-path — one English sentence, four phrases and nine clauses in Spanish */
/* -------------------------------------------------------------------------- */

describe("reader-path", () => {
  const place: Record<Lang, string> = {
    en: "the reading room",
    es: "la sala de lectura",
    fr: "la salle de lecture",
  };

  const standing: Record<Lang, PhraseLike> = {
    en: {
      on: "standing",
      cases: [
        { is: 1, say: "1 line standing" },
        { say: "{standing} lines standing" },
      ],
    },
    es: {
      on: "standing",
      cases: [
        { is: 0, say: "No queda ninguna línea en pie" },
        { is: 1, say: "Queda una línea en pie" },
        { say: "Quedan {standing} líneas en pie" },
      ],
    },
    fr: {
      on: "standing",
      cases: [
        { is: 0, say: "Aucune ligne ne tient plus" },
        { is: 1, say: "Une seule ligne tient" },
        { say: "{standing} lignes tiennent" },
      ],
    },
  };

  const struck: Record<Lang, PhraseLike> = {
    en: {
      on: "crossed-out",
      cases: [
        { is: 0, say: "0 struck" },
        { is: 1, say: "1 struck" },
        { say: "{crossed-out} struck" },
      ],
    },
    es: {
      on: "crossed-out",
      cases: [
        { is: 0, say: "ninguna tachada" },
        { is: 1, say: "una tachada" },
        { say: "{crossed-out} tachadas" },
      ],
    },
    fr: {
      on: "crossed-out",
      cases: [
        { is: 0, say: "aucune rayée" },
        { is: 1, say: "une rayée" },
        { say: "{crossed-out} rayées" },
      ],
    },
  };

  const returns: Record<Lang, PhraseLike> = {
    en: { on: "returns", cases: [{ is: 1, say: "1 time" }, { say: "{returns} times" }] },
    es: { on: "returns", cases: [{ is: 1, say: "una vez" }, { say: "{returns} veces" }] },
    fr: { on: "returns", cases: [{ is: 1, say: "une fois" }, { say: "{returns} fois" }] },
  };

  const report: Record<Lang, PhraseLike> = {
    en: {
      on: "standing",
      cases: [
        {
          when: cmp("==", count("book"), lit(0)),
          say: "The book is open and empty. Nothing you write in it can be taken out again.",
        },
        { say: "{lines-standing}, {struck-count}. The book has you in {here.place} {returns-here}." },
      ],
    },
    es: {
      on: "standing",
      cases: [
        {
          when: cmp("==", count("book"), lit(0)),
          say: "El libro está abierto y vacío. Nada de lo que escribas en él podrá sacarse después.",
        },
        { say: "{lines-standing}, {struck-count}. El libro te sitúa en {here.place} {returns-here}." },
      ],
    },
    fr: {
      on: "standing",
      cases: [
        {
          when: cmp("==", count("book"), lit(0)),
          say: "Le registre est ouvert et vide. Rien de ce que vous y écrirez ne pourra en être retiré.",
        },
        { say: "{lines-standing}, {struck-count}. Le registre vous situe dans {here.place}, {returns-here}." },
      ],
    },
  };

  const book = (lang: Lang, entries: Array<{ place: Lang | "other"; struck: boolean }>): GroupItem[] =>
    entries.map(
      (entry, index) =>
        ({
          id: `b${index}`,
          place: entry.place === "other" ? { en: "the courtyard", es: "el patio", fr: "la cour" }[lang] : place[lang],
          struck: entry.struck,
        }) as GroupItem
    );

  const scope =
    (entries: Array<{ place: Lang | "other"; struck: boolean }>) =>
    (lang: Lang): Scope =>
      createScope({
        state: { trail: [], variables: {}, logs: { book: book(lang, entries) }, readings: 1 },
        names: {
          standing: named(count("book", not(read("struck")))),
          "crossed-out": named(count("book", read("struck"))),
          here: named(last("book", not(read("struck")))),
          returns: named(
            count("book", all(not(read("struck")), cmp("==", read("place"), read("here.place"))))
          ),
        },
        phrases: {
          "lines-standing": standing[lang],
          "struck-count": struck[lang],
          "returns-here": returns[lang],
        },
      });

  const none: Array<{ place: Lang | "other"; struck: boolean }> = [];
  const one = [{ place: "en" as const, struck: false }];
  const three = [
    { place: "en" as const, struck: false },
    { place: "other" as const, struck: false },
    { place: "en" as const, struck: false },
  ];
  const struckOne = [
    { place: "en" as const, struck: false },
    { place: "other" as const, struck: true },
  ];
  const struckThree = [
    { place: "en" as const, struck: false },
    { place: "other" as const, struck: true },
    { place: "other" as const, struck: true },
    { place: "en" as const, struck: true },
  ];

  it("standing is: 0 — a sentence of its own, and ungrammatical as a plural of zero", () => {
    for (const lang of ["es", "fr"] as Lang[]) {
      expect(resolvePhrase(standing[lang], scope(none)(lang))).toBe(
        lang === "es" ? "No queda ninguna línea en pie" : "Aucune ligne ne tient plus"
      );
    }
  });

  it("standing is: 1 — the number is in the verb, and the verb comes first", () => {
    says(standing, scope(one), {
      en: "1 line standing",
      es: "Queda una línea en pie",
      fr: "Une seule ligne tient",
    });
  });

  it("standing otherwise", () => {
    says(standing, scope(three), {
      en: "3 lines standing",
      es: "Quedan 3 líneas en pie",
      fr: "3 lignes tiennent",
    });
  });

  it("struck is: 0 — ninguna, which is gender and not a count", () => {
    says(struck, scope(one), { en: "0 struck", es: "ninguna tachada", fr: "aucune rayée" });
  });

  it("struck is: 1", () => {
    says(struck, scope(struckOne), { en: "1 struck", es: "una tachada", fr: "une rayée" });
  });

  it("struck otherwise — feminine plural, agreeing with a noun ten words away", () => {
    says(struck, scope(struckThree), { en: "3 struck", es: "3 tachadas", fr: "3 rayées" });
  });

  it("returns is: 1 — vez, a stem that no suffix reaches", () => {
    says(returns, scope(one), { en: "1 time", es: "una vez", fr: "une fois" });
  });

  it("returns otherwise — veces", () => {
    says(returns, scope(three), { en: "2 times", es: "2 veces", fr: "2 fois" });
  });

  it("report, empty", () => {
    says(report, scope(none), {
      en: "The book is open and empty. Nothing you write in it can be taken out again.",
      es: "El libro está abierto y vacío. Nada de lo que escribas en él podrá sacarse después.",
      fr: "Le registre est ouvert et vide. Rien de ce que vous y écrirez ne pourra en être retiré.",
    });
  });

  it("report, otherwise — four clauses composed into one line", () => {
    says(report, scope(one), {
      en: "1 line standing, 0 struck. The book has you in the reading room 1 time.",
      es: "Queda una línea en pie, ninguna tachada. El libro te sitúa en la sala de lectura una vez.",
      fr: "Une seule ligne tient, aucune rayée. Le registre vous situe dans la salle de lecture, une fois.",
    });
  });

  it("report, with three standing and one struck", () => {
    says(report, scope(struckThree), {
      en: "1 line standing, 3 struck. The book has you in the reading room 1 time.",
      es: "Queda una línea en pie, 3 tachadas. El libro te sitúa en la sala de lectura una vez.",
      fr: "Une seule ligne tient, 3 rayées. Le registre vous situe dans la salle de lecture, une fois.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* unstable-links — the English plural bug the construction makes impossible   */
/* -------------------------------------------------------------------------- */

describe("unstable-links", () => {
  const turns: Record<Lang, GroupItem[]> = {
    en: [
      { id: "t1", name: "the gap in the hedge" },
      { id: "t2", name: "the pump house" },
      { id: "t3", name: "the low wall" },
    ] as GroupItem[],
    es: [
      { id: "t1", name: "el hueco del seto" },
      { id: "t2", name: "la caseta de la bomba" },
      { id: "t3", name: "el muro bajo" },
    ] as GroupItem[],
    fr: [
      { id: "t1", name: "la trouée de la haie" },
      { id: "t2", name: "la maison de la pompe" },
      { id: "t3", name: "le muret" },
    ] as GroupItem[],
  };

  const left: Record<Lang, PhraseLike> = {
    en: {
      on: "remaining",
      cases: [
        {
          when: eq("remaining", 0),
          say: "Nothing is left to take. The paragraph above is the orchard in the order you made.",
        },
        { is: 1, say: "1 turning left, and not where you last saw it." },
        { say: "{remaining} turnings left, and not where you last saw them." },
      ],
    },
    es: {
      on: "remaining",
      cases: [
        {
          when: eq("remaining", 0),
          say: "No queda nada por tomar. El párrafo de arriba es el huerto en el orden que tú hiciste.",
        },
        { is: 1, say: "Queda un desvío, y no donde lo viste por última vez." },
        { say: "Quedan {remaining} desvíos, y no donde los viste por última vez." },
      ],
    },
    fr: {
      on: "remaining",
      cases: [
        {
          when: eq("remaining", 0),
          say: "Il ne reste rien à prendre. Le paragraphe ci-dessus est le verger dans l'ordre que vous avez fait.",
        },
        { is: 1, say: "Il reste un tournant, et pas là où vous l'avez vu la dernière fois." },
        { say: "Il reste {remaining} tournants, et pas là où vous les avez vus la dernière fois." },
      ],
    },
  };

  const closed: Record<Lang, PhraseLike> = {
    en: {
      list: "taken",
      field: "name",
      sep: ", ",
      cases: [
        { when: eq("gone", 0), say: "" },
        { say: "Closed behind you: {closed-behind.list}." },
      ],
    },
    es: {
      list: "taken",
      field: "name",
      sep: ", ",
      cases: [
        { when: eq("gone", 0), say: "" },
        { say: "Has cerrado detrás de ti: {closed-behind.list}." },
      ],
    },
    fr: {
      list: "taken",
      field: "name",
      sep: ", ",
      cases: [
        { when: eq("gone", 0), say: "" },
        { say: "Vous avez fermé derrière vous : {closed-behind.list}." },
      ],
    },
  };

  const scope = (taken: number) => (lang: Lang) =>
    createScope({
      phraseName: "closed-behind",
      state: {
        trail: [],
        variables: {},
        logs: { taken: turns[lang].slice(0, taken) },
        readings: 1,
      },
      groups: {
        turns: { fields: ["name"], discipline: { keeps: "duplicates", removes: "none", marks: [] }, items: turns[lang] },
        left: { of: "turns", where: not(within("taken", read("item"))) },
      },
      names: { remaining: named(count("left")), gone: named(count("taken")) },
    });

  it("remaining == 0", () => {
    says(left, scope(3), {
      en: "Nothing is left to take. The paragraph above is the orchard in the order you made.",
      es: "No queda nada por tomar. El párrafo de arriba es el huerto en el orden que tú hiciste.",
      fr: "Il ne reste rien à prendre. Le paragraphe ci-dessus est le verger dans l'ordre que vous avez fait.",
    });
  });

  it("is: 1 — 'it', never 'them': the bug in the published gallery", () => {
    says(left, scope(2), {
      en: "1 turning left, and not where you last saw it.",
      es: "Queda un desvío, y no donde lo viste por última vez.",
      fr: "Il reste un tournant, et pas là où vous l'avez vu la dernière fois.",
    });
  });

  it("otherwise", () => {
    says(left, scope(1), {
      en: "2 turnings left, and not where you last saw them.",
      es: "Quedan 2 desvíos, y no donde los viste por última vez.",
      fr: "Il reste 2 tournants, et pas là où vous les avez vus la dernière fois.",
    });
  });

  it("the closed list, empty — prints nothing", () => {
    says(closed, scope(0), { en: "", es: "", fr: "" });
  });

  it("the closed list, joined with the author's separator", () => {
    says(closed, scope(2), {
      en: "Closed behind you: the gap in the hedge, the pump house.",
      es: "Has cerrado detrás de ti: el hueco del seto, la caseta de la bomba.",
      fr: "Vous avez fermé derrière vous : la trouée de la haie, la maison de la pompe.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* footnotes — a log that pops, and a field that references another group      */
/* -------------------------------------------------------------------------- */

describe("footnotes", () => {
  const notes = [
    { id: "n1", mark: "1", child: "n11" },
    { id: "n11", mark: "1.1", child: "n11a" },
    { id: "n11a", mark: "1.1.a", child: "n11ai" },
    { id: "n11ai", mark: "1.1.a.i" },
  ] as GroupItem[];

  const depth: Record<Lang, PhraseLike> = {
    en: {
      on: "depth",
      cases: [
        { when: eq("depth", 0), say: "Nothing opened yet. The chain is four notes deep." },
        { say: "Depth {depth} of {total}: note {current.mark}." },
      ],
    },
    es: {
      on: "depth",
      cases: [
        { when: eq("depth", 0), say: "Nada abierto todavía. La cadena tiene cuatro notas de fondo." },
        { say: "Profundidad {depth} de {total}: nota {current.mark}." },
      ],
    },
    fr: {
      on: "depth",
      cases: [
        { when: eq("depth", 0), say: "Rien d'ouvert pour l'instant. La chaîne a quatre notes de fond." },
        { say: "Profondeur {depth} sur {total} : note {current.mark}." },
      ],
    },
  };

  const scope = (chain: string[]) => () =>
    createScope({
      state: {
        trail: [],
        variables: {},
        logs: { chain: chain.map((note, index) => ({ id: `c${index}`, note }) as GroupItem) },
        readings: 1,
      },
      groups: {
        notes: { fields: ["mark", "child"], discipline: { keeps: "unique", removes: "last", marks: [] }, items: notes },
      },
      names: {
        depth: named(count("chain")),
        total: named(count("notes")),
        current: named(last("chain", undefined, "note")),
      },
    });

  it("depth == 0", () => {
    says(depth, scope([]), {
      en: "Nothing opened yet. The chain is four notes deep.",
      es: "Nada abierto todavía. La cadena tiene cuatro notas de fondo.",
      fr: "Rien d'ouvert pour l'instant. La chaîne a quatre notes de fond.",
    });
  });

  it("otherwise — the French thin colon is a literal in say:", () => {
    says(depth, scope(["n1", "n11"]), {
      en: "Depth 2 of 4: note 1.1.",
      es: "Profundidad 2 de 4: nota 1.1.",
      fr: "Profondeur 2 sur 4 : note 1.1.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* recover-anchor — the entry is the subject, and Spanish contracts a + el     */
/* -------------------------------------------------------------------------- */

describe("recover-anchor", () => {
  const anchors: Record<Lang, GroupItem[]> = {
    en: [
      { id: "note", label: "note 4.2" },
      { id: "appendix", label: "appendix C" },
    ] as GroupItem[],
    es: [
      { id: "note", label: "nota 4.2" },
      { id: "appendix", label: "anexo C" },
    ] as GroupItem[],
    fr: [
      { id: "note", label: "note 4.2" },
      { id: "appendix", label: "annexe C" },
    ] as GroupItem[],
  };

  const where: Record<Lang, PhraseLike> = {
    en: {
      cases: [
        { when: read("away"), say: "You are in {gone.label}, off the main line." },
        { when: eq("moved", 0), say: "The main line is stable: you have not left it yet." },
        { say: "Back on the main line. The log keeps every move you made." },
      ],
    },
    es: {
      cases: [
        { when: read("away"), say: "Estás en {gone.label}, fuera de la línea principal." },
        { when: eq("moved", 0), say: "La línea principal está estable: todavía no la has dejado." },
        { say: "De vuelta en la línea principal. El registro guarda todos los movimientos que hiciste." },
      ],
    },
    fr: {
      cases: [
        { when: read("away"), say: "Vous êtes dans {gone.label}, hors de la ligne principale." },
        { when: eq("moved", 0), say: "La ligne principale est stable : vous ne l'avez pas encore quittée." },
        { say: "De retour sur la ligne principale. Le journal garde tous vos déplacements." },
      ],
    },
  };

  /** Spanish needs two clauses where English needs one, because `a + el` is
   *  `al` and is not optional. It can write them because it can see the entry. */
  const jump: Record<Lang, PhraseLike> = {
    en: {
      of: "entry",
      cases: [
        { when: eq("entry.way", "down"), say: "down to {entry.anchor.label}" },
        { say: "up from {entry.anchor.label}" },
      ],
    },
    es: {
      of: "entry",
      cases: [
        { when: all(eq("entry.way", "down"), eq("entry.anchor", "appendix")), say: "bajada al {entry.anchor.label}" },
        { when: eq("entry.way", "down"), say: "bajada a la {entry.anchor.label}" },
        { say: "subida desde {entry.anchor.label}" },
      ],
    },
    fr: {
      of: "entry",
      cases: [
        { when: eq("entry.way", "down"), say: "descente vers {entry.anchor.label}" },
        { say: "retour de {entry.anchor.label}" },
      ],
    },
  };

  const scope =
    (jumps: Array<{ way: string; anchor: string }>, away: string, subject?: Value) =>
    (lang: Lang) =>
      createScope({
        subject,
        state: {
          trail: [],
          variables: { away },
          logs: { jumps: jumps.map((jump, index) => ({ id: `j${index}`, ...jump }) as GroupItem) },
          readings: 1,
        },
        groups: {
          anchors: {
            fields: ["label"],
            discipline: { keeps: "duplicates", removes: "none", marks: [] },
            items: anchors[lang],
          },
        },
        names: {
          moved: named(count("jumps")),
          gone: named(first("anchors", eq("id", away))),
        },
      });

  it("away", () => {
    says(where, scope([{ way: "down", anchor: "note" }], "note"), {
      en: "You are in note 4.2, off the main line.",
      es: "Estás en nota 4.2, fuera de la línea principal.",
      fr: "Vous êtes dans note 4.2, hors de la ligne principale.",
    });
  });

  it("moved == 0", () => {
    says(where, scope([], ""), {
      en: "The main line is stable: you have not left it yet.",
      es: "La línea principal está estable: todavía no la has dejado.",
      fr: "La ligne principale est stable : vous ne l'avez pas encore quittée.",
    });
  });

  it("otherwise", () => {
    says(where, scope([{ way: "down", anchor: "note" }, { way: "up", anchor: "note" }], ""), {
      en: "Back on the main line. The log keeps every move you made.",
      es: "De vuelta en la línea principal. El registro guarda todos los movimientos que hiciste.",
      fr: "De retour sur la ligne principale. Le journal garde tous vos déplacements.",
    });
  });

  it("an entry going down, printed as a sentence about itself", () => {
    const entry = { id: "j0", way: "down", anchor: "note" } as GroupItem;
    says(jump, scope([], "", entry), {
      en: "down to note 4.2",
      es: "bajada a la nota 4.2",
      fr: "descente vers note 4.2",
    });
  });

  it("down to the appendix — al, which Spanish does not make optional", () => {
    const entry = { id: "j1", way: "down", anchor: "appendix" } as GroupItem;
    says(jump, scope([], "", entry), {
      en: "down to appendix C",
      es: "bajada al anexo C",
      fr: "descente vers annexe C",
    });
  });

  it("an entry coming back up", () => {
    const entry = { id: "j2", way: "up", anchor: "appendix" } as GroupItem;
    says(jump, scope([], "", entry), {
      en: "up from appendix C",
      es: "subida desde anexo C",
      fr: "retour de annexe C",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* document-packet — two numbers in one clause, and keeps: unique             */
/* -------------------------------------------------------------------------- */

describe("document-packet", () => {
  const exhibits: Record<Lang, GroupItem[]> = {
    en: [
      { id: "A", title: "Exhibit A" },
      { id: "B", title: "Exhibit B" },
      { id: "C", title: "Exhibit C" },
    ] as GroupItem[],
    es: [
      { id: "A", title: "Pieza A" },
      { id: "B", title: "Pieza B" },
      { id: "C", title: "Pieza C" },
    ] as GroupItem[],
    fr: [
      { id: "A", title: "Pièce A" },
      { id: "B", title: "Pièce B" },
      { id: "C", title: "Pièce C" },
    ] as GroupItem[],
  };

  const sheetCount: Record<Lang, PhraseLike> = {
    en: {
      on: "seen",
      cases: [{ is: 1, say: "1 of {total} sheets opened." }, { say: "{seen} of {total} sheets opened." }],
    },
    es: {
      on: "seen",
      cases: [
        { is: 1, say: "Se ha abierto 1 de {total} hojas." },
        { say: "Se han abierto {seen} de {total} hojas." },
      ],
    },
    fr: {
      on: "seen",
      cases: [
        { is: 1, say: "1 des {total} feuilles a été ouverte." },
        { say: "{seen} des {total} feuilles ont été ouvertes." },
      ],
    },
  };

  const state: Record<Lang, PhraseLike> = {
    en: {
      cases: [
        { when: read("open"), say: "{showing.title} is open. {sheet-count}" },
        { say: "The envelope is shut. {sheet-count}" },
      ],
    },
    es: {
      cases: [
        { when: read("open"), say: "{showing.title} está abierta. {sheet-count}" },
        { say: "El sobre está cerrado. {sheet-count}" },
      ],
    },
    fr: {
      cases: [
        { when: read("open"), say: "{showing.title} est ouverte. {sheet-count}" },
        { say: "L'enveloppe est fermée. {sheet-count}" },
      ],
    },
  };

  const scope = (readSheets: string[], open: string) => (lang: Lang) =>
    createScope({
      state: {
        trail: [],
        variables: { open },
        logs: { read: readSheets.map((sheet, index) => ({ id: `r${index}`, sheet }) as GroupItem) },
        readings: 1,
      },
      groups: {
        exhibits: {
          fields: ["title"],
          discipline: { keeps: "duplicates", removes: "none", marks: [] },
          items: exhibits[lang],
        },
      },
      names: {
        seen: named(count("read")),
        total: named(count("exhibits")),
        showing: named(first("exhibits", eq("id", open))),
      },
      phrases: { "sheet-count": sheetCount[lang] },
    });

  it("seen is: 1 — the verb agrees with the first number, the noun with the second", () => {
    says(sheetCount, scope(["A"], "A"), {
      en: "1 of 3 sheets opened.",
      es: "Se ha abierto 1 de 3 hojas.",
      fr: "1 des 3 feuilles a été ouverte.",
    });
  });

  it("seen otherwise", () => {
    says(sheetCount, scope(["A", "B"], "B"), {
      en: "2 of 3 sheets opened.",
      es: "Se han abierto 2 de 3 hojas.",
      fr: "2 des 3 feuilles ont été ouvertes.",
    });
  });

  it("open", () => {
    says(state, scope(["A"], "A"), {
      en: "Exhibit A is open. 1 of 3 sheets opened.",
      es: "Pieza A está abierta. Se ha abierto 1 de 3 hojas.",
      fr: "Pièce A est ouverte. 1 des 3 feuilles a été ouverte.",
    });
  });

  it("shut", () => {
    says(state, scope(["A", "B"], ""), {
      en: "The envelope is shut. 2 of 3 sheets opened.",
      es: "El sobre está cerrado. Se han abierto 2 de 3 hojas.",
      fr: "L'enveloppe est fermée. 2 des 3 feuilles ont été ouvertes.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* memory — the zero case as a different sentence, in three languages          */
/* -------------------------------------------------------------------------- */

describe("memory", () => {
  const doors: Record<Lang, GroupItem[]> = {
    en: [
      { id: "north", name: "the north door" },
      { id: "south", name: "the south door" },
    ] as GroupItem[],
    es: [
      { id: "north", name: "la puerta norte" },
      { id: "south", name: "la puerta sur" },
    ] as GroupItem[],
    fr: [
      { id: "north", name: "la porte nord" },
      { id: "south", name: "la porte sud" },
    ] as GroupItem[],
  };

  const opening: Record<Lang, PhraseLike> = {
    en: {
      on: "readings-so-far",
      cases: [
        { is: 1, say: "You have just arrived, so the paragraph introduces itself." },
        { is: 2, say: "You have read this once already." },
        { is: 3, say: "Third reading. The corridor is gone." },
        { say: "You keep coming back." },
      ],
    },
    es: {
      on: "readings-so-far",
      cases: [
        { is: 1, say: "Acabas de llegar, así que el párrafo se presenta." },
        { is: 2, say: "Ya has leído esto una vez." },
        { is: 3, say: "Tercera lectura. El pasillo ya no está." },
        { say: "Sigues volviendo." },
      ],
    },
    fr: {
      on: "readings-so-far",
      cases: [
        { is: 1, say: "Vous venez d'arriver, alors le paragraphe se présente." },
        { is: 2, say: "Vous avez déjà lu ceci une fois." },
        { is: 3, say: "Troisième lecture. Le couloir n'est plus là." },
        { say: "Vous revenez sans cesse." },
      ],
    },
  };

  const thisDoor: Record<Lang, PhraseLike> = {
    en: { on: "times-here", cases: [{ is: 1, say: "once" }, { say: "{times-here} times" }] },
    es: { on: "times-here", cases: [{ is: 1, say: "una vez" }, { say: "{times-here} veces" }] },
    fr: { on: "times-here", cases: [{ is: 1, say: "une fois" }, { say: "{times-here} fois" }] },
  };

  const thatDoor: Record<Lang, PhraseLike> = {
    en: {
      on: "times-other",
      cases: [{ is: 0, say: "not at all" }, { is: 1, say: "once" }, { say: "{times-other} times" }],
    },
    es: {
      on: "times-other",
      cases: [{ is: 0, say: "ninguna vez" }, { is: 1, say: "una vez" }, { say: "{times-other} veces" }],
    },
    fr: {
      on: "times-other",
      cases: [{ is: 0, say: "jamais" }, { is: 1, say: "une fois" }, { say: "{times-other} fois" }],
    },
  };

  const went: Record<Lang, PhraseLike> = {
    en: {
      cases: [
        {
          when: eq("doors-opened", 0),
          say: "Neither door has been opened yet, which is the only reason this sentence is still polite.",
        },
        {
          say: "You went through {last-door.name} last, and you have gone through it {this-door}. The other door has been used {that-door}.",
        },
      ],
    },
    es: {
      cases: [
        {
          when: eq("doors-opened", 0),
          say: "Todavía no se ha abierto ninguna puerta, que es la única razón de que esta frase siga siendo cortés.",
        },
        {
          say: "Pasaste por {last-door.name} la última vez, y has pasado por ella {this-door}. La otra puerta se ha usado {that-door}.",
        },
      ],
    },
    fr: {
      cases: [
        {
          when: eq("doors-opened", 0),
          say: "Aucune porte n'a encore été ouverte, et c'est la seule raison pour laquelle cette phrase reste polie.",
        },
        {
          say: "Vous êtes passé par {last-door.name} en dernier, et vous l'avez franchie {this-door}. L'autre porte a servi {that-door}.",
        },
      ],
    },
  };

  const tally: Record<Lang, PhraseLike> = {
    en: { say: "Readings: {readings-so-far}. Doors opened: {doors-opened}." },
    es: { say: "Lecturas: {readings-so-far}. Puertas abiertas: {doors-opened}." },
    fr: { say: "Lectures : {readings-so-far}. Portes ouvertes : {doors-opened}." },
  };

  const scope = (readings: number, chosen: string[]) => (lang: Lang) =>
    createScope({
      state: {
        trail: [],
        variables: {},
        logs: {
          readings: Array.from({ length: readings }, (_unused, index) => ({ id: `r${index}` }) as GroupItem),
          chosen: chosen.map((door, index) => ({ id: `c${index}`, door }) as GroupItem),
        },
        readings,
      },
      groups: {
        doors: {
          fields: ["name"],
          discipline: { keeps: "duplicates", removes: "none", marks: [] },
          items: doors[lang],
        },
      },
      names: {
        "readings-so-far": named(count("readings")),
        "doors-opened": named(count("chosen")),
        "last-door": named(last("chosen", undefined, "door")),
        "other-door": named(first("doors", not(cmp("==", read("id"), read("last-door.id"))))),
        "times-here": named(count("chosen", cmp("==", read("door"), read("last-door")))),
        "times-other": named(count("chosen", cmp("==", read("door"), read("other-door")))),
      },
      phrases: { "this-door": thisDoor[lang], "that-door": thatDoor[lang] },
    });

  it("is: 1", () => {
    says(opening, scope(1, []), {
      en: "You have just arrived, so the paragraph introduces itself.",
      es: "Acabas de llegar, así que el párrafo se presenta.",
      fr: "Vous venez d'arriver, alors le paragraphe se présente.",
    });
  });

  it("is: 2 — the ladder is the list of cases, not a Math.min", () => {
    says(opening, scope(2, []), {
      en: "You have read this once already.",
      es: "Ya has leído esto una vez.",
      fr: "Vous avez déjà lu ceci une fois.",
    });
  });

  it("is: 3", () => {
    says(opening, scope(3, []), {
      en: "Third reading. The corridor is gone.",
      es: "Tercera lectura. El pasillo ya no está.",
      fr: "Troisième lecture. Le couloir n'est plus là.",
    });
  });

  it("otherwise", () => {
    says(opening, scope(7, []), {
      en: "You keep coming back.",
      es: "Sigues volviendo.",
      fr: "Vous revenez sans cesse.",
    });
  });

  it("this door, once", () => {
    says(thisDoor, scope(2, ["north"]), { en: "once", es: "una vez", fr: "une fois" });
  });

  it("this door, more than once", () => {
    says(thisDoor, scope(2, ["north", "south", "north"]), {
      en: "2 times",
      es: "2 veces",
      fr: "2 fois",
    });
  });

  it("that door, is: 0 — 'se ha usado 0 veces' is ungrammatical, so it is another sentence", () => {
    says(thatDoor, scope(2, ["north"]), { en: "not at all", es: "ninguna vez", fr: "jamais" });
  });

  it("that door, is: 1", () => {
    says(thatDoor, scope(2, ["south", "north"]), { en: "once", es: "una vez", fr: "une fois" });
  });

  it("that door, otherwise", () => {
    says(thatDoor, scope(2, ["south", "south", "north"]), {
      en: "2 times",
      es: "2 veces",
      fr: "2 fois",
    });
  });

  it("neither door", () => {
    says(went, scope(2, []), {
      en: "Neither door has been opened yet, which is the only reason this sentence is still polite.",
      es: "Todavía no se ha abierto ninguna puerta, que es la única razón de que esta frase siga siendo cortés.",
      fr: "Aucune porte n'a encore été ouverte, et c'est la seule raison pour laquelle cette phrase reste polie.",
    });
  });

  it("otherwise — two counts in one sentence, each with its own clause", () => {
    says(went, scope(2, ["south", "north", "north"]), {
      en: "You went through the north door last, and you have gone through it 2 times. The other door has been used once.",
      es: "Pasaste por la puerta norte la última vez, y has pasado por ella 2 veces. La otra puerta se ha usado una vez.",
      fr: "Vous êtes passé par la porte nord en dernier, et vous l'avez franchie 2 fois. L'autre porte a servi une fois.",
    });
  });

  it("the tally", () => {
    says(tally, scope(2, ["north"]), {
      en: "Readings: 2. Doors opened: 1.",
      es: "Lecturas: 2. Puertas abiertas: 1.",
      fr: "Lectures : 2. Portes ouvertes : 1.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* session-memory — the reader's own words, quoted and never re-read           */
/* -------------------------------------------------------------------------- */

describe("session-memory", () => {
  const kept: Record<Lang, PhraseLike> = {
    en: {
      on: "note",
      cases: [
        {
          when: not(persisted()),
          say: "This browser will not store anything, so nothing written here can outlive the page.",
        },
        {
          when: eq("note", ""),
          say: "The text is keeping nothing about you. Write a line and it will outlive the page.",
        },
        { say: 'The text has kept one sentence about you: "{note}" It survives closing the tab.' },
      ],
    },
    es: {
      on: "note",
      cases: [
        {
          when: not(persisted()),
          say: "Este navegador no va a guardar nada, así que nada de lo que escribas aquí puede sobrevivir a la página.",
        },
        {
          when: eq("note", ""),
          say: "El texto no está guardando nada sobre ti. Escribe una línea y sobrevivirá a la página.",
        },
        { say: "El texto ha guardado una frase sobre ti: «{note}» Sobrevive al cierre de la pestaña." },
      ],
    },
    fr: {
      on: "note",
      cases: [
        {
          when: not(persisted()),
          say: "Ce navigateur n'enregistrera rien, donc rien de ce qui est écrit ici ne peut survivre à la page.",
        },
        {
          when: eq("note", ""),
          say: "Le texte ne garde rien de vous. Écrivez une ligne et elle survivra à la page.",
        },
        { say: "Le texte a gardé une phrase à votre sujet : « {note} » Elle survit à la fermeture de l'onglet." },
      ],
    },
  };

  const scope = (note: string, persistedNow: boolean) => () =>
    createScope({
      persisted: persistedNow,
      state: { trail: [], variables: { note }, logs: {}, readings: 1 },
    });

  it("not persisted()", () => {
    says(kept, scope("anything", false), {
      en: "This browser will not store anything, so nothing written here can outlive the page.",
      es: "Este navegador no va a guardar nada, así que nada de lo que escribas aquí puede sobrevivir a la página.",
      fr: "Ce navigateur n'enregistrera rien, donc rien de ce qui est écrit ici ne peut survivre à la page.",
    });
  });

  it("empty", () => {
    says(kept, scope("", true), {
      en: "The text is keeping nothing about you. Write a line and it will outlive the page.",
      es: "El texto no está guardando nada sobre ti. Escribe una línea y sobrevivirá a la página.",
      fr: "Le texte ne garde rien de vous. Écrivez une ligne et elle survivra à la page.",
    });
  });

  it("otherwise — the quotes change shape and the reader's line sits inside them", () => {
    const line = "the stairs are counted differently going down";
    says(kept, scope(line, true), {
      en: `The text has kept one sentence about you: "${line}" It survives closing the tab.`,
      es: `El texto ha guardado una frase sobre ti: «${line}» Sobrevive al cierre de la pestaña.`,
      fr: `Le texte a gardé une phrase à votre sujet : « ${line} » Elle survit à la fermeture de l'onglet.`,
    });
  });

  it("a reader who writes {note} gets {note} back", () => {
    says(kept, scope("{note}", true), {
      en: 'The text has kept one sentence about you: "{note}" It survives closing the tab.',
      es: "El texto ha guardado una frase sobre ti: «{note}» Sobrevive al cierre de la pestaña.",
      fr: "Le texte a gardé une phrase à votre sujet : « {note} » Elle survit à la fermeture de l'onglet.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* narrators — labels that are paths and nothing else                          */
/* -------------------------------------------------------------------------- */

describe("narrators", () => {
  const voices = [
    { id: "surveyor", who: "The surveyor", source: "Survey of the north stair, second visit" },
    { id: "lodger", who: "The lodger", source: "Letter, undated, second floor back" },
  ] as GroupItem[];

  const scope = createScope({
    state: { trail: [], variables: { voice: "lodger" }, logs: {}, readings: 1 },
    groups: {
      voices: { fields: ["who", "source"], discipline: { keeps: "duplicates", removes: "none", marks: [] }, items: voices },
    },
    names: { speaking: named(first("voices", eq("id", "lodger"))) },
    bindings: { item: voices[0] },
  });

  it("the option label", () => {
    expect(interpolate("{item.who}", scope)).toBe("The surveyor");
  });

  it("the footer", () => {
    expect(interpolate("{speaking.who} — {speaking.source}", scope)).toBe(
      "The lodger — Letter, undated, second floor back"
    );
  });
});

/* -------------------------------------------------------------------------- */
/* motif-passes — Spanish reorders the sentence, which suffixes cannot         */
/* -------------------------------------------------------------------------- */

describe("motif-passes", () => {
  const marking: Record<Lang, PhraseLike> = {
    en: {
      on: "showing",
      cases: [
        { when: eq("showing", 0), say: "No pass is marking. The paragraph is the first clerk's alone." },
        { is: 1, say: "1 of {markable} words is marked: …" },
        {
          say: "{showing} of {markable} words marked: kept words are highlighted and underlined, struck words are ruled through.",
        },
      ],
    },
    es: {
      on: "showing",
      cases: [
        { when: eq("showing", 0), say: "Ninguna pasada está marcando. El párrafo es solo del primer escribiente." },
        { is: 1, say: "Hay 1 palabra marcada de {markable}: …" },
        {
          say: "Hay {showing} palabras marcadas de {markable}: las conservadas van resaltadas y subrayadas, las tachadas van con una raya.",
        },
      ],
    },
    fr: {
      on: "showing",
      cases: [
        { when: eq("showing", 0), say: "Aucune passe ne marque. Le paragraphe est celui du premier greffier seul." },
        { is: 1, say: "1 mot sur {markable} est marqué : …" },
        {
          say: "{showing} mots sur {markable} sont marqués : les mots gardés sont surlignés et soulignés, les mots rayés sont barrés.",
        },
      ],
    },
  };

  const scope = (marked: number) => () =>
    createScope({
      state: { trail: [], variables: {}, logs: {}, readings: 1 },
      groups: {
        // The schema keeps a group of the document's own marked spans (N15), the
        // way it keeps the trail; the author names neither.
        "marked-spans": Array.from({ length: marked }, (_unused, index) => ({ id: `s${index}` }) as GroupItem),
        "markable-spans": Array.from({ length: 4 }, (_unused, index) => ({ id: `m${index}` }) as GroupItem),
      },
      names: { showing: named(count("marked-spans")), markable: named(count("markable-spans")) },
    });

  it("showing == 0", () => {
    says(marking, scope(0), {
      en: "No pass is marking. The paragraph is the first clerk's alone.",
      es: "Ninguna pasada está marcando. El párrafo es solo del primer escribiente.",
      fr: "Aucune passe ne marque. Le paragraphe est celui du premier greffier seul.",
    });
  });

  it("is: 1 — 'Hay 1 palabra marcada de 4', which no suffix can reach", () => {
    says(marking, scope(1), {
      en: "1 of 4 words is marked: …",
      es: "Hay 1 palabra marcada de 4: …",
      fr: "1 mot sur 4 est marqué : …",
    });
  });

  it("otherwise", () => {
    says(marking, scope(3), {
      en: "3 of 4 words marked: kept words are highlighted and underlined, struck words are ruled through.",
      es: "Hay 3 palabras marcadas de 4: las conservadas van resaltadas y subrayadas, las tachadas van con una raya.",
      fr: "3 mots sur 4 sont marqués : les mots gardés sont surlignés et soulignés, les mots rayés sont barrés.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* two-accounts — agreement with something the reader chose                    */
/* -------------------------------------------------------------------------- */

describe("two-accounts", () => {
  const points: Record<Lang, GroupItem[]> = {
    en: [
      { id: "hour", subject: "The hour", feminine: true },
      { id: "wall", subject: "The wall", feminine: false },
    ] as GroupItem[],
    es: [
      { id: "hour", subject: "La hora", feminine: true },
      { id: "wall", subject: "El muro", feminine: false },
    ] as GroupItem[],
    fr: [
      { id: "hour", subject: "L'heure", feminine: true },
      { id: "wall", subject: "Le mur", feminine: false },
    ] as GroupItem[],
  };

  const verdict: Record<Lang, PhraseLike> = {
    en: {
      cases: [
        {
          when: read("marked"),
          say: "{on-point.subject}: marked in both accounts, which do not agree about it.",
        },
        { say: "Mark a point to find it in both columns." },
      ],
    },
    es: {
      cases: [
        {
          when: all(read("marked"), read("on-point.feminine")),
          say: "{on-point.subject}: marcada en los dos relatos, que no coinciden en ella.",
        },
        {
          when: read("marked"),
          say: "{on-point.subject}: marcado en los dos relatos, que no coinciden en él.",
        },
        { say: "Marca un punto para encontrarlo en las dos columnas." },
      ],
    },
    fr: {
      cases: [
        {
          when: all(read("marked"), read("on-point.feminine")),
          say: "{on-point.subject} : relevée dans les deux comptes rendus, qui ne s'accordent pas là-dessus.",
        },
        {
          when: read("marked"),
          say: "{on-point.subject} : relevé dans les deux comptes rendus, qui ne s'accordent pas là-dessus.",
        },
        { say: "Marquez un point pour le retrouver dans les deux colonnes." },
      ],
    },
  };

  const scope = (marked: string) => (lang: Lang) =>
    createScope({
      state: { trail: [], variables: { marked }, logs: {}, readings: 1 },
      groups: {
        points: {
          fields: ["subject", "feminine"],
          discipline: { keeps: "duplicates", removes: "none", marks: [] },
          items: points[lang],
        },
      },
      names: { "on-point": named(first("points", eq("id", marked))) },
    });

  it("marked, masculine", () => {
    says(verdict, scope("wall"), {
      en: "The wall: marked in both accounts, which do not agree about it.",
      es: "El muro: marcado en los dos relatos, que no coinciden en él.",
      fr: "Le mur : relevé dans les deux comptes rendus, qui ne s'accordent pas là-dessus.",
    });
  });

  it("marked, feminine — the subject has a name, so the clause can ask its gender", () => {
    says(verdict, scope("hour"), {
      en: "The hour: marked in both accounts, which do not agree about it.",
      es: "La hora: marcada en los dos relatos, que no coinciden en ella.",
      fr: "L'heure : relevée dans les deux comptes rendus, qui ne s'accordent pas là-dessus.",
    });
  });

  it("nothing marked", () => {
    says(verdict, scope(""), {
      en: "Mark a point to find it in both columns.",
      es: "Marca un punto para encontrarlo en las dos columnas.",
      fr: "Marquez un point pour le retrouver dans les deux colonnes.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* disputed-hour — the shortest clause of the nineteen, and of: is what writes it */
/* -------------------------------------------------------------------------- */

describe("disputed-hour", () => {
  const minutes = [
    { id: "m1", time: "03:14", agrees: false },
    { id: "m2", time: "03:16", agrees: true },
    { id: "m3", time: "03:17", agrees: false },
    { id: "m4", time: "03:22", agrees: false },
  ] as GroupItem[];

  const verdict: Record<Lang, PhraseLike> = {
    en: { of: "item", cases: [{ when: read("item.agrees"), say: "agreed" }, { say: "disputed" }] },
    es: { of: "item", cases: [{ when: read("item.agrees"), say: "coinciden" }, { say: "discrepan" }] },
    fr: { of: "item", cases: [{ when: read("item.agrees"), say: "concordent" }, { say: "divergent" }] },
  };

  const tally: Record<Lang, PhraseLike> = {
    en: {
      on: "showing",
      cases: [
        { is: 1, say: "Showing 1 of {kept} minutes. The two logs disagree about {split} of them." },
        { say: "Showing {showing} of {kept} minutes. The two logs disagree about {split} of them." },
      ],
    },
    es: {
      on: "showing",
      cases: [
        { is: 1, say: "Se muestra 1 de {kept} minutos. Los dos registros discrepan en {split} de ellos." },
        { say: "Se muestran {showing} de {kept} minutos. Los dos registros discrepan en {split} de ellos." },
      ],
    },
    fr: {
      on: "showing",
      cases: [
        { is: 1, say: "1 minute sur {kept} est affichée. Les deux journaux divergent sur {split} d'entre elles." },
        { say: "{showing} minutes sur {kept} sont affichées. Les deux journaux divergent sur {split} d'entre elles." },
      ],
    },
  };

  const scope = (onlyDisputed: boolean, subject?: Value) => () =>
    createScope({
      subject,
      state: { trail: [], variables: { "only-disputed": onlyDisputed }, logs: {}, readings: 1 },
      groups: {
        minutes: {
          fields: ["time", "agrees"],
          discipline: { keeps: "duplicates", removes: "none", marks: [] },
          items: minutes,
        },
        shown: { of: "minutes", where: { kind: "or", of: [not(read("agrees")), not(read("only-disputed"))] } },
      },
      names: {
        showing: named(count("shown")),
        kept: named(count("minutes")),
        split: named(count("minutes", not(read("agrees")))),
      },
    });

  it("a row that agrees", () => {
    says(verdict, scope(false, minutes[1]), { en: "agreed", es: "coinciden", fr: "concordent" });
  });

  it("a row that does not", () => {
    says(verdict, scope(false, minutes[0]), { en: "disputed", es: "discrepan", fr: "divergent" });
  });

  it("is: 1 — the verb agrees with the first number and the noun with the second", () => {
    const one = () =>
      createScope({
        state: { trail: [], variables: {}, logs: {}, readings: 1 },
        groups: {
          minutes: {
            fields: ["time", "agrees"],
            discipline: { keeps: "duplicates", removes: "none", marks: [] },
            items: minutes,
          },
          shown: { of: "minutes", where: eq("time", "03:14") },
        },
        names: {
          showing: named(count("shown")),
          kept: named(count("minutes")),
          split: named(count("minutes", not(read("agrees")))),
        },
      });
    says(tally, one, {
      en: "Showing 1 of 4 minutes. The two logs disagree about 3 of them.",
      es: "Se muestra 1 de 4 minutos. Los dos registros discrepan en 3 de ellos.",
      fr: "1 minute sur 4 est affichée. Les deux journaux divergent sur 3 d'entre elles.",
    });
  });

  it("otherwise — the filter is off when the variable is off", () => {
    says(tally, scope(false), {
      en: "Showing 4 of 4 minutes. The two logs disagree about 3 of them.",
      es: "Se muestran 4 de 4 minutos. Los dos registros discrepan en 3 de ellos.",
      fr: "4 minutes sur 4 sont affichées. Les deux journaux divergent sur 3 d'entre elles.",
    });
    says(tally, scope(true), {
      en: "Showing 3 of 4 minutes. The two logs disagree about 3 of them.",
      es: "Se muestran 3 de 4 minutos. Los dos registros discrepan en 3 de ellos.",
      fr: "3 minutes sur 4 sont affichées. Les deux journaux divergent sur 3 d'entre elles.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* contradiction — grouped before it is quantified (decision 30)               */
/* -------------------------------------------------------------------------- */

describe("contradiction", () => {
  const claims: Record<Lang, GroupItem[]> = {
    en: [
      { id: "door", about: "whether the door was open at three" },
      { id: "entry", about: "whether anything was entered after three" },
    ] as GroupItem[],
    es: [
      { id: "door", about: "si la puerta estaba abierta a las tres" },
      { id: "entry", about: "si se registró algo después de las tres" },
    ] as GroupItem[],
    fr: [
      { id: "door", about: "si la porte était ouverte à trois heures" },
      { id: "entry", about: "si quelque chose a été enregistré après trois heures" },
    ] as GroupItem[],
  };

  const statements = [
    { id: "s1", claim: "door", holds: false },
    { id: "s2", claim: "door", holds: true },
    { id: "s3", claim: "entry", holds: false },
    { id: "s4", claim: "entry", holds: true },
  ] as GroupItem[];

  const bothWays: Record<Lang, PhraseLike> = {
    en: { list: "broken", field: "claim.about", sep: ", and ", cases: [{ say: "{both-ways.list}" }] },
    es: { list: "broken", field: "claim.about", sep: ", y ", cases: [{ say: "{both-ways.list}" }] },
    fr: { list: "broken", field: "claim.about", sep: ", et ", cases: [{ say: "{both-ways.list}" }] },
  };

  const verdict: Record<Lang, PhraseLike> = {
    en: {
      on: "clashes",
      cases: [
        { when: cmp(">", read("clashes"), lit(0)), say: "Cannot all stand. Your selection answers {both-ways} both ways." },
        { when: cmp("<", read("holding"), lit(2)), say: "Hold two statements at once and see whether the file can keep them both." },
        { say: "These {holding} can stand together." },
      ],
    },
    es: {
      on: "clashes",
      cases: [
        { when: cmp(">", read("clashes"), lit(0)), say: "No pueden sostenerse todas. Tu selección responde a {both-ways} de las dos maneras." },
        { when: cmp("<", read("holding"), lit(2)), say: "Sostén dos afirmaciones a la vez y mira si el expediente puede con las dos." },
        { say: "Estas {holding} pueden sostenerse juntas." },
      ],
    },
    fr: {
      on: "clashes",
      cases: [
        { when: cmp(">", read("clashes"), lit(0)), say: "Elles ne peuvent pas toutes tenir. Votre sélection répond à {both-ways} des deux façons." },
        { when: cmp("<", read("holding"), lit(2)), say: "Tenez deux déclarations à la fois et voyez si le dossier peut les garder toutes les deux." },
        { say: "Ces {holding} peuvent tenir ensemble." },
      ],
    },
  };

  const scope = (held: string[]) => (lang: Lang) =>
    createScope({
      state: {
        trail: [],
        variables: {},
        logs: { held: held.map((statement, index) => ({ id: `h${index}`, statement }) as GroupItem) },
        readings: 1,
      },
      groups: {
        claims: { fields: ["about"], discipline: { keeps: "duplicates", removes: "none", marks: [] }, items: claims[lang] },
        statements: {
          fields: ["claim", "holds"],
          discipline: { keeps: "duplicates", removes: "none", marks: [] },
          items: statements,
        },
        chosen: { of: "statements", where: within("held", read("item")) },
        broken: { of: "chosen", by: "claim", test: "split", keep: "claim" },
      },
      names: { holding: named(count("chosen")), clashes: named(count("broken")) },
      phrases: { "both-ways": bothWays[lang] },
    });

  it("two statements about one claim, answered both ways", () => {
    says(verdict, scope(["s1", "s2"]), {
      en: "Cannot all stand. Your selection answers whether the door was open at three both ways.",
      es: "No pueden sostenerse todas. Tu selección responde a si la puerta estaba abierta a las tres de las dos maneras.",
      fr: "Elles ne peuvent pas toutes tenir. Votre sélection répond à si la porte était ouverte à trois heures des deux façons.",
    });
  });

  it("two claims answered both ways, joined with the author's separator", () => {
    says(verdict, scope(["s1", "s2", "s3", "s4"]), {
      en: "Cannot all stand. Your selection answers whether the door was open at three, and whether anything was entered after three both ways.",
      es: "No pueden sostenerse todas. Tu selección responde a si la puerta estaba abierta a las tres, y si se registró algo después de las tres de las dos maneras.",
      fr: "Elles ne peuvent pas toutes tenir. Votre sélection répond à si la porte était ouverte à trois heures, et si quelque chose a été enregistré après trois heures des deux façons.",
    });
  });

  it("fewer than two held", () => {
    says(verdict, scope(["s1"]), {
      en: "Hold two statements at once and see whether the file can keep them both.",
      es: "Sostén dos afirmaciones a la vez y mira si el expediente puede con las dos.",
      fr: "Tenez deux déclarations à la fois et voyez si le dossier peut les garder toutes les deux.",
    });
  });

  it("two statements answering different questions do not contradict each other", () => {
    says(verdict, scope(["s1", "s3"]), {
      en: "These 2 can stand together.",
      es: "Estas 2 pueden sostenerse juntas.",
      fr: "Ces 2 peuvent tenir ensemble.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* evidence-score — a live variable against a field of the item being printed  */
/* -------------------------------------------------------------------------- */

describe("evidence-score", () => {
  const account: Record<Lang, GroupItem[]> = {
    en: [
      {
        id: "a1",
        plain: "The door was locked from the inside.",
        hedged: "The door is described as having been locked from the inside.",
        floor: 70,
        keep: 0,
      },
      {
        id: "a2",
        plain: "The clerk turned the visitor away at eleven.",
        hedged: "Someone, probably the clerk, turned a visitor away late in the evening.",
        floor: 45,
        keep: 15,
      },
      {
        id: "a3",
        plain: "The register gives the visitor's name in full.",
        hedged: "The register gives a name, in a hand that is not the clerk's.",
        floor: 80,
        keep: 35,
      },
    ] as GroupItem[],
    es: [
      {
        id: "a1",
        plain: "La puerta estaba cerrada por dentro.",
        hedged: "Se dice que la puerta estaba cerrada por dentro.",
        floor: 70,
        keep: 0,
      },
      {
        id: "a2",
        plain: "El oficinista despidió a la visita a las once.",
        hedged: "Alguien, probablemente el oficinista, despidió a una visita ya de noche.",
        floor: 45,
        keep: 15,
      },
      {
        id: "a3",
        plain: "El registro da el nombre completo de la visita.",
        hedged: "El registro da un nombre, en una letra que no es la del oficinista.",
        floor: 80,
        keep: 35,
      },
    ] as GroupItem[],
    fr: [
      {
        id: "a1",
        plain: "La porte était fermée de l'intérieur.",
        hedged: "La porte est décrite comme ayant été fermée de l'intérieur.",
        floor: 70,
        keep: 0,
      },
      {
        id: "a2",
        plain: "Le commis a renvoyé le visiteur à onze heures.",
        hedged: "Quelqu'un, probablement le commis, a renvoyé un visiteur tard dans la soirée.",
        floor: 45,
        keep: 15,
      },
      {
        id: "a3",
        plain: "Le registre donne le nom du visiteur en toutes lettres.",
        hedged: "Le registre donne un nom, d'une main qui n'est pas celle du commis.",
        floor: 80,
        keep: 35,
      },
    ] as GroupItem[],
  };

  const clause: Record<Lang, PhraseLike> = {
    en: {
      of: "item",
      cases: [
        { when: cmp(">=", read("trust"), read("item.floor")), say: "{item.plain}" },
        { say: "{item.hedged}" },
      ],
    },
    es: {
      of: "item",
      cases: [
        { when: cmp(">=", read("trust"), read("item.floor")), say: "{item.plain}" },
        { say: "{item.hedged}" },
      ],
    },
    fr: {
      of: "item",
      cases: [
        { when: cmp(">=", read("trust"), read("item.floor")), say: "{item.plain}" },
        { say: "{item.hedged}" },
      ],
    },
  };

  const survival: Record<Lang, PhraseLike> = {
    en: {
      on: "surviving",
      cases: [
        { is: 1, say: "1 of {total} claims survives at this reliability; {asserted} are stated without hedging." },
        { say: "{surviving} of {total} claims survive at this reliability; {asserted} are stated without hedging." },
      ],
    },
    es: {
      on: "surviving",
      cases: [
        { is: 1, say: "1 de {total} afirmaciones sobrevive a esta fiabilidad; {asserted} se dicen sin matizar." },
        { say: "{surviving} de {total} afirmaciones sobreviven a esta fiabilidad; {asserted} se dicen sin matizar." },
      ],
    },
    fr: {
      on: "surviving",
      cases: [
        { is: 1, say: "1 affirmation sur {total} survit à cette fiabilité ; {asserted} sont énoncées sans réserve." },
        { say: "{surviving} affirmations sur {total} survivent à cette fiabilité ; {asserted} sont énoncées sans réserve." },
      ],
    },
  };

  const scope = (trust: number, subject?: (lang: Lang) => Value) => (lang: Lang) =>
    createScope({
      subject: subject ? subject(lang) : undefined,
      state: { trail: [], variables: { trust }, logs: {}, readings: 1 },
      groups: {
        account: {
          fields: ["plain", "hedged", "floor", "keep"],
          discipline: { keeps: "duplicates", removes: "none", marks: [] },
          items: account[lang],
        },
        said: { of: "account", where: cmp(">=", read("trust"), read("keep")) },
        plainly: {
          of: "account",
          where: all(cmp(">=", read("trust"), read("keep")), cmp(">=", read("trust"), read("floor"))),
        },
      },
      names: {
        surviving: named(count("said")),
        total: named(count("account")),
        asserted: named(count("plainly")),
      },
    });

  it("trust >= item.floor — the clause is stated plainly", () => {
    says(clause, scope(72, (lang) => account[lang][0]), {
      en: "The door was locked from the inside.",
      es: "La puerta estaba cerrada por dentro.",
      fr: "La porte était fermée de l'intérieur.",
    });
  });

  it("otherwise — the same clause, hedged, chosen by a dial the reader moves", () => {
    says(clause, scope(50, (lang) => account[lang][0]), {
      en: "The door is described as having been locked from the inside.",
      es: "Se dice que la puerta estaba cerrada por dentro.",
      fr: "La porte est décrite comme ayant été fermée de l'intérieur.",
    });
  });

  it("an apostrophe in an interpolated clause survives escaping", () => {
    says(clause, scope(90, (lang) => account[lang][2]), {
      en: "The register gives the visitor's name in full.",
      es: "El registro da el nombre completo de la visita.",
      fr: "Le registre donne le nom du visiteur en toutes lettres.",
    });
  });

  it("survival is: 1 — the verb takes the first number in all three languages", () => {
    says(survival, scope(10), {
      en: "1 of 3 claims survives at this reliability; 0 are stated without hedging.",
      es: "1 de 3 afirmaciones sobrevive a esta fiabilidad; 0 se dicen sin matizar.",
      fr: "1 affirmation sur 3 survit à cette fiabilité ; 0 sont énoncées sans réserve.",
    });
  });

  it("survival otherwise", () => {
    says(survival, scope(72), {
      en: "3 of 3 claims survive at this reliability; 2 are stated without hedging.",
      es: "3 de 3 afirmaciones sobreviven a esta fiabilidad; 2 se dicen sin matizar.",
      fr: "3 affirmations sur 3 survivent à cette fiabilité ; 2 sont énoncées sans réserve.",
    });
  });

  it("the reading, whose unit is prose and whose spacing is French", () => {
    const at = scope(72)("en");
    expect(interpolate("{trust}%", at)).toBe("72%");
    expect(interpolate("{trust} %", at)).toBe("72 %");
  });
});

/* -------------------------------------------------------------------------- */
/* meta-editor — agreement inside one sentence, and the join that cannot be written */
/* -------------------------------------------------------------------------- */

describe("meta-editor", () => {
  const substitutions: Record<Lang, PhraseLike> = {
    en: {
      on: "edits",
      cases: [
        { when: not(read("editing")), say: "The editor is off: this is the sentence as you typed it." },
        { is: 1, say: "1 substitution, underlined, and it tells a screen reader the words it replaced." },
        { say: "{edits} substitutions, underlined, and each one tells a screen reader the words it replaced." },
      ],
    },
    es: {
      on: "edits",
      cases: [
        { when: not(read("editing")), say: "El editor está apagado: esta es la frase tal y como la escribiste." },
        { is: 1, say: "1 sustitución, subrayada, y le dice a un lector de pantalla las palabras que reemplazó." },
        { say: "{edits} sustituciones, subrayadas, y cada una le dice a un lector de pantalla las palabras que reemplazó." },
      ],
    },
    fr: {
      on: "edits",
      cases: [
        { when: not(read("editing")), say: "Le correcteur est éteint : voici la phrase telle que vous l'avez tapée." },
        { is: 1, say: "1 substitution, soulignée, et elle indique à un lecteur d'écran les mots qu'elle a remplacés." },
        { say: "{edits} substitutions, soulignées, et chacune indique à un lecteur d'écran les mots qu'elle a remplacés." },
      ],
    },
  };

  const rules = [
    { id: "r1", from: "I saw", to: "I believe I saw" },
    { id: "r2", from: "does not", to: "appears not to" },
    { id: "r3", from: "certainly", to: "perhaps" },
  ] as GroupItem[];

  const scope = (edits: number, editing: boolean) => () =>
    createScope({
      phraseName: "house-style",
      state: { trail: [], variables: { edits, editing }, logs: {}, readings: 1 },
      groups: {
        rules: { fields: ["from", "to"], discipline: { keeps: "duplicates", removes: "none", marks: [] }, items: rules },
      },
      bindings: { part: { id: "p1", was: "I saw" } as GroupItem },
    });

  it("not editing", () => {
    says(substitutions, scope(0, false), {
      en: "The editor is off: this is the sentence as you typed it.",
      es: "El editor está apagado: esta es la frase tal y como la escribiste.",
      fr: "Le correcteur est éteint : voici la phrase telle que vous l'avez tapée.",
    });
  });

  it("is: 1 — subrayada, agreeing with a number in the same sentence", () => {
    says(substitutions, scope(1, true), {
      en: "1 substitution, underlined, and it tells a screen reader the words it replaced.",
      es: "1 sustitución, subrayada, y le dice a un lector de pantalla las palabras que reemplazó.",
      fr: "1 substitution, soulignée, et elle indique à un lecteur d'écran les mots qu'elle a remplacés.",
    });
  });

  it("otherwise — subrayadas", () => {
    says(substitutions, scope(3, true), {
      en: "3 substitutions, underlined, and each one tells a screen reader the words it replaced.",
      es: "3 sustituciones, subrayadas, y cada una le dice a un lector de pantalla las palabras que reemplazó.",
      fr: "3 substitutions, soulignées, et chacune indique à un lecteur d'écran les mots qu'elle a remplacés.",
    });
  });

  it("the accessible note", () => {
    const at = scope(1, true)();
    expect(interpolate("(was: {part.was})", at)).toBe("(was: I saw)");
    expect(interpolate("(antes: {part.was})", at)).toBe("(antes: I saw)");
    expect(interpolate("(avant : {part.was})", at)).toBe("(avant : I saw)");
  });

  it("the house style is a join of sentences, and `field:` takes one name — so it is not writable", () => {
    const houseStyle: PhraseLike = { list: "rules", field: "from", sep: "; ", cases: [{ say: "{house-style.list}" }] };
    // What the corpus needs is "I saw to I believe I saw; does not to appears
    // not to; certainly to perhaps". A field can only name one of the two.
    expect(resolvePhrase(houseStyle, scope(3, true)())).toBe("I saw; does not; certainly");
  });
});

/* -------------------------------------------------------------------------- */
/* ending-lens — the option carries its own preposition                        */
/* -------------------------------------------------------------------------- */

describe("ending-lens", () => {
  const lenses: Record<Lang, GroupItem[]> = {
    en: [{ id: "haunting", label: "as haunting" }] as GroupItem[],
    es: [{ id: "haunting", label: "como aparición" }] as GroupItem[],
    fr: [{ id: "haunting", label: "comme hantise" }] as GroupItem[],
  };

  it("the option label", () => {
    const at = (lang: Lang) => createScope({ bindings: { item: lenses[lang][0] } });
    expect(interpolate("Read {item.label}", at("en"))).toBe("Read as haunting");
    expect(interpolate("Leer {item.label}", at("es"))).toBe("Leer como aparición");
    expect(interpolate("Lire {item.label}", at("fr"))).toBe("Lire comme hantise");
  });
});

/* -------------------------------------------------------------------------- */
/* column-lab — a phrase dispatched on the option it is printed for            */
/* -------------------------------------------------------------------------- */

describe("column-lab", () => {
  const optionLabel: Record<Lang, PhraseLike> = {
    en: { of: "option", cases: [{ is: 1, say: "1 column" }, { say: "{option} columns" }] },
    es: { of: "option", cases: [{ is: 1, say: "1 columna" }, { say: "{option} columnas" }] },
    fr: { of: "option", cases: [{ is: 1, say: "1 colonne" }, { say: "{option} colonnes" }] },
  };

  const surface: Record<Lang, PhraseLike> = {
    en: { say: "{cols} up, {gutter}px gutter" },
    es: { say: "{cols} columnas, medianil de {gutter}px" },
    fr: { say: "{cols} colonnes, gouttière de {gutter}px" },
  };

  const forOption = (option: number) => () => createScope({ subject: option });
  const at = () =>
    createScope({ state: { trail: [], variables: { cols: 2, gutter: 28 }, logs: {}, readings: 1 } });

  it("is: 1", () => {
    says(optionLabel, forOption(1), { en: "1 column", es: "1 columna", fr: "1 colonne" });
  });

  it("otherwise", () => {
    says(optionLabel, forOption(3), { en: "3 columns", es: "3 columnas", fr: "3 colonnes" });
  });

  it("the surface line — {gutter} prints 28 and the author writes px", () => {
    says(surface, at, {
      en: "2 up, 28px gutter",
      es: "2 columnas, medianil de 28px",
      fr: "2 colonnes, gouttière de 28px",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* route-snapshots — not a document, and the one arithmetic site of the corpus */
/* -------------------------------------------------------------------------- */

describe("route-snapshots", () => {
  const kept: Record<Lang, PhraseLike> = {
    en: { say: "Walks kept: {kept}. Pick two." },
    es: { say: "Paseos guardados: {kept}. Elige dos." },
    fr: { say: "Promenades gardées : {kept}. Choisissez-en deux." },
  };

  const compared: Record<Lang, PhraseLike> = {
    en: {
      on: "part",
      cases: [
        { when: read("same"), say: "The two walks are the same, step for step." },
        { say: "They agree for {part} steps, and part at step {part + 1}." },
      ],
    },
    es: {
      on: "part",
      cases: [
        { when: read("same"), say: "Los dos paseos son el mismo, paso por paso." },
        { say: "Coinciden durante {part} pasos, y se separan en el paso {part + 1}." },
      ],
    },
    fr: {
      on: "part",
      cases: [
        { when: read("same"), say: "Les deux promenades sont la même, pas pour pas." },
        { say: "Elles concordent pendant {part} pas, et se séparent au pas {part + 1}." },
      ],
    },
  };

  const at = (same: boolean) => () =>
    createScope({ state: { trail: [], variables: { kept: 2, part: 3, same }, logs: {}, readings: 1 } });

  it("walks kept", () => {
    says(kept, at(false), {
      en: "Walks kept: 2. Pick two.",
      es: "Paseos guardados: 2. Elige dos.",
      fr: "Promenades gardées : 2. Choisissez-en deux.",
    });
  });

  it("the same walk twice", () => {
    says(compared, at(true), {
      en: "The two walks are the same, step for step.",
      es: "Los dos paseos son el mismo, paso por paso.",
      fr: "Les deux promenades sont la même, pas pour pas.",
    });
  });

  it("{part + 1} is not a path, so it is left standing rather than evaluated", () => {
    says(compared, at(false), {
      en: "They agree for 3 steps, and part at step {part + 1}.",
      es: "Coinciden durante 3 pasos, y se separan en el paso {part + 1}.",
      fr: "Elles concordent pendant 3 pas, et se séparent au pas {part + 1}.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* The nineteen reader-facing lines that are not clauses: labels, accessible   */
/* notes and badges. They carry no interpolation, so what has to be true of    */
/* them is that nothing touches them.                                          */
/* -------------------------------------------------------------------------- */

describe("the fixed lines", () => {
  const fixed: Array<[string, Record<Lang, string>]> = [
    ["document-packet, the badge", { en: "opened", es: "abierta", fr: "ouverte" }],
    [
      "motif-passes, the first control",
      {
        en: 'The pass that keeps "door"',
        es: "La pasada que conserva «puerta»",
        fr: "La passe qui garde « porte »",
      },
    ],
    [
      "motif-passes, the second control",
      {
        en: 'The pass that strikes "empty"',
        es: "La pasada que tacha «vacío»",
        fr: "La passe qui raye « vide »",
      },
    ],
    [
      "motif-passes, the kept note",
      {
        en: "kept by the second clerk",
        es: "conservada por el segundo escribiente",
        fr: "gardé par le second greffier",
      },
    ],
    [
      "motif-passes, the struck note",
      {
        en: "struck by the second clerk",
        es: "tachada por el segundo escribiente",
        fr: "rayé par le second greffier",
      },
    ],
    [
      "two-accounts, the note",
      {
        en: "(the point you marked)",
        es: "(el punto que marcaste)",
        fr: "(le point que vous avez marqué)",
      },
    ],
    [
      "disputed-hour, the control",
      {
        en: "Only the minutes they dispute",
        es: "Solo los minutos en que discrepan",
        fr: "Seulement les minutes sur lesquelles ils divergent",
      },
    ],
    [
      "contradiction, a statement",
      {
        en: "The main door was sealed at three o'clock.",
        es: "La puerta principal estaba sellada a las tres.",
        fr: "La porte principale était scellée à trois heures.",
      },
    ],
    [
      "contradiction, a subject",
      {
        en: "whether the door was open at three",
        es: "si la puerta estaba abierta a las tres",
        fr: "si la porte était ouverte à trois heures",
      },
    ],
    [
      "evidence-score, a clause",
      {
        en: "The door was locked from the inside.",
        es: "La puerta estaba cerrada por dentro.",
        fr: "La porte était fermée de l'intérieur.",
      },
    ],
    ["ending-lens, a lens", { en: "as haunting", es: "como aparición", fr: "comme hantise" }],
    ["route-snapshots, the flags", { en: "shared", es: "compartido", fr: "partagé" }],
  ];

  const at = createScope();

  for (const [what, lines] of fixed) {
    it(what, () => {
      for (const lang of langs) {
        expect(interpolate(lines[lang], at), lang).toBe(lines[lang]);
      }
    });
  }
});
