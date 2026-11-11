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
// `seedProduction()` itself. § 9.5 puts it in `@ai/core` and it is already there, pure and tested
// (`packages/core/src/seed-production.ts`). Its loader half is `seedForLaunch` below, which is the
// same three lines as `seedLive` because there is nothing different about writing it. What is
// missing is a CLI for it, and that is deliberate — see `seedForLaunch`.
//
// `SEED_WITH_BASELINE=1`, which the Gate 7 checklist mentions in passing. There is no table for
// `db.base`, so the flag can only mean materialising the demo's ~134 unmodelled learners as real
// rows. D-018 recorded it as deferred rather than guessed at, and nothing portal-visible needs it.

import { pathToFileURL } from 'node:url';
import { sql } from 'drizzle-orm';
import { applyAccelerator, seedForDatabase, seedProduction } from '@ai/core';
import type { Db, ProductionSeedOptions } from '@ai/core';
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
 * The Amplified AI Accelerator's curriculum, applied to a database that is already live (D-110).
 *
 * The launch seed refuses a database with users in it, and every paid order writes its buyer into
 * `users` the moment it is provisioned, so once sales start the launch seed can no longer carry the
 * course. This can: it loads the snapshot, runs `applyAccelerator` (core, pure, idempotent: cohort
 * `dec26`, its sixteen sessions and the nine course modules upserted, the prototype's modules drafted,
 * nothing else touched) and writes only the difference, under the same advisory lock every mutation
 * takes, in one transaction. Run twice, the second run writes nothing. Returns the number of rows
 * written or deleted, so the CLI can say "0 changes" when the curriculum is already current.
 */
export async function applyCurriculum(db: Database, opts: { instructor?: string } = {}): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(42)`);
    const before = await loadDb(tx);
    const after = applyAccelerator(before, opts);
    const changes = diffSnapshot(before, after).length;
    await persistDiff(tx, before, after);
    return changes;
  });
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
  '  tsx src/db/seed.ts --curriculum [--instructor "Full Name"]',
  '',
  '  --curriculum applies the Amplified AI Accelerator to a database that is already live (D-110):',
  '  cohort dec26, its sixteen sessions and the nine course modules, upserted. Users, teams,',
  '  progress and staff are not touched. Safe to run twice.',
].join('\n');

/**
 * The CLI's arguments.
 *
 * Exported because the thing worth testing here is not the writing — it is that `--launch` cannot
 * proceed without a real owner, which needs no database to check.
 */
export function parseSeedArgs(
  argv: readonly string[],
): { mode: 'live' } | { mode: 'launch'; opts: ProductionSeedOptions } | { mode: 'curriculum'; opts: { instructor?: string } } {
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i === -1) return undefined;
    const value = argv[i + 1];
    // A flag followed by another flag means its value was omitted. Failing here is what stops
    // `--owner-name --owner-email x@y.z` from seeding an Owner literally called `--owner-email`.
    if (value === undefined || value.startsWith('--')) throw new Error(`--${name} needs a value\n\n${USAGE}`);
    return value;
  };

  if (argv.includes('--curriculum')) {
    // One or the other: the launch seed loads an empty database, the curriculum updates a live one.
    if (argv.includes('--launch')) throw new Error(`--curriculum and --launch cannot be combined\n\n${USAGE}`);
    const instructor = flag('instructor');
    return { mode: 'curriculum', opts: instructor === undefined ? {} : { instructor } };
  }

  if (!argv.includes('--launch')) return { mode: 'live' };

  const name = flag('owner-name');
  const email = flag('owner-email');
  const missing = [name === undefined ? '--owner-name' : null, email === undefined ? '--owner-email' : null].filter(
    (x): x is string => x !== null,
  );
  if (missing.length > 0) throw new Error(`--launch requires ${missing.join(' and ')}\n\n${USAGE}`);

  const instructor = flag('instructor');
  const cohortId = flag('cohort');
  // The name and the address are validated by `seedProduction` itself, which throws on an owner it
  // could not mail. That is the right place for it: the rule has to hold for every caller of the
  // function, not only for the one that came through this CLI.
  return {
    mode: 'launch',
    opts: {
      owner: { name: name as string, email: email as string },
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
  curriculum: (db: Database, opts: { instructor?: string }) => Promise<number>;
  close: () => Promise<void>;
  name: () => string;
  write: (line: string) => void;
}

const REAL: SeedDeps = {
  db: getDb,
  live: (db) => seedLive(db),
  launch: (db, opts) => seedForLaunch(db, opts),
  curriculum: (db, opts) => applyCurriculum(db, opts),
  close,
  name: () => databaseNameOf(readDatabaseUrl()),
  write: (line) => process.stdout.write(line),
};

export async function runSeed(argv: readonly string[], deps: SeedDeps = REAL): Promise<void> {
  // Parsed BEFORE anything connects, so a usage error costs nothing and cannot half-write.
  const parsed = parseSeedArgs(argv);
  const name = deps.name();
  const db = deps.db();
  try {
    if (parsed.mode === 'curriculum') {
      deps.write(`Applying the Amplified AI Accelerator curriculum to ${name}.\n`);
      const changes = await deps.curriculum(db, parsed.opts);
      deps.write(`${changes} rows changed. Users, teams, progress and staff were not touched.\n`);
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

const entry = process.argv[1];
if (entry !== undefined && pathToFileURL(entry).href === import.meta.url) {
  await main().catch((e: unknown) => {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  });
}
