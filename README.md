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

Open the Vite URL and switch between `scroll`, `book`, and `terminal` modes.

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

- `mode`: `"scroll" | "book" | "terminal"` (default `"scroll"`)
- `theme`: optional token overrides (mapped to CSS variables)
- `className` and `style`: optional host customization hooks
