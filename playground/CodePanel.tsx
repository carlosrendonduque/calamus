import { useEffect, useRef, useState } from "react";
import { buildSnippet } from "./snippet";
import type { ExplorerState } from "./state";

type CodePanelProps = {
  state: ExplorerState;
};

type CopyHint = null | "ok" | "err";

const HINTS: Record<"ok" | "err", string> = {
  ok: "Copied",
  err: "Copy failed: select the code and copy it by hand."
};

export function CodePanel({ state }: CodePanelProps) {
  const [copyHint, setCopyHint] = useState<CopyHint>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snippet = buildSnippet(state);

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const scheduleReset = () => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }

    resetTimer.current = setTimeout(() => {
      setCopyHint(null);
    }, 2400);
  };

  const copy = async () => {
    try {
      // Absent on insecure origins, so the call is guarded rather than assumed.
      await navigator.clipboard?.writeText(snippet);
      setCopyHint("ok");
    } catch {
      setCopyHint("err");
    }

    scheduleReset();
  };

  return (
    <section className="explorer__section" aria-labelledby="code-heading">
      <div className="explorer__section-head">
        <h2 id="code-heading">Code</h2>
        <button type="button" className="explorer__copy" onClick={copy}>
          Copy
        </button>
      </div>
      <p className="explorer__note">
        Only the props that differ from their defaults are shown. The stylesheet import is not
        optional: the library ships its CSS as a separate file and never injects it.
      </p>
      <pre className="explorer__code" tabIndex={0} aria-label="Generated JSX for the current state">
        <code>{snippet}</code>
      </pre>
      <p className="explorer__copy-hint" role="status" aria-live="polite">
        {copyHint ? HINTS[copyHint] : ""}
      </p>
    </section>
  );
}
