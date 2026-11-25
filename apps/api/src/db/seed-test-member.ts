// One real learner, for seeing the portal as an agent does (D-200).
//
// The deploy's curriculum ensure (`db:curriculum:ensure`, the same pre-deploy step that runs
// `applyDataMigrations`) calls `seedTestMember` on every deploy. It is not a row in `data_migrations`.
// Those steps record themselves the first time they run, and an unset variable on that first deploy
// would mean the account was never created. This one decides from the variables each time: unset, it
// writes nothing and can still run on a later deploy; an address that already has a user, it leaves
// that user alone.
//
// `SEED_TEST_MEMBER_KIND=accelerator` (D-202) is the other account: the same account, order and plan a
// paid Accelerator purchase writes, with no Stripe id, no amount, no email and no GoHighLevel copy.
// `users.is_test` keeps it out of the seat, enrollment and revenue counts. `users.early_access` opens
// the course before its dates. An address that already has a user keeps its password.
//
// THE ACCOUNT IS THE ONE A VERIFIED ACCESS-GROUP ADDRESS GETS. `createGroupMember` is the insert
// `provisionGroupMember` runs (a learner, Agent tier, owner of a team of one, not staff). `recordVerified`
// is what spending a link writes, which is what lets the group's domain grant Utah Life on the next
// request. Nothing here inserts an access-group row, an order, a plan or a payment, and nothing here
// sends mail or talks to GoHighLevel or Stripe.
//
// THE PASSWORD IS THE SET-PASSWORD FLOW'S. `finishPasswordSet` hashes with the same argon2id helper
// and finishes the same way: an invited learner becomes active. The password is read from the
// environment, hashed, and dropped. It is never stored in the audit row and never interpolated into
// a log line. The log line does not carry the address either; the audit row is the place that does.

import { and, eq, ne, sql } from 'drizzle-orm';
import { provisionOwner } from '@ai/core';
import { passwordProblem, userByEmail } from '../auth';
import type { UserRow } from '../auth';
import { createGroupMember, emailDomainOf, normalizeAddress, recordVerified } from '../billing/access-groups';
import { CARTS, initialPlanDates } from '../billing/catalog';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { audit } from '../console/audit';
import { clock, randomIds } from '../lib/clock';
import { finishPasswordSet } from '../routes/password';
import type { Database } from './client';
import { loadDb, persistDiff } from './io';
import { accounts, emailVerifications, orders, plans, users } from './schema';

/** The audit row's actor. `actor_source` can only be `system`; this names the step. */
export const SEED_TEST_MEMBER_ACTOR = 'system:seed-test-member';

/** What the step did. `absent` is an unset variable: nothing was considered. `skipped` wrote nothing. */
export type SeedTestMemberOutcome =
  | { status: 'absent' }
  | { status: 'created'; kind?: 'accelerator' }
  | { status: 'ensured' }
  | { status: 'unchanged' }
  | { status: 'skipped'; reason: 'exists' | 'email' | 'password' | 'kind' | 'refused' | 'error'; detail?: string };

export type SeedTestMemberKind = 'utah' | 'accelerator';

export interface SeedTestMemberInput {
  email: string;
  password: string;
  name: string;
  kind: SeedTestMemberKind | 'invalid';
}

const NAME_MAX = 200;

/**
 * The three variables, or null when the email or the password is unset. A blank name is the default.
 * The password is not trimmed: a password of spaces is set, and then refused by the sign-in rules.
 */
export function readSeedTestMember(env: NodeJS.ProcessEnv = process.env): SeedTestMemberInput | null {
  const email = env.SEED_TEST_MEMBER_EMAIL;
  const password = env.SEED_TEST_MEMBER_PASSWORD;
  if (email === undefined || email.trim() === '' || password === undefined || password === '') return null;
  const name = env.SEED_TEST_MEMBER_NAME;
  const kindRaw = (env.SEED_TEST_MEMBER_KIND ?? '').trim().toLowerCase();
  const kind = kindRaw === '' ? 'utah' : kindRaw === 'accelerator' ? 'accelerator' : 'invalid';
  return { email: email.trim(), password, name: name === undefined || name.trim() === '' ? 'Connor Test' : name.trim().slice(0, NAME_MAX), kind };
}

/** The deploy log's one line, or null when the variables were unset. Never the address or the password. */
export function seedTestMemberLine(out: SeedTestMemberOutcome): string | null {
  if (out.status === 'absent') return null;
  if (out.status === 'created' && out.kind === 'accelerator') return 'Test member: created a verified Accelerator learner. No email was sent.\n';
  if (out.status === 'created') return 'Test member: created a verified learner. No email was sent.\n';
  if (out.status === 'ensured') return 'Test member: the Accelerator enrollment is in place. Nothing else was written.\n';
  if (out.status === 'unchanged') return 'Test member: already enrolled. Nothing else was written.\n';
  const why = {
    exists: 'A user with that email already exists.',
    email: 'The email is not usable.',
    password: 'The password does not meet the sign-in rules.',
    kind: 'The kind is not one this step knows.',
    refused: 'That address cannot be a learner.',
    error: `An error stopped it (${out.detail ?? 'unknown'}).`,
  }[out.reason];
  return `Test member: skipped. ${why} Nothing was written.\n`;
}

const ACCELERATOR = CARTS['cohort-full'];

/** Mark a learner as the seeded test account, with early access. Returns whether the row changed. */
async function flagTestLearner(tx: Database, userId: string): Promise<boolean> {
  const [row] = await tx.select({ isTest: users.isTest, earlyAccess: users.earlyAccess }).from(users).where(eq(users.id, userId)).limit(1);
  if (row?.isTest && row.earlyAccess) return false;
  await tx.update(users).set({ isTest: true, earlyAccess: true }).where(eq(users.id, userId));
  return true;
}

/** Prove the address, keeping the first time. Returns whether this call wrote the row. */
async function ensureVerified(tx: Database, email: string, now: number): Promise<boolean> {
  const [row] = await tx.select({ email: emailVerifications.email }).from(emailVerifications).where(eq(emailVerifications.email, email)).limit(1);
  if (row) return false;
  await recordVerified(tx, email, now);
  return true;
}

/**
 * The account, order and plan a paid Accelerator purchase gets (`provisionOrder`), without Stripe,
 * without an email and without a GoHighLevel row. The order has no Stripe id and no amount. The
 * account's invite is marked sent so the held-invite loop does not mail it. Returns whether this
 * call wrote the plan.
 */
async function ensureAcceleratorPlan(tx: Database, user: UserRow, email: string, name: string, now: number): Promise<boolean> {
  let teamId = user.teamId;
  let userId = user.id;
  if (!teamId) {
    const before = await loadDb(tx);
    const owner = provisionOwner(before, { email, name, teamName: name, seats: ACCELERATOR.seats, tier: 'team', cohortId: DEFAULT_COHORT_ID }, { now, id: randomIds() });
    if (!owner.ok) return false;
    if (owner.db !== before) await persistDiff(tx, before, owner.db);
    teamId = owner.teamId;
    userId = owner.userId;
  }
  const [existing] = await tx.select().from(accounts).where(eq(accounts.ownerEmail, email)).limit(1);
  if (existing) {
    const [plan] = await tx
      .select({ id: plans.id })
      .from(plans)
      .where(and(eq(plans.accountId, existing.id), eq(plans.kind, 'cohort'), ne(plans.status, 'ended')))
      .limit(1);
    const held = existing.inviteSentAt === null;
    if (held) await tx.update(accounts).set({ inviteSentAt: now }).where(eq(accounts.id, existing.id));
    if (plan) return held;
  }
  const dates = initialPlanDates(ACCELERATOR, now, true);
  const ids = randomIds();
  const accountId = existing?.id ?? ids('acct');
  const orderId = ids('ord');
  if (!existing) {
    await tx.insert(accounts).values({
      id: accountId,
      teamId: teamId!,
      ownerUserId: userId,
      ownerEmail: email,
      name,
      createdAt: now,
      inviteSentAt: now,
    });
  }
  await tx.insert(orders).values({
    id: orderId,
    plan: 'cohort',
    option: 'full',
    origin: 'payment_link',
    status: 'paid',
    name,
    email,
    paymentsMade: 1,
    paidAt: now,
    accountId,
    createdAt: now,
  });
  await tx.insert(plans).values({
    id: ids('plan'),
    accountId,
    kind: 'cohort',
    option: 'full',
    seats: ACCELERATOR.seats,
    cohortId: dates.cohortId,
    status: 'active',
    startsAt: dates.startsAt,
    paidThrough: dates.paidThrough,
    liveUntil: dates.liveUntil,
    minimumUntil: dates.minimumUntil,
    orderId,
    createdAt: now,
  });
  return true;
}

/**
 * An Accelerator learner: the same account and plan a paid purchase writes, flagged so it does not
 * count as a seat, with early access. An address that already has a user keeps its password and
 * gains only the flag and the enrollment it does not already have.
 */
async function seedAccelerator(tx: Database, email: string, name: string, password: string): Promise<SeedTestMemberOutcome> {
  const at = clock.now();
  const existing = await userByEmail(tx, email);
  if (existing?.kind === 'staff') return { status: 'skipped', reason: 'refused' };
  let user = existing;
  let created = false;
  if (!user) {
    const before = await loadDb(tx);
    const owner = provisionOwner(
      before,
      { email, name, teamName: name, seats: ACCELERATOR.seats, tier: 'team', cohortId: DEFAULT_COHORT_ID },
      { now: at, id: randomIds() },
    );
    if (!owner.ok) return { status: 'skipped', reason: 'refused' };
    if (owner.db !== before) await persistDiff(tx, before, owner.db);
    user = await userByEmail(tx, email);
    if (!user) throw new Error('seed-test-member: the account was not written');
    await finishPasswordSet(tx, user, password, at, null);
    created = true;
  }
  const flagged = await flagTestLearner(tx, user.id);
  const verified = await ensureVerified(tx, email, at);
  const enrolled = await ensureAcceleratorPlan(tx, user, email, name, at);
  if (!created && !flagged && !verified && !enrolled) return { status: 'unchanged' };
  await audit(
    null,
    {
      action: 'user.seed',
      outcome: 'ok',
      actor: { source: 'system', role: SEED_TEST_MEMBER_ACTOR },
      target: { type: 'user', id: user.id },
      after: { email, kind: 'accelerator' },
    },
    tx,
  );
  return created ? { status: 'created', kind: 'accelerator' } : { status: 'ensured' };
}

/**
 * Create the learner when the variables name an address that has no user. An Accelerator address
 * that already has a user keeps that user and gains the flag and the enrollment. Anything else
 * writes nothing. An error is an outcome, not a throw: this runs in the pre-deploy command, and a
 * problem with one learner must not stop the deploy. The error's message is not logged; a database
 * error can quote the address.
 */
export async function seedTestMember(db: Database, env: NodeJS.ProcessEnv = process.env): Promise<SeedTestMemberOutcome> {
  const input = readSeedTestMember(env);
  if (!input) return { status: 'absent' };
  const email = normalizeAddress(input.email);
  if (!emailDomainOf(email)) return { status: 'skipped', reason: 'email' };
  if (passwordProblem(input.password)) return { status: 'skipped', reason: 'password' };
  if (input.kind === 'invalid') return { status: 'skipped', reason: 'kind' };
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(42)`);
      // Under the lock every mutation takes, so a second deploy waits and then finds the user.
      if (input.kind === 'accelerator') return seedAccelerator(tx as unknown as Database, email, input.name, input.password);
      if (await userByEmail(tx, email)) return { status: 'skipped', reason: 'exists' } as const;
      const at = clock.now();
      const id = await createGroupMember(tx, email, at, input.name);
      if (!id) return { status: 'skipped', reason: 'refused' } as const;
      await recordVerified(tx, email, at);
      const user = await userByEmail(tx, email);
      if (!user || user.id !== id) throw new Error('seed-test-member: the account was not written');
      // The set-password route's own ending, including the hash. Cast: those helpers are typed for
      // the pool, and this transaction is that pool inside `db.transaction`.
      await finishPasswordSet(tx as unknown as Database, user, input.password, at, null);
      await audit(
        null,
        {
          action: 'user.seed',
          outcome: 'ok',
          actor: { source: 'system', role: SEED_TEST_MEMBER_ACTOR },
          target: { type: 'user', id },
          after: { email },
        },
        tx,
      );
      return { status: 'created' } as const;
    });
  } catch (e) {
    return { status: 'skipped', reason: 'error', detail: e instanceof Error ? e.name : typeof e };
  }
}
