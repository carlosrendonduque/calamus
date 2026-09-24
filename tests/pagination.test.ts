import { describe, expect, it } from "vitest";
import {
  PAGE_COUNT_TOLERANCE,
  clampPage,
  countPages,
  pageFromScrollLeft,
  prefersReducedMotion,
  renderSnapPoints,
  scrollLeftForPage,
  turnAnimationClassName,
  turnBehavior,
  turnDirection
} from "../src/internal/pagination";

/**
 * What the browser reports for a flow of `columnCount` columns per page laid out
 * in a scrollport `pageWidth` wide with a gap of `gap` between columns.
 *
 * The flow carries half a gap of padding at each end, so a column is
 * `pageWidth / columnsPerPage - gap` wide and the pitch is `pageWidth /
 * columnsPerPage`. Blink leaves the trailing padding out of `scrollWidth`,
 * hence the missing half gap, and rounds the result to an integer. Every number
 * in this model was read off Chrome before it was written down: a 700px page
 * with a 38px gap and four columns reports 2781, which is what this returns.
 */
function measuredScrollWidth(columns: number, pageWidth: number, columnsPerPage: number, gap: number): number {
  const columnWidth = pageWidth / columnsPerPage - gap;
  const content = columns * columnWidth + (columns - 1) * gap;
  return Math.round(content + gap / 2);
}

describe("countPages", () => {
  it("reports one page for a flow that does not overflow its page", () => {
    expect(countPages(700, 700)).toBe(1);
  });

  it("reports one page for an empty flow", () => {
    // An empty flow still has the width of the scrollport it fills.
    expect(countPages(0, 700)).toBe(1);
  });

  it("never reports fewer than one page", () => {
    expect(countPages(-4000, 700)).toBe(1);
  });

  it("refuses to divide by a page of no width", () => {
    expect(countPages(2781, 0)).toBe(1);
    expect(countPages(2781, -700)).toBe(1);
  });

  it("survives numbers that are not numbers", () => {
    expect(countPages(Number.NaN, 700)).toBe(1);
    expect(countPages(2781, Number.NaN)).toBe(1);
    expect(countPages(Number.POSITIVE_INFINITY, 700)).toBe(1);
  });

  it("counts the four pages Chrome reports for a 700px page with a 38px gap", () => {
    // Measured, not derived: this is the number the prototype printed.
    expect(countPages(2781, 700)).toBe(4);
  });

  it("counts the two sheets Chrome reports for a 900px two-column sheet", () => {
    expect(countPages(1781, 900)).toBe(2);
  });

  it("does not round a part-full last sheet away", () => {
    // Seven columns at two per sheet is three full sheets and a half one.
    expect(countPages(measuredScrollWidth(7, 900, 2, 38), 900)).toBe(4);
  });

  it("does not turn the missing trailing padding into an extra page", () => {
    for (const gap of [0, 16, 38, 64]) {
      expect(countPages(measuredScrollWidth(3, 700, 1, gap), 700)).toBe(3);
    }
  });

  it("shaves less than one page and more than the padding it corrects for", () => {
    expect(PAGE_COUNT_TOLERANCE).toBeGreaterThan(0);
    expect(PAGE_COUNT_TOLERANCE).toBeLessThan(0.5);
  });

  it("does not grow a blank sheet on the end of a long chapter", () => {
    // 228 columns of a 240.44px page, which is `book` at 320px in a short box.
    // Dividing by the whole-number 240 instead of the real width puts
    // `pages * fraction / pageWidth` of error into the ratio — 0.42 of a page
    // here — and the reader grew a 229th, empty sheet. Measured in Chrome
    // before it was fixed.
    const pageWidth = 240.44;
    const measured = measuredScrollWidth(228, pageWidth, 1, 38.4);

    expect(countPages(measured, pageWidth)).toBe(228);
    expect(countPages(measured, Math.round(pageWidth))).toBe(229);
  });

  it("takes a fractional page width, because a page is rarely a whole number of pixels", () => {
    expect(countPages(2420, 605.09375)).toBe(4);
    expect(countPages(3114, 623.05)).toBe(5);
  });

  it("agrees with the column arithmetic across every shape the library can take", () => {
    const mismatches: string[] = [];

    for (const columnsPerPage of [1, 2]) {
      for (const pageWidth of [240.44, 282, 360.5, 605.09375, 623.05, 700, 900, 1200, 1440.75]) {
        for (const gap of [0, 16, 24, 38.4, 57.6]) {
          for (let columns = 1; columns <= 120; columns += 1) {
            const measured = measuredScrollWidth(columns, pageWidth, columnsPerPage, gap);
            const expected = Math.ceil(columns / columnsPerPage);
            const actual = countPages(measured, pageWidth);

            if (actual !== expected) {
              mismatches.push(
                `${columns} columns of ${columnsPerPage}/page at ${pageWidth}px gap ${gap}: ${actual} != ${expected}`
              );
            }
          }
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("grows the count as the page shrinks and never the other way", () => {
    // 12 columns of text, read in an ever shorter page: a shorter page needs
    // more columns, so the count may only go up.
    const counts = [1400, 1200, 900, 700, 500, 360, 282].map((pageWidth) => {
      const columns = Math.ceil(12000 / pageWidth);
      return countPages(measuredScrollWidth(columns, pageWidth, 1, 38), pageWidth);
    });

    for (let index = 1; index < counts.length; index += 1) {
      expect(counts[index]).toBeGreaterThanOrEqual(counts[index - 1]);
    }
  });

  it("is a pure function of two numbers, so it cannot drift between runs", () => {
    // The old paginator made one rounding decision per paragraph and summed
    // them. This is the regression test for decision 24's whole claim: the same
    // geometry has to give the same count, forever.
    const answers = new Set(Array.from({ length: 200 }, () => countPages(2781, 700)));
    expect([...answers]).toEqual([4]);
  });
});

describe("clampPage", () => {
  it("keeps a page that exists", () => {
    expect(clampPage(2, 5)).toBe(2);
  });

  it("pulls a page past the end back to the last one", () => {
    expect(clampPage(9, 5)).toBe(4);
  });

  it("pulls a page before the start up to the first one", () => {
    expect(clampPage(-3, 5)).toBe(0);
  });

  it("answers zero for a document of no pages", () => {
    expect(clampPage(3, 0)).toBe(0);
  });

  it("answers zero for a page that is not a number", () => {
    expect(clampPage(Number.NaN, 5)).toBe(0);
  });

  it("rounds a fractional page to the nearest whole one", () => {
    expect(clampPage(2.4, 5)).toBe(2);
    expect(clampPage(2.6, 5)).toBe(3);
  });
});

describe("scrollLeftForPage", () => {
  it("puts the first page at the start", () => {
    expect(scrollLeftForPage(0, 605)).toBe(0);
  });

  it("puts every other page a whole page along", () => {
    expect(scrollLeftForPage(1, 605)).toBe(605);
    expect(scrollLeftForPage(3, 605)).toBe(1815);
  });

  it("never asks the scroller to go backwards", () => {
    expect(scrollLeftForPage(-2, 605)).toBe(0);
  });

  it("answers zero when the page has no width to divide", () => {
    expect(scrollLeftForPage(3, 0)).toBe(0);
    expect(scrollLeftForPage(Number.NaN, 605)).toBe(0);
  });
});

describe("pageFromScrollLeft", () => {
  it("reads the page the scroller has settled on", () => {
    expect(pageFromScrollLeft(1210, 605, 4)).toBe(2);
  });

  it("answers with the nearer page when caught mid-gesture", () => {
    expect(pageFromScrollLeft(700, 605, 4)).toBe(1);
    expect(pageFromScrollLeft(200, 605, 4)).toBe(0);
  });

  it("tolerates the last page landing a pixel short of its own edge", () => {
    // The snap markers are placed on the fractional page width, so the last
    // snap point can round a pixel below `pages * clientWidth`.
    expect(pageFromScrollLeft(2491, 623, 5)).toBe(4);
  });

  it("never reports a page the document does not have", () => {
    expect(pageFromScrollLeft(99999, 605, 4)).toBe(3);
    expect(pageFromScrollLeft(-500, 605, 4)).toBe(0);
  });

  it("answers zero when there is nothing to divide by", () => {
    expect(pageFromScrollLeft(1210, 0, 4)).toBe(0);
    expect(pageFromScrollLeft(Number.NaN, 605, 4)).toBe(0);
  });
});

describe("turnDirection", () => {
  it("calls a turn towards the end forward", () => {
    expect(turnDirection(0, 1)).toBe("forward");
  });

  it("calls a turn towards the start backward", () => {
    expect(turnDirection(3, 1)).toBe("backward");
  });

  it("calls standing still forward, which is where the frame starts", () => {
    expect(turnDirection(2, 2)).toBe("forward");
  });
});

describe("turnBehavior", () => {
  it("animates only the slide", () => {
    expect(turnBehavior("slide", false)).toBe("smooth");
    expect(turnBehavior("fade", false)).toBe("auto");
    expect(turnBehavior("none", false)).toBe("auto");
  });

  it("stops animating the slide when motion is unwelcome", () => {
    expect(turnBehavior("slide", true)).toBe("auto");
  });
});

describe("turnAnimationClassName", () => {
  it("asks for no animation unless the transition is a fade", () => {
    expect(turnAnimationClassName("slide", 3, "x")).toBe("x--none");
    expect(turnAnimationClassName("none", 3, "x")).toBe("x--none");
  });

  it("alternates two identical animations so every turn restarts one", () => {
    expect(turnAnimationClassName("fade", 0, "x")).toBe("x--fade-a");
    expect(turnAnimationClassName("fade", 1, "x")).toBe("x--fade-b");
    expect(turnAnimationClassName("fade", 2, "x")).toBe("x--fade-a");
  });

  it("never returns the same class on two consecutive turns", () => {
    const classes = Array.from({ length: 20 }, (_, tick) => turnAnimationClassName("fade", tick, "x"));

    for (let index = 1; index < classes.length; index += 1) {
      expect(classes[index]).not.toBe(classes[index - 1]);
    }
  });
});

describe("renderSnapPoints", () => {
  it("places one marker at the left edge of every page", () => {
    const points = renderSnapPoints(3);

    expect(points).toHaveLength(3);
    expect(points.map((point) => (point.props as { style: { left: string } }).style.left)).toEqual([
      "0%",
      "100%",
      "200%"
    ]);
  });

  it("hides them from assistive technology", () => {
    expect((renderSnapPoints(1)[0].props as Record<string, unknown>)["aria-hidden"]).toBe("true");
  });

  it("always places at least one, so an empty document still has a page", () => {
    expect(renderSnapPoints(0)).toHaveLength(1);
  });
});

describe("prefersReducedMotion", () => {
  it("assumes motion is welcome where there is no window to ask", () => {
    // The suite runs in Node, which is the same answer a server render needs.
    expect(prefersReducedMotion()).toBe(false);
  });
});
