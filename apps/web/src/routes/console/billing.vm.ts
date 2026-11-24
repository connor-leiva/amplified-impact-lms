// /admin/billing on R2 (D-163, spec § 7.6): the mockup's `Billing()`, word for word, as a pure model.
// The screen renders what this returns; every figure is the API's (or the fixture's, which carries the
// mockup's sample figures and their qualifiers, `BillingSample`). Production prints "MRR" and "Plan
// economics" and leaves out what the API can't back (the MRR tile's weekly change).
//
// ONE ZONE (D-160): every time is MST through `adminStamp` / `adminDate`. Money through `usdCents` /
// `usdWhole`. Statuses are a word and a tone, never colour alone.

import {
  cleanReason,
  typedConfirms,
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
  BillingAction,
  BillingActionPreview,
  BillingCustomerRow,
  BillingFailedRow,
  BillingInvoiceRow,
  BillingRefundRow,
  BillingSubscriptionRow,
  BillingSummary,
  BillingWorkspaceRef,
  SeatBar,
} from '@ai/core';
import { ConsoleError } from '../../data/console';
import type { BillingSample } from '../../data/console';
import { emailLogHref } from './email.vm';

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
  skills: { title: 'Skill Purchases', skill: 'Skill', amount: 'Amount', date: 'Date', session: 'Session', refunded: 'Refunded', open: 'No' },
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
    // D-164: the spec's seat-tier action (D4), drawn and gated; its reason is core's `SEAT_TIER_GATED`.
    seatTier: 'Change seat tier…',
  },
  /** The mockup's title on a guarded action during a masquerade (its `Btn`'s). */
  blocked: 'Blocked while masquerading',
  /** D-164: the refund and void dialogs, the mockup's `Confirm` (`refund`, `voidI`) word for word. */
  action: {
    refundTitle: (amount: string, customer: string) => `Refund ${amount} to ${customer}?`,
    refundBody: (id: string, card: string | null) =>
      `Invoice ${id}${card ? `, ${card}` : ''}. The refund is sent to Stripe and cannot be reversed from the admin.`,
    refundCta: (amount: string) => `Refund ${amount}`,
    voidTitle: (id: string) => `Void invoice ${id}?`,
    voidBody: (amount: string, customer: string) => `${amount} for ${customer}. The customer will no longer be asked to pay it.`,
    voidCta: 'Void invoice',
    reason: 'Reason',
    placeholder: 'Required',
    cancel: 'Cancel',
    toast: { refund: 'Refund sent to Stripe', void: 'Invoice voided' } as Record<BillingAction, string>,
    // New strings (D-164), for what the spec adds to the mockup's dialog: the preview's consequences,
    // the 10-character reason, typing to confirm, and starting again after a refusal.
    what: 'What happens',
    reasonHelp: 'At least 10 characters.',
    typed: (text: string) => `Type ${text} to confirm`,
    again: 'Start again',
    someone: 'this customer',
    tooMany: 'Too many requests.',
  },
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
  skillPurchases: { key: string; skill: string; amount: string; date: string; session: string; refunded: string }[];
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
    skillPurchases: (s.skillPurchases ?? []).map((p) => ({
      key: p.id,
      skill: p.skill,
      amount: p.amount === null ? NONE : usdCents(p.amount),
      date: adminDate(p.purchasedAt),
      session: p.stripeSessionId,
      refunded: p.refundedAt === null ? BILLING_COPY.skills.open : adminDate(p.refundedAt),
    })),
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
  /** What staff may do (D-164): refund what is left of a paid invoice, void an open one (drafts: nothing). */
  refund: boolean;
  void: boolean;
  /** For the dialogs: what a refund returns, and the customer and card as Stripe names them. */
  refundAmount: string;
  customerName: string | null;
  paymentMethod: string | null;
  /** It bills a Team Plan: the gated seat-tier control is drawn in its "…" (D-164). */
  teamPlan: boolean;
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
  refundAmount: usdCents(r.refundableCents),
  customerName: r.customerName,
  paymentMethod: r.paymentMethod,
  teamPlan: r.seatTier !== null && r.seatTier !== undefined,
});

// --- the refund and void dialogs (D-164) ----------------------------------------------------------

/** The action and the invoice row it was chosen on: the dialog's words until the preview answers. */
export interface ActionTarget {
  action: BillingAction;
  invoiceId: string;
  amount: string;
  customer: string;
  card: string | null;
  confirmText: string;
}

export const actionTarget = (action: BillingAction, r: InvoiceVM): ActionTarget => ({
  action,
  invoiceId: r.id,
  amount: action === 'refund' ? r.refundAmount : r.amount,
  customer: r.customerName ?? BILLING_COPY.action.someone,
  card: r.paymentMethod,
  confirmText: action === 'refund' ? r.refundAmount : r.id,
});

export interface ActionDialogVM {
  title: string;
  body: string;
  cta: string;
  typedLabel: string;
  consequences: string[] | null;
}

/** The dialog's words: the row's until the preview answers, then Stripe's own figures. */
export function actionDialogVM(t: ActionTarget, p: BillingActionPreview | null): ActionDialogVM {
  const A = BILLING_COPY.action;
  const amount = p ? usdCents(p.summary.amountCents) : t.amount;
  const customer = p?.summary.customerName ?? t.customer;
  const confirm = p?.summary.confirmText ?? t.confirmText;
  const consequences = p ? p.consequences : null;
  if (t.action === 'refund')
    return { title: A.refundTitle(amount, customer), body: A.refundBody(t.invoiceId, p ? p.summary.paymentMethod : t.card), cta: A.refundCta(amount), typedLabel: A.typed(confirm), consequences };
  return { title: A.voidTitle(t.invoiceId), body: A.voidBody(amount, customer), cta: A.voidCta, typedLabel: A.typed(confirm), consequences };
}

/** The action may be sent: the preview is in, the reason is 10 to 500 characters, and what was typed matches. */
export const canConfirm = (action: BillingAction, reason: string, typed: string, p: BillingActionPreview | null): boolean =>
  p !== null && cleanReason(reason) !== null && typedConfirms(action, typed, { amountCents: p.summary.amountCents, invoiceId: p.summary.invoiceId });

/** Refusals after which the confirmation can't be sent again: the dialog offers "Start again" (a new preview). */
const RESTART = new Set(['confirm_invalid', 'confirm_expired', 'confirm_used', 'refund_too_large', 'invoice_not_voidable', 'invoice_not_refundable', 'stripe_refused', 'not_found']);

/** A failed preview or execute, in the dialog: the server's own sentence, and whether to start again. */
export function actionErrorOf(e: unknown): { message: string; restart: boolean } {
  if (!(e instanceof ConsoleError)) return { message: 'The request didn’t reach the server.', restart: false };
  if (e.status === 429) return { message: BILLING_COPY.action.tooMany, restart: false };
  return { message: e.message, restart: e.code !== null && RESTART.has(e.code) };
}

export interface FailedVM extends RowBase {
  /** D-166: "Open email log", for this customer's workspace (the whole log when it has none). */
  emailLog: string;
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
  emailLog: emailLogHref(r.workspace),
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
