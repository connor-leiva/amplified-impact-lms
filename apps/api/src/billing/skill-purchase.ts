// A skill bought on its own (Connor, 2026-11-23). The webhook is the only writer. A Checkout Session
// with `ai_plan=skill` and `ai_option=single` inserts one row. The same session delivered again does
// nothing. A second payment for a skill the buyer already holds is recorded as already owned, so a
// retried event cannot grant it twice. A payment after a refund reopens that row. A full refund sets
// `refunded_at`. Nothing here creates an order or a plan, and nothing is credited toward Insiders.

import { and, eq, isNull } from 'drizzle-orm';
import type Stripe from 'stripe';
import { accounts, skillPurchases, users } from '../db/schema';
import type { Database } from '../db/client';
import { randomIds } from '../lib/clock';
import { SKILL_AI_OPTION, SKILL_AI_PLAN } from './catalog';

export interface SkillPurchaseLog {
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  value === null || value === undefined ? null : typeof value === 'string' ? value : value.id;

function uniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === '23505' || e.cause?.code === '23505';
}

/** Skill ids this user holds and has not had refunded. */
export async function purchasedSkillIds(db: Database, userId: string): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({ skillId: skillPurchases.skillId })
    .from(skillPurchases)
    .where(and(eq(skillPurchases.userId, userId), isNull(skillPurchases.refundedAt)));
  return new Set(rows.map((r) => r.skillId));
}

async function accountIdOf(db: Database, userId: string): Promise<string | null> {
  const [user] = await db.select({ teamId: users.teamId }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.teamId) return null;
  const [acct] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.teamId, user.teamId)).limit(1);
  return acct?.id ?? null;
}

/**
 * `checkout.session.completed` for a skill. Returns a short word for the log. Throws only when the
 * write itself failed, so Stripe retries. A session that is not a skill purchase is not this function's.
 */
export async function skillCheckoutCompleted(session: Stripe.Checkout.Session, db: Database, now: number, log: SkillPurchaseLog): Promise<string> {
  const meta = session.metadata ?? {};
  if (meta.ai_plan !== SKILL_AI_PLAN) return 'ignored:not-skill';
  if (meta.ai_option !== SKILL_AI_OPTION) return 'ignored:skill-option';
  const skillId = (meta.skill_id ?? '').trim();
  const userId = (meta.user_id ?? session.client_reference_id ?? '').trim();
  if (!skillId || !userId || !session.id) {
    log.error({ session: session.id }, 'a skill checkout had no skill or no buyer: Connor follows up');
    return 'ignored:skill-incomplete';
  }
  if (session.payment_status !== 'paid') return 'awaiting-payment';
  const [buyer] = await db.select({ id: users.id, kind: users.kind }).from(users).where(eq(users.id, userId)).limit(1);
  if (!buyer || buyer.kind !== 'learner') {
    log.error({ session: session.id, user: userId }, 'a skill checkout matched no learner: Connor follows up');
    return 'ignored:skill-no-user';
  }

  const row = {
    id: randomIds()('skp'),
    userId,
    accountId: await accountIdOf(db, userId),
    skillId,
    orderId: null,
    stripeSessionId: session.id,
    stripePaymentIntentId: idOf(session.payment_intent as string | { id: string } | null),
    amount: session.amount_total ?? null,
    purchasedAt: now,
    refundedAt: null,
  };

  try {
    const inserted = await db.insert(skillPurchases).values(row).onConflictDoNothing({ target: skillPurchases.stripeSessionId }).returning({ id: skillPurchases.id });
    if (inserted.length) return 'purchased';
    return 'duplicate';
  } catch (err) {
    if (!uniqueViolation(err)) throw err;
    const [owned] = await db
      .select()
      .from(skillPurchases)
      .where(and(eq(skillPurchases.userId, userId), eq(skillPurchases.skillId, skillId)))
      .limit(1);
    if (!owned) throw err;
    if (owned.refundedAt === null) {
      log.warn({ session: session.id, user: userId, skill: skillId }, 'a skill was paid for twice: the first purchase stands, Connor follows up');
      return 'already-owned';
    }
    await db
      .update(skillPurchases)
      .set({
        refundedAt: null,
        stripeSessionId: row.stripeSessionId,
        stripePaymentIntentId: row.stripePaymentIntentId,
        amount: row.amount,
        purchasedAt: row.purchasedAt,
        accountId: row.accountId ?? owned.accountId,
      })
      .where(eq(skillPurchases.id, owned.id));
    return 'repurchased';
  }
}

/** `charge.refunded` for a skill purchase. Null when this charge is not one. */
export async function refundSkillPurchase(paymentIntentId: string | null, db: Database, now: number): Promise<'skill-refunded' | null> {
  if (!paymentIntentId) return null;
  const [row] = await db.select().from(skillPurchases).where(eq(skillPurchases.stripePaymentIntentId, paymentIntentId)).limit(1);
  if (!row) return null;
  if (row.refundedAt === null) await db.update(skillPurchases).set({ refundedAt: now }).where(eq(skillPurchases.id, row.id));
  return 'skill-refunded';
}
