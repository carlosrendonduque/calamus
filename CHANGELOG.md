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
- Public-domain example corpus under `examples/`, so the reading modes can be demonstrated on
  real writing without the library carrying content of its own.
- `labels` prop (`ReaderLabels`) overriding every user-facing string, so the reader can be
  rendered in any language. Replaces the single `readingTimeLabel` prop.
- `lang` prop, forwarded to the root element, so non-English text is announced and hyphenated
  correctly.

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
