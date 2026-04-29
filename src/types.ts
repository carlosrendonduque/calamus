export type ReaderContent = {
  title: string;
  subtitle?: string;
  body: string[];
};

export type ReaderMode = "scroll" | "book" | "terminal";

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
