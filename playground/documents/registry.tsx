import type { ReactNode } from "react";
import type { DocumentRegistry, MarkComponent, ReadingState } from "../../src";

/**
 * What this page fills of the registry seam, and what it deliberately does not.
 *
 * **`orders`.** `unstable-links` names one. An ordering is the single class of
 * name that degrades without leaving residue — the page looks perfect and the
 * work is a different work — so a demo that means to show that document has to
 * serve it.
 *
 * **`marks`.** Nine entries, keyed by the name the authors' `as:` gives them:
 * `cover`, `highlight`, `strike`, `label`, `reference`, `note`, `underline`,
 * `hedge`, `rule`. This is the whole point of `as:` — the kind is the author's
 * word and the entry is the host's — and it is also the only way a conditional
 * mark can be seen at all, because an entry is invoked **only when the mark's
 * condition holds** while the `data-mark` attribute is written only when the mark's condition holds.
 *
 * **`views`.** Neither of the two the nineteen ask for can be served honestly
 * from here. `meta-editor` declares its slot's parameters under `slots:` and the
 * parser keeps only the name, so an entry would have to hard-code the
 * document's own table of rules; and `route-snapshots` is the one of the
 * nineteen the format cannot hold. Both are left missing on purpose, and the
 * diagnostics panel is where they say so.
 */

/** A stable seed for the reading, so the shuffle moves when the reading moves
 *  and holds still while the reader reads. */
function seedOf(state: ReadingState): number {
  let seed = state.trail.length * 31 + (state.readings ?? 1) * 7;

  for (const entries of Object.values(state.logs ?? {})) {
    seed = seed * 33 + entries.length;
  }

  return seed;
}

/** A small integer hash, enough to order five ids differently per seed. */
function hash(id: string, seed: number): number {
  let value = seed * 2654435761;

  for (let index = 0; index < id.length; index += 1) {
    value = (value * 31 + id.charCodeAt(index)) % 2147483647;
  }

  return value;
}

/** The author's accessible note, said once where a title attribute would only
 *  be hovered. The library resolves the prose; this only places it. */
function withNote(note: string | undefined, content: ReactNode): ReactNode {
  if (!note) {
    return content;
  }

  return (
    <>
      {content}
      <span className="docs-sr-only">{` (${note})`}</span>
    </>
  );
}

const cover: MarkComponent = ({ children }) => (
  <span className="docs-mark docs-mark--cover">{children}</span>
);

const highlight: MarkComponent = ({ children, note }) => (
  <mark className="docs-mark docs-mark--highlight" title={note}>
    {withNote(note, children)}
  </mark>
);

const strike: MarkComponent = ({ children, note }) => (
  <s className="docs-mark docs-mark--strike" title={note}>
    {withNote(note, children)}
  </s>
);

const label: MarkComponent = ({ children }) => (
  <span className="docs-mark docs-mark--label">{children}</span>
);

const reference: MarkComponent = ({ children }) => (
  <sup className="docs-mark docs-mark--reference">{children}</sup>
);

const note: MarkComponent = ({ children, note: said }) => (
  <span className="docs-mark docs-mark--note" title={said}>
    {withNote(said, children)}
  </span>
);

const underline: MarkComponent = ({ children, note: said }) => (
  <u className="docs-mark docs-mark--underline" title={said}>
    {withNote(said, children)}
  </u>
);

const hedge: MarkComponent = ({ children }) => (
  <em className="docs-mark docs-mark--hedge">{children}</em>
);

const rule: MarkComponent = ({ children }) => (
  <span className="docs-mark docs-mark--rule">{children}</span>
);

export const PLAYGROUND_REGISTRY: DocumentRegistry = {
  marks: { cover, highlight, strike, label, reference, note, underline, hedge, rule },
  orders: {
    /**
     * `unstable`: the turnings you did not take change places while you are
     * reading. Sorting the ids the renderer handed over is a permutation by
     * construction, which is the one invariant an ordering owes.
     */
    unstable: (ids, state) => {
      const seed = seedOf(state);

      return [...ids].sort((left, right) => hash(left, seed) - hash(right, seed));
    }
  }
};
