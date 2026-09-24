import type { ReaderMode } from "../src";
import { MODE_LABELS } from "./state";

type Guide = {
  what: string;
  tryThis: string;
};

/** Editorial rationale per mode, following the README's reading-modes sections. */
const MODE_GUIDES: Record<ReaderMode, Guide> = {
  scroll: {
    what:
      "One continuous column in a scrollable region, with a sticky progress bar and the reading-time estimate in the header. For prose that should be read in one uninterrupted movement, where the reader's own pace is the only structure.",
    tryThis:
      "Scroll the stage and watch the progress bar fill. Then change the stage height: nothing repaginates, because scroll mode has no page boundaries to recompute."
  },
  book: {
    what:
      "The body is measured after mount and split into pages that fit the available height, one page at a time, with previous/next controls and a counter. For text that wants a fixed frame, where the page is a unit of composition and the turn is a beat.",
    tryThis:
      "Drag the bottom edge of the stage, or move the stage height slider, and watch the page count change as the text is re-measured. Page breaks only fall between paragraphs."
  },
  terminal: {
    what:
      "A dark monospaced surface framed as a file being read: a $ cat header, a # title line, an [EOF] marker and a sticky percentage. For texts that present themselves as documents rather than as literature.",
    tryThis:
      "Scroll to the [EOF] marker and watch the percentage readout at the bottom. Then switch the theme preset: terminal mode keeps its own six tokens, so the other colours leave it alone."
  },
  editorial: {
    what:
      "The body is measured and laid out into sheets of one or two columns, and sheets are advanced horizontally by control, keyboard or swipe. For spatially composed text, where the spread rather than the paragraph is the unit.",
    tryThis:
      "Widen the window past 768px for two columns and narrow it for one, then change the stage height and watch the sheet count follow. The style toggle widens the column gap."
  },
  hypertext: {
    what:
      "Renders whatever you pass as children inside the reader's frame, under the same title header and theme. For non-linear pieces that mix prose with components, animation or interaction; content.body is not rendered and no reading time is shown.",
    tryThis:
      "Everything under the title below is the playground's own markup. Change the theme colours and notice that the host markup inherits the same tokens."
  }
};

export function ModeGuide({ mode }: { mode: ReaderMode }) {
  const guide = MODE_GUIDES[mode];

  return (
    <section className="explorer__section" aria-labelledby="guide-heading">
      <h2 id="guide-heading">{`${MODE_LABELS[mode]} mode`}</h2>
      <p>{guide.what}</p>
      <p className="explorer__try">
        <strong>Try this.</strong> {guide.tryThis}
      </p>
    </section>
  );
}
