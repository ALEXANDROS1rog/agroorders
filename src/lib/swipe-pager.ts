/**
 * Finger-tracking horizontal pager.
 *
 * Framework-free on purpose: it only reads pointer events and writes `transform`
 * straight to three DOM nodes (previous / current / next page), so a drag costs no
 * React renders. While the finger is down the pages follow it 1:1 every animation
 * frame; on release a critically-damped spring (seeded with the finger's velocity)
 * either completes the transition or settles back.
 *
 * Contract with the host:
 *  - `container` must have `touch-action: pan-y pinch-zoom` (set in styles.css via
 *    `[data-swipe="on"]`) so the browser keeps vertical scroll + zoom and hands us
 *    the horizontal movement.
 *  - `prev` / `next` start `hidden`; the engine un-hides them while a drag is live.
 *  - After `onCommit` the engine keeps showing the final frame until the host calls
 *    `reset()` (i.e. once the router has really swapped the page). A 4s watchdog
 *    resets by itself if navigation never completes.
 */

export type SwipeDir = -1 | 1;
type State = "idle" | "pending" | "dragging" | "settling" | "committed";

export interface SwipePagerOptions {
  container: HTMLElement;
  current: HTMLElement;
  prev: HTMLElement;
  next: HTMLElement;
  /** Gestures are ignored while this returns false (e.g. on non-tab routes). */
  isEnabled: () => boolean;
  /** Is there a page in that direction? (-1 = previous, 1 = next) */
  canGo: (dir: SwipeDir) => boolean;
  /** Horizontal drag has been recognised: mount the neighbouring pages now. */
  onLock?: () => void;
  /** Live progress in [-1, 1]; positive moves toward the next page. */
  onProgress?: (progress: number) => void;
  /** Release decided to complete the transition. */
  onCommit: (dir: SwipeDir) => void;
  /** Everything is back at rest (cancelled, reset or watchdog). */
  onRest?: () => void;
  reducedMotion?: () => boolean;
  /** Ignore touches this close to the left/right screen edge (browser back/forward swipe). */
  edgeGuard?: number;
}

export interface SwipePager {
  /** Drop all transient styles and return to idle. Safe to call at any time. */
  reset(): void;
  destroy(): void;
  readonly state: State;
}

const SLOP = 10; // px before a direction is decided
const RUBBER = 0.55; // resistance when there is no page on that side
const SPRING_K = 700; // 1/s²  -> ~250ms to settle
const VELOCITY_WINDOW = 100; // ms of history used for the release velocity
const PROJECTION_MS = 200; // how far the release velocity "throws" the page
const COMMIT_RATIO = 0.5; // projected offset (of page width) needed to commit
const FLICK_VELOCITY = 0.5; // px/ms
const FLICK_MIN_DISTANCE = 24; // px
const COMMIT_WATCHDOG_MS = 4000;

const IGNORE_SELECTOR =
  'input, textarea, select, video, audio, [contenteditable]:not([contenteditable="false"]), [data-no-swipe], [role="slider"]';

export function createSwipePager(o: SwipePagerOptions): SwipePager {
  const edgeGuard = o.edgeGuard ?? 24;
  let state: State = "idle";
  let pointerId = -1;
  let startX = 0;
  let startY = 0;
  let lockX = 0;
  let baseX = 0;
  let x = 0; // current page offset in px (negative = moving toward `next`)
  let width = 0;
  let renderRaf = 0;
  let animRaf = 0;
  let watchdog = 0;
  let settlingDir: 0 | SwipeDir = 0;
  let suppressClickUntil = 0;
  let samples: { t: number; x: number }[] = [];

  const translate = (px: number) => `translate3d(${px}px,0,0)`;

  function rubber(d: number): number {
    const a = Math.abs(d);
    return Math.sign(d) * width * (1 - 1 / ((a * RUBBER) / width + 1));
  }

  /** Raw finger offset -> page offset: 1:1 where a page exists, rubber-band where not. */
  function toOffset(raw: number): number {
    if (raw > 0) return o.canGo(-1) ? Math.min(raw, width) : rubber(raw);
    if (raw < 0) return o.canGo(1) ? Math.max(raw, -width) : rubber(raw);
    return 0;
  }

  function render() {
    renderRaf = 0;
    o.current.style.transform = translate(x);
    o.prev.style.transform = translate(x - width);
    o.next.style.transform = translate(x + width);
    o.onProgress?.(Math.max(-1, Math.min(1, -x / width)));
  }

  function scheduleRender() {
    if (!renderRaf) renderRaf = requestAnimationFrame(render);
  }

  function clearStyles() {
    for (const el of [o.current, o.prev, o.next]) {
      el.style.transform = "";
      el.style.willChange = "";
    }
    for (const el of [o.prev, o.next]) {
      el.style.top = "";
      el.hidden = true;
    }
    delete o.container.dataset["swiping"];
  }

  function reset() {
    if (renderRaf) cancelAnimationFrame(renderRaf);
    if (animRaf) cancelAnimationFrame(animRaf);
    window.clearTimeout(watchdog);
    renderRaf = animRaf = watchdog = 0;
    const wasActive = state !== "idle";
    state = "idle";
    settlingDir = 0;
    pointerId = -1;
    x = 0;
    clearStyles();
    if (wasActive) o.onRest?.();
  }

  function ignoreTarget(target: EventTarget | null): boolean {
    let el = target instanceof Element ? target : null;
    while (el && el !== o.container) {
      if (el.matches(IGNORE_SELECTOR) || el.hasAttribute("data-hscroll")) return true;
      if (el instanceof HTMLElement) {
        const ox = getComputedStyle(el).overflowX;
        if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  function lock(e: PointerEvent) {
    state = "dragging";
    width = o.container.clientWidth || window.innerWidth;
    lockX = e.clientX;
    baseX = 0;
    x = 0;
    // Neighbours are positioned at the current scroll offset so they appear at the
    // top of the screen, not at the top of the (possibly scrolled) document.
    const top = `${window.scrollY}px`;
    for (const [dir, pane] of [[-1, o.prev], [1, o.next]] as const) {
      if (!o.canGo(dir)) continue;
      pane.hidden = false;
      pane.style.top = top;
      pane.style.willChange = "transform";
    }
    o.current.style.willChange = "transform";
    o.container.dataset["swiping"] = "true";
    try {
      o.container.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone */
    }
    o.onLock?.();
    scheduleRender();
  }

  function pushSample(e: PointerEvent) {
    samples.push({ t: e.timeStamp, x: e.clientX });
    const cutoff = e.timeStamp - 250;
    while (samples.length > 2 && samples[0]!.t < cutoff) samples.shift();
  }

  /** Finger velocity in px/ms over the last ~100ms (0 if the finger rested before release). */
  function velocity(releaseTime: number): number {
    const last = samples[samples.length - 1];
    if (!last || releaseTime - last.t > 80) return 0;
    let first = last;
    for (let i = samples.length - 1; i >= 0; i--) {
      if (last.t - samples[i]!.t > VELOCITY_WINDOW) break;
      first = samples[i]!;
    }
    const dt = last.t - first.t;
    return dt > 0 ? (last.x - first.x) / dt : 0;
  }

  function settle(target: number, dir: 0 | SwipeDir, v0pxPerSec: number) {
    state = "settling";
    settlingDir = dir;
    if (o.reducedMotion?.()) {
      x = target;
      render();
      finish(dir);
      return;
    }
    let vel = Math.max(-4000, Math.min(4000, v0pxPerSec));
    const k = SPRING_K;
    const c = 2 * Math.sqrt(k); // critically damped: no bounce
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const n = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        vel += (-k * (x - target) - c * vel) * h;
        x += vel * h;
      }
      if (dir !== 0) x = Math.max(-width, Math.min(width, x));
      if (Math.abs(x - target) < 0.5 && Math.abs(vel) < 20) {
        x = target;
        render();
        animRaf = 0;
        finish(dir);
        return;
      }
      render();
      animRaf = requestAnimationFrame(step);
    };
    animRaf = requestAnimationFrame(step);
  }

  function finish(dir: 0 | SwipeDir) {
    if (dir === 0) {
      reset();
      return;
    }
    state = "committed";
    watchdog = window.setTimeout(reset, COMMIT_WATCHDOG_MS);
    o.onCommit(dir);
  }

  function release(cancelled: boolean, e: PointerEvent | null) {
    suppressClickUntil = performance.now() + 400;
    try {
      if (pointerId >= 0) o.container.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }
    pointerId = -1;
    const v = !cancelled && e ? velocity(e.timeStamp) : 0;
    let target = 0;
    let dir: 0 | SwipeDir = 0;
    if (!cancelled) {
      const projected = x + v * PROJECTION_MS;
      const flick = Math.abs(v) >= FLICK_VELOCITY && Math.abs(x) >= FLICK_MIN_DISTANCE && Math.sign(v) === Math.sign(x);
      if ((projected <= -width * COMMIT_RATIO || (flick && x < 0)) && o.canGo(1)) {
        target = -width;
        dir = 1;
      } else if ((projected >= width * COMMIT_RATIO || (flick && x > 0)) && o.canGo(-1)) {
        target = width;
        dir = -1;
      }
    }
    settle(target, dir, v * 1000);
  }

  function onPointerDown(e: PointerEvent) {
    if (!o.isEnabled() || state === "committed" || state === "dragging") return;
    if (e.pointerType === "mouse" || !e.isPrimary) return;
    if (e.clientX < edgeGuard || e.clientX > window.innerWidth - edgeGuard) return;
    if (ignoreTarget(e.target)) return;

    if (state === "settling") {
      // Finger lands on a page that is still sliding back: catch it mid-flight.
      if (settlingDir !== 0) return;
      cancelAnimationFrame(animRaf);
      animRaf = 0;
      state = "dragging";
      pointerId = e.pointerId;
      lockX = e.clientX;
      baseX = x;
      samples = [{ t: e.timeStamp, x: e.clientX }];
      o.current.style.willChange = "transform";
      try {
        o.container.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }

    state = "pending";
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    samples = [{ t: e.timeStamp, x: e.clientX }];
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    if (state === "pending") {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        pushSample(e);
        lock(e);
      } else {
        // Vertical intent: leave it entirely to native scrolling.
        state = "idle";
        pointerId = -1;
      }
      return;
    }
    if (state === "dragging") {
      pushSample(e);
      x = toOffset(baseX + e.clientX - lockX);
      scheduleRender();
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    if (state === "pending") {
      state = "idle";
      pointerId = -1;
    } else if (state === "dragging") {
      pushSample(e);
      release(false, e);
    }
  }

  function onPointerCancel(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    if (state === "pending") {
      state = "idle";
      pointerId = -1;
    } else if (state === "dragging") {
      release(true, null);
    }
  }

  // A drag must never also "click" whatever was under the finger.
  function onClick(e: MouseEvent) {
    if (performance.now() < suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  const c = o.container;
  c.addEventListener("pointerdown", onPointerDown);
  c.addEventListener("pointermove", onPointerMove);
  c.addEventListener("pointerup", onPointerUp);
  c.addEventListener("pointercancel", onPointerCancel);
  c.addEventListener("click", onClick, true);

  return {
    reset,
    destroy() {
      c.removeEventListener("pointerdown", onPointerDown);
      c.removeEventListener("pointermove", onPointerMove);
      c.removeEventListener("pointerup", onPointerUp);
      c.removeEventListener("pointercancel", onPointerCancel);
      c.removeEventListener("click", onClick, true);
      reset();
    },
    get state() {
      return state;
    },
  };
}
