// Snapshot ⇄ rows, phase 07 § 7.3 — the DB-touching half.
//
// `codec.ts` is the pure half and it is where the thinking is: `toRows`, `fromRows`, `diffRows`,
// `diffSnapshot`, plus the three tables of metadata they share — `KEYS`, `ORDER` and
// `COLUMNS_OWNED`. This file is deliberately boring. It issues one `select` per table, hands the
// rows to `fromRows`, and turns each `Change` from `diffSnapshot` into one statement. Anything in
// here that looks like a decision about the snapshot's *shape* is a bug: that decision belongs in
// `codec.ts`, where it can be tested without a database.
//
// ---------------------------------------------------------------------------------------------
// THE ONE THING THIS FILE CAN GET WRONG ON ITS OWN, AND IT IS SILENT
// ---------------------------------------------------------------------------------------------
// An upsert must set ONLY the columns the row it was given actually carries.
//
// `codec.ts`'s header lists the three columns `toRows` deliberately never produces — `users.prefs`,
// `resources.storage_key`, and the auth tables — and `COLUMNS_OWNED` is the machine-readable form
// of that list: "the columns a snapshot owns, per table. An upsert built from `toRows` must set
// exactly these and nothing else."
//
// The tempting shortcut is to build the `set` clause from the table's columns rather than from the
// row. Written that way, every mutation that touches a `users` row — `remindMembers`,
// `setMemberRole`, `toggleStep`, each of which has nothing to do with preferences — would also
// write `prefs = default {}`, and the viewer's timezone and theme would vanish the next time
// anybody did anything. Same for `resources.storage_key`: a `downloadResource` that bumps `dl`
// would drop the object key and the file would 404 forever after. Neither failure throws, neither
// shows up in a diff, and both look like somebody else's bug when they surface days later.
//
// So `upsertSet` is built from `COLUMNS_OWNED` minus the primary key, and `assertOwned` refuses a
// row carrying a key that is not in that list. Columns absent from an `insert` take their DEFAULT
// on insert and keep their current value on conflict, which is exactly the required behaviour and
// is why "set only what the row carries" is the whole fix. `test/io.test.ts` sets both columns
// directly, runs a diff that rewrites both rows for unrelated reasons, and asserts they survived.
//
// ---------------------------------------------------------------------------------------------
// WHY `loadDb` ORDERS EVERY TABLE, AND WHY IT IS NOT A DETAIL
// ---------------------------------------------------------------------------------------------
// Postgres returns rows in whatever order it finds them, and `Db` is arrays. Array order reaches
// the screens: the Curriculum list renders `modules` in `order`, the session rail renders
// `sessions` in `n`, and the activity feed is newest first. Unordered, the same database would
// render differently from one request to the next and the parity goldens would fail at random.
// `ORDER` in `codec.ts` states the sort per table; this file only executes it.

import { and, asc, desc, eq, getTableColumns } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Db } from '@ai/core';
// Type-only, and `verbatimModuleSyntax` erases it entirely — io.ts must not pull `client.ts` in at
// runtime, or importing the codec would resolve DATABASE_URL. See `client.ts`'s header.
import type { Database } from './client';
import * as schema from './schema';
import { COLUMNS_OWNED, KEYS, ORDER, diffSnapshot, fromRows, toRows } from './codec';
import type { Change, Row, Rows, TableName } from './codec';

/**
 * What this module needs to be handed: the pool handle from `client.ts`, or a transaction from
 * `db.transaction()`.
 *
 * Drizzle types those two as unrelated classes — a transaction carries a relational `query` builder
 * and a set of protected members the plain handle does not, so neither is assignable to the other
 * and there is no published supertype. Nothing here uses either of those extras, so the parameter
 * asks for the three builders both objects genuinely have rather than for one of the two classes.
 * § 7.3's mutate route passes a transaction; `/api/snapshot` passes the handle directly.
 */
export interface Queryable {
  select: Database['select'];
  insert: Database['insert'];
  delete: Database['delete'];
}

/**
 * The drizzle table behind each `TableName`.
 *
 * `codec.ts` names tables the way `Db` thinks about them and `schema.ts` names them the way
 * Postgres does; `requests` ⇄ `upgrade_requests` is the one place they differ. This map is the
 * only translation, and `io.test.ts` asserts it covers every `TableName`.
 */
const TABLES: Record<TableName, PgTable> = {
  users: schema.users,
  teams: schema.teams,
  cohorts: schema.cohorts,
  sessions: schema.sessions,
  modules: schema.modules,
  progress: schema.progress,
  resources: schema.resources,
  announcements: schema.announcements,
  dismissals: schema.dismissals,
  reminders: schema.reminders,
  tiers: schema.tiers,
  requests: schema.requests,
  permissions: schema.permissions,
  activity: schema.activity,
  copyStrings: schema.copyStrings,
};

/**
 * One column, by the Drizzle property name `codec.ts` uses.
 *
 * Throwing rather than returning undefined is the point: `KEYS`, `ORDER` and `COLUMNS_OWNED` are
 * hand-written lists of property names, and a rename in `schema.ts` that nobody propagated would
 * otherwise turn into `ORDER BY undefined` or an upsert that quietly skips a column. This makes it
 * a startup-shaped failure naming both the table and the property.
 */
function columnOf(table: TableName, prop: string): PgColumn {
  const columns = getTableColumns(TABLES[table]) as Record<string, PgColumn | undefined>;
  const column = columns[prop];
  if (!column) {
    throw new Error(
      `schema.ts has no column '${prop}' on '${table}'. codec.ts's KEYS/ORDER/COLUMNS_OWNED and ` +
        'the schema have drifted apart.',
    );
  }
  return column;
}

/**
 * Every row of one table, in the order `ORDER` specifies.
 *
 * `select()` with no projection returns rows keyed by the Drizzle property names, which is exactly
 * what `codec.ts`'s `Row` is. Columns a snapshot does not own (`users.prefs`,
 * `resources.storage_key`) come back too and `fromRows` ignores them — harmless on the read path,
 * and the alternative, a hand-written projection per table, is a second list to keep in sync.
 */
async function rowsOf(tx: Queryable, table: TableName): Promise<Row[]> {
  const order = ORDER[table].map((o) => (o.dir === 'asc' ? asc(columnOf(table, o.by)) : desc(columnOf(table, o.by))));
  return (await tx.select().from(TABLES[table]).orderBy(...order)) as Row[];
}

/**
 * § 7.3: every row in the database, as the `Db` the screens and `@ai/core` consume.
 *
 * Sequential, not `Promise.all`. A transaction is one reserved connection, and firing fourteen
 * queries at it concurrently puts their statements on that connection in an order nobody chose —
 * which inside § 7.3's `pg_advisory_xact_lock(42)` transaction is a correctness problem, not just a
 * tidiness one. Fourteen round trips is also the whole cost of a snapshot, and the lock already
 * serializes writers.
 */
export async function loadDb(tx: Queryable): Promise<Db> {
  const rows = {} as Rows;
  for (const table of Object.keys(TABLES) as TableName[]) rows[table] = await rowsOf(tx, table);
  return fromRows(rows);
}

/**
 * Refuse a row carrying a column a snapshot does not own.
 *
 * `toRows` cannot produce one today, so this never fires — which is the reason it is here. The
 * failure it guards against is a future `toRows` growing a field (an upload adding `storageKey`,
 * say) and this file silently starting to write a column § 7.4 strips from every snapshot. A throw
 * inside the mutation transaction rolls the write back and names the column; the alternative is
 * finding out from a learner whose theme reset itself.
 *
 * Exported so it can be tested without a database, and so the deferred upload route of § 8.2 —
 * which is the one place that legitimately writes `resources.storage_key` — can state the same
 * rule about its own row set instead of re-deriving it.
 */
export function assertOwned(table: TableName, row: Row): void {
  const owned = new Set(COLUMNS_OWNED[table]);
  const stray = Object.keys(row).filter((k) => !owned.has(k));
  if (stray.length > 0) {
    throw new Error(
      `codec.toRows produced ${table} column(s) a snapshot does not own: ${stray.join(', ')}. ` +
        "Add them to COLUMNS_OWNED if a snapshot really owns them, or they must not be in toRows' output.",
    );
  }
}

/** The columns an upsert may overwrite: everything the snapshot owns except the primary key. */
const writable = (table: TableName): readonly string[] =>
  COLUMNS_OWNED[table].filter((c) => !KEYS[table].includes(c));

async function apply(tx: Queryable, change: Change): Promise<void> {
  const table = TABLES[change.table];

  if (change.op === 'delete') {
    const where = KEYS[change.table].map((k) => eq(columnOf(change.table, k), change.key[k]));
    await tx.delete(table).where(and(...where));
    return;
  }

  const row = change.row!;
  assertOwned(change.table, row);

  // ONLY the keys this row carries. See the header: building `set` from the table's columns instead
  // is what resets `users.prefs` and loses `resources.storage_key`.
  const set: Record<string, unknown> = {};
  for (const column of writable(change.table)) if (column in row) set[column] = row[column];

  const target = KEYS[change.table].map((k) => columnOf(change.table, k));
  const insert = tx.insert(table).values(row as never);

  // `dismissals` is the one table whose whole row IS its primary key, so there is nothing to
  // update and `on conflict do update set` would have an empty clause and not be valid SQL. The
  // row already being there is the desired state, which is what `do nothing` says.
  await (Object.keys(set).length === 0
    ? insert.onConflictDoNothing({ target })
    : insert.onConflictDoUpdate({ target, set }));
}

/**
 * § 7.3: write the difference between two snapshots, and nothing else.
 *
 * Upserts and deletes only for the rows that changed, in the order `diffRows` produced them —
 * per table, upserts first and deletes last, so a row re-created under a key that already existed
 * is one upsert rather than a delete followed by an insert.
 *
 * The caller supplies the transaction. § 7.3's mutate route opens one around
 * `loadDb` → mutation → `persistDiff` and takes `pg_advisory_xact_lock(42)` inside it, so the
 * snapshot a mutation computed from cannot move underneath the write. Nothing here opens, commits
 * or rolls back anything: a partial `persistDiff` must take the whole mutation down with it.
 */
export async function persistDiff(tx: Queryable, before: Db, after: Db): Promise<void> {
  for (const change of diffSnapshot(before, after)) await apply(tx, change);
}

/**
 * Every row of a snapshot, for a database that is empty — the loader `seed.ts` and the test harness
 * share.
 *
 * Not `persistDiff(tx, emptyDb, snapshot)`, which would be ~450 statements and ~450 round trips for
 * the live seed. One multi-row insert per table instead: every row `toRows` builds for a table
 * carries the same key set (a staff row and a learner row both fill in all fourteen `users`
 * columns, nulling what does not apply), so they go in one statement.
 *
 * Chunked because Postgres caps a statement at 65535 bound parameters, and `modules` is 25 columns
 * of mostly JSONB.
 */
export async function insertSnapshot(tx: Queryable, db: Db, chunk = 500): Promise<number> {
  const rows = toRows(db);
  let written = 0;
  for (const table of Object.keys(TABLES) as TableName[]) {
    const all = rows[table];
    for (const row of all) assertOwned(table, row);
    for (let i = 0; i < all.length; i += chunk) {
      const batch = all.slice(i, i + chunk);
      await tx.insert(TABLES[table]).values(batch as never[]);
      written += batch.length;
    }
  }
  return written;
}
