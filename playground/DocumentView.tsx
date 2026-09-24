import { useCallback, useMemo, useState } from "react";
import {
  Reader,
  parse,
  type Diagnostic,
  type NarrativeDocument,
  type ReaderMode
} from "../src";
import { DOCUMENT_CASES, indexOfDocument, type DocumentCase } from "./documents/corpus";
import { DOCUMENT_HASH_PREFIX } from "./documents/route";
import { PLAYGROUND_REGISTRY } from "./documents/registry";
import { hashFor, useHashRoute } from "./hashRoute";
import { MODES, MODE_LABELS } from "./state";

type Reported = {
  /** Which parse these belong to, so a stale set is never shown. */
  key: NarrativeDocument;
  items: Diagnostic[];
};

/**
 * The document view: the source on one side, the reading on the other.
 *
 * This is the whole argument of the library in one screen. An author hands in a
 * text file; `parse` reads it and hands back a document and its diagnostics,
 * never throwing; `Reader` renders that document in any of the five modes; and
 * the reader can touch it. Typing in the textarea is not a demo feature — it is
 * the proof that the reading on the right is made out of the text on the left and
 * out of nothing else.
 *
 * Nothing here reaches inside the library. The view calls `parse`, passes the
 * document, fills one `orders` name and prints what came back.
 */
export function DocumentView() {
  const ids = useMemo(() => DOCUMENT_CASES.map((entry) => entry.id), []);
  const [id, selectDocument] = useHashRoute(DOCUMENT_HASH_PREFIX, ids);
  const [mode, setMode] = useState<ReaderMode>("scroll");
  // Edits per document, so switching away and coming back does not throw away
  // what a visitor wrote. The absence of a key is the unedited document.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [reported, setReported] = useState<Reported | null>(null);

  const index = Math.max(indexOfDocument(id), 0);
  const current: DocumentCase = DOCUMENT_CASES[index];
  const edited = edits[current.id] !== undefined;
  const source = edits[current.id] ?? current.source;

  // The parse is the expensive part and the only part: one call per keystroke,
  // memoised on the text so that a reveal or a page turn does not re-read the
  // file. Identity is what tells the reader one document from another, so this
  // memo is also what keeps a reading alive while its reader reads.
  const parsed = useMemo(() => parse(source), [source]);

  const onDiagnostics = useCallback(
    (items: Diagnostic[]) => {
      setReported({ key: parsed.document, items });
    },
    [parsed.document]
  );

  const fromReading = reported && reported.key === parsed.document ? reported.items : [];
  const hash = hashFor(DOCUMENT_HASH_PREFIX, current.id);

  return (
    <div className="docs">
      <section className="explorer__section docs__pick" aria-labelledby="documents-heading">
        <div className="explorer__section-head">
          <h2 id="documents-heading">Documents</h2>
          <p className="docs__count">
            {`${index + 1} of ${DOCUMENT_CASES.length}, read at build time from docs/conformance-v1/`}
          </p>
        </div>

        <div className="docs__ids" role="group" aria-labelledby="documents-heading">
          {DOCUMENT_CASES.map((entry) => {
            const pressed = entry.id === current.id;

            return (
              <button
                key={entry.id}
                type="button"
                className={pressed ? "docs__id is-active" : "docs__id"}
                aria-pressed={pressed}
                onClick={() => selectDocument(entry.id)}
              >
                {entry.id}
                {edits[entry.id] !== undefined ? (
                  <>
                    <span className="docs__id-edited" aria-hidden="true">
                      ·
                    </span>
                    <span className="docs-sr-only"> (edited)</span>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="docs__chosen">
          <p className="docs__chosen-line">
            <strong className="docs__chosen-title">{current.title}</strong>{" "}
            <span className="docs__note">{current.note}</span>
          </p>
          {current.tryThis ? (
            <p className="explorer__try">
              <strong>Try this.</strong> {current.tryThis}{" "}
              <a className="docs__address" href={hash}>
                <code>{hash}</code>
              </a>
            </p>
          ) : null}
        </div>
      </section>

      <div className="docs__split">
        <section className="explorer__section docs__panel" aria-labelledby="source-heading">
          <div className="explorer__section-head">
            <h2 id="source-heading">The document</h2>
            <button
              type="button"
              className="explorer__copy"
              disabled={!edited}
              onClick={() =>
                setEdits((previous) => {
                  const next = { ...previous };
                  delete next[current.id];
                  return next;
                })
              }
            >
              Restore
            </button>
          </div>
          <label className="docs__source-label" htmlFor="document-source">
            Authored source. Type in it and the reading beside it changes.
          </label>
          <textarea
            className="docs__source"
            id="document-source"
            value={source}
            spellCheck={false}
            wrap="off"
            aria-describedby="document-diagnostics-heading"
            onChange={(event) =>
              setEdits((previous) => ({ ...previous, [current.id]: event.target.value }))
            }
          />
          <Diagnostics fromSource={parsed.diagnostics} fromReading={fromReading} />
        </section>

        <section className="explorer__section docs__panel" aria-labelledby="reading-heading">
          <div className="explorer__section-head">
            <h2 id="reading-heading">The reading</h2>
            <div className="control__buttons" role="group" aria-labelledby="documents-mode-label">
              <span className="docs__modes-label" id="documents-mode-label">
                mode
              </span>
              {MODES.map((entry) => {
                const pressed = entry === mode;

                return (
                  <button
                    key={entry}
                    type="button"
                    aria-pressed={pressed}
                    className={pressed ? "is-active" : undefined}
                    onClick={() => setMode(entry)}
                  >
                    {MODE_LABELS[entry]}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="docs__source-label">
            Rendered by <code>&lt;Reader&gt;</code> from the text on the left, and
            every choice, bar and dial in it is the document's own. <code>book</code>{" "}
            and <code>editorial</code> measure this frame and paginate into it.
          </p>
          <div className="docs__stage">
            <Reader
              document={parsed.document}
              mode={mode}
              registry={PLAYGROUND_REGISTRY}
              onDiagnostics={onDiagnostics}
              theme={{ maxHeight: "100%" }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

type DiagnosticsProps = {
  fromSource: Diagnostic[];
  fromReading: Diagnostic[];
};

/**
 * Diagnostics, shown rather than swallowed.
 *
 * `parse` never throws and the renderer never throws: what they could not read
 * comes back as data, and a visitor who breaks the source deliberately should see
 * exactly what the parser saw. The two origins are kept apart because they are
 * different moments — one read the file, the other rendered a state of it — and
 * the line number is only ever the file's.
 */
function Diagnostics({ fromSource, fromReading }: DiagnosticsProps) {
  const total = fromSource.length + fromReading.length;
  const errors =
    fromSource.filter((entry) => entry.severity === "error").length +
    fromReading.filter((entry) => entry.severity === "error").length;

  return (
    <section className="docs__diagnostics" aria-labelledby="document-diagnostics-heading">
      <h3 className="docs__diagnostics-heading" id="document-diagnostics-heading">
        Diagnostics
        <span className="docs__diagnostics-count">
          {total === 0
            ? "none"
            : `${total}${errors > 0 ? `, ${errors} of them errors` : ", warnings only"}`}
        </span>
      </h3>
      {total === 0 ? (
        <p className="docs__diagnostics-empty">
          The parser read every line and the renderer resolved every name.
        </p>
      ) : (
        <ul className="docs__diagnostics-list">
          {fromSource.map((entry, position) => (
            <DiagnosticLine key={`source-${position}`} entry={entry} origin="source" />
          ))}
          {fromReading.map((entry, position) => (
            <DiagnosticLine key={`reading-${position}`} entry={entry} origin="reading" />
          ))}
        </ul>
      )}
    </section>
  );
}

function DiagnosticLine({ entry, origin }: { entry: Diagnostic; origin: "source" | "reading" }) {
  return (
    <li className={`docs__diagnostic docs__diagnostic--${entry.severity}`}>
      <span className="docs__diagnostic-severity">{entry.severity}</span>
      <span className="docs__diagnostic-where">
        {entry.line === undefined ? origin : `${origin} line ${entry.line}`}
      </span>
      <span className="docs__diagnostic-message">{entry.message}</span>
    </li>
  );
}
