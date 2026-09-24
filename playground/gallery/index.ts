import type { ReactElement } from "react";
import { Calligram } from "./Calligram";
import { Erosion } from "./Erosion";
import { Footnotes } from "./Footnotes";
import { Labyrinth } from "./Labyrinth";
import { Memory } from "./Memory";
import { Redaction } from "./Redaction";
// Each case shows its own file, read at build time, so the listing cannot drift.
import calligramSource from "./Calligram.tsx?raw";
import erosionSource from "./Erosion.tsx?raw";
import footnotesSource from "./Footnotes.tsx?raw";
import labyrinthSource from "./Labyrinth.tsx?raw";
import memorySource from "./Memory.tsx?raw";
import redactionSource from "./Redaction.tsx?raw";

export type GalleryCase = {
  id: string;
  title: string;
  /** One sentence: what a visitor should watch for. */
  summary: string;
  source: string;
  render: () => ReactElement;
};

/** Six pieces in reading order, each a different class of thing the mode allows. */
export const GALLERY_CASES: readonly GalleryCase[] = [
  {
    id: "redaction",
    title: "Redaction",
    summary: "Concealment as a device: every bar is a button, and the paragraph keeps its shape when one opens.",
    source: redactionSource,
    render: Redaction
  },
  {
    id: "footnotes",
    title: "Footnote chain",
    summary: "Critical apparatus as narrative: note 1 has a note, and so does that one, four levels down and back.",
    source: footnotesSource,
    render: Footnotes
  },
  {
    id: "calligram",
    title: "Calligram",
    summary: "Spatial composition: Apollinaire's five lines placed word by word down five slanting columns of rain.",
    source: calligramSource,
    render: Calligram
  },
  {
    id: "erosion",
    title: "Typographic erosion",
    summary: "Typography that reacts to state: one slider degrades the live text without altering a word of it.",
    source: erosionSource,
    render: Erosion
  },
  {
    id: "labyrinth",
    title: "Labyrinth",
    summary: "Interactive narrative: six rooms wired as a loop, a trail of where you have been, and a way back.",
    source: labyrinthSource,
    render: Labyrinth
  },
  {
    id: "memory",
    title: "Reader memory",
    summary: "The text reads you back: the prose changes according to what you have already done to it.",
    source: memorySource,
    render: Memory
  }
];
