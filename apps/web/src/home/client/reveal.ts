// Rise-in on scroll, and the "Built inside" figures counting up. Both only start below the fold, so
// nothing already on screen blinks, and neither runs under reduced motion: the markup already holds
// every element in place and every figure at its final value.

import { reducedMotion } from './motion';

const observe = (el: Element, rootMargin: string, threshold: number, onEnter: () => void): void => {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        onEnter();
      }
    },
    { rootMargin, threshold },
  );
  io.observe(el);
};

/** `.rv` elements starting below the fold wait (`rv-wait`) and rise in as they arrive. */
export function initReveal(root: ParentNode): void {
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  for (const el of root.querySelectorAll<HTMLElement>('.rv')) {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) continue;
    el.classList.add('rv-wait');
    observe(el, '0px 0px -8% 0px', 0, () => el.classList.remove('rv-wait'));
  }
}

/** `[data-count]` figures count up from 0 once, when 40% of one is in view. */
export function initCountUp(root: ParentNode): void {
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  for (const el of root.querySelectorAll<HTMLElement>('[data-count]')) {
    const to = Number(el.dataset.count);
    if (!Number.isFinite(to) || el.getBoundingClientRect().top < window.innerHeight) continue;
    el.textContent = '0';
    observe(el, '0px', 0.4, () => {
      let start = 0;
      const step = (t: number) => {
        if (!start) start = t;
        const k = Math.min(1, (t - start) / 1500);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString('en-US');
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
}
