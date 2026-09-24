import "./styles.css";

export { Reader } from "./Reader";
export type { ReaderContent, ReaderLabels, ReaderMode, ReaderProps, ReaderTheme, ReaderTransition } from "./types";

/* -------------------------------------------------------------------------- */
/* The document                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Decision 22 said the four flat modes and `hypertext` are one contract, and
 * that the paginator — the only substantial engineering in the library — was
 * unreachable from outside because `index.ts` exported a component and six
 * types. So the document, its parser, its evaluator, its renderer and its state
 * machine are all public now: a host can read a document, render it, move it and
 * inspect what came back without mounting anything.
 */
export { parse } from "./document/parse";
export { renderDocument, customProperties } from "./document/render";
export { useReading } from "./document/reading";
export { documentFromContent, documentFromSource, emptyDocument, wordsOf } from "./document/content";
export { createHolder } from "./document/hold";
export { DEGRADATION, EMPTY_REGISTRY, isPermutation, missingEntries } from "./document/registry";
export {
  emptyGesture,
  gestureFor,
  gestureFromDeclaration,
  openingValues,
  resetOf,
  revealableRegions,
} from "./document/moves";
export { plainText, markupText, markupAttribute, decodeText } from "./document/text";

/** The evaluator, in one import: pure functions over plain data. */
export {
  ACCESSORS,
  applyMove,
  asText,
  canEnter,
  canLeave,
  createScope,
  emptyState,
  escapeAttribute,
  escapeText,
  evaluate,
  evaluateWithDiagnostics,
  exactPlural,
  gate,
  initialState,
  interpolate,
  interpolateWithDiagnostics,
  itemScope,
  readPath,
  reduce,
  resolveGroup,
  resolveName,
  resolvePhrase,
  resolvePhraseWithDiagnostics,
  scopeFromDocument,
  truthy,
  withBindings,
  withSubject,
} from "./document/evaluator";

export type { Move, Scope, Value } from "./document/evaluator";

export type {
  Block,
  BlockAttrs,
  Diagnostic,
  Exit,
  Expression,
  GroupDef,
  GroupItem,
  Inline,
  NameDef,
  NarrativeDocument,
  NodeDef,
  Opens,
  ParseResult,
  PhraseDef,
  ReadingState,
  RegistryKind,
  Scalar,
  VariableDef,
  DerivationFn,
  OrderFn,
  PluralFn,
} from "./document/types";

export type {
  AffordanceProps,
  Degradation,
  DocumentRegistry,
  MarkComponent,
  SlotContext,
  SlotPass,
  SlotValue,
  ViewComponent,
} from "./document/registry";

export type { Gesture, GestureRequest } from "./document/moves";
export type { Holder } from "./document/hold";
export type { Reading } from "./document/reading";
export type { RenderOptions, RenderResult } from "./document/render";
export type { ReadingView } from "./modes/view";
