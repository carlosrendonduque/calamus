import { useEffect, useRef, useState } from "react";
import "./media.css";

type Layer = "room" | "report";
type Voice = { osc: OscillatorNode; gain: GainNode };

const BASE = 218;
const APART = 3;
const LEVEL = 0.08;

const LABELS: Record<Layer, string> = {
  room: `Layer 1, the room: a steady tone at ${BASE} Hz.`,
  report: `Layer 2, the report: the same tone, ${APART} Hz off pitch.`
};

/**
 * Two voices, switched on one at a time, and an interference that belongs to
 * neither: three cycles apart, the pair beats three times a second.
 */
export function MediaAudioLayers() {
  const [on, setOn] = useState<Record<Layer, boolean>>({ room: false, report: false });
  const context = useRef<AudioContext | null>(null);
  const voices = useRef<Partial<Record<Layer, Voice>>>({});

  useEffect(() => () => void context.current?.close(), []);

  const toggle = (layer: Layer) => {
    const ctx = context.current ?? new AudioContext();
    context.current = ctx;
    const live = voices.current[layer];

    if (live) {
      live.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.09);
      live.osc.stop(ctx.currentTime + 0.12);
      delete voices.current[layer];
    } else {
      void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = layer === "room" ? BASE : BASE + APART;
      // Ramped, not switched: a gain that jumps from zero clicks audibly.
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(LEVEL, ctx.currentTime + 0.09);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      voices.current[layer] = { osc, gain };
    }

    setOn((previous) => ({ ...previous, [layer]: !live }));
  };

  const both = on.room && on.report;

  return (
    <div className="playground__media-case">
      <p>Two sound layers of one account, laid over each other rather than played in turn.</p>
      <ul className="playground__media-layers" role="list">
        {(Object.keys(LABELS) as Layer[]).map((layer) => (
          <li key={layer}>
            <button
              type="button"
              aria-pressed={on[layer]}
              onClick={() => toggle(layer)}
            >
              {on[layer] ? "Stop" : "Sound"}
            </button>
            <span>{LABELS[layer]}</span>
          </li>
        ))}
      </ul>
      <p className="playground__media-readout" role="status">
        {both
          ? `Both layers sounding: they beat ${APART} times a second.`
          : "Sound both layers together. Either one alone is only a tone."}
      </p>
      <p className="playground__case-note">
        The beat is in neither layer. It is what the reader makes by holding both at once.
      </p>
    </div>
  );
}
