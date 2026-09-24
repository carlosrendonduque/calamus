import { useEffect, useRef, useState } from "react";

/**
 * One address scheme for both views: `#/document/<id>` for a document and
 * `#/gallery/<id>` for a gallery example. A link to either can be pasted into a
 * video description and it opens on that one.
 *
 * Every write is a `replaceState`, so walking thirty-odd examples leaves one
 * history entry rather than thirty: the back button still leaves the page. A
 * hash that is not the caller's (`#preview-heading`, the header's jump link, or
 * the other view's addresses) is ignored rather than treated as a missing id.
 */
export function hashFor(prefix: string, id: string): string {
  return `${prefix}${encodeURIComponent(id)}`;
}

/** The id a `prefix`-shaped hash asks for, or null when the hash is not ours. */
export function requestedId(prefix: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hash = window.location.hash;

  if (!hash.startsWith(prefix)) {
    return null;
  }

  try {
    return decodeURIComponent(hash.slice(prefix.length)) || null;
  } catch {
    // A half-escaped hash is a bad id, not a crash.
    return hash.slice(prefix.length) || null;
  }
}

function writeId(prefix: string, id: string): void {
  const { pathname, search, hash } = window.location;
  const next = hashFor(prefix, id);

  if (hash === next) {
    return;
  }

  window.history.replaceState(null, "", `${pathname}${search}${next}`);
}

/**
 * Keeps one id in step with the URL, under whichever prefix the caller owns. An
 * unknown id falls back to the first one and the URL is rewritten to match, so a
 * stale link lands somewhere real.
 */
export function useHashRoute(
  prefix: string,
  ids: readonly string[]
): [string, (id: string) => void, boolean] {
  const fallback = ids[0];
  const opened = requestedId(prefix);
  // Whether this mount was asked for one by its URL, which is the one time the
  // thing itself rather than the listing should be what the visitor lands on.
  const fromLink = useRef(opened !== null && ids.includes(opened));
  const [caseId, setCaseId] = useState(() =>
    opened && ids.includes(opened) ? opened : fallback
  );

  const selected = ids.includes(caseId) ? caseId : fallback;

  useEffect(() => {
    writeId(prefix, selected);
  }, [prefix, selected]);

  useEffect(() => {
    const onHashChange = () => {
      const requested = requestedId(prefix);

      if (requested === null) {
        return;
      }

      const next = ids.includes(requested) ? requested : fallback;
      setCaseId(next);

      // A link to something that no longer exists should not leave its id
      // sitting in the address bar: the fallback is written back over it.
      if (next !== requested) {
        writeId(prefix, next);
      }
    };

    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [prefix, ids, fallback]);

  return [selected, setCaseId, fromLink.current];
}
