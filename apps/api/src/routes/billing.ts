// "Manage Billing": the signed-in account owner's way into Stripe's billing portal (D-077, Connor's
// decision of 2026-11-10 that members cancel themselves in the portal, at period end).
//
//   GET /api/billing/portal → 303 to a portal session for the owner's Stripe customer
//
// Signed in, and the account's owner only: a sales agent on the team cannot change its billing. While
// the account is inside a commitment (an Amplified AI Accelerator two-pay before its second payment, or
// an Amplified Team Plan inside its 3-month minimum) the session opens with the portal configuration
// that has cancelling turned off (`STRIPE_PORTAL_CONFIG_LOCKED`), when one is set. Anything that stops
// a session (no Stripe key, no customer yet, Stripe down) falls back to the portal's own login page
// (`STRIPE_PORTAL_LOGIN_URL`), where the owner signs in with their email.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { and, eq, gt, lt } from 'drizzle-orm';
import { requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { accounts, orders, plans, users } from '../db/schema';
import { clock } from '../lib/clock';
import type { OfferConfig } from '../billing/config';
import type { BillingStripe } from '../billing/stripe';
import { errorReason } from '../billing/webhook';

export const PORTAL_PATH = '/api/billing/portal';

/**
 * Whether cancelling should be off for this account right now: a plan inside its minimum (Amplified
 * Insiders paid monthly, D-104), or two payments before the second.
 */
export async function insideCommitment(accountId: string, now: number): Promise<boolean> {
  const db = getDb();
  const [minimum] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(and(eq(plans.accountId, accountId), gt(plans.minimumUntil, now)))
    .limit(1);
  if (minimum) return true;
  const [twoPay] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.accountId, accountId), eq(orders.option, 'two_pay'), eq(orders.status, 'paid'), lt(orders.paymentsMade, 2)))
    .limit(1);
  return twoPay !== undefined;
}

export function registerBillingRoutes(app: FastifyInstance, options: { stripe: BillingStripe | null; config: OfferConfig }): void {
  const { stripe, config } = options;

  app.get(PORTAL_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    const fallback = (): FastifyReply =>
      config.portalLoginUrl
        ? reply.header('cache-control', 'no-store').redirect(config.portalLoginUrl, 303)
        : reply.code(503).send({ error: 'Billing is not available yet. Write to admin@amplifiedimpact.io.' });
    if (actor.kind !== 'learner') return reply.code(403).send({ error: 'Billing belongs to an account owner.' });

    const db = getDb();
    const [user] = await db.select({ teamId: users.teamId }).from(users).where(eq(users.id, actor.userId)).limit(1);
    const [account] = user?.teamId ? await db.select().from(accounts).where(eq(accounts.teamId, user.teamId)).limit(1) : [];
    if (!account) return fallback();
    if (account.ownerUserId !== actor.userId) return reply.code(403).send({ error: 'Only the account owner manages billing.' });
    if (!stripe || !account.stripeCustomerId) return fallback();

    const locked = config.portalLockedConfig !== null && (await insideCommitment(account.id, clock.now()));
    const appUrl = (process.env.APP_URL ?? '').trim().replace(/\/+$/, '') || `${req.protocol}://${req.headers.host ?? 'localhost'}`;
    try {
      const url = await stripe.createPortalSession(account.stripeCustomerId, `${appUrl}/skill-library`, locked ? config.portalLockedConfig! : undefined);
      req.log.info({ account: account.id, locked }, 'billing portal opened');
      return reply.header('cache-control', 'no-store').redirect(url, 303);
    } catch (err) {
      req.log.error({ account: account.id, reason: errorReason(err) }, 'billing portal session failed; sent to the portal login');
      return fallback();
    }
  });
}
