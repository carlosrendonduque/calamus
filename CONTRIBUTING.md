# Contributing to calamus

Thanks for looking. `calamus` is small on purpose, and the two design rules below are what
keep it that way. Read those first — a change that breaks either one will not be merged even
if the code is good.

## The two hard rules

### 1. Zero runtime dependencies

`calamus` ships nothing but its own code. `react` and `react-dom` are peer dependencies; there
is no `dependencies` field in `package.json` and there will not be one. No animation library,
no virtual-scroller, no polyfill, no utility package, no font package.

This is not minimalism for its own sake. The library is meant to be dropped into a literary
project and still be installable and auditable in five years, and every dependency is a thing
that can rot, break, or start phoning home.

Dev dependencies are also kept deliberately thin: TypeScript, Vite, tsup, Vitest, React types.
Adding one needs a reason in the pull request.

If a feature genuinely requires a dependency, open an issue before writing the code. The
likely answer is that the feature belongs in the host app, not in the library.

### 2. Content-agnostic

The library must never carry material specific to any single literary work. No sample text
from a real manuscript, no character names, no world terminology, no project-specific
vocabulary in class names, props, types, comments or test fixtures.

Anything that needs prose to demonstrate it uses the public-domain corpus in `examples/`, or
neutral placeholder text. The playground sample is illustrative filler and should stay that
way.

The test of a change is: could someone reading only this repository tell what the author's own
fiction is about? The answer has to be no.

### Also: no AI, no network

`calamus` contains no AI or LLM integration and no network code, and it will not gain either.
It reads an array of strings you already have and renders it. Generation, analysis and
retrieval live in other tools.

## Setup

Node 20 or 22, npm.

```bash
git clone https://github.com/carlosrendonduque/calamus.git
cd calamus
npm install
```

`npm install` runs the `prepare` script, which builds the package. That is intentional — it is
what makes a Git install of the package work.

## The loop

```bash
npm run dev        # Vite dev server for the playground at playground/
npm run build      # tsup bundle (ESM + CJS + .d.ts), then tsc --noEmit over src alone
npm run typecheck  # tsc --noEmit over src, playground, examples, tests and the configs
npm run test       # vitest run
```

Work in the playground. It renders one sample text through all five modes with a switcher, so
a change to pagination, transitions or keyboard handling is visible immediately. Resize the
window while you are in `book` or `editorial` mode — both re-measure and re-paginate on
resize, and that is where pagination bugs surface.

Before opening a pull request, run all three of `build`, `typecheck` and `test`. CI runs
exactly those, in that order, on Node 20 and 22.

There is no linter and no formatter in the repo. Match the existing style by hand.

The playground doubles as the published demo, so its build is subpath-aware: `npm run dev`
serves it at `/`, while `npm run build:demo` writes `dist-demo/` with a `/calamus/` base and
serve `dist-demo/` with any static file server to see what actually ships. The library build
(`npm run build`, tsup) owns `dist/` and wipes it, which is why the demo has its own output
directory.

Do not use `npm run preview` for this. On the pinned Vite, its preview server returns 404 for
any request carrying the `Sec-Fetch-Dest: script` header — which every browser sends on a
script load — so the page renders blank while `curl` on the same URL returns 200. The build is
not at fault, and GitHub Pages serves the same files correctly.

## Code style

The conventions below are what the existing code does. Follow them rather than your editor's
defaults.

- **Double quotes** for all strings, including imports and JSX attribute values.
- **Two-space indentation.** Semicolons. No trailing commas in multi-line literals in `src/`.
- **Named exports only.** There are no default exports anywhere in `src/`, including
  components. `export function Reader(...)`, never `export default`.
- **Function declarations**, not arrow-function consts, for components and module-level
  helpers. Arrow functions are used for event handlers and callbacks inside components.
- **`import type`** for type-only imports, kept as separate statements from value imports.
- Explicit return types on exported helper functions; inferred elsewhere.
- **Early returns with braces.** No single-line `if`s, no bare `return` without a block.
- **BEM-ish class names** under the `calamus` namespace: `calamus__paragraph` for elements,
  `calamus--terminal` for variants. Keep them prefixed; the library shares a page with host
  CSS.
- **Design tokens as CSS custom properties**, all named `--calamus-*`, all declared once in
  `src/styles.css`. A new colour or font goes in as a token before it goes in as a value. If
  the token should be settable from TypeScript, add it to `ReaderTheme` in `src/types.ts` and
  to `THEME_TO_VAR` in `src/Reader.tsx` — those two must stay in sync.
- No inline styles except where the value is computed at runtime (progress-bar widths, theme
  variables on the root).
- Keep browser APIs inside effects, never at module scope, so the component stays
  server-renderable.
- Comments explain a decision or a non-obvious constraint. They do not restate the code.

## Pull requests

- One change per pull request. A new mode, an accessibility fix and a refactor are three pull
  requests.
- Say what editorial problem the change solves, not only what it does. This is a library about
  how text is read; "adds a prop" is not a rationale.
- Changes to rendered output should be verifiable in the playground. Say what to look at.
- Accessibility regressions are treated as bugs. The README lists the known gaps; pull
  requests closing any of them are especially welcome, and should update that list.
- New public props, theme tokens or modes need README updates in the same pull request.
- Add a `CHANGELOG.md` entry under `Unreleased` for anything user-visible.

## Commit messages

Written in English, in the imperative mood, and describing the decision rather than the file
touched. `git log` should read as a record of what was decided, not a list of edits.

```
feat(editorial): add configurable sheet transition animations
feat(reader): add universal keyboard scrolling in linear modes
chore: add prepare script and CSS export for git consumption
```

Not `update EditorialReader.tsx`, not `fixes`, not `wip`.

The `type(scope):` prefix follows the existing history — `feat`, `fix`, `chore`, `docs`,
`refactor`, `test` — with the scope being the mode or subsystem (`reader`, `book`, `editorial`,
`terminal`, `hypertext`) where one applies.

## Reporting bugs

Include the mode, the browser, the viewport width if layout is involved, and a minimal
`content` object that reproduces it. Pagination bugs in `book` and `editorial` usually depend
on paragraph lengths and container height, so the actual paragraph lengths matter — use
public-domain text or lorem ipsum, not your own manuscript.

## License

By contributing you agree that your contribution is licensed under the MIT License, the same
as the rest of the project.
