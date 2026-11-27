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
import { PgDialect, PgTable, getTableConfig } from 'drizzle-orm/pg-core';
import { EDITABLE_ROLES, ROLE_ROW_KEYS, fmt, seed } from '@ai/core';
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
  users: { table: 'users', columns: ['cohort_id', 'early_access', 'email', 'id', 'is_test', 'joined', 'kind', 'last', 'name', 'nudged', 'prefs', 'reminded', 'role', 'seq', 'staff_role', 'status', 'team_id', 'tier'] },
  teams: { table: 'teams', columns: ['id', 'name', 'owner_id', 'seats', 'seq'] },
  cohorts: { table: 'cohorts', columns: ['archived_at', 'cadence', 'capacity', 'course', 'default_open_time', 'end', 'hosts', 'id', 'included_until', 'name', 'overlap_ok_at', 'preview_opens_at', 'program_id', 'run', 'shape', 'start', 'status', 'timezone', 'weeks', 'welcome_sends_at', 'words', 'words_checked_at'] },
  sessions: { table: 'sessions', columns: ['attended', 'cohort_id', 'id', 'kind', 'live', 'mins', 'module_id', 'moved_from', 'n', 'replay', 'replay_url', 'replay_visibility', 'slot', 'start', 'title', 'views', 'zoom'] },
  modules: { table: 'modules', columns: ['build', 'checklist', 'course', 'due_at', 'dur', 'files', 'for_who', 'headline', 'icon', 'id', 'instructor', 'kind', 'name', 'notes', 'opens', 'order', 'outcome', 'outputs', 'platform', 'prompt', 'resources', 'run_demo', 'run_label', 'session', 'short', 'status', 'tier', 'tone', 'transcript'] },
  progress: { table: 'progress', columns: ['built_at', 'deployed_at', 'issue', 'last_run', 'module_id', 'runtime', 'steps', 'user_id'] },
  // D-190: a learner's checklist boxes and accordion memory. Epoch ms, like progress.
  checklistState: { table: 'checklist_state', columns: ['auto', 'checked', 'checked_at', 'item_id', 'module_id', 'step_id', 'user_id'] },
  learnerPrefs: { table: 'learner_prefs', columns: ['key', 'updated_at', 'user_id', 'value'] },
  // D-191: how far a learner has watched one course video. Epoch ms, like progress.
  videoProgress: { table: 'video_progress', columns: ['last_position_s', 'max_pct', 'module_id', 'updated_at', 'user_id', 'video_id'] },
  // D-196: one intake per team. Not a Db record.
  teamIntake: { table: 'team_intake', columns: ['answers', 'ghl_attempts', 'ghl_error', 'ghl_next_at', 'ghl_sync_status', 'ghl_synced_at', 'submitted_at', 'team_id', 'updated_at', 'updated_by'] },
  teamStackCard: { table: 'team_stack_card', columns: ['rows', 'sent_at', 'team_id', 'updated_at', 'updated_by'] },
  // D-231: the cohort Community's threads and posts. Not `Db` records.
  communityThreads: { table: 'community_threads', columns: ['activity_at', 'by_user_id', 'cohort_id', 'created_at', 'deleted_at', 'hidden', 'id', 'pinned', 'space', 'title'] },
  communityPosts: { table: 'community_posts', columns: ['body', 'by_user_id', 'created_at', 'deleted_at', 'edited_at', 'hidden', 'id', 'thread_id'] },
  // D-230: Turn in's turn-ins. Not a `Db` record.
  submissions: { table: 'submissions', columns: ['by_user_id', 'created_at', 'files', 'files_deleted_at', 'files_deleted_by', 'id', 'kind', 'minutes', 'module_id', 'note', 'status', 'status_at', 'status_by', 'team_id'] },
  // D-236: one seat card per team per week. Not a `Db` record.
  teamSeatCards: { table: 'team_seat_cards', columns: ['answers', 'module_id', 'ready_at', 'signed_at', 'signed_by', 'team_id', 'updated_at', 'updated_by'] },
  resources: { table: 'resources', columns: ['cat', 'desc', 'dl', 'exec', 'file_name', 'id', 'kind', 'module_id', 'platform', 'seq', 'size', 'status', 'step_id', 'storage_key', 'tier', 'title', 'type', 'updated', 'visibility'] },
  announcements: { table: 'announcements', columns: ['action', 'action_label', 'at', 'audience', 'body', 'channels', 'id', 'opens_pct', 'session_id', 'severity', 'status', 'title'] },
  dismissals: { table: 'dismissals', columns: ['announcement_id', 'user_id'] },
  reminders: { table: 'reminders', columns: ['channel', 'id', 'label', 'on'] },
  tiers: { table: 'tiers', columns: ['blurb', 'features', 'id', 'name', 'price', 'seats'] },
  requests: { table: 'upgrade_requests', columns: ['at', 'email', 'id', 'name', 'source', 'status', 'user_id'] },
  permissions: { table: 'permissions', columns: ['allowed', 'perm', 'role'] },
  activity: { table: 'activity', columns: ['id', 't', 'tone', 'what', 'who'] },
  authTokens: { table: 'auth_tokens', columns: ['email', 'expires_at', 'purpose', 'token_hash', 'used_at'] },
  authSessions: { table: 'auth_sessions', columns: ['expires_at', 'id', 'impersonating', 'remember', 'user_id'] },
  // D-132: passwords and the lockout, outside `users` and outside `Db`.
  userPasswords: { table: 'user_passwords', columns: ['hash', 'updated_at', 'user_id'] },
  loginFailures: { table: 'login_failures', columns: ['failures', 'first_at', 'key', 'locked_until'] },
  // D-139: the Google account linked to a user, outside `users` and outside `Db`.
  googleIdentities: { table: 'google_identities', columns: ['linked_at', 'sub', 'user_id'] },
  // § 8.5: "Record sends in a `job_runs(job, key, sent_at)` table with a unique `(job, key)`."
  // Three columns and no more. An `id` here would be a second way to identify a row that the
  // unique pair already identifies, and anything else would be duplicating the key's own segments.
  jobRuns: { table: 'job_runs', columns: ['job', 'key', 'sent_at'], gate: 8 },
  // D-028: the public /ai101 page's December waitlist. Not a `Db` record, so it appears in none of
  // the coverage maps below — only here, in the instant-unit map, and in the unique-index check.
  // `team_size` and `december_interest` are /retool's two questions (D-046), null and false on every
  // other form's row; `test/guides.test.ts` holds the CHECK that keeps the size to its four values.
  ai101Waitlist: {
    table: 'ai101_waitlist',
    columns: ['brokerage', 'created_at', 'december_interest', 'email', 'first_name', 'ghl_attempts', 'ghl_contact_id', 'ghl_error', 'ghl_last_attempt_at', 'ghl_next_attempt_at', 'ghl_sync_stamp', 'ghl_synced_at', 'id', 'phone', 'sms_consent', 'sms_consent_at', 'sms_consent_text', 'source', 'src', 'team_size', 'terms_version'],
    gate: 9,
  },
  // The offer (D-075, D-078, D-079): billing state outside `Db`, like the waitlist. Gate 9 is where
  // the public pages sit; these are their tables.
  orders: {
    table: 'orders',
    columns: ['account_id', 'agreement_accepted_at', 'agreement_version', 'amount_total', 'campaign', 'company', 'created_at', 'crm', 'currency', 'email', 'ghl_attempts', 'ghl_contact_id', 'ghl_error', 'ghl_last_attempt_at', 'ghl_next_attempt_at', 'ghl_sync_stamp', 'ghl_synced_at', 'id', 'membership_ended_at', 'name', 'option', 'origin', 'paid_at', 'payment_failed_at', 'payments_made', 'phone', 'plan', 'refunded_at', 'renewal_consent_at', 'renewal_consent_text', 'sms_consent', 'sms_consent_at', 'sms_consent_text', 'src', 'status', 'stripe_customer_id', 'stripe_payment_intent_id', 'stripe_session_id', 'stripe_subscription_id', 'team_size'],
    gate: 9,
  },
  stripeEvents: { table: 'stripe_events', columns: ['error', 'id', 'processed_at', 'received_at', 'type'], gate: 9 },
  // D-134: a learner's first sign-in, queued for GoHighLevel. Not a `Db` record, like `orders`.
  ghlLogins: {
    table: 'ghl_logins',
    columns: ['first_login_at', 'ghl_attempts', 'ghl_contact_id', 'ghl_error', 'ghl_last_attempt_at', 'ghl_next_attempt_at', 'ghl_sync_stamp', 'ghl_synced_at', 'user_id'],
    gate: 9,
  },
  // D-148: access groups (the Utah Life team) and the addresses whose owners have followed a link
  // emailed to them. Not `Db` records, like `orders`.
  accessGroups: { table: 'access_groups', columns: ['created_at', 'email_domain', 'expires_at', 'id', 'name', 'plan'], gate: 9 },
  accessGroupMembers: { table: 'access_group_members', columns: ['added_at', 'email', 'group_id', 'name'], gate: 9 },
  emailVerifications: { table: 'email_verifications', columns: ['email', 'verified_at'], gate: 9 },
  accounts: {
    table: 'accounts',
    columns: ['created_at', 'crm', 'id', 'invite_sent_at', 'name', 'owner_email', 'owner_user_id', 'stripe_customer_id', 'team_id'],
    gate: 9,
  },
  // One cohort welcome per (team owner, cohort). Not a `Db` record.
  cohortEnrollments: {
    table: 'cohort_enrollments',
    columns: ['account_id', 'cohort_id', 'enrolled_at', 'ghl_attempts', 'ghl_contact_id', 'ghl_error', 'ghl_last_attempt_at', 'ghl_next_attempt_at', 'ghl_sync_stamp', 'ghl_synced_at', 'user_id', 'week0_claimed_at', 'week0_error', 'week0_sent_at', 'week0_status', 'welcome_claimed_at', 'welcome_error', 'welcome_sent_at', 'welcome_status'],
    gate: 9,
  },
  plans: {
    table: 'plans',
    columns: ['account_id', 'cohort_id', 'created_at', 'id', 'kind', 'live_until', 'minimum_until', 'option', 'order_id', 'paid_through', 'seats', 'starts_at', 'status', 'stripe_subscription_id'],
    gate: 9,
  },
  skills: { table: 'skills', columns: ['files', 'free', 'id', 'released_at', 'sets', 'status', 'summary', 'title'], gate: 9 },
  // A skill bought on its own. Not a `Db` record, like `orders`.
  skillPurchases: {
    table: 'skill_purchases',
    columns: ['account_id', 'amount', 'created_user_id', 'email', 'ghl_attempts', 'ghl_contact_id', 'ghl_error', 'ghl_last_attempt_at', 'ghl_next_attempt_at', 'ghl_sync_stamp', 'ghl_synced_at', 'guest_entered_at', 'id', 'order_id', 'purchased_at', 'refunded_at', 'skill_id', 'stripe_payment_intent_id', 'stripe_session_id', 'user_id'],
    gate: 9,
  },
  // D-157: the Admin Console's append-only audit log (spec § 7.8). Not a `Db` record, like `orders`.
  auditLog: {
    table: 'audit_log',
    columns: ['action', 'actor_role', 'actor_source', 'actor_user_id', 'after', 'at', 'before', 'id', 'ip', 'masquerade_session_id', 'outcome', 'reason', 'request_id', 'target_id', 'target_label', 'target_type', 'user_agent'],
    gate: 9,
  },
  // D-160 R2-3b: the Owner's changes to the Roles & Permissions matrix. Not a `Db` record, like `orders`.
  consoleRoleGrants: { table: 'console_role_grants', columns: ['allowed', 'capability', 'role', 'updated_at', 'updated_by'], gate: 9 },
  // D-158: the Admin Console's staff notes (spec § 7.3). Not a `Db` record, like `audit_log`.
  staffNotes: {
    table: 'staff_notes',
    columns: ['author_user_id', 'body', 'created_at', 'delete_reason', 'deleted_at', 'deleted_by', 'id', 'target_id', 'target_type'],
    gate: 9,
  },
  // D-162: the Admin Console's masquerade sessions (spec § 6). Not a `Db` record, like `audit_log`.
  masqueradeSessions: {
    table: 'masquerade_sessions',
    columns: [
      'auth_session_id', 'end_reason', 'ended_at', 'expires_at', 'extend_count', 'hard_expires_at', 'id', 'ip', 'reason',
      'staff_auth_session_id', 'staff_user_id', 'started_at', 'started_from', 'target_user_id', 'user_agent',
    ],
    gate: 9,
  },
  // D-165: the Admin Console's ops telemetry (spec §§ 7.9-7.10). Not `Db` records, like `audit_log`.
  apiMetrics: { table: 'api_metrics', columns: ['count', 'errors_4xx', 'errors_5xx', 'hist', 'minute', 'route'], gate: 9 },
  jobTicks: { table: 'job_ticks', columns: ['actor_user_id', 'error_kind', 'finished_at', 'id', 'job', 'started_at', 'status', 'trigger'], gate: 9 },
  // D-166: the Admin Console's email log (spec § 7.15), with no column for a body, and usage counts
  // (spec § 7.7). Neither is a `Db` record, like `audit_log`.
  // D-263: and what Resend's webhook reports about each sent row, folded from `resend_events`.
  emailLog: {
    table: 'email_log',
    columns: [
      'at', 'bounce_message', 'bounce_sub_type', 'bounce_type', 'bounced_at', 'click_count', 'clicked_first_at', 'clicked_last_at', 'clicked_link',
      'complained_at', 'delayed_at', 'delivered_at', 'delivery_status', 'error_kind', 'id', 'open_count', 'opened_first_at', 'opened_last_at',
      'provider', 'provider_id', 'status', 'subject', 'template', 'to', 'user_id',
    ],
    gate: 9,
  },
  // D-263: every Resend webhook event the email log records, once, by its message id. Not a `Db` record.
  resendEvents: { table: 'resend_events', columns: ['bounce_message', 'bounce_sub_type', 'bounce_type', 'email_id', 'id', 'link', 'occurred_at', 'received_at', 'type'], gate: 9 },
  usageDaily: { table: 'usage_daily', columns: ['count', 'day', 'kind', 'team_id', 'user_id'], gate: 9 },
  // D-167: the Admin Console's incidents and their timelines (spec § 7.14). Not `Db` records, like `audit_log`.
  incidents: {
    table: 'incidents',
    columns: ['acknowledged_at', 'acknowledged_by', 'fingerprint', 'id', 'opened_at', 'opened_by', 'resolved_at', 'resolved_by', 'severity', 'status', 'title'],
    gate: 9,
  },
  incidentEvents: { table: 'incident_events', columns: ['actor_user_id', 'at', 'body', 'id', 'incident_id', 'kind', 'link'], gate: 9 },
  // D-168: the Admin Console's own flags (spec § 7.13). Not a `Db` record, like `audit_log`.
  consoleFlags: { table: 'console_flags', columns: ['key', 'on', 'sensitive', 'turned_on_at', 'updated_at', 'updated_by'], gate: 9 },
  // D-173: the curriculum builder's copy strings. A `Db` record (`Db.copy`), round-tripped by the codec.
  copyStrings: { table: 'copy_strings', columns: ['audience', 'key', 'value'] },
  // D-175: which one-time data steps the deploy has run (release plan, copy strings). Not a `Db` record.
  dataMigrations: { table: 'data_migrations', columns: ['id', 'ran_at', 'summary'], gate: 9 },
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
  // D-173: a week's due time, and when the cohort's pre-launch preview opens.
  ['modules', 'dueAt'],
  ['cohorts', 'previewOpensAt'],
  ['cohorts', 'welcomeSendsAt'],
  // R-5 (D-254, migration 0043): when a cohort was archived.
  ['cohorts', 'archivedAt'],
  // R-5 Phase 3 (D-255, migration 0044): when a cohort's words were saved, and when its overlap was kept.
  ['cohorts', 'wordsCheckedAt'],
  ['cohorts', 'overlapOkAt'],
  ['progress', 'builtAt'], ['progress', 'deployedAt'],
  ['checklistState', 'checkedAt'],
  ['learnerPrefs', 'updatedAt'],
  ['videoProgress', 'updatedAt'],
  ['teamIntake', 'updatedAt'],
  ['teamIntake', 'submittedAt'],
  // D-229: the intake's sync to GHL.
  ['teamIntake', 'ghlSyncedAt'],
  ['teamIntake', 'ghlNextAt'],
  ['teamStackCard', 'updatedAt'],
  ['teamStackCard', 'sentAt'],
  // D-231: a thread's start, its newest post and its delete; a post's, its edit and its delete.
  ['communityThreads', 'createdAt'], ['communityThreads', 'activityAt'], ['communityThreads', 'deletedAt'],
  ['communityPosts', 'createdAt'], ['communityPosts', 'editedAt'], ['communityPosts', 'deletedAt'],
  // D-230: when a team turned in, and when staff last set its status.
  ['submissions', 'createdAt'], ['submissions', 'statusAt'],
  // D-237: when a turn-in's files were deleted with its cohort's.
  ['submissions', 'filesDeletedAt'],
  // D-236: a seat card's last save, its ready mark and its signature.
  ['teamSeatCards', 'updatedAt'], ['teamSeatCards', 'readyAt'], ['teamSeatCards', 'signedAt'],
  ['resources', 'updated'],
  ['announcements', 'at'],
  ['requests', 'at'],
  ['activity', 't'],
  // § 8.5. Not a `Db` column, but the same unit for the same reason: the scheduler writes
  // `clock.now()` here and `dueWork(db, now, …)` compares every window against that number.
  ['jobRuns', 'sentAt'],
  // D-028. Not a `Db` column either; see INSTANT_UNIT below for why it is epoch ms anyway.
  ['ai101Waitlist', 'createdAt'],
  // The GHL sync's bookkeeping (D-033): when the copy was made, and when the row is next due.
  ['ai101Waitlist', 'ghlSyncedAt'],
  ['ai101Waitlist', 'ghlNextAttemptAt'],
  // D-034: when the visitor ticked the SMS box.
  ['ai101Waitlist', 'smsConsentAt'],
  // The offer (D-075, D-078, D-079). `canOpenSkill` compares plans.paidThrough with skills.releasedAt
  // as plain numbers, and every other instant here is `clock.now()` as written by the webhook.
  ['orders', 'agreementAcceptedAt'], ['orders', 'renewalConsentAt'], ['orders', 'smsConsentAt'],
  ['orders', 'paidAt'], ['orders', 'paymentFailedAt'], ['orders', 'membershipEndedAt'], ['orders', 'refundedAt'],
  ['orders', 'ghlSyncedAt'], ['orders', 'ghlNextAttemptAt'], ['orders', 'createdAt'],
  // D-134: the sync's last try, on every row it copies, and a learner's first sign-in.
  ['ai101Waitlist', 'ghlLastAttemptAt'], ['orders', 'ghlLastAttemptAt'],
  ['ghlLogins', 'firstLoginAt'], ['ghlLogins', 'ghlSyncedAt'], ['ghlLogins', 'ghlNextAttemptAt'], ['ghlLogins', 'ghlLastAttemptAt'],
  ['stripeEvents', 'receivedAt'], ['stripeEvents', 'processedAt'],
  ['accounts', 'createdAt'], ['accounts', 'inviteSentAt'],
  ['cohortEnrollments', 'enrolledAt'], ['cohortEnrollments', 'welcomeSentAt'], ['cohortEnrollments', 'welcomeClaimedAt'],
  ['cohortEnrollments', 'ghlSyncedAt'], ['cohortEnrollments', 'ghlNextAttemptAt'], ['cohortEnrollments', 'ghlLastAttemptAt'],
  ['cohortEnrollments', 'week0SentAt'], ['cohortEnrollments', 'week0ClaimedAt'],
  ['plans', 'startsAt'], ['plans', 'paidThrough'], ['plans', 'liveUntil'], ['plans', 'minimumUntil'], ['plans', 'createdAt'],
  ['skills', 'releasedAt'],
  ['skillPurchases', 'purchasedAt'], ['skillPurchases', 'refundedAt'],
  ['skillPurchases', 'ghlSyncedAt'], ['skillPurchases', 'ghlNextAttemptAt'], ['skillPurchases', 'ghlLastAttemptAt'], ['skillPurchases', 'guestEnteredAt'],
  ['accessGroups', 'expiresAt'], ['accessGroups', 'createdAt'], ['accessGroupMembers', 'addedAt'], ['emailVerifications', 'verifiedAt'],
  // D-157: when a Console action happened, `clock.now()` as the audit writer stamps it.
  ['auditLog', 'at'],
  // D-160 R2-3b: when the Owner last changed a matrix row, `clock.now()`.
  ['consoleRoleGrants', 'updatedAt'],
  // D-158: when a staff note was written, and when it was deleted, as `clock.now()` stamps them.
  ['staffNotes', 'createdAt'],
  ['staffNotes', 'deletedAt'],
  // D-162: a masquerade's start, its two deadlines and its end, as `clock.now()` stamps them.
  ['masqueradeSessions', 'startedAt'],
  ['masqueradeSessions', 'expiresAt'],
  ['masqueradeSessions', 'hardExpiresAt'],
  ['masqueradeSessions', 'endedAt'],
  // D-165: the minute an API metric counts, and a job tick's start and end, as `clock.now()` stamps them.
  ['apiMetrics', 'minute'],
  ['jobTicks', 'startedAt'],
  ['jobTicks', 'finishedAt'],
  // D-166: when a send was logged, as `clock.now()` stamps it.
  ['emailLog', 'at'],
  // D-263: when Resend says each delivery event happened, and when the webhook received it.
  ['emailLog', 'deliveredAt'],
  ['emailLog', 'delayedAt'],
  ['emailLog', 'bouncedAt'],
  ['emailLog', 'complainedAt'],
  ['emailLog', 'openedFirstAt'],
  ['emailLog', 'openedLastAt'],
  ['emailLog', 'clickedFirstAt'],
  ['emailLog', 'clickedLastAt'],
  ['resendEvents', 'occurredAt'],
  ['resendEvents', 'receivedAt'],
  // D-167: when an incident opened, was acknowledged and resolved, and when each timeline line was written.
  ['incidents', 'openedAt'],
  ['incidents', 'acknowledgedAt'],
  ['incidents', 'resolvedAt'],
  ['incidentEvents', 'at'],
  // D-168: when a Console flag was last flipped, as `clock.now()` stamps it.
  ['consoleFlags', 'updatedAt'],
  ['consoleFlags', 'turnedOnAt'],
  // D-175: when the deploy ran a one-time data step, as `clock.now()` stamps it.
  ['dataMigrations', 'ranAt'],
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
  checklistState: { unit: 'epoch-ms', why: 'D-190: ChecklistMark.checkedAt is clock.now() as written by toggleChecklistItem, and fmt never reads a Date' },
  learnerPrefs: { unit: 'epoch-ms', why: 'D-190: CoursePref.updatedAt is clock.now() as written by setPref' },
  videoProgress: { unit: 'epoch-ms', why: 'D-191: VideoProgress.updatedAt is clock.now() as written by saveVideoProgress, and fmt never reads a Date' },
  teamIntake: { unit: 'epoch-ms', why: 'D-196: updated_at and submitted_at are clock.now(), and the Saved line is fmt.time' },
  teamStackCard: { unit: 'epoch-ms', why: 'D-197: updated_at and sent_at are clock.now()' },
  communityThreads: { unit: 'epoch-ms', why: 'D-231: clock.now() at each write, and fmt.activity reads activity_at' },
  communityPosts: { unit: 'epoch-ms', why: 'D-231: clock.now() at each write, and fmt.when prints created_at' },
  submissions: { unit: 'epoch-ms', why: 'D-230: clock.now() at a turn-in and a status change, and fmt.when prints created_at' },
  teamSeatCards: { unit: 'epoch-ms', why: 'D-236: clock.now() at a save, the ready mark and the signature, and fmt prints them' },
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
  userPasswords: { unit: 'timestamp', why: 'D-132 internals: updated_at is written and never compared or read by core' },
  loginFailures: { unit: 'timestamp', why: 'D-132 internals: first_at/locked_until are compared with now() and never reach core' },
  googleIdentities: { unit: 'timestamp', why: 'D-139 internals: linked_at is written and never compared or read by core' },
  jobRuns: { unit: 'epoch-ms', why: '§8.5: sent_at is the scheduler clock dueWork compares its windows against' },
  // Nothing in core reads `created_at`, so `timestamp` would have been allowed here. It is epoch ms
  // because that is what `clock.now()` returns — the route writes it with no conversion, and a test
  // under FIXED_NOW can compare the stored value to the pinned instant with `toBe`.
  ai101Waitlist: { unit: 'epoch-ms', why: 'D-028: created_at is clock.now() as written by routes/ai101.ts; no reader converts it' },
  orders: { unit: 'epoch-ms', why: 'D-075: clock.now() as written by checkout and the webhook' },
  stripeEvents: { unit: 'epoch-ms', why: 'D-075: clock.now() as written by the webhook' },
  ghlLogins: { unit: 'epoch-ms', why: 'D-134: clock.now() as written by the GHL loop' },
  accounts: { unit: 'epoch-ms', why: 'D-078: created_at and invite_sent_at, compared with INVITES_FROM' },
  cohortEnrollments: { unit: 'epoch-ms', why: 'enrolled_at is the cohort plan’s created_at; welcome_sent_at and week0_sent_at are clock.now() when each email goes out' },
  plans: { unit: 'epoch-ms', why: 'D-079: paid_through is compared with skills.released_at by canOpenSkill' },
  skills: { unit: 'epoch-ms', why: 'D-079: released_at is compared with plans.paid_through by canOpenSkill' },
  skillPurchases: { unit: 'epoch-ms', why: 'purchased_at and refunded_at are clock.now() as written by the skill webhook' },
  accessGroups: { unit: 'epoch-ms', why: 'D-148: expires_at is compared with clock.now() by inGroup' },
  accessGroupMembers: { unit: 'epoch-ms', why: 'D-148: added_at is clock.now() as written; no reader converts it' },
  emailVerifications: { unit: 'epoch-ms', why: 'D-148: verified_at is clock.now() as written by claimToken; no reader converts it' },
  auditLog: { unit: 'epoch-ms', why: 'D-157: at is clock.now() as written by console/audit.ts, and fmt.* formats it in the Console' },
  consoleRoleGrants: { unit: 'epoch-ms', why: 'D-160 R2-3b: updated_at is clock.now() as written by console/roles.ts; no reader converts it' },
  staffNotes: { unit: 'epoch-ms', why: 'D-158: created_at and deleted_at are clock.now() as written by console/notes.ts, and fmt.* formats them' },
  masqueradeSessions: { unit: 'epoch-ms', why: 'D-162: compared with clock.now() by masqueradeLive and the sweep, and counted down by the banner' },
  apiMetrics: { unit: 'epoch-ms', why: 'D-165: a minute floored from clock.now(), read back over the last 24 hours' },
  jobTicks: { unit: 'epoch-ms', why: 'D-165: a run’s start and end from clock.now(); the next run is the start plus an interval in ms' },
  emailLog: { unit: 'epoch-ms', why: 'D-166: at is clock.now() as written by email/log.ts, pruned against it, and printed in MST by the R2 admin' },
  usageDaily: { unit: 'epoch-ms', why: 'D-166: no instant at all; `day` is a program-zone calendar day, YYYY-MM-DD' },
  resendEvents: { unit: 'epoch-ms', why: 'D-263: occurred_at is Resend’s created_at parsed to ms, received_at is clock.now(); both folded into email_log and pruned against it' },
  incidents: { unit: 'epoch-ms', why: 'D-167: clock.now() at each change, compared with the rules’ evidence times' },
  incidentEvents: { unit: 'epoch-ms', why: 'D-167: clock.now() at each line; a rule repeats only on evidence newer than its last' },
  consoleFlags: { unit: 'epoch-ms', why: 'D-168: updated_at and turned_on_at are clock.now() as written by console/flags.ts, and fmt.* formats them' },
  copyStrings: { unit: 'epoch-ms', why: 'D-173: no instant at all; a key, its words and who reads them' },
  dataMigrations: { unit: 'epoch-ms', why: 'D-175: ran_at is clock.now() as the deploy ran the step' },
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
  checklistState: ['user_id', 'module_id', 'step_id', 'item_id'],
  learnerPrefs: ['user_id', 'key'],
  videoProgress: ['user_id', 'module_id', 'video_id'],
  dismissals: ['user_id', 'announcement_id'],
  permissions: ['role', 'perm'],
  // § 8.5 asks for "a unique `(job, key)`" on job_runs. The pair IS the primary key rather than a
  // separate unique index over a surrogate id: the scheduler's write is an `on conflict do
  // nothing` on exactly this pair, which is what makes two replicas racing one tick harmless, and
  // a nullable or duplicated surrogate id would be a second identity for a row that already has
  // one. The test below (`no single-column primaryKey`) is the one that matters here: a primary key
  // on `job` alone would record the first send of a job and suppress every later one.
  jobRuns: ['job', 'key'],
  // D-148: an address is on a group's list once. The pair is the key, so listing it twice is a no-op.
  accessGroupMembers: ['group_id', 'email'],
  // D-160 R2-3b: one stored change per role and matrix row; a second change to the pair replaces it.
  consoleRoleGrants: ['role', 'capability'],
  // D-165: one row per minute and route template, which two replicas add to (`on conflict do update`).
  apiMetrics: ['minute', 'route'],
  // D-166: one count per learner, day and kind; each event upserts it (`on conflict … count + 1`).
  usageDaily: ['day', 'user_id', 'kind'],
  // D-236: one seat card per team per week; each save upserts it (`on conflict … do update`).
  teamSeatCards: ['team_id', 'module_id'],
  // One welcome per team owner and cohort. The pair is the key, so a second plan cannot send a second welcome.
  cohortEnrollments: ['user_id', 'cohort_id'],
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
  // D-075: one order per Checkout Session, which is how a fallback Payment Link's second delivery
  // finds the order its first one made.
  orders: { name: 'orders_stripe_session_idx', columns: ['stripe_session_id'] },
  // D-078: accounts are found by the owner's email, so one buyer is one account.
  accounts: { name: 'accounts_owner_email_idx', columns: ['owner_email'] },
  // D-078: one plan per order, so provisioning an order twice finds the plan it made.
  plans: { name: 'plans_order_idx', columns: ['order_id'] },
  // D-162: one LIVE masquerade per staff member (spec § 6 rule 5). Partial: the test below pins its `where`.
  masqueradeSessions: { name: 'masquerade_sessions_one_live_idx', columns: ['staff_user_id'] },
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

  // D-157: the audit log's lookups (the Console's filters), none of them unique. Listed so an index
  // added anywhere else still has to be argued for here.
  const LOOKUP_INDEXES: Record<string, { name: string; unique: boolean; columns: string[] }[]> = {
    auditLog: [
      { name: 'audit_log_at_idx', unique: false, columns: ['at'] },
      { name: 'audit_log_actor_idx', unique: false, columns: ['actor_user_id'] },
      { name: 'audit_log_action_idx', unique: false, columns: ['action'] },
      { name: 'audit_log_target_idx', unique: false, columns: ['target_type', 'target_id'] },
    ],
    // D-158: a record's notes are read by their target.
    staffNotes: [{ name: 'staff_notes_target_idx', unique: false, columns: ['target_type', 'target_id'] }],
    // D-165: a job's latest ticks, and the 90-day prune by time.
    jobTicks: [
      { name: 'job_ticks_job_started_idx', unique: false, columns: ['job', 'started_at'] },
      { name: 'job_ticks_started_idx', unique: false, columns: ['started_at'] },
    ],
    // D-166: the email log's list (newest first), a person's emails and the Template filter; usage by workspace.
    emailLog: [
      { name: 'email_log_at_idx', unique: false, columns: ['at'] },
      { name: 'email_log_user_idx', unique: false, columns: ['user_id'] },
      { name: 'email_log_template_idx', unique: false, columns: ['template'] },
      // D-263: a webhook event finds its row by Resend's id.
      { name: 'email_log_provider_id_idx', unique: false, columns: ['provider_id'] },
    ],
    // D-263: an email's events, for its fold; and the 180-day prune by arrival.
    resendEvents: [
      { name: 'resend_events_email_idx', unique: false, columns: ['email_id'] },
      { name: 'resend_events_received_idx', unique: false, columns: ['received_at'] },
    ],
    usageDaily: [{ name: 'usage_daily_team_idx', unique: false, columns: ['team_id', 'day'] }],
    // D-167: one UNRESOLVED incident per fingerprint (partial: the test below pins its `where`), and
    // the list's status filter; a timeline is read by its incident, in time order.
    incidents: [
      { name: 'incidents_fingerprint_unresolved_idx', unique: true, columns: ['fingerprint'] },
      { name: 'incidents_status_idx', unique: false, columns: ['status'] },
    ],
    incidentEvents: [{ name: 'incident_events_incident_idx', unique: false, columns: ['incident_id', 'at'] }],
    // D-231: the Community's list (a cohort's threads by newest activity), a thread's posts, and one person's posts
    // in the last hour (the posts-an-hour guard).
    communityThreads: [{ name: 'community_threads_cohort_idx', unique: false, columns: ['cohort_id', 'activity_at'] }],
    communityPosts: [
      { name: 'community_posts_thread_idx', unique: false, columns: ['thread_id', 'id'] },
      { name: 'community_posts_by_idx', unique: false, columns: ['by_user_id', 'created_at'] },
    ],
    // D-230: a team's turn-ins for a week and a kind, newest last; and a week's, for staff.
    submissions: [
      { name: 'submissions_team_idx', unique: false, columns: ['team_id', 'module_id', 'kind', 'id'] },
      { name: 'submissions_module_idx', unique: false, columns: ['module_id', 'id'] },
    ],
    // D-236: a week's seat cards, for staff. A team's own is its primary key.
    teamSeatCards: [{ name: 'team_seat_cards_module_idx', unique: false, columns: ['module_id'] }],
    // One open purchase per buyer and skill, one row per Checkout Session, and refunds found by payment intent.
    skillPurchases: [
      { name: 'skill_purchases_session_idx', unique: true, columns: ['stripe_session_id'] },
      { name: 'skill_purchases_user_skill_idx', unique: true, columns: ['user_id', 'skill_id'] },
      { name: 'skill_purchases_payment_intent_idx', unique: false, columns: ['stripe_payment_intent_id'] },
      { name: 'skill_purchases_email_skill_idx', unique: true, columns: ['email', 'skill_id'] },
    ],
  };

  it('makes the masquerade index partial: only rows with no ended_at are unique @g9', () => {
    const [idx] = getTableConfig(tableOf('masqueradeSessions')).indexes;
    const where = new PgDialect().sqlToQuery(idx!.config.where!).sql;
    expect(where).toBe('"masquerade_sessions"."ended_at" is null');
  });

  it('gives the audit log its four lookup indexes, none unique @g9', () => {
    expect(indexesOf(tableOf('auditLog'))).toEqual(LOOKUP_INDEXES.auditLog);
  });

  it('gives staff notes their target index, not unique @g9', () => {
    expect(indexesOf(tableOf('staffNotes'))).toEqual(LOOKUP_INDEXES.staffNotes);
  });

  it('gives job ticks their two lookup indexes, none unique @g9', () => {
    expect(indexesOf(tableOf('jobTicks'))).toEqual(LOOKUP_INDEXES.jobTicks);
  });

  it('gives the email log and usage their lookup indexes, none unique (D-166) @g9', () => {
    expect(indexesOf(tableOf('emailLog'))).toEqual(LOOKUP_INDEXES.emailLog);
    expect(indexesOf(tableOf('usageDaily'))).toEqual(LOOKUP_INDEXES.usageDaily);
    expect(indexesOf(tableOf('resendEvents'))).toEqual(LOOKUP_INDEXES.resendEvents);
  });

  it('keeps one unresolved incident per fingerprint, and indexes timelines by incident @g9', () => {
    expect(indexesOf(tableOf('incidents'))).toEqual(LOOKUP_INDEXES.incidents);
    expect(indexesOf(tableOf('incidentEvents'))).toEqual(LOOKUP_INDEXES.incidentEvents);
    const [idx] = getTableConfig(tableOf('incidents')).indexes;
    expect(new PgDialect().sqlToQuery(idx!.config.where!).sql).toBe(`"incidents"."status" <> 'resolved'`);
  });

  it('gives the Community its lookup indexes, none unique (D-231) @g9', () => {
    expect(indexesOf(tableOf('communityThreads'))).toEqual(LOOKUP_INDEXES.communityThreads);
    expect(indexesOf(tableOf('communityPosts'))).toEqual(LOOKUP_INDEXES.communityPosts);
  });

  it('gives Turn in its lookup indexes, none unique (D-230) @g9', () => {
    expect(indexesOf(tableOf('submissions'))).toEqual(LOOKUP_INDEXES.submissions);
  });

  it('gives the seat cards their lookup index, not unique (D-236) @g9', () => {
    expect(indexesOf(tableOf('teamSeatCards'))).toEqual(LOOKUP_INDEXES.teamSeatCards);
  });

  it('keeps one skill purchase per buyer and skill, and one row per Checkout Session @g9', () => {
    expect(indexesOf(tableOf('skillPurchases'))).toEqual(LOOKUP_INDEXES.skillPurchases);
  });

  it('finds no other table carrying an index @g9', () => {
    // A new index is a new rule about which rows may coexist, which is worth a line here.
    const indexed = tables.filter(([, t]) => getTableConfig(t).indexes.length > 0).map(([n]) => n);
    expect(indexed.sort()).toEqual([...Object.keys(UNIQUE_INDEXES), ...Object.keys(LOOKUP_INDEXES)].sort());
  });
});

// ---------------------------------------------------------------------------
// D-160 R2-3b: the Roles & Permissions changes' CHECKs are core's lists, typed out in schema.ts.
// ---------------------------------------------------------------------------

describe('console_role_grants checks @g9', () => {
  const checksOf = (t: PgTable) =>
    Object.fromEntries(getTableConfig(t).checks.map((c) => [c.name, String((c.value as unknown as { queryChunks: unknown[] }).queryChunks.map((q) => (typeof q === 'object' && q && 'value' in q ? (q as { value: string[] }).value.join('') : '')).join(''))]));

  it('keeps the role to Admin and Support and the row to the matrix’s nine', () => {
    const checks = checksOf(tableOf('consoleRoleGrants'));
    expect(Object.keys(checks).sort()).toEqual(['console_role_grants_capability', 'console_role_grants_role']);
    expect(checks.console_role_grants_role).toContain(`in (${EDITABLE_ROLES.map((r) => `'${r}'`).join(', ')})`);
    expect(checks.console_role_grants_capability).toContain(`in (${ROLE_ROW_KEYS.map((r) => `'${r}'`).join(', ')})`);
  });
});
