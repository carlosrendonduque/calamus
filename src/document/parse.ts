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
  Move,
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
import {
  attributeValue,
  expressionAttribute,
  isAffordanceVerb,
  parseInline,
  readDirective,
  readGesture,
  type Attributes,
  type Directive,
} from "./inline";
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
        if (Object.keys(opens).length > 0) document.opens = opens;
        break;
      }
      case "uses":
        readUses(item.value, context);
        break;
      case "marks":
        // The mark kind is the author's and the renderer behind it is the
        // registry's; `NarrativeDocument.marks` stores the first and reads none
        // of it, and `as:` is the only key the schema itself follows.
        for (const declaration of mapEntriesOf(item.value, "marks", context)) {
          document.marks[declaration.key] = readVocabulary(declaration.value, `the mark \`${declaration.key}\``, context);
          const renderer = text(entry(declaration.value, "as"));
          if (renderer) context.uses.set(renderer, "marks");
        }
        break;
      case "moves":
        for (const declaration of mapEntriesOf(item.value, "moves", context)) {
          document.moves[declaration.key] = readMove(declaration.key, declaration.value, context);
        }
        break;
      case "controls":
        for (const declaration of mapEntriesOf(item.value, "controls", context)) {
          document.controls[declaration.key] = readVocabulary(declaration.value, `the control \`${declaration.key}\``, context);
        }
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

  // `of:` is either the options themselves or the group they come from.
  const of = entry(node, "of");
  if (of !== null) {
    if (of.kind === "seq") variable.of = of.items.map((item) => scalar(item) ?? "");
    else variable.optionsFrom = text(of) ?? "";
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
  // The label of a control is prose someone reads, so it belongs to the document.
  // The contract holds one label for a control and the corpus writes it two
  // ways; both name the same thing, and neither document writes both.
  const label = text(entry(node, "label")) ?? text(entry(node, "control-label"));
  if (label !== null) variable.label = label;
  // Where the control sits, and how its steps and rows are drawn.
  const placement = text(entry(node, "control-at"));
  if (placement !== null) variable.placement = placement;
  const step = scalar(entry(node, "step"));
  if (typeof step === "number") variable.step = step;
  const rows = scalar(entry(node, "rows"));
  if (typeof rows === "number") variable.rows = rows;

  const optionLabels = entry(node, "option-label");
  if (optionLabels !== null) {
    const perOption = labelsPerOption(optionLabels);
    if (perOption) variable.optionLabels = perOption;
    else
      context.diagnostics.push({
        severity: "warning",
        message: `The option label of \`${name}\` is one clause read in the scope of each option${text(optionLabels) === null ? "" : ` (\`${text(optionLabels)}\`)`}, and \`VariableDef.optionLabels\` holds one label per option; it was dropped.`,
        line: optionLabels.line,
      });
  }

  const persist = scalar(entry(node, "persist"));
  if (typeof persist === "boolean") variable.persist = persist;

  noteUnusedKeys(
    node,
    ["type", "default", "min", "max", "of", "control", "unit", "label", "control-label",
     "control-at", "step", "rows", "option-label", "persist"],
    `the variable \`${name}\``,
    context
  );
  return variable;
}

/** One label per option, which is the only shape the contract holds. */
function labelsPerOption(node: YamlNode): Record<string, string> | null {
  if (node.kind !== "map" || node.entries.length === 0) return null;
  const labels: Record<string, string> = {};
  for (const option of node.entries) {
    const said = text(option.value);
    if (said === null) return null;
    labels[option.key] = said;
  }
  return labels;
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

  // A group may be a filtered view of another instead of a list of its own. The
  // filter reads live values, so it is kept as an expression and never resolved
  // here: `said: { of: account, where: "trust >= keep" }`.
  const derivedFrom = entry(node, "of");
  if (derivedFrom !== null) {
    const from = text(derivedFrom);
    if (from === null) {
      context.diagnostics.push({
        severity: "error",
        message: `\`of:\` on \`${name}\` names the group it is a view of, and is not a name.`,
        line: derivedFrom.line,
      });
      return group;
    }
    group.derivedFrom = { group: from };
    const where = text(entry(node, "where"));
    if (where !== null) group.derivedFrom.where = parseExpression(where, node.line, context.diagnostics);
    noteUnusedKeys(node, ["fields", "keeps", "removes", "marks", "of", "where"], `the group \`${name}\``, context);
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
        message: `${synthesised} item${synthesised === 1 ? "" : "s"} of \`${name}\` have no \`id\`, and a declared item names itself; their position was used.`,
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
    noteUnusedKeys(node, ["over", "of", "by", "answer", "test"], "a grouping", context);
    const grouped: NameDef = { kind: "grouped", over, by, test: test as "split" | "agree" };
    // Without the field carrying the answer the test compares every other field
    // and every bucket splits, because the prose differs.
    const answer = text(entry(node, "answer"));
    if (answer !== null) grouped.answer = answer;
    return grouped;
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

  const declaredList = entry(node, "list");
  if (declaredList !== null) {
    const joined = readList(declaredList, node, context);
    if (joined) phrase.list = joined;
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

  noteUnusedKeys(
    node,
    ["on", "of", "plural", "list", "field", "sep", "last", "cases", "say"],
    "a phrase",
    context
  );
  return phrase;
}

/**
 * `list: { of, field, sep, last }` — the author supplies the separators
 * literally, because Spanish turns "y" into "e" before i- and the library must
 * never choose. The flat spelling beside `field:`/`sep:` is read as the same.
 */
function readList(node: YamlNode, phrase: YamlNode, context: Context): PhraseDef["list"] | null {
  const flat = text(node);
  const source = flat !== null ? phrase : node;
  const of = flat !== null ? flat : text(entry(node, "of"));
  if (of === null) {
    context.diagnostics.push({
      severity: "error",
      message: "A joined list says nothing about the group it joins.",
      line: node.line,
    });
    return null;
  }
  if (flat !== null) {
    context.diagnostics.push({
      severity: "warning",
      message: "`list:` takes `{ of, field, sep, last }` in the contract; the flat spelling beside it was read as one.",
      line: node.line,
    });
  }
  const field = text(entry(source, "field"));
  const sep = text(entry(source, "sep"));
  if (field === null || sep === null) {
    context.diagnostics.push({
      severity: "warning",
      message: `A joined list over \`${of}\` names no ${field === null ? "`field:`" : "`sep:`"}, which the contract asks for; it was read as ${field === null ? "the whole item" : "an empty separator"}.`,
      line: node.line,
    });
  }
  const joined: NonNullable<PhraseDef["list"]> = { of, field: field ?? "", sep: sep ?? "" };
  const last = text(entry(source, "last"));
  if (last !== null) joined.last = last;
  return joined;
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
  if (typeof is === "number" || typeof is === "boolean") {
    // `is: v` is sugar for `when: on == v`, for a number or a boolean.
    result.is = is;
  } else if (is !== null) {
    // Anything else is a word, which `PhraseCase.is` does not hold, so it is
    // written out as the clause it stands for.
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

  // A document may open with a log already holding entries, or a variable
  // already moved: a text with no trace cannot show that it keeps one.
  const logs = entry(node, "logs");
  if (logs !== null) {
    const seeded: Record<string, GroupItem[] | number> = {};
    for (const declaration of mapEntriesOf(logs, "`opens: logs:`", context)) {
      const howMany = scalar(declaration.value);
      if (typeof howMany === "number") {
        seeded[declaration.key] = howMany;
        continue;
      }
      seeded[declaration.key] = items(declaration.value).map((item) => {
        const fields: Record<string, Scalar> = {};
        for (const field of item.kind === "map" ? item.entries : []) {
          const value = scalar(field.value);
          if (value !== null) fields[field.key] = value;
        }
        // A log entry has no name until it is written, so a seeded one is left
        // without an id and the runtime supplies its position.
        return fields as GroupItem;
      });
    }
    opens.logs = seeded;
  }

  const variables = entry(node, "variables");
  if (variables !== null) {
    const moved: Record<string, Scalar | Scalar[]> = {};
    for (const declaration of mapEntriesOf(variables, "`opens: variables:`", context)) {
      moved[declaration.key] =
        declaration.value.kind === "seq"
          ? declaration.value.items.map((item) => scalar(item) ?? "")
          : scalar(declaration.value) ?? "";
    }
    opens.variables = moved;
  }

  noteUnusedKeys(node, ["trail", "readings", "logs", "variables"], "`opens:`", context);
  return opens;
}

/**
 * An author-declared vocabulary: a mark kind, a control. The schema stores the
 * keys the author wrote and reads none of them (decision 30).
 */
function readVocabulary(node: YamlNode, what: string, context: Context): Record<string, Scalar> {
  const declared: Record<string, Scalar> = {};
  if (node.kind !== "map") {
    context.diagnostics.push({
      severity: "error",
      message: `${what} is not a map of what the author declared about it.`,
      line: node.line,
    });
    return declared;
  }
  for (const field of node.entries) {
    const value = scalar(field.value);
    if (value === null) {
      context.diagnostics.push({
        severity: "warning",
        message: `\`${field.key}\` on ${what} is not a single value, which is all a declared vocabulary holds; it was dropped.`,
        line: field.line,
      });
      continue;
    }
    declared[field.key] = value;
  }
  return declared;
}

/**
 * `moves:` declares a gesture the prose then names. The contract keeps what it
 * writes; the rest of the declaration is the gesture's own detail, in the
 * author's vocabulary, and is carried beside it rather than dropped.
 */
function readMove(name: string, node: YamlNode, context: Context): NarrativeDocument["moves"][string] {
  const detail: Record<string, unknown> = {};
  for (const field of node.kind === "map" ? node.entries : []) {
    if (field.key === "writes") continue;
    detail[field.key] = plain(field.value);
  }
  const declared = entry(node, "writes");
  if (declared === null) {
    context.diagnostics.push({
      severity: "warning",
      message: `The move \`${name}\` does not say what it \`writes:\`, which is what the contract keeps of it.`,
      line: node.line,
    });
  }
  const move: NarrativeDocument["moves"][string] & Record<string, unknown> = {
    ...detail,
    writes: items(declared).map((item) => text(item) ?? ""),
  };
  return move;
}

/** A YAML node as plain data, for the author's own vocabulary. */
function plain(node: YamlNode): unknown {
  if (node.kind === "scalar") return scalar(node);
  if (node.kind === "seq") return node.items.map(plain);
  const asObject: Record<string, unknown> = {};
  for (const field of node.entries) asObject[field.key] = plain(field.value);
  return asObject;
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
      if (island.kind === "blocks") {
        for (const block of island.blocks) push(block);
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
  | { kind: "block"; block: Block }
  | { kind: "blocks"; blocks: Block[] };

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
    noteUnusedKeys(node, ["each", "order", "empty", "heading", "label", ...BLOCK_ATTRIBUTES], "an `each` island", context);
    const block: Block & { body: Block[] } = { kind: "each", group: spec.group, body: [] };
    if (spec.where) block.where = spec.where;
    // The order of what a group prints is structure, not presentation, so the
    // name is the registry's and the permutation is never the parser's.
    const order = text(entry(node, "order"));
    if (order !== null) {
      block.order = order;
      context.uses.set(order, "orders");
    }
    // `empty:` is reader-facing prose, not an empty state: an exhausted group is
    // usually the moment the piece says something. Losing it loses prose.
    const empty = entry(node, "empty");
    if (empty !== null) block.empty = readBlocks(text(empty) ?? "", empty.line, context);
    // A loop carries what a paragraph carries, and its heading and its label are
    // prose: "Your route so far", "Transcript of the call".
    const attrs = islandAttrs(node, [], context);
    if (attrs) block.attrs = attrs;
    const heading = text(entry(node, "heading"));
    if (heading !== null) block.heading = heading;
    const label = text(entry(node, "label"));
    if (label !== null) block.label = label;
    return { kind: "open", block, opener: "each" };
  }

  // A region opens as a node does, with its own island, and reveals in place
  // instead of replacing (formato.md §7). `block:` and `pair:` are the older
  // spellings the corpus writes and are read as the same thing.
  if (first === "region" || first === "block" || first === "pair") {
    // `id:` names the region itself here, which is what a region is for, so it
    // is the one paragraph attribute an island of this kind spends on itself.
    const id = text(entry(node, "id")) ?? text(entry(node, first)) ?? "";
    noteUnusedKeys(node, [first, "id", ...BLOCK_ATTRIBUTES], `a \`${first}\` island`, context);
    const region: Block & { body: Block[] } = { kind: "region", id, body: [] };
    const attrs = islandAttrs(node, ["id"], context);
    if (attrs) region.attrs = attrs;
    return { kind: "open", block: region, opener: first };
  }

  if (first === "controls") {
    return { kind: "blocks", blocks: readControls(entry(node, "controls"), context) };
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
  // Printed when the trail names this node back to the reader.
  const title = text(entry(node, "title"));
  if (title !== null) result.title = title;
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
      // Reader-facing prose on the exit itself ("seen"), not a style.
      const note = text(entry(item, "note"));
      if (note !== null) exit.note = note;
      // Logs or variables this exit returns to their opening value.
      const resets = entry(item, "resets");
      if (resets !== null) exit.resets = items(resets).map((name) => text(name) ?? "");
      noteUnusedKeys(item, ["to", "label", "when", "note", "resets"], `the exit to \`${to}\``, context);
      result.exits.push(exit);
    }
  }

  noteUnusedKeys(node, ["node", "title", "requires", "exits"], `the node \`${result.id}\``, context);
  return result;
}

/**
 * A `controls:` island: a list of buttons standing on their own. Eight of the
 * nineteen end in one, and each carries a label, which is reader-facing prose.
 *
 * `Block.affordance` holds one target, so an entry that names a declared move
 * arrives whole; an entry that spells its gesture out on the spot keeps its
 * label and its condition, and the gesture itself is diagnosed.
 */
function readControls(node: YamlNode | null, context: Context): Block[] {
  if (node === null) return [];
  const blocks: Block[] = [];
  let spelledOut = 0;
  const unspeakable = new Set<string>();
  for (const item of items(node)) {
    const label = text(entry(item, "label"));
    if (label === null) {
      context.diagnostics.push({
        severity: "warning",
        message: "A control carries no `label:`, which is the prose the reader reads on it.",
        line: item.line,
      });
    }
    const navigates = text(entry(item, "to"));
    const reveals = text(entry(item, "show"));
    const named = entry(item, "move");
    let action: "go" | "show" | "do" = "do";
    let target = "";
    if (navigates !== null) {
      action = "go";
      target = navigates;
    } else if (reveals !== null) {
      action = "show";
      target = reveals;
    } else if (named !== null && text(named) !== null) {
      target = text(named) ?? "";
    }
    const control: Block = { kind: "affordance", action, target, label: label ?? "" };
    const when = text(entry(item, "when"));
    if (when !== null) control.when = parseExpression(when, item.line, context.diagnostics);
    // A gesture spelled out at the call site rather than declared, which seven
    // of the eight controls in the corpus do.
    const spelled = readGestureMoves(item, context);
    // A `move:` whose value is a map is the gesture itself, not a name.
    const inner = readGestureMoves(named !== null && named.kind === "map" ? named : null, context);
    const gesture = [...spelled.moves, ...inner.moves];
    const unreadable = [...spelled.unreadable, ...inner.unreadable];
    if (gesture.length > 0) control.gesture = gesture;
    if (unreadable.length > 0) {
      spelledOut += 1;
      for (const key of unreadable) unspeakable.add(key);
    }
    blocks.push(control);
  }
  if (spelledOut > 0) {
    context.diagnostics.push({
      severity: "warning",
      message: `${spelledOut} control${spelledOut === 1 ? "" : "s"} spell${spelledOut === 1 ? "s" : ""} a gesture (\`${[...unspeakable].join("`, `")}\`) that \`Move\` has no shape for; the labels and the conditions were kept and those gestures were not.`,
      line: node.line,
    });
  }
  return blocks;
}

/**
 * The gestures written where a control stands, read into the `Move`s the
 * contract holds. Everything here is a schema key: what is written, where, and
 * which entry of it — never a name the author chose.
 */
function readGestureMoves(node: YamlNode | null, context: Context): { moves: Move[]; unreadable: string[] } {
  const moves: Move[] = [];
  const unreadable: string[] = [];
  if (node === null || node.kind !== "map") return { moves, unreadable };
  for (const gesture of node.entries) {
    switch (gesture.key) {
      case "label":
      case "when":
      case "to":
      case "show":
      case "move":
        break;
      case "sets":
        for (const written of gesture.value.kind === "map" ? gesture.value.entries : []) {
          moves.push({
            kind: "set",
            name: written.key,
            value:
              written.value.kind === "seq"
                ? written.value.items.map((one) => scalar(one) ?? "")
                : scalar(written.value) ?? "",
          });
        }
        break;
      case "logs":
        for (const grown of gesture.value.kind === "map" ? gesture.value.entries : []) {
          const written: Record<string, Scalar> = {};
          for (const field of grown.value.kind === "map" ? grown.value.entries : []) {
            const value = scalar(field.value);
            if (value !== null) written[field.key] = value;
          }
          moves.push({ kind: "add", log: grown.key, entry: written });
        }
        break;
      case "resets": {
        // A reset states where each name goes. `resets: [a, b]` means "back to
        // what they opened on", which the reducer reads as an absent destination.
        if (gesture.value.kind === "map") {
          const variables: Record<string, Scalar | Scalar[]> = {};
          for (const key of keysOf(gesture.value)) {
            const field = { key, value: entry(gesture.value, key) };
            const value = scalar(field.value);
            if (value !== null) variables[field.key] = value;
          }
          moves.push({ kind: "reset", variables });
        } else {
          const names = items(gesture.value)
            .map((one) => text(one))
            .filter((name): name is string => name !== null);
          if (names.length > 0) moves.push({ kind: "reset", names });
        }
        break;
      }
      case "mark": {
        const log = text(entry(gesture.value, "log"));
        const at = scalar(entry(gesture.value, "at")) ?? scalar(entry(gesture.value, "entry"));
        const field = text(entry(gesture.value, "field"));
        if (log === null || field === null || (typeof at !== "string" && typeof at !== "number")) {
          unreadable.push(gesture.key);
          break;
        }
        moves.push({ kind: "mark", log, field, address: { at } });
        break;
      }
      default:
        unreadable.push(gesture.key);
    }
  }
  return { moves, unreadable };
}

/** The paragraph attributes an island writes as keys rather than as a `:with`. */
function islandAttrs(node: YamlNode, except: string[], context: Context): BlockAttrs | undefined {
  const attrs: BlockAttrs = {};
  for (const key of keysOf(node)) {
    if (except.includes(key) || !BLOCK_ATTRIBUTES.includes(key)) continue;
    const value = entry(node, key);
    const said = text(value);
    if (value === null || said === null) continue;
    if (key === "when") attrs.when = parseExpression(said, value.line, context.diagnostics);
    else if (key === "weight") {
      const weight = Number(said);
      if (Number.isFinite(weight)) attrs.weight = weight;
      else
        context.diagnostics.push({
          severity: "warning",
          message: `\`weight: ${said}\` names a kind of block, and \`BlockAttrs.weight\` holds a number; it was dropped.`,
          line: value.line,
        });
    } else if (key === "live") attrs.live = said === "true" ? true : said === "false" ? false : said;
    else attrs[key as "id" | "voice" | "lang" | "mark" | "role"] = said;
  }
  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

/** Prose standing inside an island value: one block per paragraph of it. */
function readBlocks(source: string, firstLine: number, context: Context): Block[] {
  const blocks: Block[] = [];
  let chunk: string[] = [];
  let at = 0;
  let start = 0;
  const flush = () => {
    if (chunk.length > 0) blocks.push(...readProse(chunk, firstLine + start, context));
    chunk = [];
  };
  for (const line of source.split("\n")) {
    if (line.trim() === "") flush();
    else {
      if (chunk.length === 0) start = at;
      chunk.push(line);
    }
    at += 1;
  }
  flush();
  return blocks;
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

const BLOCK_ATTRIBUTES = ["when", "weight", "id", "voice", "lang", "mark", "live", "role"];

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
  } else if (
    opening &&
    isAffordanceVerb(opening.name) &&
    opening.attributes.label !== undefined &&
    source.slice(offset + opening.end).trim() === ""
  ) {
    // A control or a button standing on its own, which eight of the nineteen
    // end in. Its label is prose, so it is the label that tells one from an
    // affordance inside a sentence, which takes its prose from its children.
    blocks.push(blockAffordance(opening, line, context));
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

function blockAffordance(directive: Directive, line: number, context: Context): Block {
  const { action, target, used } = readGesture(directive, line, context.diagnostics);
  const block: Block = {
    kind: "affordance",
    action,
    target,
    label: attributeValue(directive.attributes, "label") ?? "",
  };
  const when = expressionAttribute(directive.attributes, "when", line, context.diagnostics);
  if (when) block.when = when;
  const kept = [...used, "label", "when"];
  const dropped = Object.keys(directive.attributes).filter((name) => !kept.includes(name));
  if (dropped.length > 0) {
    context.diagnostics.push({
      severity: "warning",
      message: `\`${dropped.join("`, `")}\` on \`:${directive.name}\` ${dropped.length === 1 ? "has" : "have"} no place on a block affordance in the contract, and ${dropped.length === 1 ? "was" : "were"} dropped.`,
      line,
    });
  }
  return block;
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

  // `role` is a part the author names — `heading`, `caption`, `time` — and not a
  // number, which is what `weight` above holds.
  for (const name of ["id", "voice", "lang", "mark", "role"] as const) {
    const value = attributeValue(attributes, name);
    if (value !== null) attrs[name] = value;
  }

  // `true`, or the ARIA politeness the author asked for (`polite`, `status`).
  const live = attributeValue(attributes, "live");
  if (live !== null) attrs.live = live === "true" ? true : live === "false" ? false : live;

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
