// The offer, as data: the plans, the carts and the Stripe contract (DECISIONS.md D-073, D-074, D-078,
// D-104 for the Phase 1 offers: Amplified Insiders sold on its own, the Team Plan's first 3 months
// paid at checkout, the Skill Library retired; and D-106 for the Amplified Agent Plan).
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
 * `membership` is Amplified Insiders for team leaders. `insiders_agent` is Amplified Insiders for Agents
 * (every agent skill and weekly office hours, no weekly live training). `agents` is the Amplified Team
 * Plan and `agent_plan` the Amplified Agent Plan, one agent on their own (D-106): two kinds, so a solo
 * agent is never read as a team. `library` (the Amplified Skill Library) is retired (D-104): no cart
 * sells it, and it stays here only so a row written before then still reads.
 */
export const PLAN_KINDS = ['library', 'cohort', 'agents', 'membership', 'agent_plan', 'insiders_agent'] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

/**
 * How a plan is bought. `upto15` and `16to40` are the Team Plan's two tiers; `year_upfront` and
 * `monthly` are Amplified Insiders' two ways to pay; `monthly` and `yearly` the Agent Plan's (D-106).
 * `upfront` was the retired library's.
 */
export const ORDER_OPTIONS = ['full', 'two_pay', 'upfront', 'upto15', '16to40', 'year_upfront', 'monthly', 'yearly'] as const;
export type OrderOption = (typeof ORDER_OPTIONS)[number];

export const ORDER_ORIGINS = ['offer', 'payment_link', 'comp'] as const;
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
  'membership_monthly_team_leader',
  'agents_upto15_prepay3',
  'agents_16to40_prepay3',
  'agents_upto15_founding',
  'agents_16to40_founding',
  'agent_plan_monthly',
  'agent_plan_monthly_117',
  'agent_plan_yearly',
  'insiders_agent_monthly',
] as const;
export type LookupKey = (typeof LOOKUP_KEYS)[number];

/**
 * The `ai_plan` metadata values Stripe objects carry. `test` is the $1 smoke test, recorded and ignored.
 * `skill` is a one-time skill purchase, not a plan kind: it never becomes an order or a plan row.
 */
export const AI_PLANS = ['library', 'cohort', 'agents', 'membership', 'agent_plan', 'insiders_agent', 'skill', 'test'] as const;
/** The `ai_option` values. `single` is the one-time skill purchase. */
export const AI_OPTIONS = ['full', 'two_pay', 'upfront', 'year_upfront', 'monthly', 'yearly', 'upto15', '16to40', 'single', 'test'] as const;

/**
 * A single skill, bought once (Connor, 2026-11-23). Not a plan and not a cart. Checkout reads the
 * price id from `STRIPE_PRICE_SKILL_SINGLE`. The live price's lookup key is `skill_single`, on one
 * product named Amplified Skill, $37 once, with automatic tax. A refund ends access. The $37 is not
 * credited toward Amplified Insiders. The Insiders button is the cart for the skill's set: agent skills
 * open Agent Insiders, and owner, ops, or both open Team Leader Insiders. The page fills the cart's
 * Payment Link from its environment variable.
 */
export const SKILL_SINGLE_LOOKUP = 'skill_single' as const;
export const SKILL_AI_PLAN = 'skill' as const;
export const SKILL_AI_OPTION = 'single' as const;
export const SKILL_PURCHASE = {
  get: 'Get This Skill, $37',
  /** Owner, ops, or both: Team Leader Insiders. The href is the cart's Payment Link, not a URL in code. */
  teamLeader: 'Unlock Every Skill With Amplified Insiders, $169/Month',
  teamLeaderCart: 'insiders-monthly',
  /** Agent-set skills: Agent Insiders. The href is that cart's Payment Link. */
  agentInsiders: 'Unlock Every Agent Skill With Amplified Insiders, $79/Month',
  agentInsidersCart: 'insiders-agent-monthly',
  /**
   * Signed-out buyers. The stopgap Payment Link (a required skill dropdown, filled in by hand).
   * No skill is preselected. Signed-in learners use the in-app Checkout Session instead.
   */
  stopgapHref: 'https://buy.stripe.com/8x200k71d8kCbWJ5oN73G0f',
  title: 'Get This Skill',
  body: 'Buy this skill once, and keep it, including future updates. Or open every skill with Amplified Insiders.',
  close: 'Close',
  starting: 'Starting Checkout',
  failed: 'Checkout didn’t start. Try again.',
  pending: 'Your payment is in. Refresh in a moment if this skill is still locked.',
} as const;

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
 * When the owner's invite may go out, unless `INVITES_FROM` says otherwise. It was Monday, Nov 16, so
 * the login landed with the welcome email; since D-153 (Connor, 2026-11-13) logins go out at once, so
 * the default is in the past. What a buyer can open is held by the plan's `startsAt` and the course's
 * `COURSE_OPENS_AT` instead, never by this.
 */
export const DEFAULT_INVITES_FROM = '2026-11-13T00:00:00-07:00';

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
/**
 * The Amplified Agent Plan's first charge: Monday, Jan 4, 2027, 00:00 America/Chicago (unix 1799042400),
 * the week its weekly agent coaching starts (D-106). Its Payment Links sell a trial, and the webhook pins
 * every Agent Plan subscription's `trial_end` here, so nothing is charged before it. The plan's agent
 * skills open the same day (`startsAt`), once that first invoice is paid.
 */
export const AGENT_PLAN_FIRST_CHARGE_AT = Date.parse('2027-01-04T00:00:00-06:00');

/** Monthly minimums, a contract term rather than a Stripe setting: Amplified Insiders paid monthly. */
export const MINIMUM_MONTHS = 3;

/**
 * Amplified Insiders paid for a year: $1,997 today, then `membership_monthly_team_leader` ($169) after a
 * 365-day trial. The same price is what an Accelerator buyer rolls onto on May 4, 2027.
 * `membership_monthly` ($197) stays a lookup key so a subscription already on it still reads. New
 * rollovers do not use it (Connor, 2026-11-23).
 */
export const INSIDERS_YEAR_DAYS = 365;

/** The lookup key new Accelerator and Insiders-year rollovers bill (Team Leader Insiders, $169). */
export const ROLLOVER_LOOKUP = 'membership_monthly_team_leader' as const;

/**
 * Cohort one, as the platform's `dec26` cohort: 8 Wednesday builds, Dec 2, 9 and 16, Jan 6, 13, 20 and
 * 27, and Feb 3 (no builds Dec 23 or 30), then 90 days of new skills and office hours. 1 PM Central is
 * the locked build time (the course calendar in `accelerator.ts`, D-110).
 */
export const COHORT_ONE = {
  id: 'dec26',
  firstBuildAt: Date.parse('2026-12-02T13:00:00-06:00'),
  afterDays: 90,
} as const;
/** When cohort one's 90 included days end and Amplified Insiders begins: the start of May 4, 2027, Central. */
export const COHORT_ONE_LIVE_UNTIL = INSIDERS_FIRST_CHARGE_AT;

/**
 * Fifteen founding seats across both AI Accelerator links together (Connor, 2026-11-10), not 15 each.
 * At 15 the offer page hides both links and offers the waitlist, the sale that fills the last seat
 * alerts Connor, and the API turns both Stripe Payment Links off (D-154, superseding "by hand"); a
 * refund that frees a seat turns back on only the links it turned off. Each link's own Stripe limit of
 * 15 stays as a backstop.
 */
export const COHORT_SEATS = 15;

/** The membership every cohort buyer rolls into, and Amplified Insiders' name. */
export const MEMBERSHIP_NAME = 'Amplified Insiders';

/**
 * Who answers questions and cancellations: the public support address on the offer and welcome pages
 * and in the billing messages (D-106). The legal pages name their own contact, which stays with them.
 */
export const SUPPORT_EMAIL = 'support@amplifiedimpact.io';

/** The support address on the offer and thank-you pages (docs/SPRING-PLAN.md: "Support on thank-you pages"). */
export const HELP_EMAIL = 'support@amplifiedimpact.io';

// --- carts -----------------------------------------------------------------------------------------

export const CART_IDS = [
  'cohort-full',
  'cohort-two-pay',
  'insiders-year',
  'insiders-monthly',
  'insiders-agent-monthly',
  'agents-upto15',
  'agents-16to40',
  'agent-monthly',
  'agent-yearly',
] as const;
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
  /** Logins the plan gives: the owner plus an operations lead, the agents plus the owner, or one agent. */
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
    // $7,500 today and Team Leader Insiders ($169) trialing until May 4, 2027: one subscription, a
    // one-time item and a monthly one, with `trial_end` pinned by the webhook.
    mode: 'subscription',
    items: ['cohort_founding_full', 'membership_monthly_team_leader'],
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
    // $1,997 today for one year, then $169 a month until cancelled: one subscription, a one-time item
    // and `membership_monthly_team_leader` on a 365-day trial. Not an annual price that renews.
    mode: 'subscription',
    items: ['membership_year_upfront', 'membership_monthly_team_leader'],
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
    items: ['membership_monthly_team_leader'],
    founding: false,
    seats: 2,
    minimumMonths: MINIMUM_MONTHS,
    requiresFollowUpBoss: false,
    paymentLinkEnv: 'PAYMENT_LINK_INSIDERS_MONTHLY',
  },
  'insiders-agent-monthly': {
    id: 'insiders-agent-monthly',
    plan: 'insiders_agent',
    option: 'monthly',
    // $79 a month from today, 3-month minimum. Every agent skill and weekly office hours. No weekly
    // live agent training, and no pinned first charge.
    mode: 'subscription',
    items: ['insiders_agent_monthly'],
    founding: false,
    seats: 1,
    minimumMonths: MINIMUM_MONTHS,
    requiresFollowUpBoss: false,
    paymentLinkEnv: 'PAYMENT_LINK_INSIDERS_AGENT_MONTHLY',
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
  'agent-monthly': {
    id: 'agent-monthly',
    plan: 'agent_plan',
    option: 'monthly',
    // $117 a month, the first charge on Jan 4, 2027: the link sells a trial, and the webhook pins its
    // end there. One agent's login. A 3-month minimum counted from that first charge (Apr 4, 2027 for
    // a trial buyer). No founding price (D-106). Buyers already on the $79 price stay on it.
    mode: 'subscription',
    items: ['agent_plan_monthly_117'],
    founding: false,
    seats: 1,
    minimumMonths: MINIMUM_MONTHS,
    requiresFollowUpBoss: false,
    paymentLinkEnv: 'PAYMENT_LINK_AGENT_MONTHLY',
  },
  'agent-yearly': {
    id: 'agent-yearly',
    plan: 'agent_plan',
    option: 'yearly',
    // $790 a year, the first charge on Jan 4, 2027, then each year from it.
    mode: 'subscription',
    items: ['agent_plan_yearly'],
    founding: false,
    seats: 1,
    requiresFollowUpBoss: false,
    paymentLinkEnv: 'PAYMENT_LINK_AGENT_YEARLY',
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
 * The fixed calendar date a cart's subscription first charges its recurring price, whatever relative
 * trial its Payment Link set: the Agent Plan on Jan 4, 2027, the Team Plan on Apr 4, 2027, the AI
 * Accelerator in full (whose subscription carries Amplified Insiders) on May 4, 2027. Null for the
 * others: two payments roll into a separate Insiders subscription, and Insiders paid yearly keeps its
 * link's 365 days. The webhook pins only a date still ahead: Stripe refuses a `trial_end` in the past.
 */
export function pinnedFirstCharge(cart: Pick<Cart, 'id' | 'plan'>, cohortIncludedEnd: number | null = INSIDERS_FIRST_CHARGE_AT): number | null {
  if (cart.plan === 'agent_plan') return AGENT_PLAN_FIRST_CHARGE_AT;
  if (cart.plan === 'agents') return AGENTS_FIRST_CHARGE_AT;
  // R-5 Phase 5 (D-262, PLAN § 10.5): the AI Accelerator's pin is the included-time end of the cohort the seat is
  // in (its day's start in America/Chicago). December's, 2027-05-04, is `INSIDERS_FIRST_CHARGE_AT`'s instant.
  if (cart.id === 'cohort-full') return cohortIncludedEnd;
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
 * A new plan's dates (D-104, D-106):
 *   - the AI Accelerator: paid through the end of cohort one's 90 days, and started at the first live
 *     build (Dec 2, 1:00 PM Central, D-153), so its skills and its course open then and not at purchase;
 *   - Amplified Insiders by the year: paid through day 365, when its $169 a month begins;
 *   - Amplified Insiders by the month, and Agent Insiders: paid through one month, with a 3-month minimum;
 *   - the Team Plan: paid at checkout through Apr 3, 2027, its first monthly charge on Apr 4. Its agent
 *     skills open on Dec 14 (`startsAt`, which the access rule reads); its 3-month minimum is paid up
 *     front, so nothing locks cancelling;
 *   - the Agent Plan: nothing is paid at checkout before Jan 4, 2027 (`chargedToday` is false: the link
 *     sells a trial), so it is paid through nothing until `invoice.paid` for the Jan 4 charge moves
 *     `paid_through` a month or a year on. Its skills open on Jan 4 (`startsAt`). A checkout that did
 *     charge (a buyer after Jan 4, on a link with no trial) is paid through one period from today. The
 *     monthly plan's 3-month minimum is counted from the first paid charge: Jan 4, 2027 for a trial
 *     buyer, so cancelling stays locked until Apr 4, 2027. The yearly plan has no minimum. A plan
 *     already on the $79 price is not rewritten.
 */
/**
 * R-5 Phase 5 (D-262): the cohort a seat is sold in, as a cohort plan's dates read it: its id, when its course opens
 * (its first live build) and when its included time ends. `cohortSaleOf` in cohort-selling.ts reads it from the
 * cohort's record. `COHORT_SALE_ONE` is cohort one as this file held it before Phase 5.
 */
export interface PlanCohort {
  id: string;
  opensAt: number;
  liveUntil: number | null;
}
export const COHORT_SALE_ONE: PlanCohort = { id: COHORT_ONE.id, opensAt: COHORT_ONE.firstBuildAt, liveUntil: COHORT_ONE_LIVE_UNTIL };

export function initialPlanDates(
  cart: Pick<Cart, 'plan' | 'option' | 'minimumMonths'>,
  now: number,
  chargedToday = true,
  cohort: PlanCohort = COHORT_SALE_ONE,
): PlanDates {
  switch (cart.plan) {
    case 'cohort':
      // D-153: the login works at once, and the course and its skills open at the first live build. R-5 Phase 5
      // (D-262, PLAN § 10.10): of the cohort the seat is sold in, paid through its included-time end.
      return {
        startsAt: Number.isFinite(cohort.opensAt) ? Math.max(now, cohort.opensAt) : now,
        paidThrough: cohort.liveUntil,
        liveUntil: cohort.liveUntil,
        minimumUntil: null,
        cohortId: cohort.id,
      };
    case 'membership':
    case 'insiders_agent': {
      if (cart.option === 'year_upfront') {
        const year = now + INSIDERS_YEAR_DAYS * DAY;
        return { startsAt: now, paidThrough: year, liveUntil: null, minimumUntil: null, cohortId: null };
      }
      return { startsAt: now, paidThrough: addMonths(now, 1), liveUntil: null, minimumUntil: addMonths(now, cart.minimumMonths ?? MINIMUM_MONTHS), cohortId: null };
    }
    case 'agents':
      return { startsAt: Math.max(now, AGENTS_SKILLS_FROM), paidThrough: AGENTS_FIRST_CHARGE_AT, liveUntil: null, minimumUntil: null, cohortId: null };
    case 'agent_plan': {
      const period = addMonths(now, cart.option === 'yearly' ? 12 : 1);
      // The monthly minimum starts at the first paid charge. A trial buyer is not charged until Jan 4,
      // so the lock runs to Apr 4, 2027. A charge today (after Jan 4) counts from today. Yearly has none.
      const chargeAt = chargedToday ? now : Math.max(now, AGENT_PLAN_FIRST_CHARGE_AT);
      const minimumUntil = cart.option === 'monthly' && cart.minimumMonths ? addMonths(chargeAt, cart.minimumMonths) : null;
      return { startsAt: Math.max(now, AGENT_PLAN_FIRST_CHARGE_AT), paidThrough: chargedToday ? period : null, liveUntil: null, minimumUntil, cohortId: null };
    }
    case 'library':
      // Retired (D-104): no cart sells it. A row made before then keeps whatever it was given.
      return { startsAt: now, paidThrough: null, liveUntil: null, minimumUntil: null, cohortId: null };
  }
}

/**
 * Which skill sets a plan opens (D-079). Cohort buyers get both. The Team Plan, the Agent Plan and
 * Agent Insiders get the agents' set. Amplified Insiders for team leaders (`membership`) opens every
 * set (Connor, 2026-11-23): owner and ops, agent, and both.
 */
export const PLAN_SETS: Readonly<Record<PlanKind, readonly ('owner_ops' | 'agent')[]>> = {
  library: ['owner_ops'],
  cohort: ['owner_ops', 'agent'],
  agents: ['agent'],
  membership: ['owner_ops', 'agent'],
  agent_plan: ['agent'],
  insiders_agent: ['agent'],
};

/** The plans' names (Connor, 2026-11-10). They print on every page that names a plan. */
export const PLAN_NAMES: Readonly<Record<PlanKind, string>> = {
  library: 'Amplified Skill Library',
  cohort: 'Amplified AI Accelerator',
  agents: 'Amplified Team Plan',
  membership: MEMBERSHIP_NAME,
  agent_plan: 'Amplified Agent Plan',
  insiders_agent: 'Amplified Insiders for Agents',
};

/**
 * The Insiders upsell on a skill page. Agent skills open Agent Insiders. Owner, ops, and both open
 * Team Leader Insiders. The href is the cart's Payment Link (`%%link:<cart>%%` on www, the offer API
 * in the library), so Railway's variable is what a buyer follows.
 */
export function skillUpsell(sets: SkillSet): { label: string; cart: CartId } {
  if (sets === 'agent') return { label: SKILL_PURCHASE.agentInsiders, cart: SKILL_PURCHASE.agentInsidersCart };
  return { label: SKILL_PURCHASE.teamLeader, cart: SKILL_PURCHASE.teamLeaderCart };
}

/**
 * Weekly live agent training in the library, where skill buyers live (Connor, 2026-11-23).
 * The Agent Plan and the Team Plan include it, and so does anyone who already holds one of those.
 * Agent Insiders and a $37 skill do not. An access group's member is unchanged: the library shows
 * them no training row and no upsell. Team Leader Insiders and the Accelerator keep the library they
 * have today (no new row). Office hours are `liveSessionsOpen`, not this.
 */
export type TrainingAccess = 'open' | 'locked' | 'hidden';

export function weeklyAgentTraining(
  plans: readonly { kind: string }[],
  opts: { accessGroup: boolean; purchasedSkill: boolean },
): TrainingAccess {
  if (opts.accessGroup) return 'hidden';
  if (plans.some((p) => p.kind === 'agent_plan' || p.kind === 'agents')) return 'open';
  if (plans.some((p) => p.kind === 'membership' || p.kind === 'cohort' || p.kind === 'library')) return 'hidden';
  if (plans.some((p) => p.kind === 'insiders_agent') || opts.purchasedSkill) return 'locked';
  return 'hidden';
}

/**
 * D-241: a $37 skill buyer and nothing more (Connor, Nov 24, 2026): a learner who bought at least one skill, holds no
 * plan and is in no access group. They get the LMS's shell with their skills first and the rest of the LMS shown
 * locked (`/learn`). Everyone else keeps what they have: an access group's member (Utah Life) and every plan's member,
 * with or without a $37 skill beside it. Read off `GET /api/skills` (`plans`, `accessGroups`, `purchased`).
 */
export function skillOnlyBuyer(a: { plans?: readonly unknown[]; accessGroups?: readonly unknown[]; purchased?: readonly string[] }): boolean {
  return (a.plans ?? []).length === 0 && (a.accessGroups ?? []).length === 0 && (a.purchased ?? []).length > 0;
}

/** The locked training row and the panel it opens. The link is the Agent Plan monthly cart. */
export const AGENT_TRAINING = {
  title: 'Weekly Live Training',
  included: 'Weekly live training is included in your plan.',
  locked: 'Weekly live training is not in this plan.',
  upgrade: 'Upgrade to the Agent Plan, $117/Month',
  body: '3-Month Minimum. Every agent skill, plus weekly live training, plus office hours.',
  cart: 'agent-monthly',
} as const;

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
  /**
   * D-132: the "Set Your Password" button's link for this buyer's Checkout Session, on the LMS host,
   * or empty (and the button hidden): see `checkoutPasswordUser` in apps/api/src/routes/password.ts.
   */
  setPassword: token('set-password'),
} as const;

/**
 * The three plan cards on the page, in the plan's order: the AI Accelerator, Insiders, the Team Plan.
 * The Agent Plan sells through its two links but has no card on this page yet (D-106: Spring's pages
 * add it).
 */
export const CARDS: readonly PlanKind[] = ['cohort', 'membership', 'agents'];

/** The carts each card sells, its button's first. */
export const CARD_CARTS: Readonly<Partial<Record<PlanKind, readonly CartId[]>>> = {
  cohort: ['cohort-full', 'cohort-two-pay'],
  membership: ['insiders-year', 'insiders-monthly'],
  agents: ['agents-upto15', 'agents-16to40'],
};

// The prices are words in apps/web/src/offer/content.ts since Spring's page (D-105): every price shows,
// even when Stripe cannot be asked. `GET /api/offer` still reports Stripe's live amounts.
