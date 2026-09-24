/**
 * Every gallery case shows its own file as its source, imported as text with
 * Vite's `?raw` suffix so the listing can never drift from what runs. The
 * playground does not pull in `vite/client`, so the one declaration it needs
 * for that lives here.
 */
declare module "*?raw" {
  const source: string;
  export default source;
}
