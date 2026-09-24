import { useEffect, useRef, useState } from "react";
import "./media.css";

/** Quiet on purpose: a reading surface should not shout. */
const LEVEL = 0.1;
const HZ = 218;

/**
 * Sound with no file behind it. The AudioContext is built on the first press,
 * never before, and closed again when the example leaves the page.
 */
export function MediaTone() {
  const [sounding, setSounding] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const voice = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);

  // The one teardown that matters: an AudioContext outlives its component.
  useEffect(() => () => void context.current?.close(), []);

  const start = () => {
    const ctx = context.current ?? new AudioContext();
    context.current = ctx;
    void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = HZ;
    // Ramped, not switched: a gain that jumps from zero clicks audibly.
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(LEVEL, ctx.currentTime + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    voice.current = { osc, gain };
    setSounding(true);
  };

  const stop = () => {
    const ctx = context.current;
    if (ctx && voice.current) {
      voice.current.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.09);
      voice.current.osc.stop(ctx.currentTime + 0.12);
      voice.current = null;
    }
    setSounding(false);
  };

  return (
    <div className="playground__media-case">
      <p>
        Exhibit 7. The clerk wrote that the building held a note of its own and gave the pitch to
        within a few cycles a second. This is that pitch, made by the page when you ask for it.
      </p>
      <div className="playground__case-controls">
        <button
          type="button"
          aria-pressed={sounding}
          onClick={sounding ? stop : start}
        >
          {sounding ? "Stop the tone" : "Sound the tone"}
        </button>
      </div>
      <p className="playground__media-readout" role="status">
        {sounding ? `Sounding: one sine voice at ${HZ} Hz.` : "Silent. Nothing plays until you press."}
      </p>
      <p className="playground__case-note">
        No file, no request, no autoplay, and one button that both starts and stops. The state is
        written out in text as well, so the example still reports itself with the volume down.
      </p>
    </div>
  );
}
