/**
 * The phrase with ordered cases, and the interpolation that fills it.
 *
 * A case is a whole clause and the first match wins. That is the whole of it,
 * and it is what carries `Queda una línea` against `Quedan 3 líneas`, where the
 * number lives in the verb and the verb comes before the noun — a suffix cannot
 * reach either.
 */

import type { Diagnostic, GroupItem, PluralFn, Scalar } from "./types";
import type { AnyExpression, PhraseCaseLike, PhraseLike } from "./shapes";
import { listOf } from "./shapes";
import type { Reported, Scope, Value } from "./scope";
import { asText, escapeText, isScalar, note, truthy } from "./scope";
import { evaluateInto, isPath, itemScope, readPathInto, resolveGroup } from "./evaluate";

/** The default selector: `is:` matches the number exactly. It is what es, en,
 *  fr, de, it and pt need, and it is used when no `plural:` is declared. */
export const exactPlural: PluralFn = () => null;

/* -------------------------------------------------------------------------- */
/* Phrases                                                                     */
/* -------------------------------------------------------------------------- */

export function resolvePhrase(phrase: PhraseLike, scope: Scope): string {
  const diagnostics: Diagnostic[] = [];
  return resolvePhraseInto(phrase, scope, diagnostics);
}

export function resolvePhraseWithDiagnostics(phrase: PhraseLike, scope: Scope): Reported<string> {
  const diagnostics: Diagnostic[] = [];
  return { value: resolvePhraseInto(phrase, scope, diagnostics), diagnostics };
}

function resolvePhraseInto(phrase: PhraseLike, scope: Scope, sink: Diagnostic[]): string {
  const inner = phraseScope(phrase, scope, sink);
  // With no `on:`, a phrase that declares a subject dispatches on the subject
  // itself: `column-lab` chooses the label of an option by the option's value.
  const on =
    phrase.on === undefined
      ? phrase.of === undefined
        ? undefined
        : (inner.bindings[phrase.of] ?? scope.subject)
      : readPathInto(phrase.on, inner, sink);
  const chosen = chooseCase(phrase, on, inner, sink);
  if (!chosen) {
    if (phrase.say !== undefined) return interpolateInto(phrase.say, inner, sink);
    note(sink, "warning", "a phrase with no case to print");
    return "";
  }
  return interpolateInto(chosen.say, inner, sink);
}

/** What a phrase can see: the subject it is printed on under the name the
 *  author gave it, and its own joined list under its own name. */
function phraseScope(phrase: PhraseLike, scope: Scope, sink: Diagnostic[]): Scope {
  const bindings: Record<string, Value> = { ...scope.bindings };
  if (phrase.of && scope.subject !== undefined) bindings[phrase.of] = scope.subject;
  if (phrase.list) {
    const joined = joinList(phrase, scope, sink);
    const name = scope.phraseName;
    if (name) bindings[name] = { id: name, list: joined } as GroupItem;
  }
  return { ...scope, bindings };
}

/** `sep:` is written by the author and never chosen by the library: the corpus
 *  prints "A, and B" on purpose, and a conjunction of ours would correct it. */
function joinList(phrase: PhraseLike, scope: Scope, sink: Diagnostic[]): string {
  const list = listOf(phrase);
  if (!list) return "";
  const found = resolveGroup(list.of, scope);
  sink.push(...found.diagnostics);
  const items = found.value ?? [];
  const parts = items.map((item) => itemText(item, list.field, scope, sink));
  if (parts.length === 0) return "";
  if (list.last && parts.length > 1) {
    return parts.slice(0, -1).join(list.sep ?? ", ") + list.last + parts[parts.length - 1];
  }
  return parts.join(list.sep ?? ", ");
}

function itemText(item: GroupItem, field: string | undefined, scope: Scope, sink: Diagnostic[]): string {
  if (!field) return asText(item);
  const inner = itemScope(scope, item);
  const value = isPath(field) ? readPathInto(field, inner, sink) : undefined;
  return asText(value);
}

function chooseCase(
  phrase: PhraseLike,
  on: Value,
  scope: Scope,
  sink: Diagnostic[]
): PhraseCaseLike | undefined {
  const cases = phrase.cases ?? [];
  if (cases.length === 0) return undefined;

  if (phrase.plural !== undefined && typeof on === "number") {
    const selector = scope.registry.plurals?.[phrase.plural];
    if (!selector) {
      note(sink, "warning", `no plural selector registered: ${phrase.plural}`);
    } else {
      const index = selector(on);
      if (index !== null && Number.isInteger(index) && index >= 0 && index < cases.length) {
        return cases[index];
      }
      note(sink, "warning", `the plural selector ${phrase.plural} chose no case`);
    }
  }

  for (const candidate of cases) {
    if (matches(candidate, on, scope, sink)) return candidate;
  }
  // Nothing matched: print the last clause rather than nothing (decision 28).
  note(sink, "warning", "no case matched; printing the last clause");
  return cases[cases.length - 1];
}

function matches(candidate: PhraseCaseLike, on: Value, scope: Scope, sink: Diagnostic[]): boolean {
  if (candidate.is !== undefined && !sameScalar(on, candidate.is)) return false;
  if (candidate.when !== undefined && !condition(candidate.when, scope, sink)) return false;
  return true;
}

/** `is: n` is sugar for `when: on == n`, and `redaction` writes `is: true`. */
function sameScalar(on: Value, is: Scalar): boolean {
  if (on === is) return true;
  if (typeof on === "number" && typeof is === "string") return String(on) === is;
  if (typeof on === "string" && typeof is === "number") return on === String(is);
  return false;
}

/** A condition that cannot be read shows its clause rather than skipping it. */
function condition(expr: AnyExpression, scope: Scope, sink: Diagnostic[]): boolean {
  const local: Diagnostic[] = [];
  const value = evaluateInto(expr, scope, local);
  sink.push(...local);
  if (local.some((entry) => entry.severity === "error")) return true;
  return truthy(value);
}

/* -------------------------------------------------------------------------- */
/* Interpolation — always escaped, never recursive (decision 28)               */
/* -------------------------------------------------------------------------- */

const BRACES = /\{([^{}]*)\}/g;

export function interpolate(text: string, scope: Scope): string {
  const diagnostics: Diagnostic[] = [];
  return interpolateInto(text, scope, diagnostics);
}

export function interpolateWithDiagnostics(text: string, scope: Scope): Reported<string> {
  const diagnostics: Diagnostic[] = [];
  return { value: interpolateInto(text, scope, diagnostics), diagnostics };
}

/**
 * `{name}` and `{item.field}`, and nothing else: no call, no operator, no
 * literal. What a path does not resolve is left standing with its braces, so
 * the page reads wrong rather than reading empty.
 *
 * The result is never scanned again. A reader who writes `{note}` in their own
 * note gets `{note}` back.
 */
function interpolateInto(text: string, scope: Scope, sink: Diagnostic[]): string {
  if (typeof text !== "string" || text.indexOf("{") === -1) return text ?? "";
  return text.replace(BRACES, (whole, inside: string) => {
    const path = inside.trim();
    if (!isPath(path)) {
      note(sink, "warning", `not a name or a path, left standing: ${whole}`);
      return whole;
    }
    const segments = path.split(".");
    const phrase = segments.length === 1 ? scope.phrases[segments[0]] : undefined;
    if (phrase) {
      if (scope.resolving.includes(path)) {
        note(sink, "error", `a phrase prints itself: ${path}`);
        return whole;
      }
      const inner: Scope = {
        ...scope,
        phraseName: path,
        resolving: [...scope.resolving, path],
      };
      // Already text, and already escaped where it interpolated: not escaped
      // again, and not scanned again.
      return resolvePhraseInto(phrase, inner, sink);
    }
    const local: Diagnostic[] = [];
    const value = readPathInto(path, scope, local);
    sink.push(...local);
    if (value === undefined) return whole;
    if (!isScalar(value)) {
      note(sink, "warning", `a name that is not a value, printed as text: ${path}`);
    }
    return escapeText(asText(value));
  });
}
