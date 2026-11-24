// H-16: the read-only two-pay check compares each order's payments_made with Stripe and writes nothing.

import { beforeEach, describe, expect, it } from 'vitest';
import { orders } from '../src/db/schema';
import { compareTwoPay, formatTwoPay } from '../src/billing/two-pay-check';
import type { BillingStripe, SubscriptionInfo } from '../src/billing/stripe';
import { resetDatabase, testDatabase } from './helpers';

const DAY = 86_400_000;
const NOW = Date.parse('2026-12-20T12:00:00-07:00');

const order = (id: string, over: Partial<typeof orders.$inferInsert> = {}): typeof orders.$inferInsert => ({
  id,
  plan: 'cohort',
  option: 'two_pay',
  origin: 'payment_link',
  status: 'paid',
  email: `${id}@example.com`,
  stripeSessionId: `cs_test_${id}`,
  stripeSubscriptionId: `sub_${id}`,
  createdAt: NOW - DAY,
  ...over,
});

function fakeStripe(paid: Record<string, string[]>, subs: Record<string, Partial<SubscriptionInfo>>) {
  const calls: string[] = [];
  const stripe: Pick<BillingStripe, 'paidInvoiceIds' | 'retrieveSubscription'> = {
    async paidInvoiceIds(id) {
      calls.push(`invoices:${id}`);
      if (id === 'sub_broken') throw new Error('No such subscription');
      return paid[id] ?? [];
    },
    async retrieveSubscription(id) {
      calls.push(`subscription:${id}`);
      return { id, status: 'active', customer: 'cus_1', trialEnd: null, defaultPaymentMethod: null, metadata: {}, cancelAt: null, cancelAtPeriodEnd: false, currentPeriodEnd: NOW + 20 * DAY, ...subs[id] };
    },
  };
  return { stripe, calls };
}

describe('two-pay:check (H-16)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('flags a count that differs, a paid-in-full subscription not set to end, an overpaid one and a Stripe error, and writes nothing', async () => {
    const db = await testDatabase();
    await db.insert(orders).values([
      order('agrees', { paymentsMade: 1 }),
      order('done', { paymentsMade: 2 }),
      order('behind', { paymentsMade: 1 }),
      order('open_end', { paymentsMade: 2 }),
      order('overpaid', { paymentsMade: 3 }),
      order('broken', { paymentsMade: 1, stripeSubscriptionId: 'sub_broken' }),
      // Not two-pay, or no subscription yet: not this check's.
      order('full', { option: 'full', paymentsMade: 1 }),
      order('pending', { status: 'pending', stripeSubscriptionId: null }),
    ]);
    const before = await db.select().from(orders).orderBy(orders.id);
    const { stripe } = fakeStripe(
      { sub_agrees: ['in_1'], sub_done: ['in_1', 'in_2'], sub_behind: ['in_1', 'in_2'], sub_open_end: ['in_1', 'in_2'], sub_overpaid: ['in_1', 'in_2', 'in_3'] },
      { sub_done: { cancelAtPeriodEnd: true }, sub_behind: { cancelAtPeriodEnd: true }, sub_overpaid: { status: 'canceled' } },
    );

    const rows = await compareTwoPay(db, stripe);
    expect(rows.map((r) => [r.order, r.paymentsMade, r.stripePaid, r.verdicts])).toEqual([
      ['agrees', 1, 1, ['ok']],
      ['behind', 1, 2, ['count-differs']],
      ['broken', 1, null, ['stripe-error']],
      ['done', 2, 2, ['ok']],
      ['open_end', 2, 2, ['not-set-to-end']],
      ['overpaid', 3, 3, ['overpaid']],
    ]);
    // Read-only: every order row is exactly as it was.
    expect(await db.select().from(orders).orderBy(orders.id)).toEqual(before);

    const text = formatTwoPay(rows);
    expect(text.split('\n')[0]).toBe('order\tsubscription\torder_status\tpayments_made\tstripe_paid\tstripe_status\tcancel_at_period_end\tcancel_at\tverdict');
    expect(text).toContain('behind\tsub_behind\tpaid\t1\t2\tactive\ttrue\t\tcount-differs');
    expect(text.split('\n').at(-1)).toBe('6 two-pay orders checked, 4 need a look. Nothing was written.');
    // No buyer's email is printed.
    expect(text).not.toContain('@example.com');
  });

  it('counts a subscription already set to end at its period end as ending', async () => {
    const db = await testDatabase();
    await db.insert(orders).values([order('dated', { paymentsMade: 2 })]);
    const { stripe } = fakeStripe({ sub_dated: ['in_1', 'in_2'] }, { sub_dated: { cancelAt: NOW + 20 * DAY, currentPeriodEnd: NOW + 20 * DAY } });
    expect((await compareTwoPay(db, stripe)).map((r) => r.verdicts)).toEqual([['ok']]);
  });
});
