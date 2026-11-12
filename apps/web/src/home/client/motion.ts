// When the page may move: never under `prefers-reduced-motion: reduce`, and the two pinned sections only
// on a screen wide enough to pin them (981px and up, the reference's own breakpoint). Below it, and on
// every phone, they are static: nothing sticky for iOS Safari to jank.

const REDUCE = '(prefers-reduced-motion: reduce)';
const WIDE = '(min-width: 981px)';

/** A media query's live list, made on first use (so it is the browser's at the time, never a stale one). */
const lists = new Map<string, MediaQueryList | null>();
function query(q: string): MediaQueryList | null {
  if (!lists.has(q)) lists.set(q, typeof window.matchMedia === 'function' ? window.matchMedia(q) : null);
  return lists.get(q)!;
}

export const reducedMotion = (): boolean => query(REDUCE)?.matches ?? false;

/** Whether the pinned sections play as you scroll right now. */
export const canPin = (): boolean => !reducedMotion() && (query(WIDE)?.matches ?? false);

/** Forget the lists (tests that change `matchMedia`). */
export const resetMotionQueries = (): void => lists.clear();

/** Calls `fn` whenever either answer may have changed. */
export function onMotionChange(fn: () => void): void {
  for (const q of [query(REDUCE), query(WIDE)]) {
    if (!q) continue;
    if (typeof q.addEventListener === 'function') q.addEventListener('change', fn);
    else q.addListener(fn);
  }
}

/** Clamp to 0..1. */
export const unit = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * Counts a number from `from` to `to` over `ms` (ease-out cubic), calling `draw` each frame; at once
 * under reduced motion. Returns a function that stops it.
 */
export function tween(from: number, to: number, draw: (n: number) => void, ms = 520): () => void {
  if (reducedMotion() || from === to) {
    draw(to);
    return () => undefined;
  }
  let frame = 0;
  let start = 0;
  const step = (t: number) => {
    if (!start) start = t;
    const k = Math.min(1, (t - start) / ms);
    draw(k < 1 ? from + (to - from) * (1 - Math.pow(1 - k, 3)) : to);
    if (k < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}

/** A number shown in an element that counts to each new value from wherever it was. */
export function countingNumber(el: HTMLElement, initial: number, format: (n: number) => string): (to: number) => void {
  let current = initial;
  let stop: () => void = () => undefined;
  return (to: number) => {
    stop();
    stop = tween(current, to, (n) => {
      current = n;
      el.textContent = format(n);
    });
  };
}
