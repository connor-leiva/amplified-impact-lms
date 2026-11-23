// The offer's settings, read from the environment (the spec's "Settings in Railway").
//
//   STRIPE_SECRET_KEY      a restricted key, `rk_test_…` until Thursday, then `rk_live_…`
//   STRIPE_WEBHOOK_SECRET  `whsec_…` for the endpoint in the same mode
//   OFFER_OPEN             `true` opens the carts; anything else keeps them closed
//   FOUNDING_CLOSES_AT     an ISO instant with an offset; defaults to Mon, Nov 30, 11:59 PM Mountain
//   INVITES_FROM           when held owner invites go out; defaults to Mon, Nov 16, 8:00 am Central
//   PAYMENT_LINK_*         Ampy's Payment Links, one per cart (catalog.ts names them): the only way to buy
//   INTAKE_URL_*           Sarah O.'s intake form per plan, shown on /offer/welcome
//   CALENDAR_URL_BUILDS, CALENDAR_URL_OFFICE_HOURS  "add to calendar" links on the thank-you pages (D-105);
//                          unset, the page says the invites come by email
//   TEAM_CALL_URL          where "Let's talk" goes for a team over 40 agents (D-105); unset, an email to support
//   STRIPE_PORTAL_LOGIN_URL      the billing portal's login page, where members cancel themselves
//   STRIPE_PORTAL_CONFIG_LOCKED  a portal configuration with cancelling off, for buyers inside a commitment
//   STRIPE_PRICE_SKILL_SINGLE    the `price_…` id of the $37 one-time skill price (lookup key skill_single)
//
// EVERYTHING HERE IS OPTIONAL, AND THE API BOOTS WITHOUT ANY OF IT. With no Stripe key the offer page
// shows the fallback links instead of its own buttons; with no links either, it says the carts open
// soon. A secret is never logged, and `describeOfferConfig` reports only whether each one is set and
// which mode a key is in (`test` or `live`, from its prefix), never a character of its value.

import { CART_IDS, CARTS, DEFAULT_FOUNDING_CLOSES_AT, DEFAULT_INVITES_FROM, PLAN_KINDS } from './catalog';
import type { CartId, PlanKind } from './catalog';

export interface OfferConfig {
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  open: boolean;
  foundingClosesAt: number;
  invitesFrom: number;
  /**
   * Whether owner invites may go out at all: only when the platform serves sign-in, which is http mode
   * (`VITE_DATA_SOURCE` is not `fixture`). In fixture mode an invite's link would land on the demo, so
   * every invite is held, and the billing loop sends them once the deploy runs in http mode.
   */
  invitesEnabled: boolean;
  paymentLinks: Partial<Record<CartId, string>>;
  intakeUrls: Partial<Record<PlanKind, string>>;
  /** Stripe's billing portal login page (`STRIPE_PORTAL_LOGIN_URL`): where a member cancels or updates a card. */
  portalLoginUrl: string | null;
  /**
   * A portal configuration with cancelling turned off (`STRIPE_PORTAL_CONFIG_LOCKED`), opened for a
   * customer still inside a commitment: two-pay before its second payment, or a Team Plan inside its
   * 3-month minimum. Unset, those customers get the default configuration.
   */
  portalLockedConfig: string | null;
  /** "Add to calendar" links for the Wednesday builds and the Thursday office hours (D-105). */
  calendarUrls: { builds: string | null; officeHours: string | null };
  /** Where "Let's talk" goes for a team over 40 agents; null sends an email to support (D-105). */
  teamCallUrl: string | null;
  /**
   * D-154: the AI Accelerator's two Payment Links, by id, that the combined 15-seat cap turns off and
   * on: `PAYMENT_LINK_ID_COHORT_FULL` and `PAYMENT_LINK_ID_COHORT_TWO_PAY`, each defaulting to the live
   * link when the key is a live key. With a test key and no variable, none: the cap leaves Stripe alone.
   */
  seatCapLinks: string[];
  /**
   * The one-time skill price (`STRIPE_PRICE_SKILL_SINGLE`), a `price_…` id. Not a secret. Unset, or
   * not a price id, skill checkout answers 503 and creates nothing.
   */
  skillPriceId: string | null;
  /**
   * Signed-out $37 checkout that creates the account. Off unless `SKILL_GUEST_CHECKOUT=on`.
   * Off, the public button's route sends the visitor to the stopgap Payment Link.
   */
  skillGuestCheckout: boolean;
}

export class OfferConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfferConfigError';
  }
}

function instant(name: string, raw: string | undefined, fallback: string): number {
  const value = (raw ?? '').trim() || fallback;
  const parsed = Date.parse(value);
  // A typo here would silently keep founding prices on sale forever, or close them at once: loud.
  if (Number.isNaN(parsed) || !/[zZ]|[+-]\d\d:?\d\d$/.test(value)) {
    throw new OfferConfigError(`${name} must be an ISO 8601 instant with an offset, e.g. ${fallback}; got ${JSON.stringify(value)}.`);
  }
  return parsed;
}

/** An https URL, or null. A link that is not one is ignored rather than shown to a buyer. */
function httpsUrl(raw: string | undefined): string | null {
  const value = (raw ?? '').trim();
  if (value === '') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

const secret = (raw: string | undefined): string | null => {
  const value = (raw ?? '').trim();
  return value === '' ? null : value;
};

/**
 * D-154: the two live AI Accelerator Payment Links (paid in full, two payments), read-only confirmed
 * 2026-11-13. Ids, not secrets. Each is used only with a live key, unless its variable names another.
 */
export const ACCELERATOR_LINKS_LIVE = {
  full: 'plink_1UaNGZLAuFJaUU8qHyM5p82M',
  twoPay: 'plink_1UaNGcLAuFJaUU8qxAVTFih1',
} as const;

const PLINK = /^plink_[A-Za-z0-9]+$/;
const PRICE_ID = /^price_[A-Za-z0-9]+$/;

function skillPriceId(raw: string | undefined): string | null {
  const value = (raw ?? '').trim();
  return PRICE_ID.test(value) ? value : null;
}

function seatCapLinks(env: NodeJS.ProcessEnv): string[] {
  const live = keyMode(secret(env.STRIPE_SECRET_KEY)) === 'live';
  const pick = (raw: string | undefined, fallback: string): string | null => {
    const value = (raw ?? '').trim();
    if (PLINK.test(value)) return value;
    return live ? fallback : null;
  };
  return [pick(env.PAYMENT_LINK_ID_COHORT_FULL, ACCELERATOR_LINKS_LIVE.full), pick(env.PAYMENT_LINK_ID_COHORT_TWO_PAY, ACCELERATOR_LINKS_LIVE.twoPay)].filter(
    (id): id is string => id !== null,
  );
}

export function readOfferConfig(env: NodeJS.ProcessEnv = process.env): OfferConfig {
  const paymentLinks: Partial<Record<CartId, string>> = {};
  for (const id of CART_IDS) {
    const url = httpsUrl(env[CARTS[id].paymentLinkEnv]);
    if (url) paymentLinks[id] = url;
  }
  const intakeUrls: Partial<Record<PlanKind, string>> = {};
  for (const plan of PLAN_KINDS) {
    const url = httpsUrl(env[`INTAKE_URL_${plan.toUpperCase()}`]);
    if (url) intakeUrls[plan] = url;
  }
  return {
    stripeSecretKey: secret(env.STRIPE_SECRET_KEY),
    stripeWebhookSecret: secret(env.STRIPE_WEBHOOK_SECRET),
    open: (env.OFFER_OPEN ?? '').trim().toLowerCase() === 'true',
    foundingClosesAt: instant('FOUNDING_CLOSES_AT', env.FOUNDING_CLOSES_AT, DEFAULT_FOUNDING_CLOSES_AT),
    invitesFrom: instant('INVITES_FROM', env.INVITES_FROM, DEFAULT_INVITES_FROM),
    invitesEnabled: env.VITE_DATA_SOURCE !== 'fixture',
    paymentLinks,
    intakeUrls,
    portalLoginUrl: httpsUrl(env.STRIPE_PORTAL_LOGIN_URL),
    portalLockedConfig: /^bpc_[A-Za-z0-9]+$/.test((env.STRIPE_PORTAL_CONFIG_LOCKED ?? '').trim()) ? env.STRIPE_PORTAL_CONFIG_LOCKED!.trim() : null,
    calendarUrls: { builds: httpsUrl(env.CALENDAR_URL_BUILDS), officeHours: httpsUrl(env.CALENDAR_URL_OFFICE_HOURS) },
    teamCallUrl: httpsUrl(env.TEAM_CALL_URL),
    seatCapLinks: seatCapLinks(env),
    skillPriceId: skillPriceId(env.STRIPE_PRICE_SKILL_SINGLE),
    skillGuestCheckout: (env.SKILL_GUEST_CHECKOUT ?? '').trim().toLowerCase() === 'on',
  };
}

/** Whether founding prices still sell at `now`. */
export const foundingOpen = (config: Pick<OfferConfig, 'foundingClosesAt'>, now: number): boolean => now < config.foundingClosesAt;

/** `test` or `live` from a key's prefix, or `unknown`. The only thing about a key that is ever logged. */
export function keyMode(key: string | null): 'test' | 'live' | 'unknown' | 'unset' {
  if (key === null) return 'unset';
  if (/^(rk|sk)_test_/.test(key)) return 'test';
  if (/^(rk|sk)_live_/.test(key)) return 'live';
  return 'unknown';
}

/** A boot line for the log: what is on, in which mode, and nothing secret. */
export function describeOfferConfig(config: OfferConfig): Record<string, unknown> {
  return {
    open: config.open,
    stripe: keyMode(config.stripeSecretKey),
    webhook: config.stripeWebhookSecret === null ? 'unset' : 'set',
    foundingClosesAt: new Date(config.foundingClosesAt).toISOString(),
    invitesFrom: new Date(config.invitesFrom).toISOString(),
    invites: config.invitesEnabled ? 'on' : 'held: the platform is in fixture mode',
    paymentLinks: Object.keys(config.paymentLinks),
    portal: { login: config.portalLoginUrl !== null, lockedConfig: config.portalLockedConfig !== null },
    intakeForms: Object.keys(config.intakeUrls),
    calendars: { builds: config.calendarUrls.builds !== null, officeHours: config.calendarUrls.officeHours !== null },
    teamCall: config.teamCallUrl !== null,
    // D-154: how many Accelerator Payment Links the 15-seat cap turns off and on (ids, never a key).
    seatCapLinks: config.seatCapLinks.length,
    // Whether the one-time skill price id is set. The id itself stays out of the log.
    skillPrice: config.skillPriceId === null ? 'unset' : 'set',
    skillGuestCheckout: config.skillGuestCheckout ? 'on' : 'off',
  };
}
