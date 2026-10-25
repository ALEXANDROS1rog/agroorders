/**
 * Finger-tracking horizontal pager (framework agnostic, no dependencies).
 *
 * The `track` element follows the finger 1:1 for the whole duration of the touch,
 * so the current page slides out while its neighbours (rendered next to it by the
 * caller) slide in. On release it settles to the neighbour or back, based on the
 * drag distance and the release velocity.
 *
 * Direction is disambiguated by the browser: the viewport must have
 * `touch-action: pan-y pinch-zoom`. A vertical pan makes the browser scroll and
 * fire `pointercancel` (we back off); horizontal moves are delivered to us.
 *
 * Touch, pen, and primary mouse pointers can drag; keyboard and link activation are untouched.
 */

export type TabPagerOptions = {
  /** Element that receives the pointer events (should have touch-action: pan-y pinch-zoom). */
  viewport: HTMLElement;
  /** Element translated along the X axis; it contains the current page and its neighbours. */
  track: HTMLElement;
  /** Index of the page currently shown. Read live, so it may change between gestures. */
  getIndex: () => number;
  /** Number of pages. Pages without a neighbour in the drag direction resist (rubber band). */
  count: number;
  /** Fired once a horizontal drag is recognised: mount the neighbouring pages now. */
  onLock?: () => void;
  /** Continuous position (page index as a float, e.g. 1.37) for syncing the tab bar. */
  onProgress?: (position: number) => void;
  /** The transition finished on another page. Navigate here. */
  onCommit: (targetIndex: number) => void;
  /** The gesture ended back on the current page (or the commit never unmounted us). */
  onRest?: () => void;
  /** True when the user prefers reduced motion: settle instantly. */
  reducedMotion?: () => boolean;
};

const SLOP = 10; // px of movement before we decide the direction
const DIRECTION_RATIO = 1.4; // |dx| must beat |dy| by this factor to count as horizontal
const EDGE_GUARD = 20; // px; leave the screen edges to the browser's own back/forward swipe
const PROJECT_MS = 180; // how far ahead the release velocity is projected
const COMMIT_FRACTION = 0.5; // projected distance (as a share of the width) needed to switch
const FLICK_VELOCITY = 0.4; // px/ms: a quick flick switches page even over a short distance
const FLICK_MIN_DISTANCE = 28; // px the page must already have moved for a flick to count
const MIN_SETTLE_MS = 170;
const MAX_SETTLE_MS = 380;
const STUCK_MS = 4000; // if navigation never replaces us, return to rest

/** Controls that must keep their own touch behaviour. */
const SKIP_SELECTOR = [
  "a",
  "button",
  "[role=button]",
  "[role=combobox]",
  "[role=checkbox]",
  "[role=radio]",
  "input",
  "textarea",
  "select",
  "option",
  '[contenteditable=""]',
  '[contenteditable="true"]',
  "[data-no-swipe]",
  ".gm-style",
  "canvas",
  "video",
  "iframe",
  '[role="slider"]',
].join(",");

type Mode = "idle" | "pending" | "drag" | "settling" | "done";

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

/** True if a horizontally scrollable ancestor (e.g. a chip row) sits between target and viewport. */
function insideHorizontalScroller(target: Element, stop: HTMLElement): boolean {
  for (let el: Element | null = target; el && el !== stop; el = el.parentElement) {
    if (!(el instanceof HTMLElement) || el.scrollWidth <= el.clientWidth + 1) continue;
    const ox = getComputedStyle(el).overflowX;
    if (ox === "auto" || ox === "scroll") return true;
  }
  return false;
}

export function createTabPager(opts: TabPagerOptions): { destroy: () => void } {
  const { viewport, track } = opts;

  let mode: Mode = "idle";
  let pointerId = -1;
  let startX = 0;
  let startY = 0;
  let lockX = 0; // pointer X at the moment the drag was recognised
  let base = 0; // track offset at that moment (non-zero when the page is caught mid-flight)
  let offset = 0; // current track offset in px (negative = moved left, revealing the next page)
  let width = 1;
  let samples: { x: number; t: number }[] = [];
  let paintFrame = 0;
  let animFrame = 0;
  let stuckTimer: ReturnType<typeof setTimeout> | undefined;
  let swallowClick = false;
  let swallowTimer: ReturnType<typeof setTimeout> | undefined;

  const index = () => opts.getIndex();
  const hasPrev = () => index() > 0;
  const hasNext = () => index() < opts.count - 1;

  function paint() {
    paintFrame = 0;
    track.style.transform = `translate3d(${offset}px,0,0)`;
    opts.onProgress?.(index() - offset / width);
  }

  function schedulePaint() {
    if (!paintFrame) paintFrame = requestAnimationFrame(paint);
  }

  function setOffset(value: number, immediate = false) {
    offset = value;
    if (immediate) {
      if (paintFrame) cancelAnimationFrame(paintFrame);
      paint();
    } else {
      schedulePaint();
    }
  }

  /** Pull-past-the-end resistance for pages without a neighbour. */
  function resist(raw: number): number {
    const limit = width * 0.2;
    if (raw > 0 && !hasPrev()) return Math.min(raw * 0.3, limit);
    if (raw < 0 && !hasNext()) return -Math.min(-raw * 0.3, limit);
    return Math.max(-width, Math.min(width, raw));
  }

  function resetStyles() {
    track.style.transform = "";
    track.style.willChange = "";
    viewport.style.userSelect = "";
    (viewport.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = "";
  }

  function settle(targetIndex: number, velocity: number) {
    if (animFrame) cancelAnimationFrame(animFrame);
    const current = index();
    const finalOffset = targetIndex > current ? -width : targetIndex < current ? width : 0;
    const committed = targetIndex !== current;
    const from = offset;
    const distance = Math.abs(finalOffset - from);
    const duration = opts.reducedMotion?.()
      ? 0
      : Math.min(MAX_SETTLE_MS, Math.max(MIN_SETTLE_MS, distance / Math.max(Math.abs(velocity), 1.1)));
    mode = "settling";

    const finish = () => {
      animFrame = 0;
      setOffset(finalOffset, true);
      if (committed) {
        mode = "done";
        // Keep the neighbour on screen until the route swap replaces this whole tree.
        stuckTimer = setTimeout(() => {
          resetStyles();
          opts.onProgress?.(index());
          mode = "idle";
          opts.onRest?.();
        }, STUCK_MS);
        opts.onCommit(targetIndex);
      } else {
        resetStyles();
        opts.onProgress?.(index());
        mode = "idle";
        opts.onRest?.();
      }
    };

    if (duration === 0 || distance < 0.5) {
      finish();
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setOffset(from + (finalOffset - from) * easeOutCubic(p), true);
      if (p < 1) animFrame = requestAnimationFrame(step);
      else finish();
    };
    animFrame = requestAnimationFrame(step);
  }

  function releaseVelocity(): number {
    const last = samples[samples.length - 1];
    if (!last || performance.now() - last.t > 80) return 0; // finger rested before lifting
    const first = samples[0]!;
    const dt = last.t - first.t;
    return dt > 0 ? (last.x - first.x) / dt : 0;
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.pointerType !== "mouse" && e.button > 0) return;
    if (!e.isPrimary) {
      // A second finger means pinch-zoom: abandon any gesture we were tracking.
      if (mode === "pending" || mode === "drag") endGesture(true);
      return;
    }
    if (mode === "done") return;
    if (mode === "pending" || mode === "drag") return; // a second finger: leave it to pinch-zoom
    const target = e.target instanceof Element ? e.target : null;
    if (!target || target.closest(SKIP_SELECTOR) || insideHorizontalScroller(target, viewport)) return;
    if (e.clientX < EDGE_GUARD || e.clientX > window.innerWidth - EDGE_GUARD) return;

    // Catch a page that is still settling back, like a native pager.
    if (mode === "settling") {
      if (animFrame) cancelAnimationFrame(animFrame);
      animFrame = 0;
    }
    swallowClick = false;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    base = mode === "settling" ? offset : 0;
    mode = "pending";
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;

    if (mode === "pending") {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy) * DIRECTION_RATIO) {
        mode = "drag";
        width = Math.max(1, viewport.clientWidth);
        lockX = e.clientX;
        samples = [];
        swallowClick = true;
        track.style.willChange = "transform";
        viewport.style.userSelect = "none";
        (viewport.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = "none";
        try {
          viewport.setPointerCapture(e.pointerId);
        } catch {
          /* pointer already gone */
        }
        opts.onLock?.();
      } else if (Math.abs(dy) > SLOP && Math.abs(dy) >= Math.abs(dx)) {
        // Vertical intent: the browser scrolls, we step aside.
        mode = base !== 0 ? "settling" : "idle";
        if (mode === "settling") settle(index(), 0);
        pointerId = -1;
        return;
      } else {
        return;
      }
    }

    if (mode !== "drag") return;

    setOffset(resist(base + (e.clientX - lockX)));
    const now = performance.now();
    samples.push({ x: e.clientX, t: now });
    while (samples.length > 2 && now - samples[0]!.t > 100) samples.shift();
  }

  function endGesture(cancelled: boolean) {
    pointerId = -1;
    if (mode === "pending") {
      mode = base !== 0 ? "settling" : "idle";
      if (mode === "settling") settle(index(), 0);
      return;
    }
    if (mode !== "drag") return;

    if (swallowTimer) clearTimeout(swallowTimer);
    swallowTimer = setTimeout(() => {
      swallowClick = false;
    }, 120);

    const v = cancelled ? 0 : releaseVelocity();
    const projected = offset + v * PROJECT_MS;
    const current = index();
    let target = current;
    if (!cancelled) {
      // A flick must also point the way the page was dragged (a quick pull-back cancels).
      const flickNext = v <= -FLICK_VELOCITY && offset <= -FLICK_MIN_DISTANCE;
      const flickPrev = v >= FLICK_VELOCITY && offset >= FLICK_MIN_DISTANCE;
      if ((projected < -width * COMMIT_FRACTION || flickNext) && hasNext()) target = current + 1;
      else if ((projected > width * COMMIT_FRACTION || flickPrev) && hasPrev()) target = current - 1;
    }
    settle(target, v);
  }

  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === pointerId) endGesture(false);
  };
  const onPointerCancel = (e: PointerEvent) => {
    if (e.pointerId === pointerId) endGesture(true);
  };
  /** A drag that ends in a click on a link or button must not activate it. */
  const onClickCapture = (e: Event) => {
    if (!swallowClick) return;
    e.preventDefault();
    e.stopPropagation();
  };

  viewport.addEventListener("pointerdown", onPointerDown, { passive: true });
  viewport.addEventListener("pointermove", onPointerMove, { passive: true });
  viewport.addEventListener("pointerup", onPointerUp, { passive: true });
  viewport.addEventListener("pointercancel", onPointerCancel, { passive: true });
  viewport.addEventListener("click", onClickCapture, true);

  return {
    destroy() {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerCancel);
      viewport.removeEventListener("click", onClickCapture, true);
      if (paintFrame) cancelAnimationFrame(paintFrame);
      if (animFrame) cancelAnimationFrame(animFrame);
      if (stuckTimer) clearTimeout(stuckTimer);
      if (swallowTimer) clearTimeout(swallowTimer);
      resetStyles();
    },
  };
}
