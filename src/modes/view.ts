/**
 * What every mode is handed.
 *
 * Decision 22 took the two contracts apart: there is one document, and a mode is
 * a way of presenting it. So no mode receives `ReaderContent` any more, and no
 * mode reaches into a document either — it receives the rendered reading and
 * arranges it. A mode is presentation and nothing else, which is why `scroll`,
 * `book`, `terminal` and `editorial` now differ only in their chrome and their
 * scrolling.
 */

import type { ReactNode } from "react";
import type { ReaderLabels, ReaderTransition } from "../types";

export type ReadingView = {
  title: string;
  subtitle?: string;
  /** The document's prose, already rendered. */
  body: ReactNode;
  /** The reader's controls, when the document declares any. */
  controls: ReactNode;
  /** The exits of the node the reader is on; null for a flat document. */
  exits: ReactNode;
  /** The library's one hidden announcer. Every mode renders it, none owns it. */
  announcer: ReactNode;
  readingTimeText: string;
  labels: Required<ReaderLabels>;
  transition: ReaderTransition;
  /**
   * Changes whenever the reading changes. The paginator re-measures on it,
   * which is what lets a reveal in the middle of a chapter repaginate: CSS
   * columns fragment whatever is in the flow, so arbitrary React inside a page
   * paginates without anything being measured per block (decision 32).
   */
  revision: number;
  /** A host's own nodes, kept for `hypertext`, which is where they always went. */
  children?: ReactNode;
};
