// S11's and S12's live state, from `GET /api/offer`, as the live homepage reads it.
//
// THE READER IS THE LIVE HOMEPAGE'S, COPIED (`../../client/offer-state.ts`), NOT IMPORTED: that module is
// the v2 homepage script's, and a module two pages' scripts both imported would become a shared chunk,
// which `ai101Inline()` refuses. `offer.test.ts` holds each copy to it, character for character.
//
// WHAT IT DECIDES, as /pricing does (D1: no Stripe link here, so only what the page says changes):
//   - founding open or closed: the API's word, or the deadline written into the page if it can't be
//     reached, so the page stops quoting founding prices after it whatever happens;
//   - the Accelerator open, sold out (all 15 seats, across both its carts) or closed;
//   - the days left, from the deadline, at once;
//   - the seats left, once the API has counted them. Until then the line keeps the written cap ("15 of
//     15 founding seats"), never a count the page can't know.
// The seat meter and its line are shown from the start, in the "open" state, script or not: nothing
// here ever hides them except the state turning sold out or closed.

import { countdownWords } from '@ai/core/founding';

export interface OfferCart {
  id: string;
  state: string;
  paymentLink: string | null;
}

/** The parts of /api/offer's answer this page reads. */
export interface OfferFacts {
  open: boolean;
  founding: { open: boolean; closesAt: string };
  seats: { total: number; sold: number; left: number };
  carts: readonly OfferCart[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** /api/offer's JSON, checked: the facts, or null for anything this page can't trust. */
export function readFacts(json: unknown): OfferFacts | null {
  if (!isRecord(json) || typeof json.open !== 'boolean') return null;
  const { founding, seats, carts } = json;
  if (!isRecord(founding) || typeof founding.open !== 'boolean' || typeof founding.closesAt !== 'string') return null;
  if (
    !isRecord(seats) ||
    ![seats.total, seats.sold, seats.left].every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)
  )
    return null;
  if (!Array.isArray(carts)) return null;
  const list: OfferCart[] = [];
  for (const c of carts) {
    if (!isRecord(c) || typeof c.id !== 'string' || typeof c.state !== 'string') return null;
    list.push({ id: c.id, state: c.state, paymentLink: typeof c.paymentLink === 'string' ? c.paymentLink : null });
  }
  return {
    open: json.open,
    founding: { open: founding.open, closesAt: founding.closesAt },
    seats: { total: seats.total as number, sold: seats.sold as number, left: seats.left as number },
    carts: list,
  };
}

/** The Accelerator's seats: how many are sold and left, and whether they're all gone. */
export function seatsView(facts: OfferFacts): { total: number; sold: number; left: number; soldout: boolean } {
  const total = Math.max(0, Math.round(facts.seats.total));
  const sold = Math.min(total, Math.max(0, Math.round(facts.seats.sold)));
  const left = Math.min(total, Math.max(0, Math.round(facts.seats.left)));
  return { total, sold, left, soldout: left === 0 };
}

/**
 * Whether founding prices are open: the API's word when it answered, else the configured deadline
 * written into the page, so a page that can't reach the API still stops quoting founding prices after
 * November 30.
 */
export function foundingOpen(facts: OfferFacts | null, fallbackClosesAt: string, now: number): boolean {
  if (facts) return facts.founding.open;
  const closes = Date.parse(fallbackClosesAt);
  return Number.isNaN(closes) ? true : now < closes;
}

export type AccState = 'open' | 'soldout' | 'closed';

/** The Accelerator's state: closed once founding is, sold out once its 15 seats are, else open. */
export function accState(facts: OfferFacts | null, closesAt: string, now: number): AccState {
  if (!foundingOpen(facts, closesAt, now)) return 'closed';
  return facts && seatsView(facts).soldout ? 'soldout' : 'open';
}

/**
 * Shows the parts of `root` for `key`'s `state` and hides the rest: every `[data-when]` naming one of
 * `key`'s states ("acc-open", "team-closed"; a part may name several) shows only in a state it names.
 */
export function applyState(root: HTMLElement, key: 'acc' | 'team', state: string): void {
  root.dataset[key] = state;
  for (const el of root.querySelectorAll<HTMLElement>('[data-when]')) {
    const states = (el.dataset.when ?? '').split(' ');
    if (states.some((s) => s.startsWith(`${key}-`))) el.hidden = !states.includes(`${key}-${state}`);
  }
}

/**
 * The days left before founding closes ("18 days left"), from `closesAt`, in place of the deadline's day
 * the markup says ("Ends Nov 30"). Once founding has closed there are none to say, and the line is
 * left as it is: the "closed" state hides it.
 */
export function fillDays(root: HTMLElement, closesAt: string, now: number): void {
  const words = countdownWords(Date.parse(closesAt) - now);
  if (!words) return;
  for (const el of root.querySelectorAll<HTMLElement>('[data-v3-days]')) el.textContent = words;
}

/**
 * The API's count, once it answers: the meter draws the seats left (`data-left`, the kit's stylesheet)
 * and the line says them, "12 of 15 founding seats left", in the page's own words (each part's
 * `data-said`). Only the numbers and words change: the block is shown from the start, and only the
 * state (`applyState`) takes it away.
 */
export function fillSeats(root: HTMLElement, facts: OfferFacts): void {
  const block = root.querySelector<HTMLElement>('[data-v3-seats]');
  if (!block) return;
  const s = seatsView(facts);
  const fill = (el: Element | null, text: string) => {
    if (el) el.textContent = text;
  };
  const meter = block.querySelector<HTMLElement>('.seatm');
  if (meter) {
    meter.dataset.left = String(s.left);
    meter.setAttribute('aria-label', (meter.dataset.said ?? '').replace('{left}', String(s.left)).replace('{total}', String(s.total)));
  }
  fill(block.querySelector('[data-v3-left]'), String(s.left));
  fill(block.querySelector('[data-v3-total]'), String(s.total));
  const word = block.querySelector<HTMLElement>('[data-v3-seats-word]');
  if (word?.dataset.said) word.textContent = word.dataset.said;
}

/**
 * Every live section: the deadline decides the state and the days left at once; the API's answer, when
 * it comes, decides the rest and counts the seats.
 */
export function initOffer(page: HTMLElement): void {
  const sections = [...page.querySelectorAll<HTMLElement>('[data-v3-offer]')];
  if (!sections.length) return;
  const apply = (facts: OfferFacts | null) => {
    const now = Date.now();
    for (const sec of sections) {
      const closesAt = sec.dataset.closesAt ?? '';
      applyState(sec, 'acc', accState(facts, closesAt, now));
      applyState(sec, 'team', foundingOpen(facts, closesAt, now) ? 'open' : 'closed');
      fillDays(sec, facts?.founding.closesAt ?? closesAt, now);
      if (facts) fillSeats(sec, facts);
    }
  };
  apply(null);
  if (typeof fetch !== 'function') return;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), 10_000) : 0;
  fetch('/api/offer', {
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
    signal: controller?.signal,
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((json: unknown) => {
      const facts = readFacts(json);
      if (facts) apply(facts);
    })
    .catch(() => undefined)
    .finally(() => window.clearTimeout(timer));
}

/**
 * S11's switches (Yearly / Monthly, Up to 15 / 16 to 40, Monthly / Yearly): each shows its price and
 * says which is pressed. The links don't change: every one goes to the program's page (D1).
 */
export function initSwitches(root: ParentNode): void {
  for (const group of root.querySelectorAll<HTMLElement>('[data-v3-switch]')) {
    const buttons = [...group.querySelectorAll<HTMLButtonElement>('button[data-v3-opt]')];
    const scope = group.closest<HTMLElement>('[data-v3-switch-scope]') ?? group.parentElement!;
    for (const b of buttons)
      b.addEventListener('click', () => {
        for (const o of buttons) o.setAttribute('aria-pressed', String(o === b));
        for (const alt of scope.querySelectorAll<HTMLElement>('[data-v3-alt]')) alt.hidden = alt.dataset.v3Alt !== b.dataset.v3Opt;
      });
  }
}
