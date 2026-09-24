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
}>;

/**
 * User-facing strings. Every reader label is overridable so the component can be
 * rendered in any language; the defaults are English.
 */
export type ReaderLabels = Partial<{
  /** Page counter in `book` mode. Default: `Page 2 of 5`. */
  page: (current: number, total: number) => string;
  /** Sheet counter in `editorial` mode. Default: `Sheet 1 of 3`. */
  sheet: (current: number, total: number) => string;
  /** Unit appended to the estimated reading time. Default: `min read`. */
  readingTime: string;
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
