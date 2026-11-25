// D-163 (spec § 7.6): /admin/billing's view-model. The fixture's figures print the mockup's words
// exactly; production's print its own, with no "· sample" and nothing the API can't back.
import { describe, expect, it } from 'vitest';
import type { BillingSummary } from '@ai/core';
import { BILLING_SAMPLE_LABELS, fixtureBillingExecute, fixtureBillingPreview, fixtureBillingRows, fixtureBillingSummary } from '../../data/console-fixture-billing';
import { ConsoleError } from '../../data/console';
import {
  BILLING_COPY,
  BILLING_TABS,
  actionDialogVM,
  actionErrorOf,
  actionTarget,
  canConfirm,
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
      ['Failed payments', '3', 'Needs review', 'bad', '/admin/revenue/payments/failed'],
      ['Refunds, 30d', '$0', null, null, '/admin/revenue/payments/refunds'],
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
    expect(vm.stats[2]).toEqual({ key: 'failed', label: 'Failed payments', value: '0', to: '/admin/revenue/payments/failed' });
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
    // D-253: Revenue › Payments' words (the mockup's third pass).
    expect(BILLING_COPY.description).toBe('The lists behind the money, from Stripe. Prices and Payment Links are made in Stripe and are not edited here.');
    expect(BILLING_COPY.readOnly).toBe('Read-only for your role');
    // D-253: the Summary is Revenue's; the lists are Revenue › Payments, Customers its own address.
    expect(BILLING_TABS.map(billingTabPath)).toEqual([
      '/admin/revenue',
      '/admin/revenue/payments',
      '/admin/revenue/payments/subscriptions',
      '/admin/revenue/payments/invoices',
      '/admin/revenue/payments/failed',
      '/admin/revenue/payments/refunds',
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
      href: '/admin/people/teams/ws_northshore',
      stripe: 'https://dashboard.stripe.com/test/customers/cus_Rk3NshoreA1',
    });
    expect(customerVM(rows.customers[3]!).mrr).toBe('One-time');
    expect(subscriptionVM(rows.subscriptions[0]!)).toMatchObject({
      id: 'sub_1Qn7NshoreT41',
      workspace: 'Northshore Group',
      status: { label: 'Active' },
    });
    expect(rows.subscriptions.map((r) => r.id)).not.toContain('—');
    // D-164: the gated seat-tier control is drawn on a Team Plan's invoices only.
    expect(rows.invoices.map(invoiceVM).filter((r) => r.teamPlan).map((r) => r.customer)).toEqual([
      'Northshore Group',
      'Hale & Marlowe Realty',
      'Fourth Meridian',
    ]);
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
    // D-166: "Open email log" opens the Email Log for the customer's workspace.
    expect(failedVM(rows.failed[0]!).emailLog).toBe('/admin/email?teamId=ws_tidewater&workspace=Tidewater+Property+Co.');
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

describe('the refund and void dialogs (D-164)', () => {
  const NOW_ = Date.parse('2026-12-10T16:30:00Z');
  it('words the dialog as the mockup’s Confirm, from the row, then from the preview', () => {
    const rows = fixtureBillingRows();
    const paid = invoiceVM(rows.invoices[0]!);
    const t = actionTarget('refund', paid);
    expect(actionDialogVM(t, null)).toEqual({
      title: 'Refund $1,495.00 to Northshore Group?',
      body: 'Invoice in_1QxT4mNs0291, Visa ending 4242. The refund is sent to Stripe and cannot be reversed from the admin.',
      cta: 'Refund $1,495.00',
      typedLabel: 'Type $1,495.00 to confirm',
      consequences: null,
    });
    const p = fixtureBillingPreview(rows, 'refund', t.invoiceId, NOW_);
    const vm = actionDialogVM(t, p);
    expect(vm.title).toBe('Refund $1,495.00 to Northshore Group?');
    expect(vm.consequences).toEqual([
      'Stripe refunds the whole $1,495.00 payment.',
      'Order ord_northshore is marked refunded, and its CRM record in GoHighLevel is resynced.',
      'The Team Plan · 41 seats plan ends and its access ends now.',
      'Subscription sub_1Qn7NshoreT41 is cancelled in Stripe (unless already cancelled), so nothing more is charged.',
    ]);
    const v = actionTarget('void', invoiceVM(rows.invoices[4]!));
    expect(actionDialogVM(v, null)).toMatchObject({
      title: 'Void invoice in_1QxN1hHm0279?',
      body: '$695.00 for Hale & Marlowe Realty. The customer will no longer be asked to pay it.',
      cta: 'Void invoice',
      typedLabel: 'Type in_1QxN1hHm0279 to confirm',
    });
    expect(BILLING_COPY.action.toast).toEqual({ refund: 'Refund sent to Stripe', void: 'Invoice voided' });
  });

  it('sends only with the preview in, a 10-character reason and the exact amount or id typed', () => {
    const rows = fixtureBillingRows();
    const p = fixtureBillingPreview(rows, 'refund', 'in_1QxT4mNs0291', NOW_);
    expect(canConfirm('refund', 'Customer asked.', '1495', null)).toBe(false);
    expect(canConfirm('refund', 'too short', '1495', p)).toBe(false);
    expect(canConfirm('refund', 'Customer asked for it.', '1,495.01', p)).toBe(false);
    expect(canConfirm('refund', 'Customer asked for it.', '$1,495.00', p)).toBe(true);
    const v = fixtureBillingPreview(rows, 'void', 'in_1QxN1hHm0279', NOW_);
    expect(canConfirm('void', 'Billed twice by mistake.', 'in_1QxN1hHm0279', v)).toBe(true);
    expect(canConfirm('void', 'Billed twice by mistake.', 'in_1qxn1hhm0279', v)).toBe(false);
  });

  it('a refusal shows the server’s sentence; one the confirmation can’t get past offers Start again', () => {
    const e = (status: number, code: string | null, m: string) => new ConsoleError('failed', status, code as never, m);
    expect(actionErrorOf(e(410, 'confirm_expired', 'This confirmation expired after 5 minutes. Start again to see the current figures.'))).toEqual({
      message: 'This confirmation expired after 5 minutes. Start again to see the current figures.',
      restart: true,
    });
    for (const code of ['confirm_invalid', 'confirm_used', 'invoice_not_voidable', 'refund_too_large', 'stripe_refused']) expect(actionErrorOf(e(409, code, 'x')).restart, code).toBe(true);
    // Stripe didn't answer, or a missing scope: the same confirmation may be sent again.
    expect(actionErrorOf(e(502, 'stripe_unavailable', 'Stripe didn’t answer.')).restart).toBe(false);
    expect(actionErrorOf(e(503, 'stripe_permission_missing', 'Add Write on Refunds to the key.'))).toEqual({ message: 'Add Write on Refunds to the key.', restart: false });
    expect(actionErrorOf(e(429, null, 'Rate limit exceeded')).message).toBe('Too many requests.');
  });

  it('the fixture answers as the API does: the token, the reason, the typed amount, then the rows change', () => {
    const rows = fixtureBillingRows();
    const p = fixtureBillingPreview(rows, 'refund', 'in_1QxT4mNs0291', NOW_);
    const body = { confirmToken: p.confirmToken, reason: 'Customer asked for it.', typed: '1495' };
    expect(() => fixtureBillingExecute(rows, 'void', body, NOW_, null)).toThrow(/isn’t valid/);
    expect(() => fixtureBillingExecute(rows, 'refund', body, NOW_ + 300_000, null)).toThrow(/expired/);
    expect(() => fixtureBillingExecute(rows, 'refund', { ...body, typed: '1494' }, NOW_, null)).toThrow(/doesn’t match/);
    expect(() => fixtureBillingExecute(rows, 'refund', body, NOW_, 'action_scope')).toThrow('Stripe’s restricted key can’t change Refunds. Add Write on Refunds to the key.');
    expect(fixtureBillingExecute(rows, 'refund', body, NOW_, null).refund).toMatchObject({ amountCents: 149_500 });
    expect(invoiceVM(rows.invoices[0]!)).toMatchObject({ status: { label: 'Refunded' }, refund: false });
    expect(rows.refunds[0]).toMatchObject({ invoiceId: 'in_1QxT4mNs0291', reason: 'Customer asked for it.', byStaff: { name: 'Connor Leiva' } });
    const v = fixtureBillingPreview(rows, 'void', 'in_1QxN1hHm0279', NOW_);
    fixtureBillingExecute(rows, 'void', { confirmToken: v.confirmToken, reason: 'Billed twice by mistake.', typed: 'in_1QxN1hHm0279' }, NOW_, null);
    expect(invoiceVM(rows.invoices[4]!)).toMatchObject({ status: { label: 'Void' }, void: false });
  });
});
