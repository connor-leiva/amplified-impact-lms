// The offer, as data: the plans, the carts and the Stripe contract (DECISIONS.md D-073, D-074, D-078).
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

/**
 * The Amplified Team Plan's first charge: Tuesday, Jan 26, 2027, 00:00 America/Chicago (unix
 * 1800943200). Every agent subscription's `trial_end` is pinned here, so every buyer hits the same day.
 */
export const AGENTS_FIRST_CHARGE_AT = Date.parse('2027-01-26T00:00:00-06:00');

/**
 * The first Amplified Insiders charge for cohort one: Monday, May 3, 2027, 00:00 America/Chicago (unix
 * 1809320400), the cohort's last build (Feb 2) plus its 90 included days. Never `trial_period_days=90`,
 * which would count from checkout and bill in February.
 */
export const INSIDERS_FIRST_CHARGE_AT = Date.parse('2027-05-03T00:00:00-05:00');
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
/**
 * When cohort one's 90 included days end and Amplified Insiders begins: the start of May 3, 2027 in
 * Central time, which is the last build plus `afterDays`, rounded to the day Stripe charges.
 */
export const COHORT_ONE_LIVE_UNTIL = INSIDERS_FIRST_CHARGE_AT;

/** Ten seats, soft: the 11th sale is not refused, it alerts Connor to book a tech assistant. */
export const COHORT_SOFT_SEATS = 10;

/**
 * The cohort rolls into Amplified Insiders automatically (Connor, 2026-11-10), so its consent box is
 * required: a later charge always has its own box at checkout, never a hidden one.
 */
export const COHORT_RENEWAL: 'required' | 'optional' = 'required';

/** The membership every cohort buyer rolls into, and the library's monthly name. */
export const MEMBERSHIP_NAME = 'Amplified Insiders';

/**
 * How a member cancels (Connor, 2026-11-10): themselves, in Stripe's billing portal, at the end of the
 * period they paid for, with 30 days' notice, keeping every skill already released. One sentence,
 * used by every renewal box, Stripe's checkout page and the welcome page.
 */
export const CANCEL_WORDS =
  'Cancel anytime in the billing portal with 30 days\u2019 notice. It ends at the close of the period you paid for, and you keep every skill already released.';

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
    // $7,500 today and Amplified Insiders trialing until May 3, 2027: one subscription, a one-time item
    // and a monthly one, with `trial_end` pinned (the Stripe-side requirements, section A).
    mode: 'subscription',
    items: ['cohort_founding_full', 'membership_monthly'],
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
  const insiders =
    `When the 90 included days end, I continue as an ${MEMBERSHIP_NAME} member at ${dollars(amounts.membership)} a month, ` +
    `charged to this card starting ${longDay(INSIDERS_FIRST_CHARGE_AT)}, until I cancel.`;
  switch (cart.id) {
    case 'library':
      return (
        `I agree to ${dollars(amounts.membership)} a month for new skills and office hours, charged to this card ` +
        `starting ${longDate(libraryFirstMembershipCharge(now))} (day 31) until I cancel. ${CANCEL_WORDS}`
      );
    case 'cohort-two-pay':
      return (
        `I agree to a second payment of ${dollars(amounts.recurring ?? 0)} on ${longDate(addMonths(now, 1))}; ` +
        `the payments stop on their own after the second one. ${insiders} ${CANCEL_WORDS}`
      );
    case 'cohort-full':
      return `${insiders.replace(/^When/, 'I agree that when')} ${CANCEL_WORDS}`;
    case 'agents-upto15':
    case 'agents-16to40':
      return (
        `I agree to ${dollars(amounts.recurring ?? 0)} a month, charged to this card starting ` +
        `${longDay(AGENTS_FIRST_CHARGE_AT)}, until I cancel, with a ${AGENTS_MINIMUM_MONTHS}-month minimum. ` +
        `Nothing is charged today. After the third payment, cancel anytime in the billing portal with 30 days\u2019 notice.`
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

/** Which skill sets a plan opens (D-079). Cohort buyers get both. */
export const PLAN_SETS: Readonly<Record<PlanKind, readonly ('owner_ops' | 'agent')[]>> = {
  library: ['owner_ops'],
  cohort: ['owner_ops', 'agent'],
  agents: ['agent'],
};

/** The plans' names (Connor, 2026-11-10). They print on receipts and on every page that names a plan. */
export const PLAN_NAMES: Readonly<Record<PlanKind, string>> = {
  library: 'Amplified Skill Library',
  cohort: 'Amplified AI Accelerator',
  agents: 'Amplified Team Plan',
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
  portalUrl: token('portal-url'),
} as const;

/** The three plan cards on the page, in plan order. */
export const CARDS: readonly PlanKind[] = ['library', 'cohort', 'agents'];

/** The carts each card sells, in the order the form lists them. */
export const CARD_CARTS: Readonly<Record<PlanKind, readonly CartId[]>> = {
  library: ['library'],
  cohort: ['cohort-full', 'cohort-two-pay'],
  agents: ['agents-upto15', 'agents-16to40'],
};

/** An amount by lookup key, in cents: all the page's price words need. */
export type Amounts = Partial<Record<LookupKey, number>>;

/** "January 26" for the agent plan's first charge. */
const firstCharge = (): string => longDate(AGENTS_FIRST_CHARGE_AT).replace(/, \d{4}$/, '');

/**
 * The words the page prints for each card and each cart, from the live amounts. Empty strings when an
 * amount is missing, so the page can show its "price on the payment page" line instead (D-074: the
 * code holds no amounts of its own).
 */
export function priceWords(a: Amounts): {
  headline: Record<PlanKind, string>;
  /** What the headline amount is per, beside it: "a month" for the agent plan, nothing for one-time prices. */
  unit: Record<PlanKind, string>;
  terms: Record<PlanKind, string>;
  cartline: Record<CartId, string>;
} {
  const $ = (key: LookupKey): string | null => (a[key] === undefined ? null : dollars(a[key]!));
  const lu = $('library_upfront'), mm = $('membership_monthly'), cf = $('cohort_founding_full'), c2 = $('cohort_founding_two_pay');
  const a15 = $('agents_upto15_founding'), a40 = $('agents_16to40_founding');
  const all = (...xs: (string | null)[]) => xs.every((x) => x !== null);
  return {
    headline: {
      library: all(lu, mm) ? lu! : '',
      cohort: all(cf, c2) ? cf! : '',
      agents: all(a15, a40) ? a15! : '',
    },
    unit: { library: '', cohort: '', agents: all(a15, a40) ? 'a month' : '' },
    terms: {
      library: all(lu, mm) ? `today, then ${mm} a month from day 31` : '',
      cohort: all(cf, c2, mm) ? `or 2 monthly payments of ${c2}. Then ${mm} a month as ${MEMBERSHIP_NAME} from ${longDate(INSIDERS_FIRST_CHARGE_AT).replace(/, \d{4}$/, '')}.` : '',
      agents: all(a15, a40) ? `for up to 15 agents, or ${a40} a month for 16 to 40. First charge ${firstCharge()}.` : '',
    },
    cartline: {
      library: all(lu, mm) ? `${lu} today, then ${mm} a month` : '',
      'cohort-full': all(cf, mm) ? `${cf} today, then ${mm} a month from ${longDate(INSIDERS_FIRST_CHARGE_AT).replace(/, \d{4}$/, '')}` : '',
      'cohort-two-pay': all(c2, mm) ? `2 monthly payments of ${c2}, then ${mm} a month from ${longDate(INSIDERS_FIRST_CHARGE_AT).replace(/, \d{4}$/, '')}` : '',
      'agents-upto15': a15 ? `${a15} a month from ${firstCharge()}` : '',
      'agents-16to40': a40 ? `${a40} a month from ${firstCharge()}` : '',
    },
  };
}

/** What each cart is called in the form's plan list. */
export const CART_NAMES: Readonly<Record<CartId, string>> = {
  library: 'Amplified Skill Library',
  'cohort-full': 'Amplified AI Accelerator, paid in full',
  'cohort-two-pay': 'Amplified AI Accelerator, two payments',
  'agents-upto15': 'Amplified Team Plan, up to 15 agents',
  'agents-16to40': 'Amplified Team Plan, 16 to 40 agents',
};


export const PRICE_TOKENS = {
  headline: (card: PlanKind) => token(`headline:${card}`),
  unit: (card: PlanKind) => token(`unit:${card}`),
  terms: (card: PlanKind) => token(`terms:${card}`),
  cartline: (cart: CartId) => token(`cartline:${cart}`),
  paidLine: token('paid-line'),
} as const;
