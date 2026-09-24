import type { ReaderContent } from "../types";

export function getWordCount(body: string[]): number {
  return body.reduce((total, paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean).length;
    return total + words;
  }, 0);
}

export function getReadingTimeText(content: ReaderContent, readingTimeLabel: string): string {
  const words = getWordCount(content.body);
  const minutes = Math.max(1, Math.ceil(words / 250));
  return `${minutes} ${readingTimeLabel}`;
}
