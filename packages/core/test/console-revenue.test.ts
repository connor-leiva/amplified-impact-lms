// R-5 Phase 8 (D-269): Revenue › Summary's rules, without Stripe. `apps/api/test/console-revenue.test.ts` runs the route
// against the fake Stripe; this pins each figure's definition (ADMIN-RESTRUCTURE-SPEC.md, Phase 8).
import { describe, expect, it } from 'vitest';
import { addMonths, buildRevenueSummary, chartMonths, cohortFigures, comingLineLabel, invoiceLine, monthOf, monthStart, nextCharge } from '../src/console-revenue';
import type { RevenueFacts, RevenueInvoice, RevenueOrder } from '../src/console-revenue';
import type { BillingSubscription } from '../src/console-billing';

// Thu, Dec 10, 2026, 9:30 AM MT.
const NOW = Date.UTC(2026, 11, 10, 16, 30);
const DAY = 86_400_000;
const item = (lookupKey: string, unitAmount: number, interval: 'month' | 'year' | null = 'month', quantity = 1) => ({ lookupKey, unitAmount, interval, intervalCount: 1, quantity });
const sub = (id: string, customerId: string, status: string, items: BillingSubscription['items'], over: Partial<BillingSubscription> = {}): BillingSubscription => ({
  id,
  customerId,
  status,
  created: NOW - 60 * DAY,
  metadata: {},
  items,
  currentPeriodEnd: null,
  trialEnd: null,
  cancelAtPeriodEnd: false,
  ...over,
});
const paid = (id: string, customerId: string, subscriptionId: string | null, cents: number, at: number, billingReason = 'subscription_cycle'): RevenueInvoice => ({
  id,
  customerId,
  customerName: null,
  subscriptionId,
  status: 'paid',
  amountPaidCents: cents,
  amountRemainingCents: 0,
  attemptCount: 0,
  created: at,
  paidAt: at,
  nextPaymentAttempt: null,
  billingReason,
});

const SUBS: BillingSubscription[] = [
  // A full-pay seat: the one-time price is on its first invoice only; the subscription holds Insiders, trialing to May.
  sub('sub_full', 'cus_full', 'trialing', [item('membership_monthly_team_leader', 16_900)], { trialEnd: NOW + 145 * DAY }),
  // A two-payment seat: its second payment is its next charge.
  sub('sub_two', 'cus_two', 'active', [item('cohort_founding_two_pay', 375_000)], { currentPeriodEnd: NOW + 20 * DAY }),
  // A Team Plan, renewing in 5 days; a yearly Agent Plan renewing in 70 (past Coming in's 60, on the chart's February).
  sub('sub_team', 'cus_team', 'active', [item('agents_upto15_founding', 69_500)], { currentPeriodEnd: NOW + 5 * DAY }),
  sub('sub_year', 'cus_year', 'active', [item('agent_plan_yearly', 79_000, 'year')], { currentPeriodEnd: NOW + 70 * DAY }),
  // A Team Plan ending at its period's end: no next charge.
  sub('sub_ending', 'cus_team', 'active', [item('agents_16to40_founding', 149_500)], { currentPeriodEnd: NOW + 3 * DAY, cancelAtPeriodEnd: true }),
  // A test account's Insiders, and the $1 smoke test: in nothing.
  sub('sub_test', 'cus_test', 'active', [item('membership_monthly', 9_700)], { currentPeriodEnd: NOW + 2 * DAY }),
  sub('sub_smoke', 'cus_smoke', 'active', [item('smoke_test', 100)], { metadata: { ai_plan: 'test' }, currentPeriodEnd: NOW + 2 * DAY }),
];
const ORDERS = new Map<string, RevenueOrder>([
  ['sub_full', { plan: 'cohort', option: 'full', cohortId: 'dec26', subscriptionId: 'sub_full' }],
  ['sub_two', { plan: 'cohort', option: 'two_pay', cohortId: 'dec26', subscriptionId: 'sub_two' }],
  ['sub_team', { plan: 'agents', option: 'upto15', cohortId: 'dec26', subscriptionId: 'sub_team' }],
]);

function facts(over: Partial<RevenueFacts> = {}): RevenueFacts {
  return {
    now: NOW,
    period: 'all',
    stripe: {
      subscriptions: SUBS,
      paid: [
        paid('in_full', 'cus_full', 'sub_full', 750_000, NOW - 15 * DAY, 'subscription_create'),
        paid('in_two1', 'cus_two', 'sub_two', 375_000, NOW - 9 * DAY, 'subscription_create'),
        paid('in_team1', 'cus_team', 'sub_team', 69_500, NOW - 100 * DAY, 'subscription_create'),
        paid('in_team2', 'cus_team', 'sub_team', 69_500, NOW - 5 * DAY),
        paid('in_test', 'cus_test', 'sub_test', 9_700, NOW - 2 * DAY),
        paid('in_smoke', 'cus_smoke', 'sub_smoke', 100, NOW - 2 * DAY),
      ],
      open: [
        { ...paid('in_retry', 'cus_team', 'sub_team', 0, NOW - 3 * DAY), status: 'open', amountRemainingCents: 69_500, attemptCount: 1, nextPaymentAttempt: NOW + DAY, paidAt: null },
        { ...paid('in_open', 'cus_year', null, 0, NOW - DAY), status: 'open', amountRemainingCents: 500, attemptCount: 0, paidAt: null },
      ],
      refunds: [
        { id: 're_team', amountCents: 69_500, status: 'succeeded', created: NOW - 2 * DAY, invoiceId: 'in_team2', paymentIntentId: 'pi_team2' },
        { id: 're_test', amountCents: 9_700, status: 'succeeded', created: NOW - DAY, invoiceId: 'in_test', paymentIntentId: null },
        { id: 're_failed', amountCents: 1_000, status: 'failed', created: NOW - DAY, invoiceId: 'in_full', paymentIntentId: null },
      ],
    },
    orders: ORDERS,
    customers: new Map([
      ['cus_team', { workspace: { teamId: 't_team', name: 'Hale & Marlowe Realty' }, people: 9 }],
      ['cus_two', { workspace: { teamId: 't_two', name: 'Lantern Street Partners' }, people: 2 }],
    ]),
    excludedCustomers: new Set(['cus_test']),
    excludedSkillPayments: new Set(['pi_skill_test']),
    skills: [
      { amountCents: 3_700, purchasedAt: NOW - DAY, refundedAt: null, paymentIntentId: 'pi_skill' },
      { amountCents: 3_700, purchasedAt: NOW - DAY, refundedAt: null, paymentIntentId: 'pi_skill_test' },
    ],
    seats: [
      { cohortId: 'dec26', option: 'full', paymentsMade: 1, amountTotal: 750_000, subscriptionId: 'sub_full' },
      { cohortId: 'dec26', option: 'two_pay', paymentsMade: 1, amountTotal: 375_000, subscriptionId: 'sub_two' },
    ],
    refundedSeats: [],
    cohorts: [
      { id: 'dec26', capacity: 15 },
      { id: 'jan27', capacity: 15 },
    ],
    ...over,
  };
}

describe('the months (D-269)', () => {
  it('reads a month in MT, and the chart is three before, this one, two after', () => {
    expect(monthOf(NOW)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2027-01', -2)).toBe('2026-11');
    expect(chartMonths(NOW)).toEqual(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
    // Dec 1, 00:00 MT is 07:00 UTC.
    expect(new Date(monthStart('2026-12')).toISOString()).toBe('2026-12-01T07:00:00.000Z');
  });
});

describe('an invoice’s line (D-269)', () => {
  const subs = new Map(SUBS.map((s) => [s.id, s]));
  it('the checkout’s own invoice is its order’s; a later one its subscription’s', () => {
    expect(invoiceLine({ subscriptionId: 'sub_full', billingReason: 'subscription_create' }, subs.get('sub_full'), ORDERS.get('sub_full'))).toEqual({ line: 'cohort', cohortId: 'dec26' });
    // The same seat's Insiders renewal, after its trial: Insiders'.
    expect(invoiceLine({ subscriptionId: 'sub_full', billingReason: 'subscription_cycle' }, subs.get('sub_full'), ORDERS.get('sub_full'))).toEqual({ line: 'membership', cohortId: null });
    // A two-payment seat's second payment: the Accelerator's, in its cohort.
    expect(invoiceLine({ subscriptionId: 'sub_two', billingReason: 'subscription_cycle' }, subs.get('sub_two'), ORDERS.get('sub_two'))).toEqual({ line: 'cohort', cohortId: 'dec26' });
    expect(invoiceLine({ subscriptionId: null, billingReason: 'manual' }, undefined, undefined)).toEqual({ line: null, cohortId: null });
  });

  it('a subscription’s next charge: a trial’s end, else its period’s; none when it ends', () => {
    expect(nextCharge(subs.get('sub_full')!)).toEqual({ at: NOW + 145 * DAY, first: true });
    expect(nextCharge(subs.get('sub_team')!)).toEqual({ at: NOW + 5 * DAY, first: false });
    expect(nextCharge(subs.get('sub_ending')!)).toBeNull();
    expect(comingLineLabel('cohort')).toBe('Accelerator');
    expect(comingLineLabel('agents41')).toBe('Team Plan');
    expect(comingLineLabel('membership')).toBe('Insiders');
  });
});

describe('the cohort’s figures (D-269)', () => {
  it('paid in full, on two payments, what is still to come, and refunds, from its seats', () => {
    const c = cohortFigures(
      'dec26',
      15,
      [
        { cohortId: 'dec26', option: 'full', paymentsMade: 1, amountTotal: 750_000, subscriptionId: null },
        { cohortId: 'dec26', option: 'two_pay', paymentsMade: 2, amountTotal: 375_000, subscriptionId: null },
        { cohortId: 'dec26', option: 'two_pay', paymentsMade: 1, amountTotal: 375_000, subscriptionId: null },
        { cohortId: 'jan27', option: 'full', paymentsMade: 1, amountTotal: 750_000, subscriptionId: null },
      ],
      [{ cohortId: 'dec26', amountCents: 750_000 }],
    );
    expect(c).toEqual({
      cohortId: 'dec26',
      sold: 3,
      cap: 15,
      paidInFull: 2,
      paidInFullCents: 1_500_000,
      twoPay: 1,
      twoPayInCents: 375_000,
      scheduledCents: 375_000,
      scheduledPayments: 1,
      refunds: 1,
      refundedCents: 750_000,
    });
  });
});

describe('the summary (D-269, the spec’s definitions)', () => {
  it('Cash collected: paid invoices and skills, less refunds, with test accounts and the smoke test left out', () => {
    const s = buildRevenueSummary(facts());
    // 7,500 + 3,750 + 695 + 695 + 37 − 695 (the Team Plan refund). Not the test account's, its refund, the smoke test,
    // the left-out skill, or the failed refund.
    expect(s.cash).toEqual({ collectedCents: 750_000 + 375_000 + 69_500 + 69_500 + 3_700 - 69_500 });
    expect(s.periodStart).toBe(NOW - 100 * DAY);
    expect(s.stripeError).toBeNull();
    const month = buildRevenueSummary(facts({ period: 'month' }));
    // December only: the second Team Plan invoice, the two-payment seat's first, the skill, less the refund.
    expect(month.cash).toEqual({ collectedCents: 375_000 + 69_500 + 3_700 - 69_500 });
    expect(month.periodStart).toBe(monthStart('2026-12'));
  });

  it('Still to collect is every cohort’s seats’ remaining payments, dated by Stripe; Total adds it', () => {
    const s = buildRevenueSummary(facts());
    expect(s.stillToCollect).toEqual({ cents: 375_000, payments: 1, nextAt: NOW + 20 * DAY });
  });

  it('MRR as today, without the test account; failed payments as the Failed list counts them', () => {
    const s = buildRevenueSummary(facts());
    // 695 + 790 / 12; the trialing Insiders and the ending Team Plan's 1,495 (still active this period) in MRR.
    expect(s.mrr).toEqual({ cents: Math.round(69_500 + 149_500 + 79_000 / 12), subscriptions: 3 });
    expect(s.failed).toBe(1);
  });

  it('By product: each cohort and each line, collected in the period, with its MRR and its people', () => {
    const s = buildRevenueSummary(facts());
    expect(s.cohorts.map((c) => [c.cohortId, c.sold, c.cap, c.collectedCents, c.scheduledCents])).toEqual([
      ['dec26', 2, 15, 1_125_000, 375_000],
      ['jan27', 0, 15, 0, 0],
    ]);
    expect(s.lines.map((l) => [l.line, l.active, l.people, l.collectedCents, l.mrrCents])).toEqual([
      ['agents16', 1, 9, 69_500, 69_500],
      ['agents41', 1, 9, 0, 149_500],
      ['agent_plan', 1, null, 0, 6_583],
      ['membership', 0, null, 0, 0],
      ['insiders_agent', 0, null, 0, 0],
    ]);
    expect(s.skills).toEqual({ bought: 1, collectedCents: 3_700 });
  });

  it('Coming in: the next 60 days, payment by payment; the chart counts what Stripe has dated, not retries', () => {
    const s = buildRevenueSummary(facts());
    expect(s.coming!.map((c) => [c.kind, c.at - NOW, c.amountCents, c.name, c.n])).toEqual([
      ['retry', DAY, 69_500, 'Hale & Marlowe Realty', 2],
      ['renewal', 5 * DAY, 69_500, 'Hale & Marlowe Realty', 0],
      ['second', 20 * DAY, 375_000, 'Lantern Street Partners', 2],
    ]);
    const m = Object.fromEntries(s.months!.map((x) => [x.month, [x.collectedCents, x.calendarCents, x.secondPayments]]));
    // September and November collected; December collected so far and on its calendar (the renewal and the second
    // payment); February the yearly renewal; the trial's end in May is past the chart.
    expect(m).toEqual({
      '2026-09': [69_500, 0, 0],
      '2026-10': [0, 0, 0],
      '2026-11': [750_000, 0, 0],
      '2026-12': [375_000 + 69_500 + 3_700 - 69_500, 69_500 + 375_000, 1],
      '2027-01': [0, 0, 0],
      '2027-02': [0, 79_000, 0],
    });
  });

  it('the Refunds card: the last 30 days, the newest named', () => {
    const s = buildRevenueSummary(facts());
    expect(s.refunds30d).toEqual({ cents: 69_500, count: 1, latest: { name: 'Hale & Marlowe Realty', at: NOW - 2 * DAY } });
  });

  it('Stripe unreadable: every Stripe figure is null, never a zero; the seats are still answered', () => {
    const s = buildRevenueSummary(facts({ stripe: { reason: 'permission', scope: 'Invoices' } }));
    expect(s.stripeError).toEqual({ reason: 'permission', scope: 'Invoices' });
    expect([s.cash, s.mrr, s.failed, s.months, s.coming, s.refunds30d]).toEqual([null, null, null, null, null, null]);
    expect(s.stillToCollect).toEqual({ cents: 375_000, payments: 1, nextAt: null });
    expect(s.cohorts[0]).toMatchObject({ sold: 2, collectedCents: null });
    expect(s.lines.every((l) => l.collectedCents === null && l.mrrCents === null && l.active === null)).toBe(true);
    expect(s.skills).toEqual({ bought: 1, collectedCents: null });
  });
});
