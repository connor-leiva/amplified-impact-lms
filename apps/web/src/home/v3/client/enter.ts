// `[data-v3-enter]`: how far a block has come up into view, 0 to 1, written as `--p` once a frame (the
// mockup's video frame grows to full size as it arrives). The opposite of the kit's `initScrollExit`.
// Never under reduced motion: with no `--p` the stylesheet draws the block at its settled size.

import { reducedMotion } from './kit';

export function initEnter(root: ParentNode): void {
  if (reducedMotion()) return;
  const els = [...root.querySelectorAll<HTMLElement>('[data-v3-enter]')];
  if (!els.length) return;
  let frame = 0;
  const update = () => {
    frame = 0;
    const h = Math.max(1, window.innerHeight);
    for (const el of els) {
      const top = el.getBoundingClientRect().top;
      el.style.setProperty('--p', Math.min(1, Math.max(0, (h - top) / h)).toFixed(4));
    }
  };
  update();
  const later = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', later, { passive: true });
  window.addEventListener('resize', later);
}
