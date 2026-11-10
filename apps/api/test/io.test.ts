// § 7.3's DB-touching half, against a REAL Postgres — the half `codec.test.ts` cannot reach.
//
// `codec.test.ts` already proves `fromRows(toRows(db)) === db` for every snapshot core can produce,
// exhaustively and in microseconds. Repeating any of that here would be theatre. What a real
// database adds is everything between a JavaScript value and a stored tuple, and there are exactly
// four classes of failure that live only there:
//
//   1. DRIVER COERCION. `bigint` comes back from `postgres` as a STRING by default — `"1765000000000"`
//      — and `timestamp` comes back as a `Date`. Either one round-trips through the pure codec
//      perfectly and then breaks every comparison, every `isOpen` and every `fmt.*` in the app.
//      `schema.ts`'s header says epoch-ms columns are `bigint(… { mode: 'number' })` for this
//      reason; this file is where that claim is actually executed.
//   2. ROW ORDER. Postgres returns rows in heap order, and `Db` is arrays whose order reaches the
//      screens. A `select` with no `order by` passes on a freshly seeded table — the heap order IS
//      the insert order — and starts failing the first time anybody updates a row. The order tests
//      below therefore UPDATE a row first, to move its tuple, before asserting the order held.
//   3. THE CLOBBER. An upsert that sets more columns than the row carries resets `users.prefs` and
//      loses `resources.storage_key`. Nothing pure can see this: `toRows` never produces those
//      columns, so the pure round trip is correct either way. It is only visible as a column that
//      was there before a write and is gone after it.
//   4. THE HARNESS ITSELF. Which database these tests are pointed at, and whether `useDatabase`
//      really redirected the process (D-019).
//
// Every test here is one of those four, plus § 7.7's clock, which has no other home.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { ZERO_BASE, seedForDatabase } from '@ai/core';
import type { Db } from '@ai/core';
import * as M from '@ai/core/mutations';
import type { Actor, Ctx } from '@ai/core/mutations';
import { DatabaseConfigError, POOL_MAX, databaseNameOf, readDatabaseUrl, withDatabase } from '../src/db/client';
import { clock, deterministicIds, newIds } from '../src/lib/clock';
import { assertOwned, loadDb as loadDbFrom, persistDiff } from '../src/db/io';
import { toRows } from '../src/db/codec';
import * as schema from '../src/db/schema';
import { TEST_DATABASE_NAME, TEST_RUN_ID, WORKER_SLOT, loadDb, resetDatabase, testDatabase } from './helpers';

/** The Gate 7 oracle's instant, and `PHASES.live.now`: 2026-12-07 10:42 Central. */
const NOW = Date.parse('2026-12-07T10:42:00-06:00');

const JAMIE: Actor = { kind: 'learner', userId: 'u_jamie' };
const ALEX: Actor = { kind: 'learner', userId: 'u_alex' };
const CASEY: Actor = { kind: 'staff', staffId: 'st1' };

/** A pinned context, so nothing in this file depends on the wall clock or on a random id. */
const ctx = (): Ctx => ({ now: NOW, id: deterministicIds(NOW) });

/**
 * The same snapshot as a database holds it — the helper `codec.test.ts` states at length.
 *
 * Two fields are derived rather than stored, and the fixture's values for both describe learners a
 * database would not contain: `base` is `ZERO_BASE` (§ 7.4), and `cohorts[].enrolled` is recounted
 * from the user rows because § 7.2 stores no column for it (D-018). `phase` is snapshot metadata
 * the codec deliberately drops.
 */
function asStored(db: Db): Db {
  const { phase: _phase, ...rest } = structuredClone(db);
  const out = rest as Db;
  out.base = structuredClone(ZERO_BASE);
  for (const c of out.cohorts) c.enrolled = out.users.filter((u) => u.cohortId === c.id).length;
  return out;
}

/**
 * Every array sorted by id — the Gate 7 checklist's `normalize`, which it describes as "sorts
 * arrays by id and nothing else".
 *
 * MEASURED, and worth stating because it is not obvious: `loadDb` does NOT return arrays in the
 * order the seed wrote them, and it cannot. `codec.ts`'s `ORDER` sorts `users`, `teams` and
 * `resources` by id, and `announcements` by `at` descending — none of which is the order
 * `seed.ts` lists them in. Two of those sorts are not even total: `ORDER.sessions` is `n` ascending
 * and three cohorts each have an `n: 1`, so Postgres picks among the ties however it likes.
 *
 * That is why the checklist's oracle comparison normalizes, and why the strict-equality tests here
 * do the same. It costs nothing: a dropped, extra or wrong row still fails, because sorting cannot
 * invent or hide one. What normalizing WOULD hide is a wrong `ORDER`, so the sorts `ORDER` promises
 * are asserted separately, on un-normalized output, in `ORDER reaches the arrays` below.
 */
function normalize(db: Db): Db {
  const out = structuredClone(db);
  const byId = <T extends { id: string }>(a: T[]): T[] => [...a].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  out.cohorts = byId(out.cohorts);
  out.sessions = byId(out.sessions);
  out.modules = byId(out.modules);
  out.users = byId(out.users);
  out.teams = byId(out.teams);
  out.resources = byId(out.resources);
  out.announcements = byId(out.announcements);
  out.reminders = byId(out.reminders);
  out.tiers = byId(out.tiers);
  out.requests = byId(out.requests);
  out.staff = byId(out.staff);
  out.activity = byId(out.activity);
  return out;
}

/** `loadDb` and the expected snapshot, both normalized. */
const sameSnapshot = async (expected: Db): Promise<void> => {
  expect(normalize(await loadDb())).toEqual(normalize(asStored(expected)));
};

const live = () => seedForDatabase('live');

/**
 * Reseeding costs a truncate plus fourteen inserts over the network, so it is registered per
 * describe block rather than once for the file: the clock and id suites at the bottom touch no
 * database at all and would otherwise pay for one each.
 */
const seeded = () => {
  beforeEach(async () => {
    await resetDatabase(live());
  });
};

// ---------------------------------------------------------------------------
// § 7.1 · The connection
// ---------------------------------------------------------------------------

describe('§7.1 DATABASE_URL is required, not defaulted @g7', () => {
  // `client.ts` has no test file of its own — its one side effect is opening a socket — so the
  // part of it that is pure logic is pinned here: where the URL comes from, and what it refuses.

  it('fails loudly rather than connecting to a default @g7', () => {
    // The failure this prevents is the one D-019 is about. A fallback such as
    // `postgres://localhost/postgres` turns "nobody set the variable" into "the app is running
    // against a database you did not choose" — and the suites that import this stack truncate every
    // table they touch, so the cost of guessing is data loss rather than an error page.
    expect(() => readDatabaseUrl({} as NodeJS.ProcessEnv)).toThrow(DatabaseConfigError);
    expect(() => readDatabaseUrl({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
    expect(() => readDatabaseUrl({} as NodeJS.ProcessEnv)).toThrow(/D-019/);
  });

  it('treats a variable that exists but is blank as absent @g7', () => {
    // What a Railway variable that was created and never filled in actually looks like. An empty
    // string is falsy in the obvious check and truthy in `'DATABASE_URL' in env`, which is how this
    // one gets missed; `storage.ts` records the same failure for the S3 credentials.
    expect(() => readDatabaseUrl({ DATABASE_URL: '' } as NodeJS.ProcessEnv)).toThrow(DatabaseConfigError);
    expect(() => readDatabaseUrl({ DATABASE_URL: '   ' } as NodeJS.ProcessEnv)).toThrow(DatabaseConfigError);
  });

  it('trims what it returns, because a copied variable carries whitespace @g7', () => {
    // A URL pasted into a Railway variable or a `.env` keeps its trailing newline, and `postgres`
    // does not trim it — it tries to resolve a host name with a line break in it. The newline is
    // built here rather than typed, because a literal control character in a source file is
    // invisible in a diff and can make the whole file unreviewable.
    const pasted = ` postgresql://h/x ${String.fromCharCode(10)}`;
    expect(readDatabaseUrl({ DATABASE_URL: pasted } as NodeJS.ProcessEnv)).toBe('postgresql://h/x');
  });

  it('reads and rewrites the database a URL names @g7', () => {
    // `withDatabase` is how the harness derives a per-slot URL from the development one, so it has
    // to keep the credentials, host and port untouched and change nothing but the path.
    const url = 'postgresql://user:pw@h.example:24159/ai_lms_dev';
    expect(databaseNameOf(url)).toBe('ai_lms_dev');
    const moved = withDatabase(url, 'ai_lms_dev_t3');
    expect(databaseNameOf(moved)).toBe('ai_lms_dev_t3');
    expect(new URL(moved).host).toBe(new URL(url).host);
    expect(new URL(moved).password).toBe(new URL(url).password);
  });

  it('keeps the pool small, because §7.3 serializes writes anyway @g7', () => {
    // Not cosmetic: each connection is real server memory on the one Postgres service the deployed
    // app shares, and a pool that can exhaust `max_connections` takes the site down in a way that
    // reads as a database outage. Write concurrency is already one, by `pg_advisory_xact_lock(42)`.
    expect(POOL_MAX).toBeLessThanOrEqual(10);
    expect(POOL_MAX).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4 · The harness
// ---------------------------------------------------------------------------

describe('§7.3 the harness is pointed at its own database @g7', () => {
  it('is scoped by RUN as well as slot, and is never the one the deployed site reads @g7', () => {
    // D-019. `railway` is what the deployed Web service reads; this suite truncates every table it
    // touches, 37 times per oracle run, so the name is the only thing standing between a green run
    // and a data-loss bug. `helpers.ts` throws at import if either name is wrong; this states it.
    // The base is whatever development database `DATABASE_URL` names: `ai_lms_dev` on a laptop,
    // `ai_lms_test` in CI's api job. Hard-coding the laptop's name is what kept that job red.
    const base = databaseNameOf(readDatabaseUrl());
    expect(TEST_DATABASE_NAME).not.toBe('railway');
    expect(TEST_DATABASE_NAME).not.toBe(base);

    // The RUN id is the part that was missing. `VITEST_POOL_ID` restarts at 1 in every invocation,
    // so two concurrent `vitest run` PROCESSES both took slot 1 and truncated each other's rows
    // mid-test. Not hypothetical: three agents hit it and each worked around it privately by
    // swapping the database name, and it then hung a full-suite run of mine for three hours against
    // a database another process kept emptying underneath it.
    expect(TEST_DATABASE_NAME).toBe(`${base}_r${TEST_RUN_ID}_t${WORKER_SLOT}`.slice(0, 63));
    expect(TEST_RUN_ID).toMatch(/^[0-9a-z]{1,6}$/);
    expect(WORKER_SLOT).toMatch(/^[0-9a-z]+$/i);
    // Postgres truncates an identifier at 63 bytes SILENTLY, and a truncated name is how two
    // distinct runs would collide on one database again.
    expect(TEST_DATABASE_NAME.length).toBeLessThanOrEqual(63);
  });

  it('really redirected the connection, rather than reading the development database @g7', async () => {
    // The guard above is arithmetic on strings. This asks Postgres. `useDatabase` replaces
    // `client.ts`'s pool, which is what `getDb()` hands the Fastify app under test — so if this
    // answered `ai_lms_dev`, every suite would be sharing one database and truncating in parallel.
    const db = await testDatabase();
    const [row] = await db.execute<{ db: string }>(sql`select current_database() as db`);
    expect(row?.db).toBe(TEST_DATABASE_NAME);
  });
});

// ---------------------------------------------------------------------------
// 1 · The round trip, and driver coercion
// ---------------------------------------------------------------------------

describe('§7.3 seed → loadDb @g7', () => {
  seeded();

  it('reads back the snapshot it was seeded from @g7', async () => {
    // The whole of § 7.3 in one assertion: fourteen tables written by `insertSnapshot`, read back
    // by `loadDb`, compared against the snapshot core produced. Every field of every table, so a
    // column that silently never survives a write — the failure § 7.3 exists to prevent — fails
    // here regardless of which screen would have rendered it.
    await sameSnapshot(live());
  });

  it('hands back epoch-ms instants as numbers, not strings or Dates @g7', async () => {
    // `postgres` returns `bigint` as a STRING unless the column says otherwise, and `timestamp` as
    // a `Date`. Both round-trip through the pure codec unharmed and then poison every comparison in
    // `@ai/core`, which treats time as a plain number everywhere. `"1765..." > 1765...` is false,
    // `Date - number` is NaN, and nothing throws. This is the assertion `schema.ts`'s
    // `bigint(… { mode: 'number' })` exists to make true, and it cannot be made without a database.
    const db = await loadDb();
    const samples: [string, unknown][] = [
      ['cohorts[0].start', db.cohorts[0]?.start],
      ['cohorts[0].end', db.cohorts[0]?.end],
      ['sessions[0].start', db.sessions[0]?.start],
      ['users[0].joined', db.users[0]?.joined],
      ['activity[0].t', db.activity[0]?.t],
      ['announcements[0].at', db.announcements[0]?.at],
      ['resources[0].updated', db.resources[0]?.updated],
    ];
    for (const [where, value] of samples) expect(typeof value, where).toBe('number');

    // A nullable one, and a module that has an `opens`, so "number" is not passing by way of null.
    const scheduled = db.modules.find((m) => m.opens !== null);
    expect(scheduled).toBeDefined();
    expect(typeof scheduled?.opens).toBe('number');
  });

  it('keeps JSONB structure, not a JSON string @g7', async () => {
    // `files`, `resources`, `checklist`, `transcript`, `runDemo` and `progress.lastRun` are JSONB
    // with no `$type` on three of them. A driver handing back the text of the document instead of
    // the document would still `toEqual` nothing and read as a dropped field.
    const db = await loadDb();
    const marketing = db.modules.find((m) => m.id === 'marketing')!;
    expect(Array.isArray(marketing.checklist)).toBe(true);
    expect(Array.isArray(marketing.transcript)).toBe(true);
    expect(marketing.runDemo).toMatchObject({ input: expect.any(String) });
    expect(db.users.find((u) => u.id === 'u_jamie')!.progress.marketing!.lastRun).toMatchObject({
      at: expect.any(Number),
    });
  });

  it('works on a transaction as well as on the pool, which is what §7.3 needs @g7', async () => {
    // § 7.3's mutate route runs `loadDb` → mutation → `persistDiff` inside ONE `db.transaction`,
    // behind `pg_advisory_xact_lock(42)`. Drizzle types a transaction and the pool handle as
    // unrelated classes, so `Queryable` being satisfied by both is a requirement on this file, not
    // a convenience — and a type that only compiles against the pool would fail at the route.
    const db = await testDatabase();
    const inside = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(42)`);
      return loadDbFrom(tx);
    });
    expect(normalize(inside)).toEqual(normalize(asStored(live())));
  });
});

// ---------------------------------------------------------------------------
// 2 · Row order
// ---------------------------------------------------------------------------

describe('§7.3 ORDER reaches the arrays @g7', () => {
  seeded();

  // Every test here rewrites one row before asserting the order, and that is the point.
  //
  // Postgres implements `update` as delete-plus-insert, so the updated tuple lands at the END of
  // the heap and an unordered `select` returns it last. Without that step each assertion is
  // vacuous: `insertSnapshot` writes rows in snapshot order, so on a freshly seeded table the heap
  // order already IS the right order and a missing `order by` passes. The rewrite sets the column
  // to the value it already holds, so the only thing that changes is where the tuple lives.

  it('returns modules in `order`, after the first one has been rewritten @g7', async () => {
    const db = await testDatabase();
    const first = live().modules.find((m) => m.order === Math.min(...live().modules.map((x) => x.order)))!;
    await db.update(schema.modules).set({ dur: first.dur }).where(eq(schema.modules.id, first.id));

    const loaded = await loadDb();
    expect(loaded.modules[0]?.id).toBe(first.id);
    expect(loaded.modules.map((m) => m.order)).toEqual([...loaded.modules.map((m) => m.order)].sort((a, b) => a - b));
  });

  it('returns activity newest first, after the newest one has been rewritten @g7', async () => {
    const db = await testDatabase();
    const newest = [...live().activity].sort((a, b) => b.t - a.t)[0]!;
    await db.update(schema.activity).set({ tone: newest.tone }).where(eq(schema.activity.id, newest.id));

    const loaded = await loadDb();
    expect(loaded.activity[0]?.id).toBe(newest.id);
    expect(loaded.activity.map((e) => e.t)).toEqual([...loaded.activity.map((e) => e.t)].sort((a, b) => b - a));
  });

  it('returns sessions in `start`, which is a TOTAL order, after the first has been rewritten @g7', async () => {
    // Deliberately not `n`. `n` is the number WITHIN a cohort, so the live seed's 18 sessions share
    // only six values of it and every one is a three-way tie — Postgres picks the interleaving, two
    // identical requests can disagree, and the Gate 7 oracle's `toEqual` fails intermittently. The
    // previous version of this test asserted the global `n` sequence was monotonic, which EVERY
    // tie-breaking satisfies, so it could not have caught that.
    const db = await testDatabase();
    const one = live().sessions.find((s) => s.n === 1)!;
    await db.update(schema.sessions).set({ views: one.views }).where(eq(schema.sessions.id, one.id));

    const loaded = await loadDb();

    // Globally ascending by `start`, and strictly so: a tie would put the order back in Postgres's
    // hands, which is the whole defect.
    const starts = loaded.sessions.map((s) => s.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(new Set(starts).size).toBe(starts.length);

    // And the rail still reads correctly: within each cohort that is ascending `n`, grouped, which
    // is exactly the order the fixture lists them in.
    const fixture = live().sessions.map((s) => s.id);
    expect(loaded.sessions.map((s) => s.id)).toEqual(fixture);
    for (const cohort of new Set(loaded.sessions.map((s) => s.cohortId))) {
      const ns = loaded.sessions.filter((s) => s.cohortId === cohort).map((s) => s.n);
      expect(ns).toEqual([...ns].sort((a, b) => a - b));
    }
  });
});

// ---------------------------------------------------------------------------
// 3 · persistDiff
// ---------------------------------------------------------------------------

describe('§7.3 persistDiff @g7', () => {
  seeded();

  it('applies a real mutation’s output, and the reload equals it @g7', async () => {
    // The Gate 7 oracle comparison, minus the HTTP layer: run the mutation core runs, persist the
    // difference, read the database back, and require the two snapshots to be the same object.
    // `toggleStep` on `sales`/`c4` is the oracle's own first case.
    const db = await testDatabase();
    const before = live();
    const out = M.toggleStep(before, JAMIE, { moduleId: 'sales', stepId: 'c4' }, ctx());

    // Self-check: if `sales` were closed at NOW the mutation would answer a toast and an unchanged
    // db, and everything below would pass while testing nothing.
    expect(out.db.users.find((u) => u.id === 'u_jamie')!.progress.sales!.steps).toContain('c4');

    await persistDiff(db, before, out.db);
    await sameSnapshot(out.db);
  });

  it('inserts rows a mutation created, with the id the generator minted @g7', async () => {
    // `requestUpgrade` mints `ur…` and appends an activity event: two inserts into two tables, in
    // the same diff as nothing else. The id is the one the oracle's core-side run produces, because
    // both sides build it from `deterministicIds()` over the same pinned instant.
    const db = await testDatabase();
    const before = live();
    const out = M.requestUpgrade(before, JAMIE, { source: 'Team tier page' }, ctx());
    const minted = out.db.requests[0]!;
    expect(minted.id).toBe(deterministicIds(NOW)('ur'));

    await persistDiff(db, before, out.db);
    const loaded = await loadDb();
    expect(loaded.requests.find((q) => q.id === minted.id)).toEqual(minted);
    expect(loaded.requests).toHaveLength(before.requests.length + 1);
    expect(loaded.activity).toHaveLength(before.activity.length + 1);
    expect(normalize(loaded)).toEqual(normalize(asStored(out.db)));
  });

  it('deletes rows a mutation removed @g7', async () => {
    // `diffRows` emits deletes last per table, so this also covers the ordering: a delete that ran
    // before the upserts could remove a row the same diff was re-creating.
    const db = await testDatabase();
    const before = live();
    const out = M.deleteResource(before, CASEY, { id: 'r1' }, ctx());

    await persistDiff(db, before, out.db);
    const loaded = await loadDb();
    expect(loaded.resources.find((r) => r.id === 'r1')).toBeUndefined();
    expect(loaded.resources).toHaveLength(before.resources.length - 1);
    expect(normalize(loaded)).toEqual(normalize(asStored(out.db)));
  });

  it('writes nothing at all when the two snapshots are equal @g7', async () => {
    // The mutations that answer `{ db, toast }` without changing anything — a closed module, an
    // already-pending upgrade request — go down this path on every call. A diff that wrote the
    // whole snapshot anyway would still read back correctly, so the evidence has to be a column
    // only a write could disturb: `prefs`, which no snapshot owns.
    const db = await testDatabase();
    const prefs = { tz: 'America/New_York', theme: 'dark' as const };
    await db.update(schema.users).set({ prefs }).where(eq(schema.users.id, 'u_jamie'));

    const before = live();
    await persistDiff(db, before, structuredClone(before));

    const [row] = await db.select({ prefs: schema.users.prefs }).from(schema.users).where(eq(schema.users.id, 'u_jamie'));
    expect(row?.prefs).toEqual(prefs);
    await sameSnapshot(before);
  });
});

// ---------------------------------------------------------------------------
// 3b · The clobber guard — the test nobody writes and the bug nobody finds
// ---------------------------------------------------------------------------

describe('§7.3 a snapshot write cannot clobber a column it does not own @g7', () => {
  seeded();

  const PREFS = { tz: 'America/New_York', theme: 'dark' as const };
  const KEY = 'uploads/2026/12/8f14e45f-ea8d-4a1b-9c3f-2b6d7e0a1111.pdf';

  it('leaves users.prefs and resources.storage_key alone @g7', async () => {
    const db = await testDatabase();

    // Two columns `codec.ts` deliberately excludes from `COLUMNS_OWNED`: the viewer's own timezone
    // and theme (§ 7.5 owns them, through /api/me/prefs) and the object-store key (§ 8.2 owns it,
    // and § 7.4 strips it from every snapshot). `Db` models neither, so a snapshot write is by
    // definition not where either comes from.
    await db.update(schema.users).set({ prefs: PREFS }).where(eq(schema.users.id, 'u_priya'));
    await db.update(schema.resources).set({ storageKey: KEY }).where(eq(schema.resources.id, 'r1'));

    // Now two mutations that rewrite exactly those rows for reasons that have nothing to do with
    // either column: `remindMembers` stamps `users.reminded`, `downloadResource` bumps
    // `resources.dl`. This is the shape of the real bug — a learner changes their theme, somebody
    // clicks Remind, and the theme is gone.
    const before = live();
    const reminded = M.remindMembers(before, ALEX, { userIds: ['u_priya', 'u_sarah'] }, ctx());
    const downloaded = M.downloadResource(reminded.db, JAMIE, { id: 'r1' }, ctx());
    await persistDiff(db, before, downloaded.db);

    const [user] = await db
      .select({ prefs: schema.users.prefs, reminded: schema.users.reminded })
      .from(schema.users)
      .where(eq(schema.users.id, 'u_priya'));
    const [resource] = await db
      .select({ storageKey: schema.resources.storageKey, dl: schema.resources.dl })
      .from(schema.resources)
      .where(eq(schema.resources.id, 'r1'));

    // The rows really were updated, so the test cannot pass by the diff having been empty.
    expect(user?.reminded).toBe(NOW);
    expect(resource?.dl).toBe(before.resources.find((r) => r.id === 'r1')!.dl + 1);

    // And the two unowned columns survived it.
    expect(user?.prefs).toEqual(PREFS);
    expect(resource?.storageKey).toBe(KEY);
  });

  it('survives a second write to the same rows @g7', async () => {
    // Once is an insert-on-conflict that happened to miss the columns; twice is the update path
    // running over a row that already carries them. `remindMembers` on the same members a second
    // time changes nothing, so the third call uses `nudgeLearners`, a different writer of the same
    // column, to be sure a real update statement runs.
    const db = await testDatabase();
    await db.update(schema.users).set({ prefs: PREFS }).where(eq(schema.users.id, 'u_priya'));

    const before = live();
    const first = M.remindMembers(before, ALEX, { userIds: ['u_priya'] }, ctx());
    await persistDiff(db, before, first.db);
    const second = M.nudgeLearners(first.db, CASEY, { userIds: ['u_priya'] }, ctx());
    await persistDiff(db, first.db, second.db);

    const [user] = await db
      .select({ prefs: schema.users.prefs, nudged: schema.users.nudged })
      .from(schema.users)
      .where(eq(schema.users.id, 'u_priya'));
    expect(user?.nudged).toBe(NOW);
    expect(user?.prefs).toEqual(PREFS);
  });

  it('the loader does not write them either @g7', async () => {
    // `insertSnapshot` seeds from the same `toRows` output, so the same rule applies to it: `prefs`
    // takes the column DEFAULT `{}` and `storage_key` stays null, rather than the loader inventing
    // values a snapshot never carried.
    const db = await testDatabase();
    const [user] = await db.select({ prefs: schema.users.prefs }).from(schema.users).where(eq(schema.users.id, 'u_priya'));
    const [resource] = await db
      .select({ storageKey: schema.resources.storageKey })
      .from(schema.resources)
      .where(eq(schema.resources.id, 'r1'));
    expect(user?.prefs).toEqual({});
    expect(resource?.storageKey).toBeNull();
  });
});

describe('§7.3 the guard against a future toRows growing a column @g7', () => {
  it('accepts every row the codec actually produces @g7', () => {
    // `codec.test.ts` pins `COLUMNS_OWNED` against the schema; this pins it against `toRows`, which
    // is the side `persistDiff` is handed. If the two ever disagree the guard would fire on a
    // perfectly ordinary mutation, so it has to be checked in the direction it will be used.
    const rows = toRows(live());
    for (const table of Object.keys(rows) as (keyof typeof rows)[]) {
      for (const row of rows[table]) expect(() => assertOwned(table, row)).not.toThrow();
    }
  });

  it('refuses a row carrying a column no snapshot owns, naming it @g7', () => {
    // The failure it exists for: somebody adds `storageKey` to `toRows` for the § 8.2 upload route
    // (D-022 says `ModuleResource` will need a stable key), and `persistDiff` quietly starts
    // writing a column § 7.4 strips from every snapshot. A throw inside the mutation transaction
    // rolls the write back and says which column; silence would mean finding out from a 404 later.
    const row = { ...toRows(live()).resources[0]!, storageKey: 'uploads/2026/12/whatever.pdf' };
    expect(() => assertOwned('resources', row)).toThrow(/storageKey/);
    expect(() => assertOwned('resources', row)).toThrow(/COLUMNS_OWNED/);

    const user = { ...toRows(live()).users[0]!, prefs: { theme: 'dark' } };
    expect(() => assertOwned('users', user)).toThrow(/prefs/);
  });
});

// ---------------------------------------------------------------------------
// § 7.7 · The clock and the id generator
// ---------------------------------------------------------------------------

describe('§7.7 the test clock @g7', () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, FIXED_NOW: process.env.FIXED_NOW };

  afterEach(() => {
    // Restored by assignment or deletion, not by writing `undefined`: `process.env.X = undefined`
    // stores the STRING "undefined", which would make `FIXED_NOW` unparseable for every test after
    // this block and fail them somewhere else entirely.
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('returns the pinned instant when NODE_ENV is test and FIXED_NOW is set @g7', () => {
    process.env.FIXED_NOW = new Date(NOW).toISOString();
    expect(process.env.NODE_ENV).toBe('test'); // vitest sets it; the rule hangs off that
    expect(clock.now()).toBe(NOW);
    expect(clock.isFixed()).toBe(true);
  });

  it('reads the environment on every call, not once at import @g7', () => {
    // The oracle sets FIXED_NOW inside a `beforeEach`, which runs long after this module was
    // imported. A value captured at import would pin all 37 cases to whatever the clock was when
    // the first `import` ran — and would look like a mutation computing the wrong time.
    process.env.FIXED_NOW = '2026-12-07T10:42:00-06:00';
    expect(clock.now()).toBe(NOW);
    process.env.FIXED_NOW = '2027-01-12T10:42:00-06:00';
    expect(clock.now()).toBe(Date.parse('2027-01-12T10:42:00-06:00'));
  });

  it('falls back to the wall clock when FIXED_NOW is absent or blank @g7', () => {
    delete process.env.FIXED_NOW;
    expect(clock.isFixed()).toBe(false);
    expect(clock.now()).toBeGreaterThan(Date.parse('2026-01-01T00:00:00Z'));

    process.env.FIXED_NOW = '   ';
    expect(clock.isFixed()).toBe(false);
  });

  it('ignores FIXED_NOW outside test mode @g7', () => {
    // § 7.7 scopes the test clock to `NODE_ENV === 'test'`. A FIXED_NOW left in a Railway variable
    // would otherwise freeze production time, and every session would be permanently "upcoming".
    process.env.FIXED_NOW = '2026-12-07T10:42:00-06:00';
    process.env.NODE_ENV = 'production';
    expect(clock.isFixed()).toBe(false);
    expect(clock.now()).not.toBe(NOW);
  });

  it('throws on a FIXED_NOW it cannot parse, rather than returning NaN @g7', () => {
    // `Date.parse` answers NaN, NaN propagates through every window and comparison in `@ai/core`
    // without throwing, and the suite then fails on an unrelated assertion with no mention of the
    // variable. `Dec 7` with no year is the realistic typo.
    process.env.FIXED_NOW = 'the seventh of December';
    expect(() => clock.now()).toThrow(/FIXED_NOW/);
  });
});

describe('§7.7 deterministic ids @g7', () => {
  it('two fresh generators over the same instant agree call for call @g7', () => {
    // This is the entire basis of the Gate 7 oracle comparison: the API builds one generator per
    // request and the test builds another in the `it()`, and the ids they mint have to match or the
    // comparison fails on a diff that looks like a persistence bug.
    const a = deterministicIds(NOW);
    const b = deterministicIds(NOW);
    expect([a('ur'), a('u'), a('st')]).toEqual([b('ur'), b('u'), b('st')]);
  });

  it('does not re-issue an id the seed already uses @g7', () => {
    // `uploadResource` mints `c.id('r')` and the seed already contains r1…r13. A bare counter would
    // hand out `r1` on its second call and the upsert would overwrite a seeded resource. The clock
    // segment is what makes that impossible.
    const taken = new Set(live().resources.map((r) => r.id));
    const id = deterministicIds(NOW);
    for (let i = 0; i < 20; i++) expect(taken.has(id('r'))).toBe(false);
  });

  it('is what newIds() returns under the test clock @g7', () => {
    const restore = process.env.FIXED_NOW;
    process.env.FIXED_NOW = new Date(NOW).toISOString();
    try {
      expect(newIds()('ur')).toBe(deterministicIds(NOW)('ur'));
    } finally {
      if (restore === undefined) delete process.env.FIXED_NOW;
      else process.env.FIXED_NOW = restore;
    }
  });

  it('is NOT what newIds() returns without one @g7', () => {
    // Production must not mint predictable ids from a shared counter: two replicas would collide on
    // the first request of each process.
    const restore = process.env.FIXED_NOW;
    delete process.env.FIXED_NOW;
    try {
      expect(newIds()('ur')).not.toBe(newIds()('ur'));
    } finally {
      if (restore !== undefined) process.env.FIXED_NOW = restore;
    }
  });
});
