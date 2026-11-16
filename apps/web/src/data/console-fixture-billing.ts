// The Console fixture's Billing (D-163): the R2 mockup's own Billing figures and records, turned into
// the API's shapes (`@ai/core` console-billing.ts), so the Billing screen's view-model prints the
// mockup's words from what the API would answer. FIXTURE ONLY: only `console-fixture.ts` imports this,
// and `console.ts` loads that behind `VITE_DATA_SOURCE` (`console-build.test.ts` proves the http build
// has none of it). Every figure is the mockup's sample; its "· sample" qualifiers come with them.

import { COURSE_OPENS_AT } from '@ai/core/accelerator';
import { stripeDashboardUrl } from '@ai/core';
import type {
  BillingCustomerRow,
  BillingFailedRow,
  BillingInvoiceRow,
  BillingPlanRow,
  BillingRefundRow,
  BillingSubscriptionRow,
  BillingSummary,
  InvoiceStatus,
} from '@ai/core';
import type { PlanKind, PlanStatus } from '@ai/core/offer';
import type { BillingRows } from './console';
import {
  BILLING_ACCELERATOR as ACC,
  BILLING_FAILED,
  BILLING_PLANS,
  BILLING_REFUNDS,
  BILLING_SAMPLE,
  INV,
  STAFF,
  SUPPORT_WS,
  mockCents,
  mockStamp,
} from './parity-r2';

const KIND: Record<string, PlanKind> = {
  'Team Plan': 'agents',
  'Agent Plan': 'agent_plan',
  'AI Accelerator': 'cohort',
  Insiders: 'membership',
};
const kindOf = (plan: string): PlanKind => KIND[plan.split(' · ')[0]!] ?? 'library';
const STATUS: Record<string, PlanStatus> = {
  Active: 'active',
  Trialing: 'trialing',
  'Past due': 'past_due',
  Canceled: 'canceled',
};
const money = (s: string): number | null => (s.startsWith('$') ? mockCents(s) : null);
const url = (kind: 'customers' | 'subscriptions' | 'invoices' | 'payments', id: string) =>
  stripeDashboardUrl('test', kind, id);
const ws = (name: string) => {
  const w = SUPPORT_WS.find((x) => x.n === name);
  return w ? { teamId: w.id, name: w.n } : null;
};

export const BILLING_SAMPLE_LABELS = {
  mrrLabel: BILLING_SAMPLE.mrrLabel,
  mrrSub: BILLING_SAMPLE.mrrSub,
  plansTitle: BILLING_SAMPLE.plansTitle,
};

export function fixtureBillingSummary(now: number): BillingSummary {
  const plans = BILLING_PLANS.map(([label, priceLabel, active, mrr]): BillingPlanRow => {
    const kind = kindOf(label);
    const seats = /· (\d+) seats/.exec(label);
    return {
      kind,
      label,
      active: Number(/^\d+/.exec(active)![0]),
      seats: seats ? Number(seats[1]) : kind === 'agent_plan' ? 1 : 2,
      mrrCents: money(mrr),
      priceLabel,
    };
  });
  const per = mockCents(ACC.scheduled) / ACC.twoPay;
  return {
    asOf: now,
    mrr: {
      cents: mockCents(BILLING_SAMPLE.mrr),
      activeSubscriptions: BILLING_SAMPLE.subscriptions,
      trialing: 0,
      pastDue: 0,
    },
    failedPayments: BILLING_SAMPLE.failed,
    refunds30d: mockCents(BILLING_SAMPLE.refunds30d),
    plans,
    accelerator: {
      sold: ACC.sold,
      cap: 15,
      paidInFull: ACC.paidInFull,
      twoPay: ACC.twoPay,
      collectedCents: mockCents(ACC.collected),
      scheduledCents: per * ACC.twoPay,
      opensAt: COURSE_OPENS_AT,
    },
  };
}

/** The mockup's `INV` statuses as Stripe's: a failed attempt is an open invoice tried twice. */
const INVOICE: Record<string, { status: InvoiceStatus; attempts: number; refunded: boolean }> = {
  Paid: { status: 'paid', attempts: 0, refunded: false },
  Failed: { status: 'open', attempts: 2, refunded: false },
  Open: { status: 'open', attempts: 0, refunded: false },
  Refunded: { status: 'paid', attempts: 0, refunded: true },
};

export function fixtureBillingRows(): { [K in keyof BillingRows]: BillingRows[K][] } {
  const customers = SUPPORT_WS.map((w): BillingCustomerRow => ({
    id: w.cus,
    name: w.n,
    workspace: { teamId: w.id, name: w.n },
    planKind: kindOf(w.plan),
    planLabel: w.plan,
    planStatus: STATUS[w.st] ?? null,
    mrrCents: money(w.mrr),
    url: url('customers', w.cus),
  }));
  const subscriptions = SUPPORT_WS.filter((w) => w.sub !== '—').map((w): BillingSubscriptionRow => ({
    id: w.sub,
    customerId: w.cus,
    workspace: { teamId: w.id, name: w.n },
    planLabel: w.plan,
    status: STATUS[w.st] ?? 'active',
    mrrCents: money(w.mrr),
    url: url('subscriptions', w.sub),
  }));
  const invoices = INV.map((i): BillingInvoiceRow => {
    const s = INVOICE[i.st]!;
    const amount = mockCents(i.amt);
    return {
      id: i.id,
      customerId: SUPPORT_WS.find((w) => w.n === i.c)?.cus ?? null,
      customerName: i.c,
      workspace: ws(i.c),
      amountCents: amount,
      status: s.status,
      attemptCount: s.attempts,
      refundedCents: s.refunded ? amount : 0,
      refundableCents: s.status === 'paid' && !s.refunded ? amount : 0,
      paymentMethod: i.card,
      created: mockStamp(i.d),
      url: url('invoices', i.id),
    };
  });
  const failed = BILLING_FAILED.map(([c, amt, reason, attempts, next], n): BillingFailedRow => ({
    invoiceId: `in_fixture_failed_${n}`,
    customerName: c,
    workspace: ws(c),
    planLabel: SUPPORT_WS.find((w) => w.n === c)?.plan ?? null,
    orderId: null,
    amountCents: mockCents(amt),
    declineReason: reason,
    attempts: Number(attempts.split(' ')[0]),
    nextRetryAt: mockStamp(next),
    url: url('invoices', `in_fixture_failed_${n}`),
  }));
  const refunds = BILLING_REFUNDS.map(([id, invoiceId, amt, reason, by, when]): BillingRefundRow => ({
    id,
    invoiceId,
    amountCents: mockCents(amt),
    reason,
    byStaff: { userId: 'u_0001', name: STAFF.find((x) => x.n === by)?.n ?? by },
    status: 'succeeded',
    created: mockStamp(when),
    url: url('payments', id),
  }));
  return { customers, subscriptions, invoices, failed, refunds };
}
