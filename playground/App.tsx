import { useEffect, useRef, useState } from "react";
import { CodePanel } from "./CodePanel";
import { ControlsPanel } from "./ControlsPanel";
import { DocumentView } from "./DocumentView";
import { ModeGuide } from "./ModeGuide";
import { Stage } from "./Stage";
import { CASE_HASH_PREFIX } from "./gallery/CatalogueRoute";
import { openingView, viewForHash, type PlaygroundView } from "./documents/route";
import { INITIAL_STATE, REPO_URL, type ExplorerState } from "./state";

const VIEWS: readonly { id: PlaygroundView; label: string }[] = [
  { id: "document", label: "Document" },
  { id: "props", label: "Props explorer" }
];

/**
 * Two views, and the document is the landing one.
 *
 * They are not two halves of one screen, because they answer different questions
 * and a split would shrink both. The document view asks "what does this tool
 * make?" — an authored file in, a reading out — and it needs the width, because
 * the source and the reading have to be legible side by side. The props explorer
 * asks "what can I set on the component?" and belongs to the flat API that
 * decision 22 made the degenerate document: still true, still worth showing, and
 * no longer the thing a visitor should meet first.
 *
 * The URL decides which one opens, so `#/gallery/<id>` still lands on its gallery
 * example and `#/document/<id>` lands on its document.
 */
export function App() {
  // One object for every control, shaped after ReaderProps.
  const [state, setState] = useState<ExplorerState>(INITIAL_STATE);
  const [view, setView] = useState<PlaygroundView>(openingView);

  // A link pasted into the address bar of a page already open is still a link:
  // a hash belonging to the other view brings that view forward. A gallery link
  // also carries its mode, because a gallery example exists in `hypertext` and
  // nowhere else -- which is what `openingMode` does for a cold load.
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      const asked = viewForHash(hash);

      if (!asked) {
        return;
      }

      setView(asked);

      if (hash.startsWith(CASE_HASH_PREFIX)) {
        setState((previous) =>
          previous.mode === "hypertext" ? previous : { ...previous, mode: "hypertext" }
        );
      }
    };

    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  // The document the visitor was reading, so that a trip to the props explorer
  // and back does not land them on a different one.
  const lastDocument = useRef<string | null>(null);

  /**
   * Choosing a view by hand is not following a link, so the address of the view
   * being left does not get to stay in the bar: the explorer's address is the
   * bare page, and going back to the document restores the one that was open.
   * Written before the view changes, because each view reads the hash as it
   * mounts.
   */
  const choose = (next: PlaygroundView) => {
    const hash = window.location.hash;
    const owner = viewForHash(hash);

    if (owner === "document") {
      lastDocument.current = hash;
    }

    if (owner !== next) {
      const { pathname, search } = window.location;
      const wanted = next === "document" ? lastDocument.current ?? "" : "";
      window.history.replaceState(null, "", `${pathname}${search}${wanted}`);
    }

    setView(next);
  };

  return (
    <main className="explorer">
      <header className="explorer__header">
        <h1>calamus</h1>
        <p>
          A tool for experimental digital narrative. An author hands in a document
          — prose with choices, marks and reader controls — and gets back a reading
          that drops into a writer's page as one dependency-free React component.
        </p>
        <div className="explorer__views">
          <span className="explorer__views-label" id="explorer-view-label">
            View
          </span>
          <div className="control__buttons" role="group" aria-labelledby="explorer-view-label">
            {VIEWS.map((entry) => {
              const pressed = entry.id === view;

              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={pressed}
                  className={pressed ? "is-active" : undefined}
                  onClick={() => choose(entry.id)}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="explorer__header-links">
          <a href={REPO_URL}>github.com/carlosrendonduque/calamus</a>
          {view === "props" ? <a href="#preview-heading">Jump to the preview</a> : null}
        </p>
      </header>

      {view === "document" ? (
        <DocumentView />
      ) : (
        <div className="explorer__layout">
          <ControlsPanel state={state} onChange={setState} />
          <div className="explorer__main">
            <Stage state={state} onChange={setState} />
            <CodePanel state={state} />
            <ModeGuide mode={state.mode} />
          </div>
        </div>
      )}
    </main>
  );
}
