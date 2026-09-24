import { useState } from "react";
import "./voice.css";

type Track = "door" | "empty";

/** Plain prose, or a word that one of the two marking passes has claimed. */
type Token = string | { word: string; track: Track };

const PASSAGE: Token[] = [
  "The inventory lists one ",
  { word: "door", track: "door" },
  " on the landing. The clerk who signed it wrote that the landing stood ",
  { word: "empty", track: "empty" },
  ", and the clerk who countersigned it wrote that the ",
  { word: "door", track: "door" },
  " had been counted twice and that the landing was never ",
  { word: "empty", track: "empty" },
  " at all."
];

/** Each pass carries a shape as well as a colour, and a phrase for a reader who has neither. */
const TRACKS: Record<Track, { verb: string; note: string }> = {
  door: { verb: "keeps", note: "kept by the second clerk" },
  empty: { verb: "strikes", note: "struck by the second clerk" }
};

const NAMES: Track[] = ["door", "empty"];

export function Motifs() {
  const [passes, setPasses] = useState<Record<Track, boolean>>({ door: true, empty: true });
  const showing = PASSAGE.filter((token) => typeof token !== "string" && passes[token.track]).length;

  return (
    <div className="playground__motifs">
      <div className="playground__motif-passes">
        {NAMES.map((name) => (
          <label key={name} className="playground__motif-pass">
            <input
              type="checkbox"
              checked={passes[name]}
              onChange={(event) =>
                setPasses((previous) => ({ ...previous, [name]: event.target.checked }))
              }
            />
            {`The pass that ${TRACKS[name].verb} "${name}"`}
          </label>
        ))}
      </div>

      <p className="playground__motif-text">
        {PASSAGE.map((token, index) => {
          if (typeof token === "string") return <span key={index}>{token}</span>;
          if (!passes[token.track]) return <span key={index}>{token.word}</span>;

          const note = <span className="playground__sr-only">{` (${TRACKS[token.track].note}) `}</span>;

          // A real element per meaning, so the mark survives losing the colour.
          return token.track === "door" ? (
            <mark key={index} className="playground__motif is-kept">
              {token.word}
              {note}
            </mark>
          ) : (
            <s key={index} className="playground__motif is-struck">
              {token.word}
              {note}
            </s>
          );
        })}
      </p>

      <p className="playground__case-note" role="status">
        {showing === 0
          ? "No pass is marking. The paragraph is the first clerk's alone."
          : `${showing} of 4 words marked: kept words are highlighted and underlined, struck words are ruled through.`}
      </p>
    </div>
  );
}
