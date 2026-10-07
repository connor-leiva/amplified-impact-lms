// Drift guard between the Postgres schema and the `@ai/core` domain types.
//
// Without a database there are no queries to test, but the failure that would actually hurt is
// drift: someone adds a field to a `@ai/core` type, every screen renders it from the fixture, and
// it silently never reaches a column. The snapshot round-trip in § 7.3 would drop it on every
// write and nothing would fail. So these tests derive the expected field names from a real
// `seed('live')` snapshot rather than restating them, and read the schema back out of the live
// Drizzle table objects.
//
// The other silent corruption is time. Core passes every instant as epoch milliseconds. A
// `timestamp` column hands back a `Date`, and a `bigint` without `mode: 'number'` hands back a
// `BigInt`; either one would quietly poison `fmt.*` across the whole app, so every instant column
// is pinned to `PgBigInt53`.
import { describe, it, expect } from 'vitest';
import { is, getTableColumns } from 'drizzle-orm';
import { PgTable, getTableConfig } from 'drizzle-orm/pg-core';
import { fmt, seed } from '@ai/core';
import * as schema from './schema';

const db = seed('live');

/** The domain records are plain data; read them as bags of fields. */
const asRows = (xs: readonly object[]): Record<string, unknown>[] => xs as unknown as Record<string, unknown>[];
/** Union of the keys actually present, so an optional field set on one record still counts. */
const fieldsOf = (xs: readonly Record<string, unknown>[]): string[] => {
  const out = new Set<string>();
  for (const x of xs) for (const k of Object.keys(x)) out.add(k);
  return [...out].sort();
};

/** Only the shape of a column matters here, not which table's generics it carries. */
interface ColumnShape {
  name: string;
  columnType: string;
  primary: boolean;
}

// Every table in schema.ts, found by walking the module rather than by listing them, so a table
// added without a test is caught too. Each `pgTable` is widened to the base `PgTable`: the
// per-table generics are what make the introspection helpers reject a heterogeneous list.
const tables: [string, PgTable][] = Object.entries(schema)
  .filter(([, v]) => is(v, PgTable))
  .map(([name, v]) => [name, v as unknown as PgTable]);
const tableByExport = new Map(tables);
const tableOf = (name: string): PgTable => {
  const t = tableByExport.get(name);
  if (!t) throw new Error(`schema.ts does not export a table named ${name}`);
  return t;
};
const columnsOf = (t: PgTable): Record<string, ColumnShape> =>
  getTableColumns(t) as unknown as Record<string, ColumnShape>;
const propsOf = (t: PgTable): Set<string> => new Set(Object.keys(columnsOf(t)));

// ---------------------------------------------------------------------------
// 1. The tables and columns the phase files specify, by database name.
//    Phase 07 § 7.2, plus phase 08 § 8.5's `job_runs` (`gate: 8`) and the /ai101 page's waitlist
//    (`gate: 9`, DECISIONS.md D-028).
// ---------------------------------------------------------------------------

const EXPECTED: Record<string, { table: string; columns: string[]; gate?: 7 | 8 | 9 }> = {
  users: { table: 'users', columns: ['cohort_id', 'email', 'id', 'joined', 'kind', 'last', 'name', 'nudged', 'prefs', 'reminded', 'role', 'seq', 'staff_role', 'status', 'team_id', 'tier'] },
  teams: { table: 'teams', columns: ['id', 'name', 'owner_id', 'seats', 'seq'] },
  cohorts: { table: 'cohorts', columns: ['cadence', 'capacity', 'end', 'id', 'name', 'start', 'status', 'weeks'] },
  sessions: { table: 'sessions', columns: ['attended', 'cohort_id', 'id', 'live', 'mins', 'moved_from', 'n', 'replay', 'start', 'title', 'views', 'zoom'] },
  modules: { table: 'modules', columns: ['build', 'checklist', 'dur', 'files', 'for_who', 'headline', 'icon', 'id', 'instructor', 'name', 'notes', 'opens', 'order', 'outcome', 'outputs', 'platform', 'prompt', 'resources', 'run_demo', 'run_label', 'session', 'short', 'status', 'tier', 'transcript'] },
  progress: { table: 'progress', columns: ['built_at', 'deployed_at', 'issue', 'last_run', 'module_id', 'runtime', 'steps', 'user_id'] },
  resources: { table: 'resources', columns: ['cat', 'desc', 'dl', 'exec', 'id', 'seq', 'size', 'status', 'storage_key', 'tier', 'title', 'type', 'updated'] },
  announcements: { table: 'announcements', columns: ['action', 'action_label', 'at', 'audience', 'body', 'channels', 'id', 'opens_pct', 'session_id', 'severity', 'status', 'title'] },
  dismissals: { table: 'dismissals', columns: ['announcement_id', 'user_id'] },
  reminders: { table: 'reminders', columns: ['channel', 'id', 'label', 'on'] },
  tiers: { table: 'tiers', columns: ['blurb', 'features', 'id', 'name', 'price', 'seats'] },
  requests: { table: 'upgrade_requests', columns: ['at', 'email', 'id', 'name', 'source', 'status', 'user_id'] },
  permissions: { table: 'permissions', columns: ['allowed', 'perm', 'role'] },
  activity: { table: 'activity', columns: ['id', 't', 'tone', 'what', 'who'] },
  authTokens: { table: 'auth_tokens', columns: ['email', 'expires_at', 'purpose', 'token_hash', 'used_at'] },
  authSessions: { table: 'auth_sessions', columns: ['expires_at', 'id', 'impersonating', 'user_id'] },
  // § 8.5: "Record sends in a `job_runs(job, key, sent_at)` table with a unique `(job, key)`."
  // Three columns and no more. An `id` here would be a second way to identify a row that the
  // unique pair already identifies, and anything else would be duplicating the key's own segments.
  jobRuns: { table: 'job_runs', columns: ['job', 'key', 'sent_at'], gate: 8 },
  // D-028: the public /ai101 page's December waitlist. Not a `Db` record, so it appears in none of
  // the coverage maps below — only here, in the instant-unit map, and in the unique-index check.
  ai101Waitlist: {
    table: 'ai101_waitlist',
    columns: ['brokerage', 'created_at', 'email', 'first_name', 'id', 'source', 'src'],
    gate: 9,
  },
};

describe('§7.2 schema shape @g7', () => {
  it('exports exactly the tables the phase file specifies @g7', () => {
    expect(tables.map(([name]) => name).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('names each table as the phase file does @g7', () => {
    const actual = Object.fromEntries(tables.map(([name, t]) => [name, getTableConfig(t).name]));
    const expected = Object.fromEntries(Object.entries(EXPECTED).map(([name, e]) => [name, e.table]));
    expect(actual).toEqual(expected);
  });

  for (const [name, expected] of Object.entries(EXPECTED)) {
    it(`${expected.table} has exactly the specified columns @g${expected.gate ?? 7}`, () => {
      const actual = Object.values(columnsOf(tableOf(name)))
        .map((c) => c.name)
        .sort();
      expect(actual).toEqual([...expected.columns].sort());
    });
  }

  it('declares the two pgEnums @g7', () => {
    expect(schema.tier.enumName).toBe('tier');
    expect([...schema.tier.enumValues]).toEqual(['agent', 'team']);
    expect(schema.moduleStatus.enumName).toBe('module_status');
    expect([...schema.moduleStatus.enumValues]).toEqual(['draft', 'scheduled', 'published']);
  });
});

// ---------------------------------------------------------------------------
// 2. Every field of every domain record reaches a column.
// ---------------------------------------------------------------------------

interface Mapping {
  /** Real records out of `seed('live')`, so the expected fields are never retyped by hand. */
  rows: Record<string, unknown>[];
  /** The export in schema.ts that persists them. */
  table: string;
  /** Domain field → schema property, where the two names had to differ. */
  alias?: Record<string, string>;
  /** Domain field → where it actually lives, for fields this table deliberately does not hold. */
  elsewhere?: Record<string, string>;
}

/** Every `Progress` record in the snapshot, flattened out of `Learner.progress`. */
const progressRows = asRows(db.users).flatMap((u) => asRows(Object.values(u['progress'] as object)));

const ENTITIES: Record<string, Mapping> = {
  Cohort: {
    rows: asRows(db.cohorts),
    table: 'cohorts',
    elsewhere: {
      // Derived, not stored: § 7.3's loadDb recounts it from the users in the cohort, so a stored
      // copy could only ever disagree with the seat math the admin console shows.
      enrolled: 'derived in loadDb as the number of users whose cohort_id matches',
    },
  },
  Session: { rows: asRows(db.sessions), table: 'sessions' },
  AIEmployee: { rows: asRows(db.modules), table: 'modules' },
  Learner: {
    rows: asRows(db.users),
    table: 'users',
    elsewhere: { progress: 'the progress table, keyed by (user_id, module_id)' },
  },
  Staff: {
    rows: asRows(db.staff),
    table: 'users',
    // Staff and learners share one table, and `role` means a different union on each
    // (StaffRole vs LearnerRole), so staff roles get their own column.
    alias: { role: 'staffRole' },
  },
  Team: { rows: asRows(db.teams), table: 'teams' },
  Progress: { rows: progressRows, table: 'progress' },
  Resource: { rows: asRows(db.resources), table: 'resources' },
  Announcement: { rows: asRows(db.announcements), table: 'announcements' },
  Reminder: { rows: asRows(db.reminders), table: 'reminders' },
  TierDef: { rows: asRows(db.tiers), table: 'tiers' },
  UpgradeRequest: { rows: asRows(db.requests), table: 'requests' },
  ActivityEvent: { rows: asRows(db.activity), table: 'activity' },
};

describe('§7.2 domain coverage @g7', () => {
  for (const [entity, m] of Object.entries(ENTITIES)) {
    it(`${m.table} covers every field of a seeded ${entity} @g7`, () => {
      const fields = fieldsOf(m.rows);
      // Guard against a vacuous pass: an empty collection would cover everything.
      expect(fields.length).toBeGreaterThan(0);

      const alias = m.alias ?? {};
      const elsewhere = m.elsewhere ?? {};
      // A note only earns its keep while the field it explains still exists. Rename or drop the
      // field in @ai/core and this fails, instead of the note quietly going stale.
      expect(Object.keys({ ...alias, ...elsewhere }).filter((f) => !fields.includes(f)).sort()).toEqual([]);

      const props = propsOf(tableOf(m.table));
      const missing = fields.filter((f) => !(f in elsewhere) && !props.has(alias[f] ?? f));
      expect(missing).toEqual([]);
    });
  }

  it('accounts for every top-level Db field @g7', () => {
    // Adding a collection to `Db` without a table is the same drift one level up.
    const home: Record<string, string> = {
      v: 'snapshot version, not a row',
      phase: 'fixture/demo only; the API never persists it',
      base: 'the API always returns ZERO_BASE, so the aggregates are never stored',
      dismissed: 'the dismissals table; § 7.3 rebuilds it as { "userId:annId": 1 }',
      perms: 'the permissions table, one row per (role, perm)',
      cohorts: 'cohorts',
      sessions: 'sessions',
      modules: 'modules',
      users: 'users, plus progress for Learner.progress',
      teams: 'teams',
      resources: 'resources',
      announcements: 'announcements',
      reminders: 'reminders',
      tiers: 'tiers',
      requests: 'upgrade_requests',
      staff: 'users, discriminated by kind',
      activity: 'activity',
    };
    expect(Object.keys(db).filter((k) => !(k in home)).sort()).toEqual([]);
  });

  it('can hold the whole permission matrix @g7', () => {
    // perms is Record<StaffRole, Record<PermKey, 0 | 1>>; the table flattens it to rows.
    expect(Object.keys(db.perms).length).toBeGreaterThan(0);
    for (const row of Object.values(db.perms)) expect(Object.keys(row).length).toBeGreaterThan(0);
    expect([...propsOf(tableOf('permissions'))].sort()).toEqual(['allowed', 'perm', 'role']);
  });

  it('keys dismissals by the two halves of a dismissed key @g7', () => {
    // Db.dismissed is keyed "userId:annId", so the row needs both halves and nothing else.
    expect([...propsOf(tableOf('dismissals'))].sort()).toEqual(['announcementId', 'userId']);
  });
});

// ---------------------------------------------------------------------------
// 3. Instants stay epoch-ms numbers.
// ---------------------------------------------------------------------------

/** Anything past 2001-09-09 in ms. Every other number in the domain is a count, a price or a
 *  duration in minutes or seconds, all far below this; the seeded program sits in 2026. */
const EPOCH_FLOOR = 1e12;

/** Every column built by the `ts()` helper in schema.ts, as (export, property). */
const EPOCH_COLUMNS: [string, string][] = [
  ['users', 'joined'], ['users', 'last'], ['users', 'reminded'], ['users', 'nudged'],
  ['cohorts', 'start'], ['cohorts', 'end'],
  ['sessions', 'start'], ['sessions', 'movedFrom'],
  ['modules', 'opens'],
  ['progress', 'builtAt'], ['progress', 'deployedAt'],
  ['resources', 'updated'],
  ['announcements', 'at'],
  ['requests', 'at'],
  ['activity', 't'],
  // § 8.5. Not a `Db` column, but the same unit for the same reason: the scheduler writes
  // `clock.now()` here and `dueWork(db, now, …)` compares every window against that number.
  ['jobRuns', 'sentAt'],
  // D-028. Not a `Db` column either; see INSTANT_UNIT below for why it is epoch ms anyway.
  ['ai101Waitlist', 'createdAt'],
];

/**
 * Which unit each table stores its instants in, and why — the rule the assertion below states.
 *
 * It used to read "timestamp only in the auth tables", which named the symptom. The rule is about
 * the READER, not the table: an instant that `@ai/core` does arithmetic on must be a plain
 * epoch-ms number, because that is the only type `fmt.*`, `sessionState`, `isOpen` and
 * `dueWork` can be handed. A `timestamp` column returns a `Date` and a plain `bigint` returns a
 * `BigInt`, and either one poisons that arithmetic silently.
 *
 * So `timestamp` is allowed exactly where no domain record is persisted and no value crosses into
 * core: the two auth tables, whose instants are compared only against each other. Every table has
 * to declare which side of the line it is on, which is what stops the next table added from
 * inheriting an answer nobody chose — phase 08's `job_runs` is the first one to have to choose.
 *
 * (Tables with no instant column at all still declare `epoch-ms`: it is the default, and saying so
 * costs a line and means the map can be checked for completeness.)
 */
const INSTANT_UNIT: Record<string, { unit: 'epoch-ms' | 'timestamp'; why: string }> = {
  users: { unit: 'epoch-ms', why: 'Learner.joined/last/reminded/nudged, read by fmt.ago and the admin Learners screen' },
  teams: { unit: 'epoch-ms', why: 'no instant' },
  cohorts: { unit: 'epoch-ms', why: 'Cohort.start/end, read by cohortWeek and cohortLine' },
  sessions: { unit: 'epoch-ms', why: 'Session.start/movedFrom, read by sessionState, joinMode and the scheduler' },
  modules: { unit: 'epoch-ms', why: 'AIEmployee.opens, read by isOpen' },
  progress: { unit: 'epoch-ms', why: 'Progress.builtAt/deployedAt, read by statusOf and runtimeOf' },
  resources: { unit: 'epoch-ms', why: 'Resource.updated, read by fmt.date' },
  announcements: { unit: 'epoch-ms', why: 'Announcement.at, read by the banner and by scheduledAnnouncements' },
  dismissals: { unit: 'epoch-ms', why: 'no instant' },
  reminders: { unit: 'epoch-ms', why: 'no instant' },
  tiers: { unit: 'epoch-ms', why: 'no instant' },
  requests: { unit: 'epoch-ms', why: 'UpgradeRequest.at, read by fmt.ago' },
  permissions: { unit: 'epoch-ms', why: 'no instant' },
  activity: { unit: 'epoch-ms', why: 'ActivityEvent.t, read by fmt.ago' },
  authTokens: { unit: 'timestamp', why: '§7.5 internals: expires_at/used_at are compared with now() and never reach core' },
  authSessions: { unit: 'timestamp', why: '§7.5 internals: expires_at is compared with now() and never reaches core' },
  jobRuns: { unit: 'epoch-ms', why: '§8.5: sent_at is the scheduler clock dueWork compares its windows against' },
  // Nothing in core reads `created_at`, so `timestamp` would have been allowed here. It is epoch ms
  // because that is what `clock.now()` returns — the route writes it with no conversion, and a test
  // under FIXED_NOW can compare the stored value to the pinned instant with `toBe`.
  ai101Waitlist: { unit: 'epoch-ms', why: 'D-028: created_at is clock.now() as written by routes/ai101.ts; no reader converts it' },
};

const timestampTables = Object.entries(INSTANT_UNIT)
  .filter(([, v]) => v.unit === 'timestamp')
  .map(([t]) => t);

describe('§7.2 epoch-ms columns @g7', () => {
  it('declares every instant as bigint with mode: number @g7', () => {
    const wrong = EPOCH_COLUMNS.filter(([t, p]) => columnsOf(tableOf(t))[p]?.columnType !== 'PgBigInt53')
      .map(([t, p]) => `${t}.${p} is ${columnsOf(tableOf(t))[p]?.columnType ?? 'missing'}`);
    // PgBigInt53 is bigint(..., { mode: 'number' }). PgBigInt64 would hand back a BigInt and
    // PgTimestamp a Date; core does arithmetic on these as plain numbers.
    expect(wrong).toEqual([]);
  });

  it('finds no instant column outside that list @g7', () => {
    const stray = tables.flatMap(([t, table]) =>
      Object.entries(columnsOf(table))
        .filter(([p, c]) => c.columnType === 'PgBigInt53' && !EPOCH_COLUMNS.some(([et, ep]) => et === t && ep === p))
        .map(([p]) => `${t}.${p}`),
    );
    expect(stray).toEqual([]);
  });

  it('makes every table declare which unit its instants are in @g7 @g8', () => {
    // A new table cannot quietly inherit either answer: it has to appear in INSTANT_UNIT with a
    // reason, and a table that is removed cannot leave a stale entry behind.
    expect(Object.keys(INSTANT_UNIT).sort()).toEqual(tables.map(([name]) => name).sort());
    expect(Object.entries(INSTANT_UNIT).filter(([, v]) => !v.why).map(([t]) => t)).toEqual([]);
  });

  it('allows a timestamp only where no domain record is stored @g7 @g8', () => {
    // The rule, in the only form that can be checked mechanically: a `timestamp` may appear only in
    // a table that persists no `@ai/core` record, because a record's instants are read by core.
    // ENTITIES above is that list of records, derived from a real `seed('live')` snapshot.
    const persistsRecords = new Set(Object.values(ENTITIES).map((m) => m.table));
    expect(timestampTables.filter((t) => persistsRecords.has(t))).toEqual([]);

    // And the classification has to match the schema both ways round: no epoch-ms table carrying a
    // Date, and no timestamp table that has stopped having one (which would leave the allowance
    // sitting there for the next column that lands in it).
    const dateLike = (t: string): string[] =>
      Object.entries(columnsOf(tableOf(t)))
        .filter(([, c]) => c.columnType.startsWith('PgTimestamp') || c.columnType.startsWith('PgDate'))
        .map(([p]) => `${t}.${p}`);
    const stray = tables
      .filter(([t]) => INSTANT_UNIT[t]?.unit === 'epoch-ms')
      .flatMap(([t]) => dateLike(t));
    expect(stray).toEqual([]);
    expect(timestampTables.filter((t) => dateLike(t).length === 0)).toEqual([]);
  });

  it('routes every epoch-ms value in the seed into a bigint column @g7', () => {
    // The assertions above trust the hand-kept EPOCH_COLUMNS list. This one does not: it walks the
    // real seed, treats any number past EPOCH_FLOOR as an instant, and checks where it would land.
    const landed = new Set<string>();
    const wrong = new Set<string>();
    for (const m of Object.values(ENTITIES)) {
      const table = tableOf(m.table);
      const dbName = getTableConfig(table).name;
      const cols = columnsOf(table);
      for (const row of m.rows) {
        for (const [f, v] of Object.entries(row)) {
          if (typeof v !== 'number' || v < EPOCH_FLOOR) continue;
          const col = cols[m.alias?.[f] ?? f];
          if (!col) continue; // absence is the coverage test's business, not this one's
          landed.add(`${dbName}.${col.name}`);
          if (col.columnType !== 'PgBigInt53') wrong.add(`${dbName}.${col.name} is ${col.columnType}`);
        }
      }
    }
    expect([...wrong].sort()).toEqual([]);
    // And prove the walk found the instants rather than nothing at all.
    expect([...landed].sort()).toEqual([
      'activity.t', 'announcements.at', 'cohorts.end', 'cohorts.start', 'modules.opens',
      'progress.built_at', 'progress.deployed_at', 'resources.updated', 'sessions.moved_from',
      'sessions.start', 'upgrade_requests.at', 'users.joined', 'users.last',
    ]);
  });

  it('declares a codec for every column whose stored unit differs from its field @g7', () => {
    // An integer column rounds a fraction on the way in and nothing downstream can tell, so a
    // fractional seed value landing in one is either a schema defect or a deliberate change of
    // unit. § 7.2 names this column `opens_pct`, which says which it is: the column holds whole
    // percent, `Announcement.opens` holds the fraction `fmt.pct` renders. That only works if the
    // snapshot codec in § 7.3 converts on the way through, so the conversion is pinned here, next
    // to the schema it belongs to — and the walk below proves no OTHER integer column is quietly
    // rounding a value the reference depends on.
    const CODECS: Record<string, { field: string; toDb: (v: number) => number; fromDb: (v: number) => number }> = {
      'announcements.opens_pct': {
        field: 'Announcement.opens',
        toDb: (v) => Math.round(v * 100),
        fromDb: (v) => v / 100,
      },
    };

    const rounding = new Map<string, number[]>();
    for (const m of Object.values(ENTITIES)) {
      const table = tableOf(m.table);
      const dbName = getTableConfig(table).name;
      const cols = columnsOf(table);
      for (const row of m.rows) {
        for (const [f, v] of Object.entries(row)) {
          if (typeof v !== 'number' || Number.isInteger(v)) continue;
          const col = cols[m.alias?.[f] ?? f];
          if (!col || col.columnType !== 'PgInteger') continue;
          const key = `${dbName}.${col.name}`;
          rounding.set(key, [...(rounding.get(key) ?? []), v]);
        }
      }
    }
    // A rounding column with no codec would corrupt the value in production; a codec for a column
    // that no longer rounds is dead weight. Either way the two lists have to agree.
    expect([...rounding.keys()].sort()).toEqual(Object.keys(CODECS).sort());

    // And the codec has to be the right one. The test of correctness is not arithmetic but the
    // rendered string: every seeded value must come back out of the column rendering exactly what
    // the fixture renders today, because the same parity goldens cover both data sources.
    let checked = 0;
    for (const [key, values] of rounding) {
      const codec = CODECS[key]!;
      for (const v of values) {
        const stored = codec.toDb(v);
        expect(Number.isInteger(stored), `${key}: ${codec.field} ${v} stores as non-integer ${stored}`).toBe(true);
        expect(
          fmt.pct(codec.fromDb(stored)),
          `${key}: ${codec.field} ${v} renders differently after a write and a read`,
        ).toBe(fmt.pct(v));
        checked += 1;
      }
    }
    // Prove the walk found the fractional values rather than nothing at all.
    expect(checked).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Composite primary keys.
// ---------------------------------------------------------------------------

/** Tables keyed by a pair rather than an id, with the key columns in order. */
const COMPOSITE_KEYS: Record<string, string[]> = {
  progress: ['user_id', 'module_id'],
  dismissals: ['user_id', 'announcement_id'],
  permissions: ['role', 'perm'],
  // § 8.5 asks for "a unique `(job, key)`" on job_runs. The pair IS the primary key rather than a
  // separate unique index over a surrogate id: the scheduler's write is an `on conflict do
  // nothing` on exactly this pair, which is what makes two replicas racing one tick harmless, and
  // a nullable or duplicated surrogate id would be a second identity for a row that already has
  // one. The test below (`no single-column primaryKey`) is the one that matters here: a primary key
  // on `job` alone would record the first send of a job and suppress every later one.
  jobRuns: ['job', 'key'],
};

describe('§7.2 composite primary keys @g7', () => {
  for (const [name, expected] of Object.entries(COMPOSITE_KEYS)) {
    it(`${name} is keyed by (${expected.join(', ')}) @g7`, () => {
      const table = tableOf(name);
      const pks = getTableConfig(table).primaryKeys;
      expect(pks.length).toBe(1);
      expect(pks[0]?.columns.map((c) => c.name)).toEqual(expected);
      // A stray single-column primaryKey() would make one half of the pair unique on its own and
      // let a second user overwrite the first's row.
      expect(Object.values(columnsOf(table)).filter((c) => c.primary).map((c) => c.name)).toEqual([]);
    });
  }

  it('finds no other table relying on a composite key @g7', () => {
    const composite = tables.filter(([, t]) => getTableConfig(t).primaryKeys.length > 0).map(([n]) => n);
    expect(composite.sort()).toEqual(Object.keys(COMPOSITE_KEYS).sort());
  });

  it('gives every other table a single-column primary key @g7', () => {
    const unkeyed = tables
      .filter(([n]) => !(n in COMPOSITE_KEYS))
      .filter(([, t]) => !Object.values(columnsOf(t)).some((c) => c.primary))
      .map(([n]) => n);
    expect(unkeyed).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5. Unique indexes.
// ---------------------------------------------------------------------------

/**
 * Tables whose uniqueness lives in an index rather than in the primary key, with the columns in
 * order. `users.email`'s column-level `.unique()` is a constraint, not an index, and is not listed.
 *
 * The waitlist is the one entry, and the index is not decoration: `routes/ai101.ts` inserts with
 * `on conflict (email, source) do nothing`, and Postgres REJECTS that statement outright — every
 * sign-up a 500 — if no unique index or constraint matches the conflict target. So the pair, its
 * order and its uniqueness are pinned here, next to the schema, rather than discovered at a venue.
 */
const UNIQUE_INDEXES: Record<string, { name: string; columns: string[] }> = {
  ai101Waitlist: { name: 'ai101_waitlist_email_source_idx', columns: ['email', 'source'] },
};

describe('unique indexes @g9', () => {
  /** Every index on a table, as plain data. A column expression is a `PgColumn`, which has a name. */
  const indexesOf = (t: PgTable) =>
    getTableConfig(t).indexes.map((i) => ({
      name: i.config.name,
      unique: i.config.unique,
      columns: i.config.columns.map((c) => (c as unknown as { name: string }).name),
    }));

  for (const [name, expected] of Object.entries(UNIQUE_INDEXES)) {
    it(`${name} is unique on (${expected.columns.join(', ')}) @g9`, () => {
      expect(indexesOf(tableOf(name))).toEqual([{ name: expected.name, unique: true, columns: expected.columns }]);
    });
  }

  it('finds no other table carrying an index @g9', () => {
    // A new index is a new rule about which rows may coexist, which is worth a line here.
    const indexed = tables.filter(([, t]) => getTableConfig(t).indexes.length > 0).map(([n]) => n);
    expect(indexed.sort()).toEqual(Object.keys(UNIQUE_INDEXES).sort());
  });
});
