import { CASE_HASH_PREFIX } from "../gallery/CatalogueRoute";

/**
 * A document is addressable in the same style the gallery already used:
 * `#/document/<id>`, where the id is the file's own name under
 * `docs/conformance-v1/`. `#/gallery/<id>` keeps meaning what it has always
 * meant — an example of the props explorer's hypertext gallery — so a link
 * already pasted somewhere still lands where it did.
 */
export const DOCUMENT_HASH_PREFIX = "#/document/";

/** Which of the two views the page is being asked for. */
export type PlaygroundView = "document" | "props";

/**
 * The document is what a visitor meets, because the document is the product. The
 * props explorer opens only when the URL asks for it — which a `#/gallery/<id>`
 * link does, since a gallery example exists nowhere else.
 */
export function viewForHash(hash: string): PlaygroundView | null {
  if (hash.startsWith(CASE_HASH_PREFIX)) {
    return "props";
  }

  if (hash.startsWith(DOCUMENT_HASH_PREFIX)) {
    return "document";
  }

  return null;
}

export function openingView(): PlaygroundView {
  if (typeof window === "undefined") {
    return "document";
  }

  return viewForHash(window.location.hash) ?? "document";
}
