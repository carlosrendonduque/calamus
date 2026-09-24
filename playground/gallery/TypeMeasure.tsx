import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { tristramShandy } from "../../examples/corpus/sterne-tristram-shandy";
import "./typography.css";

const PASSAGE = tristramShandy.body[3];

/** The band the manuals agree on, give or take: characters per line. */
const COMFORTABLE = { min: 45, max: 75 };

function verdict(measure: number): string {
  if (measure < COMFORTABLE.min) {
    return "narrow: the eye turns more often than it reads";
  }
  if (measure > COMFORTABLE.max) {
    return "wide: at the end of a line the eye has to hunt for the start of the next";
  }
  return `comfortable: between ${COMFORTABLE.min} and ${COMFORTABLE.max} characters a line`;
}

/**
 * The measure — the width of the column, so the length of a line — widened and
 * narrowed while you read. About the surface rather than about hypertext: the
 * passage never changes, only the shape of the reading.
 *
 * The width is set in `ch`, a unit of the column's own font, and capped at the
 * space available, which makes the asked-for measure and the real one two
 * numbers. The px figure is measured back off the element: on a phone you can
 * watch the cap hold it.
 */
export function TypeMeasure() {
  const [measure, setMeasure] = useState(34);
  const [pixels, setPixels] = useState(0);
  const column = useRef<HTMLDivElement>(null);

  // Observed, not read once: a single measurement after the change catches the
  // column still moving, and reports the width it had a moment ago.
  useEffect(() => {
    const element = column.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setPixels(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const comfortable = measure >= COMFORTABLE.min && measure <= COMFORTABLE.max;

  return (
    <div className="playground__type-measure">
      <div className="control control--range">
        <label className="control__label" htmlFor="type-measure-width">
          measure
        </label>
        <span className="control__range">
          <input
            id="type-measure-width"
            type="range"
            min={18}
            max={92}
            step={1}
            value={measure}
            onChange={(event) => setMeasure(Number(event.target.value))}
          />
          <output htmlFor="type-measure-width" role="status">
            {`${measure}ch · ${pixels}px`}
          </output>
        </span>
      </div>

      <div
        className={comfortable ? "playground__type-column is-comfortable" : "playground__type-column"}
        style={{ "--measure": measure } as CSSProperties}
        ref={column}
      >
        <p>{PASSAGE}</p>
      </div>

      <p className="playground__case-note">{verdict(measure)}.</p>
    </div>
  );
}
