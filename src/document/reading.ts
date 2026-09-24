/**
 * The reading: the state machine the renderer's affordances dispatch into.
 *
 * `reduce` from `state.ts` does all the arithmetic of the trail and the logs;
 * this file adds the three things a reading has that the reducer deliberately
 * does not — which regions are open, where the focus is going, and what the
 * announcer is allowed to say — and keeps them out of `ReadingState` so that the
 * state stays serialisable to JSON in one piece.
 *
 * Why those three are not state:
 *
 * - **Open regions.** A region reveals in place, so it is not the trail. It is
 *   not a variable either, because the author never declared one for it. It is
 *   the reader's position inside a node, and a position is not a value.
 * - **The focus.** A focus move happens once, at a moment; a state describes a
 *   situation. Putting the focus in the state would move it again on every
 *   re-render, including the ones a resize causes.
 * - **The announcement.** Decision 14b: the announcer stays empty until the
 *   first *real* turn, because mounting renders and re-paginates. Only a gesture
 *   sets it, which is exactly the distinction a state cannot make.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NarrativeDocument, ReadingState } from "./types";
import type { Move } from "./evaluator";
import { initialState, reduce } from "./evaluator";
import type { Gesture } from "./moves";
import { isEmptyGesture } from "./moves";
import type { Holder } from "./hold";
import { createHolder } from "./hold";

export type Reading = {
  state: ReadingState;
  /** Region ids the reader has revealed. */
  shown: ReadonlySet<string>;
  /** Bumped on every real change, so a stale write from a replayed handler can
   *  be refused rather than applied twice. */
  revision: number;
  /** False until the reader's first real gesture (decision 14b). */
  hasMoved: boolean;
  /** What the announcer should say, when the author declared it. Null means
   *  "say whatever the live blocks now say". */
  announcement: string | null;
  /** The authored id the focus is going to, and a tick so that asking twice for
   *  the same id is two requests. */
  focus: { id: string; tick: number } | null;
  perform: (gesture: Gesture) => void;
  dispatch: (move: Move) => void;
  holder: Holder;
};

export function useReading(document: NarrativeDocument, opening?: ReadingState): Reading {
  const [state, setState] = useState<ReadingState>(() => opening ?? initialState(document.opens ?? {}));
  const [shown, setShown] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [revision, setRevision] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; tick: number } | null>(null);
  const tick = useRef(0);
  const holder = useMemo(createHolder, []);

  /**
   * A new document is a new reading. The old one's resources go with it: an
   * `AudioContext` outliving its document is exactly the leak the contract
   * names.
   *
   * The guard is a ref rather than the effect's own first run, so that mounting
   * does not reset a reading that has only just been built. **Identity is the
   * test**, which puts one obligation on the host: a `document` prop rebuilt on
   * every render is a new document on every render, and the reading restarts.
   * Passing `source` instead avoids it — the reader memoises that parse itself —
   * and `ReaderProps.document` says so.
   */
  const previous = useRef(document);

  useEffect(() => {
    if (previous.current === document) {
      return;
    }

    previous.current = document;
    setState(opening ?? initialState(document.opens ?? {}));
    setShown(new Set<string>());
    setHasMoved(false);
    setAnnouncement(null);
    setFocus(null);
    holder.releaseAll();
    // `opening` is a starting value, not a dependency: a host that rebuilds the
    // object on every render must not restart the reading on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document, holder]);

  useEffect(() => () => holder.releaseAll(), [holder]);

  const perform = useCallback(
    (gesture: Gesture) => {
      if (isEmptyGesture(gesture)) {
        return;
      }

      holder.duringGesture(() => {
        if (gesture.moves.length > 0) {
          setState((before) =>
            gesture.moves.reduce(
              (carried, move) => reduce(carried, move, { groups: document.groups }),
              before
            )
          );
        }

        if (gesture.show.length > 0 || gesture.hide.length > 0) {
          setShown((before) => {
            const next = new Set(before);
            for (const id of gesture.show) next.add(id);
            for (const id of gesture.hide) next.delete(id);
            return next;
          });
        }

        if (gesture.focus) {
          tick.current += 1;
          setFocus({ id: gesture.focus, tick: tick.current });
        }

        // This is the whole of decision 14b in one line: the announcer starts
        // talking here, at a gesture, and never at a mount or a re-measure.
        setAnnouncement(gesture.announce);
        setHasMoved(true);
        setRevision((before) => before + 1);
      });
    },
    [document.groups, holder]
  );

  const dispatch = useCallback(
    (move: Move) => {
      perform({ moves: [move], show: [], hide: [], focus: null, announce: null, from: null, diagnostics: [] });
    },
    [perform]
  );

  return { state, shown, revision, hasMoved, announcement, focus, perform, dispatch, holder };
}
