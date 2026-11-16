// The Admin Console's confirmed Billing actions, PR 5 (D-164, spec § 7.6 "Actions (PR 5)"): the only
// Stripe writes the Console makes. Registered by `registerConsoleRoutes` in its scope, so its
// `private, no-store` hook covers every answer here, refusals and 429s included.
//
//   POST /api/console/billing/refund/preview  { invoiceId, amountCents? }   billing.refund
//   POST /api/console/billing/refund          { confirmToken, reason, typed }
//   POST /api/console/billing/void/preview    { invoiceId }                 billing.void
//   POST /api/console/billing/void            { confirmToken, reason, typed }
//
// Owner and Admin only (spec § 5); 5 a minute per session per route (spec § 7); writes, so
// `requireJsonSameOrigin`; refused during a masquerade by 3a's write block (D-162), audited with the
// staff member as actor.
//
// A PREVIEW reads Stripe fresh (never the 10-minute cache) and answers `{ summary, consequences,
// confirmToken, expiresAt }`: what the action is, what `billing/webhook.ts` will then do (core's
// `refundConsequences` / `voidConsequences`, from the same rows the webhook reads), and a token bound
// to the action, its parameters, the staff member and an expiry 5 minutes on (`confirm.ts`). It writes
// nothing, but it reserves the audit row's id, which a refund sends to Stripe as `console_audit_id`.
//
// AN EXECUTE takes that token, a reason of 10 to 500 characters (kept in the audit row, never sent to
// Stripe) and what staff typed to confirm (the amount; the invoice id). It re-reads Stripe, so the amount
// is never more than is left to refund now and the invoice is still voidable now, then makes the one
// write with the idempotency key `console-` + sha256(token). One audit row records it: `ok` with
// `before` and `after` (under the reserved id), or `failed` with Stripe's code (or ours). A token that
// isn't valid is 403 `confirm_invalid`; an expired one 410 `confirm_expired`; one already used 409
// `confirm_used`; each refusal is a `denied` row. Afterwards the cached reads of that invoice and the
// summary are forgotten, so Billing's lists show the change.
//
// The seat tier (spec D4) has no route: its gate failed (`console-billing-actions.ts`, D-164).

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import {
  BILLING_ACTION_CAPS,
  BILLING_ACTION_PATHS,
  BILLING_ACTION_RATE,
  CONFIRM_TTL_MS,
  cleanReason,
  confirmTextOf,
  isPlanKind,
  refundConsequences,
  refundEndsSeat,
  refundIsFull,
  refundableOf,
  stripeScopeMessage,
  stripeWriteScopeMessage,
  typedConfirms,
  voidConsequences,
} from '@ai/core';
import type { BillingAction, BillingActionPreview, BillingActionResult, RefundMatch } from '@ai/core';
import type { PlanKind, PlanStatus } from '@ai/core/offer';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { cohortSeatsSold } from '../billing/provision';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { accounts, auditLog, orders, plans, teams } from '../db/schema';
import { clock } from '../lib/clock';
import { audit, reserveAuditId } from './audit';
import type { AuditActor, AuditInput } from './audit';
import { idempotencyKeyOf, signConfirm, verifyConfirm } from './confirm';
import type { ConfirmCheck, ConfirmClaims } from './confirm';
import { consoleError, requireConsole, staffActor } from './guard';
import { StripeReadError, StripeScopeError } from './stripe-read';
import type { ConsoleStripe, ReadInvoice } from './stripe-read';
import { StripeWriteError, StripeWriteScopeError } from './stripe-write';
import type { ConsoleStripeWrite } from './stripe-write';

/** `CONSOLE_PATHS`' names for the four routes. */
export const BILLING_ACTION_ROUTES = {
  billingRefundPreview: BILLING_ACTION_PATHS.refundPreview,
  billingRefund: BILLING_ACTION_PATHS.refund,
  billingVoidPreview: BILLING_ACTION_PATHS.voidPreview,
  billingVoid: BILLING_ACTION_PATHS.void,
} as const;

/** The invoice a write acted on, so the cache can forget its rows. */
export interface ActedOn {
  invoiceId: string;
  chargeId: string | null;
  paymentIntentId: string | null;
}

export interface BillingActionDeps {
  /** Stripe's reads, uncached: a preview and an execute always see Stripe as it is now. */
  read: ConsoleStripe | null;
  write: ConsoleStripeWrite | null;
  /** After a write: forget the cached reads `staleAfter` names, and the summary. */
  afterWrite: (ref: ActedOn) => void;
}

/** The cached reads a refund or a void of `ref` makes stale: every invoice and refund list, its invoice and its payment. */
export const staleAfter =
  (ref: ActedOn) =>
  (method: keyof ConsoleStripe, args: unknown[]): boolean => {
    if (method === 'listInvoices' || method === 'listRefunds') return true;
    if (method === 'retrieveInvoice') return args[0] === ref.invoiceId;
    if (method === 'retrieveCharge') {
      const a = (args[0] ?? {}) as { chargeId?: string | null; paymentIntentId?: string | null };
      return (!!ref.chargeId && a.chargeId === ref.chargeId) || (!!ref.paymentIntentId && a.paymentIntentId === ref.paymentIntentId);
    }
    return false;
  };

type Staff = Extract<AuditActor, { source: 'staff' }>;
type PlanFacts = { kind: PlanKind; seats: number; status: PlanStatus };

const INVOICE_ID = /^in_[A-Za-z0-9]{1,64}$/;
const bodyOf = (req: FastifyRequest): Record<string, unknown> =>
  req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

// --- what the webhook will find (read-only mirrors of `billing/webhook.ts`'s own lookups) ------------

const planFacts = (p: { kind: string; seats: number; status: string } | undefined): PlanFacts | null =>
  p && isPlanKind(p.kind) ? { kind: p.kind, seats: p.seats, status: p.status as PlanStatus } : null;

/**
 * The order `chargeRefunded` finds for a payment, in its order: by the payment intent; else by the
 * subscription Stripe ties the payment to (here, the invoice's own: `subscriptionOfPaymentIntent` reads
 * the same invoice), an order on it, else the order of a plan on it. No payment intent: none.
 */
export async function refundMatch(db: Database, ref: { paymentIntentId: string | null; subscriptionId: string | null }): Promise<RefundMatch | null> {
  if (!ref.paymentIntentId) return null;
  const pick = { id: orders.id, sub: orders.stripeSubscriptionId };
  let [order] = await db.select(pick).from(orders).where(eq(orders.stripePaymentIntentId, ref.paymentIntentId)).limit(1);
  if (!order && ref.subscriptionId) {
    [order] = await db.select(pick).from(orders).where(eq(orders.stripeSubscriptionId, ref.subscriptionId)).limit(1);
    if (!order) {
      const [p] = await db.select({ orderId: plans.orderId }).from(plans).where(eq(plans.stripeSubscriptionId, ref.subscriptionId)).limit(1);
      if (p) [order] = await db.select(pick).from(orders).where(eq(orders.id, p.orderId)).limit(1);
    }
  }
  if (!order) return null;
  const [plan] = await db
    .select({ kind: plans.kind, seats: plans.seats, status: plans.status, sub: plans.stripeSubscriptionId })
    .from(plans)
    .where(eq(plans.orderId, order.id))
    .limit(1);
  return {
    orderId: order.id,
    plan: planFacts(plan),
    subscriptions: [...new Set([plan?.sub, order.sub].filter((s): s is string => !!s))],
  };
}

/** The plan `subscriptionChanged` finds for a subscription (`planBySubscription`). */
async function planOfSubscription(db: Database, subscriptionId: string | null): Promise<PlanFacts | null> {
  if (!subscriptionId) return null;
  const [p] = await db.select({ kind: plans.kind, seats: plans.seats, status: plans.status }).from(plans).where(eq(plans.stripeSubscriptionId, subscriptionId)).limit(1);
  return planFacts(p);
}

/** The invoice's customer as Billing's list names it: Stripe's name, else the workspace's. */
async function customerNameOf(db: Database, inv: ReadInvoice): Promise<string | null> {
  if (inv.customerName) return inv.customerName;
  if (!inv.customerId) return null;
  const [a] = await db
    .select({ team: teams.name, own: accounts.name })
    .from(accounts)
    .leftJoin(teams, eq(teams.id, accounts.teamId))
    .where(eq(accounts.stripeCustomerId, inv.customerId))
    .limit(1);
  return a ? (a.team ?? a.own) : null;
}

// --- refusals ------------------------------------------------------------------------------------

/** What a failure leaves in the audit row: a code, the scope, never a message. */
function failureFacts(e: unknown): Record<string, unknown> {
  if (e instanceof StripeWriteScopeError) return { code: 'stripe_permission_missing', scope: e.scope, access: 'Write' };
  if (e instanceof StripeScopeError) return { code: 'stripe_permission_missing', scope: e.scope, access: 'Read' };
  if (e instanceof StripeWriteError) return { code: e.reason, answered: e.answered };
  if (e instanceof StripeReadError) return { code: e.reason };
  return { code: 'error' };
}

/** A Stripe failure as the Console's answer; anything else goes on up (a 500). */
function stripeRefusal(req: FastifyRequest, reply: FastifyReply, e: unknown): FastifyReply {
  if (e instanceof StripeWriteScopeError) {
    req.log.warn({ scope: e.scope }, 'console billing: the Stripe key lacks a Write permission');
    return reply.code(503).send({ error: stripeWriteScopeMessage(e.scope), code: 'stripe_permission_missing', scope: e.scope });
  }
  if (e instanceof StripeScopeError) {
    req.log.warn({ scope: e.scope }, 'console billing: the Stripe key lacks a Read permission');
    return reply.code(503).send({ error: stripeScopeMessage(e.scope), code: 'stripe_permission_missing', scope: e.scope });
  }
  if (e instanceof StripeReadError) {
    if (e.reason === 'resource_missing') return consoleError(reply, 'not_found');
    req.log.warn({ reason: e.reason }, 'console billing: a Stripe read failed');
    return consoleError(reply, 'stripe_unavailable');
  }
  if (e instanceof StripeWriteError) {
    req.log.warn({ reason: e.reason, answered: e.answered }, 'console billing: a Stripe write failed');
    if (e.answered) return consoleError(reply, 'stripe_refused', `Stripe refused this change (${e.reason}). Nothing was changed.`);
    return consoleError(reply, 'stripe_unavailable', 'Stripe didn’t answer, so it isn’t known whether this went through. Try again: this confirmation can’t make the change twice.');
  }
  throw e;
}

/** The ok row under the id the preview reserved. A second execute racing the first finds it written. */
async function auditOnce(req: FastifyRequest, input: AuditInput): Promise<void> {
  try {
    await audit(req, input);
  } catch (e) {
    const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (code !== '23505') throw e;
  }
}

const used = async (db: Database, id: number): Promise<boolean> =>
  (await db.select({ id: auditLog.id }).from(auditLog).where(eq(auditLog.id, id)).limit(1)).length > 0;

// --- the routes ----------------------------------------------------------------------------------

export function registerBillingActionRoutes(scope: FastifyInstance, deps: BillingActionDeps): void {
  const opts = (action: BillingAction) => ({
    config: { rateLimit: { max: BILLING_ACTION_RATE, timeWindow: '1 minute' } },
    preHandler: [requireSession, requireJsonSameOrigin, requireConsole(BILLING_ACTION_CAPS[action])],
  });
  const staff = (req: FastifyRequest): Staff => staffActor(viewerOrThrow(req))!;
  const invoiceIdOf = (req: FastifyRequest): string | null => {
    const v = bodyOf(req).invoiceId;
    return typeof v === 'string' && INVOICE_ID.test(v) ? v : null;
  };

  /** A token that isn't valid, has expired or was used: one `denied` row, then the refusal. */
  const refuse = async (req: FastifyRequest, reply: FastifyReply, action: BillingAction, actor: Staff, code: 'confirm_invalid' | 'confirm_expired' | 'confirm_used', claims?: ConfirmClaims) => {
    await audit(req, {
      action: `billing.${action}`,
      outcome: 'denied',
      actor,
      // Only a genuine token's invoice is believed.
      target: { type: 'invoice', id: claims ? String(claims.p.inv) : null, label: claims ? str(claims.p.who) : null },
      after: { code },
    });
    return consoleError(reply, code);
  };

  /** The execute's shared front: the token, the reason, what was typed, Stripe, and the token unused. */
  const confirmed = async (req: FastifyRequest, reply: FastifyReply, action: BillingAction): Promise<{ claims: ConfirmClaims; token: string; reason: string; actor: Staff } | FastifyReply> => {
    const actor = staff(req);
    const b = bodyOf(req);
    const check: ConfirmCheck = verifyConfirm(b.confirmToken, { act: action, sub: actor.userId, now: clock.now() });
    if (!check.ok) return refuse(req, reply, action, actor, check.code, check.claims);
    const { claims } = check;
    const reason = cleanReason(b.reason);
    if (reason === null) return consoleError(reply, 'reason_required');
    const expected = { amountCents: Number(claims.p.amt), invoiceId: String(claims.p.inv) };
    if (!typedConfirms(action, b.typed, expected)) return consoleError(reply, 'confirm_mismatch');
    if (!deps.read || !deps.write) return consoleError(reply, 'stripe_not_connected');
    if (await used(getDb(), claims.aid)) return refuse(req, reply, action, actor, 'confirm_used', claims);
    return { claims, token: b.confirmToken as string, reason, actor };
  };

  // --- refund ------------------------------------------------------------------------------------

  scope.post(BILLING_ACTION_PATHS.refundPreview, opts('refund'), async (req, reply): Promise<FastifyReply> => {
    const actor = staff(req);
    const invoiceId = invoiceIdOf(req);
    if (!invoiceId) return consoleError(reply, 'invalid_body', 'That invoiceId isn’t valid.');
    const asked = bodyOf(req).amountCents;
    if (asked !== undefined && asked !== null && !(Number.isSafeInteger(asked) && (asked as number) > 0))
      return consoleError(reply, 'invalid_body', 'That amountCents isn’t valid.');
    if (!deps.read || !deps.write) return consoleError(reply, 'stripe_not_connected');
    try {
      const inv = await deps.read.retrieveInvoice(invoiceId);
      if (inv.status !== 'paid' || (!inv.paymentIntentId && !inv.chargeId)) return consoleError(reply, 'invoice_not_refundable');
      const charge = await deps.read.retrieveCharge({ chargeId: inv.chargeId, paymentIntentId: inv.paymentIntentId });
      if (!charge) return consoleError(reply, 'invoice_not_refundable');
      const refundable = refundableOf(charge.amountCents, charge.refundedCents);
      const amount = typeof asked === 'number' ? asked : refundable;
      if (refundable <= 0 || amount > refundable) return consoleError(reply, 'refund_too_large');
      const db = getDb();
      const facts = {
        amountCents: amount,
        chargeAmountCents: charge.amountCents,
        refundedCents: charge.refundedCents,
        match: await refundMatch(db, { paymentIntentId: inv.paymentIntentId, subscriptionId: inv.subscriptionId }),
        seatsSold: null as number | null,
      };
      if (refundEndsSeat(facts)) facts.seatsSold = await cohortSeatsSold(db);
      const who = await customerNameOf(db, inv);
      const claims: ConfirmClaims = {
        act: 'refund',
        p: { inv: inv.id, ch: inv.chargeId ?? charge.id, pi: inv.paymentIntentId, amt: amount, who },
        sub: actor.userId,
        exp: clock.now() + CONFIRM_TTL_MS,
        aid: await reserveAuditId(db),
      };
      const out: BillingActionPreview = {
        action: 'refund',
        summary: {
          invoiceId: inv.id,
          customerName: who,
          amountCents: amount,
          paymentMethod: charge.paymentMethod,
          refund: { kind: refundIsFull(facts) ? 'full' : 'partial', refundableCents: refundable },
          confirmText: confirmTextOf('refund', { amountCents: amount, invoiceId: inv.id }),
        },
        consequences: refundConsequences(facts),
        confirmToken: signConfirm(claims),
        expiresAt: claims.exp,
      };
      return reply.send(out);
    } catch (e) {
      return stripeRefusal(req, reply, e);
    }
  });

  scope.post(BILLING_ACTION_PATHS.refund, opts('refund'), async (req, reply): Promise<FastifyReply> => {
    const ok = await confirmed(req, reply, 'refund');
    if (!('claims' in ok)) return ok;
    const { claims, token, reason, actor } = ok;
    const ref: ActedOn = { invoiceId: String(claims.p.inv), chargeId: str(claims.p.ch), paymentIntentId: str(claims.p.pi) };
    const amount = Number(claims.p.amt);
    const base = { action: 'billing.refund' as const, actor, reason, target: { type: 'invoice', id: ref.invoiceId, label: str(claims.p.who) } };
    let before: { chargeId: string | null; amountCents: number | null; refundedCents: number | null; refundableCents: number };
    try {
      // Re-read now: the amount is never more than Stripe has left to refund, whatever the preview said.
      // The same payment the refund goes to: the payment intent's charge when there is one.
      const charge = await deps.read!.retrieveCharge({ chargeId: ref.paymentIntentId ? null : ref.chargeId, paymentIntentId: ref.paymentIntentId });
      const refundable = charge ? refundableOf(charge.amountCents, charge.refundedCents) : 0;
      before = { chargeId: charge?.id ?? ref.chargeId, amountCents: charge?.amountCents ?? null, refundedCents: charge?.refundedCents ?? null, refundableCents: refundable };
      if (amount > refundable) {
        await audit(req, { ...base, outcome: 'failed', before, after: { code: 'refund_too_large', amountCents: amount } });
        return consoleError(reply, 'refund_too_large');
      }
    } catch (e) {
      await audit(req, { ...base, outcome: 'failed', after: failureFacts(e) });
      return stripeRefusal(req, reply, e);
    }
    let refund;
    try {
      refund = await deps.write!.createRefund(
        {
          paymentIntentId: ref.paymentIntentId,
          chargeId: ref.paymentIntentId ? null : ref.chargeId,
          amountCents: amount,
          // Who and which audit row; staff's reason stays in the row (spec § 7.6).
          metadata: { console_actor: actor.userId, console_audit_id: String(claims.aid) },
        },
        idempotencyKeyOf(token),
      );
    } catch (e) {
      await audit(req, { ...base, outcome: 'failed', before, after: { ...failureFacts(e), amountCents: amount } });
      return stripeRefusal(req, reply, e);
    }
    await auditOnce(req, {
      ...base,
      id: claims.aid,
      outcome: 'ok',
      before,
      // No refund id: D-157's redactor drops any value starting `re_` (a Resend key's prefix, which a
      // Stripe refund id shares). The refund names this row instead, by its `console_audit_id`.
      after: { amountCents: refund.amountCents, status: refund.status, full: amount >= before.refundableCents },
    });
    deps.afterWrite(ref);
    const out: BillingActionResult = {
      action: 'refund',
      invoiceId: ref.invoiceId,
      auditId: String(claims.aid),
      refund: { id: refund.id, amountCents: refund.amountCents, status: refund.status },
      invoice: null,
    };
    return reply.send(out);
  });

  // --- void --------------------------------------------------------------------------------------

  const voidable = (inv: ReadInvoice): boolean => inv.status === 'open' || inv.status === 'uncollectible';

  scope.post(BILLING_ACTION_PATHS.voidPreview, opts('void'), async (req, reply): Promise<FastifyReply> => {
    const actor = staff(req);
    const invoiceId = invoiceIdOf(req);
    if (!invoiceId) return consoleError(reply, 'invalid_body', 'That invoiceId isn’t valid.');
    if (!deps.read || !deps.write) return consoleError(reply, 'stripe_not_connected');
    try {
      const inv = await deps.read.retrieveInvoice(invoiceId);
      // Drafts are view-only; paid and void invoices are past voiding (spec § 7.6).
      if (!voidable(inv)) return consoleError(reply, 'invoice_not_voidable');
      const db = getDb();
      const who = await customerNameOf(db, inv);
      const claims: ConfirmClaims = { act: 'void', p: { inv: inv.id, who }, sub: actor.userId, exp: clock.now() + CONFIRM_TTL_MS, aid: await reserveAuditId(db) };
      const out: BillingActionPreview = {
        action: 'void',
        summary: { invoiceId: inv.id, customerName: who, amountCents: inv.totalCents, paymentMethod: null, refund: null, confirmText: confirmTextOf('void', { amountCents: inv.totalCents, invoiceId: inv.id }) },
        consequences: voidConsequences({ subscriptionId: inv.subscriptionId, plan: await planOfSubscription(db, inv.subscriptionId) }),
        confirmToken: signConfirm(claims),
        expiresAt: claims.exp,
      };
      return reply.send(out);
    } catch (e) {
      return stripeRefusal(req, reply, e);
    }
  });

  scope.post(BILLING_ACTION_PATHS.void, opts('void'), async (req, reply): Promise<FastifyReply> => {
    const ok = await confirmed(req, reply, 'void');
    if (!('claims' in ok)) return ok;
    const { claims, token, reason, actor } = ok;
    const invoiceId = String(claims.p.inv);
    const base = { action: 'billing.void' as const, actor, reason, target: { type: 'invoice', id: invoiceId, label: str(claims.p.who) } };
    let inv: ReadInvoice;
    try {
      inv = await deps.read!.retrieveInvoice(invoiceId);
    } catch (e) {
      await audit(req, { ...base, outcome: 'failed', after: failureFacts(e) });
      return stripeRefusal(req, reply, e);
    }
    const before = { status: inv.status, amountCents: inv.totalCents, amountRemainingCents: inv.amountRemainingCents };
    if (!voidable(inv)) {
      await audit(req, { ...base, outcome: 'failed', before, after: { code: 'invoice_not_voidable' } });
      return consoleError(reply, 'invoice_not_voidable');
    }
    let written;
    try {
      written = await deps.write!.voidInvoice(invoiceId, idempotencyKeyOf(token));
    } catch (e) {
      await audit(req, { ...base, outcome: 'failed', before, after: failureFacts(e) });
      return stripeRefusal(req, reply, e);
    }
    await auditOnce(req, { ...base, id: claims.aid, outcome: 'ok', before, after: { status: written.status } });
    deps.afterWrite({ invoiceId, chargeId: inv.chargeId, paymentIntentId: inv.paymentIntentId });
    const out: BillingActionResult = { action: 'void', invoiceId, auditId: String(claims.aid), refund: null, invoice: { id: written.id, status: written.status } };
    return reply.send(out);
  });
}
