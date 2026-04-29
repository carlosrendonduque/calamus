import type { CSSProperties, ReactNode } from "react";

export type ReaderContent = {
  title: string;
  subtitle?: string;
  body: string[];
};

export type ReaderMode = "scroll" | "book" | "terminal" | "editorial" | "hypertext";

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

export type ReaderProps = {
  content: ReaderContent;
  mode?: ReaderMode;
  theme?: ReaderTheme;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  readingTimeLabel?: string;
};
