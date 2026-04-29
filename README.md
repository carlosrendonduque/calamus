# calamus

Reusable React component for comfortable narrative reading on the web.

## Install

```bash
npm install
```

## Local Playground

```bash
npm run dev
```

Open the Vite URL and switch between all available reader modes.

## Build Package

```bash
npm run build
```

## Public API

```tsx
type ReaderContent = {
  title: string;
  subtitle?: string;
  body: string[];
};

<Reader content={content} mode="scroll" />
```

- `mode`: `"scroll" | "book" | "terminal" | "editorial" | "hypertext"` (default `"scroll"`)
- `theme`: optional token overrides (mapped to CSS variables)
- `className` and `style`: optional host customization hooks

## Modes

- `scroll`
- `book`
- `terminal`
- `editorial`
- `hypertext`

Use `hypertext` for texts that mix prose with custom components, animations, or multimedia.

```tsx
<Reader
  content={{ title: "Mi texto experimental", body: [] }}
  mode="hypertext"
>
  <p>Aqui va contenido libre.</p>
  <MyCustomComponent />
  <p>Mas contenido.</p>
</Reader>
```
