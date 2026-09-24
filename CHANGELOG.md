# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Work preparing the library for its first public release.

### Removed

- **Breaking.** The `readingTimeLabel` prop. Use `labels.readingTime` instead. The package has
  never been published, so no released version is affected.

### Added

- `README.md` covering positioning, install, the full prop and `ReaderContent` tables, a
  section per reading mode, the `ReaderTheme` to `--calamus-*` token map, and an accessibility
  and keyboard navigation section including the known gaps.
- `CONTRIBUTING.md` with the setup and `dev` / `build` / `typecheck` / `test` loop, the code
  style used in the repository, the commit-message convention, and the two hard design rules:
  zero runtime dependencies and content-agnostic.
- `CHANGELOG.md` in Keep a Changelog format.
- GitHub Actions CI workflow running `build`, `typecheck` and `test` on push and pull request
  to `main`, on Node 20 and 22.
- npm metadata in `package.json`: `keywords`, `repository`, `homepage`, `bugs`, `author` and
  `sideEffects`.
- A catalogue of 32 worked `hypertext` examples in the playground, grouped into nine categories
  by capability, filterable, and addressable one by one through the URL. Each renders its own
  source file so the listing cannot drift from what runs. `hypertext` renders `children` instead
  of `content.body`, so the mode can only be explained by example. No example fetches anything:
  images are inline SVG, sound is synthesised with the Web Audio API on a gesture, moving images
  are animated SVG.
- Public-domain example corpus under `examples/`, so the reading modes can be demonstrated on
  real writing without the library carrying content of its own.
- `labels` prop (`ReaderLabels`) overriding every user-facing string, so the reader can be
  rendered in any language. Replaces the single `readingTimeLabel` prop.
- `maxHeight` key on `ReaderTheme`, mapped to `--calamus-max-height`. The reading surface used
  to size itself against the viewport and nothing else, so the library could not be placed in a
  card, a column or a split pane. Set it to `"100%"` inside a host element with a definite
  height and `book` and `editorial` paginate to that box, and re-paginate when it resizes.
- `lang` prop, forwarded to the root element, so non-English text is announced and hyphenated
  correctly.
- Eight more `ReaderLabels` keys covering every accessible name: `readingMode`, `progress`,
  `pageNavigation`, `sheetNavigation`, `previousPage`, `nextPage`, `previousSheet`, `nextSheet`.
  No accessible name is hardcoded any more. No new prop; `ReaderProps` is unchanged.

### Changed

- Pagination and reading-time helpers extracted into `src/internal/` and covered by unit tests.
  No change to rendered output.
- Every user-facing string now defaults to English. The page and sheet counters were
  previously hardcoded Spanish (`Pagina 2 de 5`, `Hoja 1 de 3`) with no way to change them,
  and the reading-time unit defaulted to `min de lectura`.

### Fixed

- `editorial` mode no longer returns a single-column sheet from its early-return paths when
  more columns were requested. An empty body, or a body measured before layout settled, used
  to render one column and then snap to two once real heights arrived.
- Page and sheet changes are announced. Each paged mode renders a hidden
  `role="status" aria-live="polite"` region that stays empty until the first real page turn, so
  re-pagination and resizes are not announced as navigation.
- The page-turn control clusters carry `role="group"`, so their accessible names are exposed.
  Previously the `aria-label` sat on a role-less `<div>` and was dropped.
- The progress bars have a screen-reader text equivalent (`labels.progress`). They stay
  decorative rather than becoming `role="progressbar"`, which some screen readers narrate
  continuously while scrolling.
- Animations and smooth scrolling honour `prefers-reduced-motion`, in CSS and in the keyboard
  handlers. Pages and sheets still change; only the animation goes.
- `hypertext` mode is focusable and handles keys, using the same contract as the other linear
  modes. It yields to `children`: the handler only fires when the region itself has focus, so
  host widgets keep their own arrow and space keys.
- Every `color-mix()` declaration has a plain fallback before it, so browsers without support
  keep a visible focus outline instead of losing it.
- `PageUp` / `PageDown` in every mode, and `Shift+Space` to move backwards. `preventDefault()`
  is now called only for keys the reader actually handles, so the rest pass through.
- `paginateEditorialParagraphs` no longer throws on a `columnCount` below 1, fractional, `NaN`
  or `Infinity`; it floors to a minimum of one column.
- **Pagination is CSS's now, and measures nothing.** `book` and `editorial` used to measure every
  paragraph's height in the DOM and sum them to decide where to break. They now render the whole
  document into a multi-column flow inside a scroll-snapping scrollport, and read the page count
  off one number. `EditorialReader` went from 284 lines to 108, swipe became the platform's own
  scroll rather than a hand-rolled threshold, and the library can paginate anything React can
  render instead of only prose: a figure, a blockquote or a table now paginates without being
  measured at all.

  Two behaviour changes. A paragraph taller than a column is **split** across consecutive pages
  rather than given its own page that scrolls internally, and in `editorial` it may run from a
  sheet's first column into its second. And the previous paginator **saturated**: at 900px wide,
  `editorial` reported five sheets at every height from 320px to 800px, because the guard that
  kept one paragraph per page stopped responding and the text simply overflowed. Counts are now
  monotone in the box at every width.
- **The reader measures its own container, not the window.** `editorial` decided its column
  count with `window.matchMedia("(min-width: 768px)")`, so a 380px card on a 1400px desktop got
  two 136px columns with display type sized for the window. The count now comes from an
  `@container` rule and the component reads it back from the custom property that drives the
  grid, so the paginator cannot disagree with the grid it is filling. The fluid type moved from
  `vw` to `cqi`. One `matchMedia` call and one duplicated breakpoint are gone.

  Two consequences. In ordinary flow at a viewport of 768–799px with default body margins,
  `editorial` now shows one column rather than two, because the root is narrower than the window
  by the margin and the scrollbar and the count finally reflects that. And a host that expects
  the reader to size itself must now give it a width: a query container has no intrinsic inline
  size, so a shrink-to-fit parent has nothing to measure. Block flow and flex items are
  unaffected.
- **`book` and `editorial` no longer collapse.** Both now render at a fixed height —
  `min(78vh, 860px)` by default, or whatever `theme.maxHeight` says — instead of shrinking to
  fit the pagination they had just produced. That was a feedback loop: the frame hugged the
  page it had just laid out, so the next measurement saw a smaller box and laid out less.
  Sterne's chapter went to ten pages of one paragraph each; it now fills four. `editorial` had
  the same pathology in both directions, settling at 363px against a 780px cap for one text and
  overflowing the viewport at 962px for another. Short texts now show a full frame with space
  below the text, which is what a page looks like; set `theme.maxHeight` for a smaller one.
  `scroll`, `terminal` and `hypertext` are unaffected — they have no page metaphor to keep.
- The published demo was rendering unstyled. `sideEffects` lets bundlers prune the stylesheet
  import inside `src/index.ts`, so the playground now imports the stylesheet explicitly, the
  way a host project has to. This is a demo fix; consuming the library was always documented as
  requiring `import "calamus/styles.css"`.

## [0.1.0] - 2026-05-26

First working version of the library: a single `Reader` component with five reading modes,
measured pagination for the two paged modes, keyboard and touch navigation, configurable
transitions, and theming through CSS custom properties.

### Added

- `Reader` component and initial scaffolding, with the first three reading modes — `scroll`,
  `book` and `terminal` — and the `ReaderContent` / `ReaderMode` / `ReaderTheme` /
  `ReaderProps` public types.
- Theming through the `theme` prop, mapping `ReaderTheme` keys to `--calamus-*` CSS custom
  properties on the reader root, with a separate token set for `terminal` mode.
- `prepare` script and a CSS export entry, so the package can be installed and built directly
  from a Git URL.
- `editorial` reading mode: horizontal sheets laid out in one or two columns depending on
  viewport width.
- `hypertext` reading mode, rendering arbitrary `children` inside the reader frame for
  non-linear pieces that mix prose with components, and a scroll progress indicator for
  `scroll` mode.
- Bottom progress indicator in `terminal` mode, synced with scroll position and expressed as a
  percentage.
- Estimated reading time for `scroll` and `editorial` modes, with a configurable unit label via
  `readingTimeLabel`.
- `book` mode pagination engine: paragraph heights are measured off-screen and split into pages
  that fit the available height, with reflow on container resize.
- `book` mode page navigation controls and a page-number status line.
- `book` mode keyboard shortcuts: arrow keys and `Space` to turn pages, `Home` and `End` to
  jump to the first and last page.
- `book` mode horizontal swipe navigation for touch devices, with a distance threshold that
  leaves vertical scrolling intact.
- Configurable `book` page transition animations via the `transition` prop: `fade`, `slide` or
  `none`.
- `editorial` mode sheet pagination calculated from measured paragraph heights and the active
  column count.
- `editorial` mode sheet navigation controls and a sheet-number status line.
- `editorial` mode keyboard shortcuts for sheet navigation, matching the `book` mode bindings.
- `editorial` mode horizontal swipe navigation for touch devices.
- Configurable `editorial` sheet transition animations, sharing the `transition` prop with
  `book` mode.
- Keyboard scrolling in the linear modes `scroll` and `terminal`: arrow keys for line
  movement, `Space` for a viewport step, `Home` and `End` for the document ends.
- Vitest configuration and a smoke test, establishing the test target used by CI.

[Unreleased]: https://github.com/carlosrendonduque/calamus/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/carlosrendonduque/calamus/releases/tag/v0.1.0
