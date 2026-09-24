import { GALLERY_CASES } from ".";
import { CATEGORY_LABELS, type GalleryCase, type GalleryCategory } from "./types";

/**
 * The catalogue's view of the registry: the same cases, in display order, with
 * the grouping, counting and filtering the navigation needs. Nothing here knows
 * about React, so the ordering rules can be reasoned about on their own.
 */

/**
 * Category order is the key order of `CATEGORY_LABELS`, which `types.ts` states
 * is the display order. Reading it from there keeps the catalogue exhaustive: a
 * tenth category would appear here without this file being touched.
 */
export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as readonly GalleryCategory[];

/** Display order: category order first, registry order inside a category. */
export const CATALOGUE_CASES: readonly GalleryCase[] = CATEGORY_ORDER.flatMap((category) =>
  GALLERY_CASES.filter((entry) => entry.category === category)
);

export const CATALOGUE_IDS: readonly string[] = CATALOGUE_CASES.map((entry) => entry.id);

/** How many categories the registry actually populates, for the intro copy. */
export const POPULATED_CATEGORIES = CATEGORY_ORDER.filter((category) =>
  CATALOGUE_CASES.some((entry) => entry.category === category)
).length;

export type CategoryFilter = GalleryCategory | "all";

export type CatalogueGroup = {
  category: GalleryCategory;
  cases: readonly GalleryCase[];
};

/** Title, summary and category label, so "structure" finds the structural pieces. */
export function matchesQuery(entry: GalleryCase, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  const haystack = `${entry.title} ${entry.summary} ${CATEGORY_LABELS[entry.category]}`;
  return haystack.toLowerCase().includes(needle);
}

export function filterCases(
  cases: readonly GalleryCase[],
  category: CategoryFilter,
  query: string
): readonly GalleryCase[] {
  return cases.filter(
    (entry) => (category === "all" || entry.category === category) && matchesQuery(entry, query)
  );
}

/** Counts per category under the text query alone, so the chips say where matches are. */
export function countByCategory(
  cases: readonly GalleryCase[],
  query: string
): Record<GalleryCategory, number> {
  const counts = Object.fromEntries(
    CATEGORY_ORDER.map((category) => [category, 0])
  ) as Record<GalleryCategory, number>;

  for (const entry of cases) {
    if (matchesQuery(entry, query)) {
      counts[entry.category] += 1;
    }
  }

  return counts;
}

/** Groups in category order; a category with no matching case is left out. */
export function groupCases(cases: readonly GalleryCase[]): readonly CatalogueGroup[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    cases: cases.filter((entry) => entry.category === category)
  })).filter((group) => group.cases.length > 0);
}

export function caseAt(index: number): GalleryCase | undefined {
  return CATALOGUE_CASES[index];
}

export function indexOfCase(id: string): number {
  return CATALOGUE_CASES.findIndex((entry) => entry.id === id);
}
