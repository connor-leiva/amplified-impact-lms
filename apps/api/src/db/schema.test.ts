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
// 1. The tables and columns phase 07 § 7.2 specifies, by database name.
// ---------------------------------------------------------------------------

const EXPECTED: Record<string, { table: string; columns: string[] }> = {
  users: { table: 'users', columns: ['cohort_id', 'email', 'id', 'joined', 'kind', 'last', 'name', 'nudged', 'prefs', 'reminded', 'role', 'staff_role', 'status', 'team_id', 'tier'] },
  teams: { table: 'teams', columns: ['id', 'name', 'owner_id', 'seats'] },
  cohorts: { table: 'cohorts', columns: ['cadence', 'capacity', 'end', 'id', 'name', 'start', 'status', 'weeks'] },
  sessions: { table: 'sessions', columns: ['attended', 'cohort_id', 'id', 'live', 'mins', 'moved_from', 'n', 'replay', 'start', 'title', 'views', 'zoom'] },
  modules: { table: 'modules', columns: ['build', 'checklist', 'dur', 'files', 'for_who', 'headline', 'icon', 'id', 'instructor', 'name', 'notes', 'opens', 'order', 'outcome', 'outputs', 'platform', 'prompt', 'resources', 'run_demo', 'run_label', 'session', 'short', 'status', 'tier', 'transcript'] },
  progress: { table: 'progress', columns: ['built_at', 'deployed_at', 'issue', 'last_run', 'module_id', 'runtime', 'steps', 'user_id'] },
  resources: { table: 'resources', columns: ['cat', 'desc', 'dl', 'exec', 'id', 'size', 'status', 'storage_key', 'tier', 'title', 'type', 'updated'] },
  announcements: { table: 'announcements', columns: ['action', 'action_label', 'at', 'audience', 'body', 'channels', 'id', 'opens_pct', 'session_id', 'severity', 'status', 'title'] },
  dismissals: { table: 'dismissals', columns: ['announcement_id', 'user_id'] },
  reminders: { table: 'reminders', columns: ['channel', 'id', 'label', 'on'] },
  tiers: { table: 'tiers', columns: ['blurb', 'features', 'id', 'name', 'price', 'seats'] },
  requests: { table: 'upgrade_requests', columns: ['at', 'email', 'id', 'name', 'source', 'status', 'user_id'] },
  permissions: { table: 'permissions', columns: ['allowed', 'perm', 'role'] },
  activity: { table: 'activity', columns: ['id', 't', 'tone', 'what', 'who'] },
  authTokens: { table: 'auth_tokens', columns: ['email', 'expires_at', 'purpose', 'token_hash', 'used_at'] },
  authSessions: { table: 'auth_sessions', columns: ['expires_at', 'id', 'impersonating', 'user_id'] },
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
    it(`${expected.table} has exactly the specified columns @g7`, () => {
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
];

/** The only tables allowed a `timestamp`: auth internals whose values never cross into core. */
const AUTH_TABLES = ['authTokens', 'authSessions'];

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

  it('uses timestamp only in the auth tables @g7', () => {
    const stray = tables
      .filter(([t]) => !AUTH_TABLES.includes(t))
      .flatMap(([t, table]) =>
        Object.entries(columnsOf(table))
          .filter(([, c]) => c.columnType.startsWith('PgTimestamp') || c.columnType.startsWith('PgDate'))
          .map(([p, c]) => `${t}.${p} is ${c.columnType}`),
      );
    expect(stray).toEqual([]);
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
