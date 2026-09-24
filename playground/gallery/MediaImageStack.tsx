import { useState } from "react";
import "./media.css";

/** One crop for both plates: the surveys are comparable because the box is shared. */
const CROP = "0 0 200 140";

const WINDOWS = [40, 78, 140];
const STEPS = [0, 1, 2, 3, 4];

type PlateProps = { label: string; windows: number; doorway: boolean; stair: boolean; marked: boolean };

function Plate({ label, windows, doorway, stair, marked }: PlateProps) {
  const alt = `${label}: a floor plan with ${windows} windows in the north wall, ${
    doorway ? "a doorway" : "no doorway"
  } in the east wall, and ${stair ? "a stair" : "no stair"} in the south-west corner.`;

  return (
    <figure className="playground__media-cell">
      <svg className="playground__media-plate" viewBox={CROP} role="img" aria-label={alt}>
        <rect className="playground__media-ground" width="200" height="140" />
        <rect className="playground__media-wall" x="14" y="14" width="172" height="112" />
        <path className="playground__media-wall" d="M110 14 L110 88" />
        {WINDOWS.slice(0, windows).map((x) => (
          <path className="playground__media-window" key={x} d={`M${x} 14 h22`} />
        ))}
        {doorway ? (
          <>
            <path className="playground__media-gap" d="M186 58 v26" />
            <path className="playground__media-swing" d="M186 58 a26 26 0 0 0 -26 26" />
          </>
        ) : null}
        {stair ? (
          <g className="playground__media-stair">
            {STEPS.map((step) => (
              <path key={step} d={`M24 ${96 + step * 6} h30`} />
            ))}
          </g>
        ) : null}
        {/* The same two coordinates in both plates, which is the whole point of one crop. */}
        {marked ? (
          <g className="playground__media-mark">
            <circle cx="172" cy="71" r="17" />
            <circle cx="151" cy="20" r="15" />
          </g>
        ) : null}
      </svg>
      <figcaption className="playground__media-cell-label">{label}</figcaption>
    </figure>
  );
}

export function MediaImageStack() {
  const [marked, setMarked] = useState(false);

  return (
    <div className="playground__media-case">
      <p>
        The same room, surveyed eleven years apart. Both plans are drawn into one shared box, so a
        difference in the drawing is a difference in the room and not in the framing.
      </p>
      <div className="playground__media-pair">
        <Plate label="Survey, 1911" windows={3} doorway stair={false} marked={marked} />
        <Plate label="Survey, 1922" windows={2} doorway={false} stair marked={marked} />
      </div>
      <div className="playground__case-controls">
        <button
          type="button"
          aria-pressed={marked}
          onClick={() => setMarked((value) => !value)}
        >
          {marked ? "Clear the rings" : "Ring the two differences"}
        </button>
      </div>
      <p className="playground__case-note" aria-live="polite">
        {marked
          ? "East wall: a doorway in 1911, solid in 1922. North wall: the third window is gone."
          : "One overlay, drawn at the same coordinates in each plate, lands on the same wall in both."}
      </p>
    </div>
  );
}
