import { useState } from "react";
import type { CSSProperties } from "react";
import "./typography.css";

const LINE = "The door on the left is the one we came in by.";

/**
 * The same line twice: once as set, once through glass. The flip is two numbers
 * handed to CSS as `--flip-x` and `--flip-y` and applied as one `scale()`, so
 * the reflected paragraph holds the sentence forwards. Reversing the characters
 * instead would have produced a line only a mirror could read, and that nothing
 * else — a screen reader, a search, a copy-paste — could.
 *
 * The mirror is not decoration here. On the far side of the glass the sentence
 * is still true and no longer means the same door.
 */
export function TypeMirror() {
  const [flipX, setFlipX] = useState(true);
  const [flipY, setFlipY] = useState(false);

  const turned = flipX && flipY ? "on both axes" : flipX ? "left for right" : flipY ? "top for bottom" : "not at all";

  return (
    <div className="playground__type-mirror">
      <div className="playground__case-controls" role="group" aria-label="Mirror axis">
        <button
          type="button"
          aria-pressed={flipX}
          className={flipX ? "is-active" : undefined}
          onClick={() => setFlipX((previous) => !previous)}
        >
          Left for right
        </button>
        <button
          type="button"
          aria-pressed={flipY}
          className={flipY ? "is-active" : undefined}
          onClick={() => setFlipY((previous) => !previous)}
        >
          Top for bottom
        </button>
      </div>

      <figure className="playground__type-glass">
        <p className="playground__type-face">{LINE}</p>
        <p
          className="playground__type-reflection"
          style={{ "--flip-x": flipX ? -1 : 1, "--flip-y": flipY ? -1 : 1 } as CSSProperties}
        >
          {LINE}
        </p>
        <figcaption className="playground__case-note">
          {`The lower line is the same string as the upper one, turned ${turned}.`}
        </figcaption>
      </figure>

      <p className="playground__case-note">
        Read the reflection and the instruction has changed hands: the door on its left is the door on
        your right. Nothing in the text moved, so both copies are announced and found in their normal
        order; only the pixels are reversed.
      </p>
    </div>
  );
}
