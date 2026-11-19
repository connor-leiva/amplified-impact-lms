// One real learner, for seeing the portal as an agent does (D-200).
//
// The deploy's curriculum ensure (`db:curriculum:ensure`, the same pre-deploy step that runs
// `applyDataMigrations`) calls `seedTestMember` on every deploy. It is not a row in `data_migrations`.
// Those steps record themselves the first time they run, and an unset variable on that first deploy
// would mean the account was never created. This one decides from the variables each time: unset, it
// writes nothing and can still run on a later deploy; an address that already has a user, it leaves
// that user alone.
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

import { sql } from 'drizzle-orm';
import { passwordProblem, userByEmail } from '../auth';
import { createGroupMember, emailDomainOf, normalizeAddress, recordVerified } from '../billing/access-groups';
import { audit } from '../console/audit';
import { clock } from '../lib/clock';
import { finishPasswordSet } from '../routes/password';
import type { Database } from './client';

/** The audit row's actor. `actor_source` can only be `system`; this names the step. */
export const SEED_TEST_MEMBER_ACTOR = 'system:seed-test-member';

/** What the step did. `absent` is an unset variable: nothing was considered. `skipped` wrote nothing. */
export type SeedTestMemberOutcome =
  | { status: 'absent' }
  | { status: 'created' }
  | { status: 'skipped'; reason: 'exists' | 'email' | 'password' | 'refused' | 'error'; detail?: string };

export interface SeedTestMemberInput {
  email: string;
  password: string;
  name: string;
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
  return { email: email.trim(), password, name: name === undefined || name.trim() === '' ? 'Connor Test' : name.trim().slice(0, NAME_MAX) };
}

/** The deploy log's one line, or null when the variables were unset. Never the address or the password. */
export function seedTestMemberLine(out: SeedTestMemberOutcome): string | null {
  if (out.status === 'absent') return null;
  if (out.status === 'created') return 'Test member: created a verified learner. No email was sent.\n';
  const why = {
    exists: 'A user with that email already exists.',
    email: 'The email is not usable.',
    password: 'The password does not meet the sign-in rules.',
    refused: 'That address cannot be a learner.',
    error: `An error stopped it (${out.detail ?? 'unknown'}).`,
  }[out.reason];
  return `Test member: skipped. ${why} Nothing was written.\n`;
}

/**
 * Create the learner when the variables name an address that has no user. Anything else writes
 * nothing. An error is an outcome, not a throw: this runs in the pre-deploy command, and a problem
 * with one learner must not stop the deploy. The error's message is not logged; a database error
 * can quote the address.
 */
export async function seedTestMember(db: Database, env: NodeJS.ProcessEnv = process.env): Promise<SeedTestMemberOutcome> {
  const input = readSeedTestMember(env);
  if (!input) return { status: 'absent' };
  const email = normalizeAddress(input.email);
  if (!emailDomainOf(email)) return { status: 'skipped', reason: 'email' };
  if (passwordProblem(input.password)) return { status: 'skipped', reason: 'password' };
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(42)`);
      // Under the lock every mutation takes, so a second deploy waits and then finds the user.
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
