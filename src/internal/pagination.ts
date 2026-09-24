import { createElement, useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement, RefObject } from "react";
import type { ReaderTransition } from "../types";
import { getPageAction } from "./keys";

export type TurnDirection = "forward" | "backward";

/**
 * How much is shaved off the measured ratio before rounding up. Two facts fix
 * it, and both are arithmetic rather than taste.
 *
 * The flow carries half a column gap of padding at each end so that one page is
 * exactly one scrollport wide (see `.calamus__pager-flow`). Blink leaves the
 * trailing padding out of `scrollWidth`, so a document that is exactly `pages`
 * pages long measures `pages - gap / (2 * pageWidth)` instead of `pages` — a
 * deficit that grows as the reader narrows but stays well under a quarter page
 * for any gap a reader would set. Shaving that off before `ceil` turns the
 * deficit into a no-op rather than an extra page.
 *
 * The other direction is the partial last page: with `columns` columns per page
 * the ratio is a multiple of `1 / columns`, so a page that is only part full
 * measures at least `1 / columns` above the page below it. The shave has to stay
 * under that or a half-full last page would be rounded away. At the two column
 * counts the library ships — one and two — the budget is 0.5, and 0.25 sits in
 * the middle of the two bounds.
 */
export const PAGE_COUNT_TOLERANCE = 0.25;

/**
 * The whole paginator. CSS columns lay the text out; this turns the two numbers
 * the browser reports about that layout into a page count.
 *
 * Nothing here measures a paragraph, so nothing here rounds one. That is the
 * point of decision 24: the old paginator made one rounding decision per
 * paragraph and the page count was their sum, so a boundary that fell inside a
 * rounding error moved between runs. One division cannot do that.
 */
export function countPages(flowScrollWidth: number, pageWidth: number): number {
  if (!Number.isFinite(flowScrollWidth) || !Number.isFinite(pageWidth) || pageWidth <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(flowScrollWidth / pageWidth - PAGE_COUNT_TOLERANCE));
}

/** A page index that exists, whatever the caller asks for. */
export function clampPage(page: number, totalPages: number): number {
  const last = Math.max(0, Math.floor(totalPages) - 1);

  if (!Number.isFinite(page)) {
    return 0;
  }

  return Math.min(Math.max(0, Math.round(page)), last);
}

/**
 * Where the scroller has to be for a given page to fill the scrollport.
 *
 * `pageWidth` is the fractional width of the page, not `clientWidth`. The snap
 * markers sit at multiples of `100%` of the same box, which the engine resolves
 * against the real width, so a whole-pixel answer here would miss the marker by
 * `page * fraction` — a quarter of a page by the time a long chapter reaches its
 * hundredth.
 */
export function scrollLeftForPage(page: number, pageWidth: number): number {
  if (!Number.isFinite(page) || !Number.isFinite(pageWidth) || pageWidth <= 0) {
    return 0;
  }

  return Math.max(0, Math.round(page) * pageWidth);
}

/**
 * The page the scroller is showing. Snap points are whole pages, so this is a
 * division and a round; a scroll caught mid-gesture answers with the page it is
 * closest to.
 */
export function pageFromScrollLeft(scrollLeft: number, pageWidth: number, totalPages: number): number {
  if (!Number.isFinite(scrollLeft) || !Number.isFinite(pageWidth) || pageWidth <= 0) {
    return 0;
  }

  return clampPage(Math.round(scrollLeft / pageWidth), totalPages);
}

export function turnDirection(from: number, to: number): TurnDirection {
  return to >= from ? "forward" : "backward";
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * How a turn moves. `slide` is the scroll itself, so it is the one transition
 * that animates the scroller; `fade` jumps and then fades the flow back in,
 * which is what the old paginator did when it swapped the page's children; and
 * reduced motion turns any animated scroll into an instant one, the same rule
 * `keys.ts` applies to keyboard scrolling.
 */
export function turnBehavior(transition: ReaderTransition, reducedMotion: boolean): ScrollBehavior {
  if (reducedMotion || transition !== "slide") {
    return "auto";
  }

  return "smooth";
}

/**
 * The class that plays the turn on the flow. `slide` is the scroll itself, so it
 * asks for no animation; `fade` jumps and fades, and alternates between two
 * identical animations so that the browser restarts it on every turn. The old
 * paginator restarted it by remounting the page's children, which is not
 * available here: the flow holds the whole document, and remounting it would
 * throw the scroll position away along with the pagination.
 */
export function turnAnimationClassName(
  transition: ReaderTransition,
  turnTick: number,
  prefix: string
): string {
  if (transition !== "fade") {
    return `${prefix}--none`;
  }

  return turnTick % 2 === 0 ? `${prefix}--fade-a` : `${prefix}--fade-b`;
}

/**
 * One marker per page, pinned to that page's left edge. Columns are not
 * elements, so they cannot carry `scroll-snap-align` themselves; these can, and
 * they are what makes a swipe land on a page instead of between two.
 *
 * They are a full page wide on purpose. Blink leaves the flow's trailing padding
 * out of the scrollable area, which would stop the last page half a gap short of
 * its own left edge; the last marker reaches past that and the page lands
 * square. Nothing measures them — the count is read off the flow, which does not
 * contain them — so they cannot feed back into the count that produced them.
 */
export function renderSnapPoints(totalPages: number): ReactElement[] {
  return Array.from({ length: Math.max(1, totalPages) }, (_, index) =>
    createElement("div", {
      key: index,
      className: "calamus__page-snap",
      style: { left: `${index * 100}%` },
      "aria-hidden": "true"
    })
  );
}

/**
 * The width of one page, to the sub-pixel.
 *
 * `clientWidth` is a whole number and the page is not, so dividing by it puts an
 * error of `pages * fraction / pageWidth` into the count: at 228 pages of a
 * 240.44px page that reached 0.42 of a page and the reader grew a blank sheet on
 * the end. The flow's border box is the pager's padding box — the pager has no
 * padding of its own, and reading it off the flow means a border a host puts on
 * the pager cannot get into the number either — and `getBoundingClientRect`
 * reports it unrounded.
 */
function readPageWidth(pager: HTMLElement, flow: HTMLElement | null): number {
  const measured = flow?.getBoundingClientRect().width ?? 0;

  return measured > 0 ? measured : pager.clientWidth;
}

export type Pager = {
  /** The scrollport: fixed height, one page wide, the thing that scrolls. */
  pagerRef: RefObject<HTMLDivElement>;
  /** The multi-column flow inside it, and the only thing measured. */
  flowRef: RefObject<HTMLDivElement>;
  totalPages: number;
  /** Zero-based. */
  currentPage: number;
  direction: TurnDirection;
  /** False until the reader turns a page for real; see decision 14. */
  hasTurned: boolean;
  /** Increments only on a turn the reader asked for, never on a re-layout. */
  turnTick: number;
  goTo: (page: number) => void;
  goPrevious: () => void;
  goNext: () => void;
  handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/**
 * The paginated modes, both of them. `book` is this with one column per page and
 * `editorial` is this with as many as the `@container` rule declares; neither
 * mode has to know which, because the count comes out of the same division
 * either way.
 */
export function usePager(transition: ReaderTransition, contentKey: unknown): Pager {
  const pagerRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState<TurnDirection>("forward");
  const [hasTurned, setHasTurned] = useState(false);
  const [turnTick, setTurnTick] = useState(0);

  // The scroller is read and written from event handlers that must not go stale,
  // so the two numbers that steer it are kept in refs as well as in state.
  const pageRef = useRef(0);
  const totalRef = useRef(1);
  // A scroll only counts as navigation if the reader caused it. Mounting and
  // re-measuring both move the scroller and both have to stay silent, which is
  // decision 14's whole point; a swipe, a wheel or a key does not.
  const gestureRef = useRef(false);

  const measure = useCallback(() => {
    const pager = pagerRef.current;
    const flow = flowRef.current;

    if (!pager || !flow) {
      return;
    }

    const pageWidth = readPageWidth(pager, flow);

    if (pageWidth <= 0) {
      return;
    }

    const pages = countPages(flow.scrollWidth, pageWidth);
    const target = clampPage(pageRef.current, pages);

    totalRef.current = pages;
    pageRef.current = target;
    setTotalPages(pages);
    setCurrentPage(target);

    // Stay on the page that was being read. Writing `scrollLeft` cannot resize
    // the scroller, so this is not the feedback loop of decision 19 wearing a
    // new hat: the scroller's height comes from the frame and its width from the
    // mode surface, and neither is touched here.
    const left = scrollLeftForPage(target, pageWidth);

    if (Math.abs(pager.scrollLeft - left) > 1) {
      pager.scrollLeft = left;
    }
  }, []);

  useEffect(() => {
    const pager = pagerRef.current;
    const flow = flowRef.current;

    if (!pager || !flow) {
      return;
    }

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });

    // The scroller and the flow inside it. Neither is a box that takes its size
    // from its own content — the scroller's height comes from the frame and its
    // width from the mode surface, and the flow fills the scroller whatever the
    // columns do — so watching them cannot make the thing they watch move. That
    // is the whole of decision 19's rule, and it is why these two and not, say,
    // the page.
    //
    // The flow earns its place on the content box: the gap is a custom property
    // a host can change at any time, and a change to it moves the flow's padding
    // without moving anything the scroller can feel.
    observer.observe(pager);
    observer.observe(flow);

    // Content that settles late — a web font swapping in, an image arriving —
    // changes how many columns the flow needs without changing the size of
    // anything the observer can see. These are the two signals the platform
    // offers for it. `load` does not bubble, hence the capture phase.
    const onLateLoad = () => {
      measure();
    };

    pager.addEventListener("load", onLateLoad, true);
    pager.addEventListener("error", onLateLoad, true);

    let cancelled = false;

    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) {
          measure();
        }
      });
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      pager.removeEventListener("load", onLateLoad, true);
      pager.removeEventListener("error", onLateLoad, true);
    };
  }, [contentKey, measure]);

  useEffect(() => {
    const pager = pagerRef.current;

    if (!pager) {
      return;
    }

    let frame = 0;

    const settle = () => {
      frame = 0;

      const pageWidth = readPageWidth(pager, flowRef.current);

      if (pageWidth <= 0) {
        return;
      }

      const next = pageFromScrollLeft(pager.scrollLeft, pageWidth, totalRef.current);

      if (next === pageRef.current) {
        return;
      }

      setDirection(turnDirection(pageRef.current, next));
      pageRef.current = next;
      setCurrentPage(next);

      // A swipe produces a run of scroll events and only the last of them lands
      // on a new page, so the flag has to outlive the ones in between. It is
      // never cleared: it only ever gates the first announcement, and after a
      // reader has put a finger on the page there is no turn of theirs that
      // should be silent.
      if (gestureRef.current) {
        setHasTurned(true);
      }
    };

    const onScroll = () => {
      if (frame) {
        return;
      }

      frame = requestAnimationFrame(settle);
    };

    const onGesture = () => {
      gestureRef.current = true;
    };

    pager.addEventListener("scroll", onScroll, { passive: true });
    pager.addEventListener("pointerdown", onGesture, { passive: true });
    pager.addEventListener("touchstart", onGesture, { passive: true });
    pager.addEventListener("wheel", onGesture, { passive: true });
    pager.addEventListener("keydown", onGesture);

    return () => {
      pager.removeEventListener("scroll", onScroll);
      pager.removeEventListener("pointerdown", onGesture);
      pager.removeEventListener("touchstart", onGesture);
      pager.removeEventListener("wheel", onGesture);
      pager.removeEventListener("keydown", onGesture);

      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  const goTo = useCallback(
    (page: number) => {
      const pager = pagerRef.current;

      if (!pager) {
        return;
      }

      const target = clampPage(page, totalRef.current);

      if (target === pageRef.current) {
        return;
      }

      setDirection(turnDirection(pageRef.current, target));
      pageRef.current = target;
      setCurrentPage(target);
      setTurnTick((tick) => tick + 1);
      // The live region stays empty until the reader turns a page, so mounting
      // and re-pagination are silent and only real page turns are announced.
      setHasTurned(true);

      pager.scrollTo({
        left: scrollLeftForPage(target, readPageWidth(pager, flowRef.current)),
        behavior: turnBehavior(transition, prefersReducedMotion())
      });
    },
    [transition]
  );

  const goPrevious = useCallback(() => {
    goTo(pageRef.current - 1);
  }, [goTo]);

  const goNext = useCallback(() => {
    goTo(pageRef.current + 1);
  }, [goTo]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const action = getPageAction(event.key, event.shiftKey);

      if (!action) {
        return;
      }

      event.preventDefault();

      if (action === "previous") {
        goPrevious();
        return;
      }

      if (action === "next") {
        goNext();
        return;
      }

      goTo(action === "first" ? 0 : totalRef.current - 1);
    },
    [goNext, goPrevious, goTo]
  );

  return {
    pagerRef,
    flowRef,
    totalPages,
    currentPage,
    direction,
    hasTurned,
    turnTick,
    goTo,
    goPrevious,
    goNext,
    handleKeyDown
  };
}
