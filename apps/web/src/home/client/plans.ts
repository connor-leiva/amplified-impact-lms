// "Four ways in", live: the Accelerator's seats, founding prices, and "Get Amplified Insiders", from
// `GET /api/offer` (`offer-state.ts` decides; this applies it). See `../sections/plans.ts` for the rule.
//
// - Seats: hidden until the API counts them, then /pricing's words ("12 of 15 Amplified AI Accelerator
//   seats left.", "All Amplified AI Accelerator founding seats are taken.").
// - Founding: the API's word, or the deadline written into the page if it can't be reached.
// - Insiders' button: hidden only when the API says its cart doesn't sell. It links to /pricing, not to
//   Stripe, so until the API answers, or if it never does, it stays, as on the live homepage.

import { fill } from './fill';
import { cartView, foundingOpen, readFacts, seatsView, type OfferFacts } from './offer-state';

export function initPlans(section: HTMLElement): void {
  const cards = [...section.querySelectorAll<HTMLElement>('.plan[data-cart]')];

  const apply = (facts: OfferFacts | null) => {
    section.dataset.founding = foundingOpen(facts, section.dataset.closesAt ?? '', Date.now()) ? 'open' : 'closed';
    if (!facts) return;
    for (const card of cards) card.dataset.state = cartView(facts, card.dataset.cart ?? '').state;
    const block = section.querySelector<HTMLElement>('[data-seats]');
    if (block) {
      const s = seatsView(facts);
      block
        .querySelectorAll<HTMLElement>('.seatbar span')
        .forEach((dot, i) => dot.classList.toggle('is-sold', i < s.sold));
      block.querySelector<HTMLElement>('[data-seat-label]')!.textContent = fill(
        s.soldout ? (block.dataset.taken ?? '') : (block.dataset.left ?? ''),
        {
          left: s.left,
          total: s.total,
        },
      );
      block.hidden = false;
    }
  };

  apply(null);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), 10_000) : 0;
  fetch('/api/offer', {
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
    signal: controller?.signal,
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((json: unknown) => apply(readFacts(json)))
    .catch(() => apply(null))
    .finally(() => window.clearTimeout(timer));
}
