import type { CSSProperties } from "react";
import type { ReaderContent, ReaderLabels, ReaderMode, ReaderTheme, ReaderTransition } from "../src";
import { tristramShandy } from "../examples/corpus/sterne-tristram-shandy";
import { unCoupDeDes } from "../examples/corpus/mallarme-un-coup-de-des";
import { ilPleut } from "../examples/corpus/apollinaire-il-pleut";

export type ContentPresetId = "tristram" | "coupDeDes" | "ilPleut" | "custom";
export type ThemePresetId = "default" | "light" | "dark" | "sepia";
export type LabelLocaleId = "english" | "spanish";

/** The six colour tokens the explorer exposes as live inputs. `ReaderTheme` has nine more. */
export type ThemeColorKey = "background" | "foreground" | "muted" | "accent" | "border" | "panel";
export type ThemeColors = Record<ThemeColorKey, string>;

/**
 * One state object, shaped after `ReaderProps`: `mode`, `transition`, `lang`,
 * `theme`, `labels`, `className` and `style` all have a field here, plus the
 * content selection and the height of the host box the reader is dropped into.
 */
export type ExplorerState = {
  contentPreset: ContentPresetId;
  customTitle: string;
  customSubtitle: string;
  customBody: string;
  mode: ReaderMode;
  transition: ReaderTransition;
  lang: string;
  themePreset: ThemePresetId;
  theme: ThemeColors;
  labelLocale: LabelLocaleId;
  readingTime: string;
  sampleClass: boolean;
  wideColumnGap: boolean;
  stageHeight: number;
};

/** Controls update the object functionally, so two changes in one tick cannot clobber each other. */
export type StateUpdater = (update: (previous: ExplorerState) => ExplorerState) => void;

export const REPO_URL = "https://github.com/carlosrendonduque/calamus";

/** Applied by the `className` toggle; defined in explorer.css. */
export const SAMPLE_CLASS_NAME = "framed-reader";

/** Set by the `style` toggle. `--calamus-column-gap` has no `ReaderTheme` key. */
export const WIDE_COLUMN_GAP = "3.6rem";

export const DEFAULT_READING_TIME = "min read";

export const MODES: readonly ReaderMode[] = ["scroll", "book", "terminal", "editorial", "hypertext"];

export const MODE_LABELS: Record<ReaderMode, string> = {
  scroll: "Scroll",
  book: "Book",
  terminal: "Terminal",
  editorial: "Editorial",
  hypertext: "Hypertext"
};

type ContentPreset = {
  label: string;
  lang: string;
  content: ReaderContent;
};

export const CONTENT_PRESETS: Record<Exclude<ContentPresetId, "custom">, ContentPreset> = {
  tristram: {
    label: "Sterne, Tristram Shandy (English prose)",
    lang: "en",
    content: tristramShandy
  },
  coupDeDes: {
    label: "Mallarme, Un coup de des (French fragments)",
    lang: "fr",
    content: unCoupDeDes
  },
  ilPleut: {
    label: "Apollinaire, Il pleut (French calligram)",
    lang: "fr",
    content: ilPleut
  }
};

/** The values in src/styles.css, so the explorer can tell an override from a default. */
export const LIBRARY_COLORS: ThemeColors = {
  background: "#f4f2ec",
  foreground: "#26241f",
  muted: "#696353",
  accent: "#6f7559",
  border: "#c8c1af",
  panel: "#ede9df"
};

export const THEME_PRESETS: Record<ThemePresetId, ThemeColors> = {
  default: LIBRARY_COLORS,
  light: {
    background: "#ffffff",
    foreground: "#1a1a1a",
    muted: "#5c6370",
    accent: "#2f6f6a",
    border: "#dcdfe4",
    panel: "#f5f6f8"
  },
  dark: {
    background: "#14161a",
    foreground: "#e7e5e0",
    muted: "#9aa0a6",
    accent: "#8fb8a8",
    border: "#2c3138",
    panel: "#1b1f24"
  },
  sepia: {
    background: "#f3e9d6",
    foreground: "#3a2f22",
    muted: "#7a6a53",
    accent: "#9a6b3f",
    border: "#d9c9ad",
    panel: "#ece0c9"
  }
};

export const THEME_COLOR_KEYS: readonly ThemeColorKey[] = [
  "background",
  "foreground",
  "muted",
  "accent",
  "border",
  "panel"
];

export const SPANISH_READING_TIME = "min de lectura";

/**
 * A `#/gallery/<id>` link is a link to an example, and examples only exist in
 * hypertext mode. Without this, such a link would open the explorer in `book`
 * and the visitor would have to know to switch modes before the link they
 * followed meant anything.
 */
function openingMode(): ExplorerState["mode"] {
  if (typeof window === "undefined") {
    return "book";
  }

  return window.location.hash.startsWith("#/gallery/") ? "hypertext" : "book";
}

export const INITIAL_STATE: ExplorerState = {
  contentPreset: "tristram",
  customTitle: "A note on measurement",
  customSubtitle: "notes.txt",
  customBody: [
    "Paste prose here. A blank line starts a new paragraph, and each paragraph becomes one entry of content.body.",
    "A paragraph is kept whole while it fits a column, and split across pages when it does not, so the shape of your text decides where the breaks fall."
  ].join("\n\n"),
  mode: openingMode(),
  transition: "fade",
  lang: "en",
  themePreset: "default",
  theme: LIBRARY_COLORS,
  labelLocale: "english",
  readingTime: DEFAULT_READING_TIME,
  sampleClass: false,
  wideColumnGap: false,
  stageHeight: 640
};

function parseParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function toContent(state: ExplorerState): ReaderContent {
  if (state.contentPreset !== "custom") {
    return CONTENT_PRESETS[state.contentPreset].content;
  }

  const body = parseParagraphs(state.customBody);
  const subtitle = state.customSubtitle.trim();

  return {
    title: state.customTitle.trim() || "Untitled",
    ...(subtitle ? { subtitle } : {}),
    body: body.length > 0 ? body : ["(no paragraphs yet)"]
  };
}

/** Only the colours the visitor actually moved away from the library defaults. */
export function toThemeOverrides(state: ExplorerState): Partial<ThemeColors> {
  const overrides: Partial<ThemeColors> = {};

  for (const key of THEME_COLOR_KEYS) {
    if (state.theme[key].toLowerCase() !== LIBRARY_COLORS[key].toLowerCase()) {
      overrides[key] = state.theme[key];
    }
  }

  return overrides;
}

/**
 * The stage is a box with an explicit height, so the reader is told to fill it
 * instead of falling back to its own `min(78vh, 860px)` cap.
 */
export function toTheme(state: ExplorerState): ReaderTheme {
  return { ...toThemeOverrides(state), maxHeight: "100%" };
}

export function toLabels(state: ExplorerState): ReaderLabels | undefined {
  const readingTime = state.readingTime.trim();
  const isSpanish = state.labelLocale === "spanish";

  if (!isSpanish && (readingTime === DEFAULT_READING_TIME || readingTime === "")) {
    return undefined;
  }

  return {
    ...(isSpanish
      ? {
          page: (current: number, total: number) => `Página ${current} de ${total}`,
          sheet: (current: number, total: number) => `Hoja ${current} de ${total}`
        }
      : {}),
    ...(readingTime ? { readingTime } : {})
  };
}

export function toStyle(state: ExplorerState): CSSProperties | undefined {
  if (!state.wideColumnGap) {
    return undefined;
  }

  return { "--calamus-column-gap": WIDE_COLUMN_GAP } as CSSProperties;
}
