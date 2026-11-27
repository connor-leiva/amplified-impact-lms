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
//   - `Learner.checks`     lives in `checklist_state` (D-190)
//   - `Learner.coursePrefs` lives in `learner_prefs` (D-190)
//   - `Learner.videoProgress` lives in `video_progress` (D-191)
//   - `Cohort.enrolled`    is derived (count of users in the cohort), not stored
//   - `Db.dismissed`       lives in the `dismissals` table; § 7.3 rebuilds it as "userId:annId"
// `Db.v`, `Db.phase` and `Db.base` are snapshot-level metadata, not persisted rows: the API always
// returns `base: ZERO_BASE`.
// Four tables are the other way round — rows with no `Db` field at all: `auth_tokens` and
// `auth_sessions` (§ 7.5), `job_runs` (§ 8.5, the scheduler's idempotence ledger) and
// `ai101_waitlist` (the public /ai101 page's sign-ups, DECISIONS.md D-028).
import { pgTable, text, integer, boolean, timestamp, jsonb, primaryKey, pgEnum, bigint, bigserial, serial, uniqueIndex, index, check, doublePrecision } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ONE COLUMN THAT IS NOT IN `Db`: `seq`, on users, teams and resources.
//
// `Db.users`, `Db.teams` and `Db.resources` are ORDERED arrays and the screens render them in that
// order — `Vault.vm.ts` only filters, and `Learners.vm.ts` and `TeamHub.vm.ts` map. So the array
// order is data, and a database that does not store it cannot reproduce it. Measured against every
// plausible existing column: nothing reproduces the fixture's order for users or teams (not id, not
// `joined`, not name, not the owner's join date), which is why a column is needed rather than a
// cleverer ORDER BY.
//
// It is NOT part of any `@ai/core` type. `toRows` fills it from the array index and `fromRows`
// drops it, so `Db` is unchanged, the differential tests are unaffected, and fixture parity cannot
// move. See codec.ts's ORDER table and DECISIONS.md D-023.

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
  prefs: jsonb('prefs').$type<{ tz?: string | null; theme?: 'light' | 'dark'; sidebar?: 'full' | 'rail' }>().default({}),
  seq: integer('seq').notNull().default(0),
  // D-202: a seeded test account. Not a snapshot field. Left out of seat, enrollment and revenue
  // counts. `early_access` opens the course before its dates, and only while `is_test` is set.
  isTest: boolean('is_test').notNull().default(false),
  earlyAccess: boolean('early_access').notNull().default(false),
});
export const teams = pgTable('teams', { id: text('id').primaryKey(), name: text('name').notNull(), ownerId: text('owner_id').notNull(), seats: integer('seats').notNull().default(7), seq: integer('seq').notNull().default(0) });
// D-173 (the curriculum builder): every new column on `cohorts`, `sessions`, `modules` and `resources`
// is nullable with no default, so a row written before them (and every fixture) reads back exactly as
// it was: the codec turns a null into an absent key. Closed lists are CHECKed, null allowed.
export const cohorts = pgTable('cohorts', {
  id: text('id').primaryKey(), name: text('name').notNull(), start: ts('start').notNull(), end: ts('end').notNull(), weeks: integer('weeks'), status: text('status').notNull(), capacity: integer('capacity').notNull(), cadence: text('cadence').notNull(),
  previewOpensAt: ts('preview_opens_at'), timezone: text('timezone'), defaultOpenTime: text('default_open_time'), course: jsonb('course'),
  // When the cohort welcome may go out. Null: the access-open time (Week 0 Opens, else the preview, else the first dated week).
  welcomeSendsAt: ts('welcome_sends_at'),
  // R-5 (D-254, migration 0043): the cohort owns its run and its shape. All nullable, no default: a null reads back as
  // an absent key, so every cohort made before reads exactly as before (December's run is written in Phase 3).
  run: jsonb('run'), shape: jsonb('shape'), programId: text('program_id'), archivedAt: ts('archived_at'),
  // R-5 Phase 3 (D-255, migration 0044): the Cohort page's own facts. All nullable, no default (D-173).
  includedUntil: text('included_until'), wordsCheckedAt: ts('words_checked_at'), overlapOkAt: ts('overlap_ok_at'), words: jsonb('words'), hosts: text('hosts'),
  // R-5 Phase 5 (D-262, migration 0047): what it sells through. All nullable, no default (D-173); December's are written
  // by the data step `2026-11-27-december-selling`. The price is Stripe's, under the lookup keys: no amount is stored.
  founding: boolean('founding'), foundingClosesAt: ts('founding_closes_at'),
  lookupKeyFull: text('lookup_key_full'), lookupKeyRollover: text('lookup_key_rollover'), lookupKeyTwoPay: text('lookup_key_two_pay'),
  twoPay: boolean('two_pay'), linkFull: text('link_full'), linkTwoPay: text('link_two_pay'), ghlValue: text('ghl_value'),
  // When Close enrollment was pressed; null while open. Close never writes `status` (PLAN.md § 2.5).
  enrollmentClosedAt: ts('enrollment_closed_at'),
}, (t) => [
  check('cohorts_default_open_time', sql`${t.defaultOpenTime} is null or ${t.defaultOpenTime} ~ '^[0-2][0-9]:[0-5][0-9]$'`),
  // D-255: a calendar date, not an instant (§ 7.2), so text in its one shape.
  check('cohorts_included_until', sql`${t.includedUntil} is null or ${t.includedUntil} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`),
  // D-262: a Payment Link is an https address.
  check('cohorts_link_full', sql`${t.linkFull} is null or ${t.linkFull} ~ '^https://'`),
  check('cohorts_link_two_pay', sql`${t.linkTwoPay} is null or ${t.linkTwoPay} ~ '^https://'`),
]);
// D-172: `replay_url`, the recording a past session's Attach replay records (nullable; nothing learner-facing reads it yet).
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), cohortId: text('cohort_id').notNull(), n: integer('n').notNull(), title: text('title').notNull(), start: ts('start').notNull(), mins: integer('mins').notNull(), zoom: text('zoom').notNull(), live: boolean('live').notNull().default(false), attended: integer('attended'), replay: text('replay'), views: integer('views').notNull().default(0), movedFrom: ts('moved_from'), replayUrl: text('replay_url'),
  kind: text('kind'), moduleId: text('module_id'), replayVisibility: text('replay_visibility'),
  // R-5 (D-254, migration 0043): the rhythm slot that laid the session out. Null on a session made or edited by hand.
  slot: text('slot'),
}, (t) => [
  // `SessionType` and `ReplayVisibility` in `@ai/core` types.ts, typed out because drizzle-kit reads this file on its own.
  check('sessions_kind', sql`${t.kind} is null or ${t.kind} in ('live_build', 'office_hours', 'goal_planning', 'setup', 'other')`),
  check('sessions_replay_visibility', sql`${t.replayVisibility} is null or ${t.replayVisibility} in ('hidden', 'after_open', 'published')`),
]);
export const modules = pgTable('modules', {
  id: text('id').primaryKey(), name: text('name').notNull(), short: text('short').notNull(), tier: tier('tier').notNull(), icon: text('icon').notNull(),
  forWho: text('for_who').notNull(), headline: text('headline').notNull(), outcome: text('outcome').notNull(), outputs: jsonb('outputs').$type<string[]>().notNull(),
  platform: text('platform').notNull(), runLabel: text('run_label').notNull(), build: integer('build').notNull(), session: integer('session'),
  status: moduleStatus('status').notNull(), opens: ts('opens'), order: integer('order').notNull(), dur: integer('dur').notNull().default(0),
  instructor: text('instructor').notNull(), transcript: jsonb('transcript').$type<[number, string][]>().notNull(), notes: text('notes').notNull(),
  prompt: text('prompt').notNull(), files: jsonb('files').notNull(), resources: jsonb('resources').notNull(), checklist: jsonb('checklist').notNull(), runDemo: jsonb('run_demo'),
  kind: text('kind'), dueAt: ts('due_at'), tone: text('tone'), course: jsonb('course'),
}, (t) => [
  check('modules_kind', sql`${t.kind} is null or ${t.kind} in ('week', 'skill')`),
]);
export const progress = pgTable('progress', {
  userId: text('user_id').notNull(), moduleId: text('module_id').notNull(),
  steps: jsonb('steps').$type<string[]>().notNull(), builtAt: ts('built_at'), deployedAt: ts('deployed_at'), runtime: text('runtime'), issue: text('issue'), lastRun: jsonb('last_run'),
}, (t) => [primaryKey({ columns: [t.userId, t.moduleId] })]);
// D-190: one checklist box per learner, week, step and item. A sub-check's item_id is `<itemId>:<subId>`.
// Epoch ms, like `progress`, so core reads a number. Not a snapshot of anyone but the viewer (scope.ts).
export const checklistState = pgTable('checklist_state', {
  userId: text('user_id').notNull(), moduleId: text('module_id').notNull(), stepId: text('step_id').notNull(), itemId: text('item_id').notNull(),
  checked: boolean('checked').notNull(), checkedAt: ts('checked_at'), auto: boolean('auto').notNull().default(false),
}, (t) => [primaryKey({ columns: [t.userId, t.moduleId, t.stepId, t.itemId] })]);
// D-190: accordion open state now (`acc:<moduleId>:<stepId>:<index>`), the path tab later. Distinct from
// `users.prefs` (timezone and theme), which a snapshot never carries.
export const learnerPrefs = pgTable('learner_prefs', {
  userId: text('user_id').notNull(), key: text('key').notNull(), value: text('value').notNull(), updatedAt: ts('updated_at').notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.key] })]);
// D-191: how far one learner has watched one course video. `max_pct` only rises (the mutation
// enforces it). Double precision, not `real`: postgres `real` is float4 and cannot round-trip 0.9,
// the threshold Week 0 checks at. `updated_at` is epoch ms, like every other learner instant.
// D-196: one intake per team. Not a Db field. Answers never leave the portal.
export const teamStackCard = pgTable('team_stack_card', {
  teamId: text('team_id').primaryKey(),
  rows: jsonb('rows').$type<{ source: string; tool: string; plan: 'green' | 'yellow'; who: string }[]>().notNull(),
  sentAt: ts('sent_at'),
  updatedAt: ts('updated_at').notNull(),
  updatedBy: text('updated_by').notNull(),
});
export const teamIntake = pgTable('team_intake', {
  teamId: text('team_id').primaryKey(),
  answers: jsonb('answers').$type<Record<string, string | string[]>>().notNull(),
  updatedAt: ts('updated_at').notNull(),
  updatedBy: text('updated_by').notNull(),
  submittedAt: ts('submitted_at'),
  // D-229 (B-20): the sync to GHL (jobs/ghl-intake.ts). none, pending, synced or failed.
  ghlSyncStatus: text('ghl_sync_status').notNull().default('none'),
  ghlSyncedAt: ts('ghl_synced_at'),
  ghlAttempts: integer('ghl_attempts').notNull().default(0),
  ghlError: text('ghl_error'),
  ghlNextAt: ts('ghl_next_at'),
});
// D-231 (B-34): the cohort Community. A thread lives in a space ("general", "week-N", "wins") of one cohort; its
// first post is its body and every later post a reply. Not a `Db` record and never in a snapshot: only
// routes/community.ts reads or writes these. Nothing is removed: a delete sets `deleted_at` (the thread's too, when
// its first post goes), so the posts-an-hour guard still counts it. `activity_at` is the newest post's time, which
// the list sorts by. Ids are serials, so a thread's posts read in the order they were written (and an id is a plain
// integer, never mistaken for an instant). Epoch ms.
export const communityThreads = pgTable('community_threads', {
  id: serial('id').primaryKey(),
  cohortId: text('cohort_id').notNull(),
  space: text('space').notNull(),
  title: text('title').notNull(),
  byUserId: text('by_user_id').notNull(),
  pinned: boolean('pinned').notNull().default(false),
  hidden: boolean('hidden').notNull().default(false),
  createdAt: ts('created_at').notNull(),
  activityAt: ts('activity_at').notNull(),
  deletedAt: ts('deleted_at'),
}, (t) => [index('community_threads_cohort_idx').on(t.cohortId, t.activityAt)]);
export const communityPosts = pgTable('community_posts', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').notNull().references(() => communityThreads.id),
  byUserId: text('by_user_id').notNull(),
  body: text('body').notNull(),
  createdAt: ts('created_at').notNull(),
  editedAt: ts('edited_at'),
  hidden: boolean('hidden').notNull().default(false),
  deletedAt: ts('deleted_at'),
}, (t) => [
  index('community_posts_thread_idx').on(t.threadId, t.id),
  index('community_posts_by_idx').on(t.byUserId, t.createdAt),
]);
// D-230 (B-24 to B-28): Turn in. One row per turn-in: a team's latest for a week and a kind is the one it sees, and
// staff see every version. `files` holds each file's bucket key (`submissions/<team>/…`), its name and its size.
// `status` is what staff did with it and never leaves the staff routes (B-25). Not a `Db` record. Epoch ms.
export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  teamId: text('team_id').notNull(),
  moduleId: text('module_id').notNull(),
  kind: text('kind').notNull(),
  files: jsonb('files').$type<{ key: string; name: string; size: number }[]>().notNull(),
  note: text('note').notNull().default(''),
  minutes: text('minutes').notNull().default(''),
  byUserId: text('by_user_id').notNull(),
  createdAt: ts('created_at').notNull(),
  status: text('status').notNull().default('received'),
  statusAt: ts('status_at'),
  statusBy: text('status_by'),
  // D-237: when staff deleted this turn-in's files with the rest of its cohort's, and who. The row stays.
  filesDeletedAt: ts('files_deleted_at'),
  filesDeletedBy: text('files_deleted_by'),
}, (t) => [
  index('submissions_team_idx').on(t.teamId, t.moduleId, t.kind, t.id),
  index('submissions_module_idx').on(t.moduleId, t.id),
  // `SUBMISSION_KINDS` and `SUBMISSION_STATUSES` in `@ai/core/submissions`, typed out because drizzle-kit reads this
  // file on its own.
  check('submissions_kind', sql`${t.kind} in ('live_read', 'checkpoint')`),
  check('submissions_status', sql`${t.status} in ('received', 'picked', 'reviewed')`),
]);
// D-236: the seat card form. One card per team per week: the team's answers to the week's seat card (by row), who
// saved them last and when, when the Operations Lead marked it ready for the owner, and when the Team Owner signed it
// and who. Only routes/seat-card.ts reads or writes it. A change after signing saves and the card stays signed. Epoch ms.
export const teamSeatCards = pgTable('team_seat_cards', {
  teamId: text('team_id').notNull(),
  moduleId: text('module_id').notNull(),
  answers: jsonb('answers').$type<Record<string, string>>().notNull(),
  updatedAt: ts('updated_at').notNull(),
  updatedBy: text('updated_by').notNull(),
  readyAt: ts('ready_at'),
  signedAt: ts('signed_at'),
  signedBy: text('signed_by'),
}, (t) => [
  primaryKey({ columns: [t.teamId, t.moduleId] }),
  index('team_seat_cards_module_idx').on(t.moduleId),
]);
export const videoProgress = pgTable('video_progress', {
  userId: text('user_id').notNull(), moduleId: text('module_id').notNull(), videoId: text('video_id').notNull(),
  maxPct: doublePrecision('max_pct').notNull(), lastPositionS: doublePrecision('last_position_s').notNull(), updatedAt: ts('updated_at').notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.moduleId, t.videoId] })]);
// D-172: `module_id`, the AI Employee a resource is attached to (the Vault's "Attached to"; nullable, no foreign key, so deleting a draft leaves "—").
export const resources = pgTable('resources', {
  id: text('id').primaryKey(), title: text('title').notNull(), desc: text('desc').notNull(), cat: text('cat').notNull(), type: text('type').notNull(), tier: tier('tier').notNull(), size: text('size').notNull(), dl: integer('dl').notNull().default(0), updated: ts('updated').notNull(), exec: boolean('exec').notNull(), status: text('status').notNull(), storageKey: text('storage_key'), seq: integer('seq').notNull().default(0), moduleId: text('module_id'),
  // D-188: the stored file's own name (what it was called when uploaded), for its download. Like
  // `storage_key`, never in a snapshot: the upload actions write it beside the snapshot's columns.
  fileName: text('file_name'),
  kind: text('kind'), stepId: text('step_id'), visibility: text('visibility'), platform: text('platform'),
}, (t) => [
  // `ResourceKind`, `ResourceVisibility` and `ResourcePlatform` in `@ai/core` types.ts.
  check('resources_kind', sql`${t.kind} is null or ${t.kind} in ('file', 'prompt', 'guide', 'replay', 'vault')`),
  check('resources_visibility', sql`${t.visibility} is null or ${t.visibility} in ('hidden_until_open', 'open_in_preview', 'published', 'hidden')`),
  check('resources_platform', sql`${t.platform} is null or ${t.platform} in ('claude', 'chatgpt', 'both')`),
]);
// D-173: learner-facing copy the builder edits, by key (`locked.utah_life`, `locked.opens`, ...). A `Db`
// record (`Db.copy`), so it round-trips through the codec and the mutate route like any other.
export const copyStrings = pgTable('copy_strings', { key: text('key').primaryKey(), value: text('value').notNull(), audience: text('audience').notNull() });
// R-5 Phase 6 (D-265): the program record, what every cohort runs (one today, `accelerator`): its name and the course
// words every cohort shares (`CohortCourse`). A `Db` record (`Db.programs`). Written once by the data step
// `2026-11-28-program`, a copy of December's `cohorts.course` (which stays as it is), then by Course Settings.
export const programs = pgTable('programs', { id: text('id').primaryKey(), name: text('name').notNull(), course: jsonb('course') });
// D-175: one-time data steps the deploy's curriculum ensure runs (a release plan, a content load), each
// once, by id: a row here means it ran, with what it changed and what it left for the PM. Not part of a
// snapshot; read and written only by `db/data-migrations.ts`.
export const dataMigrations = pgTable('data_migrations', { id: text('id').primaryKey(), ranAt: ts('ran_at').notNull(), summary: jsonb('summary').notNull() });
export const announcements = pgTable('announcements', { id: text('id').primaryKey(), sessionId: text('session_id'), cohortId: text('cohort_id'), title: text('title').notNull(), body: text('body').notNull(), severity: text('severity').notNull(), action: text('action'), actionLabel: text('action_label').notNull(), audience: text('audience').notNull(), channels: jsonb('channels').$type<string[]>().notNull(), status: text('status').notNull(), at: ts('at').notNull(), opens: integer('opens_pct') });
export const dismissals = pgTable('dismissals', { userId: text('user_id').notNull(), announcementId: text('announcement_id').notNull() }, (t) => [primaryKey({ columns: [t.userId, t.announcementId] })]);
export const reminders = pgTable('reminders', { id: text('id').primaryKey(), label: text('label').notNull(), channel: text('channel').notNull(), on: boolean('on').notNull() });
export const tiers = pgTable('tiers', { id: tier('id').primaryKey(), name: text('name').notNull(), price: integer('price').notNull(), seats: integer('seats').notNull(), blurb: text('blurb').notNull(), features: jsonb('features').$type<string[]>().notNull() });
export const requests = pgTable('upgrade_requests', { id: text('id').primaryKey(), userId: text('user_id'), name: text('name').notNull(), email: text('email').notNull(), source: text('source').notNull(), at: ts('at').notNull(), status: text('status').notNull() });
export const permissions = pgTable('permissions', { role: text('role').notNull(), perm: text('perm').notNull(), allowed: boolean('allowed').notNull() }, (t) => [primaryKey({ columns: [t.role, t.perm] })]);
export const activity = pgTable('activity', { id: text('id').primaryKey(), t: ts('t').notNull(), who: text('who').notNull(), what: text('what').notNull(), tone: text('tone').notNull() });
export const authTokens = pgTable('auth_tokens', { tokenHash: text('token_hash').primaryKey(), email: text('email').notNull(), purpose: text('purpose', { enum: ['sign_in', 'invite', 'set_password', 'reset_password'] }).notNull(), expiresAt: timestamp('expires_at').notNull(), usedAt: timestamp('used_at') });
// `remember` (D-132): a session from "Keep me signed in" (and every link sign-in) lasts 30 days,
// rolling, in a 30-day cookie; one without it is a browser-session cookie and a 12-hour row.
export const authSessions = pgTable('auth_sessions', { id: text('id').primaryKey(), userId: text('user_id').notNull(), expiresAt: timestamp('expires_at').notNull(), impersonating: text('impersonating'), remember: boolean('remember').notNull().default(true) });

// Passwords (D-132). Their own table, keyed by the user, so no read of `users` (the snapshot, the
// viewer, every admin screen) ever carries a hash. `hash` is argon2id's PHC string (algorithm,
// parameters, salt and digest), never the password.
export const userPasswords = pgTable('user_passwords', { userId: text('user_id').primaryKey(), hash: text('hash').notNull(), updatedAt: timestamp('updated_at').notNull() });

// "Continue With Google" (D-139): which Google account, by its OpenID `sub`, is linked to which user.
// Its own table, like `user_passwords`, so no read of `users` carries it, and outside `Db`. One
// Google account per user and one user per Google account. Written the first time a verified email
// matches an account; later sign-ins match on `sub`, so a changed address on either side keeps it.
export const googleIdentities = pgTable('google_identities', { sub: text('sub').primaryKey(), userId: text('user_id').notNull().unique(), linkedAt: timestamp('linked_at').notNull() });

// Failed password sign-ins, for the lockout (D-132). Keyed by a sha256 of the address typed, so an
// address with no account is counted and locked exactly like one with an account (nothing tells
// the two apart) and no address is stored in the clear.
export const loginFailures = pgTable('login_failures', { key: text('key').primaryKey(), failures: integer('failures').notNull(), firstAt: timestamp('first_at').notNull(), lockedUntil: timestamp('locked_until') });

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

// The December waitlist on the public /ai101 page — the eXpCon 2026 kit page, DECISIONS.md D-028.
// The spec's order of preference for where sign-ups go is "the site's existing email/CRM
// integration" and then "the site's existing database"; this repository has no CRM, so it is a
// table. `routes/ai101.ts` is the only writer, and nothing in the app reads it yet: it is exported
// by hand (SQL or `drizzle-kit studio`) when the December track opens.
//
// Not part of a `Db` and deliberately not in the snapshot codec, for the same reason as `job_runs`:
// these are strangers who filled in a form, not program state, and a snapshot write must never be
// able to touch them. No learner or staff screen shows them.
//
// `source` is a server constant (`expcon-2026-ai101`), never read from the request, so the unique
// (email, source) index is what makes a second submission from the same address a no-op: the
// insert is `on conflict do nothing` on exactly this pair, and a later event with its own source can
// hold the same address again. `email` is stored lower-cased and trimmed, which is what makes the
// index mean "the same person" rather than "the same keystrokes". `src` is the `?src=` attribution
// tag (`qr` from the printed code), already filtered to a short slug or null.
//
// `created_at` is epoch ms (`ts()`) rather than a `timestamp`. Nothing in `@ai/core` reads it, so
// either unit would be defensible under `schema.test.ts`'s rule; epoch ms is the default every table
// declares unless it has a reason not to, and `clock.now()` — which § 7.7's FIXED_NOW pins in a test
// — hands back exactly that number.
export const ai101Waitlist = pgTable('ai101_waitlist', {
  id: text('id').primaryKey(), firstName: text('first_name').notNull(), email: text('email').notNull(),
  brokerage: text('brokerage'), source: text('source').notNull(), src: text('src'), createdAt: ts('created_at').notNull(),
  // The GoHighLevel sync (DECISIONS.md D-033, jobs/ghl-sync.ts). The row is the system of record and
  // GHL is a copy, so these only describe the copy: a sign-up is never refused or delayed by them.
  // `ghl_synced_at` null means "not in the CRM yet"; `ghl_attempts` and `ghl_next_attempt_at` are the
  // backoff, and the latter doubles as the claim lease. `ghl_error` holds a status code or a failure
  // KIND, never a response body — a body can echo the visitor's name and address back.
  ghlContactId: text('ghl_contact_id'), ghlSyncedAt: ts('ghl_synced_at'),
  ghlAttempts: integer('ghl_attempts').notNull().default(0), ghlNextAttemptAt: ts('ghl_next_attempt_at'),
  ghlError: text('ghl_error'),
  // D-134: which version of the sync last completed for this row (`syncStamp` in integrations/ghl.ts),
  // and when the loop last tried it. A row whose stamp differs from today's is synced again once, which
  // is how new tags, custom fields and the pipeline reach rows that were already in GHL.
  ghlSyncStamp: text('ghl_sync_stamp'), ghlLastAttemptAt: ts('ghl_last_attempt_at'),
  // Consent (D-034, the /ai101 redesign). Added in the same migration as the GHL columns so the two
  // branches share one. Joining IS email consent plus agreeing to the Terms and Privacy policy, so
  // every row carries those; `terms_version` records WHICH version (null for the sign-ups that
  // predate the pages). SMS is separate, optional and unchecked by default: `sms_consent` with its
  // proof — when (`sms_consent_at`, epoch ms like every instant here) and the exact checkbox wording
  // the visitor saw (`sms_consent_text`). `phone` is E.164, null when not given.
  phone: text('phone'), smsConsent: boolean('sms_consent').notNull().default(false),
  smsConsentAt: ts('sms_consent_at'), smsConsentText: text('sms_consent_text'), termsVersion: text('terms_version'),
  // /retool's two questions (D-046, the "Retool, Don't Replace: AI 101 for Team Owners" talk), which
  // no other form asks: `team_size`, required there and null for every other form's row (and every
  // row before it), and `december_interest`, its unchecked "Tell me about the December leadership
  // track" box, false unless ticked. Both reach GoHighLevel as tags (integrations/ghl.ts).
  teamSize: text('team_size'), decemberInterest: boolean('december_interest').notNull().default(false),
}, (t) => [
  uniqueIndex('ai101_waitlist_email_source_idx').on(t.email, t.source),
  // A "yes" to texts with no evidence behind it is the one record carrier rules (10DLC) make
  // dangerous to hold, so the database refuses it: consent needs the number, the time and the words.
  check(
    'ai101_waitlist_sms_consent_proof',
    sql`not ${t.smsConsent} or (${t.phone} is not null and ${t.smsConsentAt} is not null and ${t.smsConsentText} is not null)`,
  ),
  // The four sizes /retool's `<select>` offers (`TEAM_SIZES` in routes/ai101.ts, typed out again
  // because drizzle-kit reads this file on its own; a test inserts each of them and one that is not).
  // The route already refuses anything else and the GHL sync tags only from an allow-list; this is
  // the same rule for every other writer, so a size marketing filters on is never a typo (D-046).
  check('ai101_waitlist_team_size', sql`${t.teamSize} is null or ${t.teamSize} in ('1-10', '11-25', '26-50', '51+')`),
]);

// ================================================================================================
// THE OFFER: ORDERS, STRIPE EVENTS, ACCOUNTS, PLANS AND SKILLS (D-075, D-079, D-080)
// ================================================================================================
// Billing state, kept out of the prototype's `Db` exactly as the waitlist and the auth tables are:
// none of these is in the snapshot codec, so a snapshot write can never touch them and Gate 7's
// oracle and the parity suites cannot move. Teams and people (the `users` and `teams` rows an
// account points at) are still written through `@ai/core`, by provisioning (billing/provision.ts).
//
// Every instant is epoch ms (`ts()`), for the waitlist's reason: `clock.now()` is the number written,
// and the access rule (`canOpenSkill`, billing/access.ts) compares them as plain numbers. The enum-ish
// columns are text with a CHECK, typed out here because drizzle-kit reads this file on its own;
// billing/catalog.ts holds the same lists and `billing/billing.test.ts` holds the two equal (it reads
// the migrations, the last definition of each constraint winning).

// One row per purchase attempt: from the offer page (`origin` = 'offer', created before Stripe is
// called), from a fallback Payment Link (`origin` = 'payment_link', created by the webhook), or a
// staff comp (`origin` = 'comp': $0, no Stripe ids). Only the webhook moves a checkout's `status`
// past 'pending' (D-075); a comp is inserted already paid. The buyer's details, the consent proof and
// the attribution are the order's own; the account it became is `account_id`.
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  plan: text('plan').notNull(), option: text('option').notNull(), origin: text('origin').notNull(),
  status: text('status').notNull(),
  name: text('name'), email: text('email'), phone: text('phone'), company: text('company'), crm: text('crm'),
  teamSize: text('team_size'),
  src: text('src'), campaign: text('campaign'),
  agreementVersion: text('agreement_version'), agreementAcceptedAt: ts('agreement_accepted_at'),
  renewalConsentAt: ts('renewal_consent_at'), renewalConsentText: text('renewal_consent_text'),
  smsConsent: boolean('sms_consent').notNull().default(false), smsConsentAt: ts('sms_consent_at'), smsConsentText: text('sms_consent_text'),
  stripeSessionId: text('stripe_session_id'), stripeCustomerId: text('stripe_customer_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'), stripeSubscriptionId: text('stripe_subscription_id'),
  amountTotal: integer('amount_total'), currency: text('currency'),
  paymentsMade: integer('payments_made').notNull().default(0),
  // When the events behind the follow-up tags happened (D-077): the GHL sync reads these.
  paidAt: ts('paid_at'), paymentFailedAt: ts('payment_failed_at'), membershipEndedAt: ts('membership_ended_at'), refundedAt: ts('refunded_at'),
  ghlContactId: text('ghl_contact_id'), ghlSyncedAt: ts('ghl_synced_at'),
  ghlAttempts: integer('ghl_attempts').notNull().default(0), ghlNextAttemptAt: ts('ghl_next_attempt_at'), ghlError: text('ghl_error'),
  ghlSyncStamp: text('ghl_sync_stamp'), ghlLastAttemptAt: ts('ghl_last_attempt_at'), // D-134, as on ai101_waitlist
  accountId: text('account_id'),
  createdAt: ts('created_at').notNull(),
  // R-5 Phase 5 (D-262, migration 0047): the checkout's `ai_cohort`. Null: none, which is December, forever.
  cohortId: text('cohort_id'),
}, (t) => [
  uniqueIndex('orders_stripe_session_idx').on(t.stripeSessionId),
  check('orders_plan', sql`${t.plan} in ('library', 'cohort', 'agents', 'membership', 'agent_plan', 'insiders_agent')`),
  check('orders_option', sql`${t.option} in ('full', 'two_pay', 'upfront', 'upto15', '16to40', 'year_upfront', 'monthly', 'yearly')`),
  check('orders_origin', sql`${t.origin} in ('offer', 'payment_link', 'comp')`),
  check('orders_status', sql`${t.status} in ('pending', 'paid', 'trialing', 'expired', 'failed', 'refunded')`),
  check('orders_crm', sql`${t.crm} is null or ${t.crm} in ('follow_up_boss', 'other')`),
  // The waitlist's rule (D-034): a "yes" to texts needs the number, the time and the words.
  check('orders_sms_consent_proof', sql`not ${t.smsConsent} or (${t.phone} is not null and ${t.smsConsentAt} is not null and ${t.smsConsentText} is not null)`),
  // The same for a renewal: a time with no words is not proof of what was agreed to.
  check('orders_renewal_consent_proof', sql`(${t.renewalConsentAt} is null) = (${t.renewalConsentText} is null)`),
]);

// One row per Stripe event (D-075). Inserted before anything else happens, keyed by Stripe's own id,
// so a redelivered event that was already processed is skipped. `error` holds a short reason for an
// event that failed and will be retried by Stripe, never a payload.
// D-134: a learner's first LMS sign-in, queued for GoHighLevel (`lms-logged-in`, and the LMS Login
// field when it is configured). One row per learner, ever: the GHL loop adds it on its next tick for
// any learner with a session or an `active` status, so nothing runs on the sign-in path itself and a GHL
// outage can never slow a login. `first_login_at` is when the loop first saw it (within a tick of the
// sign-in itself). The rest are the same bookkeeping columns as `orders`.
export const ghlLogins = pgTable('ghl_logins', {
  userId: text('user_id').primaryKey(), firstLoginAt: ts('first_login_at').notNull(),
  ghlContactId: text('ghl_contact_id'), ghlSyncedAt: ts('ghl_synced_at'),
  ghlAttempts: integer('ghl_attempts').notNull().default(0), ghlNextAttemptAt: ts('ghl_next_attempt_at'), ghlError: text('ghl_error'),
  ghlSyncStamp: text('ghl_sync_stamp'), ghlLastAttemptAt: ts('ghl_last_attempt_at'),
});

export const stripeEvents = pgTable('stripe_events', {
  id: text('id').primaryKey(), type: text('type').notNull(),
  receivedAt: ts('received_at').notNull(), processedAt: ts('processed_at'), error: text('error'),
});

// The buying team (D-078): one platform team with the buyer as its Team Owner. Found by the owner's
// email (lower-cased), so a library buyer who later buys the cohort keeps one account and one login.
// `invite_sent_at` is null until the owner's invite has gone out: invites made before
// `INVITES_FROM` wait for it (Mon, Nov 16), so they arrive with the set-password email.
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(), teamId: text('team_id').notNull(), ownerUserId: text('owner_user_id').notNull(),
  ownerEmail: text('owner_email').notNull(), name: text('name').notNull(), crm: text('crm'),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: ts('created_at').notNull(), inviteSentAt: ts('invite_sent_at'),
}, (t) => [uniqueIndex('accounts_owner_email_idx').on(t.ownerEmail)]);

// One cohort welcome per (team owner, cohort). The job inserts a row from a live cohort plan and
// sends once. `welcome_status` null is still pending. `claimed` is in flight. `sent`, `failed` and
// `skipped` are final, so a retry cannot send a second time. The GHL columns are the same queue the
// other syncs use, for the `welcome-sent` tag after a real send. Not a `Db` record.
//
// The `week0_*` columns (0042) are the Week 0 Is Open email's own marker on the same row, with the same
// meanings: null pending, `claimed` in flight, `sent`, `failed` and `skipped` final.
export const cohortEnrollments = pgTable('cohort_enrollments', {
  userId: text('user_id').notNull(),
  cohortId: text('cohort_id').notNull(),
  accountId: text('account_id').notNull(),
  enrolledAt: ts('enrolled_at').notNull(),
  welcomeStatus: text('welcome_status'),
  welcomeSentAt: ts('welcome_sent_at'),
  welcomeClaimedAt: ts('welcome_claimed_at'),
  welcomeError: text('welcome_error'),
  ghlContactId: text('ghl_contact_id'),
  ghlSyncedAt: ts('ghl_synced_at'),
  ghlAttempts: integer('ghl_attempts').notNull().default(0),
  ghlNextAttemptAt: ts('ghl_next_attempt_at'),
  ghlError: text('ghl_error'),
  ghlSyncStamp: text('ghl_sync_stamp'),
  ghlLastAttemptAt: ts('ghl_last_attempt_at'),
  week0Status: text('week0_status'),
  week0SentAt: ts('week0_sent_at'),
  week0ClaimedAt: ts('week0_claimed_at'),
  week0Error: text('week0_error'),
}, (t) => [
  primaryKey({ columns: [t.userId, t.cohortId] }),
  check('cohort_enrollments_status', sql`${t.welcomeStatus} is null or ${t.welcomeStatus} in ('claimed', 'sent', 'failed', 'skipped')`),
  check('cohort_enrollments_week0_status', sql`${t.week0Status} is null or ${t.week0Status} in ('claimed', 'sent', 'failed', 'skipped')`),
]);

// A plan an account holds (D-078). `paid_through` is what the access rule compares with a skill's
// `released_at` ("cancel and keep"); `live_until` ends office hours, builds and coaching;
// `minimum_until` is the agent plan's 3-month minimum. One plan per order, so provisioning the same
// order twice finds the plan it made the first time.
export const plans = pgTable('plans', {
  id: text('id').primaryKey(), accountId: text('account_id').notNull(), kind: text('kind').notNull(),
  option: text('option').notNull(), seats: integer('seats').notNull(), cohortId: text('cohort_id'), status: text('status').notNull(),
  startsAt: ts('starts_at').notNull(), paidThrough: ts('paid_through'), liveUntil: ts('live_until'), minimumUntil: ts('minimum_until'),
  stripeSubscriptionId: text('stripe_subscription_id'), orderId: text('order_id').notNull(), createdAt: ts('created_at').notNull(),
}, (t) => [
  uniqueIndex('plans_order_idx').on(t.orderId),
  check('plans_kind', sql`${t.kind} in ('library', 'cohort', 'agents', 'membership', 'agent_plan', 'insiders_agent')`),
  check('plans_status', sql`${t.status} in ('trialing', 'active', 'past_due', 'canceled', 'ended')`),
]);

// The skill library (D-079). One row per skill, keyed by its slug. `sets` is which plans open it;
// `free` skills open for everyone; `released_at` is the date "cancel and keep" compares with a plan's
// `paid_through`. `files` holds bucket keys, never URLs: a download is a short-lived link minted per
// request after `canOpenSkill` says yes (D-024's pattern).
export const skills = pgTable('skills', {
  id: text('id').primaryKey(), title: text('title').notNull(), summary: text('summary').notNull().default(''),
  sets: text('sets').notNull(), free: boolean('free').notNull().default(false),
  releasedAt: ts('released_at').notNull(),
  files: jsonb('files').$type<{ claude?: string; chatgpt?: string; practice?: string; grok?: string }>().notNull().default({}),
  status: text('status').notNull().default('published'),
}, (t) => [
  check('skills_sets', sql`${t.sets} in ('owner_ops', 'agent', 'both')`),
  check('skills_status', sql`${t.status} in ('draft', 'published', 'hidden')`),
]);

// A skill bought on its own (Connor, 2026-11-23): $37 once, for this user, for as long as it is not
// refunded. Not an order and not a plan, so it is not provisioned and it is not credited toward
// Amplified Insiders. `user_id` is the buyer (a learner may have no account yet). `account_id` is
// their team's account when they have one, for the ledger, and does not grant the skill to the team.
// `order_id` is reserved and stays null: skill purchases are not rows in `orders`.
export const skillPurchases = pgTable('skill_purchases', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  accountId: text('account_id'),
  skillId: text('skill_id').notNull(),
  orderId: text('order_id'),
  stripeSessionId: text('stripe_session_id').notNull(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  amount: integer('amount'),
  purchasedAt: ts('purchased_at').notNull(),
  refundedAt: ts('refunded_at'),
  // Set when the buyer has no account yet. Sign-in claims the row onto that email's user.
  email: text('email'),
  ghlContactId: text('ghl_contact_id'),
  ghlSyncedAt: ts('ghl_synced_at'),
  ghlAttempts: integer('ghl_attempts').notNull().default(0),
  ghlNextAttemptAt: ts('ghl_next_attempt_at'),
  ghlError: text('ghl_error'),
  ghlSyncStamp: text('ghl_sync_stamp'),
  ghlLastAttemptAt: ts('ghl_last_attempt_at'),
  // H-1: the account this checkout's guest purchase created, when it created one, and when the guest
  // return after Stripe signed that account in. The return signs in only the account its own checkout
  // made, and only once (migration 0040; both null on every row written before it).
  createdUserId: text('created_user_id'),
  guestEnteredAt: ts('guest_entered_at'),
}, (t) => [
  uniqueIndex('skill_purchases_session_idx').on(t.stripeSessionId),
  uniqueIndex('skill_purchases_user_skill_idx').on(t.userId, t.skillId),
  index('skill_purchases_payment_intent_idx').on(t.stripePaymentIntentId),
  uniqueIndex('skill_purchases_email_skill_idx').on(t.email, t.skillId).where(sql`${t.userId} is null`),
]);

// Access groups (D-148): people who hold a plan's entitlement at no charge, by their VERIFIED email
// address: everyone whose address is at `email_domain` (an exact match, never a subdomain), and anyone
// listed in `access_group_members`. Not paid seats and not Stripe customers: no account, order or
// plan row is written for them. The grant is worked out on every request (`billing/access-groups.ts`),
// so taking a domain off a group, or an address off its list, takes the access away at once. `plan`
// is the kind whose sets the group opens, through the same access rule as a bought plan, so a skill
// released later opens for the group with no other change. `expires_at` null: no end.
export const accessGroups = pgTable('access_groups', {
  id: text('id').primaryKey(), name: text('name').notNull(), plan: text('plan').notNull(),
  emailDomain: text('email_domain'), expiresAt: ts('expires_at'), createdAt: ts('created_at').notNull(),
}, (t) => [
  check('access_groups_plan', sql`${t.plan} in ('library', 'cohort', 'agents', 'membership', 'agent_plan', 'insiders_agent')`),
  check('access_groups_domain', sql`${t.emailDomain} is null or ${t.emailDomain} = lower(trim(${t.emailDomain}))`),
]);

// A group's listed addresses (D-148), lower-cased and trimmed. Personal data: loaded into the database,
// never committed.
export const accessGroupMembers = pgTable('access_group_members', {
  groupId: text('group_id').notNull().references(() => accessGroups.id, { onDelete: 'cascade' }),
  email: text('email').notNull(), name: text('name').notNull().default(''), addedAt: ts('added_at').notNull(),
}, (t) => [
  primaryKey({ columns: [t.groupId, t.email] }),
  check('access_group_members_email', sql`${t.email} = lower(trim(${t.email}))`),
]);

// An address its owner has proven they read (D-148): written when a link emailed to it is spent
// (`claimToken`: a sign-in link, an invite, a set or reset password link), keeping the first time.
// An access group grants only to a verified address, so typing someone else's address proves nothing.
export const emailVerifications = pgTable('email_verifications', {
  email: text('email').primaryKey(), verifiedAt: ts('verified_at').notNull(),
});

// ================================================================================================
// THE ADMIN CONSOLE'S AUDIT LOG (D-157, spec § 7.8)
// ================================================================================================
// One row per Console write and per staff member refused by a Console route, kept forever (D6).
// Append-only, and the database says so: migration 0015 adds a trigger that raises on any UPDATE or
// DELETE statement against this table, whoever runs it. TRUNCATE is not covered, because the test
// harness empties every table between tests with it (`test/helpers.ts`); only the database's owner
// can run it in production, and the same owner could drop the trigger anyway.
//
// Not part of a `Db` and not in the snapshot codec, like `orders`: no snapshot write can touch it,
// and no learner or staff snapshot carries it. `apps/api/src/console/audit.ts` is the only writer.
//
// `id` is a bigserial so the order rows were written in is the order they are listed in, and a page's
// cursor is simply the last id it showed. `at` is `clock.now()`, epoch ms like every instant here.
// `before` and `after` are what `redactAuditPayload` leaves: no secret, token or key, and 2 KB at
// most. `ip` and `user_agent` (300 characters at most) are the request's; Support is never sent them.
// `actor_role` is the staff role at the time, so a later role change does not rewrite history.
export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  at: ts('at').notNull(),
  actorUserId: text('actor_user_id'), actorRole: text('actor_role'), actorSource: text('actor_source').notNull(),
  masqueradeSessionId: text('masquerade_session_id'),
  action: text('action').notNull(),
  targetType: text('target_type'), targetId: text('target_id'), targetLabel: text('target_label'),
  reason: text('reason'),
  before: jsonb('before'), after: jsonb('after'),
  outcome: text('outcome').notNull(),
  ip: text('ip'), userAgent: text('user_agent'), requestId: text('request_id'),
}, (t) => [
  index('audit_log_at_idx').on(t.at),
  index('audit_log_actor_idx').on(t.actorUserId),
  index('audit_log_action_idx').on(t.action),
  index('audit_log_target_idx').on(t.targetType, t.targetId),
  // The closed lists in `@ai/core/console` (AUDIT_OUTCOMES, AUDIT_ACTOR_SOURCES), typed out because
  // drizzle-kit reads this file on its own. The action list grows with each Console PR, so it is
  // checked by the writer rather than here, where every new action would need a migration.
  check('audit_log_outcome', sql`${t.outcome} in ('ok', 'denied', 'blocked', 'failed')`),
  check('audit_log_actor_source', sql`${t.actorSource} in ('staff', 'system')`),
  // A staff row names its staff member; only the system acts without one.
  check('audit_log_staff_actor', sql`${t.actorSource} = 'system' or ${t.actorUserId} is not null`),
]);

// D-160 R2-3b (Connor, Nov 16, 2026, 8:27 AM MST): the Owner's changes to the Roles & Permissions
// matrix. `CONSOLE_CAPS` (@ai/core) stays the ceiling in code; a row here only takes a matrix row from
// Admin or Support (`allowed` false) or records that it was given back (true), with who and when. A
// role's effective capability is the ceiling AND NOT removed (`consoleCanWith`), so an empty table is
// the ceiling exactly and no row can lift a role past it. Not a `Db` record, like `audit_log`; every
// change also writes one `permission.change` audit row, in the same transaction. Not the `permissions`
// table, which round-trips the app's `Db` and backs `/admin/staff`'s `PermKey` matrix.
export const consoleRoleGrants = pgTable('console_role_grants', {
  role: text('role').notNull(),
  capability: text('capability').notNull(),
  allowed: boolean('allowed').notNull(),
  updatedBy: text('updated_by').notNull(),
  updatedAt: ts('updated_at').notNull(),
}, (t) => [
  primaryKey({ columns: [t.role, t.capability] }),
  // `EDITABLE_ROLES` and `ROLE_ROW_KEYS` in `@ai/core/console`, typed out because drizzle-kit reads
  // this file on its own; `schema.test.ts` pins them to the constants.
  check('console_role_grants_role', sql`${t.role} in ('Admin', 'Support')`),
  check('console_role_grants_capability', sql`${t.capability} in ('build', 'masq', 'account', 'billview', 'refund', 'jobs', 'export', 'ops', 'staff')`),
]);

// ================================================================================================
// THE ADMIN CONSOLE'S STAFF NOTES (D-158, spec § 7.3)
// ================================================================================================
// Staff's own notes on a workspace (a `teams` row) or a user: internal, never shown to the workspace
// or the user, and never in any snapshot (not part of a `Db` and not in the codec, like `audit_log`;
// `test/console-support.test.ts` reads `/api/snapshot` to prove it).
//
// Immutable once written, and the database says so: migration 0017's trigger refuses any DELETE, and
// any UPDATE but the one that soft-deletes a note, which only sets `deleted_at`, `deleted_by` and
// `delete_reason`, once (an Owner, with a reason: spec § 7.3). The body, its author, its target and
// its time never change. TRUNCATE is not covered, as on `audit_log`: the test harness empties every
// table with it, and only the database owner can run it.
//
// `id` is a bigserial, so notes list in the order they were written. `created_at` and `deleted_at`
// are `clock.now()`, epoch ms. A note's audit row records its length only, never its words.
export const staffNotes = pgTable('staff_notes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  targetType: text('target_type').notNull(), targetId: text('target_id').notNull(),
  authorUserId: text('author_user_id').notNull(),
  body: text('body').notNull(),
  createdAt: ts('created_at').notNull(),
  deletedAt: ts('deleted_at'), deletedBy: text('deleted_by'), deleteReason: text('delete_reason'),
}, (t) => [
  index('staff_notes_target_idx').on(t.targetType, t.targetId),
  check('staff_notes_target_type', sql`${t.targetType} in ('workspace', 'user')`),
  check('staff_notes_body', sql`char_length(${t.body}) between 1 and 2000`),
  // A deletion is all three or none: when, by whom, and why (10 to 500 characters).
  check('staff_notes_deleted', sql`(${t.deletedAt} is null and ${t.deletedBy} is null and ${t.deleteReason} is null) or (${t.deletedAt} is not null and ${t.deletedBy} is not null and char_length(${t.deleteReason}) between 10 and 500)`),
]);

// ================================================================================================
// THE ADMIN CONSOLE'S MASQUERADE SESSIONS (D-162, spec § 6)
// ================================================================================================
// One row per masquerade: an Owner or Admin seeing the LMS as one learner, look-only, for 15 minutes
// at a time (+15 per Extend, never past 60). `auth_session_id` is the impersonation session the row
// minted (`auth_sessions.impersonating` holds the staff member's id); `staff_auth_session_id` is the
// staff member's own session, which Exit puts back and which never leaves the server.
//
// One live row per staff member, and the database says so: a partial unique index on `staff_user_id`
// where `ended_at` is null. `reason` is the latest one given (Start's, then each Extend's); every one
// is also in its audit row. Times are `clock.now()`, epoch ms. Not part of a `Db`, never in a snapshot.
export const masqueradeSessions = pgTable('masquerade_sessions', {
  id: text('id').primaryKey(),
  staffUserId: text('staff_user_id').notNull(), targetUserId: text('target_user_id').notNull(),
  reason: text('reason').notNull(),
  startedAt: ts('started_at').notNull(), expiresAt: ts('expires_at').notNull(), hardExpiresAt: ts('hard_expires_at').notNull(),
  extendCount: integer('extend_count').notNull().default(0),
  endedAt: ts('ended_at'), endReason: text('end_reason'),
  authSessionId: text('auth_session_id').notNull(), staffAuthSessionId: text('staff_auth_session_id').notNull(),
  startedFrom: text('started_from'),
  ip: text('ip'), userAgent: text('user_agent'),
}, (t) => [
  uniqueIndex('masquerade_sessions_one_live_idx').on(t.staffUserId).where(sql`${t.endedAt} is null`),
  check('masquerade_sessions_reason', sql`char_length(${t.reason}) between 10 and 500`),
  check('masquerade_sessions_not_self', sql`${t.staffUserId} <> ${t.targetUserId}`),
  // An ended row says why, with one of the closed list's reasons (`MASQUERADE_END_REASONS`); a live one says nothing.
  check('masquerade_sessions_end_reason', sql`(${t.endedAt} is null and ${t.endReason} is null) or (${t.endedAt} is not null and ${t.endReason} in ('exit', 'expired', 'signed_out', 'revoked'))`),
  check('masquerade_sessions_expiry', sql`${t.expiresAt} <= ${t.hardExpiresAt}`),
]);

// ================================================================================================
// THE ADMIN CONSOLE'S OPS TELEMETRY (D-165, spec §§ 7.9-7.10)
// ================================================================================================
// Two observe-only tables. Neither is part of a `Db` or a snapshot, and nothing reads them but the
// Console's API & Webhooks and Scheduled Jobs screens.
//
// `api_metrics`: one row per minute and route TEMPLATE (`GET /api/sessions/:id/join`, never a raw URL,
// so no id, token or email is ever a key). `lib/api-metrics.ts` counts answers in memory and adds each
// minute's counts here once a minute; two replicas add to the same row. `hist` is the minute's
// latencies per bucket (`API_METRIC_BOUNDS`, then `+inf`), not cumulative. Kept 30 days (D6).
//
// `job_ticks`: one row per run of a scheduled loop, written by `jobs/ticks.ts`'s `recordTick` around the
// existing call: `running` when it starts, then `succeeded`, `failed` (with a short `error_kind`, never
// a message) or `skipped` (the scheduler lock was another runner's). `trigger` is `schedule`, or
// `manual` for Run Now, which names the staff member. Kept 90 days (D6). Times are epoch ms.
export const apiMetrics = pgTable('api_metrics', {
  minute: ts('minute').notNull(),
  route: text('route').notNull(),
  count: integer('count').notNull(),
  errors4xx: integer('errors_4xx').notNull(),
  errors5xx: integer('errors_5xx').notNull(),
  hist: jsonb('hist').$type<Record<string, number>>().notNull(),
}, (t) => [
  primaryKey({ columns: [t.minute, t.route] }),
  check('api_metrics_counts', sql`${t.count} >= 0 and ${t.errors4xx} >= 0 and ${t.errors5xx} >= 0 and ${t.errors4xx} + ${t.errors5xx} <= ${t.count}`),
]);

export const jobTicks = pgTable('job_ticks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  job: text('job').notNull(),
  startedAt: ts('started_at').notNull(),
  finishedAt: ts('finished_at'),
  status: text('status').notNull(),
  errorKind: text('error_kind'),
  trigger: text('trigger').notNull(),
  actorUserId: text('actor_user_id'),
}, (t) => [
  index('job_ticks_job_started_idx').on(t.job, t.startedAt),
  index('job_ticks_started_idx').on(t.startedAt),
  // The closed lists in `@ai/core/console-ops` (`JOB_TICK_STATUSES`, `JobTrigger`), typed out because
  // drizzle-kit reads this file on its own.
  check('job_ticks_status', sql`${t.status} in ('running', 'succeeded', 'failed', 'skipped')`),
  check('job_ticks_trigger', sql`${t.trigger} in ('schedule', 'manual')`),
  // A manual run names who started it; a scheduled one names nobody.
  check('job_ticks_actor', sql`(${t.trigger} = 'manual') = (${t.actorUserId} is not null)`),
  // Running has no end; anything else has one.
  check('job_ticks_finished', sql`(${t.status} = 'running') = (${t.finishedAt} is null)`),
]);

// ================================================================================================
// THE ADMIN CONSOLE'S EMAIL LOG AND USAGE COUNTS (D-166, spec §§ 7.7, 7.15)
// ================================================================================================
// `email_log`: one row per `send()` (email/transport.ts), written after it by `email/log.ts`, fire and
// forget: a failed write never throws and never changes the send. The recipient, the template, the
// subject, the provider and its message id, and what happened (`sent`, `failed`, `skipped`), with a
// failure's kind, never its words. NEVER THE BODY: there is no column for one. `user_id` is the user
// whose address it went to when one existed at the time, with no foreign key, so a send inside a
// transaction that is still creating that user can never wait on it. Pruned after 180 days (D6).
//
// D-263: what Resend's webhook reports about a sent row, all nullable with no default (D-173), so a
// row from before reads back as it did. Never written one event at a time: `email/resend-webhook.ts`
// writes the whole set from `foldResendEvents` over the email's `resend_events`, matched on
// `provider_id`. A null count is 0. `delivery_status` is the badge's state (`DELIVERY_STATES`), null
// until the first event.
export const emailLog = pgTable('email_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  at: ts('at').notNull(),
  to: text('to').notNull(),
  userId: text('user_id'),
  template: text('template').notNull(),
  subject: text('subject').notNull(),
  provider: text('provider').notNull(),
  providerId: text('provider_id'),
  status: text('status').notNull(),
  errorKind: text('error_kind'),
  deliveryStatus: text('delivery_status'),
  deliveredAt: ts('delivered_at'),
  delayedAt: ts('delayed_at'),
  bouncedAt: ts('bounced_at'),
  bounceType: text('bounce_type'),
  bounceSubType: text('bounce_sub_type'),
  bounceMessage: text('bounce_message'),
  complainedAt: ts('complained_at'),
  openCount: integer('open_count'),
  openedFirstAt: ts('opened_first_at'),
  openedLastAt: ts('opened_last_at'),
  clickCount: integer('click_count'),
  clickedFirstAt: ts('clicked_first_at'),
  clickedLastAt: ts('clicked_last_at'),
  clickedLink: text('clicked_link'),
}, (t) => [
  index('email_log_at_idx').on(t.at),
  index('email_log_user_idx').on(t.userId),
  index('email_log_template_idx').on(t.template),
  // D-263: a webhook event finds its row by Resend's id.
  index('email_log_provider_id_idx').on(t.providerId),
  // `DELIVERY_STATES` in `@ai/core`, typed out because drizzle-kit reads this file on its own.
  check('email_log_delivery_status', sql`${t.deliveryStatus} is null or ${t.deliveryStatus} in ('sent', 'delivered', 'delayed', 'bounced', 'complained')`),
  // The closed lists in `@ai/core` (EMAIL_STATUSES, EMAIL_PROVIDERS, EMAIL_ERROR_KINDS), typed out
  // because drizzle-kit reads this file on its own.
  check('email_log_status', sql`${t.status} in ('sent', 'failed', 'skipped')`),
  check('email_log_provider', sql`${t.provider} in ('resend', 'outbox', 'log')`),
  // A failure names its kind; nothing else has one.
  check('email_log_error_kind', sql`(${t.status} = 'failed' and ${t.errorKind} in ('invalid_recipient', 'subject', 'render', 'config', 'provider')) or (${t.status} <> 'failed' and ${t.errorKind} is null)`),
]);

// `resend_events` (D-263): every Resend webhook event the email log records, once. `id` is the webhook
// message id (`svix-id`), the same on every retry, so a redelivery inserts nothing and changes nothing.
// `email_id` is Resend's id for the email, which `email_log.provider_id` holds; an event that arrives
// before its row is kept here and folded in when the row is written. Only what the fold reads is kept:
// the type, when it happened, a bounce's details and a click's link. Never the recipient, subject,
// sender, IP address or user agent. Pruned with the email log, after 180 days (D6).
export const resendEvents = pgTable('resend_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  emailId: text('email_id').notNull(),
  occurredAt: ts('occurred_at').notNull(),
  receivedAt: ts('received_at').notNull(),
  bounceType: text('bounce_type'),
  bounceSubType: text('bounce_sub_type'),
  bounceMessage: text('bounce_message'),
  link: text('link'),
}, (t) => [
  index('resend_events_email_idx').on(t.emailId),
  index('resend_events_received_idx').on(t.receivedAt),
  // `RESEND_EVENT_TYPES` in `@ai/core`, typed out because drizzle-kit reads this file on its own.
  check('resend_events_type', sql`${t.type} in ('email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced', 'email.complained', 'email.opened', 'email.clicked')`),
]);

// `usage_daily`: how often each learner signed in, viewed a guided setup and joined a live session,
// per program-zone day (America/Chicago). One fire-and-forget upsert per event (`lib/usage.ts`),
// skipped during a masquerade (spec § 6). `team_id` is the learner's team when it was counted. Pruned
// after 400 days (D6). `lesson_play` is a kind with nothing counting it yet (D-166).
export const usageDaily = pgTable('usage_daily', {
  day: text('day').notNull(),
  userId: text('user_id').notNull(),
  teamId: text('team_id'),
  kind: text('kind').notNull(),
  count: integer('count').notNull().default(1),
}, (t) => [
  primaryKey({ columns: [t.day, t.userId, t.kind] }),
  index('usage_daily_team_idx').on(t.teamId, t.day),
  check('usage_daily_day', sql`${t.day} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`),
  check('usage_daily_kind', sql`${t.kind} in ('sign_in', 'lesson_play', 'guide_view', 'session_join')`),
  check('usage_daily_count', sql`${t.count} > 0`),
]);

// R-5 Phase 7 (D-268): which skill a learner opened, per program-zone day (migration 0050). One fire-and-forget upsert
// per guide view beside `usage_daily`'s (`lib/usage.ts`, `recordSkillOpen`), skipped during a masquerade. People › Utah
// Life's "Most opened" reads its last 30 days. Not a `Db` record.
export const skillOpensDaily = pgTable('skill_opens_daily', {
  day: text('day').notNull(),
  userId: text('user_id').notNull(),
  skillId: text('skill_id').notNull(),
  count: integer('count').notNull().default(1),
}, (t) => [
  primaryKey({ columns: [t.day, t.userId, t.skillId] }),
  check('skill_opens_daily_day', sql`${t.day} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`),
  check('skill_opens_daily_count', sql`${t.count} > 0`),
]);

// ================================================================================================
// THE ADMIN CONSOLE'S INCIDENTS (D-167, spec § 7.14)
// ================================================================================================
// One row per incident, `INC-0001` upward (numbered under an advisory lock, `console/incidents.ts`).
// `fingerprint` names the auto-open rule that opened it (`job:ghl-orders`, `stripe:invoice.paid`,
// `ghl:gave_up`, `api:5xx`), or is null when staff opened it; while an incident is unresolved its
// fingerprint is unique, so a rule repeats on it (a `signal` event) instead of opening another. The
// `_by` columns are staff user ids, null for the system. `incident_events` is the timeline: one row
// per opening, repeat, acknowledgement, resolution and note, each written with its audit row.
export const incidents = pgTable('incidents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  severity: text('severity').notNull(),
  status: text('status').notNull(),
  fingerprint: text('fingerprint'),
  openedAt: ts('opened_at').notNull(), openedBy: text('opened_by'),
  acknowledgedAt: ts('acknowledged_at'), acknowledgedBy: text('acknowledged_by'),
  resolvedAt: ts('resolved_at'), resolvedBy: text('resolved_by'),
}, (t) => [
  uniqueIndex('incidents_fingerprint_unresolved_idx').on(t.fingerprint).where(sql`${t.status} <> 'resolved'`),
  index('incidents_status_idx').on(t.status),
  // The closed lists in `@ai/core/console-incidents` (INCIDENT_SEVERITIES, INCIDENT_STATUSES).
  check('incidents_severity', sql`${t.severity} in ('sev1', 'sev2', 'sev3')`),
  check('incidents_status', sql`${t.status} in ('open', 'acknowledged', 'resolved')`),
  check('incidents_title', sql`char_length(${t.title}) between 3 and 200`),
  // An acknowledged or resolved incident says when; an open one has neither.
  check('incidents_resolved', sql`(${t.status} = 'resolved') = (${t.resolvedAt} is not null)`),
  check('incidents_acknowledged', sql`${t.status} <> 'acknowledged' or ${t.acknowledgedAt} is not null`),
]);

export const incidentEvents = pgTable('incident_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  incidentId: text('incident_id').notNull(),
  at: ts('at').notNull(),
  kind: text('kind').notNull(),
  actorUserId: text('actor_user_id'),
  body: text('body'),
  link: text('link'),
}, (t) => [
  index('incident_events_incident_idx').on(t.incidentId, t.at),
  check('incident_events_kind', sql`${t.kind} in ('opened', 'signal', 'acknowledged', 'resolved', 'note')`),
  check('incident_events_body', sql`${t.body} is null or char_length(${t.body}) between 1 and 2000`),
]);

// ================================================================================================
// THE ADMIN CONSOLE'S FLAGS (D-168, spec § 7.13, D8, D10)
// ================================================================================================
// The flags the Console owns: one row per key in `CONSOLE_FLAGS` (@ai/core), a closed list the CHECK
// repeats, so a key the code doesn't know can't be stored. `masquerade_enabled` (on, sensitive) is
// seeded by migration 0022. `cohort_welcome_email` has no row until a flip, so it stays off. A missing
// row reads as the flag's default. Env switches are
// not here: they stay in Railway and the Console only reads them (D10). Every flip is one audit row
// (`flag.flip`, before and after). `updated_at` is `clock.now()`, epoch ms; `updated_by` the staff
// member's id. Not part of a `Db`, never in a snapshot.
export const consoleFlags = pgTable('console_flags', {
  key: text('key').primaryKey(),
  on: boolean('on').notNull(),
  sensitive: boolean('sensitive').notNull(),
  updatedAt: ts('updated_at'),
  updatedBy: text('updated_by'),
  /**
   * When the flag was last turned on (an off-to-on flip), and null while it is off. The cohort
   * welcome reads it as the switch-on time: only an enrollment made after it may get the email.
   */
  turnedOnAt: ts('turned_on_at'),
}, (t) => [
  check('console_flags_key', sql`${t.key} in ('masquerade_enabled', 'cohort_welcome_email', 'week0_open_email')`),
]);
