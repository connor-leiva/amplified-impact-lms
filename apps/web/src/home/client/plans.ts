// Plans and Prices, live: the Monthly/Yearly switches, the Team Plan's tier (from the calculator), and
// each card's buttons from `GET /api/offer` (`offer-state.ts` decides; this applies it).
//
// Until /api/offer answers, every card's buy block stays hidden (`data-state="loading"`); if it never
// does, they stay hidden (`unknown`) and the cards' own pages, which are filled per request, sell. The
// Accelerator's seats show only once they're known. Founding prices end at the API's word, or at the
// deadline written into the page if the API can't be reached.

import { mountainDeadline } from '@ai/core/offer';
import { fill, usd } from './fill';
import { countingNumber } from './motion';
import { cartView, foundingOpen, readFacts, seatsView, type OfferFacts } from './offer-state';

const TEAM_CARTS = ['agents-upto15', 'agents-16to40'] as const;

export interface Plans {
  /** The calculator's agent count, for the Team Plan card. */
  setAgents: (agents: number) => void;
}

export function initPlans(section: HTMLElement): Plans {
  const cards = [...section.querySelectorAll<HTMLElement>('.plan')];
  let facts: OfferFacts | null = null;

  /** Applies the live state to one card, for whichever cart it sells right now. */
  const apply = (card: HTMLElement) => {
    const cart = card.dataset.cart;
    if (!cart) return;
    if (!facts) {
      card.dataset.state = card.dataset.state === 'unknown' ? 'unknown' : 'loading';
      return;
    }
    const view = cartView(facts, cart);
    card.dataset.state = view.state;
    const buy = card.querySelector<HTMLAnchorElement>('[data-buy]');
    if (buy) {
      if (view.href) buy.href = view.href;
      else buy.removeAttribute('href');
    }
    for (const more of card.querySelectorAll<HTMLAnchorElement>('[data-buy-more]')) {
      const other = cartView(facts, more.dataset.buyMore ?? '');
      more.hidden = !other.href;
      if (other.href) more.href = other.href;
      else more.removeAttribute('href');
    }
  };

  // The Monthly/Yearly switches: the price counts to the other option's, and the words swap.
  for (const card of cards) {
    const group = card.querySelector<HTMLElement>('[data-toggle]');
    if (!group) continue;
    const buttons = [...group.querySelectorAll<HTMLButtonElement>('button')];
    const price = card.querySelector<HTMLElement>('.price[data-price]')!;
    const note = card.querySelector<HTMLElement>('.price-note[data-note]')!;
    const after = card.querySelector<HTMLElement>('.price-after[data-after]')!;
    const show = countingNumber(price, Number(buttons[0]!.dataset.optionPrice), usd);
    for (const b of buttons) {
      b.addEventListener('click', () => {
        for (const o of buttons) o.setAttribute('aria-pressed', String(o === b));
        show(Number(b.dataset.optionPrice));
        note.textContent = b.dataset.optionNote ?? '';
        after.textContent = b.dataset.optionAfter ?? '';
        if (b.dataset.optionCart) {
          card.dataset.cart = b.dataset.optionCart;
          apply(card);
        }
      });
    }
  }

  // The Team Plan card follows the calculator's tier.
  const team = cards.find((c) => c.dataset.card === 'teamPlan');
  const teamToday = (team?.dataset.tierToday ?? '').split(',').map(Number);
  const teamAfter = (team?.dataset.tierAfter ?? '').split('|');
  const teamPrice = team?.querySelector<HTMLElement>('.price[data-price]');
  const showTeam = teamPrice ? countingNumber(teamPrice, teamToday[0]!, usd) : null;
  const tierLabel = team?.querySelector<HTMLElement>('[data-tier-label]');
  const tierMax = Number(document.querySelector<HTMLElement>('[data-calc]')?.dataset.tierMax ?? 15);
  const tierWords = (document.querySelector<HTMLElement>('[data-calc]')?.dataset.tiers ?? '').split('|');
  let tier = -1;

  const setAgents = (agents: number) => {
    if (!team) return;
    const next = agents > tierMax ? 1 : 0;
    if (next === tier) return;
    tier = next;
    showTeam?.(teamToday[next]!);
    if (tierLabel && tierWords[next]) tierLabel.textContent = tierWords[next]!;
    const after = team.querySelector<HTMLElement>('.price-after[data-after]');
    if (after && teamAfter[next]) after.textContent = teamAfter[next]!;
    team.dataset.cart = TEAM_CARTS[next];
    apply(team);
  };

  const applyAll = () => {
    const open = foundingOpen(facts, section.dataset.closesAt ?? '', Date.now());
    section.dataset.founding = open ? 'open' : 'closed';
    if (facts) {
      const deadline = mountainDeadline(Date.parse(facts.founding.closesAt));
      for (const el of section.querySelectorAll<HTMLElement>('[data-deadline]')) el.textContent = deadline;
      const block = section.querySelector<HTMLElement>('[data-seats]');
      if (block) {
        const s = seatsView(facts);
        block
          .querySelectorAll<HTMLElement>('.seatbar span')
          .forEach((dot, i) => dot.classList.toggle('is-sold', i < s.sold));
        const label = block.querySelector<HTMLElement>('[data-seat-label]')!;
        label.textContent = fill(s.soldout ? (block.dataset.taken ?? '') : (block.dataset.left ?? ''), {
          left: s.left,
          total: s.total,
        });
        block.hidden = false;
      }
    }
    cards.forEach(apply);
  };

  applyAll();
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), 10_000) : 0;
  fetch('/api/offer', {
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
    signal: controller?.signal,
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((json: unknown) => {
      facts = readFacts(json);
    })
    .catch(() => {
      facts = null;
    })
    .finally(() => {
      window.clearTimeout(timer);
      if (!facts) for (const c of cards) if (c.dataset.cart) c.dataset.state = 'unknown';
      applyAll();
    });

  return { setAgents };
}
