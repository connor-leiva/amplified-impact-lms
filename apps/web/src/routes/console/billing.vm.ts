// /admin/billing on R2 (D-163, spec § 7.6): the mockup's `Billing()`, word for word, as a pure model.
// The screen renders what this returns; every figure is the API's (or the fixture's, which carries the
// mockup's sample figures and their qualifiers, `BillingSample`). Production prints "MRR" and "Plan
// economics" and leaves out what the API can't back (the MRR tile's weekly change).
//
// ONE ZONE (D-160): every time is MST through `adminStamp` / `adminDate`. Money through `usdCents` /
// `usdWhole`. Statuses are a word and a tone, never colour alone.

import {
  acceleratorPriceSentence,
  adminDate,
  adminStamp,
  billingActiveLabel,
  invoiceRefundable,
  invoiceStatusOf,
  invoiceVoidable,
  planStatusOf,
  seatBar,
  seatPct,
  secondPaymentsLine,
  subscriptionStatusOf,
  usdCents,
  usdWhole,
  workspacePath,
} from '@ai/core';
import type {
  AdminStatus,
  BillingCustomerRow,
  BillingFailedRow,
  BillingInvoiceRow,
  BillingRefundRow,
  BillingSubscriptionRow,
  BillingSummary,
  BillingWorkspaceRef,
  SeatBar,
} from '@ai/core';
import type { BillingSample } from '../../data/console';

export const BILLING_TABS = ['summary', 'customers', 'subscriptions', 'invoices', 'failed', 'refunds'] as const;
export type BillingTab = (typeof BILLING_TABS)[number];
export const isBillingTab = (v: unknown): v is BillingTab =>
  typeof v === 'string' && (BILLING_TABS as readonly string[]).includes(v);
export const billingTabPath = (t: BillingTab): string => (t === 'summary' ? '/admin/billing' : `/admin/billing/${t}`);

export const NONE = '—';

export const BILLING_COPY = {
  title: 'Billing',
  description:
    'An operations view of Stripe. Prices, Payment Links, and the Accelerator cap are product rules and are not edited here.',
  readOnly: 'Read-only for your role',
  sections: 'Section',
  tabs: {
    summary: 'Summary',
    customers: 'Customers',
    subscriptions: 'Subscriptions',
    invoices: 'Invoices',
    failed: 'Failed payments',
    refunds: 'Refunds',
  },
  plans: { title: 'Plan economics', plan: 'Plan', price: 'Price', active: 'Active', mrr: 'MRR' },
  accelerator: {
    title: 'AI Accelerator',
    price: 'Price',
    sold: 'Seats sold',
    cap: 'Seat cap',
    collected: 'Collected',
    second: 'Second payments due',
  },
  columns: {
    customer: 'Customer',
    plan: 'Plan',
    mrr: 'MRR',
    status: 'Status',
    subscription: 'Subscription',
    workspace: 'Workspace',
    invoice: 'Invoice',
    method: 'Payment method',
    amount: 'Amount',
    date: 'Date',
    reason: 'Decline reason',
    attempts: 'Attempts',
    retry: 'Next retry',
    refund: 'Refund',
    refundReason: 'Reason',
    by: 'By',
    when: 'When',
  },
  empty: {
    customers: 'No Stripe customers yet',
    subscriptions: 'No subscriptions yet',
    invoices: 'No invoices yet',
    failed: 'No failed payments',
    refunds: 'No refunds yet',
  },
  menu: {
    open: 'Open customer',
    stripe: 'View in Stripe',
    refund: 'Refund…',
    void: 'Void invoice…',
    email: 'Open email log',
  },
  /** The disabled items' title: refund and void are R2-4b's (spec PR 5); the email log is its own PR. */
  later: 'Not available yet',
  more: 'Load more',
} as const;

export interface StatVM {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: 'ok' | 'bad' | null;
  to?: string;
}

export interface PlanRowVM {
  key: string;
  plan: string;
  price: string;
  active: string;
  mrr: string;
}

export interface BillingSummaryVM {
  stats: StatVM[];
  plansTitle: string;
  plans: PlanRowVM[];
  failedCount: number;
  accelerator: {
    status: AdminStatus | null;
    price: string;
    seats: { pct: number; bar: SeatBar; text: string };
    cap: string;
    collected: string;
    second: string;
  };
}

/** The Summary tab. `sample` is the fixture's (the mockup's qualifiers); production passes null. */
export function billingSummaryVM(s: BillingSummary, sample: BillingSample | null): BillingSummaryVM {
  const a = s.accelerator;
  const cohort = s.plans.find((p) => p.kind === 'cohort');
  return {
    stats: [
      {
        key: 'mrr',
        label: sample?.mrrLabel ?? 'MRR',
        value: usdWhole(s.mrr.cents),
        ...(sample ? { sub: sample.mrrSub, tone: 'ok' as const } : {}),
      },
      { key: 'subs', label: 'Subscriptions', value: s.mrr.activeSubscriptions.toLocaleString('en-US'), sub: 'Active' },
      {
        key: 'failed',
        label: 'Failed payments',
        value: s.failedPayments.toLocaleString('en-US'),
        ...(s.failedPayments > 0 ? { sub: 'Needs review', tone: 'bad' as const } : {}),
        to: billingTabPath('failed'),
      },
      { key: 'refunds', label: 'Refunds, 30d', value: usdWhole(s.refunds30d), to: billingTabPath('refunds') },
    ],
    plansTitle: sample?.plansTitle ?? BILLING_COPY.plans.title,
    plans: s.plans.map((p) => ({
      key: `${p.kind}-${p.seats}-${p.label}`,
      plan: p.label,
      price: p.priceLabel,
      active: billingActiveLabel(p, a.cap),
      mrr: p.mrrCents === null ? 'One-time' : usdWhole(p.mrrCents),
    })),
    failedCount: s.failedPayments,
    accelerator: {
      status: a.sold > 0 ? { label: 'Active', tone: 'ok' } : null,
      price: cohort ? acceleratorPriceSentence(cohort.priceLabel) : NONE,
      seats: { pct: seatPct(a.sold, a.cap), bar: seatBar(a.sold, a.cap, 'cohort'), text: `${a.sold} of ${a.cap}` },
      cap: `${a.cap} seats. Product rule, view only.`,
      collected: usdWhole(a.collectedCents),
      second: secondPaymentsLine(a),
    },
  };
}

// --- the lists ------------------------------------------------------------------------------------

interface RowBase {
  key: string;
  /** The workspace the row opens, when one matches (the mockup's `onRow`). */
  href: string | null;
  /** Its Stripe Dashboard page ("View in Stripe"). */
  stripe: string | null;
}

const hrefOf = (w: BillingWorkspaceRef | null): string | null => (w ? workspacePath(w.teamId) : null);
const mrrText = (c: number | null): string => (c === null ? 'One-time' : usdWhole(c));

export interface CustomerVM extends RowBase {
  name: string;
  id: string;
  plan: string;
  mrr: string;
  status: AdminStatus;
}
export const customerVM = (r: BillingCustomerRow): CustomerVM => ({
  key: r.id,
  href: hrefOf(r.workspace),
  stripe: r.url,
  name: r.name,
  id: r.id,
  plan: r.planLabel ?? NONE,
  mrr: mrrText(r.mrrCents),
  status: planStatusOf(r.planStatus),
});

export interface SubscriptionVM extends RowBase {
  id: string;
  workspace: string;
  plan: string;
  mrr: string;
  status: AdminStatus;
}
export const subscriptionVM = (r: BillingSubscriptionRow): SubscriptionVM => ({
  key: r.id,
  href: hrefOf(r.workspace),
  stripe: r.url,
  id: r.id,
  workspace: r.workspace?.name ?? NONE,
  plan: r.planLabel ?? NONE,
  mrr: mrrText(r.mrrCents),
  status: subscriptionStatusOf(r.status),
});

export interface InvoiceVM extends RowBase {
  id: string;
  customer: string;
  card: string;
  amount: string;
  status: AdminStatus;
  date: string;
  at: number;
  /** What R2-4b may do: drawn now, locked until then (drafts: nothing). */
  refund: boolean;
  void: boolean;
}
export const invoiceVM = (r: BillingInvoiceRow): InvoiceVM => ({
  key: r.id,
  href: hrefOf(r.workspace),
  stripe: r.url,
  id: r.id,
  customer: r.customerName ?? NONE,
  card: r.paymentMethod ?? NONE,
  amount: usdCents(r.amountCents),
  status: invoiceStatusOf(r),
  date: adminDate(r.created),
  at: r.created,
  refund: invoiceRefundable(r),
  void: invoiceVoidable(r),
});

export interface FailedVM extends RowBase {
  customer: string;
  reason: string;
  amount: string;
  attempts: string;
  retry: string;
}
export const failedVM = (r: BillingFailedRow): FailedVM => ({
  key: r.invoiceId,
  href: hrefOf(r.workspace),
  stripe: r.url,
  customer: r.customerName ?? NONE,
  reason: r.declineReason ?? NONE,
  amount: usdCents(r.amountCents),
  attempts: String(r.attempts),
  retry: r.nextRetryAt === null ? NONE : adminStamp(r.nextRetryAt),
});

export interface RefundVM extends RowBase {
  id: string;
  invoice: string;
  reason: string;
  by: string;
  amount: string;
  when: string;
  at: number;
}
export const refundVM = (r: BillingRefundRow): RefundVM => ({
  key: r.id,
  href: null,
  stripe: r.url,
  id: r.id,
  invoice: r.invoiceId ?? NONE,
  reason: r.reason ?? NONE,
  by: r.byStaff?.name ?? NONE,
  amount: usdCents(r.amountCents),
  when: adminStamp(r.created),
  at: r.created,
});
