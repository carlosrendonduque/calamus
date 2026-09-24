import { useEffect, useId, useMemo, useRef, type CSSProperties } from "react";
import type { NarrativeDocument } from "./document/types";
import type { ReaderProps, ReaderTheme } from "./types";
import { BookReader } from "./modes/BookReader";
import { EditorialReader } from "./modes/EditorialReader";
import { HypertextReader } from "./modes/HypertextReader";
import { ScrollReader } from "./modes/ScrollReader";
import { TerminalReader } from "./modes/TerminalReader";
import type { ReadingView } from "./modes/view";
import { getReadingTimeText } from "./internal/readingTime";
import { mergeLabels } from "./internal/labels";
import { documentFromContent, documentFromSource, emptyDocument, wordsOf } from "./document/content";
import { useReading } from "./document/reading";
import { customProperties, domId, renderDocument } from "./document/render";

const THEME_TO_VAR: Record<keyof ReaderTheme, string> = {
  background: "--calamus-bg",
  foreground: "--calamus-fg",
  muted: "--calamus-muted",
  accent: "--calamus-accent",
  border: "--calamus-border",
  panel: "--calamus-panel",
  terminalBackground: "--calamus-terminal-bg",
  terminalForeground: "--calamus-terminal-fg",
  terminalMuted: "--calamus-terminal-muted",
  terminalEmphasis: "--calamus-terminal-emphasis",
  terminalEof: "--calamus-terminal-eof",
  terminalBorder: "--calamus-terminal-border",
  serifFontFamily: "--calamus-serif-font",
  monoFontFamily: "--calamus-mono-font",
  maxHeight: "--calamus-max-height"
};

function themeToCssVars(theme?: ReaderTheme): CSSProperties {
  if (!theme) {
    return {};
  }

  const vars: CSSProperties = {};

  for (const [key, value] of Object.entries(theme) as [keyof ReaderTheme, string][]) {
    (vars as Record<string, string>)[THEME_TO_VAR[key]] = value;
  }

  return vars;
}

/**
 * One document, whichever way the host supplied it.
 *
 * Decision 22: the flat text is the degenerate document, so `content` is not a
 * second contract any more — it is converted and then forgotten. `source` is the
 * authored file, read by the parser, diagnostics and all; `document` is the same
 * thing already read.
 */
function useDocument(props: Pick<ReaderProps, "document" | "source" | "content">): NarrativeDocument {
  const { document: given, source, content } = props;

  return useMemo(() => {
    if (given) return given;
    if (typeof source === "string") return documentFromSource(source).document;
    if (content) return documentFromContent(content);
    return emptyDocument();
  }, [given, source, content]);
}

export function Reader({
  content,
  document: given,
  source,
  registry,
  mode = "scroll",
  theme,
  className,
  style,
  children,
  labels,
  lang,
  transition = "fade",
  onDiagnostics,
  opens
}: ReaderProps) {
  const document = useDocument({ document: given, source, content });
  const reading = useReading(document, opens);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // A stable prefix per mounted reader. Ids the document writes are the
  // author's; two readings of one document on one page must not both claim them,
  // and neither may shadow an id the host already uses. `useId` and not a
  // counter, because the README promises the reader is safe on the server and a
  // counter gives the server and the client two different sets of ids. The
  // colons `useId` surrounds its value with are legal in an id and awkward in a
  // selector, so they come off here rather than being escaped everywhere.
  const prefix = `calamus${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;

  const mergedLabels = mergeLabels(labels);

  const rendered = renderDocument({
    document,
    state: reading.state,
    registry,
    shown: reading.shown,
    onGesture: reading.perform,
    revision: reading.revision,
    motion: prefersReducedMotion() ? "reduce" : "full",
    idPrefix: prefix,
    holder: reading.holder
  });

  // Diagnostics are data, handed over rather than logged: a library that writes
  // to the console of a page it is embedded in is a library that cannot be
  // embedded twice.
  const diagnostics = rendered.diagnostics;

  useEffect(() => {
    if (onDiagnostics && diagnostics.length > 0) {
      onDiagnostics(diagnostics);
    }
    // The diagnostics of one render, reported once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading.revision, document]);

  /**
   * The focus, which the library moves and a slot never does.
   *
   * `:go{show=… focus=true}` is a reveal that carries the focus, and `back-up`
   * is the same move in reverse: it names the span it left, which is what
   * `Inline.affordance.id` is for. Either way the element already carries a
   * `tabIndex` of -1, so it can be reached without becoming a tab stop.
   */
  useEffect(() => {
    if (!reading.focus) {
      return;
    }

    const root = rootRef.current;

    if (!root) {
      return;
    }

    const target = root.querySelector<HTMLElement>(`#${cssEscape(domId({ prefix }, reading.focus.id))}`);

    if (target) {
      target.focus({ preventScroll: false });
    }
  }, [reading.focus, prefix]);

  const readingTimeText = getReadingTimeText(
    { title: document.title, body: wordsOf(document) },
    mergedLabels.readingTime
  );

  /**
   * The one announcer, and decision 14b entire.
   *
   * It is a separate hidden region rather than the visible status line, and it
   * is **empty until the reader's first real gesture**, because mounting renders
   * `Page 1 of 1` and re-paginates a frame later: a live line would announce a
   * layout calculation as if the reader had navigated. What it says is the prose
   * the author declared on the move (`note:`), and failing that the text of the
   * blocks the author marked `live` — never a string the library invented, and
   * never one a registry entry invented.
   */
  const announcer = (
    <div className="calamus__sr-only" role="status" aria-live="polite" aria-atomic="true">
      {reading.hasMoved ? (reading.announcement ?? rendered.live) : ""}
    </div>
  );

  const view: ReadingView = {
    title: document.title,
    subtitle: document.subtitle,
    body: rendered.body,
    controls: rendered.controls,
    exits: rendered.exits,
    announcer,
    readingTimeText,
    labels: mergedLabels,
    transition,
    revision: reading.revision,
    children
  };

  const mergedStyle = {
    ...themeToCssVars(theme),
    // Every declared variable, live, as a custom property in the root's scope.
    // The arithmetic falls in CSS (decision 29), so what crosses is the value
    // and the unit the author declared, and nothing computed.
    ...customProperties(document, reading.state),
    ...style
  };

  const rootClassName = ["calamus-root", className].filter(Boolean).join(" ");

  return (
    <div ref={rootRef} className={rootClassName} style={mergedStyle} lang={lang ?? document.lang}>
      {mode === "terminal" ? <TerminalReader {...view} /> : null}
      {mode === "scroll" ? <ScrollReader {...view} /> : null}
      {mode === "book" ? <BookReader {...view} /> : null}
      {mode === "editorial" ? <EditorialReader {...view} /> : null}
      {mode === "hypertext" ? <HypertextReader {...view} /> : null}
    </div>
  );
}

/** One source for reduced motion, in JS as in CSS (contrato-ranuras §5.2.5). */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** `CSS.escape` where it exists, and a conservative fallback where it does not.
 *  An authored id may hold anything the author typed. */
function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/[^\w-]/g, (character) => `\\${character}`);
}
