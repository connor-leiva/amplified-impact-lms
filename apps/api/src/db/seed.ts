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
import { seedForDatabase, seedProduction } from '@ai/core';
import type { Db, ProductionSeedOptions } from '@ai/core';
import { close, databaseNameOf, getDb, readDatabaseUrl } from './client';
import type { Database } from './client';
import { insertSnapshot } from './io';
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
 * Deliberately NOT wired to the CLI below. § 9.5's first step takes a real person's name and
 * address — the only account that can sign in to the console — and inventing environment variables
 * to carry them is the kind of thing that ends with `owner@example.com` holding the only Owner seat
 * in production. See the handoff notes.
 */
export const seedForLaunch = (
  db: Database,
  opts: ProductionSeedOptions,
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> => seedSnapshot(db, seedProduction(opts), env);

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
async function main(): Promise<void> {
  const url = readDatabaseUrl();
  const name = databaseNameOf(url);
  const db = getDb();
  try {
    const rows = await seedLive(db);
    process.stdout.write(`Seeded ${rows} rows into ${name} from seedForDatabase('live').\n`);
  } finally {
    await close();
  }
}

const entry = process.argv[1];
if (entry !== undefined && pathToFileURL(entry).href === import.meta.url) {
  await main().catch((e: unknown) => {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  });
}
