// `POST /api/stripe/webhook`: the only thing that marks an order paid (D-074, D-076).
//
// SIGNATURE, THEN ONCE PER EVENT. The raw body's `Stripe-Signature` is checked against
// `STRIPE_WEBHOOK_SECRET` before anything is read. The event's id is then inserted into
// `stripe_events`; an id already processed is answered 200 and skipped, so a redelivery changes
// nothing. An event that fails is answered 500 with its `error` recorded, and Stripe's own retries
// (for up to three days) bring it back: every step below is safe to run twice, which is what makes
// "answer 500 and let Stripe retry" a better answer than "answer 200 and hope a local retry exists".
// The database work is quick; emails go out after the commit.
//
// WHAT EACH EVENT DOES is the spec's table, and each handler below says which row it is. Events and
// plans the app does not know (the $1 `smoke_test`, `ai_plan` = `test`) are recorded and ignored.
//
// FALLBACK PAYMENT LINKS take the same path. A session with no order of ours becomes an order here,
// built from the link's metadata (`ai_plan`, `ai_option`, `campaign`) and the custom fields Grokbok
// adds (`company`, `crm`, `agents`), so a link purchase lands exactly where a site purchase does.
//
// NEVER LOGGED: names, emails, phone numbers. Order, account, plan and Stripe ids only.

import { eq, sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { orders, plans, stripeEvents } from '../db/schema';
import { randomIds } from '../lib/clock';
import { AGREEMENT_VERSION } from './checkout';
import { AGENTS_FIRST_CHARGE_AT, AI_PLANS, COHORT_ONE_LIVE_UNTIL, LIBRARY_TRIAL_DAYS, PLAN_KINDS, addMonths, cartFor } from './catalog';
import type { PlanStatus } from './catalog';
import type { OfferConfig } from './config';
import type { PriceCache } from './prices';
import { provisionOrder } from './provision';
import type { BillingLog } from './provision';
import { idOf, periodEndOfInvoice, subscriptionMetadataOfInvoice, subscriptionOfInvoice } from './stripe';
import type { BillingStripe, InvoiceLike } from './stripe';

export interface WebhookDeps {
  stripe: BillingStripe | null;
  config: OfferConfig;
  prices: PriceCache;
  log: BillingLog;
  now: () => number;
  db?: Database;
}

type OrderRow = typeof orders.$inferSelect;
type PlanRow = typeof plans.$inferSelect;

// --- once per event --------------------------------------------------------------------------------

/** `new` to process, `done` to skip, `retry` for one that failed before (Stripe is redelivering it). */
export async function recordEvent(db: Database, event: { id: string; type: string }, now: number): Promise<'new' | 'done' | 'retry'> {
  const inserted = await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type, receivedAt: now })
    .onConflictDoNothing({ target: stripeEvents.id })
    .returning({ id: stripeEvents.id });
  if (inserted.length) return 'new';
  const [row] = await db.select({ processedAt: stripeEvents.processedAt }).from(stripeEvents).where(eq(stripeEvents.id, event.id));
  return row?.processedAt != null ? 'done' : 'retry';
}

export async function markEvent(db: Database, id: string, now: number, error: string | null): Promise<void> {
  await db
    .update(stripeEvents)
    .set(error === null ? { processedAt: now, error: null } : { error: error.slice(0, 200) })
    .where(eq(stripeEvents.id, id));
}

/** A short, safe reason for `stripe_events.error`: a Stripe error code or an error's name, never a message with data in it. */
export function errorReason(err: unknown): string {
  const e = err as { type?: unknown; code?: unknown; name?: unknown; cause?: { code?: unknown } };
  const parts = [e.type, e.code ?? e.cause?.code, e.name].filter((p): p is string => typeof p === 'string');
  return parts.length ? parts.join(':') : 'error';
}

// --- helpers ---------------------------------------------------------------------------------------

/** The order's GHL copy is out of date: the sync loop picks it up on its next pass (D-075). */
const resync = { ghlSyncedAt: null, ghlAttempts: 0, ghlNextAttemptAt: null } as const;

async function orderById(db: Database, id: string | null | undefined): Promise<OrderRow | null> {
  if (!id) return null;
  const [row] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return row ?? null;
}

async function orderBySubscription(db: Database, subscriptionId: string, metadataOrderId?: string): Promise<OrderRow | null> {
  const [row] = await db.select().from(orders).where(eq(orders.stripeSubscriptionId, subscriptionId)).limit(1);
  return row ?? (await orderById(db, metadataOrderId));
}

async function planBySubscription(db: Database, subscriptionId: string): Promise<PlanRow | null> {
  const [row] = await db.select().from(plans).where(eq(plans.stripeSubscriptionId, subscriptionId)).limit(1);
  return row ?? null;
}

async function planOfOrder(db: Database, orderId: string): Promise<PlanRow | null> {
  const [row] = await db.select().from(plans).where(eq(plans.orderId, orderId)).limit(1);
  return row ?? null;
}

/** Stripe's subscription status as a plan's. A refunded plan stays `ended` whatever Stripe says next. */
export function planStatusOf(stripeStatus: string): PlanStatus {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'incomplete_expired':
      return 'ended';
    default:
      // past_due, unpaid, incomplete, paused
      return 'past_due';
  }
}

/** A Payment Link's custom field by key (the handoff asks Grokbok for `company`, `crm` and `agents`). */
function customField(session: Stripe.Checkout.Session, key: string): string | null {
  const field = (session.custom_fields ?? []).find((f) => f.key === key);
  if (!field) return null;
  const value = field.text?.value ?? field.dropdown?.value ?? field.numeric?.value ?? null;
  return value === null || value === '' ? null : String(value);
}

/** A number of agents as one of the team-size buckets the site uses. */
export function teamSizeOfAgents(raw: string | null): string | null {
  const n = raw === null ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n <= 10) return '1-10';
  if (n <= 25) return '11-25';
  if (n <= 50) return '26-50';
  return '51+';
}

/** The CRM dropdown's value, as the order stores it. */
export function crmOf(raw: string | null): 'follow_up_boss' | 'other' | null {
  if (raw === null) return null;
  const v = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (v === '') return null;
  return v === 'follow_up_boss' || v === 'followupboss' || v === 'fub' ? 'follow_up_boss' : 'other';
}

/**
 * The order a completed session belongs to: ours (by `client_reference_id`, then by session id), or
 * a new one for a fallback Payment Link. Null for a session the offer does not sell (the $1 test).
 */
async function orderForSession(db: Database, session: Stripe.Checkout.Session, now: number): Promise<OrderRow | null> {
  const ours = (await orderById(db, session.client_reference_id)) ?? (await orderById(db, session.metadata?.order_id));
  if (ours) return ours;
  const [bySession] = await db.select().from(orders).where(eq(orders.stripeSessionId, session.id)).limit(1);
  if (bySession) return bySession;

  const meta = session.metadata ?? {};
  const cart = cartFor(meta.ai_plan ?? '', meta.ai_option ?? '');
  if (!cart) return null;
  const details = session.customer_details;
  const email = details?.email?.trim().toLowerCase() ?? null;
  const accepted = session.consent?.terms_of_service === 'accepted';
  await db
    .insert(orders)
    .values({
      id: randomIds()('ord'),
      plan: cart.plan,
      option: cart.option,
      origin: 'payment_link',
      status: 'pending',
      name: details?.name ?? null,
      email,
      phone: details?.phone ?? null,
      company: customField(session, 'company'),
      crm: crmOf(customField(session, 'crm')),
      teamSize: teamSizeOfAgents(customField(session, 'agents')),
      campaign: meta.campaign === 'forum' ? 'forum' : null,
      agreementVersion: accepted ? AGREEMENT_VERSION : null,
      agreementAcceptedAt: accepted ? now : null,
      stripeSessionId: session.id,
      createdAt: now,
    })
    .onConflictDoNothing({ target: orders.stripeSessionId });
  const [created] = await db.select().from(orders).where(eq(orders.stripeSessionId, session.id)).limit(1);
  return created ?? null;
}

// --- the handlers ----------------------------------------------------------------------------------

/** `checkout.session.completed` and `checkout.session.async_payment_succeeded`. */
async function sessionCompleted(session: Stripe.Checkout.Session, deps: WebhookDeps, db: Database): Promise<string> {
  const now = deps.now();
  const plan = session.metadata?.ai_plan ?? '';
  if (!(PLAN_KINDS as readonly string[]).includes(plan)) {
    return (AI_PLANS as readonly string[]).includes(plan) ? `ignored:${plan}` : 'ignored:unknown-plan';
  }
  const order = await orderForSession(db, session, now);
  if (!order) return 'ignored:unknown-cart';
  const cart = cartFor(order.plan, order.option)!;

  // `paid`, or `no_payment_required` for an agent plan's trial; `unpaid` is a bank debit still clearing.
  const paid = session.payment_status === 'paid';
  const trial = session.payment_status === 'no_payment_required';
  const next: OrderRow['status'] = paid ? 'paid' : trial ? 'trialing' : order.status;
  const firstPayment = paid && order.status !== 'paid' && cart.mode === 'payment';
  await db
    .update(orders)
    .set({
      status: next,
      stripeSessionId: session.id,
      stripeCustomerId: idOf(session.customer as string | { id: string } | null) ?? order.stripeCustomerId,
      stripePaymentIntentId: idOf(session.payment_intent as string | { id: string } | null) ?? order.stripePaymentIntentId,
      stripeSubscriptionId: idOf(session.subscription as string | { id: string } | null) ?? order.stripeSubscriptionId,
      amountTotal: session.amount_total ?? order.amountTotal,
      currency: session.currency ?? order.currency,
      email: order.email ?? session.customer_details?.email?.toLowerCase() ?? null,
      // One-time payments count here; subscription invoices count in `invoice.paid`.
      ...(firstPayment ? { paymentsMade: sql`${orders.paymentsMade} + 1` } : {}),
      ...(paid && !order.paidAt ? { paidAt: now } : {}),
      ...(next !== order.status ? resync : {}),
    })
    .where(eq(orders.id, order.id));
  if (next !== 'paid' && next !== 'trialing') return 'awaiting-payment';

  const provisioned = await provisionOrder(order.id, {
    db,
    log: deps.log,
    now,
    invitesFrom: deps.config.invitesFrom,
    invitesEnabled: deps.config.invitesEnabled,
  });
  if (!provisioned.ok) {
    // Recorded and paid: staff provision it by hand (`provision --order`). Not a reason to fail the event.
    return `paid:not-provisioned:${provisioned.reason}`;
  }

  const fresh = (await orderById(db, order.id))!;
  const subscriptionId = fresh.stripeSubscriptionId;
  const stripe = deps.stripe;
  if (!stripe) {
    deps.log.error({ order: order.id }, 'STRIPE_SECRET_KEY is not set: the subscription follow-ups for this order did not run');
    return 'paid:no-stripe-key';
  }

  if (subscriptionId) {
    // Every subscription carries the order id, so invoice events find it even from a Payment Link;
    // and an agent plan's first charge is exactly Jan 26, whatever trial a link set.
    const sub = await stripe.retrieveSubscription(subscriptionId);
    const update: Stripe.SubscriptionUpdateParams = {};
    if (sub.metadata.order_id !== order.id) {
      update.metadata = { order_id: order.id, ai_plan: cart.plan, ai_option: cart.option, ...(fresh.campaign ? { campaign: fresh.campaign } : {}) };
    }
    const target = Math.floor(AGENTS_FIRST_CHARGE_AT / 1000);
    if (cart.plan === 'agents' && sub.status === 'trialing' && sub.trialEnd !== null && Math.floor(sub.trialEnd / 1000) !== target) {
      update.trial_end = target;
      update.proration_behavior = 'none';
    }
    // Two payments, then none: the subscription is set to end when the last paid period does, so the
    // cancellation date shows in Stripe within a minute of the purchase. `invoice.paid` checks again
    // at the last payment, for a subscription this could not date.
    if (cart.installments && sub.cancelAt === null && sub.currentPeriodEnd !== null) {
      update.cancel_at = Math.floor(addMonths(sub.currentPeriodEnd, cart.installments - 1) / 1000);
      update.proration_behavior = 'none';
    }
    if (Object.keys(update).length) await stripe.updateSubscription(subscriptionId, update, `order-${order.id}-sub`);
  }

  // The library sold through a link that could only carry the $2,000: start its $197 here, on day 31.
  if (cart.plan === 'library' && !subscriptionId) {
    await startMembership(fresh, now + LIBRARY_TRIAL_DAYS * 86_400_000, deps, db);
  }
  // The cohort's later $197, when the buyer ticked its box (or Spring made it automatic).
  if (cart.plan === 'cohort' && fresh.renewalConsentAt !== null) {
    await startMembership(fresh, COHORT_ONE_LIVE_UNTIL, deps, db);
  }
  return 'paid';
}

/**
 * A `membership_monthly` subscription trialing until `startsAt`, on the card the buyer already saved.
 * With no saved card, Stripe emails an invoice instead of charging. Idempotent by the order id.
 */
async function startMembership(order: OrderRow, startsAt: number, deps: WebhookDeps, db: Database): Promise<void> {
  const stripe = deps.stripe!;
  const plan = await planOfOrder(db, order.id);
  if (!plan || plan.stripeSubscriptionId) return;
  const prices = await deps.prices.get(deps.now());
  const price = prices?.membership_monthly;
  if (!price) throw Object.assign(new Error('membership_monthly has no price'), { code: 'no-membership-price' });
  if (!order.stripeCustomerId) throw Object.assign(new Error('order has no customer'), { code: 'no-customer' });

  let card: string | null = null;
  if (order.stripePaymentIntentId) card = await stripe.paymentMethodOfPaymentIntent(order.stripePaymentIntentId);
  if (!card && order.stripeSubscriptionId) card = (await stripe.retrieveSubscription(order.stripeSubscriptionId)).defaultPaymentMethod;

  const sub = await stripe.createSubscription(
    {
      customer: order.stripeCustomerId,
      items: [{ price: price.id }],
      trial_end: Math.floor(startsAt / 1000),
      metadata: { order_id: order.id, ai_plan: 'membership', ai_option: 'monthly' },
      ...(card ? { default_payment_method: card } : { collection_method: 'send_invoice', days_until_due: 7 }),
    },
    `membership-${order.id}`,
  );
  await db.update(plans).set({ stripeSubscriptionId: sub.id }).where(eq(plans.id, plan.id));
  deps.log.info({ order: order.id, plan: plan.id, subscription: sub.id, card: card !== null }, 'membership scheduled');
}

/** `checkout.session.expired`: the order is `expired`, and tagged `checkout-abandoned-<plan>`. */
async function sessionExpired(session: Stripe.Checkout.Session, db: Database): Promise<string> {
  const order = (await orderById(db, session.client_reference_id)) ?? null;
  if (!order || order.status !== 'pending') return 'ignored';
  await db.update(orders).set({ status: 'expired', ...resync }).where(eq(orders.id, order.id));
  return 'expired';
}

/** `checkout.session.async_payment_failed`: a bank payment failed. */
async function asyncFailed(session: Stripe.Checkout.Session, deps: WebhookDeps, db: Database): Promise<string> {
  const order = (await orderById(db, session.client_reference_id)) ?? (await orderForSession(db, session, deps.now()));
  if (!order) return 'ignored';
  await db.update(orders).set({ status: 'failed', paymentFailedAt: deps.now(), ...resync }).where(eq(orders.id, order.id));
  return 'failed';
}

/** `invoice.paid`: for invoices above $0, one more payment, and the plan paid through the period. */
async function invoicePaid(invoice: InvoiceLike, deps: WebhookDeps, db: Database): Promise<string> {
  if ((invoice.amount_paid ?? 0) <= 0) return 'ignored:zero';
  const subscriptionId = subscriptionOfInvoice(invoice);
  // A one-time invoice (the cohort in full) was counted when its session completed.
  if (!subscriptionId) return 'ignored:one-time';
  const now = deps.now();
  const meta = subscriptionMetadataOfInvoice(invoice);
  const order = await orderBySubscription(db, subscriptionId, meta.order_id);
  let result = 'recorded';

  if (order && (order.stripeSubscriptionId === subscriptionId || order.stripeSubscriptionId === null) && meta.ai_plan !== 'membership') {
    const [updated] = await db
      .update(orders)
      .set({
        paymentsMade: sql`${orders.paymentsMade} + 1`,
        stripeSubscriptionId: subscriptionId,
        ...(order.status === 'trialing' || order.status === 'pending' ? { status: 'paid' as const, paidAt: order.paidAt ?? now, ...resync } : {}),
      })
      .where(eq(orders.id, order.id))
      .returning();
    const cart = cartFor(order.plan, order.option);
    // Two payments, then none: the subscription ends at the end of the period the second one paid for.
    if (cart?.installments && updated && updated.paymentsMade >= cart.installments) {
      if (!deps.stripe) throw Object.assign(new Error('no Stripe key'), { code: 'no-stripe-key' });
      const sub = await deps.stripe.retrieveSubscription(subscriptionId);
      if (sub.cancelAt === null) {
        await deps.stripe.updateSubscription(subscriptionId, { cancel_at_period_end: true }, `two-pay-end-${subscriptionId}`);
      }
      result = 'two-pay-complete';
    }
  }

  // The plan this subscription pays for: by its id, or the order's own (library, agents).
  let plan = await planBySubscription(db, subscriptionId);
  if (!plan && order && order.plan !== 'cohort') {
    plan = await planOfOrder(db, order.id);
    if (plan && !plan.stripeSubscriptionId) await db.update(plans).set({ stripeSubscriptionId: subscriptionId }).where(eq(plans.id, plan.id));
  }
  if (!plan && order && (order.status === 'pending' || order.status === 'trialing')) {
    // The invoice arrived before the session's completion: the payment proves the order paid.
    await db.update(orders).set({ status: 'paid', paidAt: order.paidAt ?? now, ...resync }).where(eq(orders.id, order.id));
    await provisionOrder(order.id, { db, log: deps.log, now, invitesFrom: deps.config.invitesFrom, invitesEnabled: deps.config.invitesEnabled });
    if (order.plan !== 'cohort') plan = await planOfOrder(db, order.id);
  }
  const periodEnd = periodEndOfInvoice(invoice);
  if (plan && plan.status !== 'ended' && periodEnd !== null) {
    await db
      .update(plans)
      .set({
        status: 'active',
        paidThrough: Math.max(plan.paidThrough ?? 0, periodEnd),
        liveUntil: plan.liveUntil === null ? null : Math.max(plan.liveUntil, periodEnd),
      })
      .where(eq(plans.id, plan.id));
  }
  return result;
}

/** `invoice.payment_failed`: the plan is `past_due` and the buyer tagged `payment-failed`. */
async function invoiceFailed(invoice: InvoiceLike, deps: WebhookDeps, db: Database): Promise<string> {
  const subscriptionId = subscriptionOfInvoice(invoice);
  if (!subscriptionId) return 'ignored';
  const meta = subscriptionMetadataOfInvoice(invoice);
  const order = await orderBySubscription(db, subscriptionId, meta.order_id);
  const plan = (await planBySubscription(db, subscriptionId)) ?? (order ? await planOfOrder(db, order.id) : null);
  if (plan && plan.status !== 'ended') await db.update(plans).set({ status: 'past_due' }).where(eq(plans.id, plan.id));
  const tagged = order ?? (plan ? await orderById(db, plan.orderId) : null);
  if (tagged) await db.update(orders).set({ paymentFailedAt: deps.now(), ...resync }).where(eq(orders.id, tagged.id));
  return tagged ? 'past-due' : 'ignored:unknown';
}

/** `customer.subscription.updated` and `.deleted`: mirror the status. */
async function subscriptionChanged(sub: Stripe.Subscription, deleted: boolean, deps: WebhookDeps, db: Database): Promise<string> {
  const now = deps.now();
  const order = await orderBySubscription(db, sub.id, sub.metadata?.order_id);
  const plan = await planBySubscription(db, sub.id);

  if (deleted && order && order.stripeSubscriptionId === sub.id) {
    const cart = cartFor(order.plan, order.option);
    if (cart?.installments) {
      // Two-pay that ended after its payments is complete, not cancelled.
      if (order.paymentsMade >= cart.installments) return 'two-pay-complete';
      deps.log.error({ order: order.id, payments: order.paymentsMade }, 'a two-pay subscription ended before its last payment: Connor follows up');
      const cohortPlan = await planOfOrder(db, order.id);
      if (cohortPlan && cohortPlan.status !== 'ended') await db.update(plans).set({ status: 'past_due' }).where(eq(plans.id, cohortPlan.id));
      return 'two-pay-unpaid';
    }
  }
  if (!plan) return 'ignored:no-plan';
  if (plan.status === 'ended') return 'ignored:ended';

  if (deleted || sub.status === 'canceled') {
    // Cancel and keep: `paid_through` stays; live sessions end with the period that was paid for.
    const end = plan.paidThrough ?? now;
    await db
      .update(plans)
      .set({ status: 'canceled', liveUntil: plan.liveUntil === null ? end : Math.min(plan.liveUntil, Math.max(end, now)) })
      .where(eq(plans.id, plan.id));
    await db.update(orders).set({ membershipEndedAt: now, ...resync }).where(eq(orders.id, plan.orderId));
    return 'canceled';
  }
  await db.update(plans).set({ status: planStatusOf(sub.status) }).where(eq(plans.id, plan.id));
  return `status:${planStatusOf(sub.status)}`;
}

/** `charge.refunded`: a full refund ends the plan and its access, stops later charges, and tags `refunded`. */
async function chargeRefunded(charge: Stripe.Charge, deps: WebhookDeps, db: Database): Promise<string> {
  if (!charge.refunded) return 'ignored:partial';
  const pi = idOf(charge.payment_intent as string | { id: string } | null);
  let order: OrderRow | null = null;
  if (pi) {
    const [row] = await db.select().from(orders).where(eq(orders.stripePaymentIntentId, pi)).limit(1);
    order = row ?? null;
    if (!order && deps.stripe) {
      const subscriptionId = await deps.stripe.subscriptionOfPaymentIntent(pi);
      if (subscriptionId) {
        order = await orderBySubscription(db, subscriptionId);
        if (!order) {
          const plan = await planBySubscription(db, subscriptionId);
          if (plan) order = await orderById(db, plan.orderId);
        }
      }
    }
  }
  if (!order) {
    deps.log.warn({ charge: charge.id }, 'a refund matched no order (a Tap to Pay sale or the $1 test): nothing to end');
    return 'ignored:unknown';
  }
  const now = deps.now();
  await db.update(orders).set({ status: 'refunded', refundedAt: now, ...resync }).where(eq(orders.id, order.id));
  const plan = await planOfOrder(db, order.id);
  if (plan) await db.update(plans).set({ status: 'ended', liveUntil: now }).where(eq(plans.id, plan.id));
  // No further charges: the plan's subscription and the order's own (two-pay) are cancelled.
  const subs = [...new Set([plan?.stripeSubscriptionId, order.stripeSubscriptionId].filter((s): s is string => !!s))];
  for (const id of subs) {
    if (!deps.stripe) throw Object.assign(new Error('no Stripe key'), { code: 'no-stripe-key' });
    const sub = await deps.stripe.retrieveSubscription(id);
    if (sub.status !== 'canceled' && sub.status !== 'incomplete_expired') await deps.stripe.cancelSubscription(id);
  }
  return 'refunded';
}

/** One event. Returns a short word for the log; throws to have Stripe retry. */
export async function handleStripeEvent(event: Stripe.Event, deps: WebhookDeps): Promise<string> {
  const db = deps.db ?? getDb();
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return sessionCompleted(event.data.object, deps, db);
    case 'checkout.session.async_payment_failed':
      return asyncFailed(event.data.object, deps, db);
    case 'checkout.session.expired':
      return sessionExpired(event.data.object, db);
    case 'invoice.paid':
      return invoicePaid(event.data.object as unknown as InvoiceLike, deps, db);
    case 'invoice.payment_failed':
      return invoiceFailed(event.data.object as unknown as InvoiceLike, deps, db);
    case 'customer.subscription.updated':
      return subscriptionChanged(event.data.object, false, deps, db);
    case 'customer.subscription.deleted':
      return subscriptionChanged(event.data.object, true, deps, db);
    case 'charge.refunded':
      return chargeRefunded(event.data.object, deps, db);
    default:
      return 'ignored:type';
  }
}


