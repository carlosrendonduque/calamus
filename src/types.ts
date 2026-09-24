import type { CSSProperties, ReactNode } from "react";

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
  content: ReaderContent;
  mode?: ReaderMode;
  theme?: ReaderTheme;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  labels?: ReaderLabels;
  /** Forwarded to the root element, so assistive tech and hyphenation get the right language. */
  lang?: string;
  transition?: ReaderTransition;
};
