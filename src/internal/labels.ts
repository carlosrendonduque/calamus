import type { ReaderLabels, ReaderMode } from "../types";

const MODE_NAMES: Record<ReaderMode, string> = {
  scroll: "Scroll reading mode",
  book: "Book reading mode",
  terminal: "Terminal reading mode",
  editorial: "Editorial reading mode",
  hypertext: "Hypertext reading mode"
};

export const DEFAULT_LABELS: Required<ReaderLabels> = {
  page: (current, total) => `Page ${current} of ${total}`,
  sheet: (current, total) => `Sheet ${current} of ${total}`,
  readingTime: "min read",
  readingMode: (mode) => MODE_NAMES[mode],
  progress: (percent) => `Reading progress: ${percent}%`,
  pageNavigation: "Book page navigation",
  sheetNavigation: "Editorial sheet navigation",
  previousPage: "Previous page",
  nextPage: "Next page",
  previousSheet: "Previous sheet",
  nextSheet: "Next sheet"
};

/**
 * Host overrides win; an explicitly `undefined` entry falls back to the English
 * default instead of blanking the string.
 */
export function mergeLabels(labels?: ReaderLabels): Required<ReaderLabels> {
  const merged = { ...DEFAULT_LABELS };

  if (!labels) {
    return merged;
  }

  for (const key of Object.keys(DEFAULT_LABELS) as (keyof ReaderLabels)[]) {
    const value = labels[key];

    if (value !== undefined) {
      (merged as Record<keyof ReaderLabels, unknown>)[key] = value;
    }
  }

  return merged;
}
