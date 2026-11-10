// The offer's settings, read from the environment (the spec's "Settings in Railway").
//
//   STRIPE_SECRET_KEY      a restricted key, `rk_test_…` until Thursday, then `rk_live_…`
//   STRIPE_WEBHOOK_SECRET  `whsec_…` for the endpoint in the same mode
//   OFFER_OPEN             `true` opens the carts; anything else keeps them closed
//   FOUNDING_CLOSES_AT     an ISO instant with an offset; defaults to Sun, Nov 15, 11:59 pm Central
//   INVITES_FROM           when held owner invites go out; defaults to Mon, Nov 16, 8:00 am Central
//   PAYMENT_LINK_*         Grokbok's fallback Payment Links, one per cart (catalog.ts names them)
//   INTAKE_URL_*           Sarah O.'s intake form per plan, shown on /offer/welcome
//   STRIPE_PORTAL_LOGIN_URL      the billing portal's login page, where members cancel themselves
//   STRIPE_PORTAL_CONFIG_LOCKED  a portal configuration with cancelling off, for buyers inside a commitment
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
  };
}
