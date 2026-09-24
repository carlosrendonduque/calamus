import type { ReactElement } from "react";

/**
 * The gallery is an inventory, not a highlight reel: every mechanism worth
 * knowing about is here, grouped so that thirty-odd examples stay walkable.
 *
 * A category answers "what class of thing does this let me do?". A visitor
 * picks a category first and an example second, so the categories have to be
 * about capability, never about the example's subject matter.
 */
export type GalleryCategory =
  | "structure"
  | "typography"
  | "concealment"
  | "apparatus"
  | "reader-state"
  | "voice"
  | "comparison"
  | "rewriting"
  | "media";

/**
 * Key order is the catalogue's display order, so the gallery opens on the piece
 * that is grasped fastest rather than on the one with the most to say.
 */
export const CATEGORY_LABELS: Record<GalleryCategory, string> = {
  concealment: "Concealment",
  structure: "Structure",
  typography: "Typography",
  apparatus: "Apparatus",
  "reader-state": "Reader state",
  voice: "Voice",
  comparison: "Comparison",
  rewriting: "Rewriting",
  media: "Media"
};

export const CATEGORY_BLURBS: Record<GalleryCategory, string> = {
  structure: "The reader assembles the order. Paths, trails, anchors, and text that refuses to stay put.",
  typography: "How the words sit on the page, and what happens when that changes.",
  concealment: "What is withheld, and what it costs the reader to see it.",
  apparatus: "Notes, exhibits and marginalia, used as narrative rather than as reference.",
  "reader-state": "The text keeps something about you, and reads you back.",
  voice: "Who is speaking, and what happens when that is unstable.",
  comparison: "Two accounts at once, and the gap between them.",
  rewriting: "The text edits itself according to a choice you made.",
  media: "Images, sound and motion, drawn or synthesised in the page itself."
};

export type GalleryCase = {
  id: string;
  title: string;
  category: GalleryCategory;
  /** One sentence: what a visitor should watch for. */
  summary: string;
  /** The example's own file, imported with `?raw`, so the listing is the code that runs. */
  source: string;
  render: () => ReactElement;
};
