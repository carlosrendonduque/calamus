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
| `readingMode` | `(mode: ReaderMode) => string` | `` `Book reading mode` `` | all |
| `progress` | `(percent: number) => string` | `` `Reading progress: 40%` `` | `scroll`, `terminal` |
| `pageNavigation` | `string` | `"Book page navigation"` | `book` |
| `sheetNavigation` | `string` | `"Editorial sheet navigation"` | `editorial` |
| `previousPage` / `nextPage` | `string` | `"Previous page"` / `"Next page"` | `book` |
| `previousSheet` / `nextSheet` | `string` | `"Previous sheet"` / `"Next sheet"` | `editorial` |

The first three are visible text; the rest are accessible names, exposed only to assistive
technology. Passing an override object does not blank the keys you leave out, and an explicit
`undefined` is ignored rather than treated as an empty string.

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

All five modes render their root as a focusable region (`tabIndex={0}`) with an accessible
name, and have a `:focus-visible` outline drawn from `--calamus-accent` (or
`--calamus-terminal-muted` in `terminal`). Every name below is the default from
`labels.readingMode` and is overridable:

| Mode | Element | `aria-label` | Focusable |
| --- | --- | --- | --- |
| `scroll` | `<article>` | `Scroll reading mode` | yes |
| `book` | `<section>` | `Book reading mode` | yes |
| `terminal` | `<section>` | `Terminal reading mode` | yes |
| `editorial` | `<section>` | `Editorial reading mode` | yes |
| `hypertext` | `<section>` | `Hypertext reading mode` | yes |

Keyboard navigation requires that region to have focus, so a keyboard reader tabs to the
reader first and then drives it. Nothing is captured globally; the library installs no
document- or window-level listeners.

### Keyboard shortcuts

Linear modes — `scroll` and `terminal` — scroll the region:

| Key | Action |
| --- | --- |
| `↓` | Scroll down 80px |
| `↑` | Scroll up 80px |
| `PageDown` | Scroll down one screenful |
| `PageUp` | Scroll up one screenful |
| `Space` | Scroll down one screenful |
| `Shift+Space` | Scroll up one screenful |
| `Home` | Jump to the start |
| `End` | Jump to the end |

`hypertext` mode uses the same contract, scrolling its own content area. It yields to your
markup: the handler only fires when the region itself has focus, so links, inputs and custom
widgets passed as `children` keep their own arrow and space keys.

Paginated modes — `book` and `editorial` — move between pages/sheets:

| Key | Action |
| --- | --- |
| `←` / `PageUp` | Previous page / sheet |
| `→` / `PageDown` | Next page / sheet |
| `Space` | Next page / sheet |
| `Shift+Space` | Previous page / sheet |
| `Home` | First page / sheet |
| `End` | Last page / sheet |

`preventDefault()` is called only when a key is actually handled, so anything the reader does
not use passes through to the host document.

Scrolling is smooth by default and switches to instant when the user asks for reduced motion.

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

### Deliberate choices

Two things are done in a way that may look like an omission, so they are worth stating.

**The progress bars are decorative, not `role="progressbar"`.** Both bars keep
`aria-hidden="true"` and each mode renders a screen-reader text equivalent instead
(`labels.progress`, default `Reading progress: 40%`). A progressbar wired to scroll position
is spoken on every value change by some screen readers, which means it talks continuously
while you arrow through prose — worse than having no exposure at all. A text equivalent is
readable on demand and never interrupts.

**Page and sheet changes are announced by a dedicated hidden live region**, not by making the
visible status line live. On mount the reader renders `Page 1 of 1`, then re-measures and
re-paginates a frame later; a live visible status line would announce that layout pass, and
every window resize after it, as though the reader had turned a page. The announcer stays
empty until the first real page turn. The trade-off is that after that first turn the status
text exists twice in the accessibility tree, so in browse mode you may meet it twice.

### Known gaps

- **The mode chrome is hardcoded English.** `labels` covers every status line and accessible
  name, but the typographic set dressing of each mode is not configurable: `reader --scroll`,
  `less --book`, `$ cat document.txt`, `[EOF]`, `viewer --editorial`, and the placeholder
  `no hypertext content provided`. These read as part of each mode's visual design rather than
  as interface copy, which is why they were left alone — but a piece in another language will
  see them in English.
- **No automated accessibility tests.** The suite runs in Node with no DOM, so roles, live
  regions and focus behaviour are verified by reading the code and by hand, not by assertion.
  Adding a DOM environment would mean adding a dev dependency, which the project avoids.

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
