// The offer plan in "The AI drafts. You check, then send.": it drafts itself in, one term at a time,
// and fills its bar as terms are ticked. Visual only: it adds no words. The rows are checkboxes in the
// markup, ticked as the live sheet ticks them, so ticking works with no script, and with reduced
// motion there is no intro.

import { reducedMotion } from './motion';

export function initOfferCard(card: HTMLElement): void {
  const rows = [...card.querySelectorAll<HTMLElement>('.term-li')];
  const inputs = rows.map((r) => r.querySelector<HTMLInputElement>('.term-input')!);
  const bar = card.querySelector<HTMLElement>('[data-offer-progress]')!;

  const update = () => {
    const n = inputs.filter((i) => i.checked).length;
    card.classList.toggle('is-ready', n === inputs.length);
    bar.style.transform = `scaleX(${n / inputs.length})`;
  };
  for (const input of inputs) input.addEventListener('change', update);
  update();
  if (reducedMotion() || !('IntersectionObserver' in window)) return;

  // Drafting: the terms come in one by one when the card comes into view, each box unusable until in.
  rows.forEach((r, i) => {
    r.classList.remove('is-in');
    inputs[i]!.disabled = true;
  });
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      rows.forEach((r, i) =>
        window.setTimeout(
          () => {
            r.classList.add('is-in');
            inputs[i]!.disabled = false;
          },
          300 + i * 230,
        ),
      );
    },
    { threshold: 0.3 },
  );
  io.observe(card);
}
