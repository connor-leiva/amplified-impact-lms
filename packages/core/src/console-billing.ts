// The Admin Console's billing, read-only (D-163, spec § 7.6, Console PR 4): the shapes the API answers,
// and the rules both sides share. Pure, like the rest of @ai/core: the API reads Stripe through its
// narrow read client and the database, hands the raw facts to `buildBillingSummary`, and the web prints
// what comes back. Nothing here, or anywhere in this PR, writes to Stripe.
//
// MRR (spec § 7.6). Active and past_due subscriptions only, each recurring price normalised to a month
// (a year is a twelfth; a week 52 twelfths; a day 365 twelfths), from the price's own amount times the
// quantity, so tax is never in it, and trialing subscriptions are left out (counted on their own). The
// AI Accelerator's two-payment price is an installment of a one-time sale, not recurring revenue: the
// mockup prints its MRR "One-time" and its second payments under "Second payments due", so it is left
// out of MRR rather than counted twice. Anything else recurring that no plan line names (an older
// price) still counts toward the total; the `test` smoke-test plan never does.
//
// NEVER A SAMPLE (spec § 13). Every figure comes from Stripe, the price cache or the D-154 counter, or
// reads "Unavailable". The mockup's "· sample" qualifiers live in the parity fixture only.

import { CARTS, COHORT_SEATS } from './offer';
import type { LookupKey, PlanKind, PlanStatus } from './offer';
import { CONSOLE_PLAN_LABELS } from './console-support';
import { planLine, usdWhole } from './console-view';
import type { AdminStatus } from './console-view';

// ================================================================================================
// Stripe: scopes, modes and links
// ================================================================================================

/** The restricted key's Read permissions the read client needs (spec § 7.6). */
export const STRIPE_READ_SCOPES = ['Subscriptions', 'Invoices', 'Charges', 'Refunds', 'Customers'] as const;
export type StripeReadScope = (typeof STRIPE_READ_SCOPES)[number];

/** What `keyMode` says about the key: the only thing about it that ever leaves the server. */
export type StripeMode = 'test' | 'live' | 'unknown' | 'unset';

/** `GET /api/console/billing/scopes`: which Read permissions the key has, as presence only. */
export interface BillingScopes {
  asOf: number;
  mode: StripeMode;
  /** True: granted. False: Stripe refused for want of it. Null: the probe could not tell. */
  scopes: Record<StripeReadScope, boolean | null>;
}

export type StripeObject = 'customers' | 'subscriptions' | 'invoices' | 'payments';

/** A row's Stripe Dashboard page, in the key's own mode. Ids only: no key material. */
export const stripeDashboardUrl = (mode: StripeMode, kind: StripeObject, id: string): string =>
  `https://dashboard.stripe.com/${mode === 'test' ? 'test/' : ''}${kind}/${encodeURIComponent(id)}`;

/** The sentence a missing Read permission answers with (503 `stripe_permission_missing`). */
export const stripeScopeMessage = (scope: string): string =>
  `Stripe’s restricted key can’t read ${scope}. Add Read on ${scope} to the key.`;

/**
 * The Write permissions the Console's confirmed actions need (D-164, spec § 7.6): a refund (Refunds) and
 * a void (Invoices). Subscriptions: Write is the seat tier's, which is gated and has no endpoint.
 */
export const STRIPE_WRITE_SCOPES = ['Refunds', 'Invoices'] as const;
export type StripeWriteScope = (typeof STRIPE_WRITE_SCOPES)[number];

/** The sentence a missing Write permission answers with (503 `stripe_permission_missing`). */
export const stripeWriteScopeMessage = (scope: string): string =>
  `Stripe’s restricted key can’t change ${scope}. Add Write on ${scope} to the key.`;

// ================================================================================================
// MRR
// ================================================================================================

export type PriceInterval = 'day' | 'week' | 'month' | 'year';

/** One recurring price on a subscription, as MRR reads it. Amounts are in cents. */
export interface BillingItem {
  lookupKey: string | null;
  unitAmount: number | null;
  interval: PriceInterval | null;
  intervalCount: number;
  quantity: number;
}

/** A subscription, as the summary and the lists read it. Times are epoch ms. */
export interface BillingSubscription {
  id: string;
  customerId: string | null;
  status: string;
  created: number;
  metadata: Record<string, string>;
  items: BillingItem[];
}

const PER_MONTH: Record<PriceInterval, number> = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 };

/** One item's amount a month, in cents (unrounded); 0 for a price with no amount or no interval. */
export function monthlyCents(item: BillingItem): number {
  if (item.unitAmount === null || item.interval === null) return 0;
  return (item.unitAmount * Math.max(1, item.quantity) * PER_MONTH[item.interval]) / Math.max(1, item.intervalCount);
}

/** The plan lines the summary prints, in the mockup's order. */
export const BILLING_LINES = ['agents16', 'agents41', 'agent_plan', 'membership', 'cohort'] as const;
export type BillingLine = (typeof BILLING_LINES)[number];

const LINE_KIND: Record<BillingLine, PlanKind> = {
  agents16: 'agents',
  agents41: 'agents',
  agent_plan: 'agent_plan',
  membership: 'membership',
  cohort: 'cohort',
};

/** Each line's seats, from its cart (the Team Plan's tiers are 16 and 41). */
const LINE_SEATS: Record<BillingLine, number> = {
  agents16: CARTS['agents-upto15'].seats,
  agents41: CARTS['agents-16to40'].seats,
  agent_plan: CARTS['agent-monthly'].seats,
  membership: CARTS['insiders-monthly'].seats,
  cohort: CARTS['cohort-full'].seats,
};

/** "Team Plan · 16 seats", "Agent Plan", "Insiders", "AI Accelerator". */
export const billingLineLabel = (line: BillingLine): string =>
  LINE_KIND[line] === 'agents' ? planLine('agents', LINE_SEATS[line]) : CONSOLE_PLAN_LABELS[LINE_KIND[line]];

/**
 * The plan line an item belongs to: by its price's lookup key (the offer's contract, D-074), else by the
 * subscription's `ai_plan` / `ai_option` metadata. Null for anything else, the smoke test included.
 */
export function billingLineOf(lookupKey: string | null, meta: Record<string, string> = {}): BillingLine | null {
  const key = lookupKey ?? '';
  if (key.startsWith('agents_upto15')) return 'agents16';
  if (key.startsWith('agents_16to40')) return 'agents41';
  if (key.startsWith('agent_plan_')) return 'agent_plan';
  if (key.startsWith('membership_')) return 'membership';
  if (key.startsWith('cohort_')) return 'cohort';
  if (key !== '') return null;
  if (meta.ai_plan === 'agents') return meta.ai_option === '16to40' ? 'agents41' : meta.ai_option === 'upto15' ? 'agents16' : null;
  if (meta.ai_plan === 'agent_plan' || meta.ai_plan === 'membership' || meta.ai_plan === 'cohort') return meta.ai_plan;
  return null;
}

/** The statuses MRR counts (spec § 7.6). */
export const MRR_STATUSES: readonly string[] = ['active', 'past_due'];

/** A subscription's MRR in cents (unrounded), by the rule above; 0 unless it is active or past due. */
export function subscriptionMrr(s: BillingSubscription): number {
  if (!MRR_STATUSES.includes(s.status) || s.metadata.ai_plan === 'test') return 0;
  return s.items.reduce((a, i) => (billingLineOf(i.lookupKey, s.metadata) === 'cohort' ? a : a + monthlyCents(i)), 0);
}

/** The subscription's plan line: the first of its items that names one. */
export const subscriptionLine = (s: BillingSubscription): BillingLine | null =>
  s.items.map((i) => billingLineOf(i.lookupKey, s.metadata)).find((l) => l !== null) ?? billingLineOf(null, s.metadata);

// ================================================================================================
// Prices (from the price cache, never typed in)
// ================================================================================================

export type PriceBook = Partial<Record<LookupKey, { unitAmount: number }>>;

/** The AI Accelerator's two-payment count, from its cart. */
const INSTALLMENTS = CARTS['cohort-two-pay'].installments ?? 2;

export const UNAVAILABLE = 'Unavailable';

/** A line's price as the summary prints it ("$695 monthly", "$7,500 or 2 × $3,750"), or "Unavailable". */
export function billingPriceLabel(line: BillingLine, prices: PriceBook | null): string {
  const p = (k: LookupKey): string | null => {
    const hit = prices?.[k];
    return hit ? usdWhole(hit.unitAmount) : null;
  };
  const or = (a: string | null, b: string | null, word: string): string | null => (a && b ? `${a} or ${b} ${word}` : a);
  const label =
    line === 'agents16'
      ? p('agents_upto15_founding') && `${p('agents_upto15_founding')} monthly`
      : line === 'agents41'
        ? p('agents_16to40_founding') && `${p('agents_16to40_founding')} monthly`
        : line === 'agent_plan'
          ? or(p('agent_plan_monthly') && `${p('agent_plan_monthly')} per agent, monthly`, p('agent_plan_yearly'), 'yearly')
          : line === 'membership'
            ? or(p('membership_monthly') && `${p('membership_monthly')} monthly`, p('membership_year_upfront'), 'yearly')
            : p('cohort_founding_full') && p('cohort_founding_two_pay')
              ? `${p('cohort_founding_full')} or ${INSTALLMENTS} × ${p('cohort_founding_two_pay')}`
              : null;
  return label ?? UNAVAILABLE;
}

const NUMBER_WORDS: Record<string, string> = { '2': 'two', '3': 'three', '4': 'four' };

/** The AI Accelerator card's price, from its line's label: "$7,500, or two payments of $3,750". */
export function acceleratorPriceSentence(label: string): string {
  const m = /^(\$[\d,]+) or (\d+) × (\$[\d,]+)$/.exec(label);
  return m ? `${m[1]}, or ${NUMBER_WORDS[m[2]!] ?? m[2]} payments of ${m[3]}` : label;
}

// ================================================================================================
// The summary (GET /api/console/billing/summary), spec § 7.6's shape exactly
// ================================================================================================

export interface BillingPlanRow {
  kind: PlanKind;
  label: string;
  /** Subscriptions MRR counts (active, past due); for the AI Accelerator, seats sold (D-154). */
  active: number;
  seats: number;
  /** Null for the AI Accelerator: one-time. */
  mrrCents: number | null;
  priceLabel: string;
}

export interface BillingAccelerator {
  /** D-154's counter, `cohortSeatsSold`: every cohort plan not ended. */
  sold: number;
  cap: typeof COHORT_SEATS;
  /** Seats paid in full: one payment, or both of two. */
  paidInFull: number;
  /** Seats on two payments with one still to come. */
  twoPay: number;
  collectedCents: number;
  /** The payments still to come on the two-payment seats. */
  scheduledCents: number;
  opensAt: number;
}

export interface BillingSummary {
  asOf: number;
  mrr: { cents: number; activeSubscriptions: number; trialing: number; pastDue: number };
  /** Open invoices Stripe has tried and failed to collect. */
  failedPayments: number;
  /** Refunded in the last 30 days, in cents. */
  refunds30d: number;
  plans: BillingPlanRow[];
  accelerator: BillingAccelerator;
}

/** A not-ended cohort plan with its order's payments, as the D-154 count sees it. */
export interface CohortSeat {
  option: string;
  paymentsMade: number;
  amountTotal: number | null;
}

/** The Accelerator's money, from its seats' own orders (the amounts Stripe charged). */
export function acceleratorFigures(seats: readonly CohortSeat[], sold: number, opensAt: number): BillingAccelerator {
  let paidInFull = 0;
  let twoPay = 0;
  let collected = 0;
  let scheduled = 0;
  for (const s of seats) {
    const each = s.amountTotal ?? 0;
    if (s.option !== 'two_pay') {
      paidInFull += 1;
      collected += each;
      continue;
    }
    const made = Math.min(Math.max(0, s.paymentsMade), INSTALLMENTS);
    collected += made * each;
    if (made >= INSTALLMENTS) paidInFull += 1;
    else {
      twoPay += 1;
      scheduled += (INSTALLMENTS - made) * each;
    }
  }
  return { sold, cap: COHORT_SEATS, paidInFull, twoPay, collectedCents: collected, scheduledCents: scheduled, opensAt };
}

export interface BillingFacts {
  asOf: number;
  /** Every active, past_due and trialing subscription. */
  subscriptions: readonly BillingSubscription[];
  /** Every open invoice's attempt count. */
  openInvoices: readonly { attemptCount: number }[];
  /** The last 30 days' refunds. */
  refunds: readonly { amountCents: number; status: string | null }[];
  prices: PriceBook | null;
  accelerator: BillingAccelerator;
}

/** The summary from the facts. Pure, so the MRR math is tested without Stripe. */
export function buildBillingSummary(f: BillingFacts): BillingSummary {
  // The $1 smoke test (`ai_plan=test`) is recorded and ignored, as the webhook ignores it.
  const subs = f.subscriptions.filter((s) => s.metadata.ai_plan !== 'test');
  const count = (st: string) => subs.filter((s) => s.status === st).length;
  const live = subs.filter((s) => MRR_STATUSES.includes(s.status));
  const plans = BILLING_LINES.map((line): BillingPlanRow => {
    const kind = LINE_KIND[line];
    const priceLabel = billingPriceLabel(line, f.prices);
    if (line === 'cohort')
      return { kind, label: billingLineLabel(line), active: f.accelerator.sold, seats: LINE_SEATS[line], mrrCents: null, priceLabel };
    let n = 0;
    let cents = 0;
    for (const s of live) {
      const mine = s.items.filter((i) => billingLineOf(i.lookupKey, s.metadata) === line);
      if (!mine.length) continue;
      n += 1;
      cents += mine.reduce((a, i) => a + monthlyCents(i), 0);
    }
    return { kind, label: billingLineLabel(line), active: n, seats: LINE_SEATS[line], mrrCents: Math.round(cents), priceLabel };
  });
  return {
    asOf: f.asOf,
    mrr: {
      cents: Math.round(live.reduce((a, s) => a + subscriptionMrr(s), 0)),
      activeSubscriptions: count('active'),
      trialing: count('trialing'),
      pastDue: count('past_due'),
    },
    failedPayments: f.openInvoices.filter((i) => i.attemptCount > 0).length,
    refunds30d: f.refunds.filter((r) => r.status !== 'failed' && r.status !== 'canceled').reduce((a, r) => a + r.amountCents, 0),
    plans,
    accelerator: f.accelerator,
  };
}

/** "4 × $3,750 = $15,000" when every seat owes the same; else the total; "$0" when none is due. */
export function secondPaymentsLine(a: Pick<BillingAccelerator, 'twoPay' | 'scheduledCents'>): string {
  if (a.scheduledCents <= 0) return usdWhole(0);
  if (a.twoPay > 0 && a.scheduledCents % a.twoPay === 0)
    return `${a.twoPay} × ${usdWhole(a.scheduledCents / a.twoPay)} = ${usdWhole(a.scheduledCents)}`;
  return usdWhole(a.scheduledCents);
}

/** The plan line's "Active" cell: "5 teams", "212 agents", "61 members", "11 of 15 seats". */
export function billingActiveLabel(row: Pick<BillingPlanRow, 'kind' | 'active'>, cap: number = COHORT_SEATS): string {
  const n = row.active;
  if (row.kind === 'cohort') return `${n} of ${cap} seats`;
  const word = row.kind === 'agents' ? 'team' : row.kind === 'agent_plan' ? 'agent' : 'member';
  return `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;
}

// ================================================================================================
// The lists (cursor pages, spec § 7's conventions)
// ================================================================================================

export interface BillingWorkspaceRef {
  teamId: string;
  name: string;
}

export interface BillingCustomerRow {
  id: string;
  name: string;
  workspace: BillingWorkspaceRef | null;
  planKind: PlanKind | null;
  /** "Team Plan · 41 seats", "AI Accelerator" (`planLine`), or null with no plan. */
  planLabel: string | null;
  planStatus: PlanStatus | null;
  /** Null: the plan is one-time (the AI Accelerator). */
  mrrCents: number | null;
  url: string;
}

export interface BillingSubscriptionRow {
  id: string;
  customerId: string | null;
  workspace: BillingWorkspaceRef | null;
  planLabel: string | null;
  status: string;
  mrrCents: number | null;
  url: string;
}

/** The Team Plan's two tiers, as spec § 7.6's seat-tier action names them. */
export type TeamSeatTier = 'upto15' | '16to40';

/** A local plan's Team Plan tier (its kind and option, `plans.option`), or null for every other plan. */
export const seatTierOf = (kind: string | null | undefined, option: string | null | undefined): TeamSeatTier | null =>
  kind === 'agents' && (option === 'upto15' || option === '16to40') ? option : null;

export const INVOICE_STATUSES = ['draft', 'open', 'paid', 'void', 'uncollectible'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface BillingInvoiceRow {
  id: string;
  customerId: string | null;
  customerName: string | null;
  workspace: BillingWorkspaceRef | null;
  amountCents: number;
  status: InvoiceStatus;
  attemptCount: number;
  refundedCents: number;
  /** What a refund could still return (PR 5 refunds at most this). 0 unless paid. */
  refundableCents: number;
  /** "Visa ending 4242", or null when Stripe says nothing. */
  paymentMethod: string | null;
  created: number;
  url: string;
  /**
   * The Team Plan tier of the subscription the invoice bills, from its local plan (D-164: the gated
   * seat-tier control is drawn in such an invoice's "…", the one row menu the mockup gives a plan).
   */
  seatTier: TeamSeatTier | null;
}

export interface BillingFailedRow {
  invoiceId: string;
  customerName: string | null;
  workspace: BillingWorkspaceRef | null;
  /** The local plan and order the invoice's subscription belongs to. */
  planLabel: string | null;
  orderId: string | null;
  amountCents: number;
  /** "card_declined: insufficient_funds", or null. */
  declineReason: string | null;
  attempts: number;
  nextRetryAt: number | null;
  url: string;
}

export interface BillingRefundRow {
  id: string;
  invoiceId: string | null;
  amountCents: number;
  /** Staff's reason (from the audit row) for a Console refund; else Stripe's own, in words. */
  reason: string | null;
  /** The staff member behind a Console refund (its metadata and audit row), or null. */
  byStaff: { userId: string; name: string | null } | null;
  status: string | null;
  created: number;
  url: string | null;
}

/** An invoice may be refunded (PR 5): paid, with something left to return. Drafts are view-only. */
export const invoiceRefundable = (r: Pick<BillingInvoiceRow, 'status' | 'refundableCents'>): boolean =>
  r.status === 'paid' && r.refundableCents > 0;

/** An invoice may be voided (PR 5): open or uncollectible only. */
export const invoiceVoidable = (r: Pick<BillingInvoiceRow, 'status'>): boolean => r.status === 'open' || r.status === 'uncollectible';

// ================================================================================================
// Words and tones (the mockup's `St` and `TONE`), never colour alone
// ================================================================================================

const tone = (label: string, t: AdminStatus['tone']): AdminStatus => ({ label, tone: t });

/** An invoice as the mockup words it: a failed attempt reads "Failed", a refunded payment "Refunded". */
export function invoiceStatusOf(r: Pick<BillingInvoiceRow, 'status' | 'attemptCount' | 'refundedCents' | 'amountCents'>): AdminStatus {
  if (r.status === 'paid') return r.refundedCents > 0 && r.refundedCents >= r.amountCents ? tone('Refunded', 'warn') : tone('Paid', 'ok');
  if (r.status === 'open') return r.attemptCount > 0 ? tone('Failed', 'bad') : tone('Open', 'warn');
  if (r.status === 'draft') return tone('Draft', 'off');
  if (r.status === 'void') return tone('Void', 'off');
  return tone('Uncollectible', 'bad');
}

const SUB_WORDS: Record<string, AdminStatus> = {
  active: tone('Active', 'ok'),
  trialing: tone('Trialing', 'info'),
  past_due: tone('Past due', 'bad'),
  canceled: tone('Canceled', 'off'),
  unpaid: tone('Unpaid', 'bad'),
  incomplete: tone('Incomplete', 'warn'),
  incomplete_expired: tone('Expired', 'off'),
  paused: tone('Paused', 'off'),
};

/** A Stripe subscription status in the mockup's words. */
export const subscriptionStatusOf = (status: string): AdminStatus => SUB_WORDS[status] ?? tone(status, 'neutral');

const REFUND_REASONS: Record<string, string> = {
  duplicate: 'Duplicate',
  fraudulent: 'Fraudulent',
  requested_by_customer: 'Requested by customer',
  expired_uncaptured_charge: 'Expired uncaptured charge',
};

/** Stripe's refund reason in words, or null. */
export const refundReasonOf = (reason: string | null): string | null => (reason ? (REFUND_REASONS[reason] ?? reason) : null);

/** A card as the mockup prints it: "Visa ending 4242". */
export function cardLabel(brand: string | null | undefined, last4: string | null | undefined): string | null {
  if (!last4) return null;
  const names: Record<string, string> = { amex: 'Amex', mastercard: 'Mastercard', visa: 'Visa', discover: 'Discover' };
  const b = brand ? (names[brand] ?? brand[0]!.toUpperCase() + brand.slice(1)) : 'Card';
  return `${b} ending ${last4}`;
}
