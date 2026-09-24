/**
 * Inline content: prose, `{name}` interpolations and the inline directives.
 *
 * A directive takes its children in square brackets and its attributes in
 * braces, and has no closing tag — the form decision 27 measured. Both parts are
 * optional, and children may run over a line break.
 */

import type { Diagnostic, Inline } from "./types";
import { parseExpression } from "./expression";

/** A name, or names joined by dots. Never a call, an operator or a literal. */
const PATH = /^[A-Za-z_][A-Za-z0-9_-]*(\.[A-Za-z_][A-Za-z0-9_-]*)*$/;

const VERB = /^[a-z][a-z0-9-]*/;

export type Attribute = { value: string; quoted: boolean; bare: boolean };
export type Attributes = Record<string, Attribute>;

export type Directive = {
  name: string;
  /** Raw source of the square-bracket children; empty when there were none. */
  children: string;
  hasChildren: boolean;
  attributes: Attributes;
  /** Raw source between the braces, for the one attribute that carries spaces. */
  attributesText: string;
  raw: string;
  end: number;
};

/** The verbs the parser knows. A verb outside this set is an error, not a guess. */
const WRITE_VERBS = new Set(["set", "log"]);
const KNOWN_VERBS = new Set(["with", "mark", "go", "do", "slot", "each", "blank", ...WRITE_VERBS]);

export function isKnownVerb(name: string): boolean {
  return KNOWN_VERBS.has(name);
}

/** The verbs that name a gesture: `:go`, `:do`, and the two older write verbs. */
export function isAffordanceVerb(name: string): boolean {
  return name === "go" || name === "do" || WRITE_VERBS.has(name);
}

/** Read a directive that starts at `at`, or null if nothing starts there. */
export function readDirective(source: string, at: number): Directive | null {
  if (source[at] !== ":") return null;
  const match = VERB.exec(source.slice(at + 1));
  if (!match) return null;
  const name = match[0];
  let cursor = at + 1 + name.length;
  let children = "";
  let hasChildren = false;
  if (source[cursor] === "[") {
    const closing = matchBracket(source, cursor, "[", "]");
    if (closing === -1) return null;
    children = source.slice(cursor + 1, closing);
    hasChildren = true;
    cursor = closing + 1;
  }
  let attributes: Attributes = {};
  let attributesText = "";
  if (source[cursor] === "{") {
    const closing = matchBracket(source, cursor, "{", "}");
    if (closing === -1) return null;
    attributesText = source.slice(cursor + 1, closing);
    attributes = readAttributes(attributesText);
    cursor = closing + 1;
  }
  if (!hasChildren && Object.keys(attributes).length === 0) return null;
  return { name, children, hasChildren, attributes, attributesText, raw: source.slice(at, cursor), end: cursor };
}

function matchBracket(source: string, at: number, open: string, close: string): number {
  let depth = 0;
  let quote = "";
  for (let cursor = at; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (quote !== "") {
      if (char === "\\") cursor += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }
  return -1;
}

export function readAttributes(source: string): Attributes {
  const attributes: Attributes = {};
  let cursor = 0;
  while (cursor < source.length) {
    if (/\s/.test(source[cursor])) {
      cursor += 1;
      continue;
    }
    const start = cursor;
    while (cursor < source.length && !/[\s=]/.test(source[cursor])) cursor += 1;
    const name = source.slice(start, cursor);
    if (name === "") {
      cursor += 1;
      continue;
    }
    if (source[cursor] !== "=") {
      attributes[name] = { value: "true", quoted: false, bare: true };
      continue;
    }
    cursor += 1;
    const quote = source[cursor];
    if (quote === '"' || quote === "'") {
      cursor += 1;
      let value = "";
      while (cursor < source.length && source[cursor] !== quote) {
        if (source[cursor] === "\\") {
          value += source[cursor + 1];
          cursor += 2;
          continue;
        }
        value += source[cursor];
        cursor += 1;
      }
      cursor += 1;
      attributes[name] = { value, quoted: true, bare: false };
      continue;
    }
    const valueStart = cursor;
    while (cursor < source.length && !/\s/.test(source[cursor])) cursor += 1;
    attributes[name] = { value: source.slice(valueStart, cursor), quoted: false, bare: false };
  }
  return attributes;
}

export function attributeValue(attributes: Attributes, name: string): string | null {
  const found = attributes[name];
  return found ? found.value : null;
}

export function expressionAttribute(
  attributes: Attributes,
  name: string,
  line: number,
  diagnostics: Diagnostic[]
) {
  const found = attributes[name];
  if (!found) return undefined;
  return parseExpression(found.value, line, diagnostics);
}

/* -------------------------------------------------------------------------- */
/* Inline content                                                              */
/* -------------------------------------------------------------------------- */

export function parseInline(source: string, line: number, diagnostics: Diagnostic[]): Inline[] {
  const content: Inline[] = [];
  let text = "";
  let cursor = 0;

  const flush = () => {
    if (text === "") return;
    content.push({ kind: "text", text: text.replace(/\s*\n\s*/g, " ") });
    text = "";
  };

  while (cursor < source.length) {
    const char = source[cursor];
    if (char === "{") {
      const closing = source.indexOf("}", cursor);
      if (closing === -1) {
        diagnostics.push({ severity: "error", message: "An interpolation is never closed.", line });
        text += source.slice(cursor);
        break;
      }
      const inner = source.slice(cursor + 1, closing);
      flush();
      content.push(interpolation(inner, line, diagnostics));
      cursor = closing + 1;
      continue;
    }
    if (char === ":") {
      const directive = readDirective(source, cursor);
      if (directive) {
        flush();
        content.push(...inlineDirective(directive, line, diagnostics));
        cursor = directive.end;
        continue;
      }
    }
    text += char;
    cursor += 1;
  }
  flush();
  return content;
}

function interpolation(inner: string, line: number, diagnostics: Diagnostic[]): Inline {
  const path = inner.trim();
  if (!PATH.test(path)) {
    diagnostics.push({
      severity: "error",
      message: `\`{${inner}}\` is not a name or a path: braces hold a name or a path of names, never an expression.`,
      line,
    });
    return { kind: "text", text: `{${inner}}` };
  }
  // A `Path` is names joined by dots, however many: `{entry.note.mark}` is one.
  return { kind: "interpolation", path };
}

function inlineDirective(directive: Directive, line: number, diagnostics: Diagnostic[]): Inline[] {
  const children = directive.hasChildren ? parseInline(directive.children, line, diagnostics) : [];
  const { name, attributes } = directive;

  if (name === "mark") {
    const kind = attributeValue(attributes, "kind") ?? attributeValue(attributes, "as");
    if (attributes.as && !attributes.kind) {
      diagnostics.push({
        severity: "warning",
        message: "`:mark{as=…}` is the older spelling; the format writes `:mark[…]{kind=…}` (formato.md §6).",
        line,
      });
    }
    if (kind === null) {
      diagnostics.push({ severity: "error", message: "`:mark` needs a `kind`.", line });
      return children;
    }
    noteDroppedAttributes(directive, ["kind", "as", "when"], "a mark", line, diagnostics);
    const mark: Inline = { kind: "mark", markKind: kind, children };
    // A mark carries its own condition: `when` on the paragraph decides whether
    // the paragraph is there at all, and a marked span is always there.
    const when = expressionAttribute(attributes, "when", line, diagnostics);
    if (when) mark.when = when;
    return [mark];
  }

  if (name === "slot") {
    const slotName = attributeValue(attributes, "name");
    if (slotName === null) {
      diagnostics.push({ severity: "error", message: "`:slot` needs a `name`.", line });
      return children;
    }
    return [{ kind: "slot", name: slotName, params: paramsOf(attributes, ["name"]), children }];
  }

  if (name === "go" || name === "do" || WRITE_VERBS.has(name)) {
    return [affordance(directive, children, line, diagnostics)];
  }

  if (name === "with") {
    diagnostics.push({
      severity: "warning",
      message: "`:with` carries the attributes of the paragraph it opens; inside a line it has no meaning and is dropped.",
      line,
    });
    return children;
  }

  diagnostics.push({
    severity: "error",
    message: `\`:${name}\` is not a directive of the format; its prose is kept and the directive is dropped.`,
    line,
  });
  return children;
}

/** Which of the three gestures a directive names, and what it names. */
export function readGesture(
  directive: Directive,
  line: number,
  diagnostics: Diagnostic[]
): { action: "go" | "show" | "do"; target: string; used: string[] } {
  const { name, attributes } = directive;
  const navigates = attributeValue(attributes, "to");
  const reveals = attributeValue(attributes, "show");
  const moves = attributeValue(attributes, "move");
  let action: "go" | "show" | "do" = "do";
  let target = "";
  let used: string[] = [];

  if (name === "go" && navigates !== null) {
    action = "go";
    target = navigates;
    used = ["to"];
  } else if (reveals !== null) {
    action = "show";
    target = reveals;
    used = ["show"];
  } else if (moves !== null) {
    action = "do";
    target = moves;
    used = ["move"];
  } else {
    // `:set` names the variable it writes, `:log` the log it grows.
    const writes = attributeValue(attributes, "var") ?? attributeValue(attributes, "add");
    action = "do";
    target = writes ?? "";
    used = ["var", "add"];
    if (writes === null) {
      diagnostics.push({
        severity: "error",
        message: `\`:${name}\` names nothing to go to, show or move.`,
        line,
      });
    }
  }

  if (WRITE_VERBS.has(name)) {
    diagnostics.push({
      severity: "warning",
      message: `\`:${name}\` is the older write verb; the format has one, \`:do{move=…}\` (formato.md §8). Read as a \`do\` on \`${target}\`.`,
      line,
    });
  }

  return { action, target, used };
}

function affordance(directive: Directive, children: Inline[], line: number, diagnostics: Diagnostic[]): Inline {
  const { attributes } = directive;
  const { action, target, used } = readGesture(directive, line, diagnostics);
  const focus = attributes.focus;
  noteDroppedAttributes(directive, [...used, "focus", "when", "item", "id"], `a \`${action}\` affordance`, line, diagnostics);
  const result: Inline = { kind: "affordance", action, target, children };
  if (focus) result.focus = focus.value !== "false";
  // `item=` is an argument to the move, so one move serves many spans instead of
  // one move per span; `id=` is the span being left, so a return knows where to
  // put the focus back. Both are schema keys of `Inline.affordance`, and the
  // names they carry are the author's.
  const argument = attributeValue(attributes, "item");
  if (argument !== null && argument !== "") result.item = argument;
  const leaving = attributeValue(attributes, "id");
  if (leaving !== null && leaving !== "") result.id = leaving;
  const when = expressionAttribute(attributes, "when", line, diagnostics);
  if (when) result.when = when;
  return result;
}

function paramsOf(attributes: Attributes, except: string[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [name, attribute] of Object.entries(attributes)) {
    if (except.includes(name)) continue;
    params[name] = attribute.bare ? true : attribute.value;
  }
  return params;
}

function noteDroppedAttributes(
  directive: Directive,
  kept: string[],
  what: string,
  line: number,
  diagnostics: Diagnostic[]
): void {
  const dropped = Object.keys(directive.attributes).filter((name) => !kept.includes(name));
  if (dropped.length === 0) return;
  diagnostics.push({
    severity: "warning",
    message: `\`${dropped.join("`, `")}\` on \`:${directive.name}\` ${dropped.length === 1 ? "has" : "have"} no place on ${what} in the contract, and ${dropped.length === 1 ? "is" : "are"} dropped.`,
    line,
  });
}
