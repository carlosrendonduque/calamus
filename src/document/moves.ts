/**
 * What a reader's gesture asks of the document, turned into moves the reducer
 * already knows.
 *
 * Three verbs reach this file. `:go{to=}` enters a node, `:go{show=}` reveals a
 * region, `:do{move=}` invokes a move the author declared — and only that third
 * one writes. Everything a move does beyond writing (what it shows, what it
 * focuses, what a screen reader hears) is declared beside it in `moves:`,
 * because ambiguity A10 found one gesture in the corpus that moves the focus,
 * writes a variable and grows a log at once, and prose has no room for three.
 *
 * Nothing here throws and nothing here mutates. A gesture it cannot read comes
 * back empty with a diagnostic, and an empty gesture leaves the reading where it
 * was (decision 28).
 *
 * ## The seam this file also repairs
 *
 * `types.ts` and `state.ts` both export a type called `Move` and they are not
 * the same type: the contract writes `{ kind: "add", log, item }`,
 * `{ kind: "mark", log, at, field }` and `{ kind: "reset", names, to }`, while
 * the reducer takes `{ kind: "add", log, entry }`, `{ kind: "mark", log, field,
 * address }` and a reset that names its destination. `parse.ts` builds the
 * first and `reduce` consumes the second, so a control's `gesture:` would be
 * rejected as an unknown move if it were passed straight through. Both files are
 * out of bounds, so the translation lives here, in the open, rather than
 * silently in the renderer.
 */

import type {
  Block,
  Expression,
  GroupItem,
  Inline,
  Move as ContractMove,
  NarrativeDocument,
  Scalar,
  VariableDef,
} from "./types";
import type { Move, Scope, Value } from "./evaluator";
import { asText, evaluate, initialState, isItem, isScalar, readPath, reduce, truthy } from "./evaluator";
import { plainText } from "./text";

/* -------------------------------------------------------------------------- */
/* A gesture                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One press, in full. Writing is `moves`, and the rest is the library's: what to
 * reveal, where the focus goes, and what the announcer says — three things the
 * contract refuses to delegate (contrato-ranuras §5.2).
 */
export type Gesture = {
  /** Applied in order through `reduce`, as one gesture. */
  moves: Move[];
  /** Region ids to reveal in place. A node replaces; a region does not. */
  show: string[];
  /** Region ids to hide again, which is what a second press on a toggle does. */
  hide: string[];
  /**
   * The id of the element the focus goes to, or null to leave it alone. The
   * library owns every focus move (§5.2.4); a slot never makes one.
   */
  focus: string | null;
  /** Prose the announcer says, already resolved from a `phrases:` of the
   *  document. Never a string a registry entry invented (§5.2.2). */
  announce: string | null;
  /** The affordance this gesture left, so a return knows where to put the focus
   *  back. `Inline.affordance.id` is what the format spells for this. */
  from: string | null;
  diagnostics: string[];
};

export function emptyGesture(): Gesture {
  return { moves: [], show: [], hide: [], focus: null, announce: null, from: null, diagnostics: [] };
}

export function isEmptyGesture(gesture: Gesture): boolean {
  return (
    gesture.moves.length === 0 &&
    gesture.show.length === 0 &&
    gesture.hide.length === 0 &&
    gesture.focus === null &&
    gesture.announce === null
  );
}

/* -------------------------------------------------------------------------- */
/* Opening values, which is what a reset returns a name to                     */
/* -------------------------------------------------------------------------- */

/**
 * `resets: chain` says "put the chain back", and the contract's reset carries
 * only names. Where a name goes back *to* is the document's `opens:` when it
 * seeded one, and otherwise the declaration: a variable's `default:` and a log's
 * declared `items:`, which for a log that grows is empty.
 */
export function openingValues(document: NarrativeDocument): {
  variables: Record<string, Scalar | Scalar[]>;
  logs: Record<string, GroupItem[]>;
} {
  const opened = initialState(document.opens ?? {});
  const variables: Record<string, Scalar | Scalar[]> = {};
  const logs: Record<string, GroupItem[]> = {};

  for (const [name, declared] of Object.entries(document.variables ?? {})) {
    variables[name] = declared.default;
  }

  for (const [name, group] of Object.entries(document.groups ?? {})) {
    logs[name] = [...(group.items ?? [])];
  }

  // What the document opened on wins over what was declared: two of the
  // nineteen open mid-reading on purpose, and a reset there means back to the
  // opening, not back to empty.
  for (const [name, value] of Object.entries(opened.variables)) {
    variables[name] = value;
  }

  for (const [name, entries] of Object.entries(opened.logs)) {
    logs[name] = entries;
  }

  return { variables, logs };
}

/**
 * The schema's own name for the reading's trail — a key of `Opens` and a key of
 * `ReadingState`, so a document that writes `opens: { trail: [platform] }` and
 * `resets: trail` is naming the same schema word twice.
 */
const TRAIL = "trail";

/** The schema's older sugar for `opens:` (conformance README §5.4), which the
 *  corpus writes as the destination of an exit: "Return to the start". */
const START = "start";

/**
 * Where a reading starts, as a trail.
 *
 * The starting node is *in* the trail (formato.md §7), so a document that
 * declares none opens on its first node with one step already taken, which is
 * what `visits(here) == 1` on the opening screen means.
 */
function openingTrail(document: NarrativeDocument): string[] {
  const opened = document.opens?.trail;

  if (opened && opened.length > 0) return [...opened];

  const first = document.nodes?.[0];

  return first ? [first.id] : [];
}

/** A reset of names, resolved against what the document opened on. */
export function resetOf(names: string[], document: NarrativeDocument): Move {
  const opening = openingValues(document);
  const move: Move = { kind: "reset" };
  const variables: Record<string, Scalar | Scalar[]> = {};
  const logs: Record<string, GroupItem[]> = {};

  for (const name of names) {
    // The trail first, and before the logs: a document may also declare a group
    // under the schema's name to state its discipline — `labyrinth` writes
    // `trail: { keeps: duplicates, removes: last }`, which is the trail's own
    // behaviour — and emptying that log would leave "Return to the start"
    // pressing nothing.
    if (name === TRAIL) {
      move.trail = openingTrail(document);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(opening.logs, name)) {
      logs[name] = opening.logs[name];
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(opening.variables, name)) {
      variables[name] = opening.variables[name];
      continue;
    }

    // A name that is neither: a log the author never declared but writes to,
    // which the format allows. Emptying it is the only reading available.
    logs[name] = [];
  }

  if (Object.keys(variables).length > 0) move.variables = variables;
  if (Object.keys(logs).length > 0) move.logs = logs;

  return move;
}

/* -------------------------------------------------------------------------- */
/* The contract's `Move` -> the reducer's `Move`                               */
/* -------------------------------------------------------------------------- */

/** One control's spelled-out gesture, as `parse.ts` built it, made runnable. */
export function fromContractMove(move: ContractMove, document: NarrativeDocument, scope?: Scope): Move[] {
  switch (move.kind) {
    case "enter":
      return [{ kind: "enter", node: move.node }];

    case "back":
      return [{ kind: "back" }];

    case "set":
      return [{ kind: "set", name: move.name, value: move.value }];

    // add, remove and mark arrive in the reducer's shape too: the translation
    // this function existed for was the symptom of two `Move` types, not a fix.
    case "add":
    case "remove":
      return [move];

    // "The caller resolves the address and hands over an index, an id or a
    // match" — `state.ts` says so where `EntryAddress` is consumed, and this is
    // the caller. `reader-path` writes `mark: { log: book, entry: here, field:
    // struck }`, where `here` is a **declared name** standing for an entry, not
    // an id; handed on unresolved it addressed nothing and "Withdraw the last
    // line" did nothing on every press.
    case "mark":
      return [addressedMark(move, scope)];

    case "reset":
      // There is one `Move` now, so a reset arrives in the shape the reducer
      // wants and needs no translation.
      return [move];

    default:
      return [];
  }
}

/**
 * A `mark:` whose entry is **named** rather than identified, resolved against
 * the reading.
 *
 * `state.ts` says where `EntryAddress` is consumed that "the caller resolves the
 * address and hands over an index, an id or a match", and this is the caller.
 * `reader-path` writes `mark: { log: book, entry: here, field: struck }`, where
 * `here` is `last(book where not struck)` — a declared name standing for an
 * entry, not an id. Handed on unresolved it addressed nothing, and "Withdraw the
 * last line" did nothing on every press.
 *
 * The one subtlety is the id itself. An entry of a growing log has none, so the
 * evaluator gives it the positional handle `<log>:<index>` ("entries an author
 * wrote without an id still need one to be removed by it") — and that handle is
 * not on the stored entry, so it has to be read back as the position it is.
 */
function addressedMark(move: Extract<Move, { kind: "mark" }>, scope: Scope | undefined): Move {
  const at = move.address?.at;

  if (!scope || typeof at !== "string") return move;

  const entries = scope.state.logs[move.log] ?? [];
  const found = addressOf(at, move.log, entries);

  if (found) return { ...move, address: found };

  const named = readPath(at, scope);

  if (isItem(named)) {
    const handle = typeof named.id === "string" ? addressOf(named.id, move.log, entries) : undefined;

    if (handle) return { ...move, address: handle };

    // No handle at all: the fields the entry was written with, and the last of
    // the entries carrying them, because a log keeps repeats.
    const { id: _id, ...fields } = named;

    return { ...move, address: { match: entryOf(fields as GroupItem), from: "last" } };
  }

  if (isScalar(named)) return { ...move, address: { at: typeof named === "number" ? named : String(named) } };

  return move;
}

/** An id an entry really carries, or the positional handle the evaluator hands
 *  out for one that carries none, read back as the position it names. */
function addressOf(id: string, log: string, entries: readonly GroupItem[]): { at: number | string } | undefined {
  if (entries.some((held) => held.id === id)) return { at: id };

  const prefix = `${log}:`;

  if (!id.startsWith(prefix)) return undefined;

  const position = Number(id.slice(prefix.length));

  return Number.isInteger(position) && position >= 0 && position < entries.length ? { at: position } : undefined;
}

function entryOf(item: GroupItem): Record<string, Scalar> {
  const entry: Record<string, Scalar> = {};

  for (const [field, value] of Object.entries(item)) {
    if (isScalar(value)) entry[field] = value;
  }

  return entry;
}

/* -------------------------------------------------------------------------- */
/* A declared move                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The keys a `moves:` declaration may carry. Every one of them is a key of the
 * schema — what is written, where, and which entry of it. The *values* are the
 * author's, always: `logs: { taken: { name: "{item.name}" } }` names a log and a
 * field the author chose, and this file never reads either as vocabulary.
 *
 * `writes:` is the authority list and is checked at the slot seam, not here: an
 * affordance the author wrote in prose has the author's own authority.
 */
const DECLARED_KEYS = [
  "writes",
  "sets",
  "logs",
  "resets",
  "removes",
  "mark",
  "show",
  "focus",
  "note",
  "to",
  "control",
  "max",
  "overflow",
];

/** Read one declared move into a gesture, with `item` already bound in scope. */
export function gestureFromDeclaration(
  name: string,
  declaration: Record<string, unknown>,
  scope: Scope,
  document: NarrativeDocument
): Gesture {
  const gesture = emptyGesture();
  const toggles = declaration.to === "toggle";
  let note: string | null = null;

  for (const [key, value] of Object.entries(declaration)) {
    if (!DECLARED_KEYS.includes(key)) {
      gesture.diagnostics.push(`the move \`${name}\` declares \`${key}\`, which the reader does not know`);
      continue;
    }

    switch (key) {
      case "sets":
        readSets(value, scope, gesture);
        break;

      case "logs":
        readLogs(value, scope, gesture, toggles, declaration);
        break;

      case "resets":
        gesture.moves.push(resetOf(namesOf(value), document));
        break;

      case "removes":
        for (const log of namesOf(value)) gesture.moves.push({ kind: "remove", log });
        break;

      case "mark":
        readMark(value, scope, gesture);
        break;

      case "show": {
        // Interpolated: `show: "anchor-mark-{away}"` is a return that names the
        // span it is going back to, and the span is a variable away.
        const target = plainText(String(value ?? ""), scope);
        if (target !== "") gesture.show.push(target);
        break;
      }

      case "focus":
        // `focus: true` means the region this move reveals; a name means that
        // region. Either way the library makes the move, never the slot.
        if (value === true || value === "true") gesture.focus = gesture.focus ?? null;
        else if (typeof value === "string" && value !== "") gesture.focus = plainText(value, scope);
        break;

      case "note":
        // Held, not resolved: see below. `show` is the opposite case and is
        // resolved here, before the writes.
        note = String(value ?? "");
        break;

      default:
        break;
    }
  }

  // `focus: true` is resolved last, because the region it names is whichever one
  // this same gesture revealed.
  if ((declaration.focus === true || declaration.focus === "true") && gesture.focus === null) {
    gesture.focus = gesture.show[0] ?? null;
  }

  /**
   * The announcement is resolved against the state the gesture **produces**,
   * and `show:` against the state it **leaves**. The corpus forces both halves
   * of that, in one move each:
   *
   * - `note: "{inside-label}"` is the phrase that also labels the button, and it
   *   dispatches on the variable the same gesture flips. Read before the write
   *   it announces "Reveal the redacted words" at the moment the words became
   *   visible — the state the reader just left.
   * - `show: "anchor-mark-{away}"` names the span to go back to, and the same
   *   gesture clears `away`. Read after the write there is nothing left to name.
   *
   * So the two are read at different moments on purpose, and the move is applied
   * here — to a copy, through the same reducer, never to the reading — only to
   * answer the first.
   */
  if (note !== null) {
    const after = gesture.moves.reduce(
      (carried, move) => reduce(carried, move, { groups: document.groups }),
      scope.state
    );

    gesture.announce = plainText(note, { ...scope, state: after });
  }

  return gesture;
}

function readSets(value: unknown, scope: Scope, gesture: Gesture): void {
  if (!isRecord(value)) return;

  for (const [variable, written] of Object.entries(value)) {
    // `toggle` is an operator, not a value: `sets: { inside: toggle }` is how
    // the corpus writes a switch, and reading it as the string "toggle" would
    // put that word into the variable.
    if (written === "toggle") {
      const current = currentValue(variable, scope);
      gesture.moves.push({ kind: "set", name: variable, value: !truthy(current) });
      continue;
    }

    if (Array.isArray(written)) {
      gesture.moves.push({
        kind: "set",
        name: variable,
        value: written.filter(isScalar) as Scalar[],
      });
      continue;
    }

    if (typeof written === "string") {
      gesture.moves.push({ kind: "set", name: variable, value: plainText(written, scope) });
      continue;
    }

    if (isScalar(written)) {
      gesture.moves.push({ kind: "set", name: variable, value: written });
    }
  }
}

function readLogs(
  value: unknown,
  scope: Scope,
  gesture: Gesture,
  toggles: boolean,
  declaration: Record<string, unknown>
): void {
  if (!isRecord(value)) return;

  for (const [log, written] of Object.entries(value)) {
    const entry: Record<string, Scalar> = {};

    if (isRecord(written)) {
      for (const [field, cell] of Object.entries(written)) {
        if (typeof cell === "string") entry[field] = plainText(cell, scope);
        else if (isScalar(cell)) entry[field] = cell;
      }
    }

    // `to: toggle` on a log is a checkbox: the same press that writes the entry
    // unwrites it. Which entry it unwrites is the one that matches field for
    // field, because an id is a handle the schema hands out and not a field.
    if (toggles && alreadyWritten(log, entry, scope)) {
      gesture.moves.push({ kind: "remove", log, address: { match: entry } });
      continue;
    }

    gesture.moves.push({ kind: "add", log, entry });

    // `max:` with `overflow: drop-oldest` is the declared form of the slice the
    // corpus writes by hand: two picks at most, and the third drops the first.
    const max = Number(declaration.max);

    if (Number.isFinite(max) && max > 0 && declaration.overflow === "drop-oldest") {
      const held = (scope.state.logs[log] ?? []).length;
      if (held + 1 > max) gesture.moves.push({ kind: "remove", log, address: { at: 0 } });
    }
  }
}

function readMark(value: unknown, scope: Scope, gesture: Gesture): void {
  if (!isRecord(value)) return;

  const log = typeof value.log === "string" ? value.log : null;
  const field = typeof value.field === "string" ? value.field : null;

  if (log === null || field === null) return;

  const at = value.at ?? value.entry;
  const address =
    typeof at === "number" || typeof at === "string"
      ? { at: typeof at === "string" ? plainText(at, scope) : at }
      : undefined;

  gesture.moves.push({ kind: "mark", log, field, address });
}

function alreadyWritten(log: string, entry: Record<string, Scalar>, scope: Scope): boolean {
  const written = scope.state.logs[log] ?? [];

  return written.some((held) =>
    Object.entries(entry).every(([field, value]) => (held as Record<string, unknown>)[field] === value)
  );
}

function currentValue(name: string, scope: Scope): Value {
  if (Object.prototype.hasOwnProperty.call(scope.state.variables, name)) {
    return scope.state.variables[name];
  }

  const declared: VariableDef | undefined = scope.variables[name];

  return declared ? declared.default : undefined;
}

function namesOf(value: unknown): string[] {
  if (typeof value === "string") return value.split(/[,\s]+/).filter(Boolean);
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* -------------------------------------------------------------------------- */
/* The three verbs                                                             */
/* -------------------------------------------------------------------------- */

export type GestureRequest = {
  action: "go" | "show" | "do";
  target: string;
  /** `:go{show=… focus=true}`: a reveal that carries the focus. */
  focus?: boolean;
  /** An argument to the move, so one move serves many spans. */
  item?: GroupItem;
  /** The span being left, so a return knows where to put the focus back. */
  from?: string;
  /** A gesture spelled out at the call site rather than declared. */
  spelled?: ContractMove[];
  /** Whether the region this names is already open, for a reveal that toggles. */
  shown?: boolean;
};

/**
 * One press, resolved. `scope` must already carry whatever the affordance
 * stands inside — the item of a loop, above all — because `{item.name}` in a
 * declared move is read here and nowhere else.
 */
export function gestureFor(
  request: GestureRequest,
  document: NarrativeDocument,
  scope: Scope
): Gesture {
  if (request.action === "go") {
    const gesture = emptyGesture();
    const target = plainText(request.target, scope);
    const isNode = (document.nodes ?? []).some((node) => node.id === target);

    // Two targets are not nodes. `to: back` shortens the trail, so `visits()` is
    // not monotonic, which the reducer already knows. `to: start` is the
    // schema's older sugar for `opens:` and means the reading's own opening, so
    // it puts the trail back rather than entering a node that does not exist —
    // which is what `labyrinth`'s "Return to the start" was doing, leaving a
    // step in the trail that named nothing and printed its own interpolation.
    // Both give way to a node of that name, because the author's names win.
    if (target === "back" && !isNode) gesture.moves.push({ kind: "back" });
    else if (target === START && !isNode) gesture.moves.push({ kind: "reset", trail: openingTrail(document) });
    else gesture.moves.push({ kind: "enter", node: target });

    gesture.from = request.from ?? null;
    return gesture;
  }

  if (request.action === "show") {
    const gesture = emptyGesture();
    const target = plainText(request.target, scope);

    if (target === "") {
      gesture.diagnostics.push("a reveal that names no region");
      return gesture;
    }

    // A second press on the same span closes what the first opened, and the
    // focus goes back to the span rather than into a region that is now gone.
    if (request.shown) {
      gesture.hide.push(target);
      gesture.focus = request.focus ? (request.from ?? null) : null;
    } else {
      gesture.show.push(target);
      gesture.focus = request.focus ? target : null;
    }

    gesture.from = request.from ?? null;
    return gesture;
  }

  const declared = document.moves?.[request.target];

  if (declared) {
    const gesture = gestureFromDeclaration(request.target, declared as Record<string, unknown>, scope, document);
    gesture.from = request.from ?? null;
    return gesture;
  }

  // A control that spelled its gesture out where it stands, which seven of the
  // eight controls in the corpus do.
  if (request.spelled && request.spelled.length > 0) {
    const gesture = emptyGesture();

    for (const move of request.spelled) {
      gesture.moves.push(...fromContractMove(move, document, scope));
    }

    gesture.from = request.from ?? null;
    return gesture;
  }

  const gesture = emptyGesture();
  gesture.diagnostics.push(
    request.target === ""
      ? "a gesture that names nothing to go to, show or move"
      : `no move is declared under the name \`${request.target}\``
  );
  return gesture;
}

/* -------------------------------------------------------------------------- */
/* Which regions a document can reveal                                         */
/* -------------------------------------------------------------------------- */

/**
 * Every region id that **starts closed**, gathered once per document.
 *
 * A region is revealed in place, so revealing implies it was shut — but a region
 * nothing can put back would take its prose out of the reading for good, and
 * decision 28 does not allow that. "Something can open it" turned out to be too
 * weak a test, because it counted every `show:` any move declares, and a move's
 * `show:` can only ever open. Two kinds of reveal close a region, and they are
 * the only two:
 *
 * - **`:go{show=}` in the prose**, which is a toggle: `gestureFor` hides what is
 *   already shown, so the reader can always put back what a press took away.
 * - **A move whose `show:` is written as a template** — `show:
 *   "anchor-body-{item.id}"` — which names one region *per item* of a loop. A
 *   region the author generated has nowhere to carry a state of its own, and the
 *   apparatus that reveals its entries one at a time is written exactly this
 *   way.
 *
 * A move whose `show:` names one region by its literal name is neither. It is a
 * **return**: it puts the focus back on prose that is already on the page, and
 * it can never shut it again. `recover-anchor` is what this is measured against.
 * Its `re-anchor` declares `show: anchor-main`, and `anchor-main` is the
 * document's main line — the sentence the whole piece hangs off. Counted as a
 * reveal, the document opened on one clause of live prose with nothing to press,
 * because the only control that invokes `re-anchor` is itself behind
 * `when: "moved > 0"` and there is no move at the opening.
 */
export function revealableRegions(document: NarrativeDocument): Set<string> {
  const reachable = new Set<string>();

  const fromInline = (content: Inline[]): void => {
    for (const item of content) {
      if (item.kind === "affordance" && item.action === "show") reachable.add(item.target);
      if ("children" in item) fromInline(item.children);
    }
  };

  const fromBlocks = (blocks: Block[]): void => {
    for (const block of blocks) {
      if (block.kind === "affordance" && block.action === "show") reachable.add(block.target);
      if (block.kind === "paragraph" || block.kind === "heading") fromInline(block.content);
      if ("body" in block) fromBlocks(block.body);
      if (block.kind === "each" && block.empty) fromBlocks(block.empty);
    }
  };

  fromBlocks(document.body ?? []);

  for (const node of document.nodes ?? []) fromBlocks(node.body);

  // A declared move may close a region no prose names — but only when it names a
  // family by template, because only a generated region has no other way to
  // carry the state. The family is known only at render, so the literal prefix
  // is what marks it; `matchesTemplate` below reads it back.
  for (const declared of Object.values(document.moves ?? {})) {
    const shown = (declared as Record<string, unknown>).show;
    if (typeof shown !== "string") continue;
    if (shown.indexOf("{") === -1) continue;
    reachable.add(shown);
  }

  return reachable;
}

/** Whether a region id is one of a family a declared move names by template. */
export function matchesTemplate(template: string, id: string): boolean {
  const brace = template.indexOf("{");

  if (brace === -1) return template === id;

  return id.startsWith(template.slice(0, brace));
}

/** The `current` of a loop, read as a value rather than a name. */
export function currentOf(expression: Expression | undefined, scope: Scope): string | null {
  if (!expression) return null;

  const value = evaluate(expression, scope);

  return value === undefined ? null : asText(value);
}
