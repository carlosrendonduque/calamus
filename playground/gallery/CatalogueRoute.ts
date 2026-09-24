import { useEffect, useRef, useState } from "react";

/**
 * The selected example is addressable: `#/gallery/<id>`. A link to one case can
 * be pasted into a video description and it opens on that case.
 *
 * Every write is a `replaceState`, so walking thirty-odd examples leaves one
 * history entry rather than thirty: the back button still leaves the page. A
 * hash that is not ours (`#preview-heading`, the header's jump link) is ignored
 * rather than treated as a missing case.
 */
export const CASE_HASH_PREFIX = "#/gallery/";

export function caseHash(id: string): string {
  return `${CASE_HASH_PREFIX}${encodeURIComponent(id)}`;
}

function requestedCaseId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hash = window.location.hash;

  if (!hash.startsWith(CASE_HASH_PREFIX)) {
    return null;
  }

  try {
    return decodeURIComponent(hash.slice(CASE_HASH_PREFIX.length)) || null;
  } catch {
    // A half-escaped hash is a bad id, not a crash.
    return hash.slice(CASE_HASH_PREFIX.length) || null;
  }
}

function writeCaseId(id: string): void {
  const { pathname, search, hash } = window.location;
  const next = caseHash(id);

  if (hash === next) {
    return;
  }

  window.history.replaceState(null, "", `${pathname}${search}${next}`);
}

/**
 * Keeps one case id in step with the URL. An unknown id falls back to the first
 * case and the URL is rewritten to match, so a stale link lands somewhere real.
 */
export function useCaseRoute(
  ids: readonly string[]
): [string, (id: string) => void, boolean] {
  const fallback = ids[0];
  const opened = requestedCaseId();
  // Whether this mount was asked for a case by its URL, which is the one time
  // the example rather than the catalogue should be what the visitor lands on.
  const fromLink = useRef(opened !== null && ids.includes(opened));
  const [caseId, setCaseId] = useState(() =>
    opened && ids.includes(opened) ? opened : fallback
  );

  const selected = ids.includes(caseId) ? caseId : fallback;

  useEffect(() => {
    writeCaseId(selected);
  }, [selected]);

  useEffect(() => {
    const onHashChange = () => {
      const requested = requestedCaseId();

      if (requested === null) {
        return;
      }

      const next = ids.includes(requested) ? requested : fallback;
      setCaseId(next);

      // A link to a case that no longer exists should not leave its id sitting
      // in the address bar: the fallback is written back over it.
      if (next !== requested) {
        writeCaseId(next);
      }
    };

    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [ids, fallback]);

  return [selected, setCaseId, fromLink.current];
}
