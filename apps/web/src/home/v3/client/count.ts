// Count-ups (brief § 4 data rules, § 5): a figure is always right in the markup, and may count up to
// itself once, in about 420ms, when it scrolls into view.
//   - Never at load: a figure already on screen stays as it is, so nothing flashes from right to 0.
//   - Never under reduced motion, or with no IntersectionObserver: the markup's figure simply stays.
//   - It ends on the markup's own text, character for character, whatever the arithmetic rounds to.
// `data-v3-count` holds the number; the element's text is that number as the page prints it ("58",
// "143,750", "11.5"), with nothing else inside it.

import { reducedMotion } from './kit';

export const COUNT_MS = 420;

const format = (n: number, decimals: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export function initCountUps(root: ParentNode): void {
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  for (const el of root.querySelectorAll<HTMLElement>('[data-v3-count]')) {
    const to = Number(el.dataset.v3Count);
    const final = el.textContent ?? '';
    if (!Number.isFinite(to) || el.getBoundingClientRect().top < window.innerHeight) continue;
    const decimals = (final.split('.')[1] ?? '').length;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        let start = 0;
        const step = (t: number) => {
          if (!start) start = t;
          const k = Math.min(1, (t - start) / COUNT_MS);
          el.textContent = k < 1 ? format(to * (1 - Math.pow(1 - k, 3)), decimals) : final;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
  }
}
