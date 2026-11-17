// A fake of the Console's Stripe read client (D-163): tests never call Stripe (spec § 9). It holds
// plain arrays, pages them as Stripe does (newest first, `starting_after` the last id), records every
// call, and can be told to fail a method the way Stripe would: a 403 permission error (whose message
// quotes the key, as Stripe's does), a 404, or a dropped connection.
import type { BillingSubscription } from '@ai/core';
import type { ConsoleStripe, ReadCharge, ReadCustomer, ReadInvoice, ReadRefund, StripePage } from '../src/console/stripe-read';
import type { ConsoleStripeWrite } from '../src/console/stripe-write';

export interface FakeStripeData {
  subscriptions: BillingSubscription[];
  invoices: ReadInvoice[];
  refunds: ReadRefund[];
  customers: ReadCustomer[];
  /** By charge id, and by payment intent (`pi:` + id). */
  charges: Record<string, ReadCharge>;
}

export type FakeFailure = 'permission' | 'missing' | 'network';

/** A Stripe-shaped error. The permission one quotes the key, so a test can prove it never leaks. */
export function stripeError(kind: FakeFailure, key: string): Error {
  if (kind === 'permission')
    return Object.assign(new Error(`The provided key '${key}' does not have the required permissions for this endpoint.`), {
      type: 'StripePermissionError',
      statusCode: 403,
      raw: { statusCode: 403, message: `key ${key}` },
    });
  if (kind === 'missing') return Object.assign(new Error(`No such object; key ${key}`), { type: 'StripeInvalidRequestError', code: 'resource_missing', statusCode: 404 });
  return Object.assign(new Error(`Connection to Stripe failed (key ${key})`), { type: 'StripeConnectionError' });
}

function page<T extends { id: string }>(all: readonly T[], limit: number, after?: string): StripePage<T> {
  const start = after ? all.findIndex((x) => x.id === after) + 1 : 0;
  const data = all.slice(start, start + limit);
  return { data, hasMore: start + limit < all.length };
}

export function fakeConsoleStripe(data: Partial<FakeStripeData> = {}, key = 'rk_test_fake') {
  const d: FakeStripeData = { subscriptions: [], invoices: [], refunds: [], customers: [], charges: {}, ...data };
  const calls: string[] = [];
  const fail: Partial<Record<keyof ConsoleStripe, FakeFailure>> = {};
  const guard = (m: keyof ConsoleStripe) => {
    calls.push(m);
    const f = fail[m];
    if (f) throw stripeError(f, key);
  };
  const byNewest = <T extends { created: number }>(xs: readonly T[]) => [...xs].sort((a, b) => b.created - a.created);
  const stripe: ConsoleStripe = {
    async listSubscriptions({ status = 'all', limit, startingAfter }) {
      guard('listSubscriptions');
      return page(byNewest(d.subscriptions.filter((s) => status === 'all' || s.status === status)), limit, startingAfter);
    },
    async listInvoices({ status, limit, startingAfter }) {
      guard('listInvoices');
      return page(byNewest(d.invoices.filter((i) => !status || i.status === status)), limit, startingAfter);
    },
    async retrieveInvoice(id) {
      guard('retrieveInvoice');
      const hit = d.invoices.find((i) => i.id === id);
      if (!hit) throw stripeError('missing', key);
      return hit;
    },
    async listRefunds({ limit, startingAfter, createdGte, withInvoice }) {
      guard('listRefunds');
      const p = page(byNewest(d.refunds.filter((r) => createdGte === undefined || r.created >= createdGte * 1000)), limit, startingAfter);
      return withInvoice ? p : { ...p, data: p.data.map((r) => ({ ...r, invoiceId: null })) };
    },
    async retrieveCustomer(id) {
      guard('retrieveCustomer');
      return d.customers.find((c) => c.id === id) ?? null;
    },
    async retrieveCharge({ chargeId, paymentIntentId }) {
      guard('retrieveCharge');
      if (chargeId) {
        const c = d.charges[chargeId];
        if (!c) throw stripeError('missing', key);
        return c;
      }
      return paymentIntentId ? (d.charges[`pi:${paymentIntentId}`] ?? null) : null;
    },
  };
  return { stripe, data: d, calls, fail };
}

// --- D-164: the write client ------------------------------------------------------------------------

export type FakeWriteFailure = FakeFailure | 'refused';

/**
 * A fake of the Console's Stripe write client, over a read fake's data: a refund raises the charge's
 * refunded amount and adds a refund; a void marks the invoice void, so the next read sees each. Like
 * Stripe, an idempotency key seen before answers the first result again, and the same key with other
 * parameters is an `idempotency_error`. Every call is recorded with its key and parameters.
 */
export function fakeConsoleStripeWrite(read: { data: FakeStripeData }, key = 'rk_test_fake') {
  const calls: { method: keyof ConsoleStripeWrite; key: string; params: Record<string, unknown> }[] = [];
  const fail: Partial<Record<keyof ConsoleStripeWrite, FakeWriteFailure>> = {};
  const seen = new Map<string, { params: string; result: unknown }>();
  let n = 0;
  const refused = (code: string) =>
    Object.assign(new Error(`Request refused (${code}); key ${key}`), { type: 'StripeInvalidRequestError', code, statusCode: 400 });
  const once = <T>(method: keyof ConsoleStripeWrite, idem: string, params: Record<string, unknown>, make: () => T): T => {
    calls.push({ method, key: idem, params });
    const f = fail[method];
    if (f) throw f === 'refused' ? refused('charge_already_refunded') : stripeError(f, key);
    const p = JSON.stringify(params);
    const hit = seen.get(idem);
    if (hit) {
      if (hit.params !== p) throw refused('idempotency_error');
      return hit.result as T;
    }
    const result = make();
    seen.set(idem, { params: p, result });
    return result;
  };
  const write: ConsoleStripeWrite = {
    async createRefund(p, idem) {
      return once('createRefund', idem, { ...p }, () => {
        const charge = p.paymentIntentId ? read.data.charges[`pi:${p.paymentIntentId}`] : read.data.charges[p.chargeId ?? ''];
        if (!charge) throw stripeError('missing', key);
        if (p.amountCents > charge.amountCents - charge.refundedCents) throw refused('amount_too_large');
        charge.refundedCents += p.amountCents;
        const refund: ReadRefund = {
          id: `re_fake${++n}`,
          amountCents: p.amountCents,
          chargeId: charge.id,
          paymentIntentId: p.paymentIntentId,
          invoiceId: null,
          created: Date.parse(process.env.FIXED_NOW ?? '2026-12-07T16:42:00Z'),
          status: 'succeeded',
          reason: null,
          metadata: { ...p.metadata },
        };
        read.data.refunds.unshift(refund);
        return { id: refund.id, amountCents: refund.amountCents, status: refund.status };
      });
    },
    async voidInvoice(id, idem) {
      return once('voidInvoice', idem, { id }, () => {
        const inv = read.data.invoices.find((i) => i.id === id);
        if (!inv) throw stripeError('missing', key);
        if (inv.status !== 'open' && inv.status !== 'uncollectible') throw refused('invoice_not_voidable');
        inv.status = 'void';
        return { id, status: 'void' };
      });
    },
  };
  return { write, calls, fail };
}
