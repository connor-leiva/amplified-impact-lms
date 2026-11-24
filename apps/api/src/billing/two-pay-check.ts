// H-16: read-only. Compares every two-pay AI Accelerator order's `payments_made` with the paid
// invoices Stripe holds for its subscription, and says whether that subscription is set to stop after
// its last installment. It writes nothing: no database row and no Stripe object changes. Fixing a
// mismatch is a person's decision (the webhook corrects `payments_made` itself on the next installment
// event; the end date and any refund are Connor's call in Stripe).
//
//   pnpm --filter @ai/api two-pay:check
//
// It needs DATABASE_URL and STRIPE_SECRET_KEY (a read-only restricted key is enough: Subscriptions and
// Invoices, Read). Do not point it at production until Connor says so. Prints order and Stripe ids,
// never a buyer's name or email. Exits 1 when any order needs a look, 0 when every order agrees.

import { and, eq, isNotNull } from 'drizzle-orm';
import { pathToFileURL } from 'node:url';
import { CARTS } from '@ai/core/offer';
import type { Database } from '../db/client';
import { orders } from '../db/schema';
import type { BillingStripe } from './stripe';

const INSTALLMENTS = CARTS['cohort-two-pay'].installments ?? 2;

export type TwoPayVerdict =
  /** The order's count matches Stripe, and the subscription stops when it should (or is not due to yet). */
  | 'ok'
  /** `payments_made` differs from Stripe's paid invoices. */
  | 'count-differs'
  /** Paid in full in Stripe, but the subscription is not set to end: the next renewal would charge again. */
  | 'not-set-to-end'
  /** Stripe holds more paid installments than the order owes: a refund to look at. */
  | 'overpaid'
  /** The subscription could not be read from Stripe. */
  | 'stripe-error';

export interface TwoPayRow {
  order: string;
  subscription: string;
  status: string;
  paymentsMade: number;
  stripePaid: number | null;
  stripeStatus: string | null;
  cancelAtPeriodEnd: boolean | null;
  cancelAt: number | null;
  verdicts: TwoPayVerdict[];
}

/** Every two-pay order with a subscription, compared with Stripe. Reads only. */
export async function compareTwoPay(db: Database, stripe: Pick<BillingStripe, 'paidInvoiceIds' | 'retrieveSubscription'>): Promise<TwoPayRow[]> {
  const rows = await db
    .select({ id: orders.id, sub: orders.stripeSubscriptionId, status: orders.status, paymentsMade: orders.paymentsMade })
    .from(orders)
    .where(and(eq(orders.plan, 'cohort'), eq(orders.option, 'two_pay'), isNotNull(orders.stripeSubscriptionId)))
    .orderBy(orders.createdAt, orders.id);
  const out: TwoPayRow[] = [];
  for (const row of rows) {
    const subscription = row.sub!;
    const base = { order: row.id, subscription, status: row.status, paymentsMade: row.paymentsMade };
    try {
      const paid = new Set(await stripe.paidInvoiceIds(subscription)).size;
      const sub = await stripe.retrieveSubscription(subscription);
      const ending =
        sub.cancelAtPeriodEnd ||
        sub.status === 'canceled' ||
        sub.status === 'incomplete_expired' ||
        (sub.cancelAt !== null && sub.currentPeriodEnd !== null && sub.cancelAt <= sub.currentPeriodEnd);
      const verdicts: TwoPayVerdict[] = [];
      if (paid !== row.paymentsMade) verdicts.push('count-differs');
      if (paid >= INSTALLMENTS && !ending) verdicts.push('not-set-to-end');
      if (paid > INSTALLMENTS) verdicts.push('overpaid');
      out.push({ ...base, stripePaid: paid, stripeStatus: sub.status, cancelAtPeriodEnd: sub.cancelAtPeriodEnd, cancelAt: sub.cancelAt, verdicts: verdicts.length ? verdicts : ['ok'] });
    } catch {
      out.push({ ...base, stripePaid: null, stripeStatus: null, cancelAtPeriodEnd: null, cancelAt: null, verdicts: ['stripe-error'] });
    }
  }
  return out;
}

/** One tab-separated line per order, with a header, for a terminal or a spreadsheet. */
export function formatTwoPay(rows: readonly TwoPayRow[]): string {
  const head = ['order', 'subscription', 'order_status', 'payments_made', 'stripe_paid', 'stripe_status', 'cancel_at_period_end', 'cancel_at', 'verdict'];
  const lines = rows.map((r) =>
    [
      r.order,
      r.subscription,
      r.status,
      String(r.paymentsMade),
      r.stripePaid === null ? '' : String(r.stripePaid),
      r.stripeStatus ?? '',
      r.cancelAtPeriodEnd === null ? '' : String(r.cancelAtPeriodEnd),
      r.cancelAt === null ? '' : new Date(r.cancelAt).toISOString(),
      r.verdicts.join(','),
    ].join('\t'),
  );
  const flagged = rows.filter((r) => !r.verdicts.includes('ok')).length;
  return [head.join('\t'), ...lines, `${rows.length} two-pay orders checked, ${flagged} need a look. Nothing was written.`].join('\n');
}

async function main(): Promise<number> {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!key) {
    console.error('STRIPE_SECRET_KEY is not set. Nothing was read.');
    return 2;
  }
  const { getDb, close } = await import('../db/client');
  const { stripeClient } = await import('./stripe');
  try {
    const rows = await compareTwoPay(getDb(), stripeClient(key));
    console.log(formatTwoPay(rows));
    return rows.every((r) => r.verdicts.includes('ok')) ? 0 : 1;
  } finally {
    await close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(await main());
}
