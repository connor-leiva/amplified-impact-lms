// `POST /api/stripe/webhook`: the only thing that marks an order paid (D-075, D-077).
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
// PAYMENT LINKS ARE THE ONLY WAY TO BUY (D-104: the site's own checkout is retired). A session becomes
// an order here, built from the link's metadata (`ai_plan`, `ai_option`, `billing`, `campaign`) and the
// custom fields Ampy adds (`company`, `crm`, `agents`). A Team Plan session must say
// `billing=forum_prepay`; one that does not is from an older link and is not provisioned. An Amplified
// Agent Plan session (`ai_plan=agent_plan`, `ai_option=monthly|yearly`, D-106) is a trial with nothing
// due today: its order is `trialing`, its plan opens nothing until the Jan 4, 2027 invoice is paid, and
// its subscription's `trial_end` is pinned to that day.
//
// NEVER LOGGED: names, emails, phone numbers. Order, account, plan and Stripe ids only.

import { eq, sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { orders, plans, stripeEvents } from '../db/schema';
import { randomIds } from '../lib/clock';
import { AGREEMENT_VERSION } from './agreement';
import { AI_PLANS, INSIDERS_FIRST_CHARGE_AT, PLAN_KINDS, SKILL_AI_PLAN, cartFor, cartForMetadata, pinnedFirstCharge } from './catalog';
import { refundSkillPurchase, skillCheckoutCompleted } from './skill-purchase';
import type { PlanStatus } from './catalog';
import type { OfferConfig } from './config';
import type { PriceCache } from './prices';
import { provisionOrder } from './provision';
import type { BillingLog } from './provision';
import { reconcileAcceleratorSeats } from './payment-links';
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

/** The order's GHL copy is out of date: the sync loop picks it up on its next pass (D-076). */
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

/**
 * A Payment Link's custom field. By key first, from the keys the links use (`company_or_team_name` on
 * the live test links, `company` in the first handoff), then by a word in its label, so a renamed
 * field still lands. Null when the link asks nothing of the kind.
 */
function customField(session: Stripe.Checkout.Session, keys: readonly string[], labelWord: RegExp): string | null {
  const fields = session.custom_fields ?? [];
  const field =
    keys.map((k) => fields.find((f) => f.key === k)).find((f) => f !== undefined) ??
    fields.find((f) => labelWord.test(f.label?.custom ?? ''));
  if (!field) return null;
  const value = field.text?.value ?? field.dropdown?.value ?? field.numeric?.value ?? null;
  return value === null || value === '' ? null : String(value);
}

const COMPANY_KEYS = ['company_or_team_name', 'company', 'team_name', 'companyorteamname'] as const;
const CRM_KEYS = ['crm', 'which_crm', 'which_crm_does_your_team_use', 'whichcrmdoesyourteamuse'] as const;
const AGENT_KEYS = ['agents', 'number_of_agents', 'numberofagents', 'agent_count', 'agentcount'] as const;

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
  const cart = cartForMetadata(meta);
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
      company: customField(session, COMPANY_KEYS, /company|team name/i),
      crm: crmOf(customField(session, CRM_KEYS, /\bcrm\b/i)),
      teamSize: teamSizeOfAgents(customField(session, AGENT_KEYS, /agents/i)),
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

/**
 * `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
 *
 * A session with no `ai_plan` is ignored. That includes the stopgap single-skill Payment Link,
 * whose only clue is a `skill` dropdown (the skill id with the hyphens removed) and which carries
 * no `ai_plan`. It must not become a plan and it must not become a `skill_purchases` row. Those
 * buyers are backfilled by hand, after the fact.
 */
async function sessionCompleted(session: Stripe.Checkout.Session, deps: WebhookDeps, db: Database): Promise<string> {
  const now = deps.now();
  if ((session.metadata?.ai_plan ?? '') === SKILL_AI_PLAN) return skillCheckoutCompleted(session, db, now, deps.log);
  const plan = session.metadata?.ai_plan ?? '';
  if (!(PLAN_KINDS as readonly string[]).includes(plan)) {
    return (AI_PLANS as readonly string[]).includes(plan) ? `ignored:${plan}` : 'ignored:unknown-plan';
  }
  const meta = session.metadata ?? {};
  if (!session.client_reference_id && !meta.order_id && cartFor(meta.ai_plan ?? '', meta.ai_option ?? '') && !cartForMetadata(meta)) {
    // A Team Plan link from before the prepay (no `billing=forum_prepay`): paid on terms no cart sells.
    deps.log.error({ session: session.id, plan: meta.ai_plan, option: meta.ai_option }, 'a session from an older Payment Link was not provisioned: Connor follows up');
    return 'ignored:older-link';
  }
  const order = await orderForSession(db, session, now);
  if (!order) return 'ignored:unknown-cart';
  const cart = cartFor(order.plan, order.option)!;

  // `paid`, or `no_payment_required` for a trial with nothing due today; `unpaid` is a bank debit still clearing.
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
  const pinAt = pinnedFirstCharge(cart);
  if (cart.plan === 'agent_plan' && paid && pinAt !== null && now < pinAt) {
    // The Agent Plan's links sell a trial to Jan 4. A charge today means a link lost its trial: the
    // buyer is billed from today, not from Jan 4. Provisioned as paid; Connor and Ampy look at the link.
    deps.log.error({ session: session.id, order: order.id, option: cart.option }, 'an Agent Plan checkout charged before Jan 4: its Payment Link has no trial. Connor follows up');
  }

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
    // Every subscription carries the order id, so invoice events find it even from a Payment Link.
    const sub = await stripe.retrieveSubscription(subscriptionId);
    const update: Stripe.SubscriptionUpdateParams = {};
    if (sub.metadata.order_id !== order.id) {
      update.metadata = { order_id: order.id, ai_plan: cart.plan, ai_option: cart.option, ...(fresh.campaign ? { campaign: fresh.campaign } : {}) };
    }
    // Fixed calendar dates, whatever relative trial a Payment Link set on the day it was last edited:
    // the Amplified Agent Plan's first charge is Jan 4, 2027; an Amplified Team Plan's monthly billing
    // starts Apr 4, 2027; the AI Accelerator in full rolls into Amplified Insiders on May 4, 2027 (its
    // subscription carries the membership). Only a date still ahead: Stripe refuses a past `trial_end`,
    // and an Agent Plan bought after Jan 4 keeps whatever its link sold.
    if (pinAt !== null && pinAt > now && sub.status === 'trialing' && sub.trialEnd !== null && Math.floor(sub.trialEnd / 1000) !== Math.floor(pinAt / 1000)) {
      update.trial_end = Math.floor(pinAt / 1000);
      update.proration_behavior = 'none';
    }
    if (Object.keys(update).length) await stripe.updateSubscription(subscriptionId, update, `order-${order.id}-sub`);
  }

  // Every paid AI Accelerator order rolls into Amplified Insiders on May 4, 2027, whichever link it
  // came through: it is the offer's terms, agreed to at checkout.
  if (cart.plan === 'cohort') await ensureInsiders(fresh, session.id, deps, db);
  return 'paid';
}

/**
 * A `membership_monthly` subscription trialing until `startsAt`, on the card the buyer already saved.
 * With no saved card, Stripe emails an invoice instead of charging. Idempotent by `opts.key`, and
 * skipped when the customer already has an active or trialing membership, so a retried webhook never
 * enrolls anyone twice.
 */
async function startMembership(
  order: OrderRow,
  startsAt: number,
  deps: WebhookDeps,
  db: Database,
  opts: { key: string; source: { plan: string; option: string; session: string } | null },
): Promise<void> {
  const stripe = deps.stripe!;
  const plan = await planOfOrder(db, order.id);
  if (!plan || plan.stripeSubscriptionId) return;
  const prices = await deps.prices.get(deps.now());
  const price = prices?.membership_monthly;
  if (!price) throw Object.assign(new Error('membership_monthly has no price'), { code: 'no-membership-price' });
  if (!order.stripeCustomerId) throw Object.assign(new Error('order has no customer'), { code: 'no-customer' });

  const existing = await stripe.activeSubscriptionWithPrice(order.stripeCustomerId, price.id);
  if (existing) {
    deps.log.warn({ order: order.id, plan: plan.id, subscription: existing }, 'customer already has a membership; none created');
    return;
  }

  let card: string | null = null;
  if (order.stripePaymentIntentId) card = await stripe.paymentMethodOfPaymentIntent(order.stripePaymentIntentId);
  if (!card && order.stripeSubscriptionId) card = (await stripe.retrieveSubscription(order.stripeSubscriptionId)).defaultPaymentMethod;

  const sub = await stripe.createSubscription(
    {
      customer: order.stripeCustomerId,
      items: [{ price: price.id }],
      trial_end: Math.floor(startsAt / 1000),
      metadata: {
        order_id: order.id,
        ai_plan: 'membership',
        ai_option: 'monthly',
        origin: order.origin,
        ...(order.campaign ? { campaign: order.campaign } : {}),
        ...(opts.source ? { source_plan: opts.source.plan, source_option: opts.source.option, source_session: opts.source.session } : {}),
      },
      ...(card ? { default_payment_method: card } : { collection_method: 'send_invoice', days_until_due: 7 }),
    },
    opts.key,
  );
  await db.update(plans).set({ stripeSubscriptionId: sub.id }).where(eq(plans.id, plan.id));
  deps.log.info({ order: order.id, plan: plan.id, subscription: sub.id, card: card !== null }, 'membership scheduled');
}

/**
 * An AI Accelerator order's Amplified Insiders. Paid in full, the order's own subscription carries it
 * (`membership_monthly` trialing until May 4), so the plan points there. Two payments, the installments
 * are their own subscription and Insiders is a separate one, created here with `trial_end` pinned to
 * May 4, 2027 and the idempotency key `membership-autoroll-<session>` (the Stripe-side requirements,
 * section B): sharing one subscription would delay or cancel the installments with the membership. A
 * buyer who already holds Insiders (bought on its own) is not enrolled twice (`startMembership`).
 */
async function ensureInsiders(order: OrderRow, sessionId: string, deps: WebhookDeps, db: Database): Promise<void> {
  const plan = await planOfOrder(db, order.id);
  if (!plan) return;
  if (order.option === 'full' && order.stripeSubscriptionId) {
    if (plan.stripeSubscriptionId !== order.stripeSubscriptionId) {
      await db.update(plans).set({ stripeSubscriptionId: order.stripeSubscriptionId }).where(eq(plans.id, plan.id));
    }
    return;
  }
  await startMembership(order, INSIDERS_FIRST_CHARGE_AT, deps, db, {
    key: `membership-autoroll-${sessionId}`,
    source: { plan: order.plan, option: order.option, session: sessionId },
  });
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

  // A membership invoice counts toward its own Insiders order, never toward the AI Accelerator order
  // whose roll-on Insiders it is (that subscription carries the Accelerator's `order_id`).
  const rollOn = meta.ai_plan === 'membership' && order?.plan !== 'membership';
  if (order && (order.stripeSubscriptionId === subscriptionId || order.stripeSubscriptionId === null) && !rollOn) {
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
    // D-143: an installment paid after a failed one lifts the pause on the AI Accelerator it pays for
    // (`invoiceFailed` reached that plan through the order, so this does too). Only the status: the
    // plan's own dates run to May 4 whatever the installments' periods say.
    if (cart?.installments) {
      const cohortPlan = await planOfOrder(db, order.id);
      if (cohortPlan && cohortPlan.status === 'past_due') {
        await db.update(plans).set({ status: 'active' }).where(eq(plans.id, cohortPlan.id));
        if (result === 'recorded') result = 'two-pay-resumed';
      }
    }
  }

  // The plan this subscription pays for: by its id, or the order's own (Insiders, the Team Plan).
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
  let periodEnd = periodEndOfInvoice(invoice);
  // The first invoice of a cart that charges a one-time item beside a trialing recurring one (the AI
  // Accelerator in full, the Team Plan) carries the trial line, which ends where the link's relative
  // trial did; the pinned first charge replaces that date (`sessionCompleted`), so the plan is paid
  // through the pin, not past it. The Agent Plan sells its one recurring item alone: its trial invoice
  // is $0 (ignored above), and anything it does pay covers its own period.
  const planCart = plan ? cartFor(plan.kind, plan.option) : null;
  const pin = planCart && planCart.items.length > 1 ? pinnedFirstCharge(planCart) : null;
  if (pin !== null && periodEnd !== null && periodEnd > pin && now < pin) periodEnd = pin;
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

  // A 3-month minimum (Amplified Insiders paid monthly) is a contract term. A cancel inside it (the
  // public portal login cannot hide the button) stops Stripe, not what is owed: Connor follows up. The
  // Team Plan's minimum is paid at checkout, so it has none left to break. Logged by ids only.
  const cancelling = deleted || sub.status === 'canceled' || sub.cancel_at_period_end === true;
  if (cancelling && plan.minimumUntil !== null && now < plan.minimumUntil) {
    deps.log.error({ plan: plan.id, order: plan.orderId, subscription: sub.id, kind: plan.kind }, 'a plan was cancelled inside its 3-month minimum: Connor follows up');
  }

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
  const skill = await refundSkillPurchase(pi, db, deps.now());
  if (skill) return skill;
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

/**
 * D-154: the events that can add or end an AI Accelerator plan, after which the combined 15-seat cap
 * is reconciled on Stripe at once (the billing loop's tick is the backstop).
 */
const SEAT_EVENTS: ReadonlySet<string> = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'invoice.paid',
  'charge.refunded',
  'customer.subscription.deleted',
]);

/** One event. Returns a short word for the log; throws to have Stripe retry. */
export async function handleStripeEvent(event: Stripe.Event, deps: WebhookDeps): Promise<string> {
  const db = deps.db ?? getDb();
  const result = await handleEvent(event, deps, db);
  // Never throws: a Stripe failure here must not make Stripe redeliver an event that was handled.
  if (SEAT_EVENTS.has(event.type)) await reconcileAcceleratorSeats({ stripe: deps.stripe, config: deps.config, now: deps.now(), log: deps.log, db });
  return result;
}

async function handleEvent(event: Stripe.Event, deps: WebhookDeps, db: Database): Promise<string> {
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


