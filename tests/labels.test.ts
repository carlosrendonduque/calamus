import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS, mergeLabels } from "../src/internal/labels";
import type { ReaderMode } from "../src/types";

const MODES: ReaderMode[] = ["scroll", "book", "terminal", "editorial", "hypertext"];

describe("DEFAULT_LABELS", () => {
  it("defaults to English", () => {
    expect(DEFAULT_LABELS.page(2, 5)).toBe("Page 2 of 5");
    expect(DEFAULT_LABELS.sheet(1, 3)).toBe("Sheet 1 of 3");
    expect(DEFAULT_LABELS.readingTime).toBe("min read");
    expect(DEFAULT_LABELS.progress(40)).toBe("Reading progress: 40%");
    expect(DEFAULT_LABELS.pageNavigation).toBe("Book page navigation");
    expect(DEFAULT_LABELS.sheetNavigation).toBe("Editorial sheet navigation");
    expect(DEFAULT_LABELS.previousPage).toBe("Previous page");
    expect(DEFAULT_LABELS.nextPage).toBe("Next page");
    expect(DEFAULT_LABELS.previousSheet).toBe("Previous sheet");
    expect(DEFAULT_LABELS.nextSheet).toBe("Next sheet");
  });

  it("names every reading region", () => {
    for (const mode of MODES) {
      expect(DEFAULT_LABELS.readingMode(mode)).toBe(
        `${mode.charAt(0).toUpperCase()}${mode.slice(1)} reading mode`
      );
    }
  });
});

describe("mergeLabels", () => {
  it("returns the defaults when the host passes nothing", () => {
    expect(mergeLabels()).toEqual(DEFAULT_LABELS);
    expect(mergeLabels({})).toEqual(DEFAULT_LABELS);
  });

  it("does not mutate the defaults", () => {
    mergeLabels({ readingTime: "min de lectura" });
    expect(DEFAULT_LABELS.readingTime).toBe("min read");
  });

  it("takes host overrides, including the accessible names", () => {
    const merged = mergeLabels({
      page: (current, total) => `Página ${current} de ${total}`,
      readingTime: "min de lectura",
      previousPage: "Página anterior",
      readingMode: () => "Lector"
    });

    expect(merged.page(2, 5)).toBe("Página 2 de 5");
    expect(merged.readingTime).toBe("min de lectura");
    expect(merged.previousPage).toBe("Página anterior");
    expect(merged.readingMode("book")).toBe("Lector");
  });

  it("keeps the default when an entry is explicitly undefined", () => {
    const merged = mergeLabels({ page: undefined, nextSheet: undefined });

    expect(merged.page(1, 2)).toBe("Page 1 of 2");
    expect(merged.nextSheet).toBe("Next sheet");
  });

  it("fills every key, so no label can be missing at render time", () => {
    const merged = mergeLabels({ readingTime: "min" });

    for (const key of Object.keys(DEFAULT_LABELS)) {
      expect(merged[key as keyof typeof merged]).toBeDefined();
    }
  });
});
