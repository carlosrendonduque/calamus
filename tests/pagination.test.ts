import { describe, expect, it } from "vitest";
import { paginateEditorialParagraphs, paginateParagraphs } from "../src/internal/pagination";

function flattenPages(pages: number[][]): number[] {
  return pages.flat();
}

function flattenSheets(sheets: number[][][]): number[] {
  return sheets.flat().flat();
}

describe("paginateParagraphs", () => {
  it("returns a single empty page for an empty document", () => {
    expect(paginateParagraphs([], 600)).toEqual([[]]);
  });

  it("returns a single empty page for an empty document even without available height", () => {
    expect(paginateParagraphs([], 0)).toEqual([[]]);
  });

  it("collapses everything onto one page when the available height is zero", () => {
    expect(paginateParagraphs([120, 140, 160], 0)).toEqual([[0, 1, 2]]);
  });

  it("collapses everything onto one page when the available height is negative", () => {
    expect(paginateParagraphs([120, 140, 160], -500)).toEqual([[0, 1, 2]]);
  });

  it("keeps a single oversized paragraph on one page instead of dropping it", () => {
    expect(paginateParagraphs([9000], 300)).toEqual([[0]]);
  });

  it("gives an oversized paragraph its own page mid-document", () => {
    expect(paginateParagraphs([50, 400, 50], 100)).toEqual([[0], [1], [2]]);
  });

  it("keeps a paragraph whose height equals the available height", () => {
    expect(paginateParagraphs([100], 100)).toEqual([[0]]);
  });

  it("treats an exact fit as fitting", () => {
    expect(paginateParagraphs([40, 60], 100)).toEqual([[0, 1]]);
  });

  it("breaks one unit past an exact fit", () => {
    expect(paginateParagraphs([40, 61], 100)).toEqual([[0], [1]]);
  });

  it("fills a page up to the exact boundary before breaking", () => {
    expect(paginateParagraphs([30, 30, 40, 10], 100)).toEqual([
      [0, 1, 2],
      [3]
    ]);
  });

  it("distributes realistic paragraph heights across pages", () => {
    const heights = [120, 140, 160, 110, 130, 150];
    expect(paginateParagraphs(heights, 500)).toEqual([
      [0, 1, 2],
      [3, 4, 5]
    ]);
  });

  it("packs zero-height paragraphs onto a single page", () => {
    expect(paginateParagraphs([0, 0, 0], 100)).toEqual([[0, 1, 2]]);
  });

  it("never loses or reorders paragraphs", () => {
    const heights = [80, 220, 45, 900, 30, 30, 310, 75];
    const pages = paginateParagraphs(heights, 400);

    expect(flattenPages(pages)).toEqual(heights.map((_, index) => index));
    expect(pages.every((page) => page.length > 0)).toBe(true);
  });
});

describe("paginateEditorialParagraphs", () => {
  it("returns a single sheet with one empty column for an empty document", () => {
    expect(paginateEditorialParagraphs([], 600, 1)).toEqual([[[]]]);
  });

  it("honours columnCount for an empty document", () => {
    expect(paginateEditorialParagraphs([], 600, 2)).toEqual([[[], []]]);
    expect(paginateEditorialParagraphs([], 600, 3)).toEqual([[[], [], []]]);
  });

  it("collapses everything into the first column when the available height is zero", () => {
    expect(paginateEditorialParagraphs([120, 140, 160], 0, 2)).toEqual([[[0, 1, 2], []]]);
  });

  it("collapses everything into the first column when the available height is negative", () => {
    expect(paginateEditorialParagraphs([120, 140, 160], -1, 2)).toEqual([[[0, 1, 2], []]]);
  });

  it("keeps a single oversized paragraph in one column instead of dropping it", () => {
    expect(paginateEditorialParagraphs([9000], 300, 2)).toEqual([[[0], []]]);
  });

  it("keeps an oversized first paragraph and moves the next one to the second column", () => {
    expect(paginateEditorialParagraphs([150, 20], 100, 2)).toEqual([[[0], [1]]]);
  });

  it("treats an exact fit as fitting inside a column", () => {
    expect(paginateEditorialParagraphs([50, 50, 50], 100, 2)).toEqual([[[0, 1], [2]]]);
  });

  it("matches the single-column paginator when columnCount is one", () => {
    const heights = [30, 30, 40, 10];
    const sheets = paginateEditorialParagraphs(heights, 100, 1);

    expect(sheets).toEqual([[[0, 1, 2]], [[3]]]);
    expect(sheets.map((sheet) => sheet[0])).toEqual(paginateParagraphs(heights, 100));
  });

  it("fills the second column before starting a new sheet", () => {
    expect(paginateEditorialParagraphs([60, 60, 60, 60], 100, 2)).toEqual([
      [[0], [1]],
      [[2], [3]]
    ]);
  });

  it("pads the last sheet with empty trailing columns", () => {
    expect(paginateEditorialParagraphs([60, 60, 60], 100, 2)).toEqual([
      [[0], [1]],
      [[2], []]
    ]);
  });

  it("supports more than two columns", () => {
    expect(paginateEditorialParagraphs([60, 60, 60, 60], 100, 3)).toEqual([
      [[0], [1], [2]],
      [[3], [], []]
    ]);
  });

  it("distributes realistic paragraph heights across two-column sheets", () => {
    const heights = [120, 140, 160, 110, 130, 150, 90];
    const sheets = paginateEditorialParagraphs(heights, 400, 2);

    expect(sheets).toEqual([
      [
        [0, 1],
        [2, 3, 4]
      ],
      [[5, 6], []]
    ]);
  });

  it("gives every sheet the requested number of columns", () => {
    const heights = [200, 200, 200, 200, 200, 200, 200];
    const sheets = paginateEditorialParagraphs(heights, 250, 2);

    expect(sheets.every((sheet) => sheet.length === 2)).toBe(true);
  });

  it("never loses or reorders paragraphs", () => {
    const heights = [80, 220, 45, 900, 30, 30, 310, 75];
    const sheets = paginateEditorialParagraphs(heights, 400, 2);

    expect(flattenSheets(sheets)).toEqual(heights.map((_, index) => index));
  });

  it("throws when asked for zero columns", () => {
    // Documented current behaviour: columnCount is never validated.
    expect(() => paginateEditorialParagraphs([100], 300, 0)).toThrow(TypeError);
  });
});
