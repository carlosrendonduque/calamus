import {
  DEFAULT_READING_TIME,
  SAMPLE_CLASS_NAME,
  WIDE_COLUMN_GAP,
  toContent,
  toThemeOverrides,
  type ExplorerState
} from "./state";

const MAX_BODY_ENTRIES = 3;
const MAX_BODY_CHARS = 74;

function quote(value: string): string {
  return JSON.stringify(value);
}

function truncate(paragraph: string): string {
  if (paragraph.length <= MAX_BODY_CHARS) {
    return quote(paragraph);
  }

  return quote(`${paragraph.slice(0, MAX_BODY_CHARS).trimEnd()}...`);
}

function contentBlock(state: ExplorerState): string {
  const content = toContent(state);
  const shown = content.body.slice(0, MAX_BODY_ENTRIES);
  const remaining = content.body.length - shown.length;

  const lines = [
    "const content: ReaderContent = {",
    `  title: ${quote(content.title)},`,
    ...(content.subtitle ? [`  subtitle: ${quote(content.subtitle)},`] : []),
    "  body: [",
    ...shown.map((paragraph, index) => {
      const comma = index === shown.length - 1 && remaining === 0 ? "" : ",";
      return `    ${truncate(paragraph)}${comma}`;
    }),
    ...(remaining > 0 ? [`    // ${remaining} more paragraph${remaining === 1 ? "" : "s"}`] : []),
    "  ]",
    "};"
  ];

  return lines.join("\n");
}

function objectProp(name: string, entries: string[]): string[] {
  if (entries.length === 0) {
    return [];
  }

  if (entries.length === 1) {
    return [`${name}={{ ${entries[0]} }}`];
  }

  return [
    `${name}={{`,
    ...entries.map((entry, index) => `  ${entry}${index === entries.length - 1 ? "" : ","}`),
    "}}"
  ];
}

function themeProp(state: ExplorerState): string[] {
  const overrides = toThemeOverrides(state);

  return objectProp("theme", [
    ...Object.entries(overrides).map(([key, value]) => `${key}: ${quote(value)}`),
    // The stage is a box with a height; this makes the reader fill it.
    `maxHeight: ${quote("100%")}`
  ]);
}

function labelsProp(state: ExplorerState): string[] {
  const readingTime = state.readingTime.trim();
  const isSpanish = state.labelLocale === "spanish";
  const entries: string[] = [];

  if (isSpanish) {
    entries.push("page: (current, total) => `Página ${current} de ${total}`");
    entries.push("sheet: (current, total) => `Hoja ${current} de ${total}`");
  }

  if (readingTime && readingTime !== DEFAULT_READING_TIME) {
    entries.push(`readingTime: ${quote(readingTime)}`);
  }

  return objectProp("labels", entries);
}

function readerProps(state: ExplorerState): string[] {
  const props: string[] = ["content={content}"];

  if (state.mode !== "scroll") {
    props.push(`mode=${quote(state.mode)}`);
  }

  if (state.lang.trim()) {
    props.push(`lang=${quote(state.lang.trim())}`);
  }

  if (state.transition !== "fade") {
    props.push(`transition=${quote(state.transition)}`);
  }

  props.push(...themeProp(state));

  props.push(...labelsProp(state));

  if (state.sampleClass) {
    props.push(`className=${quote(SAMPLE_CLASS_NAME)}`);
  }

  if (state.wideColumnGap) {
    props.push(`style={{ "--calamus-column-gap": ${quote(WIDE_COLUMN_GAP)} } as CSSProperties}`);
  }

  return props;
}

function indent(lines: string[], depth: number): string[] {
  const pad = " ".repeat(depth);
  return lines.map((line) => (line ? `${pad}${line}` : line));
}

/** The JSX for the current state, defaults left out so the snippet stays short and honest. */
export function buildSnippet(state: ExplorerState): string {
  const props = readerProps(state);
  const isHypertext = state.mode === "hypertext";

  const reader = isHypertext
    ? [
        "<Reader",
        ...indent(props, 2),
        ">",
        // A snippet cannot honestly stand in for a gallery case, so it says so
        // and leaves the seam empty rather than shipping markup that is not there.
        "  {/* hypertext renders children instead of content.body. This markup is yours. */}",
        "  {/* The preview mounts the playground gallery here: see playground/gallery. */}",
        "  {/* your own markup here */}",
        "</Reader>"
      ]
    : ["<Reader", ...indent(props, 2), "/>"];

  const imports = [
    'import { Reader, type ReaderContent } from "calamus";',
    // The library does not inject its stylesheet; without this the reader is unstyled.
    'import "calamus/styles.css";',
    ...(state.wideColumnGap ? ['import type { CSSProperties } from "react";'] : [])
  ];

  return [
    ...imports,
    "",
    contentBlock(state),
    "",
    "export function Page() {",
    "  return (",
    "    // A host box with an explicit height: book and editorial paginate to fit it.",
    `    <div style={{ height: ${state.stageHeight} }}>`,
    ...indent(reader, 6),
    "    </div>",
    "  );",
    "}"
  ].join("\n");
}
