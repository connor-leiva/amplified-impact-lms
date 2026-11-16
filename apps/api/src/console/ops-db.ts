// DB Health, PR 9 (D-168, spec § 7.12): read-only, and it says so in the database.
//
//   - Every query runs in ONE transaction that starts `SET TRANSACTION READ ONLY` with
//     `SET LOCAL statement_timeout = 2000`: Postgres itself refuses a write there, and no query can
//     run past two seconds. The answer is cached for 60 seconds.
//   - Connections against `max_connections`, the database's size, the ten largest tables (their size
//     and Postgres's own row estimate), and the migrations: `drizzle.__drizzle_migrations` mapped to
//     `drizzle/meta/_journal.json` by each migration's `when`, newest first, then any in the journal
//     that this database hasn't applied.
//   - Slow queries only when `pg_stat_statements` already exists (the five slowest by mean, each cut
//     to 400 characters; Postgres has already replaced their parameters with `$1`). Otherwise "not
//     available". This file never creates, loads or enables the extension; a read-only transaction
//     couldn't anyway. That part runs in a savepoint, so an extension that exists but can't be read
//     costs only its own card.

import { sql } from 'drizzle-orm';
import { DB_STATEMENT_TIMEOUT_MS, DB_TOP_TABLES, SLOW_QUERY_LIMIT, SLOW_QUERY_MS, clipQuery } from '@ai/core';
import type { DbHealthView, DbSlow } from '@ai/core';
import type { Database } from '../db/client';
import journal from '../../drizzle/meta/_journal.json' with { type: 'json' };

/** The migrations this build ships, as `drizzle-kit` wrote them: a tag and its `when`. */
export const JOURNAL: readonly { tag: string; when: number }[] = (journal as { entries: { tag: string; when: number }[] }).entries.map((e) => ({ tag: e.tag, when: e.when }));

type Rows = Record<string, unknown>[];
const rowsOf = (r: unknown): Rows => (Array.isArray(r) ? (r as Rows) : ((r as { rows?: Rows }).rows ?? []));
const num = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'string' || typeof v === 'bigint' ? Number(v) : 0);

/** Applied migrations (newest first) by their journal tag, and the journal's tags not applied. */
export function mapMigrations(applied: readonly number[], entries: readonly { tag: string; when: number }[] = JOURNAL): DbHealthView['migrations'] {
  const byWhen = new Map(entries.map((e) => [e.when, e.tag]));
  const done = new Set(applied);
  return {
    applied: [...applied].sort((a, b) => b - a).map((at) => ({ tag: byWhen.get(at) ?? 'Unknown migration', at })),
    pending: entries.filter((e) => !done.has(e.when)).map((e) => e.tag),
  };
}

/** One read of everything the page shows, inside the read-only, two-second transaction. */
export async function readDbHealth(db: Database, now: number): Promise<DbHealthView> {
  return db.transaction(async (tx) => {
    // Both before any other statement: READ ONLY must be the transaction's first word.
    await tx.execute(sql.raw('SET TRANSACTION READ ONLY'));
    await tx.execute(sql.raw(`SET LOCAL statement_timeout = ${DB_STATEMENT_TIMEOUT_MS}`));

    const [conn] = rowsOf(
      await tx.execute(sql`select count(*)::int as used, current_setting('max_connections')::int as max from pg_stat_activity where datname = current_database()`),
    );
    const [size] = rowsOf(await tx.execute(sql`select pg_database_size(current_database())::bigint as bytes`));
    const tables = rowsOf(
      await tx.execute(sql`
        select c.relname as name, pg_total_relation_size(c.oid)::bigint as bytes, coalesce(s.n_live_tup, 0)::bigint as rows
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          left join pg_stat_user_tables s on s.relid = c.oid
         where n.nspname = 'public' and c.relkind in ('r', 'p')
         order by pg_total_relation_size(c.oid) desc, c.relname
         limit ${DB_TOP_TABLES}`),
    );
    const [hasMigrations] = rowsOf(await tx.execute(sql`select to_regclass('drizzle.__drizzle_migrations') is not null as present`));
    const applied = hasMigrations?.present
      ? rowsOf(await tx.execute(sql`select created_at from drizzle.__drizzle_migrations`)).map((r) => num(r.created_at))
      : [];

    let slow: DbSlow = { available: false };
    const [ext] = rowsOf(await tx.execute(sql`select exists (select 1 from pg_extension where extname = 'pg_stat_statements') as present`));
    if (ext?.present) {
      try {
        slow = await tx.transaction(async (sp) => {
          const top = rowsOf(
            await sp.execute(sql`
              select query, calls, mean_exec_time as mean
                from pg_stat_statements
               where dbid = (select oid from pg_database where datname = current_database())
               order by mean_exec_time desc
               limit ${SLOW_QUERY_LIMIT}`),
          );
          const [over] = rowsOf(
            await sp.execute(sql`
              select count(*)::int as n from pg_stat_statements
               where dbid = (select oid from pg_database where datname = current_database()) and mean_exec_time > ${SLOW_QUERY_MS}`),
          );
          return {
            available: true,
            windowHours: null,
            over500: num(over?.n),
            rows: top.map((r) => ({ meanMs: num(r.mean), calls: num(r.calls), query: clipQuery(String(r.query ?? '')) })),
          } satisfies DbSlow;
        });
      } catch {
        slow = { available: false };
      }
    }

    return {
      asOf: now,
      connections: { used: num(conn?.used), max: num(conn?.max) },
      sizeBytes: num(size?.bytes),
      tables: tables.map((t) => ({ name: String(t.name), bytes: num(t.bytes), rows: num(t.rows) })),
      migrations: mapMigrations(applied),
      slow,
    };
  });
}
