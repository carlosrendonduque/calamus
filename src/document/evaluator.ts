/**
 * The evaluator, in one import.
 *
 * Pure functions over plain data: no DOM, no React, no dependency. The renderer
 * calls these; they do not know it exists.
 */

export type {
  AnyExpression,
  DerivedGroupDef,
  ExtraExpression,
  GroupedGroupDef,
  GroupSource,
  ListDef,
  OpensLike,
  PhraseCaseLike,
  PhraseLike,
} from "./shapes";
export { derivationOf, isDerivedGroup, isGroupedGroup, isListedGroup, listOf } from "./shapes";

export type { Accessors, Registry, Reported, Scope, Value } from "./scope";
export {
  ACCESSORS,
  asText,
  createScope,
  emptyState,
  escapeAttribute,
  escapeText,
  isItem,
  isItemList,
  isScalar,
  scopeFromDocument,
  truthy,
  withBindings,
  withSubject,
} from "./scope";

export {
  canEnter,
  canLeave,
  evaluate,
  evaluateWithDiagnostics,
  gate,
  isPath,
  itemScope,
  readPath,
  readPathWithDiagnostics,
  resolveGroup,
  resolveName,
  resolveNameWithDiagnostics,
} from "./evaluate";

export {
  exactPlural,
  interpolate,
  interpolateWithDiagnostics,
  resolvePhrase,
  resolvePhraseWithDiagnostics,
} from "./phrase";

export type { EntryAddress, Move, MoveContext } from "./state";
export { applyMove, disciplineOf, initialState, reduce } from "./state";
