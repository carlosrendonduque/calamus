import { describe, expect, it } from "vitest";
import { getReadingTimeText, getWordCount } from "../src/internal/readingTime";

const LABEL = "min de lectura";

function bodyWithWords(wordCount: number): string[] {
  return [Array.from({ length: wordCount }, (_, index) => `word${index}`).join(" ")];
}

describe("getWordCount", () => {
  it("counts zero words for an empty body", () => {
    expect(getWordCount([])).toBe(0);
  });

  it("counts zero words for empty paragraphs", () => {
    expect(getWordCount(["", "   ", "\n\t"])).toBe(0);
  });

  it("counts words across paragraphs", () => {
    expect(getWordCount(["The lamp was lit.", "Nobody answered the door."])).toBe(8);
  });

  it("ignores leading, trailing and repeated whitespace", () => {
    expect(getWordCount(["   the   lamp \t\t was     lit   "])).toBe(4);
  });

  it("ignores newlines inside a paragraph", () => {
    expect(getWordCount(["the lamp\nwas\n\nlit"])).toBe(4);
  });

  it("treats non-breaking space as a separator", () => {
    expect(getWordCount(["the lamp"])).toBe(2);
  });

  it("counts a hyphenated compound as a single word", () => {
    expect(getWordCount(["a half-open door"])).toBe(3);
  });

  it("counts standalone punctuation as a word", () => {
    // Documented current behaviour: the split is purely whitespace-based.
    expect(getWordCount(["the lamp ..."])).toBe(3);
  });
});

describe("getReadingTimeText", () => {
  it("enforces a floor of one minute for an empty body", () => {
    expect(getReadingTimeText({ title: "Untitled", body: [] }, LABEL)).toBe(`1 ${LABEL}`);
  });

  it("enforces a floor of one minute for a single word", () => {
    expect(getReadingTimeText({ title: "Untitled", body: ["lamp"] }, LABEL)).toBe(`1 ${LABEL}`);
  });

  it("reports one minute at exactly 250 words", () => {
    expect(getReadingTimeText({ title: "Untitled", body: bodyWithWords(250) }, LABEL)).toBe(
      `1 ${LABEL}`
    );
  });

  it("rounds up one word past 250", () => {
    expect(getReadingTimeText({ title: "Untitled", body: bodyWithWords(251) }, LABEL)).toBe(
      `2 ${LABEL}`
    );
  });

  it("rounds up a partial minute", () => {
    expect(getReadingTimeText({ title: "Untitled", body: bodyWithWords(300) }, LABEL)).toBe(
      `2 ${LABEL}`
    );
  });

  it("reports two minutes at exactly 500 words", () => {
    expect(getReadingTimeText({ title: "Untitled", body: bodyWithWords(500) }, LABEL)).toBe(
      `2 ${LABEL}`
    );
  });

  it("sums words across paragraphs before rounding", () => {
    const body = [...bodyWithWords(200), ...bodyWithWords(51)];
    expect(getReadingTimeText({ title: "Untitled", body }, LABEL)).toBe(`2 ${LABEL}`);
  });

  it("uses the supplied label verbatim", () => {
    expect(getReadingTimeText({ title: "Untitled", body: ["lamp"] }, "minute read")).toBe(
      "1 minute read"
    );
  });

  it("ignores the title and subtitle", () => {
    const withMetadata = getReadingTimeText(
      { title: "A very long title indeed", subtitle: "and a long subtitle too", body: ["lamp"] },
      LABEL
    );

    expect(withMetadata).toBe(getReadingTimeText({ title: "", body: ["lamp"] }, LABEL));
  });
});
