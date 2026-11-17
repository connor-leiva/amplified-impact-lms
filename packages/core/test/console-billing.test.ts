// The Admin Console's billing rules (D-163, spec § 7.6): MRR's month, the plan lines, the price labels
// from the price cache, the AI Accelerator's money, the words the mockup prints, and the Dashboard link.
import { describe, expect, it } from 'vitest';
import {
  BILLING_LINES,
  CONSOLE_ERRORS,
  STRIPE_READ_SCOPES,
  acceleratorFigures,
  acceleratorPriceSentence,
  billingActiveLabel,
  billingLineLabel,
  billingLineOf,
  billingPriceLabel,
  buildBillingSummary,
  cardLabel,
  invoiceRefundable,
  invoiceStatusOf,
  invoiceVoidable,
  monthlyCents,
  secondPaymentsLine,
  stripeDashboardUrl,
  subscriptionMrr,
  subscriptionStatusOf,
} from '../src';
import type { BillingSubscription } from '../src';

const item = (lookupKey: string | null, unitAmount: number | null, interval: 'day' | 'week' | 'month' | 'year' | null, quantity = 1, intervalCount = 1) => ({
  lookupKey,
  unitAmount,
  interval,
  intervalCount,
  quantity,
});
const sub = (status: string, items: BillingSubscription['items'], metadata: Record<string, string> = {}): BillingSubscription => ({
  id: 'sub_1',
  customerId: null,
  status,
  created: 0,
  metadata,
  items,
});

describe('MRR (spec § 7.6)', () => {
  it('normalises each price to a month: a year a twelfth, a week 52 twelfths, a day 365 twelfths', () => {
    expect(monthlyCents(item('x', 1_200, 'month'))).toBe(1_200);
    expect(monthlyCents(item('x', 12_000, 'year'))).toBe(1_000);
    expect(monthlyCents(item('x', 1_200, 'week'))).toBe(5_200);
    expect(monthlyCents(item('x', 120, 'day'))).toBe(3_650);
    expect(monthlyCents(item('x', 1_000, 'month', 3))).toBe(3_000);
    expect(monthlyCents(item('x', 3_000, 'month', 1, 3))).toBe(1_000);
    expect(monthlyCents(item('x', null, 'month'))).toBe(0);
    expect(monthlyCents(item('x', 500, null))).toBe(0);
  });

  it('counts active and past due only, never the Accelerator’s installments or the smoke test', () => {
    const items = [item('membership_monthly', 19_700, 'month'), item('cohort_founding_two_pay', 375_000, 'month')];
    expect(subscriptionMrr(sub('active', items))).toBe(19_700);
    expect(subscriptionMrr(sub('past_due', items))).toBe(19_700);
    for (const s of ['trialing', 'canceled', 'incomplete', 'unpaid', 'paused']) expect(subscriptionMrr(sub(s, items)), s).toBe(0);
    expect(subscriptionMrr(sub('active', items, { ai_plan: 'test' }))).toBe(0);
  });

  it('names a line by lookup key, else by the subscription’s metadata', () => {
    expect(billingLineOf('agents_upto15_founding')).toBe('agents16');
    expect(billingLineOf('agents_16to40_prepay3')).toBe('agents41');
    expect(billingLineOf('agent_plan_yearly')).toBe('agent_plan');
    expect(billingLineOf('membership_year_upfront')).toBe('membership');
    expect(billingLineOf('cohort_founding_full')).toBe('cohort');
    expect(billingLineOf('smoke_test', { ai_plan: 'membership' })).toBeNull();
    expect(billingLineOf(null, { ai_plan: 'agents', ai_option: '16to40' })).toBe('agents41');
    expect(billingLineOf(null, { ai_plan: 'agents', ai_option: 'upto15' })).toBe('agents16');
    expect(billingLineOf(null, { ai_plan: 'membership' })).toBe('membership');
    expect(billingLineOf(null, { ai_plan: 'test' })).toBeNull();
    expect(BILLING_LINES.map(billingLineLabel)).toEqual(['Team Plan · 16 seats', 'Team Plan · 41 seats', 'Agent Plan', 'Insiders', 'AI Accelerator']);
  });
});

describe('prices, from the price cache', () => {
  const book = {
    agents_upto15_founding: { unitAmount: 49_700 },
    agent_plan_monthly: { unitAmount: 7_900 },
    membership_monthly: { unitAmount: 19_700 },
    cohort_founding_full: { unitAmount: 750_000 },
    cohort_founding_two_pay: { unitAmount: 375_000 },
  };
  it('prints each line’s, or "Unavailable"', () => {
    expect(BILLING_LINES.map((l) => billingPriceLabel(l, book))).toEqual(['$497 monthly', 'Unavailable', '$79 per agent, monthly', '$197 monthly', '$7,500 or 2 × $3,750']);
    expect(BILLING_LINES.map((l) => billingPriceLabel(l, null))).toEqual(Array(5).fill('Unavailable'));
    expect(billingPriceLabel('cohort', { cohort_founding_full: { unitAmount: 750_000 } })).toBe('Unavailable');
  });
  it('the Accelerator card says it as a sentence', () => {
    expect(acceleratorPriceSentence('$7,500 or 2 × $3,750')).toBe('$7,500, or two payments of $3,750');
    expect(acceleratorPriceSentence('Unavailable')).toBe('Unavailable');
  });
});

describe('the AI Accelerator (D-154)', () => {
  it('counts paid in full, two payments still owing, collected and scheduled from the seats’ orders', () => {
    const a = acceleratorFigures(
      [
        { option: 'full', paymentsMade: 1, amountTotal: 750_000 },
        { option: 'two_pay', paymentsMade: 1, amountTotal: 375_000 },
        { option: 'two_pay', paymentsMade: 2, amountTotal: 375_000 },
        { option: 'two_pay', paymentsMade: 0, amountTotal: null },
      ],
      4,
      123,
    );
    expect(a).toEqual({ sold: 4, cap: 15, paidInFull: 2, twoPay: 2, collectedCents: 1_875_000, scheduledCents: 375_000, opensAt: 123 });
  });
  it('words the second payments as the mockup does, or by their total', () => {
    expect(secondPaymentsLine({ twoPay: 4, scheduledCents: 1_500_000 })).toBe('4 × $3,750 = $15,000');
    expect(secondPaymentsLine({ twoPay: 3, scheduledCents: 1_000_000 })).toBe('$10,000');
    expect(secondPaymentsLine({ twoPay: 0, scheduledCents: 0 })).toBe('$0');
  });
  it('prints each line’s Active cell', () => {
    expect(billingActiveLabel({ kind: 'agents', active: 5 })).toBe('5 teams');
    expect(billingActiveLabel({ kind: 'agents', active: 1 })).toBe('1 team');
    expect(billingActiveLabel({ kind: 'agent_plan', active: 212 })).toBe('212 agents');
    expect(billingActiveLabel({ kind: 'membership', active: 61 })).toBe('61 members');
    expect(billingActiveLabel({ kind: 'cohort', active: 11 })).toBe('11 of 15 seats');
  });
  it('builds the summary from the facts', () => {
    const s = buildBillingSummary({
      asOf: 9,
      subscriptions: [sub('active', [item('agents_upto15_founding', 49_700, 'month')]), sub('trialing', [item('agent_plan_monthly', 7_900, 'month')])],
      openInvoices: [{ attemptCount: 1 }, { attemptCount: 0 }],
      refunds: [{ amountCents: 500, status: 'succeeded' }, { amountCents: 900, status: 'canceled' }],
      prices: null,
      accelerator: acceleratorFigures([], 0, 1),
    });
    expect(s.mrr).toEqual({ cents: 49_700, activeSubscriptions: 1, trialing: 1, pastDue: 0 });
    expect([s.failedPayments, s.refunds30d]).toEqual([1, 500]);
    expect(s.plans.find((p) => p.kind === 'agent_plan')).toMatchObject({ active: 0, mrrCents: 0 });
  });
});

describe('words, links and errors', () => {
  it('invoices in the mockup’s words, and what PR 5 may do to each', () => {
    const r = (status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible', attemptCount = 0, refundedCents = 0) => ({ status, attemptCount, refundedCents, amountCents: 1_000, refundableCents: 1_000 - refundedCents });
    expect([r('paid'), r('paid', 0, 1_000), r('open'), r('open', 2), r('draft'), r('void'), r('uncollectible')].map((x) => invoiceStatusOf(x).label)).toEqual([
      'Paid',
      'Refunded',
      'Open',
      'Failed',
      'Draft',
      'Void',
      'Uncollectible',
    ]);
    expect(invoiceRefundable(r('paid'))).toBe(true);
    expect(invoiceRefundable(r('paid', 0, 1_000))).toBe(false);
    expect(invoiceRefundable(r('draft'))).toBe(false);
    expect(['draft', 'open', 'paid', 'void', 'uncollectible'].map((s) => invoiceVoidable({ status: s as 'open' }))).toEqual([false, true, false, false, true]);
    expect(subscriptionStatusOf('past_due')).toEqual({ label: 'Past due', tone: 'bad' });
    expect(subscriptionStatusOf('trialing')).toEqual({ label: 'Trialing', tone: 'info' });
  });
  it('links to the Dashboard in the key’s mode, ids only', () => {
    expect(stripeDashboardUrl('test', 'invoices', 'in_1')).toBe('https://dashboard.stripe.com/test/invoices/in_1');
    expect(stripeDashboardUrl('live', 'customers', 'cus_1')).toBe('https://dashboard.stripe.com/customers/cus_1');
    expect(stripeDashboardUrl('unknown', 'payments', 'pi_1')).toBe('https://dashboard.stripe.com/payments/pi_1');
  });
  it('cards as the mockup prints them', () => {
    expect(cardLabel('visa', '4242')).toBe('Visa ending 4242');
    expect(cardLabel('amex', '1007')).toBe('Amex ending 1007');
    expect(cardLabel('jcb', '1')).toBe('Jcb ending 1');
    expect(cardLabel('visa', null)).toBeNull();
  });
  it('the scopes and the error codes', () => {
    expect([...STRIPE_READ_SCOPES]).toEqual(['Subscriptions', 'Invoices', 'Charges', 'Refunds', 'Customers']);
    expect(CONSOLE_ERRORS.stripe_permission_missing.status).toBe(503);
    expect(CONSOLE_ERRORS.stripe_not_connected).toEqual({ status: 503, message: 'Stripe isn’t connected.' });
    expect(CONSOLE_ERRORS.stripe_unavailable.status).toBe(502);
  });
});
