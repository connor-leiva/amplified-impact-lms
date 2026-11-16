// The Console fixture's Billing (D-163): the R2 mockup's own Billing figures and records, turned into
// the API's shapes (`@ai/core` console-billing.ts), so the Billing screen's view-model prints the
// mockup's words from what the API would answer. FIXTURE ONLY: only `console-fixture.ts` imports this,
// and `console.ts` loads that behind `VITE_DATA_SOURCE` (`console-build.test.ts` proves the http build
// has none of it). Every figure is the mockup's sample; its "· sample" qualifiers come with them.

import { COURSE_OPENS_AT } from '@ai/core/accelerator';
import {
  CONFIRM_TTL_MS,
  CONSOLE_ERRORS,
  cleanReason,
  confirmTextOf,
  invoiceRefundable,
  invoiceVoidable,
  refundConsequences,
  refundIsFull,
  seatTierOf,
  stripeDashboardUrl,
  stripeWriteScopeMessage,
  typedConfirms,
  voidConsequences,
} from '@ai/core';
import type {
  BillingAction,
  BillingActionPreview,
  BillingActionResult,
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
import { ConsoleError } from './console';
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
    seatTier: seatTierOf(/· 41 seats/.test(w.plan) ? 'agents41' : /· 16 seats/.test(w.plan) ? 'agents16' : null),
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

// ---- D-164: the confirmed refund and void, answered in the fixture as the API would ------------------
// The mockup's own records, so the dialogs show its customers and amounts. The token is a fixture
// string (no secret exists here), checked for its action, its invoice and its 5 minutes. Two
// fixture-only states, for screenshots of the dialog's refusals: `?console-state=action_expired` (the
// execute is 410 `confirm_expired`) and `action_scope` (503, a missing Write scope).

export type FixtureBillingRows = ReturnType<typeof fixtureBillingRows>;

const refusal = (code: keyof typeof CONSOLE_ERRORS, status: number, message?: string) =>
  new ConsoleError(status === 404 ? 'not_found' : status === 503 ? 'stripe_scope' : 'failed', status, code, message ?? CONSOLE_ERRORS[code].message ?? code);

/** The workspace the mockup's invoice is for, and its plan as the webhook would find it. */
function planOfCustomer(name: string | null) {
  const w = SUPPORT_WS.find((x) => x.n === name);
  if (!w) return { w: null, plan: null };
  const seats = /· (\d+) seats/.exec(w.plan);
  return { w, plan: { kind: kindOf(w.plan), seats: seats ? Number(seats[1]) : kindOf(w.plan) === 'cohort' ? 2 : 1, status: STATUS[w.st] ?? 'active' } };
}

export function fixtureBillingPreview(rows: FixtureBillingRows, action: BillingAction, invoiceId: string, now: number): BillingActionPreview {
  const r = rows.invoices.find((i) => i.id === invoiceId);
  if (!r) throw refusal('not_found', 404);
  const { w, plan } = planOfCustomer(r.customerName);
  const sub = w && w.sub !== '—' ? w.sub : null;
  const exp = now + CONFIRM_TTL_MS;
  if (action === 'refund') {
    if (!invoiceRefundable(r)) throw refusal('invoice_not_refundable', 409);
    const facts = {
      amountCents: r.refundableCents,
      chargeAmountCents: r.amountCents,
      refundedCents: r.refundedCents,
      match: w ? { orderId: `ord_${w.id.slice(3)}`, plan, subscriptions: sub ? [sub] : [] } : null,
      seatsSold: plan?.kind === 'cohort' ? ACC.sold : null,
    };
    return {
      action,
      summary: {
        invoiceId: r.id,
        customerName: r.customerName,
        amountCents: r.refundableCents,
        paymentMethod: r.paymentMethod,
        refund: { kind: refundIsFull(facts) ? 'full' : 'partial', refundableCents: r.refundableCents },
        confirmText: confirmTextOf(action, { amountCents: r.refundableCents, invoiceId: r.id }),
      },
      consequences: refundConsequences(facts),
      confirmToken: `fixture-confirm.${action}.${r.id}.${r.refundableCents}.${exp}`,
      expiresAt: exp,
    };
  }
  if (!invoiceVoidable(r)) throw refusal('invoice_not_voidable', 409);
  return {
    action,
    summary: { invoiceId: r.id, customerName: r.customerName, amountCents: r.amountCents, paymentMethod: null, refund: null, confirmText: r.id },
    consequences: voidConsequences({ subscriptionId: sub, plan }),
    confirmToken: `fixture-confirm.${action}.${r.id}.${r.amountCents}.${exp}`,
    expiresAt: exp,
  };
}

/** The execute: the token, the reason, what was typed; then the rows change as Stripe's would. */
export function fixtureBillingExecute(
  rows: FixtureBillingRows,
  action: BillingAction,
  body: { confirmToken: string; reason: string; typed: string },
  now: number,
  state: string | null,
): BillingActionResult {
  const [tag, act, invoiceId = '', amount, exp] = body.confirmToken.split('.');
  if (tag !== 'fixture-confirm' || act !== action) throw refusal('confirm_invalid', 403);
  if (state === 'action_expired' || now >= Number(exp)) throw refusal('confirm_expired', 410);
  if (cleanReason(body.reason) === null) throw refusal('reason_required', 422);
  if (!typedConfirms(action, body.typed, { amountCents: Number(amount), invoiceId })) throw refusal('confirm_mismatch', 422);
  const scope = action === 'refund' ? 'Refunds' : 'Invoices';
  if (state === 'action_scope') throw refusal('stripe_permission_missing', 503, stripeWriteScopeMessage(scope));
  const r = rows.invoices.find((i) => i.id === invoiceId);
  if (!r) throw refusal('not_found', 404);
  const auditId = String(3000 + rows.refunds.length);
  if (action === 'void') {
    if (!invoiceVoidable(r)) throw refusal('invoice_not_voidable', 409);
    r.status = 'void';
    return { action, invoiceId, auditId, refund: null, invoice: { id: invoiceId, status: 'void' } };
  }
  const cents = Number(amount);
  if (cents > r.refundableCents) throw refusal('refund_too_large', 409);
  r.refundedCents += cents;
  r.refundableCents -= cents;
  const refund: BillingRefundRow = {
    id: `re_fixture${rows.refunds.length}`,
    invoiceId,
    amountCents: cents,
    reason: cleanReason(body.reason),
    byStaff: { userId: 'u_0001', name: STAFF[0].n },
    status: 'succeeded',
    created: now,
    url: url('payments', `re_fixture${rows.refunds.length}`),
  };
  rows.refunds.unshift(refund);
  return { action, invoiceId, auditId, refund: { id: refund.id, amountCents: cents, status: 'succeeded' }, invoice: null };
}
