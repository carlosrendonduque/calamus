import type { CSSProperties, ReactNode } from "react";
import type { Diagnostic, NarrativeDocument, ReadingState } from "./document/types";
import type { DocumentRegistry } from "./document/registry";

/**
 * Flat prose: a title, an optional subtitle and paragraphs.
 *
 * Decision 22 made this **the degenerate document** rather than a second
 * contract. It is converted to a `NarrativeDocument` with no nodes and no
 * directives, and from that point on every mode renders a document. Nothing in
 * the reader branches on which of the two a host supplied.
 */
export type ReaderContent = {
  title: string;
  subtitle?: string;
  body: string[];
};

export type ReaderMode = "scroll" | "book" | "terminal" | "editorial" | "hypertext";
export type ReaderTransition = "fade" | "slide" | "none";

export type ReaderTheme = Partial<{
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  border: string;
  panel: string;
  terminalBackground: string;
  terminalForeground: string;
  terminalMuted: string;
  terminalEmphasis: string;
  terminalEof: string;
  terminalBorder: string;
  serifFontFamily: string;
  monoFontFamily: string;
  /**
   * Height of the reading surface. Default: `min(78vh, 860px)` — a cap in
   * `scroll` and `terminal`, which hug shorter text, and the height of the frame
   * in `book` and `editorial`, which are fixed pages and do not shrink to their
   * own pagination. Set it to `"100%"` inside a host element with an explicit
   * height and the reader fills that box, so `book` and `editorial` paginate to
   * it. Against a host of automatic height `"100%"` resolves to `auto`, which
   * leaves the reader uncapped.
   */
  maxHeight: string;
}>;

/**
 * User-facing strings. Every reader label is overridable so the component can be
 * rendered in any language; the defaults are English. The accessible names are
 * labels too: assistive technology reads them out, so they are as translatable
 * as the visible text.
 */
export type ReaderLabels = Partial<{
  /** Page counter in `book` mode. Default: `Page 2 of 5`. */
  page: (current: number, total: number) => string;
  /** Sheet counter in `editorial` mode. Default: `Sheet 1 of 3`. */
  sheet: (current: number, total: number) => string;
  /** Unit appended to the estimated reading time. Default: `min read`. */
  readingTime: string;
  /** Accessible name of the reading region. Default: `Book reading mode`. */
  readingMode: (mode: ReaderMode) => string;
  /** Text equivalent of the progress bar in `scroll` and `terminal` modes. Default: `Reading progress: 40%`. */
  progress: (percent: number) => string;
  /** Accessible name of the page-turn control group in `book` mode. Default: `Book page navigation`. */
  pageNavigation: string;
  /** Accessible name of the sheet-turn control group in `editorial` mode. Default: `Editorial sheet navigation`. */
  sheetNavigation: string;
  /** Accessible name of the back button in `book` mode. Default: `Previous page`. */
  previousPage: string;
  /** Accessible name of the forward button in `book` mode. Default: `Next page`. */
  nextPage: string;
  /** Accessible name of the back button in `editorial` mode. Default: `Previous sheet`. */
  previousSheet: string;
  /** Accessible name of the forward button in `editorial` mode. Default: `Next sheet`. */
  nextSheet: string;
}>;

export type ReaderProps = {
  /** Flat prose. The degenerate document (decision 22). */
  content?: ReaderContent;
  /**
   * An authored document, already read by `parse`.
   *
   * Identity is what tells one document from another, so a host that rebuilds
   * this object on every render restarts the reading on every render. Memoise
   * it, or pass `source` and let the reader memoise the parse.
   */
  document?: NarrativeDocument;
  /** The authored source, read for you. Diagnostics come back through
   *  `onDiagnostics`; nothing throws and nothing is dropped (decision 28). */
  source?: string;
  /**
   * The five namespaces the host fills and the document names by name:
   * `views`, `marks`, `orders`, `derivations`, `plurals`. The map is an
   * argument and never a constant, which is the one lesson Storyplayer left.
   * A name the registry cannot serve degrades by its class, never by throwing;
   * `docs/contrato-ranuras.md` §4 is the table.
   */
  registry?: DocumentRegistry;
  /** Where the reading starts, when it is not where the document says. */
  opens?: ReadingState;
  /** Everything the reading could not read, as data. Called after a render that
   *  produced any; the library never writes to the console of a host's page. */
  onDiagnostics?: (diagnostics: Diagnostic[]) => void;
  mode?: ReaderMode;
  theme?: ReaderTheme;
  className?: string;
  style?: CSSProperties;
  /** A host's own nodes, rendered after the document in `hypertext`. */
  children?: ReactNode;
  labels?: ReaderLabels;
  /** Forwarded to the root element, so assistive tech and hyphenation get the right language. */
  lang?: string;
  transition?: ReaderTransition;
};
