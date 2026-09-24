import { useState } from "react";
import { CodePanel } from "./CodePanel";
import { ControlsPanel } from "./ControlsPanel";
import { ModeGuide } from "./ModeGuide";
import { Stage } from "./Stage";
import { INITIAL_STATE, REPO_URL, type ExplorerState } from "./state";

export function App() {
  // One object for every control, shaped after ReaderProps.
  const [state, setState] = useState<ExplorerState>(INITIAL_STATE);

  return (
    <main className="explorer">
      <header className="explorer__header">
        <h1>calamus</h1>
        <p>
          A dependency-free React component that renders narrative prose in five reading modes.
          Change a prop, watch the reader, copy the code.
        </p>
        <p className="explorer__header-links">
          <a href={REPO_URL}>github.com/carlosrendonduque/calamus</a>
          <a href="#preview-heading">Jump to the preview</a>
        </p>
      </header>

      <div className="explorer__layout">
        <ControlsPanel state={state} onChange={setState} />
        <div className="explorer__main">
          <Stage state={state} onChange={setState} />
          <CodePanel state={state} />
          <ModeGuide mode={state.mode} />
        </div>
      </div>
    </main>
  );
}
