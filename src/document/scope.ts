/**
 * The scope an expression, a phrase or an interpolation is read in.
 *
 * Plain data throughout: no DOM, no React, no runtime dependency. The author's
 * vocabulary arrives in `groups`, `names`, `phrases`, `variables` and
 * `bindings`; this file supplies operators and the closed list of accessors,
 * and nothing else (decision 30).
 */

import type {
  DerivationFn,
  Diagnostic,
  GroupItem,
  NameDef,
  NarrativeDocument,
  OrderFn,
  PluralFn,
  ReadingState,
  Scalar,
  VariableDef,
} from "./types";
import type { GroupSource, PhraseLike } from "./shapes";

/** Anything a name, a path or an expression can come back as. */
export type Value = Scalar | Scalar[] | GroupItem | GroupItem[] | undefined;

export type Registry = {
  plurals?: Record<string, PluralFn>;
  derivations?: Record<string, DerivationFn>;
  orders?: Record<string, OrderFn>;
};

/**
 * The closed list of names the schema itself supplies, written down once
 * because pretending it is empty is how collisions are found late (conformance
 * §3.3). An author may shadow any of them: they are looked up last.
 *
 * - `item`: the member of a group a filter or a region is printing.
 * - `here`: the node the trail ends on.
 */
export type Accessors = { item: string; here: string };

export const ACCESSORS: Accessors = { item: "item", here: "here" };

export type Scope = {
  state: ReadingState;
  /** Declarations, for defaults only; live values live in `state.variables`. */
  variables: Record<string, VariableDef>;
  groups: Record<string, GroupSource>;
  names: Record<string, NameDef>;
  phrases: Record<string, PhraseLike>;
  /** Author-named subjects: what `of:` binds, what a region is printing. */
  bindings: Record<string, Value>;
  /** What a phrase with `of:` is being printed on, before it is named. */
  subject?: Value;
  /** The name the phrase being resolved was declared under, for `{name.list}`. */
  phraseName?: string;
  registry: Registry;
  accessors: Accessors;
  /** Answers `persisted()`. The caller knows; the evaluator must not ask. */
  persisted: boolean;
  /** Names being resolved, so a cycle fails legibly instead of hanging. */
  resolving: readonly string[];
};

export function emptyState(): ReadingState {
  return { trail: [], variables: {}, logs: {}, readings: 1 };
}

export function createScope(partial: Partial<Scope> = {}): Scope {
  return {
    state: partial.state ?? emptyState(),
    variables: partial.variables ?? {},
    groups: partial.groups ?? {},
    names: partial.names ?? {},
    phrases: partial.phrases ?? {},
    bindings: partial.bindings ?? {},
    subject: partial.subject,
    phraseName: partial.phraseName,
    registry: partial.registry ?? {},
    accessors: partial.accessors ?? ACCESSORS,
    persisted: partial.persisted ?? true,
    resolving: partial.resolving ?? [],
  };
}

/** The scope a document and a reading state make together. */
export function scopeFromDocument(
  document: Pick<NarrativeDocument, "variables" | "groups" | "names" | "phrases">,
  state: ReadingState,
  extra: Partial<Scope> = {}
): Scope {
  return createScope({
    ...extra,
    state,
    variables: document.variables,
    groups: { ...document.groups, ...(extra.groups ?? {}) },
    names: { ...document.names, ...(extra.names ?? {}) },
    phrases: { ...document.phrases, ...(extra.phrases ?? {}) },
  });
}

export function withBindings(scope: Scope, bindings: Record<string, Value>): Scope {
  return { ...scope, bindings: { ...scope.bindings, ...bindings } };
}

/** Bind the thing a phrase is printed on, under whatever the author called it. */
export function withSubject(scope: Scope, subject: Value, name?: string): Scope {
  const bound = name ? { ...scope.bindings, [name]: subject } : scope.bindings;
  return { ...scope, subject, bindings: bound };
}

/* -------------------------------------------------------------------------- */
/* Values                                                                      */
/* -------------------------------------------------------------------------- */

export function isItem(value: unknown): value is GroupItem {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isItemList(value: unknown): value is GroupItem[] {
  return Array.isArray(value) && value.every((entry) => isItem(entry));
}

export function isScalar(value: unknown): value is Scalar {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/** The only truth test in the evaluator. Absence is false; a gate decides
 *  separately what to do when an expression could not be read at all. */
export function truthy(value: Value): boolean {
  if (value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return !Number.isNaN(value) && value !== 0;
  if (typeof value === "string") return value !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** What a value prints as. Items print as their id, which is the only field
 *  the schema knows the name of. */
export function asText(value: Value): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return numberToText(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.map((entry) => asText(entry as Value)).join(", ");
  const id = (value as GroupItem).id;
  return typeof id === "string" ? id : "";
}

function numberToText(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

/* -------------------------------------------------------------------------- */
/* Escaping — the deliverable compiles to HTML (decisions 25 and 28)           */
/* -------------------------------------------------------------------------- */

/** Text position. Quotes are left alone on purpose: an apostrophe is prose in
 *  three of the corpus languages and escaping it would corrupt the clause. */
export function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Attribute position, where quotes end the value and so must go. */
export function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* -------------------------------------------------------------------------- */
/* Diagnostics — never throw (decision 28)                                     */
/* -------------------------------------------------------------------------- */

export function note(sink: Diagnostic[], severity: Diagnostic["severity"], message: string): void {
  sink.push({ severity, message });
}

export type Reported<T> = { value: T; diagnostics: Diagnostic[] };
