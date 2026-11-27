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
//
// THE SOLO AGENT (D-106). An Amplified Agent Plan buyer is provisioned the same way, as the Team Owner
// of a team of one (one seat), because that is what an account is: `accounts.team_id` ties the plan to
// the buyer's logins, `/api/skills` finds the plans through the learner's team, and Manage Billing is
// the account owner's. What differs is the tier: Agent tier, not Team tier, so the portal shows them
// what an agent sees and no Team Hub (an owner view the Agent Plan does not sell). Their skills come
// from the plan (`agent_plan` opens the agent set) from Jan 4, not from the role. A buyer who already
// holds a Team tier plan keeps it: `provisionOwner` raises a tier and never lowers one.

import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { provisionOwner } from '@ai/core';
import type { Effect } from '@ai/core';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { loadDb, persistDiff } from '../db/io';
import { accounts, cohorts, orders, plans, teams, users } from '../db/schema';
import { randomIds } from '../lib/clock';
import { dispatchEffects, pendingSendsFor } from '../routes/mutate';
import type { PendingSend } from '../routes/mutate';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { cohortOfPlans } from '@ai/core/cohort-run';
import { NO_SELLING_ENV, enrollmentOpen } from '@ai/core/cohort-selling';
import { audit } from '../console/audit';
import { cartFor, initialPlanDates } from './catalog';
import type { PlanDates } from './catalog';
import type { PlanKind, PlanStatus } from './catalog';
import { cohortExists, orderCohortId, planCohortOf, sellingOf } from './cohort-sale';

export interface BillingLog {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

export type ProvisionOutcome =
  | { ok: true; accountId: string; planId: string; createdAccount: boolean; createdPlan: boolean; invite: 'sent' | 'held' | 'already' }
  | {
      ok: false;
      // R-5 Phase 5 (D-262): `unknown-cohort`, an `ai_cohort` the database does not hold; `cohort-not-ready`, a cohort with
      // no included-time end to pay a seat through. Both are recorded and paid, and staff provision them by hand.
      reason: 'no-order' | 'not-paid' | 'unknown-cart' | 'staff-email' | 'member-of-another-team' | 'unknown-cohort' | 'cohort-not-ready';
    };

/**
 * The cohort every owner who buys no cohort seat joins: the default cohort (D-078), where it is inert (their plan is
 * the gate). An AI Accelerator buyer joins the cohort the seat is sold in (R-5 Phase 5, D-262).
 */
const OWNER_COHORT = DEFAULT_COHORT_ID;

/**
 * Every owner is Team tier, so the Team Hub is theirs to add the logins their plan includes (the
 * operations lead, or the agents). Which AI Employees each plan's people see is Connor's to settle in
 * the session plans; this is the default until then. The Agent Plan's solo agent is Agent tier: one
 * seat, nobody to add, and no owner view (D-106).
 */
const ownerTier = (plan: PlanKind): 'team' | 'agent' => (plan === 'agent_plan' || plan === 'insiders_agent' ? 'agent' : 'team');

/** The plan's status from the order's: `trialing` only for a checkout with nothing due today. */
const planStatusFor = (orderStatus: string): PlanStatus => (orderStatus === 'trialing' ? 'trialing' : 'active');

const lock = (tx: { execute: Database['execute'] }) => tx.execute(sql`select pg_advisory_xact_lock(42)`);

/**
 * The owner's first email (D-132): "Set your password", whose single-use 72-hour token
 * `pendingSendsFor` mints in the transaction. Choosing a password signs them in and makes them
 * active, as accepting the invite it replaces did. It keeps the invite's timing: held until
 * `INVITES_FROM`, then at once.
 */
const inviteEffect = (email: string): Effect => ({
  type: 'email',
  template: 'set-password',
  to: [email],
  data: {},
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
  /** A skill guide to open after the buyer sets a password. Only `/skill-library/<page>`. */
  skillGuide?: string;
  /** The branded skill email is sent by the caller, so this does not send Set Your Password. */
  skipInvite?: boolean;
  /** Place the owner, and a new plan, in this cohort. Defaults to cohort one. */
  cohortId?: string;
  /** The order's company becomes the team's name and the account's. */
  applyTeamName?: boolean;
  /** A placeholder owner name (blank, or the email) becomes the order's name. */
  applyOwnerName?: boolean;
  /** An existing owner is placed in `cohortId`. */
  placeInCohort?: boolean;
  /** Dates for a new plan. Defaults to `initialPlanDates` for the cart. */
  planDates?: PlanDates;
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

    // R-5 Phase 5 (D-262): the cohort a seat is sold in: the checkout's `ai_cohort`, else December, forever. A comp
    // (#282) names its cohort itself (`options.cohortId`). The cohort's record gives the plan its dates
    // (`initialPlanDates`: its first live build and its included-time end), unless the caller hands them in (a comp's).
    const cohortId = cart.plan === 'cohort' ? (options.cohortId ?? orderCohortId(order)) : null;
    if (cart.plan === 'cohort' && order.cohortId !== null && !(await cohortExists(tx, order.cohortId))) return { ok: false, reason: 'unknown-cohort' };
    const sale = cohortId !== null && !options.planDates ? await planCohortOf(tx, cohortId, NO_SELLING_ENV) : undefined;
    if (sale && sale.liveUntil === null) return { ok: false, reason: 'cohort-not-ready' };

    // The team and its owner, through core.
    const before = await loadDb(tx);
    const [existingAccount] = await tx.select().from(accounts).where(eq(accounts.ownerEmail, email)).limit(1);
    const owner = provisionOwner(
      before,
      {
        email,
        name: order.name ?? '',
        teamName: options.applyTeamName && order.company ? order.company : (existingAccount?.name ?? (order.company || order.name || email)),
        seats: cart.seats,
        tier: ownerTier(cart.plan),
        cohortId: cohortId ?? options.cohortId ?? OWNER_COHORT,
        applyTeamName: options.applyTeamName,
        applyOwnerName: options.applyOwnerName,
        placeInCohort: options.placeInCohort,
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
    if (options.applyTeamName && order.company && account!.name !== order.company) {
      await tx.update(accounts).set({ name: order.company }).where(eq(accounts.id, account!.id));
      account = { ...account!, name: order.company };
    }
    const acct = account!;

    // The plan: one per order.
    let [plan] = await tx.select().from(plans).where(eq(plans.orderId, order.id)).limit(1);
    const createdPlan = !plan;
    if (!plan) {
      // Charged today, or a trial with nothing paid yet (the Agent Plan before Jan 4, D-106). A cohort seat's are its
      // cohort's (R-5 Phase 5, D-262); a comp's are the ones it hands in (#282).
      const dates = options.planDates ?? initialPlanDates(cart, now, order.status === 'paid', sale);
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

    // The cohort's seats, across both its links (D-104, R-5 Phase 5: per cohort, at its own cap). The sale that fills the
    // last one tells Connor and Ampy: the offer page has already switched to the waitlist, and the webhook turns the
    // cohort's Payment Links off once this commits (D-154, `payment-links.ts`). A checkout already open when it sold can
    // still finish: that seat past the cap is provisioned, and reported. A comp is not a sale (#282): it fills no
    // founding seat, so it announces no sell-out; it is placed like any seat, so its team is in one cohort.
    if (createdPlan && cart.plan === 'cohort' && cohortId !== null) {
      if (order.origin !== 'comp') {
        const cap = (await sellingOf(tx, cohortId, NO_SELLING_ENV)).capacity;
        const n = await cohortSeatsSold(tx, cohortId);
        if (n === cap) {
          log.error({ order: order.id, seat: n, cohort: cohortId }, `AI Accelerator sold out: seat ${n} of ${cap}. The page shows the waitlist; both Accelerator Payment Links are being turned off`);
        } else if (n > cap) {
          log.error({ order: order.id, seat: n, cohort: cohortId }, `AI Accelerator seat ${n} sold, past the ${cap} seats: Connor follows up`);
        }
      }
      // A checkout that names a cohort whose enrollment is closed (its link still live in Stripe after Close): placed, as
      // a paid checkout always is (D-154), and reported. A checkout with no `ai_cohort` (December's) is never checked here.
      if (order.cohortId !== null) {
        const [row] = await tx
          .select({ status: cohorts.status, archivedAt: cohorts.archivedAt, enrollmentClosedAt: cohorts.enrollmentClosedAt })
          .from(cohorts)
          .where(eq(cohorts.id, cohortId))
          .limit(1);
        if (row && !enrollmentOpen({ status: row.status as 'enrolling', archivedAt: row.archivedAt ?? undefined, enrollmentClosedAt: row.enrollmentClosedAt ?? undefined }))
          log.error({ order: order.id, cohort: cohortId, status: row.status }, 'a seat was sold in a cohort whose enrollment is closed: placed in it. Connor follows up');
      }
      await placeTeam(tx, acct.teamId, order.id, now, log);
    }

    // The invite.
    let invite: 'sent' | 'held' | 'already' = 'already';
    if (acct.inviteSentAt === null) {
      const ownerRow = owner.db.users.find((u) => u.id === owner.userId);
      if (ownerRow?.status !== 'invited') {
        // Already signed in once (a buyer who was a learner before): nothing to send.
        await tx.update(accounts).set({ inviteSentAt: now }).where(eq(accounts.id, acct.id));
      } else if (options.invitesEnabled !== false && (now >= options.invitesFrom || options.inviteNow)) {
        sends = await pendingSendsFor(tx, [inviteEffect(email)], now, log as never);
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
 * A $37 skill buyer with no account yet (or an account already, found by email). The same owner
 * path as a paid plan, and the same Set Your Password email when they are still invited. No plan
 * row: the skill purchase is recorded separately. Idempotent for an email that already has an account.
 */
export async function provisionSkillBuyer(
  emailRaw: string,
  name: string,
  options: ProvisionOptions,
): Promise<{ ok: true; userId: string; invite: 'sent' | 'already'; created: boolean } | { ok: false; reason: 'staff-email' | 'member-of-another-team' }> {
  const db = options.db ?? getDb();
  const email = emailRaw.trim().toLowerCase();
  let sends: PendingSend[] = [];
  const outcome = await db.transaction(async (tx) => {
    await lock(tx);
    const before = await loadDb(tx);
    const owner = provisionOwner(
      before,
      { email, name, teamName: name.trim() || email, seats: 1, tier: 'agent', cohortId: OWNER_COHORT },
      { now: options.now, id: randomIds() },
    );
    if (!owner.ok) return { ok: false as const, reason: owner.reason };
    if (owner.db !== before) await persistDiff(tx, before, owner.db);

    const [existingAccount] = await tx.select().from(accounts).where(eq(accounts.ownerEmail, email)).limit(1);
    let account = existingAccount;
    if (!account) {
      const team = owner.db.teams.find((t) => t.id === owner.teamId);
      const [created] = await tx
        .insert(accounts)
        .values({
          id: randomIds()('acct'),
          teamId: owner.teamId,
          ownerUserId: owner.userId,
          ownerEmail: email,
          name: team?.name ?? email,
          crm: null,
          stripeCustomerId: null,
          createdAt: options.now,
        })
        .returning();
      account = created;
    }

    let invite: 'sent' | 'already' = 'already';
    const user = owner.db.users.find((u) => u.id === owner.userId);
    if (options.skipInvite) {
      if (account && account.inviteSentAt === null && user?.status === 'invited') {
        await tx.update(accounts).set({ inviteSentAt: options.now }).where(eq(accounts.id, account.id));
      }
    } else if (account && account.inviteSentAt === null && user?.status === 'invited' && options.invitesEnabled !== false && (options.now >= options.invitesFrom || options.inviteNow)) {
      const effect: Effect = {
        type: 'email',
        template: 'set-password',
        to: [email],
        ...(options.skillGuide ? { data: { next: options.skillGuide } } : {}),
      };
      sends = await pendingSendsFor(tx, [effect], options.now, options.log as never);
      await tx.update(accounts).set({ inviteSentAt: options.now }).where(eq(accounts.id, account.id));
      invite = 'sent';
    }
    return { ok: true as const, userId: owner.userId, invite, created: owner.createdUser };
  });
  if (sends.length) await dispatchEffects(sends, options.log as never);
  return outcome;
}

/**
 * R-5 Phase 5 (D-262): the team follows its newest purchase (Connor's answer to Q-23, Nov 26, 2026: a team is in one
 * cohort at a time, and the newest purchase decides). That is its newest cohort plan that has not ended, by when it was
 * bought (`cohortOfPlans`), whichever cohort starts first. Every learner on the team gets that cohort as
 * `users.cohort_id`, so Community and files (which read plans) and the snapshot and join (which read `users.cohort_id`)
 * agree. A team that held a live seat in another cohort is moved, and the move is written to the audit log for Connor
 * (`cohort.team_moved`); its progress and files stay, keyed by team and week. A brand-new team has nothing to move:
 * provisioning made it in the cohort.
 */
async function placeTeam(tx: Pick<Database, 'select' | 'update' | 'insert'>, teamId: string, orderId: string, now: number, log: BillingLog): Promise<void> {
  const accts = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.teamId, teamId));
  const held = accts.length
    ? await tx
        .select({ kind: plans.kind, status: plans.status, cohortId: plans.cohortId, createdAt: plans.createdAt, orderId: plans.orderId })
        .from(plans)
        .where(and(inArray(plans.accountId, accts.map((a) => a.id)), eq(plans.kind, 'cohort'), ne(plans.status, 'ended')))
    : [];
  const cohort = cohortOfPlans(held.map((p) => ({ kind: p.kind, status: p.status, cohortId: p.cohortId, createdAt: Number(p.createdAt) })));
  const moved = await tx
    .select({ id: users.id, cohortId: users.cohortId })
    .from(users)
    .where(and(eq(users.teamId, teamId), eq(users.kind, 'learner'), ne(users.cohortId, cohort)));
  if (!moved.length) return;
  await tx.update(users).set({ cohortId: cohort }).where(inArray(users.id, moved.map((u) => u.id)));
  // Q-23: a sale that takes a team out of a cohort it holds a live seat in is Connor's to see.
  const from = [...new Set(held.filter((p) => p.orderId !== orderId && p.cohortId && p.cohortId !== cohort).map((p) => p.cohortId!))];
  if (!from.length) return;
  const [team] = await tx.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1);
  await audit(
    null,
    {
      action: 'cohort.team_moved',
      outcome: 'ok',
      actor: { source: 'system', role: 'stripe' },
      target: { type: 'team', id: teamId, label: team?.name ?? teamId },
      before: { cohortId: from.length === 1 ? from[0] : from },
      after: { cohortId: cohort, order: orderId, learners: moved.length, at: now },
      reason: 'A team that holds a seat in another cohort bought one in this cohort (Q-23): it is in the newest one now; its progress and files stay.',
    },
    tx,
  );
  log.error({ team: teamId, order: orderId, from, to: cohort }, 'a team with a seat in another cohort bought one in this cohort: moved to it (Q-23). Connor follows up');
}

/**
 * AI Accelerator seats sold: cohort plans not ended (a refund ends one and frees its seat). Paid in
 * full or after the first of two payments, both links count toward the same cap (D-104). R-5 Phase 5 (D-262): per
 * cohort, by `plans.cohort_id` (a plan with none is December's, as every cohort plan before R-5 was). Without a cohort,
 * every cohort's together, as D-154 counted before.
 */
/**
 * A cohort plan that counts as a seat (D-202). A seeded test account's plan is the same shape as a
 * buyer's and is left out here, so it is left out of every count that calls `cohortSeatsSold` and
 * of the Accelerator's collected and scheduled totals, which use this same filter.
 */
export const countedCohortSeat = and(
  eq(plans.kind, 'cohort'),
  ne(plans.status, 'ended'),
  sql`not exists (
    select 1 from ${accounts} a
    join ${users} u on u.id = a.owner_user_id
    where a.id = ${plans.accountId} and u.is_test
  )`,
  // A comped team is not a founding seat and not paid revenue (the same exclusion as a test account).
  sql`not exists (
    select 1 from ${orders} o
    where o.id = ${plans.orderId} and o.origin = 'comp'
  )`,
);

export async function cohortSeatsSold(db: Pick<Database, 'select'>, cohortId?: string): Promise<number> {
  const where = cohortId === undefined ? countedCohortSeat : and(countedCohortSeat, inCohort(cohortId));
  const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(plans).where(where)) as [{ n: number }];
  return n;
}

/** A cohort plan in this cohort: its `cohort_id`, or none, which is December's (every cohort plan before R-5 had one). */
export const inCohort = (cohortId: string) => sql`coalesce(${plans.cohortId}, ${DEFAULT_COHORT_ID}) = ${cohortId}`;

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
      if (owner?.status === 'invited') sends = await pendingSendsFor(tx, [inviteEffect(owner.email)], options.now, options.log as never);
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

