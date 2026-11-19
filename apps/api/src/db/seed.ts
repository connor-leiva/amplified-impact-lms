// The seeder — phase 07 § 7.7: "`apps/api/src/db/seed.ts` loads `seedForDatabase('live')` into an
// empty database, inside a transaction. It refuses to run if `NODE_ENV === 'production'` and any
// `users` rows exist."
//
// Run it with `pnpm --filter @ai/api exec tsx src/db/seed.ts` (§ 7.2 names the script `db:seed`;
// adding it to `apps/api/package.json` is somebody else's file — see the handoff notes).
//
// ---------------------------------------------------------------------------------------------
// WHY IT REFUSES ON A NON-EMPTY DATABASE IN EVERY ENVIRONMENT, NOT ONLY IN PRODUCTION
// ---------------------------------------------------------------------------------------------
// § 7.7 asks for two things in one sentence: load "into an empty database", and refuse in
// production when it is not empty. A seeder that only guards production still has to answer what it
// does with a non-empty development database, and there are three possible answers:
//
//   - truncate and reload. The one behaviour D-019 exists to keep out of a hand-run script: this is
//     a public entry point, `DATABASE_URL` is one typo away from the deployed database, and
//     "re-seeds the database it is pointed at" is indistinguishable from "destroys it".
//   - insert anyway. Every row collides on its primary key, the transaction aborts, and the operator
//     reads a Postgres duplicate-key error about `users_pkey` instead of a sentence about seeding.
//   - refuse, and say what to do. What this does.
//
// So the guard is the same everywhere and only the message changes: in production it says it will
// not touch the data, elsewhere it points at the test harness, which is the thing that *is*
// allowed to truncate because it only ever addresses a per-worker database it created itself.
// This is strictly stronger than § 7.7 asks for and loses nothing — an empty database, which is
// the case § 7.7 describes, behaves exactly as specified.
//
// ---------------------------------------------------------------------------------------------
// WHAT IS NOT HERE
// ---------------------------------------------------------------------------------------------
// `seedProduction()` itself. § 9.5 puts it in `@ai/core`, and since D-173 it lives with the rest of
// the one-time seed, pure and tested (`packages/core/seed/curriculum.ts`, imported as
// `@ai/core/seed/curriculum`, which runtime code may not import). Its loader half is `seedForLaunch`
// below, which is the same three lines as `seedLive` because there is nothing different about
// writing it. What is missing is a CLI for it, and that is deliberate — see `seedForLaunch`.
//
// `SEED_WITH_BASELINE=1`, which the Gate 7 checklist mentions in passing. There is no table for
// `db.base`, so the flag can only mean materialising the demo's ~134 unmodelled learners as real
// rows. D-018 recorded it as deferred rather than guessed at, and nothing portal-visible needs it.

import { pathToFileURL } from 'node:url';
import { sql } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import type { Db } from '@ai/core';
import { ensureCurriculum, seedProduction } from '@ai/core/seed/curriculum';
import { applyDataMigrations } from './data-migrations';
import type { DataMigrationReport } from './data-migrations';
import { seedTestMember, seedTestMemberLine } from './seed-test-member';
import type { SeedTestMemberOutcome } from './seed-test-member';
import type { ProductionSeedOptions } from '@ai/core/seed/curriculum';
import { close, databaseNameOf, getDb, readDatabaseUrl } from './client';
import type { Database } from './client';
import { diffSnapshot } from './codec';
import { insertSnapshot, loadDb, persistDiff } from './io';
import type { Queryable } from './io';
import * as schema from './schema';

/**
 * Thrown when the target database already holds learners.
 *
 * A distinct class so the CLI can print one sentence and exit 1, while a caller that genuinely
 * wants "seed if empty, otherwise carry on" (a first-boot hook, say) can catch exactly this and
 * nothing else.
 */
export class SeedRefused extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedRefused';
  }
}

/**
 * Whether any `users` row exists.
 *
 * `limit(1)` rather than `count(*)`: the question is existence, the table is the one § 7.7 names,
 * and on a seeded database a count would scan every row to answer something a single row settles.
 */
export async function hasUsers(tx: Queryable): Promise<boolean> {
  const found = await tx.select({ id: schema.users.id }).from(schema.users).limit(1);
  return found.length > 0;
}

/** § 7.7's guard. See the header for why it is not conditional on `NODE_ENV`. */
export async function assertEmpty(tx: Queryable, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  if (!(await hasUsers(tx))) return;

  const where = (() => {
    try {
      return ` (${databaseNameOf(readDatabaseUrl(env))})`;
    } catch {
      return '';
    }
  })();

  throw new SeedRefused(
    env.NODE_ENV === 'production'
      ? `Refusing to seed: NODE_ENV is production and the database${where} already has users. ` +
        'The seed would collide with live data, so nothing was written.'
      : `Refusing to seed: the database${where} already has users, and the seed loads into an ` +
        'empty database. Drop and re-migrate it, or use apps/api/test/helpers.ts, which truncates ' +
        'only the per-worker database it created itself (DECISIONS.md D-019).',
  );
}

/**
 * Load one snapshot into an empty database, inside a transaction.
 *
 * The transaction is § 7.7's word and it is load-bearing: the guard and the writes have to be one
 * atomic act, or a seeder that fails on the eleventh table leaves a half-populated database that
 * the guard will then refuse to fix. Returning the row count gives the CLI something true to print
 * instead of "done".
 */
export async function seedSnapshot(db: Database, snapshot: Db, env: NodeJS.ProcessEnv = process.env): Promise<number> {
  return db.transaction(async (tx) => {
    await assertEmpty(tx, env);
    return insertSnapshot(tx, snapshot);
  });
}

/** § 7.7 exactly: `seedForDatabase('live')` into an empty database. */
export const seedLive = (db: Database, env: NodeJS.ProcessEnv = process.env): Promise<number> =>
  seedSnapshot(db, seedForDatabase('live'), env);

/**
 * § 9.5's launch seed, loaded.
 *
 * `seedProduction(opts)` already exists in `@ai/core` and is pure — it derives the curriculum, the
 * price list, the reminder toggles, the permission matrix, one Owner and one cohort from `seed()`
 * and reads no clock. That is the half § 9.5 wanted there; this is the half that writes it, and it
 * is three lines because there is nothing different about writing it. Same guard, same transaction,
 * same loader.
 *
 * Reachable from the CLI below, but ONLY through explicit flags. § 9.5's first step takes a real
 * person's name and address — the only account that can sign in to the console — and carrying them
 * in environment variables is the kind of thing that ends with `owner@example.com` holding the
 * Owner seat in production. A flag cannot be inherited from a shell, a `.env` or a Railway
 * variable; it has to be typed, which is the whole reason it is a flag.
 */
export const seedForLaunch = (
  db: Database,
  opts: ProductionSeedOptions,
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> => seedSnapshot(db, seedProduction(opts), env);

/**
 * `--curriculum` (the deploy's `db:curriculum:ensure`, after `db:migrate`) makes sure the curriculum
 * is there and never overwrites it (D-173). The old full overlay rewrote every course row but the few
 * fields it kept: a session staff moved went back to its old time, and a module edited in the Module
 * Builder, or set to draft, reverted to the code's copy. That path is gone. Changing the course on a
 * live database means editing it in the curriculum builder, where each save is audited.
 */
export interface CurriculumOptions {
  instructor?: string;
  /**
   * Accepted for the deploy's `db:curriculum:ensure` and changes nothing: since D-173 every run is
   * insert-missing only, with or without it. There is no overwrite path left to opt out of.
   */
  ifMissing?: boolean;
}

/**
 * The Amplified AI Accelerator's curriculum, made sure of in a database that may be live (D-110, D-173).
 *
 * The launch seed refuses a database with users in it, and every paid order writes its buyer into
 * `users` the moment it is provisioned, so once sales start the launch seed can no longer carry the
 * course. This can: it loads the snapshot, runs `ensureCurriculum` (core seed, pure: a database that
 * has never had the course gets every seed row it lacks, one that has it gets no new course row, and
 * an existing row only gains D-173's new columns while they are empty, so a builder edit is never
 * replaced and nothing staff deleted comes back) and writes only the difference, under the same
 * advisory lock every mutation takes, in one transaction. Run twice, the second run writes nothing.
 * Returns the number of rows written, so the CLI can say "0 changes" when the curriculum is already there.
 */
export async function applyCurriculum(db: Database, opts: CurriculumOptions = {}): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(42)`);
    const before = await loadDb(tx);
    const after = ensureCurriculum(before, opts.instructor === undefined ? {} : { instructor: opts.instructor });
    const changes = diffSnapshot(before, after).length;
    await persistDiff(tx, before, after);
    return changes;
  });
}

/**
 * The Owner, alone, for a database that has buyers but never had the launch seed (Ampy, 2026-11-11).
 *
 * `db:seed:prod` is the only other way an Owner gets in, and it refuses a database with users, which
 * every paid order writes. This adds the one account that can sign in to the console, and, only if
 * the permissions table is empty, the launch seed's role matrix (the Owner passes every check
 * without it; the other staff roles need it). Nothing else: no learner, team, order, plan, progress,
 * cohort, module, price or reminder row is read for writing or written.
 *
 * Guarded like the launch seed: the name and address are flags with no default and are never read
 * from the environment (`seedProduction` validates them). It refuses, writing nothing, when the
 * database already has a different Owner or the address already signs in here as someone else. Run
 * twice with the same address it writes nothing the second time.
 */
export class OwnerRefused extends Error {
  readonly name = 'OwnerRefused';
  /** Why, as a word: the deploy's step logs this and never the message, which names the address. */
  constructor(
    message: string,
    readonly reason: 'other-owner' | 'address-taken' | 'id-taken',
  ) {
    super(message);
  }
}

export async function addOwner(db: Database, opts: { owner: { name: string; email: string } }): Promise<number> {
  const launch = seedProduction({ owner: opts.owner });
  const owner = launch.staff.find((x) => x.role === 'Owner')!;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(42)`);
    const before = await loadDb(tx);
    const same = (email: string): boolean => email.trim().toLowerCase() === owner.email;
    const current = before.staff.find((x) => x.role === 'Owner');
    if (current && same(current.email)) return 0;
    if (current) throw new OwnerRefused('This database already has an Owner. Nothing was written; change the Owner from Staff & Roles in the console.', 'other-owner');
    if (before.users.some((u) => same(u.email)) || before.staff.some((x) => same(x.email))) {
      throw new OwnerRefused(`${owner.email} already signs in here as someone else. Nothing was written.`, 'address-taken');
    }
    if (before.staff.some((x) => x.id === owner.id)) throw new OwnerRefused(`A staff row already has the id ${owner.id}. Nothing was written.`, 'id-taken');
    const after: Db = structuredClone(before);
    after.staff.push(owner);
    const noPerms = Object.values(before.perms ?? {}).every((byPerm) => Object.keys(byPerm ?? {}).length === 0);
    if (noPerms) after.perms = launch.perms;
    const changes = diffSnapshot(before, after).length;
    await persistDiff(tx, before, after);
    return changes;
  });
}

/**
 * The deploy's Owner (Connor, 2026-11-11): the account that signs in to the console, made by the
 * pre-deploy command on every deploy, after the migrations and the curriculum (`db:owner:ensure`).
 *
 * IN THE CODE, NOT THE ENVIRONMENT. Like the launch seed's flags, it is never read from a variable: an
 * Owner inherited from a shell, a .env or a Railway variable is how production ends up owned by the
 * wrong address. Changing it is a pull request. Once an Owner exists, changing it here does nothing
 * (the step skips a database with a different Owner); change the Owner from Staff & Roles instead.
 */
export const DEPLOY_OWNER = { name: 'Connor Leiva', email: 'connor@springb.com' } as const;

/** What `ensureOwner` did. `skipped` wrote nothing; `reason` is a word, never the address. */
export type OwnerEnsureOutcome =
  | { status: 'created'; changes: number }
  | { status: 'unchanged' }
  | { status: 'skipped'; reason: OwnerRefused['reason'] | 'error'; detail?: string };

/**
 * `addOwner` for the deploy: the same writes (the Owner, and the staff role matrix only if it is
 * empty; no learner, team, order, plan, seat, progress or course row), with every refusal and every
 * error turned into an outcome instead of a throw. A deploy must never fail over the Owner: if this
 * database already has a different Owner, or the address already signs in as someone else, it says
 * so and writes nothing, and the deploy goes on. `addOwner` runs in one transaction, so an error
 * part way writes nothing either.
 */
export async function ensureOwner(db: Database, owner: { name: string; email: string } = DEPLOY_OWNER): Promise<OwnerEnsureOutcome> {
  try {
    const changes = await addOwner(db, { owner });
    return changes === 0 ? { status: 'unchanged' } : { status: 'created', changes };
  } catch (e) {
    if (e instanceof OwnerRefused) return { status: 'skipped', reason: e.reason };
    // The class only: a message can carry the address (seedProduction's "not a usable email").
    return { status: 'skipped', reason: 'error', detail: e instanceof Error ? e.name : typeof e };
  }
}

/** The deploy log's one line for an outcome. Never the Owner's name or address, nor the database's. */
export function ownerEnsureLine(out: OwnerEnsureOutcome): string {
  const kept = 'Learners, teams, orders, plans, seats and the course were not touched.';
  if (out.status === 'created') return `Owner: created the console’s Owner (${out.changes} rows, with the staff role matrix if it was empty). ${kept}\n`;
  if (out.status === 'unchanged') return 'Owner: already set. Nothing was written.\n';
  const why = {
    'other-owner': 'this database already has a different Owner. Change the Owner from Staff & Roles in the console.',
    'address-taken': 'the Owner’s address already signs in here as another account.',
    'id-taken': 'a staff row already has the Owner’s id.',
    error: `an error stopped it (${out.detail ?? 'unknown'}).`,
  }[out.reason];
  return `Owner: skipped, ${why} Nothing was written, and the deploy goes on.\n`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/**
 * Only when this file is the entry point.
 *
 * Compared as a URL rather than as a path because `process.argv[1]` is a Windows path with
 * backslashes and `import.meta.url` is a `file://` URL; string-comparing the two never matches on
 * this machine, which would make `tsx src/db/seed.ts` a silent no-op.
 */
const USAGE = [
  'Usage:',
  '  tsx src/db/seed.ts                  load the demo seed (seedForDatabase("live"))',
  '  tsx src/db/seed.ts --launch --owner-name "Full Name" --owner-email name@example.com',
  '                                      [--instructor "Full Name"] [--cohort <cohortId>]',
  '',
  '  --launch loads § 9.5\'s launch seed: the curriculum, the price list, the reminder toggles,',
  '  the permission matrix, ONE Owner and ONE cohort. No demo learners, teams, requests or',
  '  activity.',
  '',
  '  The owner flags have no defaults and are never read from the environment. They name the only',
  '  account that can sign in to the console, and a value inherited from a shell, a .env or a',
  '  Railway variable is how production ends up owned by owner@example.com.',
  '',
  '  tsx src/db/seed.ts --curriculum [--instructor "Full Name"] [--if-missing]',
  '',
  '  --curriculum makes sure the Amplified AI Accelerator is in a database that may be live (D-110,',
  '  D-173): cohort dec26, its sessions, the nine course modules and the copy strings, put in once.',
  '  An existing row is never overwritten (it only gains columns D-173 added while they are empty),',
  '  and a week or session staff deleted is not put back. Users, teams, progress and staff are not',
  '  touched. Safe to run any number of times.',
  '',
  '  --if-missing is accepted and changes nothing: every run is insert-missing. The deploy runs',
  '  db:curriculum:ensure. To change the course, edit it in the curriculum builder.',
  '',
  '  tsx src/db/seed.ts --owner --owner-name "Full Name" --owner-email name@example.com',
  '',
  '  --owner adds ONLY the Owner (and the staff role matrix, if it is empty) to a database that has',
  '  buyers but never had the launch seed. It refuses if a different Owner exists or the address',
  '  already signs in here. Safe to run twice. The flags have no defaults and are never read from',
  '  the environment.',
  '',
  '  tsx src/db/seed.ts --owner-ensure',
  '',
  '  --owner-ensure is the deploy\'s form (db:owner:ensure): --owner for DEPLOY_OWNER, which is in the',
  '  code. It takes no flags, prints neither the name nor the address, and never fails: a database',
  '  with a different Owner, or with that address on another account, is logged and skipped.',
].join('\n');

/**
 * The CLI's arguments.
 *
 * Exported because the thing worth testing here is not the writing — it is that `--launch` cannot
 * proceed without a real owner, which needs no database to check.
 */
export function parseSeedArgs(
  argv: readonly string[],
):
  | { mode: 'live' }
  | { mode: 'launch'; opts: ProductionSeedOptions }
  | { mode: 'curriculum'; opts: CurriculumOptions }
  | { mode: 'owner'; opts: { owner: { name: string; email: string } } }
  | { mode: 'owner-ensure' } {
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i === -1) return undefined;
    const value = argv[i + 1];
    // A flag followed by another flag means its value was omitted. Failing here is what stops
    // `--owner-name --owner-email x@y.z` from seeding an Owner literally called `--owner-email`.
    if (value === undefined || value.startsWith('--')) throw new Error(`--${name} needs a value\n\n${USAGE}`);
    return value;
  };

  const owners = (verb: string) => {
    const name = flag('owner-name');
    const email = flag('owner-email');
    const missing = [name === undefined ? '--owner-name' : null, email === undefined ? '--owner-email' : null].filter(
      (x): x is string => x !== null,
    );
    if (missing.length > 0) throw new Error(`${verb} requires ${missing.join(' and ')}\n\n${USAGE}`);
    return { name: name as string, email: email as string };
  };

  if (argv.includes('--owner-ensure')) {
    // The deploy's Owner is in the code (DEPLOY_OWNER), so this takes nothing, and stands alone.
    const others = ['--owner', '--launch', '--curriculum', '--owner-name', '--owner-email'].filter((f) => argv.includes(f));
    if (others.length) throw new Error(`--owner-ensure takes no other flags (got ${others.join(', ')})\n\n${USAGE}`);
    return { mode: 'owner-ensure' };
  }

  if (argv.includes('--owner')) {
    // Its own command: the launch seed already brings an Owner, and the curriculum never touches staff.
    if (argv.includes('--launch') || argv.includes('--curriculum')) throw new Error(`--owner cannot be combined with --launch or --curriculum\n\n${USAGE}`);
    return { mode: 'owner', opts: { owner: owners('--owner') } };
  }

  if (argv.includes('--curriculum')) {
    // One or the other: the launch seed loads an empty database, the curriculum updates a live one.
    if (argv.includes('--launch')) throw new Error(`--curriculum and --launch cannot be combined\n\n${USAGE}`);
    const instructor = flag('instructor');
    return {
      mode: 'curriculum',
      opts: { ...(instructor === undefined ? {} : { instructor }), ...(argv.includes('--if-missing') ? { ifMissing: true } : {}) },
    };
  }

  if (!argv.includes('--launch')) return { mode: 'live' };

  const { name, email } = owners('--launch');

  const instructor = flag('instructor');
  const cohortId = flag('cohort');
  // The name and the address are validated by `seedProduction` itself, which throws on an owner it
  // could not mail. That is the right place for it: the rule has to hold for every caller of the
  // function, not only for the one that came through this CLI.
  return {
    mode: 'launch',
    opts: {
      owner: { name, email },
      ...(instructor === undefined ? {} : { instructor }),
      ...(cohortId === undefined ? {} : { cohortId }),
    },
  };
}

async function main(): Promise<void> {
  await runSeed(process.argv.slice(2));
}

/**
 * Everything `main` does except reading `process.argv` and owning the connection.
 *
 * Split out, and taking its collaborators as arguments, for one reason: the bug this file actually
 * shipped was not in the parser, it was in the WIRING. `main` called the seeder directly and never
 * consulted `process.argv` at all, so `db:seed:prod` passed `--launch` and loaded the DEMO seed —
 * fourteen invented learners with plausible addresses, one `remindMembers` click from being mailed.
 * A test of `parseSeedArgs` alone cannot see that, and did not: the suite stayed green with the
 * defect reintroduced.
 *
 * So the routing is testable here, without a database. `deps` exists to be substituted, not to be
 * configurable.
 */
export interface SeedDeps {
  db: () => Database;
  live: (db: Database) => Promise<number>;
  launch: (db: Database, opts: ProductionSeedOptions) => Promise<number>;
  curriculum: (db: Database, opts: CurriculumOptions) => Promise<number>;
  /** D-175: the one-time data steps, run after ensure on every deploy (each runs once). */
  dataMigrations: (db: Database) => Promise<DataMigrationReport[]>;
  /** D-200: one learner, when the test-member variables are set. Unset, it writes nothing. */
  seedTestMember: (db: Database) => Promise<SeedTestMemberOutcome>;
  owner: (db: Database, opts: { owner: { name: string; email: string } }) => Promise<number>;
  ownerEnsure: (db: Database) => Promise<OwnerEnsureOutcome>;
  close: () => Promise<void>;
  name: () => string;
  write: (line: string) => void;
}

const REAL: SeedDeps = {
  db: getDb,
  live: (db) => seedLive(db),
  launch: (db, opts) => seedForLaunch(db, opts),
  curriculum: (db, opts) => applyCurriculum(db, opts),
  dataMigrations: (db) => applyDataMigrations(db, Date.now()),
  seedTestMember: (db) => seedTestMember(db),
  owner: (db, opts) => addOwner(db, opts),
  ownerEnsure: (db) => ensureOwner(db),
  close,
  name: () => databaseNameOf(readDatabaseUrl()),
  write: (line) => process.stdout.write(line),
};

export async function runSeed(argv: readonly string[], deps: SeedDeps = REAL): Promise<void> {
  // Parsed BEFORE anything connects, so a usage error costs nothing and cannot half-write.
  const parsed = parseSeedArgs(argv);
  if (parsed.mode === 'owner-ensure') return runOwnerEnsure(deps);
  const name = deps.name();
  const db = deps.db();
  try {
    if (parsed.mode === 'curriculum') {
      deps.write(`Making sure the Amplified AI Accelerator curriculum is in ${name}. Existing rows are never overwritten.\n`);
      const changes = await deps.curriculum(db, parsed.opts);
      deps.write(`${changes} rows changed. Users, teams, progress and staff were not touched.\n`);
      if (changes === 0) deps.write('The curriculum is already here, so every edit made in the builder stays.\n');
      // D-175: the one-time data steps, each once. A row staff changed is left for the PM, by name.
      for (const r of await deps.dataMigrations(db)) {
        deps.write(`Ran ${r.id}: ${r.describe}. ${r.changed} rows changed.\n`);
        for (const sk of r.skipped) deps.write(`  Left as it is: ${sk.id} (${sk.reason}). Finish it in the builder.\n`);
      }
      // D-200: the same command, every deploy. Unset variables write nothing and log nothing, so a
      // deploy before the variables exist is unchanged. The line never carries the address or the password.
      const memberLine = seedTestMemberLine(await deps.seedTestMember(db));
      if (memberLine) deps.write(memberLine);
      return;
    }
    if (parsed.mode === 'owner') {
      // Named out loud before anything is written, like the launch seed.
      deps.write(`Adding the Owner ${parsed.opts.owner.email} to ${name}, and the staff role matrix if it is empty.\n`);
      const changes = await deps.owner(db, parsed.opts);
      deps.write(
        changes === 0
          ? 'That address is already the Owner here. Nothing was written.\n'
          : `${changes} rows changed. Learners, teams, orders, plans, progress and the course were not touched.\n`,
      );
      return;
    }
    if (parsed.mode === 'launch') {
      // Named out loud before anything is written. This is the one command here whose target being
      // wrong is unrecoverable, and the database name is the only thing distinguishing production
      // from development.
      deps.write(`Loading the LAUNCH seed into ${name}, owned by ${parsed.opts.owner.email}.\n`);
      const rows = await deps.launch(db, parsed.opts);
      deps.write(
        `Seeded ${rows} rows. Next, § 9.5 steps 2 and 3: upload resources through the Vault, then invite staff and learners.\n`,
      );
      return;
    }
    const rows = await deps.live(db);
    deps.write(`Seeded ${rows} rows into ${name} from seedForDatabase('live').\n`);
  } finally {
    await deps.close();
  }
}

/**
 * The deploy's Owner step. It never throws, so the pre-deploy command never stops on it: not on a
 * refusal, not on an error (the database name is not even read, since the steps before it already
 * reached the database). One line goes to the deploy log, naming no one.
 */
async function runOwnerEnsure(deps: SeedDeps): Promise<void> {
  const failed = (e: unknown) => ownerEnsureLine({ status: 'skipped', reason: 'error', detail: e instanceof Error ? e.name : typeof e });
  let db: Database;
  try {
    db = deps.db();
  } catch (e) {
    deps.write(failed(e));
    return;
  }
  try {
    deps.write(ownerEnsureLine(await deps.ownerEnsure(db)));
  } catch (e) {
    deps.write(failed(e));
  } finally {
    await deps.close().catch(() => undefined);
  }
}

const entry = process.argv[1];
if (entry !== undefined && pathToFileURL(entry).href === import.meta.url) {
  await main().catch((e: unknown) => {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  });
}
