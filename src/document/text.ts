/**
 * Interpolated prose, on its way to two different destinations.
 *
 * Decision 25 makes the deliverable an HTML compiler, so `phrase.ts` escapes
 * every interpolation as it makes it: `interpolate` hands back a string that is
 * already safe to write into an HTML **text** position, with `&`, `<` and `>`
 * turned into entities and quotes deliberately left alone, because escaping an
 * apostrophe would corrupt "the clerk's" and "l'intérieur".
 *
 * React is the other destination, and React escapes for itself. A string that
 * has already been escaped and is then handed to React as a child comes out as
 * `&amp;lt;` on the page: escaped twice, and wrong in a way that only shows up
 * in prose that contains an ampersand.
 *
 * So there are exactly two functions here, and which one a caller wants is
 * decided by where the string lands:
 *
 * - `plainText` — for React, which will do the escaping. It interpolates through
 *   `phrase.ts` (never a second interpolator: the rule that braces hold a name
 *   and never an expression, and that the result is never scanned again, lives
 *   there and must live in one place) and then undoes exactly the three
 *   substitutions `escapeText` made, so that React's own escaping is the only
 *   one that happens.
 * - `markupText` / `markupAttribute` — for the compiler route, where nothing
 *   else escapes and the string is written into HTML as it stands. `escapeText`
 *   for a text position; `escapeAttribute` for an attribute position, where a
 *   quote ends the value and so has to go.
 *
 * The one place this renderer itself builds an attribute value that nothing
 * downstream escapes is a CSS custom property, which is why `markupAttribute`
 * is used there and nowhere else.
 */

import type { Scope } from "./evaluator";
import { escapeAttribute, escapeText, interpolate } from "./evaluator";

/** The three entities `escapeText` makes, and nothing else: a single pass, so
 *  `&amp;lt;` comes back as `&lt;` rather than as `<`. */
const ESCAPED = /&(amp|lt|gt);/g;

const UNESCAPED: Record<string, string> = { amp: "&", lt: "<", gt: ">" };

export function decodeText(value: string): string {
  if (typeof value !== "string" || value.indexOf("&") === -1) {
    return value ?? "";
  }

  return value.replace(ESCAPED, (whole, name: string) => UNESCAPED[name] ?? whole);
}

/**
 * Prose with its interpolations filled, for a React child or a React attribute.
 *
 * React escapes both positions itself, so what comes out of here is the text the
 * reader should see, not markup.
 */
export function plainText(source: string, scope: Scope): string {
  if (typeof source !== "string" || source === "") {
    return "";
  }

  return decodeText(interpolate(source, scope));
}

/** Prose with its interpolations filled, for an HTML text position. */
export function markupText(source: string, scope: Scope): string {
  if (typeof source !== "string" || source === "") {
    return "";
  }

  return interpolate(source, scope);
}

/**
 * Prose with its interpolations filled, for an HTML attribute position.
 *
 * The composition is deliberate and slightly awkward: `interpolate` has already
 * escaped the text position, so the value is decoded first and escaped once, for
 * the position it is actually going into. Escaping on top of escaping would turn
 * one ampersand into `&amp;amp;` inside the attribute.
 */
export function markupAttribute(source: string, scope: Scope): string {
  return escapeAttribute(decodeText(markupText(source, scope)));
}

/** A literal value already resolved, for an attribute position. */
export function attributeValue(value: string): string {
  return escapeAttribute(value);
}

/** A literal value already resolved, for a text position. */
export function textValue(value: string): string {
  return escapeText(value);
}
