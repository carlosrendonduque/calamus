import { useState } from "react";
import type { CSSProperties } from "react";
import { tristramShandy } from "../../examples/corpus/sterne-tristram-shandy";
import "./typography.css";

const PARAGRAPHS = tristramShandy.body.slice(7, 10);

/**
 * This one is not about hypertext but about the surface hypertext is printed on:
 * the reading itself, not the words, is what changes. The count and the gutter
 * are two numbers handed to CSS as `--cols` and `--gutter`, and `columns` and
 * `column-gap` do the rest.
 *
 * Two things a writer should know before reaching for it. The count is a ceiling,
 * not a promise: the `columns` shorthand also names a minimum column width, so a
 * narrow screen is served fewer columns instead of nine-character lines. And a
 * paragraph is cut wherever the column ends, mid-sentence, which is either the
 * effect you wanted or a reason not to.
 */
export function TypeColumns() {
  const [cols, setCols] = useState(2);
  const [gutter, setGutter] = useState(28);

  return (
    <div className="playground__type-columns">
      <div className="playground__case-controls" role="group" aria-label="Column count">
        {[1, 2, 3].map((count) => (
          <button
            key={count}
            type="button"
            aria-pressed={count === cols}
            className={count === cols ? "is-active" : undefined}
            onClick={() => setCols(count)}
          >
            {count === 1 ? "1 column" : `${count} columns`}
          </button>
        ))}
      </div>

      <div className="control control--range">
        <label className="control__label" htmlFor="type-columns-gutter">
          gutter
        </label>
        <span className="control__range">
          <input
            id="type-columns-gutter"
            type="range"
            min={0}
            max={64}
            step={2}
            value={gutter}
            onChange={(event) => setGutter(Number(event.target.value))}
          />
          {/* An `output` is a status region already; the role is spelt out because
              this one reports the whole surface, not just the slider's value. */}
          <output htmlFor="type-columns-gutter" role="status">
            {`${cols} up, ${gutter}px gutter`}
          </output>
        </span>
      </div>

      <div
        className="playground__type-column-block"
        style={{ "--cols": cols, "--gutter": gutter } as CSSProperties}
      >
        {PARAGRAPHS.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <p className="playground__case-note">
        Laurence Sterne, Tristram Shandy, 1759. Take the gutter to zero at three columns and they
        touch, which is the argument for having one. The count is a ceiling rather than a promise: no
        column here is narrower than 13rem, so a narrow screen is given fewer than you asked for.
      </p>
    </div>
  );
}
