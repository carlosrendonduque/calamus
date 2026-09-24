import { useState, type MutableRefObject } from "react";
import {
  CATEGORY_ORDER,
  type CatalogueGroup,
  type CategoryFilter
} from "./CatalogueCases";
import { CATEGORY_BLURBS, CATEGORY_LABELS, type GalleryCategory } from "./types";

type CatalogueNavProps = {
  query: string;
  onQueryChange: (next: string) => void;
  category: CategoryFilter;
  onCategoryChange: (next: CategoryFilter) => void;
  /** Matches per category under the text query, so a chip can say it is empty. */
  counts: Record<GalleryCategory, number>;
  /** Categories that have at least one match, in category order. */
  groups: readonly CatalogueGroup[];
  matchCount: number;
  total: number;
  selectedId: string;
  selectedCategory: GalleryCategory;
  onSelect: (id: string) => void;
  headingRef: MutableRefObject<HTMLHeadingElement | null>;
};

type OpenState = {
  /** Which filter the overrides belong to: a new filter starts from the defaults. */
  signature: string;
  open: Partial<Record<GalleryCategory, boolean>>;
};

function statusLine(matchCount: number, total: number, category: CategoryFilter, query: string) {
  const scope = category === "all" ? "" : ` in ${CATEGORY_LABELS[category]}`;
  const term = query.trim() ? ` matching "${query.trim()}"` : "";

  if (matchCount === 0) {
    return `No examples${scope}${term}. Clear the filter to see all ${total}.`;
  }

  if (!scope && !term) {
    return `${total} examples, grouped by what they let you do. Open a category to list it.`;
  }

  return `${matchCount} of ${total} examples${scope}${term}.`;
}

/**
 * The catalogue: a text filter, one chip per category, and the matches grouped
 * under their category with its blurb. Groups are `details`, so nine categories
 * and thirty-odd examples collapse to nine lines and the example below stays the
 * tallest thing on the page. No tab pattern, no roving focus: every control here
 * is a button, an input or a native disclosure.
 */
export function CatalogueNav({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  counts,
  groups,
  matchCount,
  total,
  selectedId,
  selectedCategory,
  onSelect,
  headingRef
}: CatalogueNavProps) {
  const signature = `${category}|${query.trim().toLowerCase()}`;
  const [overrides, setOverrides] = useState<OpenState>({ signature, open: {} });
  const active = overrides.signature === signature ? overrides.open : {};

  // Filtering is a request to see the matches, so a filtered group opens itself.
  // Unfiltered, only the group holding the current example is open.
  const isOpen = (group: GalleryCategory) =>
    active[group] ?? (query.trim() !== "" || category !== "all" || group === selectedCategory);

  const setOpen = (group: GalleryCategory, open: boolean) => {
    setOverrides((previous) => ({
      signature,
      open: { ...(previous.signature === signature ? previous.open : {}), [group]: open }
    }));
  };

  return (
    <section className="playground__catalogue" aria-labelledby="gallery-catalogue-heading">
      <h2 className="playground__catalogue-heading" id="gallery-catalogue-heading" ref={headingRef} tabIndex={-1}>
        Catalogue
      </h2>

      <div className="playground__catalogue-find">
        <label className="playground__picker-label" htmlFor="gallery-catalogue-query">
          find
        </label>
        <input
          className="playground__catalogue-input"
          id="gallery-catalogue-query"
          type="search"
          value={query}
          placeholder="title or summary"
          aria-describedby="gallery-catalogue-status"
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query) {
              event.preventDefault();
              onQueryChange("");
            }
          }}
        />
        <button type="button" disabled={!query} onClick={() => onQueryChange("")}>
          Clear
        </button>
      </div>

      <div className="playground__picker">
        <span className="playground__picker-label" id="gallery-catalogue-filter-label">
          category
        </span>
        <div
          className="playground__picker-buttons"
          role="group"
          aria-labelledby="gallery-catalogue-filter-label"
        >
          <button
            type="button"
            className={
              category === "all" ? "playground__catalogue-chip is-active" : "playground__catalogue-chip"
            }
            aria-pressed={category === "all"}
            aria-label={`All categories, ${total} examples`}
            onClick={() => onCategoryChange("all")}
          >
            All
            <span className="playground__catalogue-chip-count">{total}</span>
          </button>
          {CATEGORY_ORDER.map((entry) => {
            const pressed = category === entry;
            return (
              <button
                key={entry}
                type="button"
                className={pressed ? "playground__catalogue-chip is-active" : "playground__catalogue-chip"}
                aria-pressed={pressed}
                aria-label={
                  counts[entry] === 0
                    ? `${CATEGORY_LABELS[entry]}, no matching examples`
                    : `${CATEGORY_LABELS[entry]}, ${counts[entry]} examples`
                }
                // Never disable the pressed chip: focus must not vanish under the user.
                disabled={counts[entry] === 0 && !pressed}
                onClick={() => onCategoryChange(entry)}
              >
                {CATEGORY_LABELS[entry]}
                <span className="playground__catalogue-chip-count">{counts[entry]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="playground__catalogue-status" id="gallery-catalogue-status" role="status">
        {statusLine(matchCount, total, category, query)}
      </p>

      {groups.length === 0 ? null : (
        <div className="playground__catalogue-groups">
          {groups.map((group) => (
            <details
              className="playground__catalogue-group"
              key={group.category}
              open={isOpen(group.category)}
              onToggle={(event) => setOpen(group.category, event.currentTarget.open)}
            >
              <summary>
                <span className="playground__catalogue-group-label">
                  {CATEGORY_LABELS[group.category]}
                </span>
                <span className="playground__catalogue-group-count">{group.cases.length}</span>
                <span className="playground__catalogue-blurb">{CATEGORY_BLURBS[group.category]}</span>
              </summary>
              <ul className="playground__catalogue-list">
                {group.cases.map((entry) => {
                  const pressed = entry.id === selectedId;
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className={
                          pressed ? "playground__catalogue-item is-active" : "playground__catalogue-item"
                        }
                        aria-pressed={pressed}
                        onClick={() => onSelect(entry.id)}
                      >
                        <span className="playground__catalogue-item-title">{entry.title}</span>
                        <span className="playground__catalogue-item-summary">{entry.summary}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
