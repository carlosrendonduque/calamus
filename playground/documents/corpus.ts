/**
 * The nineteen conformance documents, read at build time.
 *
 * These files are the format's own suite: `docs/conformance-v1/` holds the same
 * nineteen pieces the gallery hand-writes in React, written instead as authored
 * documents. They are imported with `?raw` rather than copied, so the demo cannot
 * drift from the suite the parser is tested against, and `README.md` is skipped
 * because it is the report on them rather than one of them.
 *
 * The order is editorial: the three the owner names first — a bar that opens, a
 * labyrinth that walks, a dial that rewrites prose — come first because they are
 * grasped in a second, and `route-snapshots` comes last because it is the one of
 * the nineteen that the format cannot hold (see its note).
 */

import columnLab from "../../docs/conformance-v1/column-lab.md?raw";
import contradiction from "../../docs/conformance-v1/contradiction.md?raw";
import disputedHour from "../../docs/conformance-v1/disputed-hour.md?raw";
import documentPacket from "../../docs/conformance-v1/document-packet.md?raw";
import endingLens from "../../docs/conformance-v1/ending-lens.md?raw";
import evidenceScore from "../../docs/conformance-v1/evidence-score.md?raw";
import footnotes from "../../docs/conformance-v1/footnotes.md?raw";
import labyrinth from "../../docs/conformance-v1/labyrinth.md?raw";
import memory from "../../docs/conformance-v1/memory.md?raw";
import metaEditor from "../../docs/conformance-v1/meta-editor.md?raw";
import motifPasses from "../../docs/conformance-v1/motif-passes.md?raw";
import narrators from "../../docs/conformance-v1/narrators.md?raw";
import readerPath from "../../docs/conformance-v1/reader-path.md?raw";
import recoverAnchor from "../../docs/conformance-v1/recover-anchor.md?raw";
import redaction from "../../docs/conformance-v1/redaction.md?raw";
import routeSnapshots from "../../docs/conformance-v1/route-snapshots.md?raw";
import sessionMemory from "../../docs/conformance-v1/session-memory.md?raw";
import twoAccounts from "../../docs/conformance-v1/two-accounts.md?raw";
import unstableLinks from "../../docs/conformance-v1/unstable-links.md?raw";

export type DocumentCase = {
  /** The file's own name, which is also its address: `#/document/<id>`. */
  id: string;
  /** The title in the document's own front matter. */
  title: string;
  /** One line: what this document demonstrates about the format. */
  note: string;
  /** What to touch, for the documents that are touchable. */
  tryThis?: string;
  source: string;
};

export const DOCUMENT_CASES: readonly DocumentCase[] = [
  {
    id: "redaction",
    title: "The clerk's report",
    note: "Three redaction bars, each a declared move that toggles one boolean, and each with an accessible label written as a two-case phrase rather than a string.",
    tryThis: "Press a bar. The words under it appear, the paragraph keeps its shape, and the label the screen reader hears changes with it.",
    source: redaction
  },
  {
    id: "labyrinth",
    title: "Platform six",
    note: "Six nodes wired as a loop. The opening node is already in the trail, so the room counts your first visit, and every exit carries a badge read from the exit it is printed on. The route the document prints above the rooms is missing: it stands before the first node, and a document with nodes renders the node and not its own body.",
    tryThis: "Take an exit. The node substitutes, and an exit you have used comes back marked seen.",
    source: labyrinth
  },
  {
    id: "evidence-score",
    title: "How reliable is the account",
    note: "The load test for a phrase that sees the item it is printed on: one live number is compared against each claim's own threshold, so the claims stop asserting one at a time.",
    tryThis: "Drag the reliability dial down. The verbs weaken before the claims disappear, and the count under them follows.",
    source: evidenceScore
  },
  {
    id: "unstable-links",
    title: "Five ways out of the orchard",
    note: "A derived group that shrinks as the reader spends it, and an `orders` entry — the one registry name this page fills — that moves the turnings you did not take.",
    tryThis: "Take a turning. It closes behind you, appears in the list above, and the rest change places.",
    source: unstableLinks
  },
  {
    id: "ending-lens",
    title: "The same three facts",
    note: "Three facts stay fixed while one choice control swaps the closing paragraph. Not one phrase case and not one log: the least machinery of the nineteen.",
    tryThis: "Change the lens. Only the last paragraph moves.",
    source: endingLens
  },
  {
    id: "narrators",
    title: "The north stair",
    note: "One passage changes hands three times. The option labels are paths into the group, so the control names its own options without a phrase.",
    tryThis: "Change the voice. The caption, the register and the account move together.",
    source: narrators
  },
  {
    id: "memory",
    title: "The corridor and the two doors",
    note: "A document that opens mid-reading: the initial trail is not empty, so the prose is counting the reader before the reader has done anything. `{last-door.name}` prints as itself, which is the format failing towards legible: a path it cannot read is shown rather than swallowed.",
    tryThis: "Go through a door, read it again, then forget it. A reset needs a destination, which is why \"forget me\" returns to one reading and not to zero.",
    source: memory
  },
  {
    id: "footnotes",
    title: "They had agreed to meet in the evening",
    note: "A note chain that is its own log rather than the trail, four levels deep: opening note one is three effects in a single declared gesture.",
    tryThis: "Press the raised one, then the note inside the note. The chain grows, and closing it shortens the chain without touching the trail.",
    source: footnotes
  },
  {
    id: "recover-anchor",
    title: "The bridge was passed as sound",
    note: "The one that opens on almost nothing, and the reason is worth reading: its main line is a region, a region any declared move can reveal starts hidden, and this document declares a move that re-anchors the reading onto it. So the sentence you can see is the status line, and the prose is behind it.",
    tryThis: "Read the source on the left. Everything missing from the reading is inside the region named anchor-main.",
    source: recoverAnchor
  },
  {
    id: "document-packet",
    title: "Three sheets in one envelope",
    note: "Not several nodes but one group revealed in exclusion, with `keeps: unique` on the log of what was read so that \"two of three sheets\" counts right. The bare word opened beside an unread exhibit is the library's: a mark whose condition fails loses its styling and keeps its words.",
    tryThis: "Open exhibit B, then C. The sheet you opened keeps its badge, and closing the envelope leaves you on no sheet at all.",
    source: documentPacket
  },
  {
    id: "reader-path",
    title: "The visitors' book",
    note: "An append-only log with marks, which is not a log at all: a line you withdraw stays on the page, ruled through and labelled, because the porter rubs nothing out. Two things here are the library's and not the author's: the badge says struck beside every line, because a mark's declared condition is never evaluated, and the withdrawal control writes nothing, because its gesture has no shape in the state machine.",
    tryThis: "Sign the book twice and watch the log grow and the count follow.",
    source: readerPath
  },
  {
    id: "disputed-hour",
    title: "One hour, kept twice",
    note: "The smallest document of the nineteen and the one that cannot be written without a phrase that sees its row: each minute's verdict is one word chosen by a field of that minute.",
    tryThis: "Filter down to the minutes they dispute.",
    source: disputedHour
  },
  {
    id: "two-accounts",
    title: "Two accounts of one night",
    note: "Two columns printed from one group, and a mark whose condition belongs to the mark rather than to the paragraph, so marking a point finds it in both columns at once.",
    tryThis: "Mark a point. Both columns rule the same line.",
    source: twoAccounts
  },
  {
    id: "contradiction",
    title: "Hold them together",
    note: "The clash is not written down: a grouped name buckets the claims by the question they answer and reports the buckets that split.",
    tryThis: "Hold two statements that answer the same question in opposite directions, then unmark one.",
    source: contradiction
  },
  {
    id: "motif-passes",
    title: "The inventory of the landing",
    note: "A second hand reading over the first: two marking passes switch on and off, and the phrase counts marked words inside the prose itself.",
    tryThis: "Switch on one pass, then both.",
    source: motifPasses
  },
  {
    id: "column-lab",
    title: "The Life and Opinions of Tristram Shandy, Gentleman",
    note: "Two reader controls that reach the page as CSS custom properties, unit and all. The arithmetic falls in the stylesheet, so nothing is computed in the document.",
    tryThis: "Change the column count and the gutter. The column count is a ceiling, not a promise.",
    source: columnLab
  },
  {
    id: "session-memory",
    title: "A line for your next visit",
    note: "Whether a value survived a previous reading is a question for the browser, so it is an operator — `persisted()` — and never a name the author has to keep.",
    tryThis: "Write a line, then make it forget.",
    source: sessionMemory
  },
  {
    id: "meta-editor",
    title: "The editor's hand",
    note: "Somebody edits you after the fact. The one document whose slot cannot be served here: the parser keeps the slot's name and drops its parameters, so the rewrite has nothing to run on and says so in the diagnostics.",
    tryThis: "Type into the sentence. The line is echoed back unedited, and the reading names the view it is missing.",
    source: metaEditor
  },
  {
    id: "route-snapshots",
    title: "Walk the town twice",
    note: "The one of the nineteen that is not a document, confirmed twice: comparing two of the reader's own walks needs logs as values and a positional comparison, and the missing slot shows up here as the only error in the suite.",
    tryThis: "Walk the town. Everything that is a document works; the comparison is the hole.",
    source: routeSnapshots
  }
];

export const DOCUMENT_IDS: readonly string[] = DOCUMENT_CASES.map((entry) => entry.id);

export function indexOfDocument(id: string): number {
  return DOCUMENT_CASES.findIndex((entry) => entry.id === id);
}
