import { useEffect, useMemo, useRef } from "react";
import { Reader } from "../src";
import { renderControl } from "./ControlsPanel";
import { STAGE_HEIGHT_CONTROL } from "./controls";
import { HypertextDemo } from "./HypertextDemo";
import {
  SAMPLE_CLASS_NAME,
  toContent,
  toLabels,
  toStyle,
  toTheme,
  type ExplorerState,
  type StateUpdater
} from "./state";

type StageProps = {
  state: ExplorerState;
  onChange: StateUpdater;
};

/**
 * The reader lives in a box with an explicit height. `book` and `editorial`
 * measure that box, so changing the height here repaginates them: the library
 * watches the measured element with a `ResizeObserver`.
 */
export function Stage({ state, onChange }: StageProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  // `resize: vertical` lets the box be dragged, which bypasses React. Reading the
  // real height back keeps the slider and the px readout honest.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) {
      return;
    }

    const observer = new ResizeObserver(() => {
      const measured = Math.round(box.getBoundingClientRect().height);

      if (measured <= 0) {
        return;
      }

      onChange((previous) =>
        previous.stageHeight === measured ? previous : { ...previous, stageHeight: measured }
      );
    });

    observer.observe(box);

    return () => {
      observer.disconnect();
    };
  }, [onChange]);

  // Re-measuring the text is the expensive part, so the content object only
  // changes when the text does, not on every colour tweak.
  const content = useMemo(
    () => toContent(state),
    [state.contentPreset, state.customTitle, state.customSubtitle, state.customBody]
  );

  return (
    <section className="explorer__section" aria-labelledby="preview-heading">
      <h2 id="preview-heading">Preview</h2>
      <div className="explorer__stage-toolbar">
        {renderControl({ control: STAGE_HEIGHT_CONTROL, state, onChange })}
        <p className="explorer__stage-note">
          Drag the bottom edge of the stage as well. In book and editorial the text is
          re-measured and repaginated on every size change.
        </p>
      </div>
      <div className="explorer__stage" ref={boxRef} style={{ height: state.stageHeight }}>
        <Reader
          content={content}
          mode={state.mode}
          transition={state.transition}
          lang={state.lang || undefined}
          theme={toTheme(state)}
          labels={toLabels(state)}
          className={state.sampleClass ? SAMPLE_CLASS_NAME : undefined}
          style={toStyle(state)}
        >
          {state.mode === "hypertext" ? <HypertextDemo lines={content.body} /> : null}
        </Reader>
      </div>
    </section>
  );
}
