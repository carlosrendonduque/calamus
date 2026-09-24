import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
// The playground consumes calamus the way a host project does, stylesheet and
// all. `sideEffects` in package.json lets bundlers prune the CSS import inside
// src/index.ts, so relying on it here would ship an unstyled reader.
import "../src/styles.css";
import "./theme.css";
import "./explorer.css";
import "./documents.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
