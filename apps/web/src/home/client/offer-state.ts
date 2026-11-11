// What each plan card shows, from `GET /api/offer` (`apps/api/src/routes/offer.ts`): pure, so every
// state is a unit test (`offer-state.test.ts`), and the DOM code in `plans.ts` only applies it.
//
// THE RULE IS /pricing's. The API decides each cart's state (`cartStates`: nothing sells while
// `OFFER_OPEN` is off; a founding cart closes at `FOUNDING_CLOSES_AT`; the Accelerator's two carts sell
// out together at 15 seats; a cart with no Payment Link "opens soon") and /pricing shows the button
// only for `link`. The homepage reads the same answer and shows the same thing, with one more guard: a
// buy button needs an `https:` link, so a misconfigured value can never become a `javascript:` href.

export type CartState = 'link' | 'soon' | 'closed' | 'soldout';

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

/** A Payment Link the page may use as an href: an absolute https URL, nothing else. */
export function safeLink(link: string | null): string | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * One cart as a card shows it: its state, and its link only while it sells. An unknown cart, or any
 * cart while the offer is closed, "opens soon", as on /pricing.
 */
export function cartView(facts: OfferFacts, cartId: string): { state: CartState; href: string | null } {
  const cart = facts.carts.find((c) => c.id === cartId);
  if (!facts.open || !cart) return { state: 'soon', href: null };
  if (cart.state === 'link') {
    const href = safeLink(cart.paymentLink);
    return href ? { state: 'link', href } : { state: 'soon', href: null };
  }
  if (cart.state === 'closed' || cart.state === 'soldout') return { state: cart.state, href: null };
  return { state: 'soon', href: null };
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
