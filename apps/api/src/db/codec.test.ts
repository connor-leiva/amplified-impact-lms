// The pure half of § 7.3, tested without a database.
//
// `loadDb` and `persistDiff` are thin wrappers over `toRows`, `fromRows` and `diffRows`, so almost
// everything that can go wrong in the snapshot round trip can be caught here — and the one failure
// § 7.3 exists to prevent is silent: a field every screen renders from the fixture that never
// survives a write. The round-trip tests below start from real `seed()` snapshots and from the
// output of real mutations, so nothing is asserted against a hand-written fixture of the shape the
// codec happens to produce.
import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { DB_V, ZERO_BASE, fmt, seed, seedForDatabase } from '@ai/core';
import type { Db, Learner, Progress } from '@ai/core';
import * as M from '@ai/core/mutations';
import type { Actor } from '@ai/core/mutations';
import * as schema from './schema';
import { COLUMNS_OWNED, KEYS, ORDER, diffSnapshot, fromRows, toRows } from './codec';
import type { Rows, TableName } from './codec';

const PHASES = ['week0', 'live', 'post'] as const;

/** `phase` is deliberately not persisted; see the codec header. */
const withoutPhase = (db: Db): Db => {
  const { phase: _phase, ...rest } = db;
  return rest as Db;
};

/**
 * The same snapshot as a database holds it. Two fields are derived rather than stored, and the
 * fixture's values for both describe learners a database would not contain:
 *
 *   - `base` is `ZERO_BASE` (§ 7.4). The fixture's baseline covers ~134 learners the seed does not
 *     model individually, which exist only to make the demo's analytics look like a real cohort.
 *   - `cohorts[].enrolled` is recounted from the user rows (§ 7.2 stores no column for it). In the
 *     fixture it includes those same 134; in a database every learner is a row, so the count is
 *     the whole truth and a stored copy could only ever disagree with it.
 *
 * Both are the same phenomenon, so they are stated once here rather than excused per test. The
 * round-trip tests prove nothing ELSE is lost, and `enrolment really is recounted` proves this
 * helper is not quietly doing their work for them.
 */
function asStored(db: Db): Db {
  const out = structuredClone(withoutPhase(db));
  out.base = structuredClone(ZERO_BASE);
  for (const c of out.cohorts) c.enrolled = out.users.filter((u) => u.cohortId === c.id).length;
  return out;
}

const roundTrip = (db: Db): Db => fromRows(toRows(db));

// ---------------------------------------------------------------------------

describe('§7.3 snapshot round trip @g7', () => {
  for (const phase of PHASES) {
    it(`a ${phase} snapshot survives rows → Db unchanged @g7`, () => {
      const db = seedForDatabase(phase);
      expect(roundTrip(db)).toEqual(asStored(db));
    });
  }

  it('enrolment really is recounted, so asStored is not doing the comparison any favours @g7', () => {
    // The round-trip tests above pass through `asStored`, which is only honest if the field it
    // rewrites genuinely differs. It does: the fixture's cohorts count the demo's unmodelled
    // learners, and a database counts rows.
    const db = seedForDatabase('live');
    const out = roundTrip(db);

    const moved = db.cohorts.filter((c) => out.cohorts.find((x) => x.id === c.id)!.enrolled !== c.enrolled);
    expect(moved.length).toBeGreaterThan(0);
    for (const c of moved) {
      const counted = db.users.filter((u) => u.cohortId === c.id).length;
      expect(out.cohorts.find((x) => x.id === c.id)!.enrolled).toBe(counted);
      // The gap is the baseline, not a dropped row.
      expect(c.enrolled).toBeGreaterThan(counted);
    }
  });

  it('returns the baseline as zero even when the input carried the demo aggregates @g7', () => {
    // `seed()` (as opposed to `seedForDatabase()`) carries the ~134 learners the fixture does not
    // model individually. They are a demo construct; § 7.4 says the API always answers ZERO_BASE.
    const demo = seed('live');
    expect(demo.base.learners).toBeGreaterThan(0);
    expect(roundTrip(demo).base).toEqual(ZERO_BASE);
  });

  it('hands back a fresh baseline, never the exported constant @g7', () => {
    const mine = roundTrip(seedForDatabase('live')).base;
    mine.learners = 99;
    expect(ZERO_BASE.learners).toBe(0);
  });

  it('stamps the snapshot version and drops the demo phase @g7', () => {
    const out = roundTrip(seedForDatabase('live'));
    expect(out.v).toBe(DB_V);
    // Absent, not null: `Dashboard.vm.ts` reads an absent phase as 'live', which is what a real
    // cohort moving through its own dates means.
    expect('phase' in out).toBe(false);
  });

  it('recomputes enrolled instead of trusting the snapshot @g7', () => {
    const db = seedForDatabase('live');
    const cohort = db.cohorts.find((c) => db.users.some((u) => u.cohortId === c.id))!;
    const truth = db.users.filter((u) => u.cohortId === cohort.id).length;

    // A snapshot that disagrees with its own users: the column does not exist, so the count wins.
    cohort.enrolled = truth + 500;
    expect(roundTrip(db).cohorts.find((c) => c.id === cohort.id)?.enrolled).toBe(truth);
  });

  it('keeps an optional field absent rather than present-and-undefined @g7', () => {
    const db = seedForDatabase('live');
    const bare = db.users.find((u) => u.reminded === undefined && u.nudged === undefined)!;
    expect(bare).toBeDefined();

    const out = roundTrip(db).users.find((u) => u.id === bare.id)!;
    expect('reminded' in out).toBe(false);
    expect('nudged' in out).toBe(false);
    // `JSON.stringify` is how the repository broadcasts and how the oracle compares, and it is
    // where `{}` and `{ reminded: undefined }` stop being interchangeable.
    expect(JSON.stringify(out)).toBe(JSON.stringify(bare));
  });

  it('carries an optional field that is set @g7', () => {
    const db = seedForDatabase('live');
    const u = db.users[0]!;
    u.reminded = 1765000000000;
    u.nudged = 1765000111000;

    const out = roundTrip(db).users.find((x) => x.id === u.id)!;
    expect(out.reminded).toBe(u.reminded);
    expect(out.nudged).toBe(u.nudged);
  });

  it('round-trips the whole of a learner progress record, including its run output @g7', () => {
    const db = seedForDatabase('live');
    const u = db.users[0]!;
    const moduleId = db.modules[0]!.id;
    const full: Progress = {
      steps: ['c1', 'c2'],
      builtAt: 1765000000000,
      deployedAt: 1765000222000,
      runtime: 'needs_attention',
      issue: 'Webhook returning 500',
      lastRun: { at: 1765000333000, title: 'Nightly follow-ups', preview: '14 replies drafted' },
    };
    u.progress[moduleId] = full;
    // And one with neither optional field, to prove they stay absent.
    const plain: Progress = { steps: [], builtAt: null, deployedAt: null, runtime: null };
    u.progress[db.modules[1]!.id] = plain;

    const out = roundTrip(db).users.find((x) => x.id === u.id)!;
    expect(out.progress[moduleId]).toEqual(full);
    expect(out.progress[db.modules[1]!.id]).toEqual(plain);
    expect('issue' in out.progress[db.modules[1]!.id]!).toBe(false);
    expect('lastRun' in out.progress[db.modules[1]!.id]!).toBe(false);
  });

  it('round-trips open rates through a whole-percent column, D-017 @g7', () => {
    const db = seedForDatabase('live');
    const fractions = db.announcements.filter((a) => a.opens !== null).map((a) => a.opens!);
    expect(fractions.length).toBeGreaterThan(0);

    // The column holds whole percent, so this is the assertion that matters: the admin
    // Announcements history must read the same string after a write and a read.
    for (const a of roundTrip(db).announcements) {
      const before = db.announcements.find((x) => x.id === a.id)!;
      expect(a.opens === null ? null : fmt.pct(a.opens)).toBe(before.opens === null ? null : fmt.pct(before.opens));
    }
    // Stored as an integer, which is what `integer('opens_pct')` accepts.
    for (const row of toRows(db).announcements) {
      if (row.opens !== null) expect(Number.isInteger(row.opens)).toBe(true);
    }
  });

  it('keeps staff and learners apart in the shared users table @g7', () => {
    const db = seedForDatabase('live');
    const rows = toRows(db);

    expect(rows.users).toHaveLength(db.users.length + db.staff.length);
    expect(rows.users.filter((r) => r.kind === 'staff')).toHaveLength(db.staff.length);
    // A staff row carries no learner columns and a learner row carries no staff role, so neither
    // can be read back as the other.
    for (const r of rows.users.filter((r) => r.kind === 'staff')) {
      expect([r.tier, r.role, r.teamId, r.cohortId, r.joined, r.status]).toEqual([
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
      expect(r.staffRole).not.toBeNull();
    }
    for (const r of rows.users.filter((r) => r.kind === 'learner')) expect(r.staffRole).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// What a snapshot does NOT own
// ---------------------------------------------------------------------------

describe('§7.3 columns a snapshot must not clobber @g7', () => {
  const rows = toRows(seedForDatabase('live'));

  it('produces no prefs and no storage key @g7', () => {
    // Both exist as columns and neither is in `Db`. If a row carried the key at all, an upsert
    // built from these rows would reset the viewer's timezone and lose the object-store key.
    for (const r of rows.users) expect('prefs' in r).toBe(false);
    for (const r of rows.resources) expect('storageKey' in r).toBe(false);
  });

  /** Nothing is dismissed in the live seed, so that table has no row to inspect from it. */
  const EMPTY_IN_SEED: readonly TableName[] = ['dismissals'];

  it('every row carries exactly the columns COLUMNS_OWNED declares @g7', () => {
    // The guard the point above depends on: the caller sets only the keys a row carries, so this
    // list is the authority on which columns a snapshot write may touch.
    const dismissing = structuredClone(seedForDatabase('live'));
    dismissing.dismissed[`${dismissing.users[0]!.id}:${dismissing.announcements[0]!.id}`] = 1;
    const all = toRows(dismissing);

    for (const table of Object.keys(COLUMNS_OWNED) as TableName[]) {
      const expected = [...COLUMNS_OWNED[table]].sort();
      expect(all[table].length, `${table} has no rows to check`).toBeGreaterThan(0);
      for (const row of all[table]) expect(Object.keys(row).sort(), table).toEqual(expected);
    }
  });

  it('names every table the live seed leaves empty @g7', () => {
    // So that the check above is never silently skipping a table: a table that becomes empty has
    // to be added here deliberately, and one that stops being empty has to be removed.
    const empty = (Object.keys(COLUMNS_OWNED) as TableName[]).filter((t) => rows[t].length === 0);
    expect(empty.sort()).toEqual([...EMPTY_IN_SEED].sort());
  });

  it('declares no column the schema does not have @g7', () => {
    // COLUMNS_OWNED, KEYS and ORDER all name Drizzle properties. A typo would otherwise surface as
    // a runtime error on the first write against a real database.
    const props = (name: TableName): Set<string> =>
      new Set(Object.keys(getTableColumns(schema[name] as unknown as PgTable)));

    for (const table of Object.keys(COLUMNS_OWNED) as TableName[]) {
      const real = props(table);
      for (const c of COLUMNS_OWNED[table]) expect(real.has(c), `${table}.${c}`).toBe(true);
      for (const k of KEYS[table]) expect(real.has(k), `${table}.${k} (key)`).toBe(true);
      for (const o of ORDER[table]) expect(real.has(o.by), `${table}.${o.by} (order)`).toBe(true);
    }
  });

  it('names a non-null column to order every table by @g7', () => {
    // `ORDER BY` on a nullable column puts the nulls at one end and the result is not the order any
    // screen expects, so each one has to be a column the schema declares NOT NULL.
    for (const table of Object.keys(ORDER) as TableName[]) {
      const cols = getTableColumns(schema[table] as unknown as PgTable) as unknown as Record<
        string,
        { notNull: boolean; primary: boolean }
      >;
      for (const o of ORDER[table]) {
        const col = cols[o.by]!;
        expect(col.notNull || col.primary, `${table}.${o.by} is nullable`).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// The diff
// ---------------------------------------------------------------------------

const NOW = Date.parse('2026-12-07T10:42:00-06:00');
const ctx = () => {
  let i = 0;
  return { now: NOW, id: (p: string) => `${p}_t${++i}` };
};

/** Runs a real mutation and returns the snapshot it produced. */
function mutate<K extends keyof typeof M>(
  db: Db,
  actor: Actor,
  name: K,
  args: Parameters<Extract<(typeof M)[K], (...a: never[]) => unknown>>[2],
): Db {
  const fn = M[name] as (d: Db, a: Actor, g: unknown, c: ReturnType<typeof ctx>) => { db: Db; error?: string };
  const out = fn(db, actor, args, ctx());
  expect(out.error).toBeUndefined();
  return out.db;
}

describe('§7.3 diffRows @g7', () => {
  it('finds nothing between a snapshot and itself @g7', () => {
    const db = seedForDatabase('live');
    expect(diffSnapshot(db, db)).toEqual([]);
    // And not merely because the two are the same object.
    expect(diffSnapshot(db, structuredClone(db))).toEqual([]);
  });

  it('a changed field is one upsert, carrying the whole row @g7', () => {
    const before = seedForDatabase('live');
    const after = structuredClone(before);
    after.teams[0]!.seats = 11;

    const changes = diffSnapshot(before, after);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.table).toBe('teams');
    expect(changes[0]!.op).toBe('upsert');
    expect(changes[0]!.key).toEqual({ id: before.teams[0]!.id });
    expect(changes[0]!.row?.seats).toBe(11);
  });

  it('a removed row is one delete, by key @g7', () => {
    const before = seedForDatabase('live');
    const after = structuredClone(before);
    const gone = after.resources.pop()!;

    expect(diffSnapshot(before, after)).toEqual([{ table: 'resources', op: 'delete', key: { id: gone.id } }]);
  });

  it('a new row is one upsert @g7', () => {
    const before = seedForDatabase('live');
    const after = structuredClone(before);
    after.activity.unshift({ id: 'ev_new', t: NOW, who: 'Jamie Ortiz', what: 'verified a step', tone: 'success' });

    const changes = diffSnapshot(before, after);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ table: 'activity', op: 'upsert', key: { id: 'ev_new' } });
  });

  it('reordering an array alone changes nothing @g7', () => {
    // Order lives in `ORDER`, not in the rows: moving a row within the snapshot array is not a
    // write, and a diff that reported one would rewrite the whole table on every request.
    const before = seedForDatabase('live');
    const after = structuredClone(before);
    after.resources.reverse();

    expect(diffSnapshot(before, after)).toEqual([]);
  });

  it('a nested progress change touches the progress table and nothing else @g7', () => {
    const before = seedForDatabase('live');
    const after = structuredClone(before);
    const u: Learner = after.users[0]!;
    const moduleId = Object.keys(u.progress)[0]!;
    u.progress[moduleId]!.steps = [...u.progress[moduleId]!.steps, 'c6'];

    const changes = diffSnapshot(before, after);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.table).toBe('progress');
    expect(changes[0]!.key).toEqual({ userId: u.id, moduleId });
  });

  it('a dismissal is a row in its own table, not a field on the user @g7', () => {
    const before = seedForDatabase('live');
    const after = structuredClone(before);
    const key = `${after.users[0]!.id}:${after.announcements[0]!.id}`;
    after.dismissed[key] = 1;

    expect(diffSnapshot(before, after)).toEqual([
      {
        table: 'dismissals',
        op: 'upsert',
        key: { userId: after.users[0]!.id, announcementId: after.announcements[0]!.id },
        row: { userId: after.users[0]!.id, announcementId: after.announcements[0]!.id },
      },
    ]);
  });

  it('writes exactly what a real mutation changed @g7', () => {
    // The point of the diff: verifying one step must not rewrite the curriculum. `toggleStep` also
    // stamps the learner's `last`, so the users table is in scope too — and nothing else is.
    const before = seedForDatabase('live');
    const learner = before.users.find((u) => u.tier === 'agent')!;
    // An AI Employee that is open at NOW and not yet deployed, or the mutation is a no-op by
    // design (it answers with a toast and the unchanged db).
    const mod = before.modules.find(
      (m) =>
        m.tier === 'agent' &&
        m.status === 'published' &&
        (m.opens === null || m.opens <= NOW) &&
        !learner.progress[m.id]?.deployedAt,
    )!;
    expect(mod).toBeDefined();
    const stepId = mod.checklist.find((s) => !(learner.progress[mod.id]?.steps ?? []).includes(s.id))!.id;

    const after = mutate(before, { kind: 'learner', userId: learner.id }, 'toggleStep', {
      moduleId: mod.id,
      stepId,
    });
    const changes = diffSnapshot(before, after);

    expect([...new Set(changes.map((c) => c.table))].sort()).toEqual(['progress', 'users']);
    expect(changes.every((c) => c.op === 'upsert')).toBe(true);
    const p = changes.find((c) => c.table === 'progress')!;
    expect(p.key).toEqual({ userId: learner.id, moduleId: mod.id });
    expect(p.row?.steps as string[]).toContain(stepId);
    // And the snapshot a reader would rebuild from the written rows is the mutation's own.
    expect(roundTrip(after)).toEqual(asStored(after));
  });

  it('a staff mutation that publishes a module writes the module and the activity entry @g7', () => {
    const before = seedForDatabase('live');
    const draft = before.modules.find((m) => m.status !== 'published')!;
    const owner = before.staff.find((s) => s.role === 'Owner')!;

    const after = mutate(before, { kind: 'staff', staffId: owner.id }, 'publishModule', { id: draft.id });
    const changes = diffSnapshot(before, after);

    expect([...new Set(changes.map((c) => c.table))].sort()).toEqual(['activity', 'modules']);
    const mod = changes.find((c) => c.table === 'modules')!;
    expect(mod.key).toEqual({ id: draft.id });
    expect(mod.row?.status).toBe('published');
    expect(roundTrip(after)).toEqual(asStored(after));
  });

  it('is reversible: diffing back undoes exactly the same rows @g7', () => {
    const before = seedForDatabase('live');
    const after = structuredClone(before);
    after.teams[0]!.seats = 11;
    after.resources.pop();

    const forward = diffSnapshot(before, after);
    const back = diffSnapshot(after, before);

    expect(forward.map((c) => `${c.table}/${c.op}`).sort()).toEqual(['resources/delete', 'teams/upsert']);
    expect(back.map((c) => `${c.table}/${c.op}`).sort()).toEqual(['resources/upsert', 'teams/upsert']);
  });

  it('covers every table @g7', () => {
    // A table missing from KEYS would never be diffed, so nothing in it would ever be written.
    const rows: Rows = toRows(seedForDatabase('live'));
    expect(Object.keys(KEYS).sort()).toEqual(Object.keys(rows).sort());
    expect(Object.keys(ORDER).sort()).toEqual(Object.keys(rows).sort());
    expect(Object.keys(COLUMNS_OWNED).sort()).toEqual(Object.keys(rows).sort());
  });
});
