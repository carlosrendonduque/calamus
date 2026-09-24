/**
 * The expression language of attribute values: comparisons, `and`/`or`/`not`,
 * and the four counting operators. No arithmetic — decision 26 is binding, so an
 * arithmetic operator is an error and not a quiet extension.
 *
 * Never throws. What cannot be read becomes a `read` of its own source text, so
 * the fragment is still shown (`formato.md` §10) and a diagnostic says why.
 */

import type { Comparison, Diagnostic, Expression } from "./types";

type Token =
  | { kind: "name"; value: string; at: number; end: number }
  | { kind: "number"; value: number; at: number; end: number }
  | { kind: "string"; value: string; at: number; end: number }
  | { kind: "op"; value: string; at: number; end: number }
  | { kind: "arithmetic"; value: string; at: number; end: number };

const COMPARISONS: Comparison[] = ["==", "!=", "<=", ">=", "<", ">"];

/** The calls the contract can hold. Everything else is diagnosed, never guessed at. */
const GROUP_CALLS = new Set(["count", "some", "first", "last"]);
const NODE_CALLS = new Set(["visits", "visited"]);
/** `in(group, value)` takes two arguments; `persisted(name)` takes none or one. */
const MEMBERSHIP_CALL = "in";
const PERSISTED_CALL = "persisted";
const CALLS = [...GROUP_CALLS, ...NODE_CALLS, MEMBERSHIP_CALL, PERSISTED_CALL];

export function parseExpression(source: string, line: number, diagnostics: Diagnostic[]): Expression {
  const tokens = tokenize(source, line, diagnostics);
  if (tokens.length === 0) {
    diagnostics.push({ severity: "error", message: "An expression was expected and the attribute is empty.", line });
    return { kind: "literal", value: "" };
  }
  const state: State = { tokens, at: 0, source, line, diagnostics };
  const expression = parseOr(state);
  if (state.at < state.tokens.length) {
    const token = state.tokens[state.at];
    const rest = source.slice(token.at).trim();
    diagnostics.push({
      severity: "error",
      message:
        token.kind === "arithmetic"
          ? `\`${token.value}\` is arithmetic, which the expression language does not have (decision 26), in \`${source.trim()}\`.`
          : `Could not read \`${rest}\` at the end of the expression \`${source.trim()}\`.`,
      line,
    });
  }
  return expression;
}

type State = { tokens: Token[]; at: number; source: string; line: number; diagnostics: Diagnostic[] };

function peek(state: State): Token | null {
  return state.at < state.tokens.length ? state.tokens[state.at] : null;
}

function isName(token: Token | null, value: string): boolean {
  return token !== null && token.kind === "name" && token.value === value;
}

function parseOr(state: State): Expression {
  const of = [parseAnd(state)];
  while (isName(peek(state), "or")) {
    state.at += 1;
    of.push(parseAnd(state));
  }
  return of.length === 1 ? of[0] : { kind: "or", of };
}

function parseAnd(state: State): Expression {
  const of = [parseNot(state)];
  while (isName(peek(state), "and")) {
    state.at += 1;
    of.push(parseNot(state));
  }
  return of.length === 1 ? of[0] : { kind: "and", of };
}

function parseNot(state: State): Expression {
  if (isName(peek(state), "not")) {
    state.at += 1;
    return { kind: "not", of: parseNot(state) };
  }
  return parseComparison(state);
}

function parseComparison(state: State): Expression {
  const left = parsePrimary(state);
  const token = peek(state);
  if (token && token.kind === "op" && (COMPARISONS as string[]).includes(token.value)) {
    state.at += 1;
    const right = parsePrimary(state);
    return { kind: "compare", op: token.value as Comparison, left, right };
  }
  return left;
}

function parsePrimary(state: State): Expression {
  const token = peek(state);
  if (!token) {
    state.diagnostics.push({
      severity: "error",
      message: `The expression \`${state.source.trim()}\` ends where a value was expected.`,
      line: state.line,
    });
    return { kind: "literal", value: "" };
  }
  if (token.kind === "arithmetic") {
    state.diagnostics.push({
      severity: "error",
      message: `\`${token.value}\` is arithmetic, which the expression language does not have (decision 26), in \`${state.source.trim()}\`.`,
      line: state.line,
    });
    state.at += 1;
    return parsePrimary(state);
  }
  if (token.kind === "number" || token.kind === "string") {
    state.at += 1;
    return { kind: "literal", value: token.value };
  }
  if (token.kind === "op" && token.value === "(") {
    state.at += 1;
    const inner = parseOr(state);
    const closing = peek(state);
    if (closing && closing.kind === "op" && closing.value === ")") state.at += 1;
    else
      state.diagnostics.push({
        severity: "error",
        message: `A bracket is never closed in \`${state.source.trim()}\`.`,
        line: state.line,
      });
    return inner;
  }
  if (token.kind === "name") {
    if (token.value === "true" || token.value === "false") {
      state.at += 1;
      return { kind: "literal", value: token.value === "true" };
    }
    const following = state.tokens[state.at + 1];
    if (following && following.kind === "op" && following.value === "(") return parseCall(state);
    return parsePath(state);
  }
  state.diagnostics.push({
    severity: "error",
    message: `Could not read \`${token.value}\` in \`${state.source.trim()}\`.`,
    line: state.line,
  });
  state.at += 1;
  return { kind: "literal", value: "" };
}

function parsePath(state: State): Expression {
  const first = state.tokens[state.at];
  state.at += 1;
  const segments = [String(first.value)];
  while (peek(state) !== null && peek(state)!.kind === "op" && peek(state)!.value === ".") {
    state.at += 1;
    const next = peek(state);
    if (!next || next.kind !== "name") {
      state.diagnostics.push({
        severity: "error",
        message: `A path ends in a dot in \`${state.source.trim()}\`.`,
        line: state.line,
      });
      break;
    }
    segments.push(next.value);
    state.at += 1;
  }
  // A `Path` is names joined by dots, however many: `entry.note.mark` is one.
  return { kind: "read", path: segments.join(".") };
}

function parseCall(state: State): Expression {
  const name = state.tokens[state.at];
  const inner = takeCallBody(state);
  const raw = state.source.slice(name.at, inner.end).trim();

  // A field read off a call — `last(chain).note` — has no shape in the contract.
  let trailing = "";
  while (peek(state) !== null && peek(state)!.kind === "op" && peek(state)!.value === ".") {
    state.at += 1;
    const field = peek(state);
    if (field && field.kind === "name") {
      trailing += "." + field.value;
      state.at += 1;
    } else break;
  }
  if (trailing !== "") {
    state.diagnostics.push({
      severity: "warning",
      message: `\`${raw}${trailing}\` reads a field off a call. A \`Path\` is names joined by dots and never an expression, and the format already says this in two names — the call declared under \`names:\`, then the field read off that name. Kept as its own source text.`,
      line: state.line,
    });
    return { kind: "read", path: raw + trailing };
  }

  if (NODE_CALLS.has(String(name.value))) {
    // A node is named outright, or by a path that resolves to one at reading
    // time: `visits(kiosk)` and `visited(exit.to)` are both one string here.
    const named = inner.tokens.every((token, index) =>
      index % 2 === 0 ? token.kind === "name" : token.kind === "op" && token.value === "."
    );
    if (inner.tokens.length === 0 || inner.tokens.length % 2 === 0 || !named) {
      state.diagnostics.push({
        severity: "error",
        message: `\`${name.value}()\` takes one node name, in \`${raw}\`.`,
        line: state.line,
      });
      return { kind: "read", path: raw };
    }
    // The node is named outright or reached by a path; the contract holds both.
    const node = inner.tokens.map((token) => String(token.value)).join("");
    return name.value === "visits" ? { kind: "visits", node } : { kind: "visited", node };
  }

  if (GROUP_CALLS.has(String(name.value))) {
    const group = inner.tokens[0];
    if (!group || group.kind !== "name") {
      state.diagnostics.push({
        severity: "error",
        message: `\`${name.value}()\` takes a group name, in \`${raw}\`.`,
        line: state.line,
      });
      return { kind: "read", path: raw };
    }
    // The four read the same way: a group, and an optional filter over it.
    const kind = String(name.value) as "count" | "some" | "first" | "last";
    if (inner.tokens.length === 1) return { kind, group: group.value };
    const qualifier = inner.tokens[1];
    if (!isName(qualifier, "where")) {
      state.diagnostics.push({
        severity: "warning",
        message: `Ignored \`${state.source.slice(qualifier.at, inner.end - 1).trim()}\` in \`${raw}\`: \`${name.value}()\` takes \`where\` and nothing else.`,
        line: state.line,
      });
      return { kind, group: group.value };
    }
    const nested: State = { ...state, tokens: inner.tokens.slice(2), at: 0 };
    const where = parseOr(nested);
    return { kind, group: group.value, where };
  }

  if (String(name.value) === MEMBERSHIP_CALL) {
    // `in(log, item)` — membership, which is not the same as counting, so it
    // takes two arguments: the group, and the value looked for inside it.
    const parts = splitOnCommas(inner.tokens);
    const group = parts.length === 2 ? parts[0][0] : undefined;
    if (parts.length !== 2 || parts[0].length !== 1 || !group || group.kind !== "name") {
      state.diagnostics.push({
        severity: "error",
        message: `\`in()\` takes a group and a value, in \`${raw}\`.`,
        line: state.line,
      });
      return { kind: "read", path: raw };
    }
    const nested: State = { ...state, tokens: parts[1], at: 0 };
    return { kind: "in", group: group.value, value: parseOr(nested) };
  }

  if (String(name.value) === PERSISTED_CALL) {
    // `persisted(name)` asks after one value; `persisted()` asks after the store
    // itself, which is the question the document about the medium puts.
    if (inner.tokens.length === 0) return { kind: "persisted", name: "" };
    const named = inner.tokens[0];
    if (inner.tokens.length > 1 || named.kind !== "name") {
      state.diagnostics.push({
        severity: "error",
        message: `\`persisted()\` takes one name or none, in \`${raw}\`.`,
        line: state.line,
      });
      return { kind: "read", path: raw };
    }
    return { kind: "persisted", name: named.value };
  }

  state.diagnostics.push({
    severity: "warning",
    message: `\`${name.value}()\` is not one of the operators \`Expression\` holds (\`${CALLS.join("`, `")}\`); \`${raw}\` is kept as its own source text.`,
    line: state.line,
  });
  return { kind: "read", path: raw };
}

/** Split a call body on the commas that sit outside any nested brackets. */
function splitOnCommas(tokens: Token[]): Token[][] {
  const parts: Token[][] = [[]];
  let depth = 0;
  for (const token of tokens) {
    if (token.kind === "op" && token.value === "(") depth += 1;
    if (token.kind === "op" && token.value === ")") depth -= 1;
    if (token.kind === "op" && token.value === "," && depth === 0) {
      parts.push([]);
      continue;
    }
    parts[parts.length - 1].push(token);
  }
  return parts;
}

/** Consume `name ( … )` and hand back the tokens between the brackets. */
function takeCallBody(state: State): { tokens: Token[]; end: number } {
  state.at += 2;
  const tokens: Token[] = [];
  let depth = 1;
  while (state.at < state.tokens.length) {
    const token = state.tokens[state.at];
    if (token.kind === "op" && token.value === "(") depth += 1;
    if (token.kind === "op" && token.value === ")") {
      depth -= 1;
      if (depth === 0) {
        state.at += 1;
        return { tokens, end: token.end };
      }
    }
    tokens.push(token);
    state.at += 1;
  }
  state.diagnostics.push({
    severity: "error",
    message: `A bracket is never closed in \`${state.source.trim()}\`.`,
    line: state.line,
  });
  return { tokens, end: state.source.length };
}

function tokenize(source: string, line: number, diagnostics: Diagnostic[]): Token[] {
  const tokens: Token[] = [];
  let at = 0;
  while (at < source.length) {
    const char = source[at];
    if (/\s/.test(char)) {
      at += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      let value = "";
      let cursor = at + 1;
      while (cursor < source.length && source[cursor] !== char) {
        if (source[cursor] === "\\") {
          value += source[cursor + 1];
          cursor += 2;
          continue;
        }
        value += source[cursor];
        cursor += 1;
      }
      if (cursor >= source.length) {
        diagnostics.push({ severity: "error", message: `A quoted value is never closed in \`${source.trim()}\`.`, line });
      }
      tokens.push({ kind: "string", value, at, end: cursor + 1 });
      at = cursor + 1;
      continue;
    }
    if (/[0-9]/.test(char) || (char === "-" && /[0-9]/.test(source[at + 1] ?? ""))) {
      let cursor = at + 1;
      while (cursor < source.length && /[0-9.]/.test(source[cursor])) cursor += 1;
      tokens.push({ kind: "number", value: Number(source.slice(at, cursor)), at, end: cursor });
      at = cursor;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let cursor = at + 1;
      while (cursor < source.length) {
        if (/[A-Za-z0-9_]/.test(source[cursor])) cursor += 1;
        // A hyphen belongs to the name when a name continues after it: authored
        // names carry hyphens, so ` - ` is the only shape arithmetic can take.
        else if (source[cursor] === "-" && /[A-Za-z0-9_]/.test(source[cursor + 1] ?? "")) cursor += 2;
        else break;
      }
      tokens.push({ kind: "name", value: source.slice(at, cursor), at, end: cursor });
      at = cursor;
      continue;
    }
    const pair = source.slice(at, at + 2);
    if ((COMPARISONS as string[]).includes(pair)) {
      tokens.push({ kind: "op", value: pair, at, end: at + 2 });
      at += 2;
      continue;
    }
    if ("<>".includes(char)) {
      tokens.push({ kind: "op", value: char, at, end: at + 1 });
      at += 1;
      continue;
    }
    if ("(),.".includes(char)) {
      tokens.push({ kind: "op", value: char, at, end: at + 1 });
      at += 1;
      continue;
    }
    if ("+-*/%".includes(char)) {
      tokens.push({ kind: "arithmetic", value: char, at, end: at + 1 });
      at += 1;
      continue;
    }
    diagnostics.push({ severity: "error", message: `\`${char}\` has no meaning in an expression (\`${source.trim()}\`).`, line });
    at += 1;
  }
  return tokens;
}
