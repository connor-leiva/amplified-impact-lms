// The hero's offer plan: it drafts itself in, one term at a time, then waits for you to check each term.
//
// The rows are checkboxes in the markup, so ticking works with no script; this adds the drafting intro
// (not under reduced motion), the progress bar, the count ("2 of 5 checked") and the signed state. Its
// words are the card's own `data-*`, written by the build from `content.ts`.

import { fill } from './fill';
import { reducedMotion } from './motion';

export function initOfferCard(card: HTMLElement): void {
  const d = card.dataset;
  const rows = [...card.querySelectorAll<HTMLElement>('.term-li')];
  const inputs = rows.map((r) => r.querySelector<HTMLInputElement>('.term-input')!);
  const status = card.querySelector<HTMLElement>('[data-offer-status]')!;
  const statusBox = status.parentElement!;
  const hint = card.querySelector<HTMLElement>('[data-offer-hint]')!;
  const sign = card.querySelector<HTMLElement>('[data-offer-sign]')!;
  const bar = card.querySelector<HTMLElement>('[data-offer-progress]')!;
  const total = inputs.length;

  const update = () => {
    const n = inputs.filter((i) => i.checked).length;
    const all = n === total;
    card.classList.toggle('is-ready', all);
    bar.style.transform = `scaleX(${n / total})`;
    status.textContent = all ? d.statusChecked! : d.statusDrafted!;
    sign.textContent = all ? d.signReady! : d.signDecides!;
    hint.textContent = all ? d.hintAll! : n === 0 ? d.hintStart! : fill(d.hintSome!, { n, total });
  };
  for (const input of inputs) input.addEventListener('change', update);

  if (reducedMotion()) {
    update();
    return;
  }

  // Drafting: every term out, then in one by one, each box unusable until its term is in.
  rows.forEach((r, i) => {
    r.classList.remove('is-in');
    inputs[i]!.disabled = true;
  });
  status.textContent = d.statusDrafting!;
  statusBox.classList.add('is-live');
  hint.textContent = '';
  let shown = 0;
  window.setTimeout(() => {
    const timer = window.setInterval(() => {
      rows[shown]!.classList.add('is-in');
      inputs[shown]!.disabled = false;
      shown += 1;
      if (shown >= total) {
        window.clearInterval(timer);
        statusBox.classList.remove('is-live');
        update();
      }
    }, 230);
  }, 1000);
}
