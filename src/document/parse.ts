/**
 * The parser for the narrative document format.
 *
 * `parse(source)` takes the text of a `.md` document and returns the document
 * as data, plus every diagnostic the reading produced. It never throws and it
 * never loses prose (decision 28): what cannot be read becomes a diagnostic and
 * the best document still buildable, with the offending source kept verbatim as
 * an `unknown` block where a block was expected.
 *
 * The contract is `types.ts`; the authored syntax is `docs/formato.md`.
 * The parser recognises operators and structure and never a name of the work's
 * own vocabulary (decision 30).
 */

import type {
  Block,
  BlockAttrs,
  Diagnostic,
  Exit,
  Expression,
  GroupDef,
  GroupDiscipline,
  GroupItem,
  Inline,
  NameDef,
  NarrativeDocument,
  NodeDef,
  Opens,
  ParseResult,
  PhraseCase,
  PhraseDef,
  RegistryKind,
  Scalar,
  VariableDef,
} from "./types";
import { parseExpression } from "./expression";
import { attributeValue, parseInline, readDirective, type Attributes } from "./inline";
import { entry, items, keysOf, parseYaml, scalar, text, type YamlNode } from "./yaml";

type Context = {
  diagnostics: Diagnostic[];
  /** Registry names the document reaches for, gathered as they are met. */
  uses: Map<string, RegistryKind>;
};

const VARIABLE_TYPES = ["number", "boolean", "enum", "string", "list"];
const CONTROLS = ["range", "toggle", "choice", "text"];
const KEEPS = ["duplicates", "unique"];
const REMOVES = ["none", "last", "any"];
const TESTS = ["split", "agree"];

export function parse(source: string): ParseResult {
  const context: Context = { diagnostics: [], uses: new Map() };
  const normalised = source.replace(/\r\n?/g, "\n").replace(/^﻿/, "");

  const document: NarrativeDocument = {
    title: "",
    variables: {},
    groups: {},
    marks: {},
    moves: {},
    controls: {},
    names: {},
    phrases: {},
    uses: [],
    nodes: [],
    body: [],
  };

  const split = splitFrontMatter(normalised, context);
  if (split.frontMatter !== null) {
    readFrontMatter(parseYaml(split.frontMatter, 2, context.diagnostics), document, context);
  } else {
    context.diagnostics.push({
      severity: "warning",
      message: "The document has no front matter, so it has no title.",
      line: 1,
    });
  }

  readBody(split.body, split.bodyLine, document, context);

  document.uses = [...context.uses.entries()]
    .map(([name, kind]) => ({ name, kind }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return { document, diagnostics: context.diagnostics };
}

/* -------------------------------------------------------------------------- */
/* Front matter                                                                */
/* -------------------------------------------------------------------------- */

function splitFrontMatter(
  source: string,
  context: Context
): { frontMatter: string | null; body: string; bodyLine: number } {
  const lines = source.split("\n");
  if (lines[0] !== "---") return { frontMatter: null, body: source, bodyLine: 1 };
  for (let at = 1; at < lines.length; at += 1) {
    if (lines[at] === "---" || lines[at] === "...") {
      return {
        frontMatter: lines.slice(1, at).join("\n"),
        body: lines.slice(at + 1).join("\n"),
        bodyLine: at + 2,
      };
    }
  }
  context.diagnostics.push({
    severity: "error",
    message: "The front matter opens with `---` and never closes; the whole document was read as prose.",
    line: 1,
  });
  return { frontMatter: null, body: source, bodyLine: 1 };
}

function readFrontMatter(node: YamlNode, document: NarrativeDocument, context: Context): void {
  if (node.kind !== "map") {
    context.diagnostics.push({
      severity: "error",
      message: "The front matter is not a map of keys, so none of it could be read.",
      line: node.line,
    });
    return;
  }

  for (const item of node.entries) {
    switch (item.key) {
      case "title":
        document.title = text(item.value) ?? "";
        break;
      case "subtitle":
        document.subtitle = text(item.value) ?? "";
        break;
      case "lang":
        document.lang = text(item.value) ?? "";
        break;
      case "variables":
        for (const declaration of mapEntriesOf(item.value, "variables", context)) {
          document.variables[declaration.key] = readVariable(declaration.key, declaration.value, context);
        }
        break;
      case "groups":
        for (const declaration of mapEntriesOf(item.value, "groups", context)) {
          // A grouping is a derived name, not a group: it groups before it
          // quantifies and its value is a test, not a list (formato.md §4).
          if (entry(declaration.value, "by") !== null && entry(declaration.value, "test") !== null) {
            context.diagnostics.push({
              severity: "warning",
              message: `\`${declaration.key}\` groups and tests, which belongs under \`names:\` and not \`groups:\` (formato.md §4); it was read as a name.`,
              line: declaration.line,
            });
            const grouping = readName(declaration.value, context);
            if (grouping) document.names[declaration.key] = grouping;
            continue;
          }
          document.groups[declaration.key] = readGroup(declaration.key, declaration.value, context);
        }
        break;
      case "logs":
        context.diagnostics.push({
          severity: "warning",
          message: "`logs:` is the older key: a log is a group that grows, so the format has one key, `groups:` (formato.md §4). Read as groups.",
          line: item.line,
        });
        for (const declaration of mapEntriesOf(item.value, "logs", context)) {
          document.groups[declaration.key] = readGroup(declaration.key, declaration.value, context);
        }
        break;
      case "names":
        for (const declaration of mapEntriesOf(item.value, "names", context)) {
          const name = readName(declaration.value, context);
          if (name) {
            document.names[declaration.key] = name;
            if (name.kind === "derivation") context.uses.set(name.name, "derivations");
          }
        }
        break;
      case "phrases":
        for (const declaration of mapEntriesOf(item.value, "phrases", context)) {
          document.phrases[declaration.key] = readPhrase(declaration.value, context);
        }
        break;
      case "opens": {
        const opens = readOpens(item.value, context);
        if (opens.trail !== undefined || opens.readings !== undefined) document.opens = opens;
        break;
      }
      case "uses":
        readUses(item.value, context);
        break;
      case "marks":
        // The mark kind is the author's and the renderer behind it is the
        // registry's; the contract holds the second and not the first.
        for (const declaration of mapEntriesOf(item.value, "marks", context)) {
          const renderer = text(entry(declaration.value, "as"));
          if (renderer) context.uses.set(renderer, "marks");
        }
        context.diagnostics.push({
          severity: "warning",
          message: `\`marks:\` declares mark kinds, and \`NarrativeDocument\` has nowhere to keep them; only the registry names they reach for were kept (\`${keysOf(item.value).join("`, `")}\`).`,
          line: item.line,
        });
        break;
      case "slots":
        for (const declaration of mapEntriesOf(item.value, "slots", context)) {
          context.uses.set(declaration.key, "views");
        }
        context.diagnostics.push({
          severity: "warning",
          message: "`slots:` declares slot parameters, and `NarrativeDocument` has nowhere to keep them; only the names were kept.",
          line: item.line,
        });
        break;
      case "calamus":
        context.diagnostics.push({
          severity: "warning",
          message: "The format carries no version number: the ```calamus fence already says what it is (formato.md §1).",
          line: item.line,
        });
        break;
      default:
        context.diagnostics.push({
          severity: "warning",
          message: `\`${item.key}:\` is not a key of the format and was dropped.`,
          line: item.line,
        });
    }
  }

  if (document.title === "") {
    context.diagnostics.push({ severity: "warning", message: "The document has no `title:`.", line: node.line });
  }
}

function mapEntriesOf(node: YamlNode, what: string, context: Context) {
  if (node.kind !== "map") {
    context.diagnostics.push({
      severity: "error",
      message: `\`${what}:\` should be a map of declarations.`,
      line: node.line,
    });
    return [];
  }
  return node.entries;
}

/* -------------------------------------------------------------------------- */
/* Variables, groups, names, phrases                                           */
/* -------------------------------------------------------------------------- */

function readVariable(name: string, node: YamlNode, context: Context): VariableDef {
  const declared = text(entry(node, "type"));
  let type: VariableDef["type"] = "string";
  if (declared === null) {
    context.diagnostics.push({
      severity: "warning",
      message: `The variable \`${name}\` has no \`type:\`; read as a string.`,
      line: node.line,
    });
  } else if (!VARIABLE_TYPES.includes(declared)) {
    context.diagnostics.push({
      severity: "error",
      message: `\`${declared}\` is not a type a variable can have (${VARIABLE_TYPES.join(", ")}); \`${name}\` was read as a string.`,
      line: node.line,
    });
  } else {
    type = declared as VariableDef["type"];
  }

  const variable: VariableDef = { type, default: emptyValue(type) };

  const fallback = entry(node, "default");
  if (fallback === null) {
    context.diagnostics.push({
      severity: "warning",
      message: `The variable \`${name}\` has no \`default:\`, which the contract requires; it starts at ${JSON.stringify(emptyValue(type))}.`,
      line: node.line,
    });
  } else if (fallback.kind === "seq") {
    variable.default = fallback.items.map((item) => scalar(item) ?? "");
  } else {
    variable.default = scalar(fallback) ?? "";
  }

  const min = scalar(entry(node, "min"));
  if (typeof min === "number") variable.min = min;
  const max = scalar(entry(node, "max"));
  if (typeof max === "number") variable.max = max;

  const of = entry(node, "of");
  if (of !== null) {
    if (of.kind === "seq") variable.of = of.items.map((item) => scalar(item) ?? "");
    else
      context.diagnostics.push({
        severity: "warning",
        message: `\`of: ${text(of)}\` on \`${name}\` names a group, and \`VariableDef.of\` holds a list of values; it was dropped.`,
        line: of.line,
      });
  }

  const control = text(entry(node, "control"));
  if (control !== null) {
    if (CONTROLS.includes(control)) variable.control = control as VariableDef["control"];
    else
      context.diagnostics.push({
        severity: "error",
        message: `\`${control}\` is not a control (${CONTROLS.join(", ")}); \`${name}\` was left without one.`,
        line: node.line,
      });
  }

  const unit = text(entry(node, "unit"));
  if (unit !== null) variable.unit = unit;
  const persist = scalar(entry(node, "persist"));
  if (typeof persist === "boolean") variable.persist = persist;

  noteUnusedKeys(node, ["type", "default", "min", "max", "of", "control", "unit", "persist"], `the variable \`${name}\``, context);
  return variable;
}

function emptyValue(type: VariableDef["type"]): Scalar | Scalar[] {
  if (type === "number") return 0;
  if (type === "boolean") return false;
  if (type === "list") return [];
  return "";
}

function readGroup(name: string, node: YamlNode, context: Context): GroupDef {
  const discipline: GroupDiscipline = { keeps: "duplicates", removes: "none", marks: [] };

  const keeps = text(entry(node, "keeps"));
  if (keeps !== null) {
    if (KEEPS.includes(keeps)) discipline.keeps = keeps as GroupDiscipline["keeps"];
    else
      context.diagnostics.push({
        severity: "error",
        message: `\`keeps: ${keeps}\` on \`${name}\` is not ${KEEPS.join(" or ")}.`,
        line: node.line,
      });
  }
  const removes = text(entry(node, "removes"));
  if (removes !== null) {
    if (REMOVES.includes(removes)) discipline.removes = removes as GroupDiscipline["removes"];
    else
      context.diagnostics.push({
        severity: "error",
        message: `\`removes: ${removes}\` on \`${name}\` is not one of ${REMOVES.join(", ")}.`,
        line: node.line,
      });
  }
  const marks = entry(node, "marks");
  if (marks !== null) discipline.marks = items(marks).map((item) => text(item) ?? "");

  const fields = items(entry(node, "fields")).map((item) => text(item) ?? "");
  const group: GroupDef = { fields, discipline, items: [] };

  const derivedFrom = entry(node, "of");
  if (derivedFrom !== null) {
    const where = text(entry(node, "where"));
    context.diagnostics.push({
      severity: "warning",
      message: `\`${name}\` is derived from \`${text(derivedFrom)}\`${where ? ` where \`${where}\`` : ""}, and \`GroupDef\` has no shape for a derivation; the group is kept empty.`,
      line: node.line,
    });
    if (where) parseExpression(where, node.line, context.diagnostics);
    return group;
  }

  const declaredItems = entry(node, "items");
  if (declaredItems !== null) {
    let synthesised = 0;
    for (const [index, item] of items(declaredItems).entries()) {
      if (item.kind !== "map") {
        context.diagnostics.push({
          severity: "error",
          message: `An item of \`${name}\` is not a map of fields and was dropped.`,
          line: item.line,
        });
        continue;
      }
      const fromFile: Record<string, Scalar> = {};
      for (const field of item.entries) {
        const value = scalar(field.value);
        if (value === null) {
          context.diagnostics.push({
            severity: "warning",
            message: `\`${field.key}\` on an item of \`${name}\` is not a single value and was dropped.`,
            line: field.line,
          });
          continue;
        }
        fromFile[field.key] = value;
      }
      const id = typeof fromFile.id === "string" ? fromFile.id : String(fromFile.id ?? index);
      if (fromFile.id === undefined) synthesised += 1;
      group.items.push({ ...fromFile, id } as GroupItem);
    }
    if (synthesised > 0) {
      context.diagnostics.push({
        severity: "warning",
        message: `${synthesised} item${synthesised === 1 ? "" : "s"} of \`${name}\` have no \`id\`, which \`GroupItem\` requires; their position was used.`,
        line: declaredItems.line,
      });
    }
  }

  noteUnusedKeys(node, ["fields", "keeps", "removes", "marks", "items"], `the group \`${name}\``, context);
  return group;
}

function readName(node: YamlNode, context: Context): NameDef | null {
  if (node.kind === "scalar") {
    return { kind: "expression", of: parseExpression(node.value, node.line, context.diagnostics) };
  }
  if (node.kind !== "map") {
    context.diagnostics.push({ severity: "error", message: "A declared name is neither an expression nor a grouping.", line: node.line });
    return null;
  }
  const over = text(entry(node, "over")) ?? text(entry(node, "of"));
  const by = text(entry(node, "by"));
  const test = text(entry(node, "test"));
  if (over !== null && by !== null && test !== null) {
    if (!TESTS.includes(test)) {
      context.diagnostics.push({
        severity: "error",
        message: `\`test: ${test}\` is not ${TESTS.join(" or ")}.`,
        line: node.line,
      });
      return null;
    }
    if (entry(node, "over") === null) {
      context.diagnostics.push({
        severity: "warning",
        message: "A grouping reads `over:` in the contract, not `of:`.",
        line: node.line,
      });
    }
    noteUnusedKeys(node, ["over", "of", "by", "test"], "a grouping", context);
    return { kind: "grouped", over, by, test: test as "split" | "agree" };
  }
  const derivation = text(entry(node, "derivation"));
  if (derivation !== null) {
    const params: Record<string, unknown> = {};
    for (const field of node.kind === "map" ? node.entries : []) {
      if (field.key !== "derivation") params[field.key] = scalar(field.value) ?? text(field.value);
    }
    return { kind: "derivation", name: derivation, params };
  }
  context.diagnostics.push({
    severity: "error",
    message: `A declared name carrying \`${keysOf(node).join("`, `")}\` is none of the three shapes \`NameDef\` holds.`,
    line: node.line,
  });
  return null;
}

function readPhrase(node: YamlNode, context: Context): PhraseDef {
  const phrase: PhraseDef = { cases: [] };
  const on = text(entry(node, "on"));
  if (on !== null) phrase.on = on;
  const of = text(entry(node, "of"));
  if (of !== null) phrase.of = of;
  const plural = text(entry(node, "plural"));
  if (plural !== null) {
    phrase.plural = plural;
    context.uses.set(plural, "plurals");
  }

  const cases = entry(node, "cases");
  const bare = entry(node, "say");
  // `cases` is optional in the contract, because a phrase with nothing to choose
  // between is one unconditional clause. The parser always emits the list form.
  const list = phrase.cases ?? (phrase.cases = []);
  if (cases !== null) {
    for (const item of items(cases)) list.push(readCase(item, phrase, context));
  } else if (bare !== null) {
    list.push({ say: text(bare) ?? "" });
  } else {
    context.diagnostics.push({ severity: "error", message: "A phrase has no cases.", line: node.line });
  }

  noteUnusedKeys(node, ["on", "of", "plural", "cases", "say"], "a phrase", context);
  return phrase;
}

function readCase(node: YamlNode, phrase: PhraseDef, context: Context): PhraseCase {
  const result: PhraseCase = { say: "" };
  const say = entry(node, "say");
  if (say === null) {
    context.diagnostics.push({ severity: "error", message: "A case of a phrase has no `say:`.", line: node.line });
  } else {
    result.say = text(say) ?? "";
  }

  const is = scalar(entry(node, "is"));
  if (typeof is === "number") {
    result.is = is;
  } else if (is !== null) {
    // `is: n` is sugar for `when: on == n`, and `PhraseCase.is` only holds a
    // number, so a boolean or a word is written out as the clause it stands for.
    if (phrase.on === undefined) {
      context.diagnostics.push({
        severity: "error",
        message: `\`is: ${String(is)}\` needs the phrase to say what it is dispatching \`on:\`.`,
        line: node.line,
      });
    } else {
      context.diagnostics.push({
        severity: "warning",
        message: `\`is: ${String(is)}\` is not a number, which is all \`PhraseCase.is\` holds; written out as \`when: ${phrase.on} == ${String(is)}\`.`,
        line: node.line,
      });
      result.when = { kind: "compare", op: "==", left: { kind: "read", path: phrase.on }, right: { kind: "literal", value: is } };
    }
  }

  const when = text(entry(node, "when"));
  if (when !== null) {
    if (result.when) {
      context.diagnostics.push({ severity: "error", message: "A case carries both `is:` and `when:`.", line: node.line });
    }
    result.when = parseExpression(when, node.line, context.diagnostics);
  }

  noteUnusedKeys(node, ["is", "when", "say"], "a case of a phrase", context);
  return result;
}

function readOpens(node: YamlNode, context: Context): Opens {
  const opens: Opens = {};
  const trail = entry(node, "trail");
  if (trail !== null) opens.trail = items(trail).map((item) => text(item) ?? "");
  const readings = scalar(entry(node, "readings"));
  if (typeof readings === "number") opens.readings = readings;
  noteUnusedKeys(node, ["trail", "readings"], "`opens:`", context);
  return opens;
}

function readUses(node: YamlNode, context: Context): void {
  for (const item of items(node)) {
    const name = text(entry(item, "name"));
    const kind = text(entry(item, "kind"));
    if (name !== null && kind !== null) {
      context.uses.set(name, kind as RegistryKind);
      continue;
    }
    context.diagnostics.push({
      severity: "warning",
      message: `\`uses:\` takes \`{ name, kind }\` pairs; \`${text(item) ?? "an entry"}\` does not say which namespace it belongs to and was dropped.`,
      line: item.line,
    });
  }
}

function noteUnusedKeys(node: YamlNode, used: string[], what: string, context: Context): void {
  const dropped = keysOf(node).filter((key) => !used.includes(key));
  if (dropped.length === 0) return;
  context.diagnostics.push({
    severity: "warning",
    message: `\`${dropped.join("`, `")}\` on ${what} ${dropped.length === 1 ? "has" : "have"} no place in the contract and ${dropped.length === 1 ? "was" : "were"} dropped.`,
    line: node.line,
  });
}

/* -------------------------------------------------------------------------- */
/* The body: islands, and the prose that belongs to them                       */
/* -------------------------------------------------------------------------- */

type Container = { block: Block & { body: Block[] }; opener: string; line: number };

function readBody(source: string, firstLine: number, document: NarrativeDocument, context: Context): void {
  const lines = source.split("\n");
  const preamble: Block[] = [];
  let sink = preamble;
  let node: NodeDef | null = null;
  const open: Container[] = [];

  const target = () => (open.length > 0 ? open[open.length - 1].block.body : sink);
  const push = (block: Block) => target().push(block);

  let at = 0;
  while (at < lines.length) {
    const line = lines[at];
    const fence = /^\s*```(.*)$/.exec(line);
    if (fence) {
      const info = fence[1].trim();
      const start = at;
      at += 1;
      const collected: string[] = [];
      let closed = false;
      while (at < lines.length) {
        if (/^\s*```\s*$/.test(lines[at])) {
          closed = true;
          at += 1;
          break;
        }
        collected.push(lines[at]);
        at += 1;
      }
      const raw = lines.slice(start, closed ? at : lines.length).join("\n");
      if (!closed) {
        context.diagnostics.push({
          severity: "error",
          message: "A fenced island opens and never closes; it was kept verbatim.",
          line: firstLine + start,
        });
        push({ kind: "unknown", raw });
        continue;
      }
      if (info !== "calamus") {
        context.diagnostics.push({
          severity: "warning",
          message: `A fence marked \`${info}\` is not an island of the format; it was kept verbatim.`,
          line: firstLine + start,
        });
        push({ kind: "unknown", raw });
        continue;
      }
      const island = readIsland(collected.join("\n"), firstLine + start + 1, raw, context);
      if (island.kind === "end") {
        const closing = open.pop();
        if (!closing) {
          context.diagnostics.push({
            severity: "warning",
            message: "An `end` island closes nothing.",
            line: firstLine + start,
          });
        }
        continue;
      }
      if (island.kind === "node") {
        if (open.length > 0) {
          context.diagnostics.push({
            severity: "warning",
            message: `A node header interrupts an open \`${open[open.length - 1].opener}\` island, which was closed for it.`,
            line: firstLine + start,
          });
          open.length = 0;
        }
        node = island.node;
        document.nodes.push(node);
        sink = node.body;
        continue;
      }
      if (island.kind === "open") {
        push(island.block);
        open.push({ block: island.block, opener: island.opener, line: firstLine + start });
        continue;
      }
      push(island.block);
      continue;
    }

    if (line.trim() === "") {
      at += 1;
      continue;
    }

    const start = at;
    const chunk: string[] = [];
    while (at < lines.length && lines[at].trim() !== "" && !/^\s*```/.test(lines[at])) {
      chunk.push(lines[at]);
      at += 1;
    }
    for (const block of readProse(chunk, firstLine + start, context)) push(block);
  }

  for (const unclosed of open) {
    context.diagnostics.push({
      severity: "warning",
      message: `The \`${unclosed.opener}\` island is never closed by an \`end\`; it was closed at the end of the document.`,
      line: unclosed.line,
    });
  }

  if (document.nodes.length === 0) {
    document.body = preamble;
  } else if (preamble.length > 0) {
    // `body` is the flat case, used only when there are no nodes. Prose before
    // the first node header has nowhere else to go, and losing it is worse.
    document.body = preamble;
    context.diagnostics.push({
      severity: "warning",
      message: `${preamble.length} block${preamble.length === 1 ? "" : "s"} stand before the first node header; the contract keeps \`body\` for the case with no nodes, and they were put there.`,
      line: firstLine,
    });
  }
}

type Island =
  | { kind: "end" }
  | { kind: "node"; node: NodeDef }
  | { kind: "open"; block: Block & { body: Block[] }; opener: string }
  | { kind: "block"; block: Block };

function readIsland(content: string, firstLine: number, raw: string, context: Context): Island {
  const significant = content
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"))
    .join("\n");
  if (significant.trim() === "end") return { kind: "end" };
  if (significant.trim() === "") {
    context.diagnostics.push({ severity: "warning", message: "An empty island was dropped.", line: firstLine });
    return { kind: "block", block: { kind: "unknown", raw } };
  }

  const node = parseYaml(significant, firstLine, context.diagnostics);
  const first = node.kind === "map" && node.entries.length > 0 ? node.entries[0].key : "";

  if (first === "node") return { kind: "node", node: readNode(node, context) };

  if (first === "each") {
    const spec = groupSpec(text(entry(node, "each")) ?? "", node.line, context);
    noteUnusedKeys(node, ["each"], "an `each` island", context);
    const block: Block & { body: Block[] } = { kind: "each", group: spec.group, body: [] };
    if (spec.where) block.where = spec.where;
    return { kind: "open", block, opener: "each" };
  }

  if (first === "block" || first === "pair") {
    const id = text(entry(node, "id")) ?? text(entry(node, first)) ?? "";
    noteUnusedKeys(node, [first, "id"], `a \`${first}\` island`, context);
    return { kind: "open", block: { kind: "region", id, body: [] }, opener: first };
  }

  if (first === "slot") {
    const name = text(entry(node, "slot")) ?? "";
    context.uses.set(name, "views");
    const params: Record<string, unknown> = {};
    if (node.kind === "map") {
      for (const field of node.entries) {
        if (field.key === "slot") continue;
        params[field.key] = field.value.kind === "seq" ? field.value.items.map((item) => scalar(item)) : scalar(field.value);
      }
    }
    return { kind: "block", block: { kind: "slot", name, params, body: [] } };
  }

  context.diagnostics.push({
    severity: "warning",
    message: `An island opening on \`${first}:\` names nothing the format defines; it was kept verbatim.`,
    line: firstLine,
  });
  return { kind: "block", block: { kind: "unknown", raw } };
}

function readNode(node: YamlNode, context: Context): NodeDef {
  const result: NodeDef = { id: text(entry(node, "node")) ?? "", exits: [], body: [] };
  const requires = text(entry(node, "requires"));
  if (requires !== null) result.requires = parseExpression(requires, node.line, context.diagnostics);

  const exits = entry(node, "exits");
  if (exits !== null) {
    for (const item of items(exits)) {
      const to = text(entry(item, "to"));
      if (to === null) {
        context.diagnostics.push({ severity: "error", message: "An exit says nothing about where it goes.", line: item.line });
        continue;
      }
      const exit: Exit = { to, label: text(entry(item, "label")) ?? "" };
      if (exit.label === "") {
        context.diagnostics.push({ severity: "warning", message: `The exit to \`${to}\` has no label.`, line: item.line });
      }
      const when = text(entry(item, "when"));
      if (when !== null) exit.when = parseExpression(when, item.line, context.diagnostics);
      noteUnusedKeys(item, ["to", "label", "when"], `the exit to \`${to}\``, context);
      result.exits.push(exit);
    }
  }

  noteUnusedKeys(node, ["node", "requires", "exits"], `the node \`${result.id}\``, context);
  return result;
}

/** `group`, or `group where <expression>`. */
function groupSpec(source: string, line: number, context: Context): { group: string; where?: Expression } {
  const unquoted = source.trim().replace(/^"(.*)"$/s, "$1").replace(/^'(.*)'$/s, "$1").trim();
  const split = /^(\S+)\s+where\s+([\s\S]+)$/.exec(unquoted);
  if (!split) return { group: unquoted };
  return { group: split[1], where: parseExpression(split[2], line, context.diagnostics) };
}

/* -------------------------------------------------------------------------- */
/* Prose                                                                       */
/* -------------------------------------------------------------------------- */

const BLOCK_ATTRIBUTES = ["when", "weight", "id", "voice", "lang", "mark", "live"];

function readProse(chunk: string[], firstLine: number, context: Context): Block[] {
  const blocks: Block[] = [];
  let lines = [...chunk];
  let line = firstLine;

  while (lines.length > 0) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(lines[0].trim());
    if (!heading) break;
    let level = heading[1].length;
    if (level > 3) {
      context.diagnostics.push({
        severity: "warning",
        message: `A heading of ${level} hashes was read as one of three, which is all \`Block\` holds.`,
        line,
      });
      level = 3;
    }
    blocks.push({ kind: "heading", level: level as 1 | 2 | 3, content: parseInline(heading[2], line, context.diagnostics) });
    lines = lines.slice(1);
    line += 1;
  }

  let source = lines.join("\n").replace(/<!--[\s\S]*?-->/g, "");
  if (source.trim() === "") return blocks;

  let attrs: BlockAttrs = {};
  const opening = readDirective(source.trimStart(), 0);
  const offset = source.length - source.trimStart().length;

  if (opening && opening.name === "with") {
    attrs = readBlockAttrs(opening.attributes, line, context);
    if (opening.hasChildren) {
      context.diagnostics.push({
        severity: "warning",
        message: "`:with` takes no children; its brackets were dropped.",
        line,
      });
    }
    source = source.slice(offset + opening.end);
  } else if (opening && opening.name === "each") {
    const spec = groupSpec(opening.attributesText.replace(/^\s*of\s*=\s*/, ""), line, context);
    const body = readProse(source.slice(offset + opening.end).split("\n"), line, context);
    const each: Block = { kind: "each", group: spec.group, body };
    if (spec.where) each.where = spec.where;
    blocks.push(each);
    return blocks;
  } else if (opening && opening.name === "blank") {
    const count = Number(opening.children.trim());
    if (!Number.isFinite(count) || count <= 0) {
      context.diagnostics.push({
        severity: "error",
        message: `\`:blank[${opening.children}]\` takes a count of lines.`,
        line,
      });
    }
    blocks.push({ kind: "blank", lines: Number.isFinite(count) && count > 0 ? count : 1 });
    source = source.slice(offset + opening.end);
    if (source.trim() === "") return blocks;
  }

  const content: Inline[] = parseInline(source.replace(/^\n/, ""), line, context.diagnostics);
  for (const item of content) {
    if (item.kind === "slot") context.uses.set(item.name, "views");
    if (item.kind === "mark") context.uses.set(item.markKind, "marks");
  }
  if (content.length > 0 || Object.keys(attrs).length > 0) blocks.push({ kind: "paragraph", attrs, content });
  return blocks;
}

function readBlockAttrs(attributes: Attributes, line: number, context: Context): BlockAttrs {
  const attrs: BlockAttrs = {};

  const when = attributeValue(attributes, "when");
  if (when !== null) attrs.when = parseExpression(when, line, context.diagnostics);

  const weight = attributeValue(attributes, "weight");
  if (weight !== null) {
    const asNumber = Number(weight);
    if (Number.isFinite(asNumber)) attrs.weight = asNumber;
    else
      context.diagnostics.push({
        severity: "warning",
        message: `\`weight=${weight}\` names a kind of paragraph, and \`BlockAttrs.weight\` holds a number; it was dropped.`,
        line,
      });
  }

  for (const name of ["id", "voice", "lang", "mark"] as const) {
    const value = attributeValue(attributes, name);
    if (value !== null) attrs[name] = value;
  }

  const live = attributeValue(attributes, "live");
  if (live !== null) {
    attrs.live = live !== "false";
    if (live !== "true" && live !== "false") {
      context.diagnostics.push({
        severity: "warning",
        message: `\`live=${live}\` names how urgently the region announces, and \`BlockAttrs.live\` is a boolean; the politeness was dropped.`,
        line,
      });
    }
  }

  const dropped = Object.keys(attributes).filter((name) => !BLOCK_ATTRIBUTES.includes(name));
  if (dropped.length > 0) {
    context.diagnostics.push({
      severity: "warning",
      message: `\`${dropped.join("`, `")}\` on \`:with\` ${dropped.length === 1 ? "is" : "are"} not ${BLOCK_ATTRIBUTES.join(", ")}, and ${dropped.length === 1 ? "was" : "were"} dropped.`,
      line,
    });
  }
  return attrs;
}
