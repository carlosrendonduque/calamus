import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import "./media.css";

const DURATION = 12;

const CLAIMS = [
  { at: 3, text: "The light enters at the near end, already moving faster than a walk." },
  { at: 6, text: "The far door stands open, though the plan filed with the clip has it walled up." },
  { at: 9, text: "The light stops, holds for a beat, and resumes at the same speed." }
];

function label(t: number): string {
  return `00:${Math.floor(t).toString().padStart(2, "0")}`;
}

/**
 * The same problem as the clip, taken the other way round: the motion is a
 * paused CSS animation scrubbed by a negative delay, so the frame is a function
 * of `--t` alone and a claim can seek straight to the second it is about.
 */
export function MediaEvidenceBoard() {
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [calm] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (!running) {
      return;
    }
    const id = setInterval(() => setT((previous) => (Math.round(previous * 10) + 1) / 10 % DURATION), 100);
    return () => clearInterval(id);
  }, [running]);

  return (
    <div className="playground__media-case">
      <svg
        className="playground__media-plate"
        viewBox="0 0 320 120"
        role="img"
        aria-label={`A corridor with a light travelling along it, at ${label(t)} of twelve seconds.`}
        style={{ "--t": t } as CSSProperties}
      >
        <rect className="playground__media-ground" width="320" height="120" />
        <path className="playground__media-line" d="M0 26 L320 26 M0 96 L320 96" />
        <rect className="playground__media-flare" x="250" y="32" width="30" height="62" />
        <g className="playground__media-travel">
          <circle className="playground__media-glow" cx="30" cy="58" r="9" />
          <rect x="26" y="67" width="8" height="28" />
        </g>
      </svg>
      <div className="playground__case-controls">
        <button type="button" disabled={calm} aria-pressed={running} onClick={() => setRunning((value) => !value)}>
          {running ? "Hold" : "Run the clip"}
        </button>
        <label className="playground__media-range">
          <span>time</span>
          <input type="range" min={0} max={DURATION} step={0.1} value={t}
            onChange={(event) => setT(Number(event.target.value))} />
          <output className="playground__media-timecode">{label(t)}</output>
        </label>
      </div>
      <ul className="playground__media-claims" role="list">
        {CLAIMS.map((claim) => {
          const near = Math.abs(t - claim.at) < 0.8;
          return (
            <li key={claim.at} aria-current={near ? "true" : undefined}>
              <button type="button" aria-label={`Seek to ${label(claim.at)}`} onClick={() => setT(claim.at)}>
                {label(claim.at)}
              </button>
              <span>{claim.text}</span>
            </li>
          );
        })}
      </ul>
      <p className="playground__case-note">
        {calm
          ? "Your system asks for reduced motion, so nothing runs by itself: seek by claim or slider."
          : "Each claim is a button that seeks to its own second, and the reading marks itself as current."}
      </p>
    </div>
  );
}
