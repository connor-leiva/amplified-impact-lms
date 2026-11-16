// D-163 (spec § 7.6): /admin/billing's view-model. The fixture's figures print the mockup's words
// exactly; production's print its own, with no "· sample" and nothing the API can't back.
import { describe, expect, it } from 'vitest';
import type { BillingSummary } from '@ai/core';
import { BILLING_SAMPLE_LABELS, fixtureBillingRows, fixtureBillingSummary } from '../../data/console-fixture-billing';
import {
  BILLING_COPY,
  BILLING_TABS,
  billingSummaryVM,
  billingTabPath,
  customerVM,
  failedVM,
  invoiceVM,
  isBillingTab,
  refundVM,
  subscriptionVM,
} from './billing.vm';

const NOW = Date.parse('2026-12-10T16:30:00Z');

describe('the Summary (the mockup’s `Billing()`)', () => {
  it('prints the mockup’s Summary from the fixture, sample qualifiers and all', () => {
    const vm = billingSummaryVM(fixtureBillingSummary(NOW), BILLING_SAMPLE_LABELS);
    expect(vm.stats.map((s) => [s.label, s.value, s.sub ?? null, s.tone ?? null, s.to ?? null])).toEqual([
      ['MRR · sample', '$18,516', '+$695 this week', 'ok', null],
      ['Subscriptions', '77', 'Active', null, null],
      ['Failed payments', '3', 'Needs review', 'bad', '/admin/billing/failed'],
      ['Refunds, 30d', '$0', null, null, '/admin/billing/refunds'],
    ]);
    expect(vm.plansTitle).toBe('Plan economics · sample figures');
    expect(vm.plans.map((p) => [p.plan, p.price, p.active, p.mrr])).toEqual([
      ['Team Plan · 16 seats', '$695 monthly', '5 teams', '$3,475'],
      ['Team Plan · 41 seats', '$1,495 monthly', '2 teams', '$2,990'],
      ['Agent Plan', '$29 per agent, monthly', '212 agents', '$6,148'],
      ['Insiders', '$97 monthly', '61 members', '$5,917'],
      ['AI Accelerator', '$7,500 or 2 × $3,750', '11 of 15 seats', 'One-time'],
    ]);
    expect(vm.accelerator).toEqual({
      status: { label: 'Active', tone: 'ok' },
      price: '$7,500, or two payments of $3,750',
      seats: { pct: (11 / 15) * 100, bar: 'ok', text: '11 of 15' },
      cap: '15 seats. Product rule, view only.',
      collected: '$67,500',
      second: '4 × $3,750 = $15,000',
    });
    expect(vm.failedCount).toBe(3);
  });

  it('production: its own words, nothing it can’t back, never a red seat bar', () => {
    const s: BillingSummary = {
      ...fixtureBillingSummary(NOW),
      failedPayments: 0,
      accelerator: { sold: 15, cap: 15, paidInFull: 15, twoPay: 0, collectedCents: 0, scheduledCents: 0, opensAt: 0 },
    };
    const vm = billingSummaryVM(s, null);
    expect(vm.stats[0]).toEqual({ key: 'mrr', label: 'MRR', value: '$18,516' });
    expect(vm.stats[2]).toEqual({ key: 'failed', label: 'Failed payments', value: '0', to: '/admin/billing/failed' });
    expect(vm.plansTitle).toBe('Plan economics');
    expect(vm.accelerator.seats).toEqual({ pct: 100, bar: 'full', text: '15 of 15' });
    expect(vm.accelerator.second).toBe('$0');
    expect(billingSummaryVM({ ...s, accelerator: { ...s.accelerator, sold: 14 } }, null).accelerator.seats.bar).toBe(
      'hot',
    );
    expect(billingSummaryVM({ ...s, accelerator: { ...s.accelerator, sold: 0 } }, null).accelerator.status).toBeNull();
    expect(JSON.stringify(vm)).not.toContain('sample');
  });

  it('has the mockup’s tabs, head and description, each tab at its own address', () => {
    expect(BILLING_TABS.map((t) => BILLING_COPY.tabs[t])).toEqual([
      'Summary',
      'Customers',
      'Subscriptions',
      'Invoices',
      'Failed payments',
      'Refunds',
    ]);
    expect(BILLING_COPY.description).toBe(
      'An operations view of Stripe. Prices, Payment Links, and the Accelerator cap are product rules and are not edited here.',
    );
    expect(BILLING_COPY.readOnly).toBe('Read-only for your role');
    expect(BILLING_TABS.map(billingTabPath)).toEqual([
      '/admin/billing',
      '/admin/billing/customers',
      '/admin/billing/subscriptions',
      '/admin/billing/invoices',
      '/admin/billing/failed',
      '/admin/billing/refunds',
    ]);
    expect([isBillingTab('invoices'), isBillingTab('nope')]).toEqual([true, false]);
  });
});

describe('the lists', () => {
  const rows = fixtureBillingRows();
  it('customers and subscriptions open their workspace, and go to Stripe', () => {
    expect(customerVM(rows.customers[0]!)).toMatchObject({
      name: 'Northshore Group',
      id: 'cus_Rk3NshoreA1',
      plan: 'Team Plan · 41 seats',
      mrr: '$1,495',
      status: { label: 'Active', tone: 'ok' },
      href: '/admin/workspaces/ws_northshore',
      stripe: 'https://dashboard.stripe.com/test/customers/cus_Rk3NshoreA1',
    });
    expect(customerVM(rows.customers[3]!).mrr).toBe('One-time');
    expect(subscriptionVM(rows.subscriptions[0]!)).toMatchObject({
      id: 'sub_1Qn7NshoreT41',
      workspace: 'Northshore Group',
      status: { label: 'Active' },
    });
    expect(rows.subscriptions.map((r) => r.id)).not.toContain('—');
  });
  it('invoices: the mockup’s words, MST dates, and only the actions R2-4b may take', () => {
    const v = rows.invoices.map(invoiceVM);
    expect(v.map((i) => [i.id, i.customer, i.card, i.amount, i.status.label, i.date, i.refund, i.void])).toEqual([
      ['in_1QxT4mNs0291', 'Northshore Group', 'Visa ending 4242', '$1,495.00', 'Paid', 'Dec 8, 2026', true, false],
      ['in_1QxR9aRc0288', 'Red Cliff Collective', 'Amex ending 1007', '$1,450.00', 'Paid', 'Dec 6, 2026', true, false],
      ['in_1QxQ2cCb0285', 'Copper Basin Realty', 'Visa ending 1881', '$3,750.00', 'Paid', 'Dec 5, 2026', true, false],
      [
        'in_1QxP7tTw0283',
        'Tidewater Property Co.',
        'Mastercard ending 5521',
        '$97.00',
        'Failed',
        'Dec 4, 2026',
        false,
        true,
      ],
      ['in_1QxN1hHm0279', 'Hale & Marlowe Realty', 'Visa ending 3310', '$695.00', 'Open', 'Dec 3, 2026', false, true],
      ['in_1QxK5fFm0270', 'Fourth Meridian', 'Visa ending 9034', '$695.00', 'Refunded', 'Nov 1, 2026', false, false],
    ]);
  });
  it('failed payments and refunds, in MST', () => {
    expect(rows.failed.map(failedVM).map((f) => [f.customer, f.reason, f.amount, f.attempts, f.retry])).toEqual([
      ['Tidewater Property Co.', 'card_declined: insufficient_funds', '$97.00', '2', 'Dec 11, 9:00 AM'],
      ['Hale & Marlowe Realty', 'authentication_required', '$695.00', '1', 'Dec 11, 8:00 AM'],
      ['Copper Basin Realty', 'card_declined: do_not_honor', '$3,750.00', '1', 'Dec 12, 12:00 PM'],
    ]);
    expect(refundVM(rows.refunds[0]!)).toMatchObject({
      id: 're_3QxK5fFm70',
      invoice: 'in_1QxK5fFm0270',
      reason: 'Canceled inside trial window',
      by: 'Connor Leiva',
      amount: '$695.00',
      when: 'Nov 1, 4:44 PM',
      href: null,
    });
  });
});
