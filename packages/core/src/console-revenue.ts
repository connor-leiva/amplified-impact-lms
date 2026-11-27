// R-5 Phase 8 (D-269): Revenue › Summary, the mockup's `Revenue` (`handoff/admin-mockup/ia-screens.jsx`), as pure rules.
//
// WHAT IT READS. Only what Billing already reads (ADMIN-RESTRUCTURE-SPEC.md, Phase 8): Stripe's subscriptions, invoices
// and refunds through the Console's read client (no new scope), and the database's orders, plans, cohorts and skill
// purchases. The API gathers those facts (`apps/api/src/console/revenue.ts`) and hands them to `buildRevenueSummary`; the
// web's view-model prints the mockup's words from the answer. Nothing here writes, to Stripe or anywhere.
//
// WHO IS IN IT. Test accounts (D-202) and access groups' members (D-148, D-268's `groupTeamOfOne`) are in none of it: the
// API names their Stripe customers and their skill purchases, and every Stripe figure leaves them out. A comp has no
// payment (D-267: not revenue), and the seat figures are `countedCohortSeat`'s, which leave comps and tests out.
//
// THE FIGURES (the spec's table). Cash collected: paid invoices and one-time payments in the period, less refunds.
// Still to collect: the remaining payments on two-payment seats not ended, every cohort's (`acceleratorFigures`'
// `scheduledCents`). Total revenue: the two added; renewals are not in it. MRR: `subscriptionMrr` over the live
// subscriptions, as today. Failed payments: today's Failed list, open invoices Stripe has tried.
//
// NEVER A ZERO FOR "UNKNOWN". When Stripe can't be read, every figure that needs it is null and the screen says
// "Unavailable"; the figures read from the database are still answered.

import { CARTS } from './offer';
import type { PlanKind } from './offer';
import { CONSOLE_PLAN_LABELS } from './console-support';
import { BILLING_LINES, MRR_STATUSES, billingLineOf, monthlyCents, subscriptionLine, subscriptionMrr } from './console-billing';
import type { BillingLine, BillingSubscription, BillingWorkspaceRef } from './console-billing';
import { ADMIN_TZ } from './console-view';
import { zonedInputs, zonedInstant } from './course-actions';

const DAY = 86_400_000;
/** The two-payment seat's payments, from its cart (as `acceleratorFigures` reads them). */
const INSTALLMENTS = CARTS['cohort-two-pay'].installments ?? 2;
/** Coming in: the next 60 days (the spec). */
export const COMING_IN_DAYS = 60;
/** The Refunds card: the last 30 days (the mockup's, and the summary's `refunds30d`). */
export const REFUND_DAYS = 30;

export const REVENUE_PERIODS = ['all', 'month'] as const;
export type RevenuePeriod = (typeof REVENUE_PERIODS)[number];
export const isRevenuePeriod = (v: unknown): v is RevenuePeriod => v === 'all' || v === 'month';

// ================================================================================================
// The facts the API gathers
// ================================================================================================

/** An invoice as Revenue reads it (the read client's `ReadInvoice` is one). Times epoch ms, amounts cents. */
export interface RevenueInvoice {
  id: string;
  customerId: string | null;
  customerName: string | null;
  subscriptionId: string | null;
  status: string;
  amountPaidCents: number;
  amountRemainingCents: number;
  attemptCount: number;
  created: number;
  /** When Stripe marked it paid (`status_transitions.paid_at`); null for an invoice not paid. */
  paidAt?: number | null;
  nextPaymentAttempt: number | null;
  /** Stripe's `billing_reason`: `subscription_create` is the checkout's own invoice. */
  billingReason?: string | null;
}

export interface RevenueRefund {
  id: string;
  amountCents: number;
  status: string | null;
  created: number;
  /** The invoice whose payment it refunded, when Stripe has one (a subscription's charge). */
  invoiceId: string | null;
  paymentIntentId: string | null;
}

/** An order, as the line rule reads it: `orders` (and a plan's subscription when the order names none). */
export interface RevenueOrder {
  plan: string;
  option: string;
  /** The cohort the order's plan is in (`plans.cohort_id`, else the order's `cohort_id`, else the default). */
  cohortId: string;
  subscriptionId: string | null;
}

/** A seat `countedCohortSeat` counts: a cohort plan not ended, not a test account's, not a comp. */
export interface RevenueSeat {
  cohortId: string;
  option: string;
  paymentsMade: number;
  /** One payment's amount, as Stripe charged it at checkout (`orders.amount_total`). */
  amountTotal: number | null;
  /** The order's subscription: a two-payment seat's second payment is its next charge. */
  subscriptionId: string | null;
}

/** A cohort seat refunded (`orders.status = 'refunded'`, not a test account's, not a comp): its cohort and what it paid. */
export interface RevenueRefundedSeat {
  cohortId: string;
  amountCents: number;
}

/** A skill bought on its own (`skill_purchases`), the buyer not left out. */
export interface RevenueSkill {
  amountCents: number | null;
  purchasedAt: number;
  refundedAt: number | null;
  paymentIntentId: string | null;
}

export interface RevenueCustomer {
  workspace: BillingWorkspaceRef | null;
  /** The people on that team (a Team Plan row's "39 people"). */
  people: number;
}

export interface RevenueStripeFacts {
  /** Every subscription, any status (an old invoice's line is its subscription's). */
  subscriptions: readonly BillingSubscription[];
  /** Every paid invoice. */
  paid: readonly RevenueInvoice[];
  /** Every open invoice. */
  open: readonly RevenueInvoice[];
  /** Every refund. */
  refunds: readonly RevenueRefund[];
}

/** Why Stripe could not be read: no key, a Read permission missing (named), or Stripe failing. */
export type RevenueStripeError = { reason: 'not_connected' } | { reason: 'permission'; scope: string } | { reason: 'unavailable' };

export interface RevenueFacts {
  now: number;
  period: RevenuePeriod;
  stripe: RevenueStripeFacts | RevenueStripeError;
  /** By subscription id. */
  orders: ReadonlyMap<string, RevenueOrder>;
  /** By Stripe customer id: the customer's team and its people. */
  customers: ReadonlyMap<string, RevenueCustomer>;
  /** Stripe customers left out: a test account's, an access group's team of one. */
  excludedCustomers: ReadonlySet<string>;
  /** Payment intents of skill purchases left out (a test account's, an access group member's). */
  excludedSkillPayments: ReadonlySet<string>;
  skills: readonly RevenueSkill[];
  seats: readonly RevenueSeat[];
  refundedSeats: readonly RevenueRefundedSeat[];
  /** Every cohort with its capacity (`sellingOf`): a card and a row each. */
  cohorts: readonly { id: string; capacity: number }[];
}

// ================================================================================================
// The answer: GET /api/console/billing/revenue
// ================================================================================================

export interface RevenueCohortFigures {
  cohortId: string;
  /** D-154's counter for this cohort, at its capacity. */
  sold: number;
  cap: number;
  paidInFull: number;
  paidInFullCents: number;
  twoPay: number;
  /** What the seats on two payments have paid so far. */
  twoPayInCents: number;
  /** The payments still to come on them (`scheduledCents`). */
  scheduledCents: number;
  /** How many of those payments are still to come. */
  scheduledPayments: number;
  refunds: number;
  refundedCents: number;
  /** Stripe's: paid in the period, less refunds. Null when Stripe can't be read. */
  collectedCents: number | null;
}

export interface RevenueLineFigures {
  line: Exclude<BillingLine, 'cohort'>;
  kind: PlanKind;
  /** Live subscriptions on the line (active, past due). Null when Stripe can't be read. */
  active: number | null;
  /** The people on those teams (a Team Plan line's), else null. */
  people: number | null;
  collectedCents: number | null;
  mrrCents: number | null;
}

export interface RevenueMonth {
  /** "2026-12", in the admin's zone. */
  month: string;
  collectedCents: number;
  /** What Stripe has dated in it, after now: renewals, first payments after a trial, second payments. */
  calendarCents: number;
  /** Of that, the second payments. */
  secondPayments: number;
  secondCents: number;
}

export type ComingKind = 'renewal' | 'first' | 'second' | 'retry';

export interface RevenueComing {
  at: number;
  kind: ComingKind;
  line: BillingLine | null;
  /** A retry's attempt (its next is the second, the third…); a second payment's number (2 of 2). */
  n: number;
  amountCents: number;
  customerId: string | null;
  workspace: BillingWorkspaceRef | null;
  /** The team's name, else Stripe's name for the customer, else null. */
  name: string | null;
}

export interface RevenueSummary {
  asOf: number;
  period: RevenuePeriod;
  /** The period's first instant: the month's first day in the admin's zone; for all time, the first payment (or null). */
  periodStart: number | null;
  /** Null when Stripe was read; else why not. */
  stripeError: RevenueStripeError | null;
  cash: { collectedCents: number } | null;
  stillToCollect: { cents: number; payments: number; nextAt: number | null };
  mrr: { cents: number; subscriptions: number } | null;
  failed: number | null;
  /** Six months: the three before this one, this one, the two after. */
  months: RevenueMonth[] | null;
  cohorts: RevenueCohortFigures[];
  lines: RevenueLineFigures[];
  skills: { bought: number; collectedCents: number | null };
  coming: RevenueComing[] | null;
  refunds30d: { cents: number; count: number; latest: { name: string | null; at: number } | null } | null;
}

// ================================================================================================
// The rules
// ================================================================================================

const isStripe = (s: RevenueFacts['stripe']): s is RevenueStripeFacts => 'subscriptions' in s;

/** The line an order sells: its plan, and for the Team Plan its tier. */
export function orderLine(o: Pick<RevenueOrder, 'plan' | 'option'>): BillingLine | null {
  if (o.plan === 'agents') return o.option === '16to40' ? 'agents41' : o.option === 'upto15' ? 'agents16' : null;
  return o.plan === 'agent_plan' || o.plan === 'membership' || o.plan === 'insiders_agent' || o.plan === 'cohort' ? o.plan : null;
}

/**
 * A paid invoice's line, and the cohort when it is the Accelerator's. The checkout's own invoice (`subscription_create`)
 * is its order's: a full-pay seat's first invoice carries the one-time price, which is no subscription item. Every later
 * invoice is its subscription's, by its prices' lookup keys (`subscriptionLine`): the seat's Insiders renewals are
 * Insiders', a two-payment seat's second payment the Accelerator's. Null for an invoice no line names.
 */
export function invoiceLine(
  inv: Pick<RevenueInvoice, 'subscriptionId' | 'billingReason'>,
  sub: BillingSubscription | undefined,
  order: RevenueOrder | undefined,
): { line: BillingLine | null; cohortId: string | null } {
  const byOrder = order ? orderLine(order) : null;
  const line = inv.billingReason === 'subscription_create' && byOrder ? byOrder : ((sub ? subscriptionLine(sub) : null) ?? byOrder);
  return { line, cohortId: line === 'cohort' ? (order?.cohortId ?? null) : null };
}

/** A smoke test's subscription (`ai_plan=test`), recorded and ignored, as the webhook ignores it. */
const smoke = (s: BillingSubscription | undefined): boolean => s?.metadata.ai_plan === 'test';

/** "2026-12": an instant's month in the admin's zone. */
export const monthOf = (t: number): string => zonedInputs(t, ADMIN_TZ).date.slice(0, 7);

/** A month `k` months after `month` ("2026-12", 1: "2027-01"). */
export function addMonths(month: string, k: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const i = y * 12 + (m - 1) + k;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/** A month's first instant in the admin's zone. */
export const monthStart = (month: string): number => zonedInstant(`${month}-01`, '00:00', ADMIN_TZ);

/** The six months the chart draws: the three before `now`'s, `now`'s, the two after. */
export const chartMonths = (now: number): string[] => [-3, -2, -1, 0, 1, 2].map((k) => addMonths(monthOf(now), k));

/** A subscription's next charge that Stripe has dated: a trial's end, else its period's end; null when it ends. */
export function nextCharge(s: BillingSubscription): { at: number; first: boolean } | null {
  if (s.cancelAtPeriodEnd) return null;
  if (s.status === 'trialing' && s.trialEnd) return { at: s.trialEnd, first: true };
  if ((MRR_STATUSES.includes(s.status) || s.status === 'trialing') && s.currentPeriodEnd) return { at: s.currentPeriodEnd, first: false };
  return null;
}

/** What a subscription's next charge is for: its recurring prices, each times its quantity (no tax, no discount). */
export const chargeCents = (s: BillingSubscription): number =>
  s.items.reduce((a, i) => (i.interval !== null && i.unitAmount !== null ? a + i.unitAmount * Math.max(1, i.quantity) : a), 0);

/** A cohort's seats, as the card and the By product row read them (`acceleratorFigures`, with each part's amount). */
export function cohortFigures(
  cohortId: string,
  cap: number,
  seats: readonly RevenueSeat[],
  refunded: readonly RevenueRefundedSeat[],
): Omit<RevenueCohortFigures, 'collectedCents'> {
  const out = { cohortId, sold: 0, cap, paidInFull: 0, paidInFullCents: 0, twoPay: 0, twoPayInCents: 0, scheduledCents: 0, scheduledPayments: 0, refunds: 0, refundedCents: 0 };
  for (const s of seats) {
    if (s.cohortId !== cohortId) continue;
    out.sold += 1;
    const each = s.amountTotal ?? 0;
    if (s.option !== 'two_pay') {
      out.paidInFull += 1;
      out.paidInFullCents += each;
      continue;
    }
    const made = Math.min(Math.max(0, s.paymentsMade), INSTALLMENTS);
    if (made >= INSTALLMENTS) {
      out.paidInFull += 1;
      out.paidInFullCents += made * each;
    } else {
      out.twoPay += 1;
      out.twoPayInCents += made * each;
      out.scheduledCents += (INSTALLMENTS - made) * each;
      out.scheduledPayments += INSTALLMENTS - made;
    }
  }
  for (const r of refunded) {
    if (r.cohortId !== cohortId) continue;
    out.refunds += 1;
    out.refundedCents += r.amountCents;
  }
  return out;
}

/** Each live subscription's MRR, the line's figures, and how many count. */
function mrrOf(live: readonly BillingSubscription[]) {
  const byLine = new Map<BillingLine, { n: number; cents: number; customers: Set<string> }>();
  let cents = 0;
  let subscriptions = 0;
  for (const s of live) {
    const m = subscriptionMrr(s);
    cents += m;
    if (m > 0) subscriptions += 1;
    for (const line of BILLING_LINES) {
      const mine = s.items.filter((i) => billingLineOf(i.lookupKey, s.metadata) === line);
      if (!mine.length) continue;
      const e = byLine.get(line) ?? { n: 0, cents: 0, customers: new Set<string>() };
      e.n += 1;
      e.cents += line === 'cohort' ? 0 : mine.reduce((a, i) => a + monthlyCents(i), 0);
      if (s.customerId) e.customers.add(s.customerId);
      byLine.set(line, e);
    }
  }
  return { cents: Math.round(cents), subscriptions, byLine };
}

const LINE_KIND: Record<Exclude<BillingLine, 'cohort'>, PlanKind> = {
  agents16: 'agents',
  agents41: 'agents',
  agent_plan: 'agent_plan',
  membership: 'membership',
  insiders_agent: 'insiders_agent',
};

/** The summary from the facts. Pure: the money is tested without Stripe. */
export function buildRevenueSummary(f: RevenueFacts): RevenueSummary {
  const { now } = f;
  const thisMonth = monthOf(now);
  const monthFrom = monthStart(thisMonth);
  const inPeriod = (t: number) => t <= now && (f.period === 'all' || t >= monthFrom);
  const cohortIds = [...new Set([...f.cohorts.map((c) => c.id), ...f.seats.map((s) => s.cohortId), ...f.refundedSeats.map((s) => s.cohortId)])];
  const capOf = new Map(f.cohorts.map((c) => [c.id, c.capacity]));
  const base = cohortIds.map((id) => cohortFigures(id, capOf.get(id) ?? 0, f.seats, f.refundedSeats));

  // Still to collect, from the database; its next date is Stripe's (below).
  const still = { cents: base.reduce((a, c) => a + c.scheduledCents, 0), payments: base.reduce((a, c) => a + c.scheduledPayments, 0), nextAt: null as number | null };

  // Skills: the database's one-time payments, the buyer not left out.
  const skills = f.skills.filter((s) => !(s.paymentIntentId && f.excludedSkillPayments.has(s.paymentIntentId)));
  const skillsIn = skills.filter((s) => inPeriod(s.purchasedAt));
  const skillsBought = skillsIn.filter((s) => s.refundedAt === null).length;

  if (!isStripe(f.stripe)) {
    return {
      asOf: now,
      period: f.period,
      periodStart: f.period === 'month' ? monthFrom : null,
      stripeError: f.stripe,
      cash: null,
      stillToCollect: still,
      mrr: null,
      failed: null,
      months: null,
      cohorts: base.map((c) => ({ ...c, collectedCents: null })),
      lines: BILLING_LINES.filter((l): l is Exclude<BillingLine, 'cohort'> => l !== 'cohort').map((line) => ({
        line,
        kind: LINE_KIND[line],
        active: null,
        people: null,
        collectedCents: null,
        mrrCents: null,
      })),
      skills: { bought: skillsBought, collectedCents: null },
      coming: null,
      refunds30d: null,
    };
  }

  const st = f.stripe;
  const subs = new Map(st.subscriptions.map((s) => [s.id, s]));
  const kept = (customerId: string | null) => !(customerId && f.excludedCustomers.has(customerId));
  const customer = (id: string | null) => (id ? f.customers.get(id) : undefined);

  // --- what was collected ---------------------------------------------------------------------------
  const byCohort = new Map<string, number>();
  const byLine = new Map<BillingLine, number>();
  const months = new Map<string, number>();
  let collected = 0;
  let skillCents = 0;
  let first: number | null = null;
  const add = (t: number, cents: number, line: BillingLine | null, cohortId: string | null, skill = false) => {
    const m = monthOf(t);
    months.set(m, (months.get(m) ?? 0) + cents);
    if (!inPeriod(t)) return;
    collected += cents;
    if (skill) skillCents += cents;
    else if (line === 'cohort' && cohortId) byCohort.set(cohortId, (byCohort.get(cohortId) ?? 0) + cents);
    else if (line && line !== 'cohort') byLine.set(line, (byLine.get(line) ?? 0) + cents);
  };
  const paidById = new Map<string, { line: BillingLine | null; cohortId: string | null; customerId: string | null; name: string | null }>();
  for (const inv of st.paid) {
    const sub = inv.subscriptionId ? subs.get(inv.subscriptionId) : undefined;
    if (smoke(sub) || !kept(inv.customerId)) continue;
    const at = inv.paidAt ?? inv.created;
    const { line, cohortId } = invoiceLine(inv, sub, inv.subscriptionId ? f.orders.get(inv.subscriptionId) : undefined);
    paidById.set(inv.id, { line, cohortId, customerId: inv.customerId, name: customer(inv.customerId)?.workspace?.name ?? inv.customerName });
    if (inv.amountPaidCents <= 0) continue;
    first = first === null ? at : Math.min(first, at);
    add(at, inv.amountPaidCents, line, cohortId);
  }
  const skillByPi = new Set(skills.map((s) => s.paymentIntentId).filter((x): x is string => !!x));
  for (const s of skills) {
    if (!s.amountCents) continue;
    first = first === null ? s.purchasedAt : Math.min(first, s.purchasedAt);
    add(s.purchasedAt, s.amountCents, null, null, true);
  }
  // Refunds, by the payment they refunded: an invoice's line, or a skill. One left out stays out.
  const refunds = st.refunds.filter((r) => r.status !== 'failed' && r.status !== 'canceled');
  const refundRows: { r: RevenueRefund; name: string | null }[] = [];
  const allPaid = new Set(st.paid.map((i) => i.id));
  for (const r of refunds) {
    if (r.paymentIntentId && f.excludedSkillPayments.has(r.paymentIntentId)) continue;
    const paid = r.invoiceId ? paidById.get(r.invoiceId) : undefined;
    // The refund of an invoice left out (a test account's, the smoke test's) is left out with it.
    if (r.invoiceId && !paid && allPaid.has(r.invoiceId)) continue;
    const skill = !paid && !!r.paymentIntentId && skillByPi.has(r.paymentIntentId);
    add(r.created, -r.amountCents, paid?.line ?? null, paid?.cohortId ?? null, skill);
    refundRows.push({ r, name: paid?.name ?? null });
  }

  // --- what Stripe has on the calendar ---------------------------------------------------------------
  const keptSubs = st.subscriptions.filter((s) => !smoke(s) && kept(s.customerId));
  const live = keptSubs.filter((s) => MRR_STATUSES.includes(s.status));
  const mrr = mrrOf(live);
  const comingAll: RevenueComing[] = [];
  const who = (customerId: string | null, fallback: string | null = null) => {
    const c = customer(customerId);
    return { customerId, workspace: c?.workspace ?? null, name: c?.workspace?.name ?? fallback };
  };
  // A two-payment seat's second payment: its subscription's next charge, at the seat's own amount.
  const seatSubs = new Set<string>();
  for (const s of f.seats) {
    if (s.option !== 'two_pay' || !s.subscriptionId) continue;
    seatSubs.add(s.subscriptionId);
    const made = Math.min(Math.max(0, s.paymentsMade), INSTALLMENTS);
    const sub = subs.get(s.subscriptionId);
    if (made >= INSTALLMENTS || !sub) continue;
    const next = nextCharge(sub);
    if (!next || next.at <= now) continue;
    comingAll.push({ at: next.at, kind: 'second', line: 'cohort', n: made + 1, amountCents: s.amountTotal ?? chargeCents(sub), ...who(sub.customerId) });
  }
  for (const s of keptSubs) {
    if (seatSubs.has(s.id) || subscriptionLine(s) === 'cohort') continue;
    const next = nextCharge(s);
    const cents = chargeCents(s);
    if (!next || next.at <= now || cents <= 0) continue;
    comingAll.push({ at: next.at, kind: next.first ? 'first' : 'renewal', line: subscriptionLine(s), n: 0, amountCents: cents, ...who(s.customerId) });
  }
  const calendar = [...comingAll];
  // Retries: an open invoice Stripe has tried, at its next attempt. Coming in lists them; the chart does not count them.
  for (const inv of st.open) {
    if (inv.attemptCount < 1 || inv.nextPaymentAttempt === null || inv.nextPaymentAttempt <= now) continue;
    const sub = inv.subscriptionId ? subs.get(inv.subscriptionId) : undefined;
    if (smoke(sub) || !kept(inv.customerId)) continue;
    const { line } = invoiceLine(inv, sub, inv.subscriptionId ? f.orders.get(inv.subscriptionId) : undefined);
    comingAll.push({ at: inv.nextPaymentAttempt, kind: 'retry', line, n: inv.attemptCount + 1, amountCents: inv.amountRemainingCents, ...who(inv.customerId, inv.customerName) });
  }
  const until = now + COMING_IN_DAYS * DAY;
  const coming = comingAll
    .filter((c) => c.at <= until)
    .sort((a, b) => a.at - b.at || (a.name ?? '').localeCompare(b.name ?? '') || a.amountCents - b.amountCents);
  const seconds = calendar.filter((c) => c.kind === 'second').map((c) => c.at);
  still.nextAt = seconds.length ? Math.min(...seconds) : null;

  const chart = chartMonths(now).map((month): RevenueMonth => {
    const dated = month >= thisMonth ? calendar.filter((c) => monthOf(c.at) === month) : [];
    const second = dated.filter((c) => c.kind === 'second');
    return {
      month,
      collectedCents: month <= thisMonth ? Math.max(0, months.get(month) ?? 0) : 0,
      calendarCents: dated.reduce((a, c) => a + c.amountCents, 0),
      secondPayments: second.length,
      secondCents: second.reduce((a, c) => a + c.amountCents, 0),
    };
  });

  const cutoff = now - REFUND_DAYS * DAY;
  const recent = refundRows.filter(({ r }) => r.created >= cutoff && r.created <= now).sort((a, b) => b.r.created - a.r.created);

  return {
    asOf: now,
    period: f.period,
    periodStart: f.period === 'month' ? monthFrom : first,
    stripeError: null,
    cash: { collectedCents: collected },
    stillToCollect: still,
    mrr: { cents: mrr.cents, subscriptions: mrr.subscriptions },
    failed: st.open.filter((i) => i.attemptCount > 0).length,
    months: chart,
    cohorts: base.map((c) => ({ ...c, collectedCents: byCohort.get(c.cohortId) ?? 0 })),
    lines: BILLING_LINES.filter((l): l is Exclude<BillingLine, 'cohort'> => l !== 'cohort').map((line) => {
      const e = mrr.byLine.get(line);
      const people = LINE_KIND[line] === 'agents' ? [...(e?.customers ?? [])].reduce((a, c) => a + (customer(c)?.people ?? 0), 0) : null;
      return {
        line,
        kind: LINE_KIND[line],
        active: e?.n ?? 0,
        people,
        collectedCents: byLine.get(line) ?? 0,
        mrrCents: Math.round(e?.cents ?? 0),
      };
    }),
    skills: { bought: skillsBought, collectedCents: skillCents },
    coming,
    refunds30d: {
      cents: recent.reduce((a, { r }) => a + r.amountCents, 0),
      count: recent.length,
      latest: recent[0] ? { name: recent[0].name, at: recent[0].r.created } : null,
    },
  };
}

/** The label Coming in gives a line: the Console's, the Accelerator's short ("Accelerator", the mockup's). */
export const comingLineLabel = (line: BillingLine | null): string | null =>
  line === null ? null : line === 'cohort' ? 'Accelerator' : CONSOLE_PLAN_LABELS[line === 'agents16' || line === 'agents41' ? 'agents' : line];

/** A chart month's name: "Dec" (`short`) or "December" (`long`). */
export function revenueMonthLabel(month: string, style: 'short' | 'long'): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Intl.DateTimeFormat('en-US', { month: style, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)));
}

/** "Aug 2026": the month of an instant, in the admin's zone (Cash collected's "Since Aug 2026"). */
export const adminMonthYear = (t: number): string =>
  new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: ADMIN_TZ }).format(new Date(t));
