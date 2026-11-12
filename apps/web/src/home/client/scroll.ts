// The scroll effects: each section's progress through the viewport as `--p` (0 to 1), read by CSS.
//
//   exit     the hero, as it leaves: its words drift up and its ripple opens
//   pin      "Two ways to use AI" and "How every skill works": a tall section whose stage sticks while
//            you scroll through it (`is-pinned`), only where `canPin()`; else `is-static`, stacked
//   through  the Library, as it passes: the ghosted count drifts
//
// One passive scroll listener, one frame per change. Under reduced motion nothing is tracked, and a
// change of width or of the motion setting switches the pinned sections between their two forms.

import { onMotionChange, unit } from './motion';

type Mode = 'exit' | 'pin' | 'through';

interface Tracker {
  el: HTMLElement;
  mode: Mode;
  /** Whether it plays now. */
  enabled: () => boolean;
  /** Called with the progress after `--p` is set. */
  onProgress?: (p: number) => void;
}

function progress(el: HTMLElement, mode: Mode): number {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  if (mode === 'pin') return unit(r.height > vh ? -r.top / (r.height - vh) : 0);
  if (mode === 'exit') return unit(-r.top / Math.max(1, r.height));
  return unit((vh - r.top) / (vh + r.height));
}

export interface ScrollEffects {
  /** Recompute every tracker now (after a section changes form). */
  update: () => void;
}

export function initScroll(trackers: readonly Tracker[], onFormChange: () => void): ScrollEffects {
  let frame = 0;
  const update = () => {
    frame = 0;
    for (const t of trackers) {
      if (!t.enabled()) continue;
      const p = progress(t.el, t.mode);
      t.el.style.setProperty('--p', p.toFixed(4));
      t.onProgress?.(p);
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  onMotionChange(() => {
    onFormChange();
    for (const t of trackers) if (!t.enabled()) t.el.style.removeProperty('--p');
    schedule();
  });
  update();
  return { update };
}

/** Sets a pinned section's form: `is-pinned` (tall, sticky stage) or `is-static` (stacked). */
export function setPinned(el: HTMLElement, pinned: boolean): void {
  el.classList.toggle('is-pinned', pinned);
  el.classList.toggle('is-static', !pinned);
}
