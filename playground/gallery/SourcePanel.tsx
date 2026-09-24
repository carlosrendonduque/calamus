import { useEffect, useRef, useState } from "react";

type SourcePanelProps = {
  /** The case file, verbatim. */
  source: string;
  title: string;
};

type CopyHint = null | "ok" | "err";

const HINTS: Record<"ok" | "err", string> = {
  ok: "Copied",
  err: "Copy failed: select the code and copy it by hand."
};

/** The code panel's behaviour, folded into a `details` so six of them can sit in a page. */
export function SourcePanel({ source, title }: SourcePanelProps) {
  const [copyHint, setCopyHint] = useState<CopyHint>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lines = source.trimEnd().split("\n").length;

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const copy = async () => {
    try {
      // Absent on insecure origins, so the call is guarded rather than assumed.
      await navigator.clipboard?.writeText(source);
      setCopyHint("ok");
    } catch {
      setCopyHint("err");
    }

    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }

    resetTimer.current = setTimeout(() => {
      setCopyHint(null);
    }, 2400);
  };

  return (
    <details className="playground__source">
      <summary>{`Source: ${lines} lines`}</summary>
      <div className="playground__source-head">
        <p className="playground__case-note">
          The playground file itself, not a paraphrase of it. Nothing here comes from the library.
        </p>
        <button type="button" className="explorer__copy" onClick={copy}>
          Copy
        </button>
      </div>
      <pre className="explorer__code" tabIndex={0} aria-label={`Source of the ${title} example`}>
        <code>{source.trimEnd()}</code>
      </pre>
      <p className="explorer__copy-hint" role="status" aria-live="polite">
        {copyHint ? HINTS[copyHint] : ""}
      </p>
    </details>
  );
}
