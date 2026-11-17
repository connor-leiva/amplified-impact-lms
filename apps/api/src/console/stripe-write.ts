// The Admin Console's Stripe WRITE client (D-164, spec § 7.6 "Actions (PR 5)"): the only two writes the
// Console makes, a refund and an invoice void, each reached only through the confirm-token endpoints in
// `billing-actions.ts`. Narrow on purpose: nothing here can create a charge, change a subscription or a
// price, touch Payment Links or checkout, or send anything. `billing/stripe.ts` (the offer's client) and
// `stripe-read.ts` (the Console's reads) are unchanged; this is built from the same key,
// `readOfferConfig().stripeSecretKey`. A test reads this file and finds those two calls and no other.
//
// SCOPES. A refund needs Write on Refunds; a void, Write on Invoices. A Stripe permission refusal is
// `StripeWriteScopeError(scope)`, answered 503 `stripe_permission_missing` naming it. Stripe's message
// is never carried (it quotes a redacted copy of the key). Any other failure is `StripeWriteError` with
// Stripe's code or type only, and whether Stripe answered at all: a refusal Stripe made (a card error,
// an invalid request) changed nothing, while a dropped connection or a 5xx leaves the outcome unknown,
// which the same idempotency key settles on a retry.
//
// IDEMPOTENCY. Every call carries the caller's key (`console-` + sha256(token), `confirm.ts`), and the
// SDK's own network retries reuse it, so one confirmation is one refund or one void, however often it
// reaches Stripe. Tests use fakes only (spec § 9).

import Stripe from 'stripe';
import type { StripeWriteScope } from '@ai/core';

export interface WrittenRefund {
  id: string;
  amountCents: number;
  status: string | null;
}

export interface WrittenInvoice {
  id: string;
  status: string;
}

export interface ConsoleStripeWrite {
  /**
   * Refunds: Write. By payment intent when there is one, else by charge. The metadata names the staff
   * member and the audit row; staff's reason is never sent to Stripe.
   */
  createRefund(
    p: { paymentIntentId: string | null; chargeId: string | null; amountCents: number; metadata: { console_actor: string; console_audit_id: string } },
    idempotencyKey: string,
  ): Promise<WrittenRefund>;
  /** Invoices: Write. */
  voidInvoice(id: string, idempotencyKey: string): Promise<WrittenInvoice>;
}

/** Each method's Write permission, as the 503 names it. */
export const WRITE_SCOPES: Record<keyof ConsoleStripeWrite, StripeWriteScope> = {
  createRefund: 'Refunds',
  voidInvoice: 'Invoices',
};

/** The key lacks a Write permission. Carries the scope's name and nothing Stripe said. */
export class StripeWriteScopeError extends Error {
  constructor(readonly scope: StripeWriteScope) {
    super(`Stripe permission missing: Write on ${scope}`);
    this.name = 'StripeWriteScopeError';
  }
}

/**
 * Any other Stripe failure: its code or type only (`charge_already_refunded`, `StripeConnectionError`).
 * `answered`: Stripe refused (nothing changed); false: no answer, so the outcome is not known.
 */
export class StripeWriteError extends Error {
  constructor(
    readonly reason: string,
    readonly answered: boolean,
  ) {
    super(`Stripe write failed: ${reason}`);
    this.name = 'StripeWriteError';
  }
}

const SAFE = /^[A-Za-z_]{1,64}$/;

/** A Stripe failure as one of ours, keeping nothing of its message. */
export function writeFailure(e: unknown, scope: StripeWriteScope): Error {
  if (e instanceof StripeWriteScopeError || e instanceof StripeWriteError) return e;
  const x = e as { statusCode?: number; type?: string; code?: unknown; raw?: { statusCode?: number } } | null;
  const status = x?.statusCode ?? x?.raw?.statusCode;
  if (status === 403 || x?.type === 'StripePermissionError') return new StripeWriteScopeError(scope);
  const code = typeof x?.code === 'string' ? x.code : typeof x?.type === 'string' ? x.type : 'error';
  // Stripe answered with a 4xx (a card error, an invalid or conflicting request, an idempotency
  // conflict): it refused, and changed nothing. A connection error, a timeout or a 5xx: unknown.
  const answered = typeof status === 'number' && status >= 400 && status < 500;
  return new StripeWriteError(SAFE.test(code) ? code : 'error', answered);
}

/** Every method of `inner`, its failures turned into ours by its scope. */
export function scopedConsoleStripeWrite(inner: ConsoleStripeWrite): ConsoleStripeWrite {
  return {
    async createRefund(p, key) {
      try {
        return await inner.createRefund(p, key);
      } catch (e) {
        throw writeFailure(e, WRITE_SCOPES.createRefund);
      }
    },
    async voidInvoice(id, key) {
      try {
        return await inner.voidInvoice(id, key);
      } catch (e) {
        throw writeFailure(e, WRITE_SCOPES.voidInvoice);
      }
    },
  };
}

/** The real client: a refund create and an invoice void, nothing else. */
export function consoleStripeWriter(secretKey: string): ConsoleStripeWrite {
  const stripe = new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: 'amplified-impact-lms-console' } });
  return {
    async createRefund({ paymentIntentId, chargeId, amountCents, metadata }, idempotencyKey) {
      const r = await stripe.refunds.create(
        { ...(paymentIntentId ? { payment_intent: paymentIntentId } : { charge: chargeId! }), amount: amountCents, metadata },
        { idempotencyKey },
      );
      return { id: r.id, amountCents: r.amount, status: r.status ?? null };
    },
    async voidInvoice(id, idempotencyKey) {
      const inv = await stripe.invoices.voidInvoice(id, {}, { idempotencyKey });
      return { id: inv.id ?? id, status: inv.status ?? 'void' };
    },
  };
}
