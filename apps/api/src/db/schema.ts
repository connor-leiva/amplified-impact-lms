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
// Four tables are the other way round — rows with no `Db` field at all: `auth_tokens` and
// `auth_sessions` (§ 7.5), `job_runs` (§ 8.5, the scheduler's idempotence ledger) and
// `ai101_waitlist` (the public /ai101 page's sign-ups, DECISIONS.md D-028).
import { pgTable, text, integer, boolean, timestamp, jsonb, primaryKey, pgEnum, bigint, uniqueIndex, check } from 'drizzle-orm/pg-core';
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
  prefs: jsonb('prefs').$type<{ tz?: string | null; theme?: 'light' | 'dark' }>().default({}),
  seq: integer('seq').notNull().default(0),
});
export const teams = pgTable('teams', { id: text('id').primaryKey(), name: text('name').notNull(), ownerId: text('owner_id').notNull(), seats: integer('seats').notNull().default(7), seq: integer('seq').notNull().default(0) });
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
export const resources = pgTable('resources', { id: text('id').primaryKey(), title: text('title').notNull(), desc: text('desc').notNull(), cat: text('cat').notNull(), type: text('type').notNull(), tier: tier('tier').notNull(), size: text('size').notNull(), dl: integer('dl').notNull().default(0), updated: ts('updated').notNull(), exec: boolean('exec').notNull(), status: text('status').notNull(), storageKey: text('storage_key'), seq: integer('seq').notNull().default(0) });
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
// THE OFFER: ORDERS, STRIPE EVENTS, ACCOUNTS, PLANS AND SKILLS (D-074, D-078, D-079)
// ================================================================================================
// Billing state, kept out of the prototype's `Db` exactly as the waitlist and the auth tables are:
// none of these is in the snapshot codec, so a snapshot write can never touch them and Gate 7's
// oracle and the parity suites cannot move. Teams and people (the `users` and `teams` rows an
// account points at) are still written through `@ai/core`, by provisioning (billing/provision.ts).
//
// Every instant is epoch ms (`ts()`), for the waitlist's reason: `clock.now()` is the number written,
// and the access rule (`canOpenSkill`, billing/access.ts) compares them as plain numbers. The enum-ish
// columns are text with a CHECK, typed out here because drizzle-kit reads this file on its own;
// billing/catalog.ts holds the same lists and `test/offer-schema.test.ts` holds the two equal.

// One row per purchase attempt: from the offer page (`origin` = 'offer', created before Stripe is
// called) or from a fallback Payment Link (`origin` = 'payment_link', created by the webhook). Only
// the webhook moves `status` past 'pending' (D-074). The buyer's details, the consent proof and the
// attribution are the order's own; the account it became is `account_id`.
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
  // When the events behind the follow-up tags happened (D-076): the GHL sync reads these.
  paidAt: ts('paid_at'), paymentFailedAt: ts('payment_failed_at'), membershipEndedAt: ts('membership_ended_at'), refundedAt: ts('refunded_at'),
  ghlContactId: text('ghl_contact_id'), ghlSyncedAt: ts('ghl_synced_at'),
  ghlAttempts: integer('ghl_attempts').notNull().default(0), ghlNextAttemptAt: ts('ghl_next_attempt_at'), ghlError: text('ghl_error'),
  accountId: text('account_id'),
  createdAt: ts('created_at').notNull(),
}, (t) => [
  uniqueIndex('orders_stripe_session_idx').on(t.stripeSessionId),
  check('orders_plan', sql`${t.plan} in ('library', 'cohort', 'agents')`),
  check('orders_option', sql`${t.option} in ('full', 'two_pay', 'upfront', 'upto15', '16to40')`),
  check('orders_origin', sql`${t.origin} in ('offer', 'payment_link')`),
  check('orders_status', sql`${t.status} in ('pending', 'paid', 'trialing', 'expired', 'failed', 'refunded')`),
  check('orders_crm', sql`${t.crm} is null or ${t.crm} in ('follow_up_boss', 'other')`),
  // The waitlist's rule (D-034): a "yes" to texts needs the number, the time and the words.
  check('orders_sms_consent_proof', sql`not ${t.smsConsent} or (${t.phone} is not null and ${t.smsConsentAt} is not null and ${t.smsConsentText} is not null)`),
  // The same for a renewal: a time with no words is not proof of what was agreed to.
  check('orders_renewal_consent_proof', sql`(${t.renewalConsentAt} is null) = (${t.renewalConsentText} is null)`),
]);

// One row per Stripe event (D-074). Inserted before anything else happens, keyed by Stripe's own id,
// so a redelivered event that was already processed is skipped. `error` holds a short reason for an
// event that failed and will be retried by Stripe, never a payload.
export const stripeEvents = pgTable('stripe_events', {
  id: text('id').primaryKey(), type: text('type').notNull(),
  receivedAt: ts('received_at').notNull(), processedAt: ts('processed_at'), error: text('error'),
});

// The buying team (D-077): one platform team with the buyer as its Team Owner. Found by the owner's
// email (lower-cased), so a library buyer who later buys the cohort keeps one account and one login.
// `invite_sent_at` is null until the owner's invite has gone out: invites made before
// `INVITES_FROM` wait for it (Mon, Nov 16), so they arrive with the welcome email.
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(), teamId: text('team_id').notNull(), ownerUserId: text('owner_user_id').notNull(),
  ownerEmail: text('owner_email').notNull(), name: text('name').notNull(), crm: text('crm'),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: ts('created_at').notNull(), inviteSentAt: ts('invite_sent_at'),
}, (t) => [uniqueIndex('accounts_owner_email_idx').on(t.ownerEmail)]);

// A plan an account holds (D-077). `paid_through` is what the access rule compares with a skill's
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
  check('plans_kind', sql`${t.kind} in ('library', 'cohort', 'agents')`),
  check('plans_status', sql`${t.status} in ('trialing', 'active', 'past_due', 'canceled', 'ended')`),
]);

// The skill library (D-078). One row per skill, keyed by its slug. `sets` is which plans open it;
// `free` skills open for everyone; `released_at` is the date "cancel and keep" compares with a plan's
// `paid_through`. `files` holds bucket keys, never URLs: a download is a short-lived link minted per
// request after `canOpenSkill` says yes (D-024's pattern).
export const skills = pgTable('skills', {
  id: text('id').primaryKey(), title: text('title').notNull(), summary: text('summary').notNull().default(''),
  sets: text('sets').notNull(), free: boolean('free').notNull().default(false),
  releasedAt: ts('released_at').notNull(),
  files: jsonb('files').$type<{ claude?: string; chatgpt?: string; practice?: string }>().notNull().default({}),
  status: text('status').notNull().default('published'),
}, (t) => [
  check('skills_sets', sql`${t.sets} in ('owner_ops', 'agent', 'both')`),
  check('skills_status', sql`${t.status} in ('draft', 'published', 'hidden')`),
]);
