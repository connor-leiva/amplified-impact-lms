// Postgres schema for the Amplified Impact LMS, reproduced from docs/phases/07-backend.md § 7.2.
//
// Columns map 1:1 to the `Db` types in `@ai/core`. JSONB holds the nested arrays the UI treats as
// a single unit (a module's checklist, a resource bundle, a transcript). Epoch-ms instants are
// `bigint(... { mode: 'number' })`, never `timestamp`: core passes time as a plain number
// everywhere, and a driver-level Date conversion would silently corrupt every date in the app.
// `schema.test.ts` asserts both of those properties against the live table objects.
//
// Three `Db` fields have no column here, by design:
//   - `Learner.progress`   lives in the `progress` table, keyed by (user_id, module_id)
//   - `Cohort.enrolled`    is derived (count of users in the cohort), not stored
//   - `Db.dismissed`       lives in the `dismissals` table; § 7.3 rebuilds it as "userId:annId"
// `Db.v`, `Db.phase` and `Db.base` are snapshot-level metadata, not persisted rows: the API always
// returns `base: ZERO_BASE`.
// Three tables are the other way round — rows with no `Db` field at all: `auth_tokens` and
// `auth_sessions` (§ 7.5) and `job_runs` (§ 8.5, the scheduler's idempotence ledger).
import { pgTable, text, integer, boolean, timestamp, jsonb, primaryKey, pgEnum, bigint } from 'drizzle-orm/pg-core';

export const tier = pgEnum('tier', ['agent', 'team']);
export const moduleStatus = pgEnum('module_status', ['draft', 'scheduled', 'published']);
const ts = (n: string) => bigint(n, { mode: 'number' }); // epoch ms, same as core

export const users = pgTable('users', {
  id: text('id').primaryKey(), email: text('email').notNull().unique(), name: text('name').notNull(),
  kind: text('kind', { enum: ['learner', 'staff'] }).notNull(),
  // learner fields
  tier: tier('tier'), role: text('role'), teamId: text('team_id'), cohortId: text('cohort_id'),
  joined: ts('joined'), last: ts('last'), status: text('status', { enum: ['active', 'invited'] }),
  reminded: ts('reminded'), nudged: ts('nudged'),
  // staff fields
  staffRole: text('staff_role', { enum: ['Owner', 'Admin', 'Instructor', 'Content Editor', 'Support'] }),
  prefs: jsonb('prefs').$type<{ tz?: string | null; theme?: 'light' | 'dark' }>().default({}),
});
export const teams = pgTable('teams', { id: text('id').primaryKey(), name: text('name').notNull(), ownerId: text('owner_id').notNull(), seats: integer('seats').notNull().default(7) });
export const cohorts = pgTable('cohorts', { id: text('id').primaryKey(), name: text('name').notNull(), start: ts('start').notNull(), end: ts('end').notNull(), weeks: integer('weeks'), status: text('status').notNull(), capacity: integer('capacity').notNull(), cadence: text('cadence').notNull() });
export const sessions = pgTable('sessions', { id: text('id').primaryKey(), cohortId: text('cohort_id').notNull(), n: integer('n').notNull(), title: text('title').notNull(), start: ts('start').notNull(), mins: integer('mins').notNull(), zoom: text('zoom').notNull(), live: boolean('live').notNull().default(false), attended: integer('attended'), replay: text('replay'), views: integer('views').notNull().default(0), movedFrom: ts('moved_from') });
export const modules = pgTable('modules', {
  id: text('id').primaryKey(), name: text('name').notNull(), short: text('short').notNull(), tier: tier('tier').notNull(), icon: text('icon').notNull(),
  forWho: text('for_who').notNull(), headline: text('headline').notNull(), outcome: text('outcome').notNull(), outputs: jsonb('outputs').$type<string[]>().notNull(),
  platform: text('platform').notNull(), runLabel: text('run_label').notNull(), build: integer('build').notNull(), session: integer('session'),
  status: moduleStatus('status').notNull(), opens: ts('opens'), order: integer('order').notNull(), dur: integer('dur').notNull().default(0),
  instructor: text('instructor').notNull(), transcript: jsonb('transcript').$type<[number, string][]>().notNull(), notes: text('notes').notNull(),
  prompt: text('prompt').notNull(), files: jsonb('files').notNull(), resources: jsonb('resources').notNull(), checklist: jsonb('checklist').notNull(), runDemo: jsonb('run_demo'),
});
export const progress = pgTable('progress', {
  userId: text('user_id').notNull(), moduleId: text('module_id').notNull(),
  steps: jsonb('steps').$type<string[]>().notNull(), builtAt: ts('built_at'), deployedAt: ts('deployed_at'), runtime: text('runtime'), issue: text('issue'), lastRun: jsonb('last_run'),
}, (t) => [primaryKey({ columns: [t.userId, t.moduleId] })]);
export const resources = pgTable('resources', { id: text('id').primaryKey(), title: text('title').notNull(), desc: text('desc').notNull(), cat: text('cat').notNull(), type: text('type').notNull(), tier: tier('tier').notNull(), size: text('size').notNull(), dl: integer('dl').notNull().default(0), updated: ts('updated').notNull(), exec: boolean('exec').notNull(), status: text('status').notNull(), storageKey: text('storage_key') });
export const announcements = pgTable('announcements', { id: text('id').primaryKey(), sessionId: text('session_id'), title: text('title').notNull(), body: text('body').notNull(), severity: text('severity').notNull(), action: text('action'), actionLabel: text('action_label').notNull(), audience: text('audience').notNull(), channels: jsonb('channels').$type<string[]>().notNull(), status: text('status').notNull(), at: ts('at').notNull(), opens: integer('opens_pct') });
export const dismissals = pgTable('dismissals', { userId: text('user_id').notNull(), announcementId: text('announcement_id').notNull() }, (t) => [primaryKey({ columns: [t.userId, t.announcementId] })]);
export const reminders = pgTable('reminders', { id: text('id').primaryKey(), label: text('label').notNull(), channel: text('channel').notNull(), on: boolean('on').notNull() });
export const tiers = pgTable('tiers', { id: tier('id').primaryKey(), name: text('name').notNull(), price: integer('price').notNull(), seats: integer('seats').notNull(), blurb: text('blurb').notNull(), features: jsonb('features').$type<string[]>().notNull() });
export const requests = pgTable('upgrade_requests', { id: text('id').primaryKey(), userId: text('user_id'), name: text('name').notNull(), email: text('email').notNull(), source: text('source').notNull(), at: ts('at').notNull(), status: text('status').notNull() });
export const permissions = pgTable('permissions', { role: text('role').notNull(), perm: text('perm').notNull(), allowed: boolean('allowed').notNull() }, (t) => [primaryKey({ columns: [t.role, t.perm] })]);
export const activity = pgTable('activity', { id: text('id').primaryKey(), t: ts('t').notNull(), who: text('who').notNull(), what: text('what').notNull(), tone: text('tone').notNull() });
export const authTokens = pgTable('auth_tokens', { tokenHash: text('token_hash').primaryKey(), email: text('email').notNull(), purpose: text('purpose', { enum: ['sign_in', 'invite'] }).notNull(), expiresAt: timestamp('expires_at').notNull(), usedAt: timestamp('used_at') });
export const authSessions = pgTable('auth_sessions', { id: text('id').primaryKey(), userId: text('user_id').notNull(), expiresAt: timestamp('expires_at').notNull(), impersonating: text('impersonating') });

// The scheduler's idempotence ledger — phase 08 § 8.5: "Record sends in a `job_runs(job, key,
// sent_at)` table with a unique `(job, key)`. For example, the key `session-24h:dec26-s3:u_jamie`
// is sent once."
//
// Not part of a `Db` and deliberately not in the snapshot codec: a row here records that one email
// left the building, which is a fact about the outside world, not program state a learner can see.
// A snapshot write must never be able to clobber it — see `codec.ts`'s header on `COLUMNS_OWNED`.
//
// The unique (job, key) IS the composite primary key, so the scheduler's insert is a plain
// `on conflict do nothing` and two replicas racing the same tick cannot double-send. `key` already
// starts with `job:` (§ 8.5's own example does), so the `job` column is redundant for uniqueness —
// it is kept because § 8.5 specifies it, because "how many session-1h went out this week" should
// not require parsing a string, and because it is the natural partition for pruning old rows.
// `jobs/keys.ts` builds both halves in one function and its test pins them consistent.
//
// `sent_at` is epoch ms (`ts()`), not a `timestamp` like the two auth tables above. The unit
// follows whoever reads the value, not which table it sits in: the scheduler writes `clock.now()`
// here — the same number `dueWork(db, now, …)` compares every window against — so a driver-level
// `Date` would land one `Date` in the middle of arithmetic that is otherwise all plain numbers.
// The auth tables are the opposite case: their instants are compared only against each other and
// never cross into `@ai/core`. `schema.test.ts` states that rule and makes every table declare
// which side of it it is on.
export const jobRuns = pgTable('job_runs', {
  job: text('job').notNull(), key: text('key').notNull(), sentAt: ts('sent_at').notNull(),
}, (t) => [primaryKey({ columns: [t.job, t.key] })]);
