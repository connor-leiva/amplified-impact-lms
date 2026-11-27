// R-5 Phase 5 (D-262): selling a seat in a cohort (handoff/admin-mockup/ADMIN-RESTRUCTURE-SPEC.md Phase 5, PLAN.md
// § 10.5 and § 10.10, handoff/admin-mockup/PHASE5.md).
//
// EVERY PER-COHORT SELLING VALUE IS A SETTING ON THE COHORT (§ 10.10): founding yes or no, when founding closes, the
// Stripe lookup keys (made by hand in Stripe; the code never creates a price, a lookup key or a Payment Link, Q-21),
// whether two payments are offered, the two Payment Link addresses, the seat cap (`capacity`), the included-time end
// (Phase 3's `includedUntil`, Q-22) and GoHighLevel's Cohort value (Q-33). `cohortSelling` reads them in one place.
//
// DECEMBER IS UNCHANGED BY CONSTRUCTION. Its values are copied onto its record by the one-time data step
// `2026-11-27-december-selling` (`packages/core/seed/december-selling-v1.ts`), which writes a field only when it reads
// back exactly as the code reads it today. Until a field is stored (a field the step leaves alone, and every test
// database), December reads that field from what the code held before this phase: the constants in `offer.ts` and the
// environment the offer's configuration reads (`FOUNDING_CLOSES_AT`, `PAYMENT_LINK_COHORT_*`), handed in as
// `SellingEnv`. So December's outputs are the same whether its record holds the values or not.
//
// Pure: no clock (`now` comes in), no random source, no environment (`SellingEnv` comes in).

import { produce } from 'immer';
import { DEFAULT_COHORT_ID, courseOpensAt } from './accelerator';
import { requirePerm } from './can';
import type { AdminOutcome } from './admin-actions';
import { ghlCohortValue } from './cohort-learner';
import { COURSE_TZ, zonedInputs, zonedInstant } from './course-actions';
import { MutationError } from './mutations';
import type { Actor, Ctx } from './mutations';
import { CARTS, COHORT_SEATS, DEFAULT_FOUNDING_CLOSES_AT, INSIDERS_FIRST_CHARGE_AT, ROLLOVER_LOOKUP, dollars } from './offer';
import type { CartId, PlanCohort } from './offer';
import { fmt } from './time';
import type { Cohort, Db, Session } from './types';

// ================================================================================================
// A cohort's selling settings
// ================================================================================================

/** The zone a seat's included time ends in: the start of the stored day here (Q-22, `INSIDERS_FIRST_CHARGE_AT`'s). */
export const INCLUDED_END_TZ = 'America/Chicago';

/** The instant an included-time day ends a seat's included time: the start of that day in America/Chicago. */
export const includedEndAt = (date: string): number => zonedInstant(date, '00:00', INCLUDED_END_TZ);

/** The three lookup keys a cohort sells through (Stripe's, made by hand). Null: not entered. */
export interface SellingKeys {
  /** Paid in full. */
  full: string | null;
  /** The Insiders price the full cart carries, and that two payments roll onto. */
  rollover: string | null;
  /** Two payments. */
  twoPay: string | null;
}

/** What the offer's configuration reads from the environment and December read before Phase 5. */
export interface SellingEnv {
  /** `FOUNDING_CLOSES_AT`, else `DEFAULT_FOUNDING_CLOSES_AT`. */
  foundingClosesAt: number;
  /** `PAYMENT_LINK_COHORT_FULL` and `PAYMENT_LINK_COHORT_TWO_PAY`, as the configuration reads them, or null. */
  links: { full: string | null; twoPay: string | null };
}

/** The environment as a test database or the browser has it: the default close and no links. */
export const NO_SELLING_ENV: SellingEnv = { foundingClosesAt: Date.parse(DEFAULT_FOUNDING_CLOSES_AT), links: { full: null, twoPay: null } };

/** The environment the offer's configuration holds (`OfferConfig`'s `foundingClosesAt` and the two cohort links). */
export function sellingEnvOf(config: { foundingClosesAt: number; paymentLinks: Partial<Record<CartId, string>> }): SellingEnv {
  return {
    foundingClosesAt: config.foundingClosesAt,
    links: { full: config.paymentLinks['cohort-full'] ?? null, twoPay: config.paymentLinks['cohort-two-pay'] ?? null },
  };
}

/** A cohort's selling settings, as everything that sells a seat reads them. */
export interface CohortSelling {
  cohortId: string;
  founding: boolean;
  /** When founding prices stop selling; null: no close set (a founding cohort's carts then never close by date). */
  foundingClosesAt: number | null;
  keys: SellingKeys;
  twoPay: boolean;
  links: { full: string | null; twoPay: string | null };
  /** The seat cap. */
  capacity: number;
  /** The included-time end, as stored (`YYYY-MM-DD`), and its instant. */
  includedUntil: string | null;
  includedEndAt: number | null;
  /** GoHighLevel's Cohort value. */
  ghlValue: string;
}

/** December's included-time day: the day `INSIDERS_FIRST_CHARGE_AT` starts, in America/Chicago (2027-05-04). */
export const DECEMBER_INCLUDED_UNTIL = zonedInputs(INSIDERS_FIRST_CHARGE_AT, INCLUDED_END_TZ).date;

/**
 * What the code held for December before Phase 5, field by field (PLAN § 10.10's "December's stored value" column): the
 * cohort carts' `founding` and `items`, `COHORT_SEATS`, `INSIDERS_FIRST_CHARGE_AT`'s day, and the environment's founding
 * close and links. Read only for December, and only for a field its record does not hold.
 */
export function decemberBuiltIn(env: SellingEnv): Omit<CohortSelling, 'cohortId' | 'includedEndAt' | 'ghlValue'> {
  return {
    founding: CARTS['cohort-full'].founding,
    foundingClosesAt: env.foundingClosesAt,
    keys: { full: CARTS['cohort-full'].items[0]!, rollover: ROLLOVER_LOOKUP, twoPay: CARTS['cohort-two-pay'].items[0]! },
    twoPay: true,
    links: { ...env.links },
    capacity: COHORT_SEATS,
    includedUntil: DECEMBER_INCLUDED_UNTIL,
  };
}

/**
 * A cohort's selling settings: what its record holds, and, for December only, what the code held before Phase 5 for a
 * field its record does not hold (`decemberBuiltIn`). A cohort the database does not hold reads as December's built-in
 * values when it is December (a test database with no rows), else as nothing set.
 */
export function cohortSelling(db: Pick<Db, 'cohorts'>, cohortId: string, env: SellingEnv = NO_SELLING_ENV): CohortSelling {
  const co = db.cohorts.find((c) => c.id === cohortId);
  // December's record may hold none of these until its data step has run (PHASE5.md § 8): then it reads the constants
  // and the environment, which hold the same values, so nothing it reads moves either way.
  const built = cohortId === DEFAULT_COHORT_ID ? decemberBuiltIn(env) : null;
  const includedUntil = co?.includedUntil ?? built?.includedUntil ?? null;
  return {
    cohortId,
    founding: co?.founding ?? built?.founding ?? false,
    foundingClosesAt: co?.foundingClosesAt ?? built?.foundingClosesAt ?? null,
    keys: {
      full: co?.lookupKeyFull ?? built?.keys.full ?? null,
      rollover: co?.lookupKeyRollover ?? built?.keys.rollover ?? null,
      twoPay: co?.lookupKeyTwoPay ?? built?.keys.twoPay ?? null,
    },
    twoPay: co?.twoPay ?? built?.twoPay ?? false,
    links: { full: co?.linkFull ?? built?.links.full ?? null, twoPay: co?.linkTwoPay ?? built?.links.twoPay ?? null },
    capacity: co?.capacity ?? built?.capacity ?? 0,
    includedUntil,
    includedEndAt: includedUntil ? includedEndAt(includedUntil) : null,
    ghlValue: ghlCohortValue(co ?? null),
  };
}

/** Whether a cohort's founding prices still sell at `now`: always for a cohort that is not founding, or has no close. */
export const foundingOpenFor = (s: Pick<CohortSelling, 'founding' | 'foundingClosesAt'>, now: number): boolean =>
  !s.founding || s.foundingClosesAt === null || now < s.foundingClosesAt;

/** The lookup keys a cohort cart sells, in its cart's order (`Cart.items`): paid in full and its Insiders; two payments. */
export function cohortCartItems(cartId: 'cohort-full' | 'cohort-two-pay', s: Pick<CohortSelling, 'keys'>): string[] {
  const keys = cartId === 'cohort-full' ? [s.keys.full, s.keys.rollover] : [s.keys.twoPay];
  return keys.filter((k): k is string => !!k);
}

/** A cohort cart's Payment Link address: paid in full's, or two payments' while two payments are offered. */
export function cohortCartLink(cartId: 'cohort-full' | 'cohort-two-pay', s: Pick<CohortSelling, 'links' | 'twoPay'>): string | null {
  if (cartId === 'cohort-full') return s.links.full;
  return s.twoPay ? s.links.twoPay : null;
}

/** The lookup keys a cohort needs found in Stripe before it opens: paid in full's two, and two payments' when offered. */
export function cohortKeysNeeded(s: Pick<CohortSelling, 'keys' | 'twoPay'>): { label: string; key: string | null }[] {
  return [
    { label: 'paid in full', key: s.keys.full },
    { label: 'Insiders after', key: s.keys.rollover },
    ...(s.twoPay ? [{ label: 'two payments', key: s.keys.twoPay }] : []),
  ];
}

/**
 * The sold-out line a turned-off Payment Link shows (D-154): the cohort's cap and founding. December's is "All 15
 * founding seats are taken. Join the waitlist at amplifiedimpact.io/offer to hear first about the next cohort.", as
 * before. A cohort that is not founding says "seats" without "founding".
 */
export const soldOutMessage = (s: Pick<CohortSelling, 'capacity' | 'founding'>): string =>
  `All ${s.capacity} ${s.founding ? 'founding ' : ''}seats are taken. Join the waitlist at amplifiedimpact.io/offer to hear first about the next cohort.`;

// ================================================================================================
// Which cohort the offer sells
// ================================================================================================

/**
 * The cohort the offer page, its welcome page and the calendar files sell (§ 10.10): the cohort whose enrollment is
 * open (`enrollmentOpen`: `enrolling` or December, not archived, not closed). With two or more open, the next cohort to start (Connor, Nov 26, 2026): of those
 * whose `start` is still ahead at `now`, the soonest. When every open cohort has already started, there is no next one,
 * so the one that started last sells (D-262). With none open, null: the Accelerator's carts read "closed". A database
 * that holds no cohort at all (a test database, a fresh one) sells December, as before R-5.
 */
export function cohortOnSale(db: Pick<Db, 'cohorts'>, now: number): string | null {
  if (!db.cohorts.length) return DEFAULT_COHORT_ID;
  const open = db.cohorts.filter(enrollmentOpen);
  if (open.length <= 1) return open[0]?.id ?? null;
  const ahead = open.filter((c) => c.start > now).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  if (ahead.length) return ahead[0]!.id;
  return [...open].sort((a, b) => b.start - a.start || a.id.localeCompare(b.id))[0]!.id;
}

/**
 * Whether a cohort is taking sales: not archived, Close enrollment not pressed (`enrollmentClosedAt`), and either
 * `enrolling` or December, the default cohort. December sold before R-5 whatever its status said, and a checkout with
 * no `ai_cohort` lands in it forever, so its sale does not read its status (hotfix D-266: production's December is not
 * `enrolling`, and #281 closed its carts). Archive and Close are R-5's own, so honoring them moves nothing December did
 * before. Close writes its marker and never `status` (PLAN.md § 2.5: R-5 never writes `live` or `completed`).
 */
export const enrollmentOpen = (co: Pick<Cohort, 'id' | 'status' | 'archivedAt' | 'enrollmentClosedAt'> | undefined): boolean =>
  !!co && co.archivedAt === undefined && co.enrollmentClosedAt === undefined && (co.status === 'enrolling' || co.id === DEFAULT_COHORT_ID);

// ================================================================================================
// A seat's plan: the cohort it is sold in
// ================================================================================================

/** The cohort a seat is sold in, as provisioning reads it: its id, its first live build and its included-time end. */
export function cohortSaleOf(
  db: Pick<Db, 'cohorts'>,
  cohortId: string,
  sessions: readonly Pick<Session, 'cohortId' | 'start' | 'kind'>[],
  env: SellingEnv = NO_SELLING_ENV,
): PlanCohort {
  return { id: cohortId, opensAt: courseOpensAt(cohortId, sessions), liveUntil: cohortSelling(db, cohortId, env).includedEndAt };
}

// ================================================================================================
// What Stripe says about a cohort's keys and links (read by the API; the fixture build has its own)
// ================================================================================================

/** One price as Stripe has it under a lookup key: the facts the Enrollment card and Before It Opens show. */
export interface StripePrice {
  unitAmount: number;
  currency: string;
  /** `month` for a monthly price, null for a one-time one. */
  interval: 'day' | 'week' | 'month' | 'year' | null;
  /** Every how many intervals it charges; 1 when Stripe doesn't say. */
  intervalCount?: number | null;
}

/** A Payment Link as Stripe has it, read only: whether it sells, and the cohort its metadata names (`ai_cohort`). */
export interface StripeLink {
  active: boolean;
  aiCohort: string | null;
}

/** What Stripe says about one cohort's keys and links. */
export interface CohortStripeFacts {
  /** `ok`: Stripe answered. `unavailable`: no key, or it did not answer. */
  prices: 'ok' | 'unavailable';
  /** Stripe's active price under each key asked about; null: no active price under it. */
  price: Readonly<Record<string, StripePrice | null>>;
  /** `ok`: Stripe answered. `unreadable`: the key may not read Payment Links. `unavailable`: no key, or no answer. */
  links: 'ok' | 'unreadable' | 'unavailable';
  /** Each link address entered, as Stripe has it; null: no Payment Link at that address. */
  link: Readonly<Record<string, StripeLink | null>>;
}

/** "$7,500", "$169 a month", "$3,750 every 2 weeks": a Stripe price in words. */
export function priceWords(p: StripePrice): string {
  const amount = dollars(p.unitAmount);
  if (!p.interval) return amount;
  const n = p.intervalCount ?? 1;
  return n === 1 ? `${amount} a ${p.interval}` : `${amount} every ${n} ${p.interval}s`;
}

/** "one month later", "30 days later", "2 weeks later": when a recurring price charges again. */
export function laterWords(p: StripePrice): string | null {
  if (!p.interval) return null;
  const n = p.intervalCount ?? 1;
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return `${n <= 12 ? words[n] : n} ${p.interval}${n === 1 ? '' : 's'} later`;
}

/**
 * The Enrollment card's "Two payments" line, read from Stripe's price (§ 10.5: the interval is Stripe's, not stated
 * here): "Offered. $3,750 at checkout and $3,750 one month later." Two payments, then none (`installments`).
 */
export function twoPayWords(s: Pick<CohortSelling, 'twoPay'>, price: StripePrice | null | undefined): string {
  if (!s.twoPay) return 'Not offered';
  if (!price) return 'Offered. Stripe’s price is not found yet.';
  const later = laterWords(price);
  const each = dollars(price.unitAmount);
  return later ? `Offered. ${each} at checkout and ${each} ${later}.` : `Offered. ${each} at checkout.`;
}

// ================================================================================================
// Before It Opens: the two Stripe lines (PLAN § 10.3's order; `beforeItOpens` in cohort-page.ts draws them)
// ================================================================================================

export interface SellingLine {
  detail: string;
  done: boolean;
}

/** Phase 3's words for a cohort that has entered nothing, kept. */
export const NO_KEYS = 'None yet. Prices and Payment Links are made in Stripe.';

/**
 * "Stripe price found for each lookup key": every key the cohort sells (paid in full and its Insiders, and two
 * payments' when offered) has an active price in Stripe. Done, it reads the mockup's line with Stripe's amount:
 * "$7,500, or two payments · 15 seats".
 */
export function stripePriceLine(s: CohortSelling, stripe: CohortStripeFacts | null | undefined): SellingLine {
  const needed = cohortKeysNeeded(s);
  if (needed.every((k) => !k.key)) return { detail: NO_KEYS, done: false };
  const missing = needed.filter((k) => !k.key).map((k) => k.label);
  if (missing.length) return { detail: `Not entered: ${missing.join(' and ')}`, done: false };
  if (!stripe || stripe.prices !== 'ok') return { detail: 'Stripe can’t be asked right now. Try again in a minute.', done: false };
  const lost = needed.filter((k) => !stripe.price[k.key!]).map((k) => k.key!);
  if (lost.length) return { detail: `Not found in Stripe: ${lost.join(', ')}`, done: false };
  const full = stripe.price[s.keys.full!]!;
  return { detail: `${dollars(full.unitAmount)}${s.twoPay ? ', or two payments' : ''} · ${s.capacity} seats`, done: true };
}

/** The Payment Links a cohort sells through: paid in full's, and two payments' when offered. */
export function cohortLinksNeeded(s: Pick<CohortSelling, 'links' | 'twoPay'>): { label: string; url: string | null }[] {
  return [{ label: 'paid in full', url: s.links.full }, ...(s.twoPay ? [{ label: 'two payments', url: s.links.twoPay }] : [])];
}

/**
 * "Payment Links entered": each link the cohort sells through is entered and, read from Stripe (Payment Links: Read),
 * carries `ai_cohort` naming this cohort, so a checkout through it is placed here and not in December.
 */
export function paymentLinksLine(s: CohortSelling, stripe: CohortStripeFacts | null | undefined): SellingLine {
  const needed = cohortLinksNeeded(s);
  if (needed.every((l) => !l.url)) return { detail: 'None yet', done: false };
  const missing = needed.filter((l) => !l.url).map((l) => l.label);
  if (missing.length) return { detail: `Not entered: ${missing.join(' and ')}`, done: false };
  if (!stripe || stripe.links === 'unavailable') return { detail: 'Stripe can’t be asked right now. Try again in a minute.', done: false };
  if (stripe.links === 'unreadable')
    return { detail: 'Entered. Stripe won’t let this key read Payment Links: give it Payment Links: Read.', done: false };
  const lost = needed.filter((l) => !stripe.link[l.url!]).map((l) => l.label);
  if (lost.length) return { detail: `Not found in Stripe: ${lost.join(' and ')}`, done: false };
  const other = needed.filter((l) => stripe.link[l.url!]!.aiCohort !== s.cohortId).map((l) => l.label);
  if (other.length) return { detail: `In Stripe, ${other.join(' and ')} must carry ai_cohort = ${s.cohortId}`, done: false };
  return { detail: needed.length === 2 ? 'Both entered. Each names this cohort in Stripe.' : 'Entered. It names this cohort in Stripe.', done: true };
}

// ================================================================================================
// The four admin actions (Settings › Enrollment). Who: the `billing` permission (Owner and Admin by default).
// ================================================================================================

const cohortOf = (db: Db, id: string): Cohort => {
  const co = db.cohorts.find((x) => x.id === id);
  if (!co) throw new MutationError('not_found', `No cohort ${id}`);
  return co;
};

/** A Stripe lookup key as Connor or Spring type it: letters, digits, `_`, `-` and `.`, up to 200. */
const KEY = /^[A-Za-z0-9_.-]{1,200}$/;
const cleanKey = (k: string | null | undefined): string | null => {
  const v = (k ?? '').trim();
  return v === '' ? null : v;
};

/** An https address, as the offer's configuration keeps one (`new URL(…).toString()`), or null for none. */
function cleanLink(raw: string | null | undefined): { ok: true; value: string | null } | { ok: false } {
  const v = (raw ?? '').trim();
  if (v === '') return { ok: true, value: null };
  try {
    const url = new URL(v);
    return url.protocol === 'https:' ? { ok: true, value: url.toString() } : { ok: false };
  } catch {
    return { ok: false };
  }
}

/** The audited fields of a cohort's selling settings, as stored (null for unset). */
const stored = (co: Cohort) => ({
  founding: co.founding ?? null,
  foundingClosesAt: co.foundingClosesAt ?? null,
  lookupKeyFull: co.lookupKeyFull ?? null,
  lookupKeyRollover: co.lookupKeyRollover ?? null,
  lookupKeyTwoPay: co.lookupKeyTwoPay ?? null,
  twoPay: co.twoPay ?? null,
  linkFull: co.linkFull ?? null,
  linkTwoPay: co.linkTwoPay ?? null,
  capacity: co.capacity,
  ghlValue: co.ghlValue ?? null,
});

/** Set a field, or remove it for null, so an unset field reads back absent (D-173). */
function setOrDrop<K extends keyof Cohort>(x: Cohort, k: K, v: Cohort[K] | null): void {
  if (v === null || v === undefined) delete x[k];
  else x[k] = v;
}

/**
 * The price (the mockup's "Set the price", Q-30): the cohort's three lookup keys and whether two payments are offered.
 * No amount is typed or stored: the dialog shows Stripe's price under each key ("Prices and Payment Links are made in
 * Stripe. This shows Stripe's price for this cohort.").
 */
export function saveCohortPrice(
  db: Db,
  a: Actor,
  args: { cohortId: string; full: string | null; rollover: string | null; twoPay: string | null; offerTwoPay: boolean },
  _c: Ctx,
): AdminOutcome {
  requirePerm(db, a, 'billing');
  const co = cohortOf(db, args.cohortId);
  const full = cleanKey(args.full);
  const rollover = cleanKey(args.rollover);
  const twoPay = cleanKey(args.twoPay);
  for (const k of [full, rollover, twoPay]) if (k !== null && !KEY.test(k)) return { db, error: `“${k}” is not a lookup key. Copy it from the price in Stripe.` };
  if (args.offerTwoPay && !twoPay) return { db, error: 'Enter two payments’ lookup key, or don’t offer two payments.' };
  const was = stored(co);
  const next = produce(db, (d) => {
    const x = d.cohorts.find((y) => y.id === co.id)!;
    setOrDrop(x, 'lookupKeyFull', full);
    setOrDrop(x, 'lookupKeyRollover', rollover);
    setOrDrop(x, 'lookupKeyTwoPay', twoPay);
    x.twoPay = args.offerTwoPay;
  });
  const now = stored(next.cohorts.find((y) => y.id === co.id)!);
  if (JSON.stringify(now) === JSON.stringify(was)) return { db, error: 'Nothing changed.' };
  return {
    db: next,
    toast: { msg: 'Price saved', tone: 'success' },
    audit: {
      action: 'cohort.price_save',
      target: { type: 'cohort', id: co.id, label: co.name },
      before: { lookupKeyFull: was.lookupKeyFull, lookupKeyRollover: was.lookupKeyRollover, lookupKeyTwoPay: was.lookupKeyTwoPay, twoPay: was.twoPay },
      after: { lookupKeyFull: now.lookupKeyFull, lookupKeyRollover: now.lookupKeyRollover, lookupKeyTwoPay: now.lookupKeyTwoPay, twoPay: now.twoPay },
    },
  };
}

/** A date and a time typed in the admin's zone (MT). */
export interface ZonedArgs {
  date: string;
  time: string;
}

/**
 * The rest of Settings › Enrollment: founding (yes or no) and when it closes (typed in MT), the two Payment Link
 * addresses, the seat cap and GoHighLevel's Cohort value. A cap below the seats already sold is refused.
 */
export function saveCohortEnrollment(
  db: Db,
  a: Actor,
  args: {
    cohortId: string;
    founding: boolean;
    foundingCloses: ZonedArgs | null;
    linkFull: string | null;
    linkTwoPay: string | null;
    capacity: number;
    ghlValue: string | null;
  },
  c: Ctx,
): AdminOutcome {
  requirePerm(db, a, 'billing');
  const co = cohortOf(db, args.cohortId);
  const tz = co.timezone ?? COURSE_TZ;
  const closesAt = args.foundingCloses ? zonedInstant(args.foundingCloses.date, args.foundingCloses.time, tz) : null;
  if (Number.isNaN(closesAt)) return { db, error: 'Pick a date and a time founding closes.' };
  const full = cleanLink(args.linkFull);
  const two = cleanLink(args.linkTwoPay);
  if (!full.ok || !two.ok) return { db, error: 'A Payment Link is its https address, as Stripe shows it.' };
  if (!Number.isInteger(args.capacity) || args.capacity < 1 || args.capacity > 1000) return { db, error: 'Seats is a whole number, 1 or more.' };
  const sold = c.cohortFacts?.[co.id]?.teams ?? 0;
  if (args.capacity < sold) return { db, error: `${sold} seats are sold, so the cap can’t be lower.` };
  const ghl = (args.ghlValue ?? '').trim();
  if (ghl && !/^[A-Za-z0-9_-]{1,40}$/.test(ghl)) return { db, error: 'GoHighLevel’s value is letters and digits, like jan27.' };
  const was = stored(co);
  const next = produce(db, (d) => {
    const x = d.cohorts.find((y) => y.id === co.id)!;
    x.founding = args.founding;
    setOrDrop(x, 'foundingClosesAt', closesAt);
    setOrDrop(x, 'linkFull', full.value);
    setOrDrop(x, 'linkTwoPay', two.value);
    x.capacity = args.capacity;
    setOrDrop(x, 'ghlValue', ghl || null);
  });
  const now = stored(next.cohorts.find((y) => y.id === co.id)!);
  if (JSON.stringify(now) === JSON.stringify(was)) return { db, error: 'Nothing changed.' };
  const pick = (s: ReturnType<typeof stored>) => ({
    founding: s.founding,
    foundingClosesAt: s.foundingClosesAt,
    linkFull: s.linkFull,
    linkTwoPay: s.linkTwoPay,
    capacity: s.capacity,
    ghlValue: s.ghlValue,
  });
  return {
    db: next,
    toast: { msg: 'Enrollment saved', tone: 'success' },
    audit: { action: 'cohort.enrollment_save', target: { type: 'cohort', id: co.id, label: co.name }, before: pick(was), after: pick(now) },
  };
}

// ================================================================================================
// The Enrollment card's words
// ================================================================================================

/** "Mon, Nov 30 · 11:59 PM MT / Tue, Dec 1, 12:59 AM CT": when founding closes, in the admin's one line (`fmt.mtWhen`). */
export const foundingCloseLine = (t: number): string => fmt.mtWhen(t);

/** The founding close as the form's date and time in MT, or the empty form. */
export const foundingCloseInputs = (t: number | null, tz: string = COURSE_TZ): ZonedArgs => (t === null ? { date: '', time: '23:59' } : zonedInputs(t, tz));
