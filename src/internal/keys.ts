/** Distance of an arrow-key scroll step, in pixels. */
const SCROLL_STEP = 80;

export type ScrollAction =
  | { kind: "step"; direction: -1 | 1 }
  | { kind: "page"; direction: -1 | 1 }
  | { kind: "edge"; edge: "start" | "end" };

export type PageAction = "previous" | "next" | "first" | "last";

/** Keyboard contract of the freely scrolling modes: `scroll`, `terminal`, `hypertext`. */
export function getScrollAction(key: string, shiftKey = false): ScrollAction | null {
  switch (key) {
    case "ArrowDown":
      return { kind: "step", direction: 1 };
    case "ArrowUp":
      return { kind: "step", direction: -1 };
    case "PageDown":
      return { kind: "page", direction: 1 };
    case "PageUp":
      return { kind: "page", direction: -1 };
    case " ":
      return { kind: "page", direction: shiftKey ? -1 : 1 };
    case "Home":
      return { kind: "edge", edge: "start" };
    case "End":
      return { kind: "edge", edge: "end" };
    default:
      return null;
  }
}

/** Keyboard contract of the paginated modes: `book`, `editorial`. */
export function getPageAction(key: string, shiftKey = false): PageAction | null {
  switch (key) {
    case "ArrowLeft":
    case "PageUp":
      return "previous";
    case "ArrowRight":
    case "PageDown":
      return "next";
    case " ":
      return shiftKey ? "previous" : "next";
    case "Home":
      return "first";
    case "End":
      return "last";
    default:
      return null;
  }
}

function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "smooth";
  }

  // A keyboard scroll is still a scroll: animate it only if motion is welcome.
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function applyScrollAction(element: HTMLElement, action: ScrollAction): void {
  const behavior = scrollBehavior();

  if (action.kind === "step") {
    element.scrollBy({ top: SCROLL_STEP * action.direction, behavior });
    return;
  }

  if (action.kind === "page") {
    element.scrollBy({ top: element.clientHeight * action.direction, behavior });
    return;
  }

  element.scrollTo({ top: action.edge === "start" ? 0 : element.scrollHeight, behavior });
}
