/**
 * The shapes the corpus writes that `types.ts` does not yet carry.
 *
 * `types.ts` is the contract and is not edited here. Every type in this file is
 * a widening of one of its types, each one forced by a document in
 * `docs/conformance-v1/`, and each one is assignable *from* the contract: a
 * `PhraseDef` is a `PhraseLike`, an `Expression` is an `AnyExpression`. The
 * evaluator therefore accepts everything the parser can emit today and, where
 * the corpus asks for more, does not fall over.
 *
 * Nothing here adds vocabulary: every key below is a schema key, never a name
 * an author wrote (decision 30).
 */

import type { Expression, GroupDef, GroupItem, Scalar } from "./types";

/* -------------------------------------------------------------------------- */
/* Expressions beyond the contract's union                                     */
/* -------------------------------------------------------------------------- */

/**
 * `persisted()` is N16, wanted by `session-memory`, whose subject is being
 * honest about the medium. The optional `field` on `first`/`last` is what
 * `memory` writes as `last(chosen).door`, and the `of` spelling of `in` is
 * accepted beside the contract's `value` so either parser is readable.
 */
export type ExtraExpression =
  | { kind: "persisted" }
  | { kind: "first"; group: string; where?: AnyExpression; field?: string }
  | { kind: "last"; group: string; where?: AnyExpression; field?: string }
  | { kind: "in"; group: string; of?: AnyExpression; value?: AnyExpression };

export type AnyExpression = Expression | ExtraExpression;

/* -------------------------------------------------------------------------- */
/* Groups the corpus derives instead of listing                                */
/* -------------------------------------------------------------------------- */

/**
 * `said: { of: account, where: "trust >= keep" }`. The filter reads a live
 * variable, so a parser cannot materialise it into `items` ahead of time. The
 * contract spells the same thing `derivedFrom: { group, where }`, and both are
 * read here.
 */
export type DerivedGroupDef = { of: string; where?: AnyExpression };

/** `broken: { of: chosen, by: claim, test: split }` used as a group, not a name. */
export type GroupedGroupDef = {
  of: string;
  by: string;
  test: "split" | "agree";
  keep?: string;
};

export type GroupSource = GroupDef | DerivedGroupDef | GroupedGroupDef | GroupItem[];

export function isDerivedGroup(source: GroupSource): source is DerivedGroupDef {
  return !Array.isArray(source) && "of" in source && !("by" in source);
}

/** The contract's spelling of the same thing. */
export function derivationOf(source: GroupSource): { group: string; where?: AnyExpression } | undefined {
  if (Array.isArray(source)) return undefined;
  const listed = source as GroupDef;
  if (listed.derivedFrom) return listed.derivedFrom;
  if (isDerivedGroup(source)) return { group: source.of, where: source.where };
  return undefined;
}

export function isGroupedGroup(source: GroupSource): source is GroupedGroupDef {
  return !Array.isArray(source) && "by" in source && "test" in source;
}

export function isListedGroup(source: GroupSource): source is GroupDef {
  return !Array.isArray(source) && "items" in source;
}

/* -------------------------------------------------------------------------- */
/* Phrases                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * `is: true` is written by `redaction` (three phrases dispatching on a boolean),
 * so the sugar is `when: on == <scalar>` and not only `when: on == <number>`.
 */
export type PhraseCaseLike = {
  is?: Scalar;
  when?: AnyExpression;
  say: string;
};

/**
 * Two widenings, both from the corpus:
 *
 * - `say` without `cases`: `column-lab`'s `surface` and `memory`'s `tally` are
 *   phrases with one unconditional clause.
 * - `list` / `field` / `sep` / `last`: `contradiction` and `unstable-links`
 *   join a group inside a clause and read the join back as `{<phrase>.list}`.
 */
export type ListDef = { of: string; field?: string; sep?: string; last?: string };

export type PhraseLike = {
  on?: string;
  of?: string;
  plural?: string;
  say?: string;
  /** Either the contract's `{ of, field, sep, last }` or the flat spelling the
   *  corpus writes (`list: taken` beside `field:` and `sep:`). */
  list?: string | ListDef;
  field?: string;
  sep?: string;
  last?: string;
  cases?: PhraseCaseLike[];
};

/** One reading of either spelling. */
export function listOf(phrase: PhraseLike): ListDef | undefined {
  if (phrase.list === undefined) return undefined;
  if (typeof phrase.list === "string") {
    return { of: phrase.list, field: phrase.field, sep: phrase.sep, last: phrase.last };
  }
  return phrase.list;
}

/* -------------------------------------------------------------------------- */
/* Initial state                                                               */
/* -------------------------------------------------------------------------- */

/**
 * `Opens` in the contract carries `trail` and `readings`. The corpus also seeds
 * logs (`opens: { read: [{ sheet: A }] }`, `opens: { readings: 2 }` as a literal
 * length) and variables (`opens: { note: "…" }`).
 */
export type OpensLike = {
  trail?: string[];
  readings?: number;
  logs?: Record<string, GroupItem[] | number>;
  variables?: Record<string, Scalar | Scalar[]>;
};
