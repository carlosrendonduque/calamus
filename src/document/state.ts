/**
 * The reading state machine.
 *
 * Entering a node appends to the trail, repeats and all, because `visits()`
 * counts them (decision 26). A log is a group that grows, and it obeys the
 * discipline its author declared: `keeps`, `removes` and `marks`. `keeps:
 * unique` is what keeps decision 26 honest — without it, counting distinct
 * sheets needs a subtraction.
 *
 * Nothing here throws and nothing here mutates. A move the discipline refuses
 * comes back as the same state and a diagnostic.
 */

import type { Diagnostic, GroupDef, GroupDiscipline, GroupItem, ReadingState, Scalar } from "./types";
import type { OpensLike } from "./shapes";
import type { Reported } from "./scope";
import { emptyState, note } from "./scope";

/** Which entry of a log a move addresses. Nothing here evaluates expressions:
 *  the caller resolves the address and hands over an index, an id or a match. */
export type EntryAddress = {
  at?: number | string;
  match?: Record<string, Scalar>;
  from?: "first" | "last";
};

export type Move =
  /** A node replaces, and the trail records it again every time. */
  | { kind: "enter"; node: string }
  /** `to: back`. The trail shortens, so `visits()` is not monotonic. */
  | { kind: "back"; steps?: number }
  | { kind: "set"; name: string; value: Scalar | Scalar[] }
  | { kind: "add"; log: string; entry: Record<string, Scalar> }
  | { kind: "remove"; log: string; address?: EntryAddress }
  /** Writing a field of an entry already written, which only `marks:` allows. */
  | { kind: "mark"; log: string; field: string; value?: Scalar; address?: EntryAddress }
  /** A reset needs a destination: not `opens:`, not zero, but what was asked. */
  | {
      kind: "reset";
      logs?: Record<string, GroupItem[] | number>;
      variables?: Record<string, Scalar | Scalar[]>;
      trail?: string[];
      readings?: number;
    }
  | { kind: "read" }
  /** One gesture, several effects (`moves:` in the corpus). */
  | { kind: "gesture"; moves: Move[] };

export type MoveContext = {
  /** Only the discipline is read, so a partial document is enough. */
  groups?: Record<string, Pick<GroupDef, "discipline"> | GroupDef>;
};

const KEEPS_EVERYTHING: GroupDiscipline = { keeps: "duplicates", removes: "none", marks: [] };

export function disciplineOf(log: string, context: MoveContext | undefined): GroupDiscipline {
  const declared = context?.groups?.[log]?.discipline;
  if (!declared) return KEEPS_EVERYTHING;
  return {
    keeps: declared.keeps ?? KEEPS_EVERYTHING.keeps,
    removes: declared.removes ?? KEEPS_EVERYTHING.removes,
    marks: declared.marks ?? [],
  };
}

/* -------------------------------------------------------------------------- */
/* The machine                                                                 */
/* -------------------------------------------------------------------------- */

export function reduce(state: ReadingState, move: Move, context?: MoveContext): ReadingState {
  return applyMove(state, move, context).value;
}

export function applyMove(
  state: ReadingState,
  move: Move,
  context?: MoveContext
): Reported<ReadingState> {
  const diagnostics: Diagnostic[] = [];
  return { value: step(state, move, context, diagnostics), diagnostics };
}

function step(
  state: ReadingState,
  move: Move,
  context: MoveContext | undefined,
  sink: Diagnostic[]
): ReadingState {
  if (!move || typeof move !== "object") {
    note(sink, "error", "not a move");
    return state;
  }
  switch (move.kind) {
    case "enter":
      return { ...state, trail: [...state.trail, move.node] };

    case "back": {
      const steps = Math.max(1, move.steps ?? 1);
      const kept = Math.max(1, state.trail.length - steps);
      if (state.trail.length <= 1) {
        note(sink, "warning", "the trail is one node long: a reader is always somewhere");
        return state;
      }
      return { ...state, trail: state.trail.slice(0, kept) };
    }

    case "set":
      return { ...state, variables: { ...state.variables, [move.name]: move.value } };

    case "add": {
      const discipline = disciplineOf(move.log, context);
      const entries = state.logs[move.log] ?? [];
      const entry = { ...move.entry } as GroupItem;
      if (discipline.keeps === "unique" && entries.some((written) => sameEntry(written, entry))) {
        return state;
      }
      return withLog(state, move.log, [...entries, entry]);
    }

    case "remove": {
      const discipline = disciplineOf(move.log, context);
      const entries = state.logs[move.log] ?? [];
      if (discipline.removes === "none") {
        note(sink, "warning", `${move.log} removes nothing: the entry stays`);
        return state;
      }
      if (entries.length === 0) return state;
      if (discipline.removes === "last") {
        if (move.address && !addresses(entries[entries.length - 1], move.address, entries.length - 1)) {
          note(sink, "warning", `${move.log} removes only its last entry`);
          return state;
        }
        return withLog(state, move.log, entries.slice(0, -1));
      }
      const index = locate(entries, move.address);
      if (index < 0) {
        note(sink, "warning", `no entry of ${move.log} was addressed`);
        return state;
      }
      return withLog(state, move.log, [...entries.slice(0, index), ...entries.slice(index + 1)]);
    }

    case "mark": {
      const discipline = disciplineOf(move.log, context);
      const entries = state.logs[move.log] ?? [];
      if (!discipline.marks.includes(move.field)) {
        note(sink, "warning", `${move.log} does not declare ${move.field} as markable`);
        return state;
      }
      const index = locate(entries, move.address);
      if (index < 0) {
        note(sink, "warning", `no entry of ${move.log} was addressed`);
        return state;
      }
      const written = { ...entries[index], [move.field]: move.value ?? true } as GroupItem;
      return withLog(state, move.log, [
        ...entries.slice(0, index),
        written,
        ...entries.slice(index + 1),
      ]);
    }

    case "reset": {
      let next = state;
      if (move.logs) {
        const logs = { ...next.logs };
        for (const [name, target] of Object.entries(move.logs)) {
          logs[name] = typeof target === "number" ? anonymous(name, target) : [...target];
        }
        next = { ...next, logs };
      }
      if (move.variables) next = { ...next, variables: { ...next.variables, ...move.variables } };
      if (move.trail) next = { ...next, trail: [...move.trail] };
      if (move.readings !== undefined) next = { ...next, readings: move.readings };
      return next;
    }

    case "read":
      return { ...state, readings: state.readings + 1 };

    case "gesture":
      return move.moves.reduce((carried, one) => step(carried, one, context, sink), state);

    default:
      note(sink, "error", `unknown move: ${(move as { kind: string }).kind}`);
      return state;
  }
}

function withLog(state: ReadingState, log: string, entries: GroupItem[]): ReadingState {
  return { ...state, logs: { ...state.logs, [log]: entries } };
}

/**
 * Two entries are the same entry when every field the author wrote is the same.
 * Identity is not one of those fields: an id is a handle the schema hands out,
 * and a sheet opened twice is one sheet however it was written down.
 */
function sameEntry(written: GroupItem, entry: GroupItem): boolean {
  if (typeof written.id === "string" && written.id === entry.id) return true;
  const fields = new Set([...Object.keys(written), ...Object.keys(entry)]);
  fields.delete("id");
  for (const field of fields) {
    if ((written as Record<string, unknown>)[field] !== (entry as Record<string, unknown>)[field]) {
      return false;
    }
  }
  return true;
}

function locate(entries: GroupItem[], address: EntryAddress | undefined): number {
  if (entries.length === 0) return -1;
  if (!address) return entries.length - 1;
  if (typeof address.at === "number") {
    return address.at >= 0 && address.at < entries.length ? address.at : -1;
  }
  const hits: number[] = [];
  entries.forEach((entry, index) => {
    if (addresses(entry, address, index)) hits.push(index);
  });
  if (hits.length === 0) return -1;
  return address.from === "first" ? hits[0] : hits[hits.length - 1];
}

function addresses(entry: GroupItem, address: EntryAddress, index: number): boolean {
  if (typeof address.at === "number") return address.at === index;
  if (typeof address.at === "string" && entry.id !== address.at) return false;
  if (address.match) {
    for (const [field, value] of Object.entries(address.match)) {
      if ((entry as Record<string, unknown>)[field] !== value) return false;
    }
  }
  return address.at !== undefined || address.match !== undefined;
}

/* -------------------------------------------------------------------------- */
/* Where a reading starts                                                      */
/* -------------------------------------------------------------------------- */

/** The starting node is *in* the trail, so `visits(start)` is 1 before the
 *  reader has touched anything. Two of the nineteen open mid-reading. */
export function initialState(opens: OpensLike = {}): ReadingState {
  const state = emptyState();
  const logs: Record<string, GroupItem[]> = {};
  for (const [name, target] of Object.entries(opens.logs ?? {})) {
    logs[name] = typeof target === "number" ? anonymous(name, target) : [...target];
  }
  return {
    ...state,
    trail: opens.trail ? [...opens.trail] : [],
    readings: opens.readings ?? 1,
    logs,
    variables: { ...(opens.variables ?? {}) },
  };
}

/** `opens: { readings: 2 }` on a log means two entries with nothing in them,
 *  which is a literal length and not an operation. */
function anonymous(name: string, length: number): GroupItem[] {
  const entries: GroupItem[] = [];
  for (let index = 0; index < Math.max(0, Math.floor(length)); index += 1) {
    entries.push({ id: `${name}:${index}` } as GroupItem);
  }
  return entries;
}
