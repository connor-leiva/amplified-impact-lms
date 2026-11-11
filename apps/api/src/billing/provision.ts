// Provisioning: a paid order becomes an account, a plan and an invited owner (D-078).
//
//   provisionOrder(orderId)  the webhook calls it after marking an order paid; the staff command
//                            `pnpm --filter @ai/api provision --order <id>` calls it by hand
//   sendHeldInvites(now)     the billing loop calls it each minute: invites held for Monday go out
//
// RUN TWICE, IT CHANGES NOTHING. The account is found by the owner's email (unique), the plan by its
// order (unique), the team and owner by `provisionOwner`, which is idempotent, and the invite by the
// account's `invite_sent_at`. That is what makes the staff command a safe answer to "did this one
// work?", and what lets the webhook be delivered twice.
//
// THE SAME LOCK AND THE SAME PERSISTENCE AS `/api/mutate`. Teams and people are `Db` records, so the
// change is computed by `@ai/core` on a loaded snapshot and written with `persistDiff`, inside the
// advisory lock every mutation takes (42). The invite token is minted inside that transaction too, so
// a rolled-back provisioning leaves no working link; the email goes out after the commit.
//
// HELD INVITES. Before `INVITES_FROM` (Mon, Nov 16, 8 am Central) the account is made and the invite
// waits, so the login arrives with the welcome email. From then on it goes at once.

import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { provisionOwner } from '@ai/core';
import type { Effect } from '@ai/core';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { loadDb, persistDiff } from '../db/io';
import { accounts, orders, plans, users } from '../db/schema';
import { randomIds } from '../lib/clock';
import { dispatchEffects, pendingSendsFor } from '../routes/mutate';
import type { PendingSend } from '../routes/mutate';
import { COHORT_ONE, COHORT_SEATS, cartFor, initialPlanDates } from './catalog';
import type { PlanStatus } from './catalog';

export interface BillingLog {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

export type ProvisionOutcome =
  | { ok: true; accountId: string; planId: string; createdAccount: boolean; createdPlan: boolean; invite: 'sent' | 'held' | 'already' }
  | { ok: false; reason: 'no-order' | 'not-paid' | 'unknown-cart' | 'staff-email' | 'member-of-another-team' };

/** The team every owner joins: cohort one, the platform's one production cohort (D-078). */
const OWNER_COHORT = COHORT_ONE.id;

/**
 * Every owner is Team tier, so the Team Hub is theirs to add the logins their plan includes (the
 * operations lead, or the agents). Which AI Employees each plan's people see is Connor's to settle in
 * the session plans; this is the default until then.
 */
const OWNER_TIER = 'team' as const;

/** The plan's status from the order's: `trialing` only for a checkout with nothing due today. */
const planStatusFor = (orderStatus: string): PlanStatus => (orderStatus === 'trialing' ? 'trialing' : 'active');

const lock = (tx: { execute: Database['execute'] }) => tx.execute(sql`select pg_advisory_xact_lock(42)`);

/** An invite for the owner: the `team-invite` template, whose token `pendingSendsFor` mints in the transaction. */
const inviteEffect = (email: string, team: string): Effect => ({
  type: 'email',
  template: 'team-invite',
  to: [email],
  data: { team, inviter: 'Amplified Impact' },
});

export interface ProvisionOptions {
  db?: Database;
  log: BillingLog;
  now: number;
  invitesFrom: number;
  /** False holds every invite (the platform is in fixture mode and has no sign-in). Defaults to true. */
  invitesEnabled?: boolean;
  /** Staff override: send the owner's invite now even before `invitesFrom`. */
  inviteNow?: boolean;
}

export async function provisionOrder(orderId: string, options: ProvisionOptions): Promise<ProvisionOutcome> {
  const db = options.db ?? getDb();
  const { now, log } = options;
  let sends: PendingSend[] = [];

  const outcome = await db.transaction(async (tx): Promise<ProvisionOutcome> => {
    await lock(tx);
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return { ok: false, reason: 'no-order' };
    if (order.status !== 'paid' && order.status !== 'trialing') return { ok: false, reason: 'not-paid' };
    const cart = cartFor(order.plan, order.option);
    if (!cart || !order.email) return { ok: false, reason: 'unknown-cart' };
    const email = order.email.trim().toLowerCase();

    // The team and its owner, through core.
    const before = await loadDb(tx);
    const [existingAccount] = await tx.select().from(accounts).where(eq(accounts.ownerEmail, email)).limit(1);
    const owner = provisionOwner(
      before,
      {
        email,
        name: order.name ?? '',
        teamName: existingAccount?.name ?? (order.company || order.name || email),
        seats: cart.seats,
        tier: OWNER_TIER,
        cohortId: OWNER_COHORT,
      },
      { now, id: randomIds() },
    );
    if (!owner.ok) return { ok: false, reason: owner.reason };
    if (owner.db !== before) await persistDiff(tx, before, owner.db);

    // The account.
    let account = existingAccount;
    const createdAccount = !account;
    if (!account) {
      const team = owner.db.teams.find((t) => t.id === owner.teamId)!;
      [account] = await tx
        .insert(accounts)
        .values({
          id: randomIds()('acct'),
          teamId: owner.teamId,
          ownerUserId: owner.userId,
          ownerEmail: email,
          name: team.name,
          crm: order.crm,
          stripeCustomerId: order.stripeCustomerId,
          createdAt: now,
        })
        .returning();
    } else if (!account.stripeCustomerId && order.stripeCustomerId) {
      await tx.update(accounts).set({ stripeCustomerId: order.stripeCustomerId }).where(eq(accounts.id, account.id));
    }
    const acct = account!;

    // The plan: one per order.
    let [plan] = await tx.select().from(plans).where(eq(plans.orderId, order.id)).limit(1);
    const createdPlan = !plan;
    if (!plan) {
      const dates = initialPlanDates(cart, now);
      [plan] = await tx
        .insert(plans)
        .values({
          id: randomIds()('plan'),
          accountId: acct.id,
          kind: cart.plan,
          option: cart.option,
          seats: cart.seats,
          cohortId: dates.cohortId,
          status: planStatusFor(order.status),
          startsAt: dates.startsAt,
          paidThrough: dates.paidThrough,
          liveUntil: dates.liveUntil,
          minimumUntil: dates.minimumUntil,
          // Insiders', the Team Plan's and the AI Accelerator-in-full's subscription is the plan's own
          // (the last carries Amplified Insiders). Two payments are the order's subscription; its
          // Insiders is a separate one, attached by the webhook (`ensureInsiders`).
          stripeSubscriptionId: cart.option === 'two_pay' ? null : order.stripeSubscriptionId,
          orderId: order.id,
          createdAt: now,
        })
        .returning();
    }
    if (order.accountId !== acct.id) await tx.update(orders).set({ accountId: acct.id }).where(eq(orders.id, order.id));

    // Fifteen founding seats (D-104). The sale that fills the last one tells Connor and Ampy: the offer
    // page has already switched to the waitlist, and the two Stripe links are turned off by hand. A
    // checkout already open when it sold can still finish: that 16th seat is reported too.
    if (createdPlan && cart.plan === 'cohort') {
      const n = await cohortSeatsSold(tx);
      if (n === COHORT_SEATS) {
        log.error({ order: order.id, seat: n }, `AI Accelerator sold out: seat ${n} of ${COHORT_SEATS}. The page shows the waitlist; turn off both Accelerator Payment Links in Stripe`);
      } else if (n > COHORT_SEATS) {
        log.error({ order: order.id, seat: n }, `AI Accelerator seat ${n} sold, past the ${COHORT_SEATS} seats: Connor follows up`);
      }
    }

    // The invite.
    let invite: 'sent' | 'held' | 'already' = 'already';
    if (acct.inviteSentAt === null) {
      const ownerRow = owner.db.users.find((u) => u.id === owner.userId);
      if (ownerRow?.status !== 'invited') {
        // Already signed in once (a buyer who was a learner before): nothing to send.
        await tx.update(accounts).set({ inviteSentAt: now }).where(eq(accounts.id, acct.id));
      } else if (options.invitesEnabled !== false && (now >= options.invitesFrom || options.inviteNow)) {
        sends = await pendingSendsFor(tx, [inviteEffect(email, acct.name)], now, log as never);
        await tx.update(accounts).set({ inviteSentAt: now }).where(eq(accounts.id, acct.id));
        invite = 'sent';
      } else {
        invite = 'held';
      }
    }

    return { ok: true, accountId: acct.id, planId: plan!.id, createdAccount, createdPlan, invite };
  });

  if (sends.length) await dispatchEffects(sends, log as never);
  if (outcome.ok) {
    log.info(
      { order: orderId, account: outcome.accountId, plan: outcome.planId, createdAccount: outcome.createdAccount, createdPlan: outcome.createdPlan, invite: outcome.invite },
      'order provisioned',
    );
  } else {
    log[outcome.reason === 'not-paid' ? 'info' : 'error']({ order: orderId, reason: outcome.reason }, 'order not provisioned');
  }
  return outcome;
}

/**
 * AI Accelerator seats sold: cohort plans not ended (a refund ends one and frees its seat). Paid in
 * full or after the first of two payments, both links count toward the same 15 (D-104).
 */
export async function cohortSeatsSold(db: Pick<Database, 'select'>): Promise<number> {
  const [{ n }] = (await db
    .select({ n: sql<number>`count(*)::int` })
    .from(plans)
    .where(and(eq(plans.kind, 'cohort'), ne(plans.status, 'ended')))) as [{ n: number }];
  return n;
}

/** Send every invite that was held for `INVITES_FROM`. Returns how many went out. */
export async function sendHeldInvites(options: { db?: Database; log: BillingLog; now: number; invitesFrom: number }): Promise<number> {
  if (options.now < options.invitesFrom) return 0;
  const db = options.db ?? getDb();
  const held = await db.select({ id: accounts.id }).from(accounts).where(isNull(accounts.inviteSentAt)).limit(50);
  let sent = 0;
  for (const { id } of held) {
    let sends: PendingSend[] = [];
    await db.transaction(async (tx) => {
      await lock(tx);
      const [acct] = await tx.select().from(accounts).where(and(eq(accounts.id, id), isNull(accounts.inviteSentAt))).limit(1);
      if (!acct) return;
      const [owner] = await tx.select({ status: users.status, email: users.email }).from(users).where(eq(users.id, acct.ownerUserId)).limit(1);
      if (owner?.status === 'invited') sends = await pendingSendsFor(tx, [inviteEffect(owner.email, acct.name)], options.now, options.log as never);
      await tx.update(accounts).set({ inviteSentAt: options.now }).where(eq(accounts.id, acct.id));
    });
    if (sends.length) {
      await dispatchEffects(sends, options.log as never);
      sent += 1;
    }
  }
  if (sent) options.log.info({ sent }, 'held owner invites sent');
  return sent;
}

/** The plans an account holds, for the access rule. */
export async function plansOfAccount(db: Database, accountId: string) {
  return db.select().from(plans).where(eq(plans.accountId, accountId));
}

/** The account a signed-in learner belongs to: the one whose team they are on. */
export async function accountOfTeam(db: Database, teamId: string | null) {
  if (!teamId) return null;
  const [acct] = await db.select().from(accounts).where(eq(accounts.teamId, teamId)).limit(1);
  return acct ?? null;
}

