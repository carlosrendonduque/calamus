# calamus

[![CI](https://github.com/carlosrendonduque/calamus/actions/workflows/ci.yml/badge.svg)](https://github.com/carlosrendonduque/calamus/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

`calamus` is a React component that renders narrative prose in five reading modes: `scroll`,
`book`, `terminal`, `editorial` and `hypertext`. You give it a title and an array of
paragraphs; it handles typography, pagination, progress, keyboard and touch navigation, and
exposes its colours and fonts as CSS custom properties.

It has **zero runtime dependencies** (React is a peer dependency) and it is
**content-agnostic**: the library ships no text, no corpus and no material tied to any
particular literary work. It contains no AI, no LLM calls and no network code of any kind.

It is meant for people publishing interactive digital narrative and electronic literature on
the web — writers who want the reading surface itself to be part of the piece — and for
anyone who needs a self-contained long-form reader inside a React app.

What it is not: it is not a CMS, not an EPUB renderer, not a Markdown or rich-text parser. A
paragraph in `content.body` is rendered as plain text inside a `<p>`. If you need inline
markup or embedded components, that is what `hypertext` mode is for.

## Install

calamus is not on the npm registry. Install it from the repository — the `prepare` script
builds it on install, so a Git dependency works as-is:

```bash
npm install github:carlosrendonduque/calamus
```

React 18 is a peer dependency, so install it alongside if your project does not already have
it:

```bash
npm install react react-dom
```

## Usage

```tsx
import { Reader, type ReaderContent } from "calamus";
import "calamus/styles.css";

const content: ReaderContent = {
  title: "A Sentimental Journey",
  subtitle: "chapter-01.txt",
  body: [
    "They order, said I, this matter better in France.",
    "You have been in France? said my gentleman, turning quick upon me."
  ]
};

export function Page() {
  return <Reader content={content} mode="scroll" />;
}
```

**The stylesheet import is required.** The build emits the CSS as a separate `dist/index.css`
and does not reference it from the JavaScript bundle, so without `import "calamus/styles.css"`
(or the identical `calamus/index.css`) the reader renders unstyled. Load it once, anywhere in
your app.

## Props

`Reader` takes a single props object. Types come from `src/types.ts`.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `content` | `ReaderContent` | — | Required. The text to render. |
| `mode` | `"scroll" \| "book" \| "terminal" \| "editorial" \| "hypertext"` | `"scroll"` | Which reading mode to render. |
| `theme` | `ReaderTheme` | `undefined` | Partial token overrides, applied as CSS custom properties on the root element. |
| `className` | `string` | `undefined` | Appended to the root class `calamus-root`. |
| `style` | `CSSProperties` | `undefined` | Merged onto the root element **after** the theme variables, so it can override them. |
| `children` | `ReactNode` | `undefined` | Rendered only in `hypertext` mode; ignored by every other mode. |
| `labels` | `ReaderLabels` | English defaults | Overrides for every user-facing string. See below. |
| `lang` | `string` | `undefined` | Forwarded to the root element. Set it when the text is not in the page's language, so assistive technology and hyphenation treat it correctly. |
| `transition` | `"fade" \| "slide" \| "none"` | `"fade"` | Page/sheet change animation. Used by `book` and `editorial` only. |

### `ReaderLabels`

Every string the reader renders is overridable, so the component can be used in any language.
The defaults are English.

| Field | Type | Default | Used by |
| --- | --- | --- | --- |
| `page` | `(current: number, total: number) => string` | `` `Page ${current} of ${total}` `` | `book` |
| `sheet` | `(current: number, total: number) => string` | `` `Sheet ${current} of ${total}` `` | `editorial` |
| `readingTime` | `string` | `"min read"` | `scroll`, `editorial` |

```tsx
<Reader
  content={content}
  mode="book"
  lang="es"
  labels={{
    page: (current, total) => `Pagina ${current} de ${total}`,
    readingTime: "min de lectura"
  }}
/>
```

### `ReaderContent`

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `string` | Required. Rendered as the `<h1>` of every mode. |
| `subtitle` | `string \| undefined` | Optional. Used differently per mode — see below. |
| `body` | `string[]` | Required. One entry per paragraph, rendered as plain text. Ignored in `hypertext` mode. |

`subtitle` is not treated uniformly:

- `scroll` and `book` render it as a subtitle line under the title.
- `terminal` uses it as the filename in the `$ cat <subtitle>` header, falling back to
  `document.txt`.
- `editorial` and `hypertext` append it to the mode label (`viewer --editorial <subtitle>`,
  `reader --hypertext <subtitle>`) and render no separate subtitle line.

### Reading time

The estimate is `max(1, ceil(words / 250))` minutes, where words are whitespace-separated
tokens across all of `content.body`. It is displayed in `scroll` and `editorial` only. The
words-per-minute rate is not configurable.

## Reading modes

The five modes are not five skins over the same reading experience. Each one makes a
different editorial claim about how the text wants to be met.

### `scroll`

One continuous column inside a scrollable region, with a sticky progress bar at the top and
the reading-time estimate in the header.

For prose that should be read in one uninterrupted movement, where the reader's own pace is
the only structure — essays, chapters, monologue. The progress bar is the only orientation
cue; there are no page boundaries to break the flow, and nothing forces the reader to
transact with the interface to continue.

### `book`

The body is measured after mount and split into pages that fit the available height, one page
shown at a time, with previous/next controls and a page counter.

For text that wants a fixed frame — where the page is a unit of composition and the turn is a
beat. Use it when you want the reader to arrive at an ending, or when the amount of text
visible at once is something you are deciding rather than something the window decides.

Page breaks fall on paragraph boundaries; a paragraph is never split across pages. A
paragraph taller than the available height gets a page to itself and that page scrolls.
Pagination is recomputed on resize, and the current page index is clamped if the new
pagination is shorter.

### `terminal`

A dark, monospaced surface framed as a file being read: a `$ cat <filename>` header, a
`# title` line, an `[EOF]` marker at the end, and a sticky percentage progress line at the
bottom.

For texts that present themselves as documents rather than as literature — logs, dumps,
transcripts, found files, machine-facing prose. The frame does interpretive work: it tells the
reader this text was not composed for them, they are looking at it.

Terminal mode uses its own set of theme tokens (`terminal*`), so you can re-theme it without
touching the other four.

### `editorial`

The body is measured and laid out into sheets of one or two columns — two above a `768px`
viewport width, one below — and sheets are advanced horizontally with controls, keyboard or
swipe.

For spatially composed text, where the spread rather than the paragraph is the unit and the
reader takes in a whole surface at once before moving on. This is the mode for work where
placement on the page is part of the meaning.

The column count is decided by a `window.matchMedia("(min-width: 768px)")` check at
measurement time, so a narrow viewport degrades to a single column. Fill order is
column-major: a sheet's first column is filled, then the second, then a new sheet begins.

### `hypertext`

Renders whatever you pass as `children` inside the reader's frame, under the same title header
and theme.

For non-linear pieces that mix prose with components, animation, media or interaction — where
the text is only one of the materials. `calamus` supplies the container, the typography and
the tokens; the composition is yours.

`content.body` is **not rendered** in this mode, and no reading time is shown. Only `title`
and `subtitle` are used. If no children are passed, the mode renders the placeholder
`no hypertext content provided`.

```tsx
<Reader content={{ title: "Calligram", body: [] }} mode="hypertext">
  <p>Prose and components share the surface.</p>
  <MyAnimatedFigure />
  <p>The reader chooses the itinerary.</p>
</Reader>
```

## Theming

Pass a `theme` object and each key is written to the root element as the corresponding CSS
custom property. Every key is optional; unset keys keep the defaults from `src/styles.css`.

| `ReaderTheme` key | CSS variable | Applies to |
| --- | --- | --- |
| `background` | `--calamus-bg` | Surface background (all modes except `terminal`) |
| `foreground` | `--calamus-fg` | Body text |
| `muted` | `--calamus-muted` | Mode label, subtitle, reading time, nav status |
| `accent` | `--calamus-accent` | Progress fill, focus outlines, nav button hover |
| `border` | `--calamus-border` | Frame and rule borders |
| `panel` | `--calamus-panel` | Book page surface, nav button background |
| `terminalBackground` | `--calamus-terminal-bg` | `terminal` background |
| `terminalForeground` | `--calamus-terminal-fg` | `terminal` body text |
| `terminalMuted` | `--calamus-terminal-muted` | `terminal` header, progress line and percentage |
| `terminalEmphasis` | `--calamus-terminal-emphasis` | `terminal` title |
| `terminalEof` | `--calamus-terminal-eof` | `terminal` `[EOF]` marker |
| `terminalBorder` | `--calamus-terminal-border` | `terminal` frame border |
| `serifFontFamily` | `--calamus-serif-font` | Prose and titles |
| `monoFontFamily` | `--calamus-mono-font` | Labels, counters, `terminal` mode |

```tsx
<Reader
  content={content}
  mode="editorial"
  theme={{
    background: "#fbfaf7",
    foreground: "#1b1a18",
    accent: "#8a5a3c",
    serifFontFamily: "'EB Garamond', Georgia, serif"
  }}
/>
```

One further variable, `--calamus-column-gap` (default `2.4rem`), controls the editorial column
gap. It has no `ReaderTheme` key — set it through `style` or your own CSS:

```tsx
<Reader content={content} mode="editorial" style={{ "--calamus-column-gap": "3.2rem" } as CSSProperties} />
```

Class names are stable and follow a `calamus__*` / `calamus--*` convention (`calamus--book-frame`,
`calamus__paragraph`, `calamus__editorial-column`, and so on), so you can also restyle by
selector. They are not currently documented as public API; prefer the tokens where a token
exists.

## Accessibility and keyboard navigation

### Focus and roles

Four of the five modes render their root as a focusable region (`tabIndex={0}`) with an
`aria-label`, and have a `:focus-visible` outline drawn from `--calamus-accent` (or
`--calamus-terminal-muted` in `terminal`):

| Mode | Element | `aria-label` | Focusable |
| --- | --- | --- | --- |
| `scroll` | `<article>` | `Scroll reading mode` | yes |
| `book` | `<section>` | `Book reading mode` | yes |
| `terminal` | `<section>` | `Terminal reading mode` | yes |
| `editorial` | `<section>` | `Editorial reading mode` | yes |
| `hypertext` | `<section>` | `Hypertext reading mode` | **no** |

Keyboard navigation requires that region to have focus, so a keyboard reader tabs to the
reader first and then drives it. Nothing is captured globally; the library installs no
document- or window-level listeners.

### Keyboard shortcuts

Linear modes — `scroll` and `terminal` — scroll the region:

| Key | Action |
| --- | --- |
| `↓` | Scroll down 80px (smooth) |
| `↑` | Scroll up 80px (smooth) |
| `Space` | Scroll down one viewport height |
| `Home` | Jump to the start |
| `End` | Jump to the end |

Paginated modes — `book` and `editorial` — move between pages/sheets:

| Key | Action |
| --- | --- |
| `←` | Previous page / sheet |
| `→` | Next page / sheet |
| `Space` | Next page / sheet |
| `Home` | First page / sheet |
| `End` | Last page / sheet |

All of these call `preventDefault()`, so they do not additionally scroll the host document.
`hypertext` mode has no key handling at all.

`PageUp` and `PageDown` are not handled, and `Space` only moves forward — there is no
`Shift+Space` to page backwards in the linear modes.

### Touch

`book` and `editorial` support horizontal swipe. A gesture counts as a swipe when the
horizontal distance exceeds 50px and is greater than the vertical distance, which keeps
vertical scrolling intact. Swiping left advances, swiping right goes back. `scroll`,
`terminal` and `hypertext` have no touch handling; they scroll natively.

### Pointer controls

`book` and `editorial` render a previous/next pair of buttons with `aria-label`s
(`Previous page` / `Next page`, `Previous sheet` / `Next sheet`) and a status line between
them. The buttons carry the native `disabled` attribute at the first and last page, so they
are correctly announced and skipped.

### Server rendering

The reader is safe to render on the server. `book` and `editorial` initialise with a single
page containing the whole body and only measure and paginate in an effect after mount, so
server output is the complete text; `ResizeObserver` and `window.matchMedia` are touched
inside effects only.

### Known gaps

These are real limitations of the current code, listed so you can decide whether they matter
for your piece:

- **Page and sheet changes are not announced.** The `Page 1 of 7` / `Sheet 1 of 4` status
  line is plain text with no `aria-live` region, so a screen-reader user who presses `→`
  gets no confirmation that anything happened.
- **The `aria-label`s are not localisable.** `labels` covers every visible string, but the
  `aria-label`s on the navigation controls are still hardcoded English.
- **The nav wrappers carry `aria-label` on a plain `<div>`** with no `role`, so those labels
  (`Book page navigation`, `Editorial sheet navigation`) are not exposed by assistive
  technology.
- **Progress is visual only.** The scroll and terminal progress indicators are
  `aria-hidden="true"` and have no `role="progressbar"` or text equivalent, so reading
  position is unavailable non-visually.
- **Transitions ignore `prefers-reduced-motion`.** The fade and slide animations run
  regardless of the user's motion preference. Pass `transition="none"` to disable them, or add
  a `prefers-reduced-motion` override in your own CSS.
- **`hypertext` mode is not focusable and has no key handling**, although its content area is
  scrollable. In that mode the accessibility of everything inside is entirely the host's
  responsibility.
- **The stylesheet relies on `color-mix()`** for focus outlines, nav button states and
  progress-track backgrounds. Browsers without support lose those, including the focus
  outline — override `:focus-visible` yourself if you need to support them.

Contributions closing any of these are welcome; see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Demo

**<https://carlosrendonduque.github.io/calamus/>** — the playground, published from `main`.
It renders a public-domain corpus through all five modes with a mode switcher.

To run it locally:

```bash
npm install
npm run dev
```

`npm run build:demo` builds the same site into `dist-demo/`; `npm run preview` then serves it
at `http://localhost:4173/calamus/`, under the same subpath it ships on.

A public-domain demo corpus lives in `examples/corpus/`, with `examples/README.md` describing
the texts, their provenance and which mode each is chosen to exercise: English prose for
`scroll`, `book` and `terminal`, and two French texts for `editorial` and `hypertext`, where
the spatial arrangement of the original is the point. The corpus exists so the modes can be
demonstrated on real writing without the library carrying any content of its own.

## Development

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server for the playground |
| `npm run build` | `tsup` bundle (ESM + CJS + `.d.ts` + sourcemaps), then `tsc --noEmit` over `src` alone |
| `npm run typecheck` | `tsc --noEmit` across `src`, `playground` and the configs |
| `npm run test` | `vitest run` |

## License

MIT. See [LICENSE](./LICENSE).
