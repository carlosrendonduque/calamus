/**
 * The narrative document, as data.
 *
 * This file is the contract between the parser, the evaluator and the renderer.
 * It is deliberately the only place any of them agree, so the three can be built
 * and tested apart. See `docs/formato.md` for the authored syntax and
 * `docs/contrato-ranuras.md` for the registry seam.
 *
 * Rule that governs every name below, from decision 30: an authored name belongs
 * to the author. The schema supplies operators and never vocabulary.
 */

/* -------------------------------------------------------------------------- */
/* Values                                                                      */
/* -------------------------------------------------------------------------- */

export type Scalar = string | number | boolean;

/** A path of at most one dot: `lines`, `item.floor`. Never an expression. */
export type Path = string;

/* -------------------------------------------------------------------------- */
/* Expressions — comparisons and counts only. No arithmetic (decision 26).     */
/* -------------------------------------------------------------------------- */

export type Comparison = "==" | "!=" | "<" | "<=" | ">" | ">=";

export type Expression =
  | { kind: "literal"; value: Scalar }
  | { kind: "read"; path: Path }
  | { kind: "compare"; op: Comparison; left: Expression; right: Expression }
  | { kind: "not"; of: Expression }
  | { kind: "and"; of: Expression[] }
  | { kind: "or"; of: Expression[] }
  /** `visits(node)` — counts repeats, never a set (three examples need this). */
  | { kind: "visits"; node: string }
  | { kind: "visited"; node: string }
  /** `count(group where ...)`, `some(...)`, `first`, `last`, `in`. */
  | { kind: "count"; group: string; where?: Expression }
  | { kind: "some"; group: string; where?: Expression };

/* -------------------------------------------------------------------------- */
/* Groups and logs — one primitive, not two (a log is a group that grows).      */
/* -------------------------------------------------------------------------- */

export type GroupDiscipline = {
  /** `unique` is what keeps decision 26 honest: without it, counting distinct
   *  sheets needs subtraction, which is arithmetic. */
  keeps: "duplicates" | "unique";
  removes: "none" | "last" | "any";
  /** Field names the author chose, markable rather than removable. */
  marks: string[];
};

export type GroupItem = { id: string } & Record<string, Scalar>;

export type GroupDef = {
  /** Field names. The author's vocabulary; the schema never reads them. */
  fields: string[];
  discipline: GroupDiscipline;
  items: GroupItem[];
};

/* -------------------------------------------------------------------------- */
/* Derived names — the only place computation is allowed to live               */
/* -------------------------------------------------------------------------- */

export type NameDef =
  | { kind: "expression"; of: Expression }
  /** Group first, then quantify inside each group. v0 quantified without
   *  grouping and declared contradictions that did not exist. */
  | { kind: "grouped"; over: string; by: string; test: "split" | "agree" }
  /** Resolved by the registry's `derivations` namespace. */
  | { kind: "derivation"; name: string; params: Record<string, unknown> };

/* -------------------------------------------------------------------------- */
/* Phrases — ordered cases, each a whole clause                                */
/* -------------------------------------------------------------------------- */

export type PhraseCase = {
  /** `is: n` is sugar for `when: on == n`. */
  is?: number;
  when?: Expression;
  /** The clause. May carry `{name}` and `{item.field}` interpolations. */
  say: string;
};

export type PhraseDef = {
  /** The value the cases are chosen against. */
  on?: Path;
  /** Binds the phrase to the item of the group printing it. Without this there
   *  is no gender agreement in Spanish or French. */
  of?: string;
  /** Registry name of a plural selector. `exact` covers es/en/fr/de/it/pt. */
  plural?: string;
  cases: PhraseCase[];
};

/* -------------------------------------------------------------------------- */
/* Variables                                                                   */
/* -------------------------------------------------------------------------- */

export type VariableDef = {
  type: "number" | "boolean" | "enum" | "string" | "list";
  default: Scalar | Scalar[];
  min?: number;
  max?: number;
  of?: Scalar[];
  /** Whether the reader may move it, and with what. */
  control?: "range" | "toggle" | "choice" | "text";
  /** Appended to the CSS custom property. `gutter: 28` needs `px` to be valid. */
  unit?: string;
  persist?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Inline content                                                              */
/* -------------------------------------------------------------------------- */

export type Inline =
  | { kind: "text"; text: string }
  /** `{name}` or `{item.field}`. Always escaped, never recursive. */
  | { kind: "interpolation"; path: Path }
  /** `:mark[...]{kind=...}` — the kind is an authored name. */
  | { kind: "mark"; markKind: string; children: Inline[] }
  /** `:go{to=}` navigates, `:go{show=}` reveals, `:do{move=}` writes. */
  | { kind: "affordance"; action: "go" | "show" | "do"; target: string; focus?: boolean; children: Inline[] }
  /** `:slot[...]{name=...}` — inline registry view. */
  | { kind: "slot"; name: string; params: Record<string, unknown>; children: Inline[] };

/* -------------------------------------------------------------------------- */
/* Blocks                                                                      */
/* -------------------------------------------------------------------------- */

/** Attributes a `:with` may put on the paragraph that contains it. */
export type BlockAttrs = {
  when?: Expression;
  weight?: number;
  id?: string;
  voice?: string;
  lang?: string;
  mark?: string;
  live?: boolean;
};

export type Block =
  | { kind: "paragraph"; attrs: BlockAttrs; content: Inline[] }
  | { kind: "heading"; level: 1 | 2 | 3; content: Inline[] }
  /** `:each{of=group where ...}` followed by the blocks it prints per item. */
  | { kind: "each"; group: string; where?: Expression; body: Block[] }
  /** A named region, revealed in place. Distinct from a node, which replaces. */
  | { kind: "region"; id: string; body: Block[] }
  /** A registry view occupying a block. */
  | { kind: "slot"; name: string; params: Record<string, unknown>; body: Block[] }
  /** Blank measure, which in Mallarmé is grammar rather than styling. */
  | { kind: "blank"; lines: number }
  /** An island whose name nothing resolved: kept verbatim and re-serialised. */
  | { kind: "unknown"; raw: string };

/* -------------------------------------------------------------------------- */
/* Nodes — a node replaces; a region reveals in place                          */
/* -------------------------------------------------------------------------- */

export type Exit = {
  to: string;
  label: string;
  when?: Expression;
};

export type NodeDef = {
  id: string;
  /** "May I enter here?" — the second of the two gates. */
  requires?: Expression;
  /** "May I leave that way?" — the first gate lives on the exit. */
  exits: Exit[];
  body: Block[];
};

/* -------------------------------------------------------------------------- */
/* The document                                                               */
/* -------------------------------------------------------------------------- */

export type Opens = {
  /** The starting node is in the trail, not before it. */
  trail?: string[];
  /** Two examples open mid-reading on purpose. */
  readings?: number;
};

export type NarrativeDocument = {
  title: string;
  subtitle?: string;
  lang?: string;
  variables: Record<string, VariableDef>;
  groups: Record<string, GroupDef>;
  names: Record<string, NameDef>;
  phrases: Record<string, PhraseDef>;
  opens?: Opens;
  /** Registry names the document uses, so a second implementation can validate
   *  it without the registry. Yarn Spinner could not do this. */
  uses: { name: string; kind: RegistryKind }[];
  /** A document with no nodes is the flat case: prose in order (decision 22). */
  nodes: NodeDef[];
  /** Used only when `nodes` is empty. */
  body: Block[];
};

/* -------------------------------------------------------------------------- */
/* Reading state                                                              */
/* -------------------------------------------------------------------------- */

export type ReadingState = {
  /** Ordered, with repeats. `visits()` counts them. */
  trail: string[];
  variables: Record<string, Scalar | Scalar[]>;
  /** Author-named logs, each a growing group. */
  logs: Record<string, GroupItem[]>;
  readings: number;
};

/* -------------------------------------------------------------------------- */
/* Registry — five namespaces, because two of fourteen are not components      */
/* -------------------------------------------------------------------------- */

export type RegistryKind = "views" | "marks" | "orders" | "derivations" | "plurals";

/** An ordering receives ids and returns a permutation of them. */
export type OrderFn = (ids: string[], state: ReadingState) => string[];

/** A derivation returns values in the format's own primitives, never nodes. */
export type DerivationFn = (
  params: Record<string, unknown>,
  state: ReadingState
) => { items?: GroupItem[] } & Record<string, Scalar>;

/** A plural selector picks a case index. `exact` matches integers. */
export type PluralFn = (n: number) => number | null;

/* -------------------------------------------------------------------------- */
/* Parse diagnostics — never throw; fail towards legible (decision 28)         */
/* -------------------------------------------------------------------------- */

export type Diagnostic = {
  severity: "error" | "warning";
  message: string;
  line?: number;
};

export type ParseResult = {
  document: NarrativeDocument;
  diagnostics: Diagnostic[];
};
