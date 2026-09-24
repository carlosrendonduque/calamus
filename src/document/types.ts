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

/** A name, or names joined by dots: `lines`, `item.floor`, `entry.note.mark`.
 *  Never an expression — that rule is what stops this becoming a template
 *  language, and 152 interpolations across the corpus never needed one. */
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
  /** The node may be named literally or reached by a path (`exit.to`). */
  | { kind: "visits"; node: Path }
  | { kind: "visited"; node: Path }
  /** `count(group where ...)`, `some(...)`, `first`, `last`, `in`. */
  | { kind: "count"; group: string; where?: Expression }
  | { kind: "some"; group: string; where?: Expression }
  | { kind: "first"; group: string; where?: Expression }
  | { kind: "last"; group: string; where?: Expression }
  /** `in(log, item)` — membership, which is not the same as counting. */
  | { kind: "in"; group: string; value: Expression }
  /** `persisted(name)` — whether a value survived a previous reading. */
  | { kind: "persisted"; name: string };

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

/** A declared item names itself; a log entry has no name until it is written,
 *  so the id is optional and the runtime supplies the position. */
export type GroupItem = { id?: string } & Record<string, Scalar>;

export type GroupDef = {
  /** Field names. The author's vocabulary; the schema never reads them. */
  fields: string[];
  discipline: GroupDiscipline;
  items: GroupItem[];
  /** A group may instead be a filtered view of another group. */
  derivedFrom?: { group: string; where?: Expression };
};

/* -------------------------------------------------------------------------- */
/* Derived names — the only place computation is allowed to live               */
/* -------------------------------------------------------------------------- */

export type NameDef =
  | { kind: "expression"; of: Expression }
  /** Group first, then quantify inside each group. v0 quantified without
   *  grouping and declared contradictions that did not exist. */
  | {
      kind: "grouped";
      over: string;
      /** The author's field to group by. */
      by: string;
      /** The author's field carrying the answer. Without it the test compares
       *  every other field and every bucket splits, because the prose differs. */
      answer?: string;
      test: "split" | "agree";
    }
  /** Resolved by the registry's `derivations` namespace. */
  | { kind: "derivation"; name: string; params: Record<string, unknown> };

/* -------------------------------------------------------------------------- */
/* Phrases — ordered cases, each a whole clause                                */
/* -------------------------------------------------------------------------- */

export type PhraseCase = {
  /** `is: v` is sugar for `when: on == v`, for a number or a boolean. */
  is?: number | boolean;
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
  /** Joining a list: the author supplies the separators literally, because
   *  Spanish turns "y" into "e" before i- and the library must never choose. */
  /** `field` is absent when the items have no single nameable field -- they may
   *  be sentences built from several. `sep` defaults to ", ". */
  list?: { of: string; field?: string; sep?: string; last?: string };
  /** A phrase with nothing to choose between is a single unconditional clause. */
  say?: string;
  cases?: PhraseCase[];
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
  /** Prose someone reads. Ten of nineteen documents label a control. */
  label?: string;
  /** Where the control sits, and how its steps and rows are drawn. */
  placement?: string;
  step?: number;
  rows?: number;
  /** An option's label is prose. Either one label per option, or — which is what
   *  every document that takes its options from a group actually writes — a
   *  single clause read with the option bound, exactly as `PhraseDef.of` does.
   *  A per-option map cannot label each option with its own field. */
  optionLabels?: Record<string, string> | string;
  /** The options are the items of a group the author declared. */
  optionsFrom?: string;
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
  | { kind: "mark"; markKind: string; when?: Expression; children: Inline[] }
  /** `:go{to=}` navigates, `:go{show=}` reveals, `:do{move=}` writes. */
  | {
      kind: "affordance";
      action: "go" | "show" | "do";
      target: string;
      focus?: boolean;
      when?: Expression;
      /** An argument to the move, so one move serves many spans. */
      item?: string;
      /** The span being left, so a return knows where to put the focus back. */
      id?: string;
      children: Inline[];
    }
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
  /** `true`, or the ARIA politeness the author asked for (`polite`, `status`). */
  live?: boolean | string;
  /** A role the author names (`heading`, `caption`, `time`), not a number. */
  role?: string;
};

export type Block =
  | { kind: "paragraph"; attrs: BlockAttrs; content: Inline[] }
  | { kind: "heading"; level: 1 | 2 | 3; content: Inline[] }
  /** `:each{of=group where ...}` followed by the blocks it prints per item. */
  | {
      kind: "each";
      group: string;
      where?: Expression;
      /** Registry `orders` name. Exit order is structure, not presentation. */
      order?: string;
      /** Reader-facing prose when nothing matches. Losing it loses prose. */
      empty?: Block[];
      /** A loop and a region carry what a paragraph carries. `heading` and
       *  `label` here are prose: "Your route so far". */
      attrs?: BlockAttrs;
      heading?: string;
      label?: string;
      /** What the loop is presented as: a list, an apparatus, a column. */
      as?: string;
      /** Which item the reader is on. A value, not a name, so it is read. */
      current?: Expression;
      body: Block[];
    }
  /** A named region, revealed in place. Distinct from a node, which replaces. */
  | { kind: "region"; id: string; attrs?: BlockAttrs; body: Block[] }
  /** A registry view occupying a block. */
  | { kind: "slot"; name: string; params: Record<string, unknown>; body: Block[] }
  /** A control or a button standing on its own. Eight of nineteen end in one. */
  | {
      kind: "affordance";
      action: "go" | "show" | "do";
      /** A declared move, or the node or region this reaches. */
      target: string;
      label: string;
      when?: Expression;
      /** A gesture spelled out at the call site rather than declared: seven of
       *  the eight controls in the corpus do this. */
      gesture?: Move[];
    }
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
  /** Reader-facing prose on the exit itself ("seen"), not a style. */
  note?: string;
  /** Logs or variables this exit returns to their opening value. */
  resets?: string[];
};

export type NodeDef = {
  id: string;
  /** Printed when the trail names this node back to the reader. */
  title?: string;
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
  /** A document may open with a log already holding entries, or a variable
   *  already moved, because a text with no trace cannot show that it keeps one. */
  /** Entries, or just how many — a text with no trace cannot show it keeps one. */
  logs?: Record<string, GroupItem[] | number>;
  variables?: Record<string, Scalar | Scalar[]>;
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
  /** Author-declared vocabularies. The schema stores them and reads none of
   *  them: a mark kind, a move name and a control are the author's words. */
  marks: Record<string, Record<string, Scalar>>;
  /** A move names what it may write, and declares the rest of its gesture
   *  beside it — what it resets, focuses, shows, and the prose a screen reader
   *  hears. Those keys are the author's, stored and never read by the schema. */
  moves: Record<string, { writes: string[] } & Record<string, unknown>>;
  controls: Record<string, Record<string, Scalar>>;
  /** The document's own prose: the blocks standing before the first node header,
   *  and the whole body when there are no nodes. It **frames** the node the
   *  reader is on rather than replacing it, so a trail or a standing apparatus
   *  written at the top of the file is on every screen — which is the only way
   *  to say it, since nothing else prints around whichever node is current. */
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

/** What a reader's gesture asks of the document. The renderer, the parser and
 *  the evaluator must agree on this, so it lives here and nowhere else. This is
 *  the reducer's shape: it was written against the corpus and mine was written
 *  against the design note, and the corpus was right. */
export type EntryAddress = {
  at?: number | string;
  match?: Record<string, Scalar>;
  from?: "first" | "last";
};

export type Move =
  /** A node replaces, and the trail records it again every time. */
  | { kind: "enter"; node: string }
  /** `to: back`. The trail shortens, so `visits()` is not monotonic. */
  | { kind: "back"; steps?: number }
  | { kind: "set"; name: string; value: Scalar | Scalar[] }
  | { kind: "add"; log: string; entry: Record<string, Scalar> }
  | { kind: "remove"; log: string; address?: EntryAddress }
  /** Writing a field of an entry already written, which only `marks:` allows. */
  | { kind: "mark"; log: string; field: string; value?: Scalar; address?: EntryAddress }
  /** A reset states where each name goes, and a document that writes
   *  `resets: [a, b]` is stating "back to what they opened on" — which only the
   *  runtime knows, so it is named rather than spelled out. */
  | {
      kind: "reset";
      /** Back to their opening values. */
      names?: string[];
      logs?: Record<string, GroupItem[] | number>;
      variables?: Record<string, Scalar | Scalar[]>;
      trail?: string[];
      readings?: number;
    }
  | { kind: "read" }
  /** One gesture, several effects (`moves:` in the corpus). */
  | { kind: "gesture"; moves: Move[] };

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
) => { items?: GroupItem[]; values?: Record<string, Scalar> };

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
