import type { ReaderMode, ReaderTransition } from "../src";
import {
  CONTENT_PRESETS,
  DEFAULT_READING_TIME,
  MODES,
  MODE_LABELS,
  SPANISH_READING_TIME,
  THEME_COLOR_KEYS,
  THEME_PRESETS,
  type ContentPresetId,
  type ExplorerState,
  type ThemePresetId
} from "./state";

export type ControlGroup = "Content" | "Reading" | "Theme" | "Labels" | "Root element";

export type ControlOption = {
  value: string;
  label: string;
};

type ControlBase = {
  /** Also the `id` of the input, so its `<label>` can point at it. */
  id: string;
  label: string;
  group: ControlGroup;
  hint?: string;
  visible?: (state: ExplorerState) => boolean;
};

export type Control =
  | (ControlBase & {
      kind: "buttons";
      options: readonly ControlOption[];
      get: (state: ExplorerState) => string;
      set: (state: ExplorerState, value: string) => ExplorerState;
    })
  | (ControlBase & {
      kind: "select";
      options: readonly ControlOption[];
      get: (state: ExplorerState) => string;
      set: (state: ExplorerState, value: string) => ExplorerState;
    })
  | (ControlBase & {
      kind: "text";
      placeholder?: string;
      rows?: number;
      get: (state: ExplorerState) => string;
      set: (state: ExplorerState, value: string) => ExplorerState;
    })
  | (ControlBase & {
      kind: "range";
      min: number;
      max: number;
      step: number;
      format: (value: number) => string;
      get: (state: ExplorerState) => number;
      set: (state: ExplorerState, value: number) => ExplorerState;
    })
  | (ControlBase & {
      kind: "toggle";
      get: (state: ExplorerState) => boolean;
      set: (state: ExplorerState, value: boolean) => ExplorerState;
    })
  | (ControlBase & {
      kind: "color";
      get: (state: ExplorerState) => string;
      set: (state: ExplorerState, value: string) => ExplorerState;
    })
  | (ControlBase & {
      kind: "action";
      action: string;
      pressed: (state: ExplorerState) => boolean;
      apply: (state: ExplorerState, pressed: boolean) => ExplorerState;
    });

const CONTENT_OPTIONS: readonly ControlOption[] = [
  ...(Object.keys(CONTENT_PRESETS) as Exclude<ContentPresetId, "custom">[]).map((id) => ({
    value: id,
    label: CONTENT_PRESETS[id].label
  })),
  { value: "custom", label: "Your own text" }
];

const THEME_PRESET_OPTIONS: readonly ControlOption[] = (
  Object.keys(THEME_PRESETS) as ThemePresetId[]
).map((id) => ({ value: id, label: id }));

const TRANSITION_OPTIONS: readonly ControlOption[] = (
  ["fade", "slide", "none"] as ReaderTransition[]
).map((value) => ({ value, label: value }));

const isCustomContent = (state: ExplorerState) => state.contentPreset === "custom";

const colorControls: Control[] = THEME_COLOR_KEYS.map((key) => ({
  kind: "color",
  id: `theme-${key}`,
  label: `theme.${key}`,
  group: "Theme",
  get: (state) => state.theme[key],
  set: (state, value) => ({ ...state, theme: { ...state.theme, [key]: value } })
}));

/**
 * Every control the explorer offers, as data. Adding a prop to the panel means
 * adding one entry here; `renderControl` in Controls.tsx does the rest.
 */
export const CONTROLS: readonly Control[] = [
  {
    kind: "select",
    id: "content-preset",
    label: "content",
    group: "Content",
    hint: "Three public-domain texts, or your own prose.",
    options: CONTENT_OPTIONS,
    get: (state) => state.contentPreset as string,
    set: (state, value) => {
      const contentPreset = value as ContentPresetId;
      const lang = contentPreset === "custom" ? state.lang : CONTENT_PRESETS[contentPreset].lang;
      return { ...state, contentPreset, lang };
    }
  },
  {
    kind: "text",
    id: "custom-title",
    label: "content.title",
    group: "Content",
    visible: isCustomContent,
    get: (state) => state.customTitle,
    set: (state, value) => ({ ...state, customTitle: value })
  },
  {
    kind: "text",
    id: "custom-subtitle",
    label: "content.subtitle",
    group: "Content",
    hint: "Optional, and used differently by each mode.",
    visible: isCustomContent,
    get: (state) => state.customSubtitle,
    set: (state, value) => ({ ...state, customSubtitle: value })
  },
  {
    kind: "text",
    id: "custom-body",
    label: "content.body",
    group: "Content",
    rows: 7,
    hint: "Split on blank lines: one paragraph per entry.",
    visible: isCustomContent,
    get: (state) => state.customBody,
    set: (state, value) => ({ ...state, customBody: value })
  },
  {
    kind: "buttons",
    id: "mode",
    label: "mode",
    group: "Reading",
    options: MODES.map((mode) => ({ value: mode, label: MODE_LABELS[mode] })),
    get: (state) => state.mode,
    set: (state, value) => ({ ...state, mode: value as ReaderMode })
  },
  {
    kind: "select",
    id: "transition",
    label: "transition",
    group: "Reading",
    hint: "Page and sheet changes only: book and editorial.",
    options: TRANSITION_OPTIONS,
    get: (state) => state.transition,
    set: (state, value) => ({ ...state, transition: value as ReaderTransition })
  },
  {
    kind: "text",
    id: "lang",
    label: "lang",
    group: "Reading",
    placeholder: "en",
    hint: "Forwarded to the root element for assistive tech and hyphenation.",
    get: (state) => state.lang,
    set: (state, value) => ({ ...state, lang: value })
  },
  {
    kind: "select",
    id: "theme-preset",
    label: "theme preset",
    group: "Theme",
    hint: "Fills the six inputs below. Nine more tokens exist: six for terminal mode, two font families, and maxHeight.",
    options: THEME_PRESET_OPTIONS,
    get: (state) => state.themePreset,
    set: (state, value) => {
      const themePreset = value as ThemePresetId;
      return { ...state, themePreset, theme: THEME_PRESETS[themePreset] };
    }
  },
  ...colorControls,
  {
    kind: "action",
    id: "label-locale",
    label: "labels",
    group: "Labels",
    action: "Spanish labels",
    hint: "Fills labels.page, labels.sheet and labels.readingTime. Press again for the English defaults.",
    pressed: (state) => state.labelLocale === "spanish",
    apply: (state, pressed) =>
      pressed
        ? { ...state, labelLocale: "spanish", readingTime: SPANISH_READING_TIME }
        : { ...state, labelLocale: "english", readingTime: DEFAULT_READING_TIME }
  },
  {
    kind: "text",
    id: "reading-time",
    label: "labels.readingTime",
    group: "Labels",
    placeholder: DEFAULT_READING_TIME,
    hint: "Shown in scroll and editorial.",
    get: (state) => state.readingTime,
    set: (state, value) => ({ ...state, readingTime: value })
  },
  {
    kind: "toggle",
    id: "sample-class",
    label: "className",
    group: "Root element",
    hint: "Adds a sample class next to calamus-root.",
    get: (state) => state.sampleClass,
    set: (state, value) => ({ ...state, sampleClass: value })
  },
  {
    kind: "toggle",
    id: "wide-column-gap",
    label: "style",
    group: "Root element",
    hint: "Widens --calamus-column-gap, which has no theme key of its own.",
    get: (state) => state.wideColumnGap,
    set: (state, value) => ({ ...state, wideColumnGap: value })
  }
];

export const CONTROL_GROUPS: readonly ControlGroup[] = [
  "Content",
  "Reading",
  "Theme",
  "Labels",
  "Root element"
];

/** Rendered beside the preview rather than in the panel, but built the same way. */
export const STAGE_HEIGHT_CONTROL: Control = {
  kind: "range",
  id: "stage-height",
  label: "Stage height",
  group: "Reading",
  min: 320,
  max: 900,
  step: 10,
  format: (value) => `${value} px`,
  get: (state) => state.stageHeight,
  set: (state, value) => ({ ...state, stageHeight: value })
};
