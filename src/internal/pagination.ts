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
  // A sheet always has at least one column, whatever the caller asks for.
  const columns = Number.isFinite(columnCount) ? Math.max(1, Math.floor(columnCount)) : 1;
  const emptyColumns = (): EditorialSheet => Array.from({ length: columns }, () => []);

  if (paragraphHeights.length === 0) {
    return [emptyColumns()];
  }

  if (availableHeight <= 0) {
    const trailingColumns = emptyColumns().slice(1);
    return [[paragraphHeights.map((_, index) => index), ...trailingColumns]];
  }

  const sheets: EditorialSheet[] = [];
  let currentSheet: EditorialSheet = emptyColumns();
  let currentColumn = 0;
  let currentColumnHeight = 0;

  paragraphHeights.forEach((height, index) => {
    const fitsCurrentColumn = currentColumnHeight + height <= availableHeight;

    if (fitsCurrentColumn || currentSheet[currentColumn].length === 0) {
      currentSheet[currentColumn].push(index);
      currentColumnHeight += height;
      return;
    }

    if (currentColumn < columns - 1) {
      currentColumn += 1;
      currentSheet[currentColumn].push(index);
      currentColumnHeight = height;
      return;
    }

    sheets.push(currentSheet);
    currentSheet = emptyColumns();
    currentColumn = 0;
    currentSheet[currentColumn].push(index);
    currentColumnHeight = height;
  });

  sheets.push(currentSheet);
  return sheets;
}
