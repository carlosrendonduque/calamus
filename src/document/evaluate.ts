/**
 * The expression language: comparisons, `and`/`or`/`not`, visit counts and
 * counts over groups. No arithmetic — decision 26, and it held against all
 * nineteen documents.
 *
 * Nothing here throws. An expression that cannot be read comes back as
 * `undefined` with a diagnostic, and the two gates below turn that into
 * *show*, never *hide* (decision 28).
 */

import type { Comparison, Diagnostic, Exit, GroupItem, NameDef, NodeDef, Scalar } from "./types";
import type { AnyExpression, GroupSource } from "./shapes";
import { derivationOf, isGroupedGroup, isListedGroup } from "./shapes";
import type { Reported, Scope, Value } from "./scope";
import { isItem, isScalar, note, truthy, withBindings } from "./scope";

/* -------------------------------------------------------------------------- */
/* Paths                                                                       */
/* -------------------------------------------------------------------------- */

const PATH = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/;

export function isPath(text: string): boolean {
  return PATH.test(text);
}

/**
 * A name, or names separated by dots. The first segment is looked up in the
 * namespaces below; each later one is a field of what came before, or — when
 * what came before is the id of an item somewhere — a field of that item.
 */
export function readPathInto(path: string, scope: Scope, sink: Diagnostic[]): Value {
  if (!isPath(path)) {
    note(sink, "error", `not a name or a path of names: ${path}`);
    return undefined;
  }
  const segments = path.split(".");
  const head = segments[0];
  const found = readName(head, scope, sink);
  if (!found.known) {
    note(sink, "error", `no name resolved: ${head}`);
    return undefined;
  }
  let current: Value = found.value;
  for (const segment of segments.slice(1)) {
    current = readField(current, segment, scope, sink);
    if (current === undefined) {
      note(sink, "error", `no field resolved: ${path}`);
      return undefined;
    }
  }
  return current;
}

/** The same read, for a caller that wants a value and nothing else. */
export function readPath(path: string, scope: Scope): Value {
  return readPathInto(path, scope, []);
}

export function readPathWithDiagnostics(path: string, scope: Scope): Reported<Value> {
  const diagnostics: Diagnostic[] = [];
  return { value: readPathInto(path, scope, diagnostics), diagnostics };
}

type Lookup = { known: boolean; value: Value };

/**
 * Namespace order, author first: what a region or a phrase bound, then the
 * reader's variables, then the declared defaults, then derived names, then
 * groups and logs, and only then the accessors the schema supplies.
 */
export function readName(name: string, scope: Scope, sink: Diagnostic[]): Lookup {
  if (Object.prototype.hasOwnProperty.call(scope.bindings, name)) {
    return { known: true, value: scope.bindings[name] };
  }
  if (Object.prototype.hasOwnProperty.call(scope.state.variables, name)) {
    return { known: true, value: scope.state.variables[name] };
  }
  const declared = scope.variables[name];
  if (declared) return { known: true, value: declared.default };
  const named = scope.names[name];
  if (named) {
    if (scope.resolving.includes(name)) {
      note(sink, "error", `name resolves through itself: ${name}`);
      return { known: true, value: undefined };
    }
    const inner: Scope = { ...scope, resolving: [...scope.resolving, name] };
    return { known: true, value: resolveNameInto(named, inner, sink) };
  }
  const group = groupItems(name, scope, sink, false);
  if (group) return { known: true, value: group };
  if (name === scope.accessors.here) {
    const trail = scope.state.trail;
    return { known: true, value: trail.length > 0 ? trail[trail.length - 1] : undefined };
  }
  return { known: false, value: undefined };
}

function readField(current: Value, field: string, scope: Scope, sink: Diagnostic[]): Value {
  if (isItem(current)) {
    const value = (current as Record<string, unknown>)[field];
    if (value === undefined) return undefined;
    return value as Value;
  }
  if (typeof current === "string") {
    // A field may hold the id of an item of another group, resolved when it is
    // printed rather than when it is written.
    const referenced = itemById(current, scope, sink);
    if (referenced) {
      const value = (referenced as Record<string, unknown>)[field];
      return value === undefined ? undefined : (value as Value);
    }
  }
  return undefined;
}

/** The lazy half of a field that references another group. */
function itemById(id: string, scope: Scope, sink: Diagnostic[]): GroupItem | undefined {
  for (const name of Object.keys(scope.groups)) {
    const items = groupItems(name, scope, sink, false);
    const hit = items?.find((item) => item.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Groups and logs — one primitive, so one resolver                            */
/* -------------------------------------------------------------------------- */

export function resolveGroup(name: string, scope: Scope): Reported<GroupItem[] | undefined> {
  const diagnostics: Diagnostic[] = [];
  const value = groupItems(name, scope, diagnostics, true);
  return { value, diagnostics };
}

function groupItems(
  name: string,
  scope: Scope,
  sink: Diagnostic[],
  complain: boolean
): GroupItem[] | undefined {
  const log = scope.state.logs[name];
  if (log) return identify(log, name);

  const source = scope.groups[name];
  if (source) return fromSource(name, source, scope, sink);

  const named = scope.names[name];
  if (named) {
    if (scope.resolving.includes(name)) return undefined;
    const inner: Scope = { ...scope, resolving: [...scope.resolving, name] };
    const value = resolveNameInto(named, inner, sink);
    if (Array.isArray(value)) return identify(value as GroupItem[], name);
    if (isItem(value)) return [value];
  }

  const bound = scope.bindings[name];
  if (Array.isArray(bound)) return identify(bound as GroupItem[], name);
  if (isItem(bound)) return [bound];

  if (complain) note(sink, "error", `no group resolved: ${name}`);
  return undefined;
}

function fromSource(
  name: string,
  source: GroupSource,
  scope: Scope,
  sink: Diagnostic[]
): GroupItem[] | undefined {
  if (Array.isArray(source)) return identify(source, name);
  if (isGroupedGroup(source)) {
    const over = groupItems(source.of, scope, sink, true);
    if (!over) return undefined;
    return buckets(over, source.by, source.test);
  }
  const derived = derivationOf(source);
  if (derived) {
    const over = groupItems(derived.group, scope, sink, true);
    if (!over) return undefined;
    if (!derived.where) return over;
    const where = derived.where;
    return over.filter((item) => truthy(evaluateInto(where, itemScope(scope, item), sink)));
  }
  if (isListedGroup(source)) return identify(source.items, name);
  return undefined;
}

/** Entries an author wrote without an id still need one to be removed by it. */
function identify(items: readonly GroupItem[], name: string): GroupItem[] {
  return items.map((item, index) =>
    typeof item.id === "string" ? item : ({ ...item, id: `${name}:${index}` } as GroupItem)
  );
}

/** Inside a filter the item's own fields are in scope, and the item itself is
 *  bound under the accessor so `item.floor` can be compared to a live variable. */
export function itemScope(scope: Scope, item: GroupItem): Scope {
  return withBindings(scope, { ...(item as Record<string, Value>), [scope.accessors.item]: item });
}

/** Grouped first, quantified inside each group (decision 30). One entry per
 *  bucket that passes the test, carrying the field it was grouped by. */
function buckets(items: GroupItem[], by: string, test: "split" | "agree"): GroupItem[] {
  const order: string[] = [];
  const grouped = new Map<string, GroupItem[]>();
  for (const item of items) {
    const key = (item as Record<string, unknown>)[by];
    if (key === undefined) continue;
    const id = String(key);
    if (!grouped.has(id)) {
      grouped.set(id, []);
      order.push(id);
    }
    (grouped.get(id) as GroupItem[]).push(item);
  }
  const out: GroupItem[] = [];
  for (const key of order) {
    const bucket = grouped.get(key) as GroupItem[];
    if (bucket.length < 2) continue;
    const split = !allAgree(bucket, by);
    if (test === "split" ? split : !split) {
      out.push({ id: key, [by]: key } as GroupItem);
    }
  }
  return out;
}

/**
 * Two entries of one bucket agree when they answer the same way. The answer is
 * the yes-or-no the author wrote: a claim answered both ways is a boolean field
 * carrying both values. Where a group has no boolean field, every field the
 * entries share other than the one they were grouped by is compared instead.
 */
function allAgree(bucket: GroupItem[], by: string): boolean {
  const first = bucket[0];
  const rest = Object.keys(first).filter((field) => field !== by && field !== "id");
  const answers = rest.filter((field) => typeof (first as Record<string, unknown>)[field] === "boolean");
  const fields = answers.length > 0 ? answers : rest;
  return bucket.every((item) =>
    fields.every(
      (field) => (item as Record<string, unknown>)[field] === (first as Record<string, unknown>)[field]
    )
  );
}

/* -------------------------------------------------------------------------- */
/* Derived names                                                               */
/* -------------------------------------------------------------------------- */

export function resolveName(nameDef: NameDef, scope: Scope): Value {
  return resolveNameWithDiagnostics(nameDef, scope).value;
}

export function resolveNameWithDiagnostics(nameDef: NameDef, scope: Scope): Reported<Value> {
  const diagnostics: Diagnostic[] = [];
  return { value: resolveNameInto(nameDef, scope, diagnostics), diagnostics };
}

function resolveNameInto(nameDef: NameDef, scope: Scope, sink: Diagnostic[]): Value {
  switch (nameDef.kind) {
    case "expression":
      return evaluateInto(nameDef.of, scope, sink);
    case "grouped": {
      const over = groupItems(nameDef.over, scope, sink, true);
      if (!over) return undefined;
      return buckets(over, nameDef.by, nameDef.test);
    }
    case "derivation": {
      const derivation = scope.registry.derivations?.[nameDef.name];
      if (!derivation) {
        note(sink, "error", `no derivation registered: ${nameDef.name}`);
        return undefined;
      }
      const produced = derivation(nameDef.params, scope.state);
      if (produced.items) return identify(produced.items, nameDef.name);
      const { items: _items, ...rest } = produced;
      return { id: nameDef.name, ...rest } as GroupItem;
    }
    default:
      return undefined;
  }
}

/* -------------------------------------------------------------------------- */
/* Expressions                                                                 */
/* -------------------------------------------------------------------------- */

export function evaluate(expr: AnyExpression, scope: Scope): Value {
  const diagnostics: Diagnostic[] = [];
  return evaluateInto(expr, scope, diagnostics);
}

export function evaluateWithDiagnostics(expr: AnyExpression, scope: Scope): Reported<Value> {
  const diagnostics: Diagnostic[] = [];
  return { value: evaluateInto(expr, scope, diagnostics), diagnostics };
}

export function evaluateInto(expr: AnyExpression, scope: Scope, sink: Diagnostic[]): Value {
  if (!expr || typeof expr !== "object") {
    note(sink, "error", "not an expression");
    return undefined;
  }
  switch (expr.kind) {
    case "literal":
      return expr.value;
    case "read":
      return readPathInto(expr.path, scope, sink);
    case "compare": {
      const left = evaluateInto(expr.left, scope, sink);
      const right = evaluateInto(expr.right, scope, sink);
      return compare(expr.op, left, right, sink);
    }
    case "not":
      return !truthy(evaluateInto(expr.of, scope, sink));
    case "and":
      return expr.of.every((part) => truthy(evaluateInto(part, scope, sink)));
    case "or":
      return expr.of.some((part) => truthy(evaluateInto(part, scope, sink)));
    case "visits":
      return visits(expr.node, scope, sink);
    case "visited":
      return visits(expr.node, scope, sink) > 0;
    case "count": {
      const items = selected(expr.group, expr.where, scope, sink);
      return items ? items.length : undefined;
    }
    case "some": {
      const items = selected(expr.group, expr.where, scope, sink);
      return items ? items.length > 0 : undefined;
    }
    case "first":
    case "last": {
      const pick = expr as { kind: "first" | "last"; group: string; where?: AnyExpression; field?: string };
      const items = selected(pick.group, pick.where, scope, sink);
      if (!items || items.length === 0) return undefined;
      const item = pick.kind === "first" ? items[0] : items[items.length - 1];
      if (!pick.field) return item;
      const value = (item as Record<string, unknown>)[pick.field];
      return value === undefined ? undefined : (value as Value);
    }
    case "in": {
      const membership = expr as { group: string; value?: AnyExpression; of?: AnyExpression };
      const items = groupItems(membership.group, scope, sink, true);
      if (!items) return undefined;
      const wanted = membership.value ?? membership.of;
      if (!wanted) {
        note(sink, "error", `in(${membership.group}, …) was given nothing to look for`);
        return undefined;
      }
      const target = evaluateInto(wanted, scope, sink);
      return items.some((entry) => refersTo(entry, target));
    }
    case "persisted":
      return scope.persisted;
    default:
      note(sink, "error", `unknown expression: ${(expr as { kind: string }).kind}`);
      return undefined;
  }
}

function selected(
  group: string,
  where: AnyExpression | undefined,
  scope: Scope,
  sink: Diagnostic[]
): GroupItem[] | undefined {
  const items = groupItems(group, scope, sink, true);
  if (!items) return undefined;
  if (!where) return items;
  return items.filter((item) => truthy(evaluateInto(where, itemScope(scope, item), sink)));
}

/** Counts repeats. A set would break three of the nineteen (decision 26). */
function visits(node: string, scope: Scope, sink: Diagnostic[]): number {
  const id = nodeName(node, scope, sink);
  return scope.state.trail.reduce((total, step) => (step === id ? total + 1 : total), 0);
}

/** `visits(here)` reads a name; `visits(platform)` names the node itself. The
 *  schema never spells either: it asks the scope first and takes the literal
 *  only when nothing answers. */
function nodeName(node: string, scope: Scope, sink: Diagnostic[]): string {
  const bound = scope.bindings[node];
  if (typeof bound === "string") return bound;
  if (node === scope.accessors.here) {
    const found = readName(node, scope, sink);
    if (typeof found.value === "string") return found.value;
  }
  const named = scope.names[node];
  if (named && !scope.resolving.includes(node)) {
    const inner: Scope = { ...scope, resolving: [...scope.resolving, node] };
    const value = resolveNameInto(named, inner, sink);
    if (typeof value === "string") return value;
  }
  return node;
}

/**
 * An entry refers to an item when it carries the item's id in any of its
 * fields — a log writes `{ sheet: A }` where the group wrote `{ id: A, … }` —
 * or, for a group whose items an author gave no id, when every field the two
 * share carries the same value, which is what copying a row into a log does.
 */
function refersTo(entry: GroupItem, target: Value): boolean {
  if (!isItem(target)) {
    if (target === undefined) return false;
    return entry.id === target || Object.values(entry).some((field) => field === target);
  }
  const item = target as GroupItem;
  if (entry.id === item.id) return true;
  if (Object.values(entry).some((field) => field === item.id)) return true;
  const shared = Object.keys(entry).filter(
    (field) => field !== "id" && Object.prototype.hasOwnProperty.call(item, field)
  );
  return (
    shared.length > 0 &&
    shared.every(
      (field) => (entry as Record<string, unknown>)[field] === (item as Record<string, unknown>)[field]
    )
  );
}

function compare(op: Comparison, left: Value, right: Value, sink: Diagnostic[]): boolean | undefined {
  if (left === undefined || right === undefined) {
    if (op === "==" || op === "!=") {
      const equal = left === right;
      return op === "==" ? equal : !equal;
    }
    note(sink, "error", "comparison against a value that did not resolve");
    return undefined;
  }
  const a = comparable(left);
  const b = comparable(right);
  if (typeof a === "number" && typeof b === "string" && isNumeric(b)) return compareScalars(op, a, Number(b));
  if (typeof b === "number" && typeof a === "string" && isNumeric(a)) return compareScalars(op, Number(a), b);
  return compareScalars(op, a, b);
}

/** Items compare by the one field the schema knows the name of. */
function comparable(value: Value): Scalar {
  if (isScalar(value)) return value;
  if (Array.isArray(value)) return value.length;
  if (isItem(value)) return typeof value.id === "string" ? value.id : "";
  return "";
}

function isNumeric(value: string): boolean {
  return value.trim() !== "" && !Number.isNaN(Number(value));
}

function compareScalars(op: Comparison, a: Scalar, b: Scalar): boolean {
  switch (op) {
    case "==":
      return a === b;
    case "!=":
      return a !== b;
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    case ">":
      return a > b;
    case ">=":
      return a >= b;
    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/* The two gates — different questions, kept apart                             */
/* -------------------------------------------------------------------------- */

/**
 * An expression that could not be read opens the gate. Failing towards legible
 * means the fragment shows and the exit stays walkable (decision 28).
 */
export function gate(expr: AnyExpression | undefined, scope: Scope): Reported<boolean> {
  if (!expr) return { value: true, diagnostics: [] };
  const diagnostics: Diagnostic[] = [];
  const value = evaluateInto(expr, scope, diagnostics);
  const failed = diagnostics.some((entry) => entry.severity === "error");
  return { value: failed ? true : truthy(value), diagnostics };
}

/** "May I enter here?" — the node's own question. */
export function canEnter(node: Pick<NodeDef, "requires">, scope: Scope): boolean {
  return gate(node.requires, scope).value;
}

/** "May I leave that way?" — the exit's, which is not the same question. */
export function canLeave(exit: Pick<Exit, "when">, scope: Scope): boolean {
  return gate(exit.when, scope).value;
}
