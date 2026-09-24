/**
 * The YAML subset the format actually uses, hand-written.
 *
 * Block maps, block sequences, flow maps and sequences, plain and quoted
 * scalars, folded and literal block scalars, and `#` comments. No anchors, no
 * aliases, no tags, no multi-document streams, no complex keys: what the corpus
 * contains is parsed and everything else is diagnosed rather than mis-read.
 *
 * Nothing here throws. A line that cannot be read produces a diagnostic and is
 * skipped, so the rest of the document still arrives (decision 28).
 */

import type { Diagnostic, Scalar } from "./types";

export type YamlNode =
  | { kind: "scalar"; value: string; quoted: boolean; line: number }
  | { kind: "map"; entries: YamlEntry[]; line: number }
  | { kind: "seq"; items: YamlNode[]; line: number };

export type YamlEntry = { key: string; value: YamlNode; line: number };

type Line = { raw: string; text: string; indent: number; line: number };

const KEY = /^[A-Za-z_][A-Za-z0-9_\-.]*$/;

/** Parse a block of YAML. `firstLine` is the 1-based line of `source` in the file. */
export function parseYaml(source: string, firstLine: number, diagnostics: Diagnostic[]): YamlNode {
  const reader = new Reader(scan(source, firstLine), diagnostics);
  const node = reader.parseNode(0);
  reader.skipIgnorable();
  if (reader.i < reader.lines.length) {
    const rest = reader.lines[reader.i];
    diagnostics.push({
      severity: "error",
      message: `Could not read \`${rest.text}\`: expected a key, a list item or the end of the block.`,
      line: rest.line,
    });
  }
  return node;
}

function scan(source: string, firstLine: number): Line[] {
  return source.split("\n").map((raw, index) => {
    const withoutIndent = raw.replace(/^[ \t]+/, "");
    return {
      raw,
      text: withoutIndent.trimEnd(),
      indent: raw.length - withoutIndent.length,
      line: firstLine + index,
    };
  });
}

class Reader {
  i = 0;

  constructor(readonly lines: Line[], readonly diagnostics: Diagnostic[]) {}

  skipIgnorable(): void {
    while (this.i < this.lines.length) {
      const line = this.lines[this.i];
      if (line.text === "" || line.text.startsWith("#")) this.i += 1;
      else return;
    }
  }

  peek(): Line | null {
    this.skipIgnorable();
    return this.i < this.lines.length ? this.lines[this.i] : null;
  }

  parseNode(minIndent: number): YamlNode {
    const line = this.peek();
    if (!line || line.indent < minIndent) {
      return { kind: "scalar", value: "", quoted: false, line: line ? line.line : 1 };
    }
    if (line.text === "-" || line.text.startsWith("- ")) return this.parseSeq(line.indent);
    return this.parseMap(line.indent);
  }

  parseMap(indent: number): YamlNode {
    const entries: YamlEntry[] = [];
    const start = this.peek();
    while (true) {
      const line = this.peek();
      if (!line || line.indent < indent) break;
      if (line.text === "-" || line.text.startsWith("- ")) break;
      if (line.indent > indent) {
        this.diagnostics.push({
          severity: "error",
          message: `Could not read \`${line.text}\`: it is indented further than the key above it.`,
          line: line.line,
        });
        this.i += 1;
        continue;
      }
      const split = splitKey(line.text);
      if (!split || !KEY.test(split.key)) {
        this.diagnostics.push({
          severity: "error",
          message: `Could not read \`${line.text}\`: expected \`name: value\`.`,
          line: line.line,
        });
        this.i += 1;
        continue;
      }
      this.i += 1;
      entries.push({ key: split.key, value: this.parseValue(split.rest, indent, line), line: line.line });
    }
    return { kind: "map", entries, line: start ? start.line : 1 };
  }

  parseSeq(indent: number): YamlNode {
    const items: YamlNode[] = [];
    const start = this.peek();
    while (true) {
      const line = this.peek();
      if (!line || line.indent < indent) break;
      if (!(line.text === "-" || line.text.startsWith("- "))) break;
      if (line.indent > indent) break;
      const rest = line.text === "-" ? "" : line.text.slice(1).trim();
      const after = line.raw.slice(line.indent + 1);
      const innerIndent = line.indent + 1 + (after.length - after.replace(/^ +/, "").length);
      this.i += 1;
      if (rest === "") {
        items.push(this.parseNode(line.indent + 1));
        continue;
      }
      if (rest.startsWith("{") || rest.startsWith("[")) {
        items.push(this.flow(rest, line));
        continue;
      }
      const split = splitKey(rest);
      if (split && KEY.test(split.key)) {
        // A map whose first key sits on the dash line. Re-present that line at
        // the map's own indentation and read it as any other block map.
        this.lines[this.i - 1] = { raw: " ".repeat(innerIndent) + rest, text: rest, indent: innerIndent, line: line.line };
        this.i -= 1;
        items.push(this.parseMap(innerIndent));
        continue;
      }
      items.push(scalarFrom(rest, line.line));
    }
    return { kind: "seq", items, line: start ? start.line : 1 };
  }

  parseValue(rest: string, keyIndent: number, line: Line): YamlNode {
    if (rest === "") {
      const next = this.peek();
      // A sequence may sit at the key's own column; a map may not.
      if (next && next.indent === keyIndent && (next.text === "-" || next.text.startsWith("- "))) {
        return this.parseSeq(keyIndent);
      }
      return this.parseNode(keyIndent + 1);
    }
    if (/^[|>][-+]?[0-9]*$/.test(rest)) return this.blockScalar(rest, keyIndent, line);
    if (rest.startsWith("{") || rest.startsWith("[")) return this.flow(rest, line);
    return scalarFrom(rest, line.line);
  }

  /** `>` folds, `|` keeps the line breaks; `-` strips the trailing break. */
  blockScalar(header: string, keyIndent: number, line: Line): YamlNode {
    const folded = header.startsWith(">");
    const body: string[] = [];
    while (this.i < this.lines.length) {
      const next = this.lines[this.i];
      if (next.text !== "" && next.indent <= keyIndent) break;
      body.push(next.text === "" ? "" : next.raw.trimEnd());
      this.i += 1;
    }
    while (body.length > 0 && body[body.length - 1] === "") body.pop();
    const contentIndent = body.reduce(
      (least, entry) => (entry === "" ? least : Math.min(least, entry.length - entry.replace(/^ +/, "").length)),
      Infinity
    );
    const stripped = body.map((entry) => (entry === "" ? "" : entry.slice(contentIndent === Infinity ? 0 : contentIndent)));
    let value: string;
    if (folded) {
      value = "";
      for (const entry of stripped) {
        if (entry === "") value += "\n";
        else value += (value === "" || value.endsWith("\n") ? "" : " ") + entry;
      }
    } else {
      value = stripped.join("\n");
    }
    return { kind: "scalar", value: value.replace(/\n+$/, ""), quoted: true, line: line.line };
  }

  /** Flow collections may wrap; read on until the brackets balance. */
  flow(start: string, line: Line): YamlNode {
    let text = start;
    while (!balanced(text) && this.i < this.lines.length) {
      text += " " + this.lines[this.i].text;
      this.i += 1;
    }
    if (!balanced(text)) {
      this.diagnostics.push({
        severity: "error",
        message: `Could not read \`${start}\`: the brackets never close.`,
        line: line.line,
      });
      return scalarFrom(start, line.line);
    }
    const cursor = { at: 0 };
    const node = readFlow(text, cursor, line.line, this.diagnostics);
    const trailing = stripComment(text.slice(cursor.at)).trim();
    if (trailing !== "") {
      this.diagnostics.push({
        severity: "warning",
        message: `Ignored \`${trailing}\` after the end of a flow collection.`,
        line: line.line,
      });
    }
    return node;
  }
}

/** A quote only opens a scalar: an apostrophe inside a word is a word. */
export function opensQuote(text: string, at: number): boolean {
  if (text[at] !== '"' && text[at] !== "'") return false;
  return at === 0 || /[\s,{}[\]:=]/.test(text[at - 1]);
}

function balanced(text: string): boolean {
  let depth = 0;
  let quote = "";
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];
    if (quote !== "") {
      if (char === "\\") at += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (opensQuote(text, at)) quote = char;
    else if (char === "{" || char === "[") depth += 1;
    else if (char === "}" || char === "]") depth -= 1;
  }
  return depth === 0;
}

function readFlow(text: string, cursor: { at: number }, line: number, diagnostics: Diagnostic[]): YamlNode {
  skipSpace(text, cursor);
  const char = text[cursor.at];
  if (char === "{") {
    cursor.at += 1;
    const entries: YamlEntry[] = [];
    while (true) {
      skipSpace(text, cursor);
      if (cursor.at >= text.length) break;
      if (text[cursor.at] === "}") {
        cursor.at += 1;
        break;
      }
      if (text[cursor.at] === ",") {
        cursor.at += 1;
        continue;
      }
      const key = readFlowScalar(text, cursor, true);
      skipSpace(text, cursor);
      if (text[cursor.at] !== ":") {
        // An unquoted clause carrying a comma: YAML reads the tail as a second
        // key, which silently truncates the clause. Put it back, and say so.
        const previous = entries[entries.length - 1];
        if (previous && previous.value.kind === "scalar" && !previous.value.quoted) {
          previous.value = { ...previous.value, value: `${previous.value.value}, ${key.value}` };
          diagnostics.push({
            severity: "warning",
            message: `\`${previous.value.value}\` is an unquoted value carrying a comma, which reads as a second key; it was joined back on, and quoting it would say so outright.`,
            line,
          });
          continue;
        }
        diagnostics.push({ severity: "error", message: `Expected \`:\` after \`${key.value}\` in a flow map.`, line });
        break;
      }
      cursor.at += 1;
      const value = readFlow(text, cursor, line, diagnostics);
      entries.push({ key: key.value.trim(), value, line });
    }
    return { kind: "map", entries, line };
  }
  if (char === "[") {
    cursor.at += 1;
    const items: YamlNode[] = [];
    while (true) {
      skipSpace(text, cursor);
      if (cursor.at >= text.length) break;
      if (text[cursor.at] === "]") {
        cursor.at += 1;
        break;
      }
      if (text[cursor.at] === ",") {
        cursor.at += 1;
        continue;
      }
      items.push(readFlow(text, cursor, line, diagnostics));
    }
    return { kind: "seq", items, line };
  }
  const scalar = readFlowScalar(text, cursor, false);
  return { kind: "scalar", value: scalar.value, quoted: scalar.quoted, line };
}

function skipSpace(text: string, cursor: { at: number }): void {
  while (cursor.at < text.length && /\s/.test(text[cursor.at])) cursor.at += 1;
}

function readFlowScalar(text: string, cursor: { at: number }, isKey: boolean): { value: string; quoted: boolean } {
  skipSpace(text, cursor);
  const char = text[cursor.at];
  if (char === '"' || char === "'") {
    cursor.at += 1;
    let value = "";
    while (cursor.at < text.length && text[cursor.at] !== char) {
      if (text[cursor.at] === "\\" && char === '"') {
        value += unescape(text[cursor.at + 1]);
        cursor.at += 2;
        continue;
      }
      value += text[cursor.at];
      cursor.at += 1;
    }
    cursor.at += 1;
    return { value, quoted: true };
  }
  let value = "";
  while (cursor.at < text.length) {
    const next = text[cursor.at];
    // An interpolation belongs to the clause around it. Plain YAML would end the
    // scalar at the brace and silently shorten the sentence.
    if (next === "{" && value !== "") {
      const closing = text.indexOf("}", cursor.at);
      if (closing !== -1) {
        value += text.slice(cursor.at, closing + 1);
        cursor.at = closing + 1;
        continue;
      }
    }
    if (next === "," || next === "}" || next === "]") break;
    if (isKey && next === ":") break;
    value += next;
    cursor.at += 1;
  }
  return { value: value.trim(), quoted: false };
}

function unescape(char: string): string {
  if (char === "n") return "\n";
  if (char === "t") return "\t";
  return char;
}

/** Split `key: value`, where the separator is a colon followed by a space or the end of the line. */
function splitKey(text: string): { key: string; rest: string } | null {
  let quote = "";
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];
    if (quote !== "") {
      if (char === quote) quote = "";
      continue;
    }
    if (opensQuote(text, at)) quote = char;
    else if (char === ":" && (at + 1 === text.length || text[at + 1] === " ")) {
      return { key: text.slice(0, at).trim(), rest: text.slice(at + 1).trim() };
    }
  }
  return null;
}

/** A comment starts at a `#` preceded by whitespace, outside quotes. */
function stripComment(text: string): string {
  let quote = "";
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];
    if (quote !== "") {
      if (char === "\\" && quote === '"') at += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (opensQuote(text, at)) quote = char;
    else if (char === "#" && (at === 0 || /\s/.test(text[at - 1]))) return text.slice(0, at);
  }
  return text;
}

function scalarFrom(text: string, line: number): YamlNode {
  const trimmed = stripComment(text).trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const cursor = { at: 0 };
    const read = readFlowScalar(trimmed, cursor, false);
    return { kind: "scalar", value: read.value, quoted: true, line };
  }
  return { kind: "scalar", value: trimmed, quoted: false, line };
}

/* -------------------------------------------------------------------------- */
/* Reading a tree                                                              */
/* -------------------------------------------------------------------------- */

export function entry(node: YamlNode | null, key: string): YamlNode | null {
  if (!node || node.kind !== "map") return null;
  const found = node.entries.find((candidate) => candidate.key === key);
  return found ? found.value : null;
}

export function keysOf(node: YamlNode | null): string[] {
  if (!node || node.kind !== "map") return [];
  return node.entries.map((candidate) => candidate.key);
}

export function text(node: YamlNode | null): string | null {
  if (!node || node.kind !== "scalar") return null;
  return node.value;
}

export function items(node: YamlNode | null): YamlNode[] {
  if (!node) return [];
  if (node.kind === "seq") return node.items;
  return [node];
}

/** An unquoted `12`, `true` or `false` is a number or a boolean; anything else is a string. */
export function scalar(node: YamlNode | null): Scalar | null {
  if (!node || node.kind !== "scalar") return null;
  if (node.quoted) return node.value;
  if (node.value === "true") return true;
  if (node.value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(node.value)) return Number(node.value);
  return node.value;
}
