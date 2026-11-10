// The offer, as data: the plans, the carts and the Stripe contract (DECISIONS.md D-072, D-073, D-077).
//
// THIS FILE IS THE LINE BETWEEN THE CODE AND STRIPE. Grokbok's handoff (docs/STRIPE-HANDOFF.md) uses
// the same names, so either side can be built without waiting for the other. The code never stores a
// price id or an amount: it asks Stripe for the price with a given LOOKUP KEY (billing/prices.ts), and
// when Spring changes a price Grokbok moves the key to a new price. What this file does hold are the
// dates and rules that are not prices: when founding closes, when agent plans start, how long the
// library's trial is, how many logins a plan gives.
//
// Pure, with no imports: the API (apps/api/src/billing), the www pages' build (apps/web/src/offer) and the
// tests all read this one copy. Not exported from the core barrel: import `@ai/core/offer`.

/** The three paid plans sold now. A plan is what an account holds; it is also an order's `plan`. */
export const PLAN_KINDS = ['library', 'cohort', 'agents'] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

/** How a plan is bought. `upto15` and `16to40` are the agent plan's two tiers. */
export const ORDER_OPTIONS = ['full', 'two_pay', 'upfront', 'upto15', '16to40'] as const;
export type OrderOption = (typeof ORDER_OPTIONS)[number];

export const ORDER_ORIGINS = ['offer', 'payment_link'] as const;
export type OrderOrigin = (typeof ORDER_ORIGINS)[number];

/** `pending` until the webhook says otherwise (D-074): only the webhook marks an order paid. */
export const ORDER_STATUSES = ['pending', 'paid', 'trialing', 'expired', 'failed', 'refunded'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PLAN_STATUSES = ['trialing', 'active', 'past_due', 'canceled', 'ended'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/** Connor tags every skill as one of these (D-078). */
export const SKILL_SETS = ['owner_ops', 'agent', 'both'] as const;
export type SkillSet = (typeof SKILL_SETS)[number];

/** The cohort is for Follow Up Boss teams only. Anything else is `other`. */
export const CRMS = ['follow_up_boss', 'other'] as const;
export type Crm = (typeof CRMS)[number];

/** The lookup keys the code asks Stripe for (the handoff's section 5). `smoke_test` is never sold here. */
export const LOOKUP_KEYS = [
  'cohort_founding_full',
  'cohort_founding_two_pay',
  'library_upfront',
  'membership_monthly',
  'agents_upto15_founding',
  'agents_16to40_founding',
] as const;
export type LookupKey = (typeof LOOKUP_KEYS)[number];

/** The `ai_plan` metadata values Stripe objects carry. `test` is the $1 smoke test, recorded and ignored. */
export const AI_PLANS = ['library', 'cohort', 'agents', 'membership', 'test'] as const;
/** The `ai_option` values. */
export const AI_OPTIONS = ['full', 'two_pay', 'upfront', 'monthly', 'upto15', '16to40', 'test'] as const;

// --- dates -----------------------------------------------------------------------------------------

const DAY = 24 * 60 * 60_000;

/**
 * Founding prices close at 11:59 pm Sunday, Nov 15, Central time, unless `FOUNDING_CLOSES_AT` says
 * otherwise (the spec assumes Central, the platform's own zone; Spring may pick another).
 */
export const DEFAULT_FOUNDING_CLOSES_AT = '2026-11-15T23:59:00-06:00';

/**
 * When the owner's invite may go out. Sales over the Forum weekend create the account at once but
 * hold the invite until Monday morning, so it lands with Sarah O.'s welcome email.
 */
export const DEFAULT_INVITES_FROM = '2026-11-16T08:00:00-06:00';

/** Agent plans' first charge: Tuesday, Jan 26, 2027. Morning in Central, so the date is right everywhere in the US. */
export const AGENTS_FIRST_CHARGE_AT = Date.parse('2027-01-26T09:00:00-06:00');
/** The agent plan's minimum term, a contract term rather than a Stripe setting (the handoff, section 5). */
export const AGENTS_MINIMUM_MONTHS = 3;

/** The library's $197 starts on day 31: a 30-day trial on `membership_monthly`. */
export const LIBRARY_TRIAL_DAYS = 30;

/**
 * Cohort one, as the platform's `dec26` cohort: 8 Tuesday builds from Dec 1, the last on Feb 2, then
 * 90 days of new skills and office hours. Its later $197 begins when those 90 days end (early May).
 */
export const COHORT_ONE = {
  id: 'dec26',
  firstBuildAt: Date.parse('2026-12-01T13:00:00-06:00'),
  lastBuildAt: Date.parse('2027-02-02T13:00:00-06:00'),
  afterDays: 90,
} as const;
/** When cohort one's 90 days end: its live sessions stop and its $197 would start. */
export const COHORT_ONE_LIVE_UNTIL = COHORT_ONE.lastBuildAt + COHORT_ONE.afterDays * DAY;

/** Ten seats, soft: the 11th sale is not refused, it alerts Connor to book a tech assistant. */
export const COHORT_SOFT_SEATS = 10;

/**
 * The cohort's $197 after its 90 days: `optional` (a box the buyer may tick) until Spring decides
 * (the spec's open decision). `required` makes the box required, which is what "automatic" means: a
 * later charge always has its own consent box at checkout.
 */
export const COHORT_RENEWAL: 'required' | 'optional' = 'optional';

/** Who answers questions and cancellations, as the legal pages name it. */
export const SUPPORT_EMAIL = 'admin@amplifiedimpact.io';

// --- carts -----------------------------------------------------------------------------------------

export const CART_IDS = ['library', 'cohort-full', 'cohort-two-pay', 'agents-upto15', 'agents-16to40'] as const;
export type CartId = (typeof CART_IDS)[number];

export interface Cart {
  id: CartId;
  plan: PlanKind;
  option: OrderOption;
  /** The Checkout Session's mode. */
  mode: 'payment' | 'subscription';
  /** Its line items, by lookup key, in order. */
  items: readonly LookupKey[];
  /** Sold only until founding closes. */
  founding: boolean;
  /**
   * A later charge the buyer consents to beside its own box: `required` for every cart that charges
   * again (the library's $197, the second of two payments, the agent plan), `optional` for the
   * cohort's $197 while Spring has not made it automatic.
   */
  renewal: 'required' | 'optional';
  /** Logins the plan gives: the owner plus an operations lead, or the agents plus the owner. */
  seats: number;
  /** Payments before a two-pay subscription ends. */
  installments?: number;
  /** The cohort is for Follow Up Boss teams only. */
  requiresFollowUpBoss: boolean;
  /** Where its fallback Payment Link's URL lives in the environment. */
  paymentLinkEnv: string;
}

export const CARTS: Readonly<Record<CartId, Cart>> = {
  library: {
    id: 'library',
    plan: 'library',
    option: 'upfront',
    // $2,000 today and $197 on day 31: one subscription, a one-time item and a trialing monthly one.
    mode: 'subscription',
    items: ['library_upfront', 'membership_monthly'],
    founding: false,
    renewal: 'required',
    seats: 2,
    requiresFollowUpBoss: false,
    paymentLinkEnv: 'PAYMENT_LINK_LIBRARY',
  },
  'cohort-full': {
    id: 'cohort-full',
    plan: 'cohort',
    option: 'full',
    mode: 'payment',
    items: ['cohort_founding_full'],
    founding: true,
    renewal: COHORT_RENEWAL,
    seats: 2,
    requiresFollowUpBoss: true,
    paymentLinkEnv: 'PAYMENT_LINK_COHORT_FULL',
  },
  'cohort-two-pay': {
    id: 'cohort-two-pay',
    plan: 'cohort',
    option: 'two_pay',
    mode: 'subscription',
    items: ['cohort_founding_two_pay'],
    founding: true,
    // The second payment is a later charge: the box says when, and that it stops on its own.
    renewal: 'required',
    seats: 2,
    installments: 2,
    requiresFollowUpBoss: true,
    paymentLinkEnv: 'PAYMENT_LINK_COHORT_TWO_PAY',
  },
  'agents-upto15': {
    id: 'agents-upto15',
    plan: 'agents',
    option: 'upto15',
    mode: 'subscription',
    items: ['agents_upto15_founding'],
    founding: true,
    renewal: 'required',
    seats: 16,
    requiresFollowUpBoss: false,
    paymentLinkEnv: 'PAYMENT_LINK_AGENTS_UPTO15',
  },
  'agents-16to40': {
    id: 'agents-16to40',
    plan: 'agents',
    option: '16to40',
    mode: 'subscription',
    items: ['agents_16to40_founding'],
    founding: true,
    renewal: 'required',
    seats: 41,
    requiresFollowUpBoss: false,
    paymentLinkEnv: 'PAYMENT_LINK_AGENTS_16TO40',
  },
};

/** The cart for a plan and option, or null for a pair no cart sells. */
export function cartFor(plan: string, option: string): Cart | null {
  return Object.values(CARTS).find((c) => c.plan === plan && c.option === option) ?? null;
}

/** The `ai_plan`/`ai_option` metadata a cart's Stripe objects carry. */
export function cartMetadata(cart: Cart): { ai_plan: PlanKind; ai_option: OrderOption } {
  return { ai_plan: cart.plan, ai_option: cart.option };
}

// --- dates as words --------------------------------------------------------------------------------

/** The program's zone. Every date a buyer reads about money is said in it. */
export const BILLING_TZ = 'America/Chicago';

/** "December 16, 2026". */
export function longDate(t: number): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: BILLING_TZ, month: 'long', day: 'numeric', year: 'numeric' }).format(t);
}

/** "Tuesday, January 26, 2027". */
export function longDay(t: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BILLING_TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(t);
}

/** Whole dollars from cents, the way the page prints a price: "$2,000", "$197", "$3,750". */
export function dollars(cents: number): string {
  const whole = Math.round(cents) / 100;
  return Number.isInteger(whole)
    ? `$${whole.toLocaleString('en-US')}`
    : `$${whole.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** When a library bought at `now` first charges its $197: day 31. */
export const libraryFirstMembershipCharge = (now: number): number => now + LIBRARY_TRIAL_DAYS * DAY;

/** One month after `t`, the way Stripe bills a monthly price (same day of the month, clamped). */
export function addMonths(t: number, months: number): number {
  const d = new Date(t);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.getTime();
}

/** The amounts a renewal sentence needs: the cart's later charge, in cents. */
export interface RenewalAmounts {
  /** `membership_monthly`. */
  membership: number;
  /** The cart's own recurring price (two-pay's installment, an agent tier's monthly). */
  recurring?: number;
}

/**
 * The words beside a cart's renewal box: the amount, when it starts and how to cancel. They are
 * stored with the order as the proof of what was agreed to (`renewal_consent_text`), so the page and
 * the checkout route both build them here, from the same prices.
 */
export function renewalText(cart: Cart, amounts: RenewalAmounts, now: number): string {
  const cancel = `Cancel anytime by emailing ${SUPPORT_EMAIL}.`;
  switch (cart.id) {
    case 'library':
      return (
        `I agree to ${dollars(amounts.membership)} a month for new skills and office hours, charged to this card ` +
        `starting ${longDate(libraryFirstMembershipCharge(now))} (day 31) until I cancel. ${cancel} ` +
        'I keep every skill released before I cancel.'
      );
    case 'cohort-two-pay':
      return (
        `I agree to a second payment of ${dollars(amounts.recurring ?? 0)} on ${longDate(addMonths(now, 1))}. ` +
        'The payments stop on their own after the second one.'
      );
    case 'cohort-full':
      return (
        `Keep my membership going after cohort one: ${dollars(amounts.membership)} a month for new skills and ` +
        `office hours, starting ${longDate(COHORT_ONE_LIVE_UNTIL)}, until I cancel. ${cancel}`
      );
    case 'agents-upto15':
    case 'agents-16to40':
      return (
        `I agree to ${dollars(amounts.recurring ?? 0)} a month, charged to this card starting ` +
        `${longDay(AGENTS_FIRST_CHARGE_AT)}, until I cancel, with a ${AGENTS_MINIMUM_MONTHS}-month minimum. ` +
        `Nothing is charged today. After the third payment, ${cancel.charAt(0).toLowerCase()}${cancel.slice(1)}`
      );
  }
}

/** The plan's dates once it is paid for, as provisioning records them. */
export interface PlanDates {
  startsAt: number;
  /** What the access rule compares with a skill's release date. Null: nothing paid for yet. */
  paidThrough: number | null;
  /** When live sessions end. Null: they run for as long as the plan is paid. */
  liveUntil: number | null;
  minimumUntil: number | null;
  cohortId: string | null;
}

/**
 * A new plan's dates. The library is paid through day 30 (its $197 then moves it a month at a time);
 * the cohort through the end of its 90 days; an agent plan has paid for nothing until its first
 * charge on Jan 26, which `invoice.paid` records.
 */
export function initialPlanDates(plan: PlanKind, now: number): PlanDates {
  switch (plan) {
    case 'library':
      return { startsAt: now, paidThrough: libraryFirstMembershipCharge(now), liveUntil: libraryFirstMembershipCharge(now), minimumUntil: null, cohortId: null };
    case 'cohort':
      return { startsAt: now, paidThrough: COHORT_ONE_LIVE_UNTIL, liveUntil: COHORT_ONE_LIVE_UNTIL, minimumUntil: null, cohortId: COHORT_ONE.id };
    case 'agents':
      return {
        startsAt: AGENTS_FIRST_CHARGE_AT,
        paidThrough: null,
        liveUntil: null,
        minimumUntil: addMonths(AGENTS_FIRST_CHARGE_AT, AGENTS_MINIMUM_MONTHS),
        cohortId: null,
      };
  }
}

/** Which skill sets a plan opens (D-078). Cohort buyers get both. */
export const PLAN_SETS: Readonly<Record<PlanKind, readonly ('owner_ops' | 'agent')[]>> = {
  library: ['owner_ops'],
  cohort: ['owner_ops', 'agent'],
  agents: ['agent'],
};

/** The plans' working names, until Spring names them (the spec's open decision). They print on receipts. */
export const PLAN_NAMES: Readonly<Record<PlanKind, string>> = {
  library: 'Skill Library',
  cohort: 'Core Cohort',
  agents: 'Agent Team Plan',
};

// --- the page's tokens -----------------------------------------------------------------------------
// The offer pages are built once (apps/web) and filled per request (apps/api/src/routes/offer.ts):
// prices, dates and which carts are open change without a deploy, so the built HTML carries
// `%%name%%` tokens the API replaces with escaped values. These builders are the one spelling of each.

/** `%%name%%`. A token is lower-case letters, digits, `-`, `_` and `:`. */
export const token = (name: string): string => `%%${name}%%`;
export const TOKEN_PATTERN = /%%([a-z0-9:_-]+)%%/g;

/** What a cart shows: its form (`checkout`), its Payment Link (`link`), closed, or "opens soon". */
export type CartState = 'checkout' | 'link' | 'closed' | 'soon';

export const OFFER_TOKENS = {
  state: (cart: CartId) => token(`state:${cart}`),
  price: (key: LookupKey) => token(`price:${key}`),
  renewal: (cart: CartId) => token(`renewal:${cart}`),
  link: (cart: CartId) => token(`link:${cart}`),
  checked: (cart: CartId) => token(`checked:${cart}`),
  error: token('error'),
  errorField: token('error-field'),
  campaign: token('campaign'),
  src: token('src'),
  name: token('v-name'),
  email: token('v-email'),
  phone: token('v-phone'),
  company: token('v-company'),
  pagePath: token('page-path'),
  offerState: token('offer-state'),
  founding: token('founding'),
  foundingCloses: token('founding-closes'),
  loginDay: token('login-day'),
} as const;

export const WELCOME_TOKENS = {
  state: token('welcome-state'),
  planName: token('plan-name'),
  login: token('login'),
  intakeUrl: token('intake-url'),
  intakeState: token('intake-state'),
  sessionId: token('session-id'),
} as const;
