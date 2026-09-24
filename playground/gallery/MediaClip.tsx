import { useEffect, useState } from "react";
import "./media.css";

const DURATION = 12;
const EVENT_AT = 6;
const CRATES = [[52, 86], [116, 58], [210, 46]];

/** The camera's cone at second `t`: one pan, at its far right when second six comes round. */
function cone(t: number): string {
  const bearing = 52 * Math.sin((2 * Math.PI * (t - EVENT_AT / 2)) / DURATION);
  const edge = (offset: number) => {
    const radians = ((bearing + offset - 90) * Math.PI) / 180;
    return `${160 + 170 * Math.cos(radians)},${150 + 170 * Math.sin(radians)}`;
  };
  return `160,150 ${edge(-13)} ${edge(13)}`;
}

function timecode(t: number): string {
  return `00:${Math.floor(t).toString().padStart(2, "0")}.${Math.floor((t % 1) * 10)}`;
}

/**
 * A moving image with no video file: every frame is recomputed from one number,
 * and that number is on the page, so an annotation can point at a moment.
 */
export function MediaClip() {
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [calm] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const seen = Math.abs(t - EVENT_AT) < 1.2;
  const alt = `A room swept by one camera at ${timecode(t)}, with ${seen ? "four" : "three"} crates in view.`;

  useEffect(() => {
    if (!running) {
      return;
    }
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      // The elapsed span is worked out here and passed in by value: an updater
      // that read `last` would read it again after the next frame moved it.
      const elapsed = (now - last) / 1000;
      last = now;
      setT((previous) => (previous + elapsed) % DURATION);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return (
    <figure className="playground__media-case">
      <svg className="playground__media-plate" viewBox="0 0 320 170" role="img" aria-label={alt}>
        <rect className="playground__media-ground" width="320" height="170" />
        <polygon className="playground__media-beam" points={cone(t)} />
        <g className="playground__media-crate">
          {CRATES.map(([x, y]) => <rect key={x} x={x} y={y} width="20" height="16" />)}
          {seen ? <rect className="playground__media-odd" x="240" y="71" width="20" height="16" /> : null}
        </g>
        <circle className="playground__media-camera" cx="160" cy="150" r="6" />
      </svg>
      <div className="playground__case-controls">
        <button type="button" disabled={calm} aria-pressed={running} onClick={() => setRunning((value) => !value)}>
          {running ? "Hold" : "Run the pan"}
        </button>
        <label className="playground__media-range">
          <span>time</span>
          <input type="range" min={0} max={DURATION} step={0.1} value={t}
            onChange={(event) => setT(Number(event.target.value))} />
          <output className="playground__media-timecode">{timecode(t)}</output>
        </label>
      </div>
      <figcaption className="playground__media-caption" aria-live="polite">
        {seen ? "00:06 — a fourth crate stands where the plan filed with this clip shows none." : ""}
      </figcaption>
      <p className="playground__case-note">
        {calm
          ? "Your system asks for reduced motion, so the pan will not run itself. Drag the slider."
          : "Nothing moves until you press, and the slider reaches every frame without any motion."}
      </p>
    </figure>
  );
}
