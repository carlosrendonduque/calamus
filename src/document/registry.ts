/**
 * The registry seam: five namespaces the host fills and the document names.
 *
 * `docs/contrato-ranuras.md` is the design; this is its type surface and its
 * degradation table. Two rules from that document govern everything here:
 *
 * 1. A slot receives **one frozen argument**, and inside it only what its island
 *    declared (§1.1, §1.2). It never receives the document, the graph, the
 *    paginator or navigation.
 * 2. A slot **represents** state; it does not own it (§5.1). The accessible
 *    name, every live region, focus order and the reduced-motion policy stay
 *    with the library, so a slot's only way to write is to invoke a move the
 *    author declared and listed in its own `writes:` (§2.1).
 *
 * `OrderFn`, `DerivationFn` and `PluralFn` come from `types.ts` unchanged.
 */

import type { ReactNode } from "react";
import type {
  DerivationFn,
  GroupItem,
  OrderFn,
  PluralFn,
  RegistryKind,
  Scalar,
} from "./types";

/* -------------------------------------------------------------------------- */
/* What a slot receives                                                        */
/* -------------------------------------------------------------------------- */

/**
 * `measure` is the pagination pass, in which the write and resource capabilities
 * are **absent rather than forbidden** (§7.2). Decision 32 removed the block
 * measuring pass altogether — CSS columns fragment the flow and nothing is
 * rendered twice — so this renderer only ever passes `live`. The field stays
 * because the compiler route of decision 25 may reintroduce a measuring pass and
 * a registry entry written against it must not have to change.
 */
export type SlotPass = "measure" | "live";

export type SlotValue = Scalar | readonly Scalar[];

/**
 * What `ctx.affordance()` hands back. The slot owns the geometry and must spread
 * these onto a real interactive element; the library owns the name, the state,
 * the guard and the announcement (§2.3).
 */
export type AffordanceProps = {
  type: "button";
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
  /** Diagnostic, and what a development check looks for (§5.4). */
  "data-calamus-move": string;
};

export type SlotContext = Readonly<{
  /** The authored name that resolved this entry. */
  name: string;
  /** Stable identity of *this* appearance in the document. */
  instance: string;
  pass: SlotPass;
  /** The revision of the reading state this render was made against. */
  revision: number;

  /** The island, as data. Rich values, because an island is YAML (decision 27). */
  params: Readonly<Record<string, unknown>>;
  /** Declared role -> the author's field. The entry never learns the author's
   *  vocabulary; it reads `items[i][ctx.bind.series]` (§1.2, decision 30). */
  bind: Readonly<Record<string, string>>;
  /** Only the variables `vars:` named. */
  vars: Readonly<Record<string, SlotValue>>;
  /** The projection of `of:`. */
  items: readonly Readonly<GroupItem>[];
  /** The region's prose, already rendered. Also its degradation reserve. */
  children: ReactNode;

  lang: string;
  motion: "full" | "reduce";
  /** Only with `needs: [box]`; null otherwise, and null while measuring. */
  box: Readonly<{ inline: number; block: number }> | null;

  /** Props for a native interactive element the slot places itself. */
  affordance: (move: string, payload?: Record<string, Scalar>) => AffordanceProps;
  /** Invoke a declared move. False when the move is not in `writes:`, when the
   *  pass is `measure`, or when the revision is stale (§2.2). */
  commit: (move: string, payload?: Record<string, Scalar>) => boolean;
  /** Only the name of one of the document's `phrases:`, never a string (§5.2). */
  announce: (phrase: string) => void;
  /** The library owns the resource's life; `acquire` runs inside a gesture
   *  only, and at most one value lives per `(instance, key)` (§7.4). */
  hold: <T>(key: string, acquire: () => T, release: (value: T) => void) => T | null;
}>;

/* -------------------------------------------------------------------------- */
/* The five namespaces                                                         */
/* -------------------------------------------------------------------------- */

/** A `views` entry: a React component of `ctx` and nothing else. */
export type ViewComponent = (ctx: SlotContext) => ReactNode;

/** A `marks` entry. The author's `note:` is prose and arrives resolved. */
export type MarkComponent = (props: {
  children: ReactNode;
  /** The accessible note the author wrote beside the mark, already resolved. */
  note?: string;
  /** The authored kind, so one entry can serve several kinds. */
  markKind: string;
  ctx: SlotContext;
}) => ReactNode;

export type DocumentRegistry = {
  views?: Record<string, ViewComponent>;
  marks?: Record<string, MarkComponent>;
  orders?: Record<string, OrderFn>;
  derivations?: Record<string, DerivationFn>;
  plurals?: Record<string, PluralFn>;
};

export const EMPTY_REGISTRY: DocumentRegistry = {};

/* -------------------------------------------------------------------------- */
/* Degradation (contrato-ranuras §4)                                           */
/* -------------------------------------------------------------------------- */

/**
 * How each class fails, written down once so the renderer and its tests agree.
 *
 * The asymmetry is the whole point and it is worth restating: a missing `view`
 * leaves residue — its region's prose is still there and the reader can see a
 * drawing is gone — and a missing `order` leaves none at all: the page looks
 * perfect and the work is a different work. An invisible degradation is worse
 * than a visible one.
 */
export type Degradation = {
  kind: RegistryKind;
  /** What happens at render when the name is not registered. */
  atRuntime: "prose" | "unmarked" | "document-order" | "literal-name" | "exact";
  /** What the compiler of decision 25 does by default, before `optional:`. */
  atCompile: "error" | "warning";
};

export const DEGRADATION: Record<RegistryKind, Degradation> = {
  views: { kind: "views", atRuntime: "prose", atCompile: "warning" },
  marks: { kind: "marks", atRuntime: "unmarked", atCompile: "warning" },
  orders: { kind: "orders", atRuntime: "document-order", atCompile: "error" },
  derivations: { kind: "derivations", atRuntime: "literal-name", atCompile: "error" },
  plurals: { kind: "plurals", atRuntime: "exact", atCompile: "warning" },
};

/**
 * Which of the names a document declares in `uses:` the registry cannot serve.
 *
 * This is the manifest of §9.6 turned inside out: a document says what it needs
 * and a host can be told, before anything renders, what it is missing and how
 * that will read. Nothing here throws and nothing here refuses to render.
 */
export function missingEntries(
  uses: { name: string; kind: RegistryKind }[],
  registry: DocumentRegistry
): { name: string; kind: RegistryKind; degradation: Degradation }[] {
  const missing: { name: string; kind: RegistryKind; degradation: Degradation }[] = [];

  for (const used of uses) {
    const namespace = registry[used.kind] as Record<string, unknown> | undefined;

    if (!namespace || namespace[used.name] === undefined) {
      missing.push({ name: used.name, kind: used.kind, degradation: DEGRADATION[used.kind] });
    }
  }

  return missing;
}

/**
 * A permutation check, which is the one invariant an `orders` entry owes
 * (§5.4). A result that loses or duplicates an id is refused and the caller
 * falls back to document order, because an ordering that drops an exit drops
 * prose.
 */
export function isPermutation(before: readonly string[], after: readonly string[]): boolean {
  if (!Array.isArray(after) || after.length !== before.length) {
    return false;
  }

  const counted = new Map<string, number>();

  for (const id of before) {
    counted.set(id, (counted.get(id) ?? 0) + 1);
  }

  for (const id of after) {
    const left = counted.get(id);

    if (left === undefined || left === 0) {
      return false;
    }

    counted.set(id, left - 1);
  }

  return true;
}
