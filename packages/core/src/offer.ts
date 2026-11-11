// The offer, as data: the plans, the carts and the Stripe contract (DECISIONS.md D-073, D-074, D-078,
// and D-104 for the Phase 1 offers: Amplified Insiders sold on its own, the Team Plan's first 3 months
// paid at checkout, the Skill Library retired).
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

/**
 * The paid plans. A plan is what an account holds; it is also an order's `plan`, and Stripe's `ai_plan`.
 * `membership` is Amplified Insiders. `library` (the Amplified Skill Library) is retired (D-104): no cart
 * sells it, and it stays here only so a row written before then still reads.
 */
export const PLAN_KINDS = ['library', 'cohort', 'agents', 'membership'] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

/**
 * How a plan is bought. `upto15` and `16to40` are the Team Plan's two tiers; `year_upfront` and
 * `monthly` are Amplified Insiders' two ways to pay. `upfront` was the retired library's.
 */
export const ORDER_OPTIONS = ['full', 'two_pay', 'upfront', 'upto15', '16to40', 'year_upfront', 'monthly'] as const;
export type OrderOption = (typeof ORDER_OPTIONS)[number];

export const ORDER_ORIGINS = ['offer', 'payment_link'] as const;
export type OrderOrigin = (typeof ORDER_ORIGINS)[number];

/** `pending` until the webhook says otherwise (D-075): only the webhook marks an order paid. */
export const ORDER_STATUSES = ['pending', 'paid', 'trialing', 'expired', 'failed', 'refunded'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PLAN_STATUSES = ['trialing', 'active', 'past_due', 'canceled', 'ended'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/** Connor tags every skill as one of these (D-079). */
export const SKILL_SETS = ['owner_ops', 'agent', 'both'] as const;
export type SkillSet = (typeof SKILL_SETS)[number];

/** The cohort is for Follow Up Boss teams only. Anything else is `other`. */
export const CRMS = ['follow_up_boss', 'other'] as const;
export type Crm = (typeof CRMS)[number];

/** The lookup keys the code asks Stripe for (the handoff's section 5). `smoke_test` is never sold here. */
export const LOOKUP_KEYS = [
  'cohort_founding_full',
  'cohort_founding_two_pay',
  'membership_year_upfront',
  'membership_monthly',
  'agents_upto15_prepay3',
  'agents_16to40_prepay3',
  'agents_upto15_founding',
  'agents_16to40_founding',
] as const;
export type LookupKey = (typeof LOOKUP_KEYS)[number];

/** The `ai_plan` metadata values Stripe objects carry. `test` is the $1 smoke test, recorded and ignored. */
export const AI_PLANS = ['library', 'cohort', 'agents', 'membership', 'test'] as const;
/** The `ai_option` values. */
export const AI_OPTIONS = ['full', 'two_pay', 'upfront', 'year_upfront', 'monthly', 'upto15', '16to40', 'test'] as const;

/**
 * The `billing` metadata the Team Plan's Payment Links carry (Ampy, 2026-11-10): the first 3 months paid
 * at checkout, then monthly. A Team Plan session without it is from an older link, and is not
 * provisioned on terms it was not sold on.
 */
export const FORUM_PREPAY = 'forum_prepay';

// --- dates -----------------------------------------------------------------------------------------

const DAY = 24 * 60 * 60_000;

/**
 * Founding prices close at 11:59 PM Monday, Nov 30, 2026, Mountain time (unix 1796108340), for the AI
 * Accelerator and the Team Plan alike, unless `FOUNDING_CLOSES_AT` says otherwise (Spring's plan and
 * Ampy's Stripe update, 2026-11-10). Amplified Insiders has no founding price.
 */
export const DEFAULT_FOUNDING_CLOSES_AT = '2026-11-30T23:59:00-07:00';

/** The zone the founding deadline is said in: Spring's plan says "11:59 PM Mountain". */
export const DEADLINE_TZ = 'America/Denver';

/**
 * When the owner's invite may go out. Sales over the Forum weekend create the account at once but
 * hold the invite until Monday morning, so it lands with Sarah O.'s welcome email.
 */
export const DEFAULT_INVITES_FROM = '2026-11-16T08:00:00-06:00';

/**
 * The Amplified Team Plan's first monthly charge: Sunday, Apr 4, 2027, 00:00 America/Chicago (unix
 * 1806814800). The first 3 months, Jan 4 to Apr 3, are paid at checkout; every Team Plan
 * subscription's `trial_end` is pinned here, so every buyer's monthly billing starts the same day.
 */
export const AGENTS_FIRST_CHARGE_AT = Date.parse('2027-04-04T00:00:00-05:00');

/**
 * When a Team Plan's agent skills open: Monday, Dec 14, 2026, 00:00 America/Chicago, with the agent
 * starter path (Connor, 2026-11-10). The owner's and the agents' logins open at purchase, as for every
 * plan; the skills wait for this day.
 */
export const AGENTS_SKILLS_FROM = Date.parse('2026-12-14T00:00:00-06:00');

/**
 * The first Amplified Insiders charge for cohort one: Tuesday, May 4, 2027, 00:00 America/Chicago (unix
 * 1809406800), 90 days after the last build on Wednesday, Feb 3. Never `trial_period_days=90`, which
 * would count from checkout and bill in February.
 */
export const INSIDERS_FIRST_CHARGE_AT = Date.parse('2027-05-04T00:00:00-05:00');
/** Monthly minimums, a contract term rather than a Stripe setting: Amplified Insiders paid monthly. */
export const MINIMUM_MONTHS = 3;

/** Amplified Insiders paid for a year: $1,997 today, then `membership_monthly` after a 365-day trial. */
export const INSIDERS_YEAR_DAYS = 365;

/**
 * Cohort one, as the platform's `dec26` cohort: 8 Wednesday builds, Dec 2, 9 and 16, Jan 6, 13, 20 and
 * 27, and Feb 3 (no builds Dec 23 or 30), then 90 days of new skills and office hours. 1 PM Central is
 * a placeholder until the build time is set (Connor, 2026-11-10).
 */
export const COHORT_ONE = {
  id: 'dec26',
  firstBuildAt: Date.parse('2026-12-02T13:00:00-06:00'),
  lastBuildAt: Date.parse('2027-02-03T13:00:00-06:00'),
  afterDays: 90,
} as const;
/** When cohort one's 90 included days end and Amplified Insiders begins: the start of May 4, 2027, Central. */
export const COHORT_ONE_LIVE_UNTIL = INSIDERS_FIRST_CHARGE_AT;

/**
 * Fifteen founding seats across both AI Accelerator links (Connor, 2026-11-10). At 15 the offer page
 * hides both links and offers the waitlist, and the sale that fills the last seat alerts Connor; Ampy
 * turns the Stripe links off by hand (each has its own sales limit of 15). The code never changes Stripe.
 */
export const COHORT_SEATS = 15;

/** The membership every cohort buyer rolls into, and Amplified Insiders' name. */
export const MEMBERSHIP_NAME = 'Amplified Insiders';

/** Who answers questions and cancellations, as the legal pages name it. */
export const SUPPORT_EMAIL = 'admin@amplifiedimpact.io';

/** The support address on the offer and thank-you pages (docs/SPRING-PLAN.md: "Support on thank-you pages"). */
export const HELP_EMAIL = 'support@amplifiedimpact.io';

// --- carts -----------------------------------------------------------------------------------------

export const CART_IDS = ['cohort-full', 'cohort-two-pay', 'insiders-year', 'insiders-monthly', 'agents-upto15', 'agents-16to40'] as const;
export type CartId = (typeof CART_IDS)[number];

export interface Cart {
  id: CartId;
  plan: PlanKind;
  option: OrderOption;
  /** The Checkout Session's mode, as its Payment Link sells it. */
  mode: 'payment' | 'subscription';
  /** Its prices, by lookup key, in order. */
  items: readonly LookupKey[];
  /** Sold only until founding closes. */
  founding: boolean;
  /** Logins the plan gives: the owner plus an operations lead, or the agents plus the owner. */
  seats: number;
  /** Payments before a two-pay subscription ends. */
  installments?: number;
  /** Months the buyer commits to (Amplified Insiders paid monthly); cancelling is off until then. */
  minimumMonths?: number;
  /** The `billing` metadata its link must carry: a Team Plan link without it is an older one. */
  billing?: typeof FORUM_PREPAY;
  /** The cohort is for Follow Up Boss teams only. */
  requiresFollowUpBoss: boolean;
  /** Where its Payment Link's URL lives in the environment (Ampy sets them in Railway). */
  paymentLinkEnv: string;
}

export const CARTS: Readonly<Record<CartId, Cart>> = {
  'cohort-full': {
    id: 'cohort-full',
    plan: 'cohort',
    option: 'full',
    // $7,500 today and Amplified Insiders trialing until May 4, 2027: one subscription, a one-time item
    // and a monthly one, with `trial_end` pinned by the webhook.
    mode: 'subscription',
    items: ['cohort_founding_full', 'membership_monthly'],
    founding: true,
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
    seats: 2,
    installments: 2,
    requiresFollowUpBoss: true,
    paymentLinkEnv: 'PAYMENT_LINK_COHORT_TWO_PAY',
  },
  'insiders-year': {
    id: 'insiders-year',
    plan: 'membership',
    option: 'year_upfront',
    // $1,997 today for one year, then $197 a month until cancelled: one subscription, a one-time item
    // and `membership_monthly` on a 365-day trial. Not an annual price that renews.
    mode: 'subscription',
    items: ['membership_year_upfront', 'membership_monthly'],
    founding: false,
    seats: 2,
    requiresFollowUpBoss: false,
    paymentLinkEnv: 'PAYMENT_LINK_INSIDERS_YEAR',
  },
  'insiders-monthly': {
    id: 'insiders-monthly',
    plan: 'membership',
    option: 'monthly',
    mode: 'subscription',
    items: ['membership_monthly'],
    founding: false,
    seats: 2,
    minimumMonths: MINIMUM_MONTHS,
    requiresFollowUpBoss: false,
    paymentLinkEnv: 'PAYMENT_LINK_INSIDERS_MONTHLY',
  },
  'agents-upto15': {
    id: 'agents-upto15',
    plan: 'agents',
    option: 'upto15',
    // $1,491 today for Jan 4 to Apr 3, 2027, then $497 a month from Apr 4: a one-time item and the
    // founding monthly price, trialing until the pinned first charge.
    mode: 'subscription',
    items: ['agents_upto15_prepay3', 'agents_upto15_founding'],
    founding: true,
    seats: 16,
    billing: FORUM_PREPAY,
    requiresFollowUpBoss: false,
    paymentLinkEnv: 'PAYMENT_LINK_TEAM_UPTO15_PREPAY',
  },
  'agents-16to40': {
    id: 'agents-16to40',
    plan: 'agents',
    option: '16to40',
    mode: 'subscription',
    items: ['agents_16to40_prepay3', 'agents_16to40_founding'],
    founding: true,
    seats: 41,
    billing: FORUM_PREPAY,
    requiresFollowUpBoss: false,
    paymentLinkEnv: 'PAYMENT_LINK_TEAM_16TO40_PREPAY',
  },
};

/** The cart for a plan and option, or null for a pair no cart sells. */
export function cartFor(plan: string, option: string): Cart | null {
  return Object.values(CARTS).find((c) => c.plan === plan && c.option === option) ?? null;
}

/**
 * The cart a Payment Link's session metadata names: its plan and option, and for a cart sold on a
 * billing arrangement (the Team Plan's `forum_prepay`) that arrangement too. Null for anything else.
 */
export function cartForMetadata(meta: { ai_plan?: string; ai_option?: string; billing?: string }): Cart | null {
  const cart = cartFor(meta.ai_plan ?? '', meta.ai_option ?? '');
  if (!cart) return null;
  return (cart.billing ?? null) === (meta.billing ?? null) ? cart : null;
}

/**
 * The fixed calendar date a cart's subscription first charges its monthly price, whatever relative
 * trial its Payment Link set: the Team Plan on Apr 4, 2027, the AI Accelerator in full (whose
 * subscription carries Amplified Insiders) on May 4, 2027. Null for the others: two payments roll into
 * a separate Insiders subscription, and Insiders paid yearly keeps its link's 365 days.
 */
export function pinnedFirstCharge(cart: Cart): number | null {
  if (cart.plan === 'agents') return AGENTS_FIRST_CHARGE_AT;
  if (cart.id === 'cohort-full') return INSIDERS_FIRST_CHARGE_AT;
  return null;
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

/** "Sunday, April 4, 2027". */
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

/** "Monday, November 30 at 11:59 PM Mountain": the founding deadline, built from parts so it reads the same on every ICU. */
export function mountainDeadline(t: number): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: DEADLINE_TZ,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .formatToParts(t)
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  return `${parts.weekday}, ${parts.month} ${parts.day} at ${parts.hour}:${parts.minute} ${parts.dayPeriod?.toUpperCase()} Mountain`;
}

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
 * A new plan's dates (D-104):
 *   - the AI Accelerator: paid through the end of cohort one's 90 days;
 *   - Amplified Insiders by the year: paid through day 365, when its $197 a month begins;
 *   - Amplified Insiders by the month: paid through one month, with a 3-month minimum;
 *   - the Team Plan: paid at checkout through Apr 3, 2027, its first monthly charge on Apr 4. Its agent
 *     skills open on Dec 14 (`startsAt`, which the access rule reads); its 3-month minimum is paid up
 *     front, so nothing locks cancelling.
 */
export function initialPlanDates(cart: Pick<Cart, 'plan' | 'option'>, now: number): PlanDates {
  switch (cart.plan) {
    case 'cohort':
      return { startsAt: now, paidThrough: COHORT_ONE_LIVE_UNTIL, liveUntil: COHORT_ONE_LIVE_UNTIL, minimumUntil: null, cohortId: COHORT_ONE.id };
    case 'membership': {
      if (cart.option === 'year_upfront') {
        const year = now + INSIDERS_YEAR_DAYS * DAY;
        return { startsAt: now, paidThrough: year, liveUntil: null, minimumUntil: null, cohortId: null };
      }
      return { startsAt: now, paidThrough: addMonths(now, 1), liveUntil: null, minimumUntil: addMonths(now, MINIMUM_MONTHS), cohortId: null };
    }
    case 'agents':
      return { startsAt: Math.max(now, AGENTS_SKILLS_FROM), paidThrough: AGENTS_FIRST_CHARGE_AT, liveUntil: null, minimumUntil: null, cohortId: null };
    case 'library':
      // Retired (D-104): no cart sells it. A row made before then keeps whatever it was given.
      return { startsAt: now, paidThrough: null, liveUntil: null, minimumUntil: null, cohortId: null };
  }
}

/** Which skill sets a plan opens (D-079). Cohort buyers get both. */
export const PLAN_SETS: Readonly<Record<PlanKind, readonly ('owner_ops' | 'agent')[]>> = {
  library: ['owner_ops'],
  cohort: ['owner_ops', 'agent'],
  agents: ['agent'],
  membership: ['owner_ops'],
};

/** The plans' names (Connor, 2026-11-10). They print on every page that names a plan. */
export const PLAN_NAMES: Readonly<Record<PlanKind, string>> = {
  library: 'Amplified Skill Library',
  cohort: 'Amplified AI Accelerator',
  agents: 'Amplified Team Plan',
  membership: MEMBERSHIP_NAME,
};

// --- the page's tokens -----------------------------------------------------------------------------
// The offer pages are built once (apps/web) and filled per request (apps/api/src/routes/offer.ts):
// prices, dates and which carts are open change without a deploy, so the built HTML carries
// `%%name%%` tokens the API replaces with escaped values. These builders are the one spelling of each.

/** `%%name%%`. A token is lower-case letters, digits, `-`, `_` and `:`. */
export const token = (name: string): string => `%%${name}%%`;
export const TOKEN_PATTERN = /%%([a-z0-9:_-]+)%%/g;

/**
 * What a cart shows: its Payment Link (`link`), closed with founding prices, sold out (the AI
 * Accelerator's 15 seats), or "opens soon". The site's own checkout is retired (D-104).
 */
export type CartState = 'link' | 'closed' | 'soldout' | 'soon';

export const OFFER_TOKENS = {
  state: (cart: CartId) => token(`state:${cart}`),
  link: (cart: CartId) => token(`link:${cart}`),
  src: token('src'),
  offerState: token('offer-state'),
  founding: token('founding'),
  foundingCloses: token('founding-closes'),
  /** `held` before INVITES_FROM, `sent` after. On <body data-invites>; the login line has a version for each. */
  invites: token('invites'),
  loginDay: token('login-day'),
  /** Where "Let's talk" goes for a team over 40 agents. */
  teamCall: token('team-call'),
} as const;

export const WELCOME_TOKENS = {
  state: token('welcome-state'),
  planName: token('plan-name'),
  login: token('login'),
  intakeUrl: token('intake-url'),
  intakeState: token('intake-state'),
  sessionId: token('session-id'),
  portalUrl: token('portal-url'),
  /** The confirmed order's plan, which picks its thank-you section. On <body data-product>. */
  product: token('product'),
  invites: token('invites'),
  loginDay: token('login-day'),
  /** The add-to-calendar links, each a URL or empty, and `links` when either is set, else `email`. */
  calendarBuilds: token('calendar-builds'),
  calendarOfficeHours: token('calendar-office-hours'),
  calendarState: token('calendar-state'),
} as const;

/** The three plan cards on the page, in the plan's order: the AI Accelerator, Insiders, the Team Plan. */
export const CARDS: readonly PlanKind[] = ['cohort', 'membership', 'agents'];

/** The carts each card sells, its button's first. */
export const CARD_CARTS: Readonly<Partial<Record<PlanKind, readonly CartId[]>>> = {
  cohort: ['cohort-full', 'cohort-two-pay'],
  membership: ['insiders-year', 'insiders-monthly'],
  agents: ['agents-upto15', 'agents-16to40'],
};

// The prices are words in apps/web/src/offer/content.ts since Spring's page (D-105): every price shows,
// even when Stripe cannot be asked. `GET /api/offer` still reports Stripe's live amounts.
