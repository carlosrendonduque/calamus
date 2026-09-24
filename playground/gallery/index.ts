import type { GalleryCase } from "./types";

import { Calligram } from "./Calligram";
import { Contradiction } from "./Contradiction";
import { Discrepancy } from "./Discrepancy";
import { EndingLens } from "./StateEndingLens";
import { Erosion } from "./Erosion";
import { EvidenceScore } from "./StateEvidenceScore";
import { Footnotes } from "./Footnotes";
import { InvestigatorBoard } from "./StateInvestigatorBoard";
import { Labyrinth } from "./Labyrinth";
import { MediaAudioLayers } from "./MediaAudioLayers";
import { MediaCaption } from "./MediaCaption";
import { MediaClip } from "./MediaClip";
import { MediaEvidenceBoard } from "./MediaEvidenceBoard";
import { MediaImageStack } from "./MediaImageStack";
import { MediaTone } from "./MediaTone";
import { Memory } from "./Memory";
import { MetaEditor } from "./StateMetaEditor";
import { Motifs } from "./Motifs";
import { Narrators } from "./Narrators";
import { PathAnchors } from "./PathAnchors";
import { PathPacket } from "./PathPacket";
import { PathSnapshots } from "./PathSnapshots";
import { PathTrail } from "./PathTrail";
import { PathUnstable } from "./PathUnstable";
import { Redaction } from "./Redaction";
import { SessionMemory } from "./StateSessionMemory";
import { Testimony } from "./Testimony";
import { TypeColumns } from "./TypeColumns";
import { TypeMeasure } from "./TypeMeasure";
import { TypeMirror } from "./TypeMirror";
import { TypeRotation } from "./TypeRotation";
import { TypeSparse } from "./TypeSparse";

// Each case shows its own file, read at build time, so the listing cannot drift
// from the code that runs.
import calligramSource from "./Calligram.tsx?raw";
import contradictionSource from "./Contradiction.tsx?raw";
import discrepancySource from "./Discrepancy.tsx?raw";
import endingLensSource from "./StateEndingLens.tsx?raw";
import erosionSource from "./Erosion.tsx?raw";
import evidenceScoreSource from "./StateEvidenceScore.tsx?raw";
import footnotesSource from "./Footnotes.tsx?raw";
import investigatorBoardSource from "./StateInvestigatorBoard.tsx?raw";
import labyrinthSource from "./Labyrinth.tsx?raw";
import mediaAudioLayersSource from "./MediaAudioLayers.tsx?raw";
import mediaCaptionSource from "./MediaCaption.tsx?raw";
import mediaClipSource from "./MediaClip.tsx?raw";
import mediaEvidenceBoardSource from "./MediaEvidenceBoard.tsx?raw";
import mediaImageStackSource from "./MediaImageStack.tsx?raw";
import mediaToneSource from "./MediaTone.tsx?raw";
import memorySource from "./Memory.tsx?raw";
import metaEditorSource from "./StateMetaEditor.tsx?raw";
import motifsSource from "./Motifs.tsx?raw";
import narratorsSource from "./Narrators.tsx?raw";
import pathAnchorsSource from "./PathAnchors.tsx?raw";
import pathPacketSource from "./PathPacket.tsx?raw";
import pathSnapshotsSource from "./PathSnapshots.tsx?raw";
import pathTrailSource from "./PathTrail.tsx?raw";
import pathUnstableSource from "./PathUnstable.tsx?raw";
import redactionSource from "./Redaction.tsx?raw";
import sessionMemorySource from "./StateSessionMemory.tsx?raw";
import testimonySource from "./Testimony.tsx?raw";
import typeColumnsSource from "./TypeColumns.tsx?raw";
import typeMeasureSource from "./TypeMeasure.tsx?raw";
import typeMirrorSource from "./TypeMirror.tsx?raw";
import typeRotationSource from "./TypeRotation.tsx?raw";
import typeSparseSource from "./TypeSparse.tsx?raw";

export type { GalleryCase, GalleryCategory } from "./types";

/**
 * Every mechanism worth knowing about, not a highlight reel: an example that
 * ships nowhere is an example nobody knows exists. The catalogue groups these
 * by category and orders them within a category by this list.
 */
export const GALLERY_CASES: readonly GalleryCase[] = [
  {
    id: "redaction",
    title: "Redaction",
    category: "concealment",
    summary: "Concealment as a device: every bar is a button, and the paragraph keeps its shape when one opens.",
    source: redactionSource,
    render: Redaction
  },
  {
    id: "labyrinth",
    title: "Labyrinth",
    category: "structure",
    summary: "Interactive narrative: six rooms wired as a loop, a trail of where you have been, and a way back.",
    source: labyrinthSource,
    render: Labyrinth
  },
  {
    id: "unstable-links",
    title: "Unstable links",
    category: "structure",
    summary: "A text that will not let you take the same turning twice: each choice closes behind you and the rest change places.",
    source: pathUnstableSource,
    render: PathUnstable
  },
  {
    id: "reader-path",
    title: "Append-only trail",
    category: "structure",
    summary: "A record that cannot be unwritten: every crossing is signed into the book, and withdrawing a line leaves it on the page marked struck.",
    source: pathTrailSource,
    render: PathTrail
  },
  {
    id: "route-snapshots",
    title: "Route snapshots",
    category: "structure",
    summary: "Two of the reader's own walks held side by side, step against step, with the page naming where they stopped agreeing.",
    source: pathSnapshotsSource,
    render: PathSnapshots
  },
  {
    id: "calligram",
    title: "Calligram",
    category: "typography",
    summary: "Spatial composition: Apollinaire's five lines placed word by word down five slanting columns of rain.",
    source: calligramSource,
    render: Calligram
  },
  {
    id: "erosion",
    title: "Typographic erosion",
    category: "typography",
    summary: "Typography that reacts to state: one slider degrades the live text without altering a word of it.",
    source: erosionSource,
    render: Erosion
  },
  {
    id: "sparse-isolation",
    title: "Sparse isolation",
    category: "typography",
    summary: "Four fragments of Mallarme with the silence between them at full size: how far you travel for the next word, and what it cost.",
    source: typeSparseSource,
    render: TypeSparse
  },
  {
    id: "rotated-blocks",
    title: "Rotated blocks",
    category: "typography",
    summary: "Four copies of a note, each leaning by its own share of one number: the stack opens as it scatters, and the reading order never changes.",
    source: typeRotationSource,
    render: TypeRotation
  },
  {
    id: "mirror-text",
    title: "Mirror text",
    category: "typography",
    summary: "The same string set twice and reflected: the sentence stays forwards in the document while the glass reverses what left means.",
    source: typeMirrorSource,
    render: TypeMirror
  },
  {
    id: "column-lab",
    title: "Column lab",
    category: "typography",
    summary: "Column count and gutter changed while you read: a paragraph is cut wherever a column ends, and the count is a ceiling, not a promise.",
    source: typeColumnsSource,
    render: TypeColumns
  },
  {
    id: "narrow-measure",
    title: "Measure",
    category: "typography",
    summary: "The column narrowed and widened live, with a readout: watch the line length cross into and out of the comfortable band.",
    source: typeMeasureSource,
    render: TypeMeasure
  },
  {
    id: "footnotes",
    title: "Footnote chain",
    category: "apparatus",
    summary: "Critical apparatus as narrative: note 1 has a note, and so does that one, four levels down and back.",
    source: footnotesSource,
    render: Footnotes
  },
  {
    id: "recover-anchor",
    title: "Anchors and recovery",
    category: "apparatus",
    summary: "A jump to an anchor carries the reader's focus with it, logs the departure, and offers a way back to the exact line they left.",
    source: pathAnchorsSource,
    render: PathAnchors
  },
  {
    id: "document-packet",
    title: "Document packet",
    category: "apparatus",
    summary: "Three exhibits in one envelope with the first already open; they contradict each other, and the packet remembers which you opened.",
    source: pathPacketSource,
    render: PathPacket
  },
  {
    id: "memory",
    title: "Reader memory",
    category: "reader-state",
    summary: "The text reads you back: the prose changes according to what you have already done to it.",
    source: memorySource,
    render: Memory
  },
  {
    id: "session-memory",
    title: "Memory that survives a reload",
    category: "reader-state",
    summary: "Persistence as a claim on the reader: write a line, reload the page, and the sentence is still there.",
    source: sessionMemorySource,
    render: SessionMemory
  },
  {
    id: "investigator-board",
    title: "Pin-board",
    category: "reader-state",
    summary: "The reader assembles the evidence: pins in the order you made them, connections drawn as inline SVG and written out underneath.",
    source: investigatorBoardSource,
    render: InvestigatorBoard
  },
  {
    id: "narrators",
    title: "Three narrators",
    category: "voice",
    summary: "One quotation changes hands three times: the caption, the register and the account move together, and the passage keeps its place.",
    source: narratorsSource,
    render: Narrators
  },
  {
    id: "motif-passes",
    title: "Motif passes",
    category: "voice",
    summary: "A second hand reads over the first: two marking passes switch on and off, a word kept is underlined and a word struck is ruled through.",
    source: motifsSource,
    render: Motifs
  },
  {
    id: "two-accounts",
    title: "Two accounts",
    category: "comparison",
    summary: "Two witnesses to one night, side by side: marking a disputed point finds it in both columns at once.",
    source: testimonySource,
    render: Testimony
  },
  {
    id: "disputed-hour",
    title: "Disputed hour",
    category: "comparison",
    summary: "A timeline whose every minute is kept twice: each row carries both logs and says in a word whether they agree.",
    source: discrepancySource,
    render: Discrepancy
  },
  {
    id: "contradiction",
    title: "Contradiction",
    category: "comparison",
    summary: "Hold statements together until they will not hold: the clash is not hard-coded but falls out of the claims your selection answers both ways.",
    source: contradictionSource,
    render: Contradiction
  },
  {
    id: "media-image-stack",
    title: "Paired plates",
    category: "comparison",
    summary: "Two surveys of one room drawn into one shared box, so a single overlay lands on the same wall in both and the differences are real.",
    source: mediaImageStackSource,
    render: MediaImageStack
  },
  {
    id: "evidence-score",
    title: "Reliability dial",
    category: "rewriting",
    summary: "One number rewrites the grammar of an account: as reliability falls the claims stop asserting, then stop being made at all.",
    source: evidenceScoreSource,
    render: EvidenceScore
  },
  {
    id: "meta-editor",
    title: "The editor's hand",
    category: "rewriting",
    summary: "Somebody edits you after the fact: type any sentence and a fixed set of house rules weakens its assertions, every substitution marked.",
    source: metaEditorSource,
    render: MetaEditor
  },
  {
    id: "ending-lens",
    title: "Interpretive lens",
    category: "rewriting",
    summary: "Three facts stay fixed while the closing paragraph is swapped, so each ending has to be built out of the same evidence.",
    source: endingLensSource,
    render: EndingLens
  },
  {
    id: "media-caption",
    title: "Caption against plate",
    category: "media",
    summary: "A drawn photograph and a caption that does not survive looking at it: press the mark and the note names the shadow falling the wrong way.",
    source: mediaCaptionSource,
    render: MediaCaption
  },
  {
    id: "media-tone",
    title: "Synthesised tone",
    category: "media",
    summary: "Sound with no file behind it: one button builds an oscillator on the press, stops it on the next, and says in text what it is doing.",
    source: mediaToneSource,
    render: MediaTone
  },
  {
    id: "media-audio-layers",
    title: "Two sound layers",
    category: "media",
    summary: "Two voices switched on separately, and a three-a-second beat that is in neither of them until you hold both at once.",
    source: mediaAudioLayersSource,
    render: MediaAudioLayers
  },
  {
    id: "media-clip",
    title: "Clip with a timecode",
    category: "media",
    summary: "A moving image recomputed from one number: run the pan or drag the time, and at 00:06 the annotation points at what the beam finds.",
    source: mediaClipSource,
    render: MediaClip
  },
  {
    id: "media-evidence-board",
    title: "Evidence board",
    category: "media",
    summary: "The same clip scrubbed by a paused CSS animation, with three timestamped claims that seek to their own second and mark themselves as read.",
    source: mediaEvidenceBoardSource,
    render: MediaEvidenceBoard
  }
];
