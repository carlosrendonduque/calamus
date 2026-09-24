import { useState } from "react";
import "./media.css";

const CAPTION =
  "Plate A. The corridor runs straight to the far door. The lamp on the left wall throws the " +
  "figure's shadow clear of the threshold.";

const MARK_NOTE =
  "The shadow lies between the figure and the lamp, on the side the light comes from. Either the " +
  "lamp was not burning when the plate was made, or the plate has been printed the wrong way round.";

const ALT =
  "A corridor drawn in perspective, a lamp burning on the left wall, and a standing figure whose " +
  "shadow falls towards the lamp instead of away from it.";

/**
 * An image the page draws for itself, and a caption that does not survive
 * looking at it. Nothing is fetched: the photograph is a dozen shapes.
 */
export function MediaCaption() {
  const [marked, setMarked] = useState(false);

  return (
    <figure className="playground__media-case">
      <svg className="playground__media-plate" viewBox="0 0 320 200" role="img" aria-label={ALT}>
        <rect className="playground__media-ground" width="320" height="200" />
        <path className="playground__media-floor" d="M0 200 L140 120 L200 120 L320 200 Z" />
        {/* Perspective: four edges running to one vanishing point behind the door. */}
        <path className="playground__media-line" d="M0 200 L140 120 M320 200 L200 120 M0 0 L140 76 M320 0 L200 76" />
        <rect className="playground__media-door" x="140" y="76" width="60" height="44" />
        <g className="playground__media-lamp">
          <circle cx="52" cy="66" r="8" />
          <path d="M52 74 L52 94" />
        </g>
        <ellipse className="playground__media-shadow" cx="200" cy="169" rx="44" ry="7" />
        <g className="playground__media-person">
          <circle cx="234" cy="130" r="9" />
          <path d="M234 139 L234 168 M234 147 L222 160 M234 147 L246 160" />
        </g>
        {marked ? (
          <g className="playground__media-mark">
            <ellipse cx="200" cy="169" rx="56" ry="16" />
            <path d="M144 169 L96 188" />
            <text x="92" y="192" textAnchor="end">
              shadow
            </text>
          </g>
        ) : null}
      </svg>
      <figcaption className="playground__media-caption">{CAPTION}</figcaption>
      <div className="playground__case-controls">
        <button
          type="button"
          aria-pressed={marked}
          onClick={() => setMarked((value) => !value)}
        >
          {marked ? "Clear the editor's mark" : "Mark what the caption misses"}
        </button>
      </div>
      <p className="playground__media-note" aria-live="polite">
        {marked ? MARK_NOTE : ""}
      </p>
      <p className="playground__case-note">
        The plate is inline SVG, so it costs no request and cannot rot. Both accounts of it, the
        caption and the mark, are ordinary text: selectable, searchable, and read aloud in order.
      </p>
    </figure>
  );
}
