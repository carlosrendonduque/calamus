export type EditorialSheet = number[][];

export function paginateParagraphs(paragraphHeights: number[], availableHeight: number): number[][] {
  if (paragraphHeights.length === 0) {
    return [[]];
  }

  if (availableHeight <= 0) {
    return [paragraphHeights.map((_, index) => index)];
  }

  const pages: number[][] = [];
  let currentPage: number[] = [];
  let currentHeight = 0;

  paragraphHeights.forEach((height, index) => {
    if (currentPage.length === 0) {
      currentPage = [index];
      currentHeight = height;
      return;
    }

    if (currentHeight + height <= availableHeight) {
      currentPage.push(index);
      currentHeight += height;
      return;
    }

    pages.push(currentPage);
    currentPage = [index];
    currentHeight = height;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

export function paginateEditorialParagraphs(
  paragraphHeights: number[],
  availableHeight: number,
  columnCount: number
): EditorialSheet[] {
  const emptyColumns = (count: number): EditorialSheet => Array.from({ length: count }, () => []);

  if (paragraphHeights.length === 0) {
    return [emptyColumns(columnCount)];
  }

  if (availableHeight <= 0) {
    const trailingColumns = emptyColumns(columnCount).slice(1);
    return [[paragraphHeights.map((_, index) => index), ...trailingColumns]];
  }

  const sheets: EditorialSheet[] = [];
  let currentSheet: EditorialSheet = Array.from({ length: columnCount }, () => []);
  let currentColumn = 0;
  let currentColumnHeight = 0;

  paragraphHeights.forEach((height, index) => {
    const fitsCurrentColumn = currentColumnHeight + height <= availableHeight;

    if (fitsCurrentColumn || currentSheet[currentColumn].length === 0) {
      currentSheet[currentColumn].push(index);
      currentColumnHeight += height;
      return;
    }

    if (currentColumn < columnCount - 1) {
      currentColumn += 1;
      currentSheet[currentColumn].push(index);
      currentColumnHeight = height;
      return;
    }

    sheets.push(currentSheet);
    currentSheet = Array.from({ length: columnCount }, () => []);
    currentColumn = 0;
    currentSheet[currentColumn].push(index);
    currentColumnHeight = height;
  });

  sheets.push(currentSheet);
  return sheets;
}
