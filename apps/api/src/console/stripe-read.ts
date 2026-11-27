// The Admin Console's Stripe read client (D-163, spec § 7.6, Console PR 4): narrow, read-only, cached.
//
// A NEW CLIENT, NOT `billing/stripe.ts`. The offer's client writes (Payment Links, subscriptions, the
// portal) and is unchanged; this one is built from the same key (`readOfferConfig().stripeSecretKey`)
// and can only read. Its six methods are spec § 7.6's list. Nothing here creates, updates, refunds or
// voids anything: the Console's three confirmed actions are PR 5's.
//
// SCOPES. The live key is a restricted key. Each method names the Read permission it needs; a Stripe
// permission refusal becomes `StripeScopeError(scope)`, which the routes answer with 503
// `stripe_permission_missing` naming that scope. Stripe's own message is NEVER carried: it quotes a
// redacted copy of the key (`rk_live_…abcd`), so a test feeds a sentinel key through and checks that no
// answer holds any of it. Any other failure is `StripeReadError(reason)`, its code or type only.
//
// CACHE (`cachedConsoleStripe`), in `billing/prices.ts`'s style: each distinct read is kept for 10
// minutes and made once however many screens ask at the same moment. Unlike the price cache it never
// serves an old answer after a failure: a Console screen shows the failure, with Retry.
//
// API VERSION. The SDK pins `2025-10-29.clover`: an invoice carries its payments (`payments`, expanded)
// rather than a charge, so a paid invoice's card and refunds are read from its charge, found through the
// payment intent with Charges: Read. Tests use fakes only (spec § 9): no test calls Stripe.

import Stripe from 'stripe';
import { cardLabel } from '@ai/core';
import type { BillingSubscription, InvoiceStatus, PriceInterval, StripeReadScope } from '@ai/core';

export interface StripePage<T> {
  data: T[];
  hasMore: boolean;
}

/** An invoice, as the Console reads it. Times are epoch ms; amounts cents. */
export interface ReadInvoice {
  id: string;
  customerId: string | null;
  customerName: string | null;
  subscriptionId: string | null;
  status: InvoiceStatus;
  totalCents: number;
  amountPaidCents: number;
  amountRemainingCents: number;
  attemptCount: number;
  created: number;
  nextPaymentAttempt: number | null;
  /** R-5 Phase 8 (D-269): when Stripe marked it paid (`status_transitions.paid_at`), for Revenue's months. */
  paidAt?: number | null;
  /** R-5 Phase 8 (D-269): Stripe's `billing_reason` (`subscription_create` is a checkout's own invoice). */
  billingReason?: string | null;
  /** From the invoice's payment: its payment intent, or its charge when there is no intent. */
  paymentIntentId: string | null;
  chargeId: string | null;
}

export interface ReadRefund {
  id: string;
  amountCents: number;
  chargeId: string | null;
  paymentIntentId: string | null;
  /** The invoice the refunded payment paid, when asked for (`withInvoice`). */
  invoiceId: string | null;
  created: number;
  status: string | null;
  reason: string | null;
  metadata: Record<string, string>;
}

export interface ReadCustomer {
  id: string;
  name: string | null;
  email: string | null;
}

export interface ReadCharge {
  id: string;
  amountCents: number;
  refundedCents: number;
  /** "Visa ending 4242", or null. */
  paymentMethod: string | null;
  /** "card_declined: insufficient_funds" for a failed charge, else null. */
  failure: string | null;
}

export interface ConsoleStripe {
  /** Subscriptions: Read. */
  listSubscriptions(p: { status?: 'all' | 'active' | 'past_due' | 'trialing'; limit: number; startingAfter?: string }): Promise<StripePage<BillingSubscription>>;
  /** Invoices: Read. */
  listInvoices(p: { status?: InvoiceStatus; limit: number; startingAfter?: string }): Promise<StripePage<ReadInvoice>>;
  /** Invoices: Read. */
  retrieveInvoice(id: string): Promise<ReadInvoice>;
  /** Refunds: Read (and Invoices: Read for `withInvoice`). `createdGte` is epoch seconds. */
  listRefunds(p: { limit: number; startingAfter?: string; createdGte?: number; withInvoice?: boolean }): Promise<StripePage<ReadRefund>>;
  /** Customers: Read. Null for a customer Stripe doesn't have. */
  retrieveCustomer(id: string): Promise<ReadCustomer | null>;
  /** Charges: Read. A charge by id, or a payment intent's latest charge (null when it has none). */
  retrieveCharge(ref: { chargeId?: string | null; paymentIntentId?: string | null }): Promise<ReadCharge | null>;
}

/** Each method's Read permission, as the 503 names it. */
export const METHOD_SCOPES: Record<keyof ConsoleStripe, StripeReadScope> = {
  listSubscriptions: 'Subscriptions',
  listInvoices: 'Invoices',
  retrieveInvoice: 'Invoices',
  listRefunds: 'Refunds',
  retrieveCustomer: 'Customers',
  retrieveCharge: 'Charges',
};

/** The key lacks a Read permission. Carries the scope's name and nothing Stripe said. */
export class StripeScopeError extends Error {
  constructor(readonly scope: StripeReadScope) {
    super(`Stripe permission missing: ${scope}`);
    this.name = 'StripeScopeError';
  }
}

/** Any other Stripe failure: its code or type only (`resource_missing`, `api_connection_error`, …). */
export class StripeReadError extends Error {
  constructor(readonly reason: string) {
    super(`Stripe read failed: ${reason}`);
    this.name = 'StripeReadError';
  }
}

const isPermission = (e: unknown): boolean => {
  const x = e as { statusCode?: number; type?: string; raw?: { statusCode?: number } } | null;
  return x?.statusCode === 403 || x?.raw?.statusCode === 403 || x?.type === 'StripePermissionError';
};

/** A Stripe failure as one of ours, keeping nothing of its message. */
export function readFailure(e: unknown, scope: StripeReadScope): Error {
  if (e instanceof StripeScopeError || e instanceof StripeReadError) return e;
  if (isPermission(e)) return new StripeScopeError(scope);
  const x = e as { code?: unknown; type?: unknown } | null;
  const reason = typeof x?.code === 'string' ? x.code : typeof x?.type === 'string' ? x.type : 'error';
  return new StripeReadError(/^[A-Za-z_]{1,64}$/.test(reason) ? reason : 'error');
}

/** Every method of `inner`, its failures turned into ours by its scope. */
export function scopedConsoleStripe(inner: ConsoleStripe): ConsoleStripe {
  const out = {} as Record<keyof ConsoleStripe, unknown>;
  for (const m of Object.keys(METHOD_SCOPES) as (keyof ConsoleStripe)[]) {
    out[m] = async (...args: unknown[]) => {
      try {
        return await (inner[m] as (...a: unknown[]) => Promise<unknown>)(...args);
      } catch (e) {
        throw readFailure(e, METHOD_SCOPES[m]);
      }
    };
  }
  return out as unknown as ConsoleStripe;
}

// --- the cache ---------------------------------------------------------------------------------------

export const CONSOLE_STRIPE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 500;

/** Each cached client's entries, so a confirmed write (D-164) can drop the ones it made stale. */
const MEMOS = new WeakMap<ConsoleStripe, Map<string, { at: number; value: Promise<unknown> }>>();

/**
 * Drop every cached read of `client` that `stale` names (by method and arguments), so the next read
 * asks Stripe. D-164: after a refund or a void, the acted-on invoice's rows. A client that is not a
 * cache has nothing to drop. The read methods themselves are unchanged.
 */
export function forgetConsoleStripe(client: ConsoleStripe, stale: (method: keyof ConsoleStripe, args: unknown[]) => boolean): void {
  const memo = MEMOS.get(client);
  if (!memo) return;
  for (const key of [...memo.keys()]) {
    const at = key.indexOf(':');
    if (stale(key.slice(0, at) as keyof ConsoleStripe, JSON.parse(key.slice(at + 1)) as unknown[])) memo.delete(key);
  }
}

/**
 * A 10-minute cache over any ConsoleStripe: one entry per method and arguments, one call in flight
 * per entry, a failure forgotten at once (never cached, never masked by an older answer).
 */
export function cachedConsoleStripe(inner: ConsoleStripe, now: () => number, ttl = CONSOLE_STRIPE_TTL_MS): ConsoleStripe {
  const memo = new Map<string, { at: number; value: Promise<unknown> }>();
  const out = {} as Record<keyof ConsoleStripe, unknown>;
  for (const m of Object.keys(METHOD_SCOPES) as (keyof ConsoleStripe)[]) {
    out[m] = (...args: unknown[]) => {
      const key = `${m}:${JSON.stringify(args)}`;
      const t = now();
      const hit = memo.get(key);
      if (hit && t - hit.at < ttl) return hit.value;
      const value = (inner[m] as (...a: unknown[]) => Promise<unknown>)(...args);
      memo.delete(key);
      memo.set(key, { at: t, value });
      if (memo.size > CACHE_MAX) memo.delete(memo.keys().next().value!);
      value.catch(() => memo.get(key)?.value === value && memo.delete(key));
      return value;
    };
  }
  const cached = out as unknown as ConsoleStripe;
  MEMOS.set(cached, memo);
  return cached;
}

// --- the real client ---------------------------------------------------------------------------------

const idOf = (v: unknown): string | null => (typeof v === 'string' ? v : v && typeof v === 'object' && 'id' in v ? String((v as { id: string }).id) : null);
const ms = (s: number | null | undefined): number | null => (typeof s === 'number' ? s * 1000 : null);

function subscriptionOf(s: Stripe.Subscription): BillingSubscription {
  return {
    id: s.id,
    customerId: idOf(s.customer),
    status: s.status,
    created: s.created * 1000,
    metadata: { ...(s.metadata ?? {}) },
    items: (s.items?.data ?? []).map((i) => ({
      lookupKey: i.price?.lookup_key ?? null,
      unitAmount: i.price?.unit_amount ?? null,
      interval: (i.price?.recurring?.interval ?? null) as PriceInterval | null,
      intervalCount: i.price?.recurring?.interval_count ?? 1,
      quantity: i.quantity ?? 1,
    })),
    // R-5 Phase 8 (D-269): its next charge, as Revenue reads it. The period's end is on the items (API 2025-10-29): the
    // first item's, which every item of one subscription shares.
    currentPeriodEnd: ms(s.items?.data?.[0]?.current_period_end),
    trialEnd: ms(s.trial_end),
    cancelAtPeriodEnd: s.cancel_at_period_end === true,
  };
}

function invoiceOf(inv: Stripe.Invoice): ReadInvoice {
  const pay = inv.payments?.data?.find((p) => p.status === 'paid') ?? inv.payments?.data?.[0];
  const sub = inv.parent?.subscription_details?.subscription ?? null;
  return {
    id: inv.id ?? '',
    customerId: idOf(inv.customer),
    customerName: inv.customer_name ?? inv.customer_email ?? null,
    subscriptionId: idOf(sub),
    status: (inv.status ?? 'draft') as InvoiceStatus,
    totalCents: inv.total,
    amountPaidCents: inv.amount_paid,
    amountRemainingCents: inv.amount_remaining,
    attemptCount: inv.attempt_count,
    created: inv.created * 1000,
    nextPaymentAttempt: ms(inv.next_payment_attempt),
    paidAt: ms(inv.status_transitions?.paid_at),
    billingReason: inv.billing_reason ?? null,
    paymentIntentId: idOf(pay?.payment?.payment_intent),
    chargeId: idOf(pay?.payment?.charge),
  };
}

function chargeOf(c: Stripe.Charge): ReadCharge {
  const card = c.payment_method_details?.card;
  const reason = c.outcome?.reason ?? null;
  return {
    id: c.id,
    amountCents: c.amount,
    refundedCents: c.amount_refunded,
    paymentMethod: cardLabel(card?.brand, card?.last4) ?? null,
    failure: c.status === 'failed' && c.failure_code ? [c.failure_code, reason].filter(Boolean).join(': ') : null,
  };
}

/** The real client. Reads only; `maxNetworkRetries` as the offer's client has it. */
export function consoleStripeClient(secretKey: string): ConsoleStripe {
  const stripe = new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 15_000, appInfo: { name: 'amplified-impact-lms-console' } });
  return {
    async listSubscriptions({ status = 'all', limit, startingAfter }) {
      const page = await stripe.subscriptions.list({ status, limit, ...(startingAfter ? { starting_after: startingAfter } : {}) });
      return { data: page.data.map(subscriptionOf), hasMore: page.has_more };
    },
    async listInvoices({ status, limit, startingAfter }) {
      const page = await stripe.invoices.list({
        limit,
        expand: ['data.payments'],
        ...(status ? { status } : {}),
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      return { data: page.data.map(invoiceOf), hasMore: page.has_more };
    },
    async retrieveInvoice(id) {
      return invoiceOf(await stripe.invoices.retrieve(id, { expand: ['payments'] }));
    },
    async listRefunds({ limit, startingAfter, createdGte, withInvoice }) {
      const page = await stripe.refunds.list({
        limit,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
        ...(createdGte !== undefined ? { created: { gte: createdGte } } : {}),
      });
      const data: ReadRefund[] = [];
      for (const r of page.data) {
        const pi = idOf(r.payment_intent);
        let invoiceId: string | null = null;
        if (withInvoice && pi) {
          // The same lookup `billing/stripe.ts` makes for a refunded subscription charge (Invoices: Read).
          const paid = await stripe.invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: pi }, limit: 1 });
          invoiceId = idOf(paid.data[0]?.invoice);
        }
        data.push({
          id: r.id,
          amountCents: r.amount,
          chargeId: idOf(r.charge),
          paymentIntentId: pi,
          invoiceId,
          created: r.created * 1000,
          status: r.status ?? null,
          reason: r.reason ?? null,
          metadata: { ...(r.metadata ?? {}) },
        });
      }
      return { data, hasMore: page.has_more };
    },
    async retrieveCustomer(id) {
      try {
        const c = await stripe.customers.retrieve(id);
        if ('deleted' in c && c.deleted) return null;
        return { id: c.id, name: (c as Stripe.Customer).name ?? null, email: (c as Stripe.Customer).email ?? null };
      } catch (e) {
        if ((e as { code?: string }).code === 'resource_missing') return null;
        throw e;
      }
    },
    async retrieveCharge({ chargeId, paymentIntentId }) {
      if (chargeId) return chargeOf(await stripe.charges.retrieve(chargeId));
      if (!paymentIntentId) return null;
      const page = await stripe.charges.list({ payment_intent: paymentIntentId, limit: 1 });
      return page.data[0] ? chargeOf(page.data[0]) : null;
    },
  };
}

// --- the scope probe ---------------------------------------------------------------------------------

/**
 * Which Read permissions the key has, by asking each the smallest question that needs it: one row of
 * subscriptions, invoices and refunds, and a customer and a charge that don't exist (a 404 means the
 * question was allowed). True, false (Stripe refused), or null (it couldn't tell). Reads only.
 */
export async function probeStripeScopes(stripe: ConsoleStripe): Promise<Record<StripeReadScope, boolean | null>> {
  const ask = async (q: () => Promise<unknown>): Promise<boolean | null> => {
    try {
      await q();
      return true;
    } catch (e) {
      const f = readFailure(e, 'Subscriptions');
      if (f instanceof StripeScopeError) return false;
      return f instanceof StripeReadError && f.reason === 'resource_missing' ? true : null;
    }
  };
  const [Subscriptions, Invoices, Charges, Refunds, Customers] = await Promise.all([
    ask(() => stripe.listSubscriptions({ status: 'all', limit: 1 })),
    ask(() => stripe.listInvoices({ limit: 1 })),
    ask(() => stripe.retrieveCharge({ chargeId: 'ch_console_scope_probe' })),
    ask(() => stripe.listRefunds({ limit: 1 })),
    ask(() => stripe.retrieveCustomer('cus_console_scope_probe')),
  ]);
  return { Subscriptions, Invoices, Charges, Refunds, Customers };
}
