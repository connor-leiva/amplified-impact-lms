// A skill bought on its own (Connor, 2026-11-23). The webhook writes the purchase, and the guest
// return after Stripe calls the same function so a buyer who beats the webhook is not left unsigned.
// A Checkout Session
// with `ai_plan=skill` and `ai_option=single` inserts one row. The same session delivered again does
// nothing. A second payment for a skill the buyer already holds is recorded as already owned, so a
// retried event cannot grant it twice. A payment after a refund reopens that row. A full refund sets
// `refunded_at`. Nothing here creates an order or a plan, and nothing is credited toward Insiders.

import { and, eq, isNull, sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import { SKILL_CATALOG } from '@ai/core/skills';
import { guidePageOf } from '@ai/core/skill-guides';
import { SET_PASSWORD_TTL_MS, expiryFor, hasPassword, hashToken, mintToken, userByEmail } from '../auth';
import { accounts, authTokens, skillPurchases, skills, users } from '../db/schema';
import type { Database } from '../db/client';
import { audit } from '../console/audit';
import { dispatchEffects, pendingSendsFor } from '../routes/mutate';
import type { PendingSend } from '../routes/mutate';
import { randomIds } from '../lib/clock';
import { groupsOf } from './access-groups';
import { SKILL_AI_OPTION, SKILL_AI_PLAN } from './catalog';
import { provisionSkillBuyer } from './provision';
import type { ProvisionOptions } from './provision';

export interface SkillPurchaseLog {
  info(obj: Record<string, unknown>, msg: string): void;
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
export const SKILL_GUEST_OFFER = 'single_skill_37';

export async function skillCheckoutCompleted(
  session: Stripe.Checkout.Session,
  db: Database,
  now: number,
  log: SkillPurchaseLog,
  provision?: Pick<ProvisionOptions, 'invitesFrom' | 'invitesEnabled' | 'inviteNow'> & { skillGuestCheckout?: boolean },
): Promise<string> {
  const meta = session.metadata ?? {};
  if (meta.offer === SKILL_GUEST_OFFER && !(meta.user_id ?? '').trim()) return guestSkillPurchase(session, db, now, log, provision);
  if (meta.ai_plan !== SKILL_AI_PLAN) return 'ignored:not-skill';
  if (meta.ai_option !== SKILL_AI_OPTION) return 'ignored:skill-option';
  const skillId = (meta.skill_id ?? '').trim();
  const userId = (meta.user_id ?? session.client_reference_id ?? '').trim();
  if (!skillId || !userId || !session.id) {
    log.error({ session: session.id }, 'a skill checkout had no skill or no buyer: Connor follows up');
    return 'ignored:skill-incomplete';
  }
  if (session.payment_status !== 'paid') return 'awaiting-payment';
  const [buyer] = await db.select({ id: users.id, kind: users.kind, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!buyer || buyer.kind !== 'learner') {
    log.error({ session: session.id, user: userId }, 'a skill checkout matched no learner: Connor follows up');
    return 'ignored:skill-no-user';
  }

  const recorded = await recordPurchase(db, {
    userId,
    email: buyer.email,
    skillId,
    sessionId: session.id,
    paymentIntentId: idOf(session.payment_intent as string | { id: string } | null),
    amount: session.amount_total ?? null,
    now,
    log,
  });
  if (recorded === 'purchased' || recorded === 'repurchased') await auditSkill(skillId, session.id);
  return recorded;
}

async function recordPurchase(
  db: Database,
  input: { userId: string | null; email: string | null; skillId: string; sessionId: string; paymentIntentId: string | null; amount: number | null; now: number; log: SkillPurchaseLog },
): Promise<'purchased' | 'duplicate' | 'already-owned' | 'repurchased'> {
  const row = {
    id: randomIds()('skp'),
    userId: input.userId,
    email: input.email,
    accountId: input.userId ? await accountIdOf(db, input.userId) : null,
    skillId: input.skillId,
    orderId: null,
    stripeSessionId: input.sessionId,
    stripePaymentIntentId: input.paymentIntentId,
    amount: input.amount,
    purchasedAt: input.now,
    refundedAt: null,
  };
  try {
    const inserted = await db.insert(skillPurchases).values(row).onConflictDoNothing({ target: skillPurchases.stripeSessionId }).returning({ id: skillPurchases.id });
    if (inserted.length) return 'purchased';
    return 'duplicate';
  } catch (err) {
    if (!uniqueViolation(err)) throw err;
    const owned = await ownedRow(db, input.userId, input.email, input.skillId);
    if (!owned) throw err;
    if (owned.refundedAt === null) {
      input.log.warn({ session: input.sessionId, skill: input.skillId }, 'a skill was paid for twice: the first purchase stands, Connor follows up');
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
        email: row.email ?? owned.email,
        ghlSyncedAt: null,
      })
      .where(eq(skillPurchases.id, owned.id));
    return 'repurchased';
  }
}

async function ownedRow(db: Database, userId: string | null, email: string | null, skillId: string) {
  if (userId) {
    const [row] = await db.select().from(skillPurchases).where(and(eq(skillPurchases.userId, userId), eq(skillPurchases.skillId, skillId))).limit(1);
    return row ?? null;
  }
  if (!email) return null;
  const [row] = await db
    .select()
    .from(skillPurchases)
    .where(and(isNull(skillPurchases.userId), eq(skillPurchases.skillId, skillId), sql`lower(${skillPurchases.email}) = ${email}`))
    .limit(1);
  return row ?? null;
}

/** The Payment Link dropdown stores the skill id with the hyphens removed (`team-pnl-review` → `teampnlreview`). */
export function skillIdOfCompact(value: string): string | null {
  const compact = value.trim().toLowerCase();
  if (!compact) return null;
  return SKILL_CATALOG.find((s) => s.id.replace(/-/g, '') === compact)?.id ?? null;
}

function customSkill(session: Stripe.Checkout.Session): string | null {
  for (const field of session.custom_fields ?? []) {
    if (field.key !== 'skill') continue;
    const value = field.dropdown?.value ?? field.text?.value ?? '';
    return skillIdOfCompact(value);
  }
  return null;
}

function buyerName(session: Stripe.Checkout.Session): string {
  return (session.customer_details?.name ?? '').trim();
}

/** A signed-out $37 checkout, including the stopgap Payment Link once it carries `offer=single_skill_37`. */
async function guestSkillPurchase(
  session: Stripe.Checkout.Session,
  db: Database,
  now: number,
  log: SkillPurchaseLog,
  provision: (Pick<ProvisionOptions, 'invitesFrom' | 'invitesEnabled' | 'inviteNow'> & { skillGuestCheckout?: boolean }) | undefined,
): Promise<string> {
  const meta = session.metadata ?? {};
  const skillId = (meta.skill_id ?? '').trim() || customSkill(session) || '';
  const email = (session.customer_details?.email ?? session.customer_email ?? '').trim().toLowerCase();
  if (!skillId || !session.id) {
    log.error({ session: session.id }, 'a guest skill checkout had no skill: Connor follows up');
    return 'ignored:skill-incomplete';
  }
  if (session.payment_status !== 'paid') return 'awaiting-payment';
  if (!email) {
    log.error({ session: session.id, skill: skillId }, 'a guest skill checkout had no email: Connor follows up');
    return 'ignored:skill-no-email';
  }
  if ((await groupsOf(db, email, now)).length > 0) {
    log.warn({ session: session.id, skill: skillId }, 'a guest skill checkout matched an access group: nothing was granted');
    return 'ignored:skill-group';
  }
  const open = provision?.skillGuestCheckout === true;
  let userId: string | null = null;
  let created = false;
  if (open) {
    if (!provision) return 'ignored:skill-no-provision';
    const made = await provisionSkillBuyer(email, buyerName(session), {
      db,
      log,
      now,
      invitesFrom: provision.invitesFrom,
      invitesEnabled: provision.invitesEnabled,
      inviteNow: provision.inviteNow,
      skipInvite: true,
    });
    if (!made.ok) {
      log.error({ session: session.id, skill: skillId, reason: made.reason }, 'a guest skill buyer was not provisioned: Connor follows up');
      return `ignored:skill-${made.reason}`;
    }
    userId = made.userId;
    created = made.created;
  }
  const recorded = await recordPurchase(db, {
    userId,
    email,
    skillId,
    sessionId: session.id,
    paymentIntentId: idOf(session.payment_intent as string | { id: string } | null),
    amount: session.amount_total ?? null,
    now,
    log,
  });
  if (recorded === 'purchased' || recorded === 'repurchased') {
    await auditSkill(skillId, session.id);
    if (open) await sendSkillEmail(db, email, buyerName(session), skillId, created, now, log);
  }
  return open && (recorded === 'purchased' || recorded === 'repurchased') ? `${recorded}:${created ? 'new' : 'ready'}` : recorded;
}

async function sendSkillEmail(db: Database, email: string, name: string, skillId: string, created: boolean, now: number, log: SkillPurchaseLog): Promise<void> {
  const [skill] = await db.select({ title: skills.title, sets: skills.sets }).from(skills).where(eq(skills.id, skillId)).limit(1);
  const catalog = SKILL_CATALOG.find((s) => s.id === skillId);
  const skillName = skill?.title ?? catalog?.title ?? skillId;
  const sets = skill?.sets === 'agent' || skill?.sets === 'both' || skill?.sets === 'owner_ops' ? skill.sets : (catalog?.sets ?? 'both');
  const next = `/skill-library/${guidePageOf(skillId)}`;
  const first = name.trim().split(/\s+/).filter(Boolean)[0] ?? '';
  const variant = created ? 'new' : 'ready';
  let token: string | undefined;
  if (variant === 'new') {
    token = mintToken();
    await db.insert(authTokens).values({ tokenHash: hashToken(token), email, purpose: 'set_password', expiresAt: expiryFor('set_password', now) });
  }
  const pending: PendingSend = { template: 'skill-purchase', to: email, data: { skillName, variant, sets, firstName: first, next, ...(token ? { token } : {}) } };
  const sends = await pendingSendsFor(db, [{ type: 'email', template: 'skill-purchase', to: [email], data: pending.data }], now, log as never);
  await dispatchEffects(sends, log as never);
}

async function auditSkill(skillId: string, sessionId: string): Promise<void> {
  await audit(null, {
    action: 'skill.purchase',
    outcome: 'ok',
    actor: { source: 'system', role: 'stripe' },
    target: { type: 'skill', id: skillId, label: sessionId },
  });
}

export type GuestReturn = { action: 'enter'; userId: string; next: string } | { action: 'sign-in'; next: string };

/**
 * Where a paid guest goes after Stripe. A brand-new account has no password yet, so the return
 * signs them in and opens the skill. An account that already has a password goes to sign-in; the
 * webhook already sent that buyer the Sign In email. The same completion the webhook runs is called
 * first, so arriving before the webhook still creates the account, and arriving after it does not
 * send a second email.
 */
export async function guestSkillReturn(
  session: Stripe.Checkout.Session,
  db: Database,
  now: number,
  log: SkillPurchaseLog,
  provision?: Pick<ProvisionOptions, 'invitesFrom' | 'invitesEnabled' | 'inviteNow'> & { skillGuestCheckout?: boolean },
): Promise<GuestReturn> {
  const meta = session.metadata ?? {};
  const skillId = (meta.skill_id ?? '').trim() || customSkill(session) || '';
  const next = skillId ? `/skill-library/${guidePageOf(skillId)}` : '/skill-library';
  const signIn: GuestReturn = { action: 'sign-in', next };
  if (meta.offer !== SKILL_GUEST_OFFER || (meta.user_id ?? '').trim()) return signIn;
  if (session.payment_status !== 'paid' || !skillId || !session.id) return signIn;
  const createdMs = typeof session.created === 'number' ? session.created * 1000 : now;
  if (now - createdMs > SET_PASSWORD_TTL_MS || createdMs > now + 5 * 60 * 1000) return signIn;

  await skillCheckoutCompleted(session, db, now, log, provision);

  const email = (session.customer_details?.email ?? session.customer_email ?? '').trim().toLowerCase();
  if (!email) return signIn;
  const buyer = await userByEmail(db, email);
  if (!buyer || buyer.kind !== 'learner') return signIn;
  if (await hasPassword(db, buyer.id)) return signIn;
  return { action: 'enter', userId: buyer.id, next };
}

/** `charge.refunded` for a skill purchase. Null when this charge is not one. */
export async function refundSkillPurchase(paymentIntentId: string | null, db: Database, now: number): Promise<'skill-refunded' | null> {
  if (!paymentIntentId) return null;
  const [row] = await db.select().from(skillPurchases).where(eq(skillPurchases.stripePaymentIntentId, paymentIntentId)).limit(1);
  if (!row) return null;
  if (row.refundedAt === null) {
    await db.update(skillPurchases).set({ refundedAt: now, ghlSyncedAt: null }).where(eq(skillPurchases.id, row.id));
    await audit(null, {
      action: 'skill.refund',
      outcome: 'ok',
      actor: { source: 'system', role: 'stripe' },
      target: { type: 'skill', id: row.skillId, label: row.id },
    });
  }
  return 'skill-refunded';
}
