// The Postgres connection — phase 07 § 7.1: "Drizzle ORM with `postgres` (porsager)".
//
// This file owns four things and nothing else: where DATABASE_URL comes from, what happens when it
// is absent, how big the pool is, and how the process lets go of it on shutdown. No query lives
// here; `io.ts` holds the snapshot reads and writes and `seed.ts` the loader.
//
// ---------------------------------------------------------------------------------------------
// WHY THERE IS NO `export const db`
// ---------------------------------------------------------------------------------------------
// The obvious shape is `export const db = drizzle(postgres(process.env.DATABASE_URL!))`, and it is
// wrong here for two measured reasons.
//
// 1. IT RESOLVES THE URL AT IMPORT. Anything that imports a module that imports this one — a route
//    file, `app.ts`, a unit test that only wanted the zod schemas — would need DATABASE_URL set
//    just to be *parsed*. `storage.ts` hit exactly this and made the same call for the same reason
//    (see its header, decision 1): read config at first use, not at import, so the 95% of the API
//    that does not need a given service can still be imported and tested without it.
//
// 2. IT MAKES THE TEST DATABASE UNREACHABLE. Gate 7 gives each vitest worker its own database
//    (`test/helpers.ts`), and the app under test must talk to THAT database, not to the one
//    `apps/api/.env` names. The Gate 7 snippet imports `../src/app` BEFORE `./helpers`, and ESM
//    evaluates imports in source order — so a connection created at import time is already pointed
//    at the wrong database before the harness has had a single line of code run. `getDb()` defers
//    that to the first query, and `useDatabase()` lets the harness redirect it; both happen inside
//    `beforeEach`, long after every import has been evaluated.
//
// So: routes and jobs call `getDb()`. It is memoized, so every caller gets the one pool.
//
// ---------------------------------------------------------------------------------------------
// WHY THE POOL IS SMALL
// ---------------------------------------------------------------------------------------------
// § 7.3 serializes every write behind `pg_advisory_xact_lock(42)`, so write concurrency is one by
// construction and a large pool would buy nothing but idle backends. This runs as a single Railway
// service against a single Postgres service, where each connection is real server memory, and a
// pool that can exhaust `max_connections` takes the deployed site down in a way that looks like a
// database outage. Reads are a scoped snapshot per request — 14 small queries — so a handful of
// connections saturates the lock long before it saturates the pool.

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Sql } from 'postgres';
import * as schema from './schema';

/** The drizzle handle, with the schema attached so `getTableColumns` and the query builders work. */
export type Database = ReturnType<typeof connect>['db'];

/**
 * Thrown when DATABASE_URL is missing or blank.
 *
 * A distinct class rather than a bare `Error` so a caller can tell "nobody configured this" from
 * "the database refused the connection" — the first is a deploy mistake and the second is an
 * outage, and they want different alerts.
 */
export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConfigError';
  }
}

/** Connections per process. See the header. */
export const POOL_MAX = 5;

let loadedEnvFile = false;

/**
 * Pull `apps/api/.env` into `process.env` once, if the process was started without it.
 *
 * `process.loadEnvFile()` resolves `.env` against the current working directory, which is
 * `apps/api` under both `pnpm --filter @ai/api <script>` and `tsx watch src/server.ts`. It throws
 * when the file does not exist, which is the ordinary case on Railway — the variables are already
 * in the environment there — so a missing file is not an error, it is just nothing to load.
 */
function loadEnvFileOnce(): void {
  if (loadedEnvFile) return;
  loadedEnvFile = true;
  try {
    process.loadEnvFile();
  } catch {
    /* no .env: the environment is expected to carry DATABASE_URL already (Railway does) */
  }
}

/**
 * DATABASE_URL, or a loud failure.
 *
 * Deliberately NOT falling back to `postgres://localhost/postgres` or any other default. A default
 * turns "you forgot to set the variable" into "the app is running against an empty database you did
 * not mean to use", which is the failure D-019 exists to prevent: the oracle tests truncate every
 * table they touch, so the cost of silently connecting to the wrong database is data loss.
 */
export function readDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.DATABASE_URL === undefined || env.DATABASE_URL.trim() === '') loadEnvFileOnce();

  const url = env.DATABASE_URL;
  if (url === undefined || url.trim() === '') {
    throw new DatabaseConfigError(
      'DATABASE_URL is not set. The API cannot serve a single route without a database, so it ' +
        'will not start with a default. Set it on the service (Railway: a reference to the ' +
        'Postgres service), or put it in apps/api/.env for local development — which must point at ' +
        'a development database, never the one the deployed site reads (DECISIONS.md D-019).',
    );
  }
  return url.trim();
}

/**
 * The database a connection string names, as Postgres sees it.
 *
 * `test/helpers.ts` needs this to derive a per-worker database name and to assert it is not the
 * deployed one, so the parsing lives here next to the URL rather than being re-done there. Falls
 * back to the empty string when the URL carries no path — `postgres://host` is legal and means
 * "the database named after the user", which is not something this app ever wants to rely on.
 */
export function databaseNameOf(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

/** The same connection string pointed at a different database on the same server. */
export function withDatabase(url: string, name: string): string {
  const next = new URL(url);
  next.pathname = `/${encodeURIComponent(name)}`;
  return next.toString();
}

function connect(url: string) {
  const client = postgres(url, {
    max: POOL_MAX,
    // A connection idle for 30s is handed back. Railway's TCP proxy will drop a long-idle socket
    // on its own, and a pool holding a socket the proxy has already forgotten produces one failed
    // query per stale connection after a quiet period.
    idle_timeout: 30,
    // Fail a connection attempt in 10s rather than hanging a request forever on a database that is
    // restarting; Fastify's own request timeout is then what the client sees.
    connect_timeout: 10,
    // `notice` output (e.g. "relation already exists, skipping" from a migration) is not an error
    // and should not reach the request log as one.
    onnotice: () => {},
  });
  return { client, db: drizzle(client, { schema }) };
}

let pool: { client: Sql; db: Database } | null = null;

/**
 * The connection, created on first call and shared from then on.
 *
 * `postgres()` itself does not connect — porsager's driver dials on the first query — so this is
 * cheap and still does not reach the network until something actually asks a question.
 */
export function getDb(): Database {
  pool ??= connect(readDatabaseUrl());
  return pool.db;
}

/** The raw porsager handle, for the few things drizzle cannot express (`CREATE DATABASE`). */
export function getSql(): Sql {
  pool ??= connect(readDatabaseUrl());
  return pool.client;
}

/**
 * Point this process at another database, closing whatever it was using.
 *
 * The test harness only. It exists because of the import-order problem in the header: the app under
 * test resolves its connection through `getDb()`, so redirecting the process here redirects the app
 * without the app needing to know a harness exists.
 */
export async function useDatabase(url: string): Promise<Database> {
  if (pool) {
    const previous = pool;
    pool = null;
    await previous.client.end({ timeout: 5 });
  }
  pool = connect(url);
  return pool.db;
}

/**
 * Release the pool. Idempotent, so a shutdown handler that fires twice (SIGTERM then SIGINT, which
 * Railway does send) does not throw on the second pass.
 *
 * `timeout: 5` lets queries in flight finish — a mutation holding `pg_advisory_xact_lock(42)` has
 * already written rows, and killing its socket mid-transaction rolls back work the client was told
 * had succeeded.
 */
export async function close(): Promise<void> {
  if (!pool) return;
  const previous = pool;
  pool = null;
  await previous.client.end({ timeout: 5 });
}
