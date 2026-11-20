// The test harness for everything that touches Postgres — Gate 7's `resetDatabase` and `loadDb`.
//
// Gate 7's oracle suite is the thing this file exists for:
//
//   beforeEach(async () => { process.env.FIXED_NOW = …; await resetDatabase(seedForDatabase('live')); });
//
// That truncates every table and reloads the seed 37 times per run — once per mutation in the
// phase 02 catalog — and the authorization matrix and the http-mode parity suites do the same.
// Vitest runs several files at once, so without this file three suites would be truncating each
// other's rows mid-test and the failures would be nondeterministic, which is the worst kind.
//
// ---------------------------------------------------------------------------------------------
// ONE DATABASE PER CONCURRENCY SLOT, AND WHY IT IS `VITEST_POOL_ID` AND NOT `VITEST_WORKER_ID`
// ---------------------------------------------------------------------------------------------
// Vitest sets both. Measured in the installed version (5.0.3), its own declarations say:
//
//   VITEST_POOL_ID    "Exposed to test runner as `VITEST_POOL_ID`. Value is between 1-`maxWorkers`."
//   VITEST_WORKER_ID  "Exposed to test runner as `VITEST_WORKER_ID`. Value is unique per each
//                      isolated worker."
//
// Those are different guarantees and only one of them is the one we need. With isolation on (the
// default) every test FILE gets a fresh worker, so `VITEST_WORKER_ID` keeps climbing — 1, 2, 3, …
// past the number of files — and naming databases after it would `CREATE DATABASE` and run the
// migration once per file, then leave the lot behind. `VITEST_POOL_ID` is the concurrency SLOT:
// bounded by `maxWorkers`, and two files that are running at the same instant always have
// different ones. That is exactly the property "do not truncate each other" needs, and it caps the
// number of databases at the number of CPUs the runner chose rather than at the number of suites
// somebody writes later.
//
// Each slot's database is created on first use and migrated from the COMMITTED migration in
// `apps/api/drizzle` — not from `schema.ts` via push. The migration is what CI runs and what the
// deploy runs, so a test passing against a `drizzle-kit push` of the schema would be testing a
// schema that no environment actually has.
//
// It is kept, not dropped, between files in the same slot. The expensive artifact is the database
// (create, connect, migrate); the cheap one is the rows. An empty migrated database is precisely
// what the next file in this slot is about to ask for. `DROP_TEST_DB=1` drops it anyway, for a CI
// job that would rather not leave anything behind.
//
// ---------------------------------------------------------------------------------------------
// WHY `railway` IS CHECKED BY NAME
// ---------------------------------------------------------------------------------------------
// D-019: `railway` is the database the deployed Web service reads, and `ai_lms_dev` is the separate
// database in the same instance that development and tests use. This file's whole job is to
// truncate tables, so "which database am I pointed at" is not a detail — pointed at `railway` it is
// a data-loss bug that runs 37 times and reports success. The names are derived and asserted at
// import, before a connection exists, so a misconfigured `DATABASE_URL` fails on the first line of
// the first suite with a sentence about D-019 instead of quietly emptying production.

import { afterAll } from 'vitest';
import { is, getTableName, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import type { Db } from '@ai/core';
import { close, databaseNameOf, readDatabaseUrl, useDatabase, withDatabase } from '../src/db/client';
import type { Database } from '../src/db/client';
import { insertSnapshot, loadDb as loadDbFrom } from '../src/db/io';
import * as schema from '../src/db/schema';
import { settleEmails } from '../src/auth/mailer';
import { settleObserved } from '../src/lib/observe';

/** The database the deployed Web service reads. Nothing here may ever address it. D-019. */
const DEPLOYED_DATABASE = 'railway';

/** Where the committed migration lives: `apps/api/drizzle`, next to this file's parent. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle', import.meta.url));

/**
 * The concurrency slot this process is running in. See the header for why this is `POOL_ID` first.
 * `'1'` is the answer outside vitest (a one-off script importing this file), which matches the
 * value vitest gives a single-worker run.
 */
export const WORKER_SLOT = (process.env.VITEST_POOL_ID ?? process.env.VITEST_WORKER_ID ?? '1').replace(
  /[^0-9a-z]/gi,
  '',
);

/**
 * Which vitest RUN this is, as well as which slot within it.
 *
 * `VITEST_POOL_ID` is unique within one invocation and starts again at 1 in the next, so two
 * concurrent `vitest run` PROCESSES both get slot 1 and truncate each other's rows mid-test. That
 * is not hypothetical: three separate agents hit it and each worked around it privately, and it
 * then hung a full-suite run of mine for three hours against a database another process kept
 * emptying underneath it.
 *
 * `TEST_RUN_ID` closes it. It defaults to the process group — every worker of one `vitest run`
 * shares a parent, so they agree on it while a second invocation does not — and can be set
 * explicitly when something outside vitest needs a private database.
 *
 * Kept SHORT because Postgres truncates an identifier at 63 bytes silently, which would reintroduce
 * the very collision this fixes. Base 36 of the ppid is at most five characters.
 */
export const TEST_RUN_ID = (process.env.TEST_RUN_ID ?? (process.ppid || process.pid).toString(36))
  .replace(/[^0-9a-z]/gi, '')
  .slice(0, 6)
  .toLowerCase();

const BASE_URL = readDatabaseUrl();
const BASE_NAME = databaseNameOf(BASE_URL);

if (BASE_NAME === DEPLOYED_DATABASE) {
  throw new Error(
    `DATABASE_URL points at '${DEPLOYED_DATABASE}', the database the deployed site reads. The test ` +
      'harness truncates every table it touches, 37 times per oracle run, so it will not run from ' +
      "here. Point DATABASE_URL at a development database — 'ai_lms_dev' (DECISIONS.md D-019).",
  );
}

/**
 * This slot's database: the development database's name plus a slot suffix.
 *
 * Derived rather than configured so it cannot be aimed somewhere by an environment variable, and
 * truncated to 63 bytes because that is Postgres's identifier limit — a longer name is silently cut
 * server-side, which would make two slots collide on the same database and reintroduce the exact
 * cross-truncation this file prevents.
 */
export const TEST_DATABASE_NAME = `${BASE_NAME}_r${TEST_RUN_ID}_t${WORKER_SLOT}`.slice(0, 63);

if (TEST_DATABASE_NAME === DEPLOYED_DATABASE || !/^[a-z0-9_]+$/.test(TEST_DATABASE_NAME)) {
  throw new Error(
    `Refusing to use '${TEST_DATABASE_NAME}' as a test database. It must be a plain lower-case ` +
      `identifier and must never be '${DEPLOYED_DATABASE}' (DECISIONS.md D-019).`,
  );
}

export const TEST_DATABASE_URL = withDatabase(BASE_URL, TEST_DATABASE_NAME);

/**
 * Every table in `schema.ts`, read off the module rather than listed.
 *
 * A hand-written list is a second place to remember a new table, and the one that gets forgotten:
 * `job_runs` arrived in migration 0001 after the first sixteen. Missing a table here does not fail
 * — it leaves its rows standing between tests, which shows up as one suite seeing another's data.
 * The auth tables are included for the same reason: § 7.5's sessions and tokens are rows a sign-in
 * test leaves behind, and they are not part of any snapshot, so nothing else would clear them.
 */
const ALL_TABLES: string[] = [];
// `Object.values(schema)` is a union of fourteen distinct table types plus the two `pgEnum`s, and
// a type predicate over that union does not narrow (a `PgTable<TableConfig>` is not assignable to
// `PgTable<{ name: 'job_runs', … }>`). Widening to `unknown` first lets drizzle's own `is()` do the
// narrowing, which is what it is for.
for (const value of Object.values(schema) as unknown[]) {
  if (is(value, PgTable)) ALL_TABLES.push(getTableName(value));
}

// ---------------------------------------------------------------------------
// Creating the database
// ---------------------------------------------------------------------------

let ready: Promise<Database> | null = null;

/**
 * `CREATE DATABASE` cannot run inside a transaction and cannot run on the database it creates, so
 * it needs its own short-lived connection to a different database on the same server — the
 * development one named by `DATABASE_URL`. That connection only reads `pg_database` and issues the
 * create; it never writes a row.
 */
/**
 * Databases left behind by runs that are over.
 *
 * Scoping the name by run (see `TEST_RUN_ID`) is what stops two concurrent `vitest run` processes
 * truncating each other — but it also means every run mints its own set, and a set that is never
 * reclaimed grows without bound on a shared Postgres instance. `DROP_TEST_DB=1` cannot reclaim them
 * either: it only knows the database the importing file happened to land in.
 *
 * So each run sweeps on its way in, which is the one moment a process can be sure what is stale:
 * any `<base>_r*_t*` that is NOT this run's and has no live connection. `datconnlimit = -2` marks a
 * database already being dropped by someone else; `WITH (FORCE)` is not used, because a database
 * with a live connection belongs to a run that is still going.
 *
 * Failures here are swallowed deliberately. This is housekeeping, and a test run that cannot drop
 * somebody else's leftovers should still run.
 */
async function reclaimStale(admin: postgres.Sql): Promise<void> {
  try {
    // `<base>_%` rather than `<base>_r%`, so the sweep also reclaims databases from the earlier
    // slot-only naming (`ai_lms_dev_t3`) and from any private suffix someone used to dodge the
    // collision this run-scoping fixes. The underscore makes the pattern strictly longer than
    // `<base>`, so the development database itself can never match.
    const stale = await admin<{ datname: string }[]>`
      select d.datname
      from pg_database d
      where d.datname like ${`${BASE_NAME}\\_%`}
        and d.datname <> ${TEST_DATABASE_NAME}
        and d.datname not like ${`${BASE_NAME}\\_r${TEST_RUN_ID}\\_%`}
        and d.datconnlimit <> -2
        and not exists (select 1 from pg_stat_activity a where a.datname = d.datname)`;
    for (const { datname } of stale) {
      // Asserted against the same `^[a-z0-9_]+$` shape the name of this run's database is, and
      // bounded by the `like` above, so it cannot address `railway` or the development database.
      if (!/^[a-z0-9_]+$/.test(datname) || datname === DEPLOYED_DATABASE || datname === BASE_NAME) continue;
      try {
        await admin.unsafe(`drop database if exists "${datname}"`);
      } catch {
        /* another run is dropping it, or it acquired a connection between the select and here */
      }
    }
  } catch {
    /* housekeeping: never fail a test run over it */
  }
}

async function createIfMissing(): Promise<void> {
  const admin = postgres(BASE_URL, { max: 1, onnotice: () => {} });
  try {
    await reclaimStale(admin);
    const found = await admin`select 1 from pg_database where datname = ${TEST_DATABASE_NAME}`;
    if (found.length > 0) return;
    // The name is asserted `^[a-z0-9_]+$` above, so it is safe to interpolate — `unsafe` is here
    // because `create database` takes an identifier, which cannot be a bound parameter.
    await admin.unsafe(`create database "${TEST_DATABASE_NAME}"`);
  } catch (e: unknown) {
    // 42P04 duplicate_database: another process in this slot won the race between the select and
    // the create. The database existing is the desired outcome, so this is not a failure.
    if ((e as { code?: string }).code !== '42P04') throw e;
  } finally {
    await admin.end({ timeout: 5 });
  }
}

/**
 * This slot's database, created and migrated, once per process.
 *
 * `useDatabase` rather than a private pool: it redirects `client.ts`'s connection, which is what
 * `getDb()` hands the Fastify app under test. The app therefore talks to this database without
 * knowing a harness exists — and, critically, without depending on whether the test file imported
 * `../src/app` before or after `./helpers`. See `client.ts`'s header on import order.
 */
async function ensure(): Promise<Database> {
  ready ??= (async () => {
    await createIfMissing();
    const db = await useDatabase(TEST_DATABASE_URL);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return db;
  })();
  return ready;
}

/** This slot's drizzle handle, for a test that needs to reach past the snapshot codec. */
export const testDatabase = (): Promise<Database> => ensure();

// ---------------------------------------------------------------------------
// What the suites call
// ---------------------------------------------------------------------------

/**
 * Empty every table, then load `snapshot` if one was given — Gate 7's `beforeEach`.
 *
 * `truncate` over `delete from`, in one statement over all seventeen tables: it takes one lock pass
 * instead of seventeen, and it cannot leave a table half-emptied if the statement fails. `restart
 * identity` is harmless (no table has an identity column) and `cascade` likewise (there are no
 * foreign keys) — both are there so that adding either does not silently start leaving rows behind.
 *
 * The load runs in its own transaction so a failure mid-way leaves an empty database rather than a
 * partly seeded one, which the next test would read as missing rows rather than as a broken seed.
 */
export async function resetDatabase(snapshot?: Db): Promise<void> {
  const db = await ensure();
  // D-166: the email log's and usage's background writes from the last test land first; a TRUNCATE
  // racing one of them can deadlock (it locks every table, the insert reads `users`). The mail queue
  // first, since each send it still holds starts one of those writes.
  await settleEmails();
  await settleObserved();
  const names = ALL_TABLES.map((t) => `"${t}"`).join(', ');
  // A read the last test's app started can outlive the test: Health answers a source that runs past its
  // timeout as unavailable and leaves the query running (console-health.test.ts). The TRUNCATE then locks
  // its tables one by one while that read holds one and waits for another, and Postgres breaks the
  // deadlock (40P01) by aborting the TRUNCATE. The read finishes on its own, so the reset is tried again.
  const truncate = sql.raw(`truncate table ${names} restart identity cascade`);
  for (let attempt = 1; ; attempt++) {
    try {
      await db.execute(truncate);
      break;
    } catch (e) {
      const err = e as { code?: string; cause?: { code?: string } };
      if ((err.code ?? err.cause?.code) !== '40P01' || attempt >= 5) throw e;
      await new Promise((r) => setTimeout(r, 100 * attempt));
    }
  }
  if (snapshot) await db.transaction(async (tx) => void (await insertSnapshot(tx, snapshot)));
}

/**
 * § 7.3's `loadDb`, bound to this slot's database — the zero-argument form Gate 7's snippet calls.
 *
 * The same function the API uses, deliberately. A test harness with its own reader would be
 * comparing the API's writes against a second implementation of the thing under test, and the two
 * could agree on a shape that neither screen nor `@ai/core` accepts.
 */
export const loadDb = async (): Promise<Db> => loadDbFrom(await ensure());

/**
 * Drop this slot's database. Nothing calls it automatically — see the header on why the database is
 * kept — but a CI job that wants a clean instance can, and it is the only safe way to force the
 * migration to re-run from scratch after editing one.
 */
export async function dropTestDatabase(): Promise<void> {
  ready = null;
  await close();
  const admin = postgres(BASE_URL, { max: 1, onnotice: () => {} });
  try {
    await admin.unsafe(`drop database if exists "${TEST_DATABASE_NAME}" with (force)`);
  } finally {
    await admin.end({ timeout: 5 });
  }
}

/**
 * Release the connection when the file that imported this one is done.
 *
 * Registered at module scope on purpose: it runs during the importing test file's collection, so it
 * attaches to that file's root suite and every suite gets the teardown without writing it. Without
 * it the pool's sockets stay open and vitest cannot shut the worker down cleanly — which surfaces
 * as a run that passes and then hangs, the failure mode that looks like a flaky CI runner.
 *
 * It truncates on the way out as well as on the way in. Leaving one suite's rows behind means the
 * next file's first assertion runs against them if that file forgets its own `beforeEach`, and the
 * resulting failure points at the wrong suite.
 */
afterAll(async () => {
  if (ready) {
    try {
      await resetDatabase();
    } catch {
      /* the database may already be gone (dropTestDatabase); closing is what matters here */
    }
  }
  if (process.env.DROP_TEST_DB === '1') {
    await dropTestDatabase();
    return;
  }
  ready = null;
  await close();
});
