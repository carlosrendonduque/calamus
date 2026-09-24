/**
 * `ctx.hold()`: the resource a slot uses, whose life the library owns.
 *
 * The rule the contract fixes (§7.4) is that an `AudioContext`, an observer or a
 * timer is acquired **only inside a gesture** and released by the library, at
 * most one live value per `(instance, key)`. A slot that builds one on its own
 * builds it twice — React 18 duplicates effects in strict mode, and the compiler
 * route may render a measuring pass — and nobody closes either.
 *
 * A `Map` and a flag. No dependency, and none needed.
 */

export type Holder = {
  hold: <T>(instance: string, key: string, acquire: () => T, release: (value: T) => void) => T | null;
  /** Opens the gate for the duration of one real press. */
  duringGesture: <T>(run: () => T) => T;
  /** Whether a real press is in flight. A write outside one is refused, which is
   *  what makes a slot that writes while rendering harmless instead of a loop. */
  inGesture: () => boolean;
  /** Drops everything: unmount, reset, a node replaced, a page discarded. */
  releaseAll: () => void;
};

type Held = { value: unknown; release: (value: unknown) => void };

export function createHolder(): Holder {
  const held = new Map<string, Held>();
  let inGesture = false;

  return {
    hold<T>(instance: string, key: string, acquire: () => T, release: (value: T) => void): T | null {
      const id = `${instance}\u0000${key}`;
      const found = held.get(id);

      if (found) {
        return found.value as T;
      }

      // Outside a gesture there is nothing to acquire and no autoplay is
      // possible. A slot has to render with `null`, which is what makes it
      // drawable without its resource — silent until pressed, with its state
      // written out as text.
      if (!inGesture) {
        return null;
      }

      const value = acquire();
      held.set(id, { value, release: release as (value: unknown) => void });
      return value;
    },

    inGesture(): boolean {
      return inGesture;
    },

    duringGesture<T>(run: () => T): T {
      const before = inGesture;
      inGesture = true;

      try {
        return run();
      } finally {
        inGesture = before;
      }
    },

    releaseAll(): void {
      for (const entry of held.values()) {
        try {
          entry.release(entry.value);
        } catch {
          // A release that throws must not stop the next one.
        }
      }

      held.clear();
    },
  };
}

/** The holder of the measuring pass, where the capability is absent rather than
 *  forbidden: `hold` answers null and there is nothing to break. */
export const INERT_HOLDER: Holder = {
  hold: () => null,
  // Nothing is ever in flight here, and nothing is measuring either: this is the
  // holder a caller that renders without a reader gets, and there `commit` is
  // still allowed, because there is no reader to loop.
  inGesture: () => true,
  duringGesture: (run) => run(),
  releaseAll: () => undefined,
};
