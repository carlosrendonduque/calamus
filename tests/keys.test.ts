import { describe, expect, it } from "vitest";
import { getPageAction, getScrollAction } from "../src/internal/keys";

describe("getScrollAction", () => {
  it("steps with the arrow keys", () => {
    expect(getScrollAction("ArrowDown")).toEqual({ kind: "step", direction: 1 });
    expect(getScrollAction("ArrowUp")).toEqual({ kind: "step", direction: -1 });
  });

  it("scrolls a screenful with the page keys", () => {
    expect(getScrollAction("PageDown")).toEqual({ kind: "page", direction: 1 });
    expect(getScrollAction("PageUp")).toEqual({ kind: "page", direction: -1 });
  });

  it("moves forward with space and backward with shift+space", () => {
    expect(getScrollAction(" ")).toEqual({ kind: "page", direction: 1 });
    expect(getScrollAction(" ", true)).toEqual({ kind: "page", direction: -1 });
  });

  it("jumps to either end", () => {
    expect(getScrollAction("Home")).toEqual({ kind: "edge", edge: "start" });
    expect(getScrollAction("End")).toEqual({ kind: "edge", edge: "end" });
  });

  it("ignores keys it does not own", () => {
    expect(getScrollAction("ArrowLeft")).toBeNull();
    expect(getScrollAction("a")).toBeNull();
    expect(getScrollAction("Enter")).toBeNull();
    expect(getScrollAction("Tab")).toBeNull();
    expect(getScrollAction("")).toBeNull();
  });

  it("only treats shift as reverse for space", () => {
    expect(getScrollAction("ArrowDown", true)).toEqual({ kind: "step", direction: 1 });
    expect(getScrollAction("PageDown", true)).toEqual({ kind: "page", direction: 1 });
  });
});

describe("getPageAction", () => {
  it("turns pages with the arrow keys", () => {
    expect(getPageAction("ArrowLeft")).toBe("previous");
    expect(getPageAction("ArrowRight")).toBe("next");
  });

  it("turns pages with the page keys", () => {
    expect(getPageAction("PageUp")).toBe("previous");
    expect(getPageAction("PageDown")).toBe("next");
  });

  it("moves forward with space and backward with shift+space", () => {
    expect(getPageAction(" ")).toBe("next");
    expect(getPageAction(" ", true)).toBe("previous");
  });

  it("jumps to the first and last page", () => {
    expect(getPageAction("Home")).toBe("first");
    expect(getPageAction("End")).toBe("last");
  });

  it("ignores keys it does not own", () => {
    expect(getPageAction("ArrowDown")).toBeNull();
    expect(getPageAction("ArrowUp")).toBeNull();
    expect(getPageAction("b")).toBeNull();
    expect(getPageAction("Tab")).toBeNull();
    expect(getPageAction("")).toBeNull();
  });
});
