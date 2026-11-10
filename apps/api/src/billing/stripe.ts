// The few Stripe calls the offer makes, behind one small interface (D-073).
//
// Everything that talks to Stripe goes through `BillingStripe`, so the checkout route and the
// webhook can be tested against a stub with no network (the spec's "tests without the network"), and
// so the restricted key's permissions (the handoff's section 7) are one list here: Checkout Sessions,
// Subscriptions and Customers to write; Prices, Products, PaymentIntents, Invoices and Charges to
// read. Nothing here creates a price, a coupon or a refund.
//
// API VERSIONS. The SDK pins its own (`2025-10-29.clover`), which governs what these calls return.
// Webhook payloads are rendered in the ENDPOINT's version, which is the account's default and may be
// older, so the webhook reads every moved field both ways (`subscriptionOfInvoice` below).

import Stripe from 'stripe';

/** One price, as the offer page and the checkout route need it. Amounts are in cents. */
export interface PriceInfo {
  lookupKey: string;
  id: string;
  unitAmount: number;
  currency: string;
  /** `month` for a recurring price, null for a one-time one. */
  interval: 'day' | 'week' | 'month' | 'year' | null;
  productName: string | null;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

/** The fields of a subscription the webhook reads. */
export interface SubscriptionInfo {
  id: string;
  status: string;
  customer: string | null;
  trialEnd: number | null;
  defaultPaymentMethod: string | null;
  metadata: Record<string, string>;
  /** When it is set to end, epoch ms, or null. */
  cancelAt: number | null;
  /** The end of the current period, epoch ms: on the item since API 2025-03-31, on the subscription before. */
  currentPeriodEnd: number | null;
}

export interface BillingStripe {
  pricesByLookupKeys(keys: readonly string[]): Promise<PriceInfo[]>;
  createCheckoutSession(params: Stripe.Checkout.SessionCreateParams, idempotencyKey: string): Promise<CheckoutSessionResult>;
  retrieveSubscription(id: string): Promise<SubscriptionInfo>;
  updateSubscription(id: string, params: Stripe.SubscriptionUpdateParams, idempotencyKey?: string): Promise<SubscriptionInfo>;
  createSubscription(params: Stripe.SubscriptionCreateParams, idempotencyKey: string): Promise<SubscriptionInfo>;
  /** Cancels at once, with no proration: a refunded plan must not charge again. */
  cancelSubscription(id: string): Promise<SubscriptionInfo>;
  /** The payment method a PaymentIntent saved, or null. */
  paymentMethodOfPaymentIntent(id: string): Promise<string | null>;
  /** The subscription an invoice payment belongs to, for a refund of a subscription charge. */
  subscriptionOfPaymentIntent(id: string): Promise<string | null>;
  /** Verifies the signature and parses the event. Throws on a bad signature. */
  constructEvent(rawBody: string | Buffer, signature: string, secret: string): Stripe.Event;
}

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  value === null || value === undefined ? null : typeof value === 'string' ? value : value.id;

function periodEndOf(s: Stripe.Subscription): number | null {
  const item = s.items?.data?.[0] as { current_period_end?: number } | undefined;
  const legacy = (s as unknown as { current_period_end?: number }).current_period_end;
  const end = item?.current_period_end ?? legacy;
  return typeof end === 'number' ? end * 1000 : null;
}

function subscriptionInfo(s: Stripe.Subscription): SubscriptionInfo {
  return {
    id: s.id,
    status: s.status,
    customer: idOf(s.customer as string | { id: string }),
    trialEnd: s.trial_end === null ? null : s.trial_end * 1000,
    defaultPaymentMethod: idOf(s.default_payment_method as string | { id: string } | null),
    metadata: { ...(s.metadata ?? {}) },
    cancelAt: s.cancel_at ? s.cancel_at * 1000 : null,
    currentPeriodEnd: periodEndOf(s),
  };
}

/** The real client. `maxNetworkRetries` covers a dropped connection on venue Wi-Fi's upstream. */
export function stripeClient(secretKey: string): BillingStripe {
  const stripe = new Stripe(secretKey, {
    maxNetworkRetries: 2,
    timeout: 15_000,
    appInfo: { name: 'amplified-impact-lms' },
  });

  return {
    async pricesByLookupKeys(keys) {
      const out: PriceInfo[] = [];
      // `lookup_keys` takes at most 10 per call.
      for (let i = 0; i < keys.length; i += 10) {
        const page = await stripe.prices.list({ lookup_keys: [...keys.slice(i, i + 10)], active: true, expand: ['data.product'], limit: 100 });
        for (const p of page.data) {
          if (!p.lookup_key || p.unit_amount === null) continue;
          const product = typeof p.product === 'object' && p.product !== null && !('deleted' in p.product && p.product.deleted) ? (p.product as Stripe.Product) : null;
          out.push({
            lookupKey: p.lookup_key,
            id: p.id,
            unitAmount: p.unit_amount,
            currency: p.currency,
            interval: p.recurring?.interval ?? null,
            productName: product?.name ?? null,
          });
        }
      }
      return out;
    },

    async createCheckoutSession(params, idempotencyKey) {
      const session = await stripe.checkout.sessions.create(params, { idempotencyKey });
      if (!session.url) throw new Error('Stripe returned a Checkout Session with no url');
      return { id: session.id, url: session.url };
    },

    async retrieveSubscription(id) {
      return subscriptionInfo(await stripe.subscriptions.retrieve(id));
    },

    async updateSubscription(id, params, idempotencyKey) {
      return subscriptionInfo(await stripe.subscriptions.update(id, params, idempotencyKey ? { idempotencyKey } : undefined));
    },

    async createSubscription(params, idempotencyKey) {
      return subscriptionInfo(await stripe.subscriptions.create(params, { idempotencyKey }));
    },

    async cancelSubscription(id) {
      return subscriptionInfo(await stripe.subscriptions.cancel(id, { prorate: false }));
    },

    async paymentMethodOfPaymentIntent(id) {
      const pi = await stripe.paymentIntents.retrieve(id);
      return idOf(pi.payment_method as string | { id: string } | null);
    },

    async subscriptionOfPaymentIntent(id) {
      const payments = await stripe.invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: id }, limit: 1 });
      const invoiceId = idOf(payments.data[0]?.invoice as string | { id: string } | undefined);
      if (!invoiceId) return null;
      const invoice = await stripe.invoices.retrieve(invoiceId);
      return subscriptionOfInvoice(invoice as unknown as InvoiceLike);
    },

    constructEvent(rawBody, signature, secret) {
      return stripe.webhooks.constructEvent(rawBody, signature, secret);
    },
  };
}

/**
 * A signature checker that needs no API key: verifying a webhook is local HMAC work, and the webhook
 * must still refuse a forged event on a deploy that has its signing secret but not yet its key.
 */
export function stripeVerifier(): BillingStripe['constructEvent'] {
  const stripe = new Stripe('sk_test_signature_verification_only');
  return (rawBody, signature, secret) => stripe.webhooks.constructEvent(rawBody, signature, secret);
}

/** An invoice in either API shape: `parent.subscription_details` (2025-03-31 on) or `subscription` (before). */
export interface InvoiceLike {
  id?: string;
  amount_paid?: number;
  subscription?: string | { id: string } | null;
  parent?: { subscription_details?: { subscription?: string | { id: string } | null; metadata?: Record<string, string> | null } | null } | null;
  subscription_details?: { metadata?: Record<string, string> | null } | null;
  metadata?: Record<string, string> | null;
  lines?: { data?: { period?: { end?: number | null } | null; pricing?: unknown; price?: unknown }[] } | null;
  payment_intent?: string | { id: string } | null;
}

export function subscriptionOfInvoice(invoice: InvoiceLike): string | null {
  return idOf(invoice.parent?.subscription_details?.subscription ?? null) ?? idOf(invoice.subscription ?? null);
}

/** The subscription's metadata as the invoice snapshots it, in either API shape. */
export function subscriptionMetadataOfInvoice(invoice: InvoiceLike): Record<string, string> {
  return { ...(invoice.subscription_details?.metadata ?? {}), ...(invoice.parent?.subscription_details?.metadata ?? {}) };
}

/** The latest period end on any line of an invoice, in epoch ms: what a paid invoice paid through. */
export function periodEndOfInvoice(invoice: InvoiceLike): number | null {
  let end: number | null = null;
  for (const line of invoice.lines?.data ?? []) {
    const e = line.period?.end;
    if (typeof e === 'number' && (end === null || e * 1000 > end)) end = e * 1000;
  }
  return end;
}

export { idOf };
