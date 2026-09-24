import { hashFor, useHashRoute } from "../hashRoute";

/**
 * The gallery's own address, which is what `#/gallery/<id>` has always meant: an
 * example of the hypertext gallery, in the props explorer. The routing itself
 * lives in `hashRoute.ts`, where the document view shares it.
 */
export const CASE_HASH_PREFIX = "#/gallery/";

export function caseHash(id: string): string {
  return hashFor(CASE_HASH_PREFIX, id);
}

export function useCaseRoute(
  ids: readonly string[]
): [string, (id: string) => void, boolean] {
  return useHashRoute(CASE_HASH_PREFIX, ids);
}
