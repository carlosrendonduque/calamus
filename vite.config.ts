import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The playground doubles as the public demo. `npm run dev` serves it from the
// root, while the built demo is published under the repository subpath on
// GitHub Pages (https://carlosrendonduque.github.io/calamus/).
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/calamus/" : "/",
  plugins: [react()],
  build: {
    // Keep the demo out of `dist`, which belongs to the library build (tsup).
    outDir: "dist-demo",
    emptyOutDir: true
  }
}));
