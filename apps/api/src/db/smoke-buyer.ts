// A regular AI Accelerator buyer, for smoke tests on a local or staging database (D-248, the Week 0
// launch audit's H-2). `pnpm --filter @ai/api db:smoke-buyer -- --email <address> [--name "Full Name"]`,
// with the password in `SMOKE_BUYER_PASSWORD`.
//
// WHY NOT THE TEST LEARNER. The deploy's test learner (D-200, D-202) is `is_test` and `early_access`.
// Early access opens the course before the cohort's Preview opens date and every week before its own
// date (`courseEntryFor`, `weekOpenFor`), and the v3 and v6 flags count a test account as on. A check
// that passes signed in as that account says nothing about what a buyer sees. This account is what a
// buyer is once they have paid and chosen a password, and nothing more.
//
// HOW IT IS MADE. A paid order (the AI Accelerator in full) with no Stripe id and no amount, handed to
// `provisionOrder`, the function the Stripe webhook calls: the same team and seats, the Team tier
// owner in cohort one, the account and the plan, by the same code. The invite is held
// (`invitesEnabled: false`), so no email goes out. Then the set-password flow's own ending
// (`finishPasswordSet`) stores the password and makes the owner active, and the account's invite is
// marked sent, so the held-invite loop never mails them. Neither `is_test` nor `early_access` is set.
// Nothing here calls Stripe, sends an email or writes a GoHighLevel row.
//
// CREATE OR REFRESH, AND RUN TWICE IT WRITES NOTHING. An address with no user gets the whole buyer. An
// address that is already a learner keeps its user and team, and gains what a buyer has that it lacks:
// a live Accelerator plan, this password, active status. A staff address, the seeded test learner and
// a learner seated on someone else's team are refused, writing nothing. One transaction, under the
// advisory lock every mutation takes, with one audited `user.seed` row when anything changed.
//
// NEVER PRODUCTION. A regular buyer takes one of the 15 founding seats, counts in enrollment and
// revenue, gets the reminders and, where GoHighLevel is set up (production only), is copied there. So
// it refuses the database the deployed site reads, by the rule the test harness uses (D-019,
// `apps/api/test/helpers.ts`): a database named `railway`. Railway names every environment's database
// `railway`, staging's too, so `railway` is allowed only when Railway says which environment this is
// and it is not production (`RAILWAY_ENVIRONMENT_NAME`, which Railway sets inside a service and in
// `railway run` / `railway ssh`). `RAILWAY_ENVIRONMENT_NAME=production` is refused whatever the name.
//
// THE PASSWORD. Read from `SMOKE_BUYER_PASSWORD`, never a flag (a flag stays in the shell's history and
// the process list) and never in the code. Hashed by the set-password helper and dropped: it is not in
// the audit row and never in a line this prints.

import { pathToFileURL } from 'node:url';
import { eq, sql } from 'drizzle-orm';
import { liveCoursePlan } from '@ai/core/release';
import { passwordHashOf, passwordProblem, userByEmail, verifyPassword } from '../auth';
import type { UserRow } from '../auth';
import { emailDomainOf, normalizeAddress } from '../billing/access-groups';
import { DEFAULT_INVITES_FROM } from '../billing/catalog';
import { provisionOrder } from '../billing/provision';
import type { BillingLog } from '../billing/provision';
import { audit } from '../console/audit';
import { plansForLearner } from '../lib/course-access';
import { clock, randomIds } from '../lib/clock';
import { finishPasswordSet } from '../routes/password';
import { close, databaseNameOf, getDb, readDatabaseUrl } from './client';
import type { Database } from './client';
import { accounts, orders, users } from './schema';

/** The audit row's actor. `actor_source` can only be `system`; this names the step. */
export const SMOKE_BUYER_ACTOR = 'system:seed-smoke-buyer';

/** The variable the password is read from. */
export const SMOKE_BUYER_PASSWORD_VAR = 'SMOKE_BUYER_PASSWORD';

/** The database the deployed site reads, in every Railway environment (D-019). */
export const DEPLOYED_DATABASE = 'railway';

const DEFAULT_NAME = 'Smoke Buyer';
const NAME_MAX = 200;

export const SMOKE_BUYER_USAGE = [
  'Usage:',
  `  ${SMOKE_BUYER_PASSWORD_VAR}=<password> pnpm --filter @ai/api db:smoke-buyer -- --email <address> [--name "Full Name"]`,
  '',
  '  Creates, or refreshes, one regular AI Accelerator buyer for smoke tests: the account, order, team',
  '  and plan a paid purchase provisions, active with this password, not a test account and without',
  '  early access. No Stripe call, no email. Safe to run twice.',
  '',
  `  The password is read from ${SMOKE_BUYER_PASSWORD_VAR} only. It refuses the database the deployed`,
  `  site reads (named '${DEPLOYED_DATABASE}'), unless RAILWAY_ENVIRONMENT_NAME names a Railway environment`,
  '  that is not production (staging, through `railway run` or `railway ssh`).',
].join('\n');

/** What the step did. `refused` wrote nothing. */
export type SmokeBuyerOutcome =
  | { status: 'created' }
  | { status: 'refreshed'; changed: SmokeBuyerChange[] }
  | { status: 'unchanged' }
  | { status: 'refused'; reason: 'staff' | 'test-account' | 'other-team' };

/** What a refresh changed on an address that already had a learner. */
export type SmokeBuyerChange = 'plan' | 'password' | 'active' | 'early-access';

/** The CLI's arguments. The password is not one of them. */
export interface SmokeBuyerArgs {
  email: string;
  name: string;
}

/**
 * The flags, or a usage error. `--email` is required and must be an address; `--name` is optional.
 * `--password` is refused outright, so a password never sits in the shell's history by mistake.
 */
export function parseSmokeBuyerArgs(argv: readonly string[]): SmokeBuyerArgs {
  if (argv.includes('--password')) throw new Error(`The password is read from ${SMOKE_BUYER_PASSWORD_VAR}, never a flag.\n\n${SMOKE_BUYER_USAGE}`);
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i === -1) return undefined;
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`--${name} needs a value\n\n${SMOKE_BUYER_USAGE}`);
    return value;
  };
  const raw = flag('email');
  if (raw === undefined) throw new Error(`--email is required\n\n${SMOKE_BUYER_USAGE}`);
  const email = normalizeAddress(raw);
  if (!emailDomainOf(email)) throw new Error(`--email needs an email address\n\n${SMOKE_BUYER_USAGE}`);
  const name = flag('name')?.trim().slice(0, NAME_MAX) || DEFAULT_NAME;
  return { email, name };
}

/** The password from the environment, or a sentence saying why not. Never echoes the value. */
export function readSmokeBuyerPassword(env: NodeJS.ProcessEnv): { ok: true; password: string } | { ok: false; error: string } {
  const password = env[SMOKE_BUYER_PASSWORD_VAR];
  if (password === undefined || password === '') return { ok: false, error: `Set ${SMOKE_BUYER_PASSWORD_VAR} to the password the buyer signs in with.` };
  const problem = passwordProblem(password);
  return problem ? { ok: false, error: `${SMOKE_BUYER_PASSWORD_VAR} does not meet the sign-in rules: ${problem}` } : { ok: true, password };
}

/**
 * Why this may not run against `databaseName`, or null when it may. Production is refused: by
 * Railway's own variable, and by the deployed database's name unless Railway says this is another
 * environment.
 */
export function smokeBuyerRefusal(databaseName: string, env: NodeJS.ProcessEnv): string | null {
  const railway = (env.RAILWAY_ENVIRONMENT_NAME ?? '').trim().toLowerCase();
  if (railway === 'production')
    return 'Refusing: RAILWAY_ENVIRONMENT_NAME is production. A regular buyer takes a founding seat and counts in enrollment and revenue, so this never runs there. Nothing was written.';
  if (databaseName === DEPLOYED_DATABASE && railway === '')
    return (
      `Refusing: DATABASE_URL points at '${DEPLOYED_DATABASE}', the database the deployed site reads, and nothing says which ` +
      'environment it is (DECISIONS.md D-019). Locally, use a development database. On staging, run it through ' +
      '`railway run` or `railway ssh` in the staging environment, which sets RAILWAY_ENVIRONMENT_NAME. Nothing was written.'
    );
  return null;
}

/** Thrown inside the transaction to roll back everything it wrote, turned into a `refused` outcome. */
class Refused extends Error {
  constructor(readonly reason: Extract<SmokeBuyerOutcome, { status: 'refused' }>['reason']) {
    super(reason);
  }
}

/** Provisioning's own log, quiet on success; anything it warns about is passed on. */
const provisionLog = (write: (line: string) => void): BillingLog => ({
  info: () => {},
  warn: (_o, m) => write(`${m}\n`),
  error: (_o, m) => write(`${m}\n`),
});

/**
 * The paid order a purchase leaves, then `provisionOrder` on it (the webhook's call), with the invite
 * held. No Stripe id, no amount: nothing here was charged. Refuses, rolling back, when provisioning
 * does (a staff address, or a learner seated on another owner's team).
 */
async function provisionBuyer(tx: Database, email: string, name: string, now: number, write: (line: string) => void): Promise<void> {
  const orderId = randomIds()('ord');
  await tx.insert(orders).values({ id: orderId, plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', name, email, paymentsMade: 1, paidAt: now, createdAt: now });
  // `invitesEnabled: false` holds the invite whatever `invitesFrom` says, so the default date is enough.
  const out = await provisionOrder(orderId, { db: tx, log: provisionLog(write), now, invitesFrom: Date.parse(DEFAULT_INVITES_FROM), invitesEnabled: false });
  if (!out.ok) throw new Refused(out.reason === 'staff-email' ? 'staff' : 'other-team');
}

/** The account's invite marked sent, as it is once a buyer has had their Set Your Password email. */
async function markInviteSent(tx: Database, email: string, now: number): Promise<void> {
  await tx.update(accounts).set({ inviteSentAt: now }).where(sql`${accounts.ownerEmail} = ${email} and ${accounts.inviteSentAt} is null`);
}

async function ensureBuyer(tx: Database, args: SmokeBuyerArgs, password: string, now: number, write: (line: string) => void): Promise<SmokeBuyerOutcome> {
  const existing = await userByEmail(tx, args.email);
  if (existing?.kind === 'staff') return { status: 'refused', reason: 'staff' };
  if (existing?.isTest) return { status: 'refused', reason: 'test-account' };

  if (!existing) {
    await provisionBuyer(tx, args.email, args.name, now, write);
    const user = await userByEmail(tx, args.email);
    if (!user) throw new Error('smoke-buyer: the account was not written');
    await finishPasswordSet(tx, user, password, now, null);
    await markInviteSent(tx, args.email, now);
    return { status: 'created' };
  }

  const changed: SmokeBuyerChange[] = [];
  if (existing.earlyAccess) {
    await tx.update(users).set({ earlyAccess: false }).where(eq(users.id, existing.id));
    changed.push('early-access');
  }
  if (!liveCoursePlan(await plansForLearner(tx, existing.id))) {
    await provisionBuyer(tx, args.email, args.name, now, write);
    changed.push('plan');
  }
  const user = (await userByEmail(tx, args.email)) as UserRow;
  const stored = await passwordHashOf(tx, user.id);
  const samePassword = stored !== null && (await verifyPassword(stored, password));
  if (!samePassword || user.status === 'invited') {
    if (!samePassword) changed.push('password');
    if (user.status === 'invited') changed.push('active');
    await finishPasswordSet(tx, user, samePassword ? null : password, now, null);
  }
  await markInviteSent(tx, args.email, now);
  return changed.length ? { status: 'refreshed', changed } : { status: 'unchanged' };
}

/** Create or refresh the buyer, in one transaction. A refusal writes nothing. */
export async function seedSmokeBuyer(db: Database, args: SmokeBuyerArgs, password: string, now: number = clock.now(), write: (line: string) => void = () => {}): Promise<SmokeBuyerOutcome> {
  try {
    return await db.transaction(async (raw) => {
      // Cast: the helpers are typed for the pool, and this transaction is that pool inside `transaction`.
      const tx = raw as unknown as Database;
      await tx.execute(sql`select pg_advisory_xact_lock(42)`);
      const out = await ensureBuyer(tx, args, password, now, write);
      if (out.status === 'created' || out.status === 'refreshed') {
        const user = (await userByEmail(tx, args.email))!;
        await audit(
          null,
          {
            action: 'user.seed',
            outcome: 'ok',
            actor: { source: 'system', role: SMOKE_BUYER_ACTOR },
            target: { type: 'user', id: user.id },
            after: { email: args.email, kind: 'smoke-buyer', ...(out.status === 'refreshed' ? { changed: out.changed } : {}) },
          },
          tx,
        );
      }
      return out;
    });
  } catch (e) {
    if (e instanceof Refused) return { status: 'refused', reason: e.reason };
    throw e;
  }
}

/** The line the CLI prints. It names the address, never the password. */
export function smokeBuyerLine(out: SmokeBuyerOutcome, email: string): string {
  const kept = 'Not a test account, no early access. No Stripe call and no email.';
  if (out.status === 'created') return `Created the regular AI Accelerator buyer ${email}: paid in full, Team tier owner of a team of its own in cohort dec26, active, with the password from ${SMOKE_BUYER_PASSWORD_VAR}. ${kept}\n`;
  if (out.status === 'refreshed') return `Refreshed the regular AI Accelerator buyer ${email} (${out.changed.join(', ')}). ${kept}\n`;
  if (out.status === 'unchanged') return `${email} is already a regular AI Accelerator buyer with this password. Nothing was written.\n`;
  const why = {
    staff: 'That address is a staff account.',
    'test-account': 'That address is the seeded test learner (D-200), which is what this account replaces for smoke tests. Use another address.',
    'other-team': 'That address is seated on another owner’s team.',
  }[out.reason];
  return `Refused: ${why} Nothing was written.\n`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/** What the CLI needs, so its routing and its guard are testable without a shell. */
export interface SmokeBuyerDeps {
  env: NodeJS.ProcessEnv;
  db: () => Database;
  close: () => Promise<void>;
  write: (line: string) => void;
  now: () => number;
}

/** The CLI: arguments, the password, the guard, then the write. Returns the exit code. */
export async function runSmokeBuyer(argv: readonly string[], deps: SmokeBuyerDeps): Promise<number> {
  let args: SmokeBuyerArgs;
  try {
    args = parseSmokeBuyerArgs(argv);
  } catch (e) {
    deps.write(`${(e as Error).message}\n`);
    return 2;
  }
  const pw = readSmokeBuyerPassword(deps.env);
  if (!pw.ok) {
    deps.write(`${pw.error}\n`);
    return 2;
  }
  // The guard reads the URL before anything connects, so a refusal cannot half-write.
  const name = databaseNameOf(readDatabaseUrl(deps.env));
  const refusal = smokeBuyerRefusal(name, deps.env);
  if (refusal) {
    deps.write(`${refusal}\n`);
    return 1;
  }
  deps.write(`Making sure ${args.email} is a regular AI Accelerator buyer in ${name}.\n`);
  const db = deps.db();
  try {
    const out = await seedSmokeBuyer(db, args, pw.password, deps.now(), deps.write);
    deps.write(smokeBuyerLine(out, args.email));
    return out.status === 'refused' ? 1 : 0;
  } finally {
    await deps.close();
  }
}

/** Only when this file is the entry point (compared as URLs, as seed.ts does, for Windows paths). */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSmokeBuyer(process.argv.slice(2), { env: process.env, db: getDb, close, write: (line) => process.stdout.write(line), now: () => clock.now() })
    .then((code) => {
      process.exitCode = code;
    })
    .catch((e: unknown) => {
      // The class and the message: a database error can quote the address, which this prints anyway.
      process.stderr.write(`${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}\n`);
      process.exitCode = 1;
    });
}
