import { useState } from "react";
import "./voice.css";

type Voice = { id: string; who: string; source: string; account: string };

/** One stair, counted three times by people who will not agree about it. */
const VOICES: Voice[] = [
  {
    id: "surveyor",
    who: "The surveyor",
    source: "Survey of the north stair, second visit",
    account:
      "The stair is nineteen risers. It was counted twice, on separate days, and the second count agrees with the first to the inch."
  },
  {
    id: "lodger",
    who: "The lodger",
    source: "Letter, undated, second floor back",
    account:
      "Going up there are nineteen steps. Coming down there are twenty. I have written to the office about it, and I have stopped counting."
  },
  {
    id: "editor",
    who: "The editor",
    source: "Note added to the file before it was copied",
    account:
      "Both counts above reached us from the same correspondent, four months apart, and neither of them matches the plan lodged with the building."
  }
];

export function Narrators() {
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const current = VOICES.find((voice) => voice.id === voiceId) ?? VOICES[0];

  return (
    <div className="playground__narrators">
      <div className="playground__case-controls" role="group" aria-label="Whose account to read">
        {VOICES.map((voice) => (
          <button
            key={voice.id}
            type="button"
            aria-pressed={voice.id === current.id}
            className={voice.id === current.id ? "is-active" : undefined}
            onClick={() => setVoiceId(voice.id)}
          >
            {voice.who}
          </button>
        ))}
      </div>

      {/* One quotation that changes hands. The caption is what says the speaker
          moved; the typeface only agrees with it. */}
      <figure className={`playground__narrator is-${current.id}`}>
        <blockquote aria-live="polite">{current.account}</blockquote>
        <figcaption>
          <span className="playground__narrator-who">{current.who}</span>
          {current.source}
        </figcaption>
      </figure>
    </div>
  );
}
