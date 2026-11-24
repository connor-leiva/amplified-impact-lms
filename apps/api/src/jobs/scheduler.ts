// The scheduler shell — phase 08 § 8.5.
//
// § 8.5 gives the shape almost literally:
//
//   export function startScheduler() {
//     setInterval(async () => {
//       await db.transaction(async (tx) => {
//         const [{ locked }] = await tx.execute(sql`select pg_try_advisory_xact_lock(4242) as locked`);
//         if (!locked) return;
//         const now = clock.now();
//         await runDue(tx, now, [sessionReminders, replayReady, buildNotFinished48h, weeklyDigest, scheduledAnnouncements]);
//       });
//     }, 60_000);
//   }
//
// This file is that function, and NOTHING ELSE. The five jobs in § 8.5's array do not appear here:
// `jobs/due.ts` already is them, lifted into one pure `dueWork(db, now, alreadySent, zones)` whose
// `TOGGLE` map is total over `JobName`, so a sixth job cannot be added without declaring which
// Automated Reminders switch gates it. There is therefore no job-array parameter to pass — the list
// is not a thing a caller should be able to get wrong, and `due.test.ts` has 60-odd assertions
// riding on it. What is left for a shell to do is exactly five things, all of them effects:
//
//   1. the 60-second loop, and stopping it on SIGTERM
//   2. `pg_try_advisory_xact_lock(4242)`, so one replica executes jobs
//   3. reading the `job_runs` ledger into `alreadySent`, and `users.prefs.tz` into `zones`
//   4. writing the ledger rows and dispatching the mail
//   5. applying the scheduled-announcement flips
//
// ================================================================================================
// THE ONE DECISION THIS FILE CANNOT AVOID: LEDGER FIRST, MAIL SECOND
// ================================================================================================
// § 8.5: "Every job is idempotent. Record sends in a `job_runs(job, key, sent_at)` table with a
// unique `(job, key)`." Gate 8: "The scheduler at 2026-12-08T13:00 CT sends `session-24h` for
// Session 3 to each eligible learner once. Running it twice sends nothing new."
//
// A ledger and a mail server are two systems with no shared transaction, so the two orderings have
// two different failure modes and there is no third option. Pretending otherwise is the bug:
//
//   MAIL FIRST, then the row     a crash in between RE-SENDS on the next tick
//   ROW FIRST, then the mail     a crash in between LOSES that mail, silently
//
// THIS FILE WRITES THE ROW FIRST, inside the transaction, and mails after the commit. Four reasons,
// in the order they matter:
//
//   1. MAIL-FIRST DOES NOT FAIL ONCE, IT FAILS IN A LOOP. The interesting crash is not a cosmic ray
//      between two statements — it is a ledger write that keeps failing (a connection the Railway
//      proxy dropped, a disk-full, a `jobKey` throw on one malformed row aborting the transaction
//      after the mail went out). Mail-first then recomputes the same candidates on the next tick
//      and mails all fourteen again, every 60 seconds, for as long as the window stays open — and
//      § 8.5's windows are open-ended BY DESIGN, up to `GRACE` (a day) or forever for an
//      announcement. One database fault becomes thousands of emails and a blocked sending domain.
//      Row-first turns the same fault into zero emails and one loud error per tick. One of those
//      two is recoverable by a human reading a log; the other is recoverable by nobody.
//   2. NEITHER ORDERING BUYS EXACTLY-ONCE, SO THE QUESTION IS ONLY WHICH WAY TO LEAN. Resend
//      accepting a message is not delivery, and this process never learns whether a mailbox got it.
//      "The ledger records that we sent it" is an approximation under both orderings; ordering picks
//      the direction of the error, not its existence.
//   3. THE LOST MAIL IS A REMINDER, AND THE WINDOW IS THE ONE WE CONTROL. These are the five
//      Automated Reminders, not a password reset (§ 7.5 is a magic link, and a learner who never
//      receives one asks for another). A learner who misses one `session-24h` because the process
//      died in the gap is inconvenienced; a learner who gets fourteen is a support ticket and a
//      spam complaint. The gap itself is also bounded and visible: `queueMailTask` below puts the
//      dispatch into the same drain `shutdown()` already awaits, so an ORDERLY redeploy — which is
//      what Railway does, and the only shutdown this process can anticipate — does not lose it.
//   4. MAIL-FIRST WOULD HOLD THE LOCK ACROSS AN EXTERNAL API. To write the row after the send and
//      still have them in one transaction, the `await send(...)` has to happen inside
//      `db.transaction`, i.e. while holding `pg_try_advisory_xact_lock(4242)` and one of five
//      pooled connections, for the duration of fourteen round trips to Resend. A provider timeout
//      would then decide how long every other replica is locked out.
//
// The ledger write is also the dispatch GATE, not merely a record of it: `recordSends` inserts with
// `on conflict do nothing ... returning key`, and only the keys Postgres says it actually inserted
// are mailed. So the unique `(job, key)` — not this process's earlier read of it — is what decides
// who gets an email, and two runners that somehow both got past the advisory lock still cannot
// double-send.
//
// MEASURED, and worth stating because it inverts what the code looks like it is doing: the
// `keysAlreadyIn` read is an OPTIMIZATION, not the correctness mechanism. Replacing `alreadySent`
// with `NO_KEYS` — i.e. deleting the read entirely — changes not one observable send: the second
// tick still records nothing and still mails nobody, because `on conflict do nothing` absorbs all
// fourteen redundant inserts and `returning` reports none of them. What the read buys is that the
// steady state does not fire fourteen doomed inserts a minute, and the way the suite detects its
// absence is the `recorded.size !== sends.length` warning below, not the outbox. Removing the
// `returning` gate on its own is likewise invisible; removing BOTH is what produces Gate 8's
// failure, fourteen duplicate emails per tick. Two independent defences, in that order.
//
// ------------------------------------------------------------------------------------------------
// WHY THE LOCK ID IS A LITERAL AND NOT A BIND PARAMETER
// ------------------------------------------------------------------------------------------------
// `sql.raw`, built once at module scope from a `const`. The id is § 8.5's compile-time constant,
// there is no input to inject, and § 7.3's own `pg_advisory_xact_lock(42)` in `routes/mutate.ts` is
// written the same way. A bound `$1` would also hand Postgres an untyped parameter to resolve
// against `pg_try_advisory_xact_lock`'s two overloads — `(bigint)` and `(int, int)` — which is an
// argument this statement does not need to have.
//
// ------------------------------------------------------------------------------------------------
// WHAT THE LOCK DOES AND DOES NOT PROTECT
// ------------------------------------------------------------------------------------------------
// 4242 answers one question: which replica runs jobs. It is NOT § 7.3's write lock (42), and this
// file deliberately does not take that one. The only snapshot state the scheduler writes is an
// announcement's `status`, and it writes it as a conditional update —
// `set status='sent' where id = … and status='scheduled'` — so it can only ever perform the one
// transition § 8.5 describes and can never clobber a status another writer set.
//
// The remaining race is in the other direction and self-heals: `routes/mutate.ts` upserts whole rows
// through `persistDiff`, so an admin editing announcement `a3` from a snapshot loaded a moment
// before the flip committed would write `status: 'scheduled'` back. The next tick flips it again —
// the announcement window is `[at, forever)` precisely so a banner that must appear eventually
// does — and the EMAIL is not re-sent, because its `job_runs` keys are already there. Net effect:
// the banner appears one tick late in a race nobody will observe. Taking 42 here as well would
// close it at the cost of blocking every mutation in the app behind a 14-round-trip `loadDb`; that
// is a trade worth a DECISIONS.md entry rather than a silent choice, and the report flags it.

import { and, eq, inArray, sql } from 'drizzle-orm';
// `queueMailTask` is `auth/mailer.ts`'s join point, and § 9.4's SIGTERM drain is why it is used
// here: `shutdown()` awaits `settleEmails()` BEFORE `app.close()` and before the pool, so a tick
// registered there finishes its mail during an orderly redeploy instead of being cut off mid-send.
// `/api/test/outbox` awaits the same function, which is the second reason — a Gate 8 assertion
// against the outbox must not race a tick that is still dispatching.
import { queueMailTask } from '../auth';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { loadDb } from '../db/io';
import type { Queryable } from '../db/io';
import { announcements, jobRuns, users } from '../db/schema';
import { send } from '../email/transport';
import type { SendRequest, TemplateName } from '../email/transport';
import { clock } from '../lib/clock';
import { NO_KEYS, dueWork } from './due';
import type { Send, ZoneLookup } from './due';
import { jobOf } from './keys';
import type { JobName } from './keys';
import { acceleratorRoster } from '../lib/course-access';
import { sweepMasquerades } from '../console/masquerade';
import { SCHEDULER_TICK_JOB, recordTick } from './ticks';
import { pruneEmailAndUsage } from './prune-logs';
import { evaluateIncidentRules } from '../console/incident-rules';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** § 8.5's advisory lock id, verbatim. One replica executes jobs. */
export const SCHEDULER_LOCK = 4242;

/** § 8.5's `60_000`. */
export const TICK_MS = 60_000;

/**
 * How many keys go into one `in (…)` or one multi-row `insert`.
 *
 * `insertSnapshot` uses 500 for the same reason and this matches it. The practical ceiling is
 * Postgres's 65535 bind parameters per statement, which a cohort could only approach if a single
 * tick owed tens of thousands of sends; chunking means that case degrades into more round trips
 * instead of a statement the driver refuses to send.
 */
const CHUNK = 500;

/** See the header on why this is `raw`. Built once, so no statement string is assembled per tick. */
const TRY_LOCK = sql.raw(`select pg_try_advisory_xact_lock(${SCHEDULER_LOCK}) as locked`);

// ---------------------------------------------------------------------------
// Seams
// ---------------------------------------------------------------------------

/**
 * What this file needs from drizzle, asked for as the builders rather than as a class.
 *
 * `io.ts`'s `Queryable` makes the same move and its header carries the argument: drizzle types the
 * pool handle and a transaction as unrelated classes with no published supertype, so a parameter
 * that names one of them cannot accept the other. `Queryable` is select/insert/delete; the ledger
 * and the flip need `update`, and the lock needs `execute`.
 */
export interface SchedulerTx extends Queryable {
  update: Database['update'];
  execute: Database['execute'];
}

/**
 * The one thing a tick needs from `client.ts`: something to open a transaction on.
 *
 * Narrower than `Database` on purpose. It is what lets `scheduler.test.ts` hand `startScheduler` a
 * handle whose `transaction()` throws, which is the only honest way to test "a job that throws must
 * not kill the loop" — the alternative is breaking a real database on purpose and hoping it breaks
 * the way the test assumed.
 */
export interface SchedulerDb {
  transaction: Database['transaction'];
}

/**
 * Where a tick's lines go.
 *
 * Structural rather than `FastifyBaseLogger`, so `server.ts` can pass `app.log` (§ 9.4's JSON logs
 * with a request id) while a test can pass a counter and nothing has to import fastify to run a
 * job. The default writes to the console, because a scheduler that silently stops is the failure
 * this whole file is arranged against.
 */
export interface SchedulerLog {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

const CONSOLE_LOG: SchedulerLog = {
  info: (obj, msg) => console.log(`[scheduler] ${msg}`, obj),
  warn: (obj, msg) => console.warn(`[scheduler] ${msg}`, obj),
  error: (obj, msg) => console.error(`[scheduler] ${msg}`, obj),
};

// ---------------------------------------------------------------------------
// What a tick reports
// ---------------------------------------------------------------------------

/**
 * One tick, in numbers a log line and a test can both read.
 *
 * `recorded` and `flipped` are the ids rather than counts because they are the two things that
 * actually changed the database, and "which fourteen keys" is the question a duplicate-email report
 * starts from.
 */
export interface SchedulerRun {
  /** False when the advisory lock was not granted: another replica owns this tick. */
  ran: boolean;
  /** The instant `dueWork` was asked about — `clock.now()`, so FIXED_NOW under test. */
  now: number;
  /** Sends `dueWork` proposed before the ledger was consulted. */
  candidates: number;
  /** Candidates already in `job_runs`. Under § 8.5's idempotence this is the steady state. */
  skipped: number;
  /** Keys this tick inserted into `job_runs`, i.e. the sends it then owed. */
  recorded: string[];
  /** Sends the transport accepted. */
  sent: number;
  /** Sends the transport refused. See the header: these are NOT retried. */
  failed: number;
  /** Announcement ids this tick moved `scheduled` → `sent`. */
  flipped: string[];
}

const DID_NOT_RUN = (now: number): SchedulerRun => ({
  ran: false,
  now,
  candidates: 0,
  skipped: 0,
  recorded: [],
  sent: 0,
  failed: 0,
  flipped: [],
});

// ---------------------------------------------------------------------------
// The four queries
// ---------------------------------------------------------------------------

/**
 * Did we get § 8.5's lock?
 *
 * Throws on anything it does not recognise rather than guessing, because both guesses are silent
 * and neither is survivable: read as "granted" when it was not, two replicas run (the ledger still
 * stops the double-send, but every tick does double the work); read as "not granted" when it was,
 * and this process never sends another email for the life of the deploy, with nothing in the log.
 * `postgres` returns a real boolean for a `bool` column today; the string arms are here so that a
 * driver or `postgres` version that starts returning `'t'` fails on the next test run instead of
 * on a quiet Tuesday.
 */
function lockGranted(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 't' || value === 'true') return true;
  if (value === 'f' || value === 'false') return false;
  throw new Error(
    `pg_try_advisory_xact_lock(${SCHEDULER_LOCK}) answered ${JSON.stringify(value)}, which is ` +
      'neither true nor false. Refusing to guess: one guess double-runs every tick and the other ' +
      'silently stops the scheduler forever.',
  );
}

/**
 * § 8.1's "the RECIPIENT's saved zone", as `dueWork`'s fourth argument.
 *
 * `select id, prefs from users` — the query `due.ts`'s header names, and the reason the argument
 * exists at all: `users.prefs` is a real jsonb column but `@ai/core`'s `Learner` has no `prefs`
 * field, so a `Db` physically cannot answer "what zone did this learner save?" (D-022's sibling
 * problem; `ZoneLookup` carries the full argument).
 *
 * `?? null` rather than leaving a learner out of the map: `null` is what the column stores for
 * "Auto" (`ZONES`'s first entry is `['', 'Auto']`) and what `whenFor` turns into § 8.1's CT
 * fallback. Both readings end in CT, but one of them says so on purpose.
 */
export async function savedZones(tx: Queryable): Promise<ZoneLookup> {
  const rows = await tx.select({ id: users.id, prefs: users.prefs }).from(users);
  const zones = new Map<string, string | null | undefined>();
  for (const row of rows) zones.set(row.id, row.prefs?.tz ?? null);
  return zones;
}

/**
 * Which of these candidates `job_runs` has already recorded — `dueWork`'s `alreadySent`.
 *
 * BY KEY LIST, not by reading the table. `job_runs` is append-only and nothing prunes it, so it
 * grows for the life of the program, while the candidate list is bounded by (open windows ×
 * eligible learners). Loading the ledger to filter fourteen keys gets slower every week for no
 * benefit.
 *
 * Grouped by job so the predicate is `(job, key)`, which is the composite PRIMARY KEY from
 * `schema.ts` and therefore index-covered. A `where key in (…)` alone is correct — `keys.ts` makes
 * every key begin with its own job name, so a key is globally unique by construction — but it
 * cannot use the leading column of that index. At most six groups, because `JOB_NAMES` has six
 * entries.
 */
export async function keysAlreadyIn(tx: Queryable, candidates: readonly Send[]): Promise<ReadonlySet<string>> {
  const byJob = new Map<JobName, string[]>();
  for (const candidate of candidates) {
    // `jobOf`, not `candidate.job`: `keys.ts` is explicit that the column is DERIVED from the key
    // so the two cannot disagree, and a row whose `job` says one thing while its `key` begins with
    // another would make the unique `(job, key)` admit two rows for the same send.
    const job = jobOf(candidate.key);
    const keys = byJob.get(job);
    if (keys) keys.push(candidate.key);
    else byJob.set(job, [candidate.key]);
  }

  const found = new Set<string>();
  for (const [job, keys] of byJob) {
    for (let i = 0; i < keys.length; i += CHUNK) {
      const rows = await tx
        .select({ key: jobRuns.key })
        .from(jobRuns)
        .where(and(eq(jobRuns.job, job), inArray(jobRuns.key, keys.slice(i, i + CHUNK))));
      for (const row of rows) found.add(row.key);
    }
  }
  return found;
}

/**
 * Claim these sends in the ledger, and report which ones this tick actually claimed.
 *
 * THE RETURN VALUE IS THE DISPATCH GATE. `on conflict do nothing ... returning key` returns only
 * the rows Postgres inserted, so a key some other writer got to first comes back missing and is
 * never mailed. That is what makes "running it twice sends nothing new" a property of the unique
 * `(job, key)` constraint rather than of this process's earlier read of it.
 *
 * Duplicate keys inside one batch are dropped here with a warning rather than handed to Postgres.
 * `dueWork` does not produce them — `due.test.ts` asserts `new Set(keys).size === sends.length` for
 * the Gate 8 run — and `jobKey` throws on the two malformed shapes that would cause it. But a
 * collision is exactly the failure `keys.ts`'s header describes as invisible ("the second learner is
 * never emailed at all"), so if one ever does appear it should appear in a log, not as an
 * `ON CONFLICT` edge case inside a multi-row VALUES list.
 */
export async function recordSends(
  tx: SchedulerTx,
  sends: readonly Send[],
  now: number,
  log: SchedulerLog,
): Promise<Set<string>> {
  const unique: Send[] = [];
  const seen = new Set<string>();
  for (const s of sends) {
    if (seen.has(s.key)) {
      log.warn({ key: s.key, job: s.job, to: s.to }, 'two sends in one tick claimed the same job_runs key');
      continue;
    }
    seen.add(s.key);
    unique.push(s);
  }

  const recorded = new Set<string>();
  for (let i = 0; i < unique.length; i += CHUNK) {
    const rows = await tx
      .insert(jobRuns)
      .values(
        unique.slice(i, i + CHUNK).map((s) => ({
          job: jobOf(s.key),
          key: s.key,
          // `schema.ts`: `sent_at` is epoch ms, the same number every `dueWork` window is compared
          // against, so a driver-level `Date` here would land one in the middle of that arithmetic.
          sentAt: now,
        })),
      )
      .onConflictDoNothing()
      .returning({ key: jobRuns.key });
    for (const row of rows) recorded.add(row.key);
  }
  return recorded;
}

/**
 * § 8.5: `scheduledAnnouncements` "flips `status: 'scheduled' → 'sent'` at `at`".
 *
 * `returning` reports what genuinely moved, which is what makes the flip safe to re-run —
 * `dueWork` deliberately does NOT gate `flip` on `alreadySent`, because re-running it is harmless
 * while skipping it leaves a banner that never appears. `scheduler.test.ts` covers that: an
 * announcement already `sent` reports `flipped: []`, and one whose status was reverted flips again
 * without mailing anyone a second time.
 *
 * `eq(status, 'scheduled')` IS NOT COVERED BY A TEST, and saying so is the point of this paragraph.
 * MEASURED: removing it changes no assertion in the suite, because `dueWork` only ever puts an
 * announcement in `flip` when the snapshot it was handed says `status === 'scheduled'`, and that
 * snapshot came from `loadDb(tx)` in this same transaction. The predicate earns its place on one
 * interleaving the suite cannot force: Postgres defaults to READ COMMITTED, so each statement takes
 * a fresh snapshot, and a `routes/mutate.ts` transaction that commits a change to this row between
 * `loadDb` and this `update` is invisible to `dueWork`. Without the predicate this statement would
 * then write `sent` over whatever that mutation set. It is kept as the cheaper half of a trade the
 * header explains in full (the alternative being to take § 7.3's write lock 42 here as well); the
 * report flags both for DECISIONS.md.
 */
export async function flipAnnouncements(tx: SchedulerTx, ids: readonly string[]): Promise<string[]> {
  const flipped: string[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const rows = await tx
      .update(announcements)
      .set({ status: 'sent' })
      .where(and(inArray(announcements.id, ids.slice(i, i + CHUNK)), eq(announcements.status, 'scheduled')))
      .returning({ id: announcements.id });
    for (const row of rows) flipped.push(row.id);
  }
  return flipped;
}

// ---------------------------------------------------------------------------
// One tick
// ---------------------------------------------------------------------------

export interface RunOptions {
  /** Defaults to `getDb()`. See `SchedulerDb`. */
  db?: SchedulerDb;
  log?: SchedulerLog;
}

/**
 * § 8.5's `setInterval` body: take the lock, decide, record, mail, flip.
 *
 * Exported and callable on its own, which is how `scheduler.test.ts` runs Gate 8's instant twice
 * without waiting two minutes for an interval. There is no `now` parameter, deliberately — § 8.5
 * says `clock.now()`, and § 7.7 already makes that the pinned instant under `FIXED_NOW`. A second
 * way to tell a job what time it is would be a second clock to keep in step with the first.
 *
 * The transaction covers the lock, both reads and both writes, and NOTHING ELSE. The mail is sent
 * after it commits; the header carries the whole argument for that ordering.
 */
export async function runScheduledJobs(options: RunOptions = {}): Promise<SchedulerRun> {
  const db = options.db ?? getDb();
  const log = options.log ?? CONSOLE_LOG;
  const now = clock.now();

  const claimed = await db.transaction(async (tx) => {
    // § 8.5, first statement inside the transaction. `_xact_` means the lock is released by the
    // commit or rollback, so there is no path — including a throw from `jobKey` — that leaves this
    // process holding it.
    const rows = (await tx.execute(TRY_LOCK)) as unknown as { locked: unknown }[];
    if (!lockGranted(rows[0]?.locked)) return null;

    const snapshot = await loadDb(tx);
    const zones = await savedZones(tx);
    // Who the AI Accelerator's reminders may go to: the plan decides, not the cohort (D-110), read at each
    // session's start for a reminder before it (H-14, D-248), so the first live build's reminders go out.
    const accelerator = await acceleratorRoster(tx);

    // `due.ts`'s header's own wrapper, in its own order: a candidate pass with `NO_KEYS` to learn
    // which keys to ask the ledger about, then the real pass with the answer. Calling `dueWork`
    // twice is its documented contract ("`alreadySent` only ever subtracts", pinned by a test in
    // `due.test.ts`) and it keeps the ledger filter inside the function that owns it instead of
    // reimplementing the subtraction here.
    const candidates = dueWork(snapshot, now, NO_KEYS, zones, accelerator).sends;
    const alreadySent = await keysAlreadyIn(tx, candidates);
    const { sends, flip } = dueWork(snapshot, now, alreadySent, zones, accelerator);

    // LEDGER FIRST. See the header.
    const recorded = await recordSends(tx, sends, now, log);
    const flipped = await flipAnnouncements(tx, flip);

    if (recorded.size !== sends.length) {
      // Under the advisory lock nothing else should be inserting these keys, so this means either
      // a second runner got past the lock or a previous tick committed rows this one's
      // `keysAlreadyIn` did not see. Not an error — the gate did its job and those sends are not
      // being mailed — but it is the one symptom that distinguishes those two causes.
      log.warn(
        { owed: sends.length, claimed: recorded.size },
        'job_runs already held some of this tick’s keys; those sends were not mailed',
      );
    }

    return { candidates: candidates.length, skipped: alreadySent.size, sends, recorded, flipped };
  });

  // The lock was somebody else's. Nothing was read, nothing was written, and this is the ordinary
  // case on every replica but one — so it is not logged here; `startScheduler` logs the tick.
  if (!claimed) return DID_NOT_RUN(now);

  // --- after the commit ------------------------------------------------------------------------
  // Only the keys Postgres said it inserted. `recorded` is the gate, not `sends`.
  let sent = 0;
  let failed = 0;
  for (const s of claimed.sends) {
    if (!claimed.recorded.has(s.key)) continue;
    try {
      // NO CAST, which is the point of `Send`'s shape. `routes/mutate.ts` has to write
      // `send(request as unknown as SendRequest<TemplateName>)` because core's `Effect.data` is a
      // bare `Record<string, unknown>` by the time it leaves the mutation and no generic can narrow
      // it back; a `Send` was built by `due.ts` with `template` and `data` already correlated, so it
      // IS § 8.1's `send({template, to, data})` with `job` and `key` beside it. The `satisfies`
      // states that relationship at the one line that depends on it: if an arm of `Send` ever stops
      // matching `SendRequest`, this fails here rather than inside `elementFor` on a live cohort.
      const result = await send(s satisfies SendRequest<TemplateName>);
      if (result.ok) sent += 1;
      else {
        failed += 1;
        // The ledger row is already committed, so this learner is NOT retried — the cost of the
        // ordering, made visible. It is also usually the right answer: `send` reports `ok: false`
        // for a malformed address, a subject builder that threw and a template that threw, none of
        // which a retry fixes, and retrying those every 60 seconds for a day is noise that would
        // bury the one failure that was transient. A retry policy belongs to the transport, where
        // it can tell the two apart.
        log.error({ job: s.job, key: s.key, to: s.to, error: result.error }, 'a scheduled email was not delivered');
      }
    } catch (err) {
      // `send` never throws by contract (`transport.ts`, decision 1). This is for the case that
      // contract is broken, and catching INSIDE the loop is the point: one bad recipient must not
      // cost the other thirteen their reminder, which a `try` around the whole loop would.
      failed += 1;
      log.error({ err, job: s.job, key: s.key, to: s.to }, 'a scheduled email threw');
    }
  }

  return {
    ran: true,
    now,
    candidates: claimed.candidates,
    skipped: claimed.skipped,
    recorded: [...claimed.recorded],
    sent,
    failed,
    flipped: claimed.flipped,
  };
}

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

export interface StartOptions extends RunOptions {
  /** § 8.5's `60_000`. */
  intervalMs?: number;
  /**
   * § 7.1's demo guard, as `server.ts` reads it from `VITE_DATA_SOURCE === 'fixture'`.
   *
   * True arms nothing. The demo environment has no `DATABASE_URL` at all (`.railway/railway.ts`
   * gives it none and `preDeploy` skips the migration there), so an armed scheduler would throw
   * `DatabaseConfigError` every 60 seconds forever on the deploy that is serving the live sales
   * demo. `server.ts` already computes this for `build({ fixtureOnly })`; it is passed rather than
   * re-read so there is one reading of that variable in the process.
   */
  fixtureOnly?: boolean;
  /**
   * Which signals stop the loop. Defaults to Railway's SIGTERM and a developer's Ctrl-C, the same
   * pair `installShutdown` uses.
   *
   * An option so a test can arm the loop without touching the process's real signal handlers, and
   * so `scheduler.test.ts` can prove the default actually registers one.
   */
  signals?: readonly NodeJS.Signals[];
}

export interface Scheduler {
  /** Whether the interval is still armed. */
  readonly running: boolean;
  /**
   * Disarm the loop and wait for any tick already in flight. Idempotent, and it removes the signal
   * listeners it installed — `app.ts` makes the same point about `installShutdown`: a process
   * listener per instance leaks until Node warns about it.
   */
  stop(): Promise<void>;
  /** Run one tick now, outside the interval. The same function the interval calls. */
  tick(): Promise<SchedulerRun>;
}

/** What `startScheduler({ fixtureOnly: true })` hands back: a scheduler that is not one. */
function disarmed(): Scheduler {
  return {
    running: false,
    stop: async () => {},
    tick: async () => DID_NOT_RUN(clock.now()),
  };
}

/**
 * § 8.5's `startScheduler()`.
 *
 * Called by `server.ts` and NOT by `build()`, for the reason `app.ts` already gives about
 * `installShutdown`: `build()` runs once per test, so an interval and two signal listeners per
 * built app would leak across a run, and § 9.4's fixture guard — the thing keeping the live demo
 * deploy from needing a database — lives in `server.ts` too.
 *
 * ------------------------------------------------------------------------------------------------
 * THE TWO FAILURES THIS FUNCTION EXISTS TO PREVENT
 * ------------------------------------------------------------------------------------------------
 * 1. A THROWN JOB KILLING THE LOOP. `setInterval(async () => …)` with an unhandled rejection
 *    terminates Node by default, so without the `.catch` below one malformed announcement — one
 *    `jobKey` throw, one dropped connection — would stop every future reminder for every learner,
 *    and the evidence would be a restarted container rather than a log line about an announcement.
 *    Containment is at the TICK boundary, not per job: `dueWork` computes all six jobs in one pure
 *    call and there is no seam inside it to isolate. The transaction rolls back, nothing is
 *    recorded, nothing is mailed, and the next tick retries — which is `due.ts`'s own stated
 *    intent for a malformed key. Per-SEND containment is the `try` in `runScheduledJobs`.
 * 2. TICKS PILING UP. A tick that outlives its interval would otherwise start a second one, and
 *    a database stall would queue them until the pool (five connections) is gone. The advisory
 *    lock does already exclude them — two ticks in one process are two pooled connections, so the
 *    second gets `false` and returns — but it would still spend a connection and a `loadDb` to
 *    find that out. `inFlight` skips instead, and says so.
 */
export function startScheduler(options: StartOptions = {}): Scheduler {
  const log = options.log ?? CONSOLE_LOG;
  if (options.fixtureOnly) {
    log.info({}, 'scheduler not started: VITE_DATA_SOURCE is fixture, so this service has no database');
    return disarmed();
  }

  const intervalMs = options.intervalMs ?? TICK_MS;
  const runOptions: RunOptions = { log, ...(options.db ? { db: options.db } : {}) };

  let timer: NodeJS.Timeout | null = null;
  let inFlight: Promise<unknown> | null = null;
  let uninstall = (): void => {};

  const tick = async (): Promise<SchedulerRun> => {
    // D-162: the masquerade sweep (spec § 6), once per tick and in its own try/catch, so it can never
    // cost the reminders their tick. Outside the advisory lock: it ends only rows still live, so two
    // replicas end each one once.
    try {
      const swept = await sweepMasquerades(runOptions.db ?? getDb(), clock.now());
      if (swept > 0) log.info({ swept }, 'masquerade sweep');
    } catch (err) {
      log.error({ err }, 'masquerade sweep failed; the next tick retries');
    }
    // D-166: the email log's 180 days and usage's 400 (D6), the same way: its own try/catch, outside the lock.
    try {
      const pruned = await pruneEmailAndUsage(runOptions.db ?? getDb(), clock.now());
      if (pruned.emails + pruned.usage > 0) log.info(pruned, 'email log and usage pruned');
    } catch (err) {
      log.error({ err }, 'email log and usage prune failed; the next tick retries');
    }
    try {
      // D-165: observe-only. The tick is recorded in `job_ticks` (`jobs/ticks.ts`), which never throws and
      // never changes what the tick does or returns. On the app's own database only: a caller that hands
      // the scheduler a stand-in `db` gets the tick exactly as before.
      if (options.db) return await runScheduledJobs(runOptions);
      return await recordTick(SCHEDULER_TICK_JOB, () => runScheduledJobs(runOptions), { log, skipped: (run) => !run.ran });
    } finally {
      // D-167: the incidents' auto-open rules (spec § 7.14), once per tick after the jobs, observe-only
      // and in their own try/catch: whatever they do or throw, the tick answers exactly what it answered
      // without them, and no job ever waits on them for anything but time.
      try {
        const run = await evaluateIncidentRules(runOptions.db ?? getDb(), clock.now());
        if (run.opened.length || run.signaled.length || run.failed.length) log.info({ ...run }, 'incident rules');
      } catch (err) {
        log.error({ err }, 'incident rules failed; the next tick retries');
      }
    }
  };

  const fire = (): void => {
    if (inFlight) {
      log.warn({ intervalMs }, 'scheduler skipped a tick: the previous one has not finished');
      return;
    }
    // Both arms are handled HERE, so `settled` can never reject — which is what makes it safe for
    // `stop()` to await and for `queueMailTask` to be handed.
    const settled: Promise<void> = tick()
      .then(
        (run) => {
          if (!run.ran) return;
          log.info(
            {
              now: run.now,
              candidates: run.candidates,
              skipped: run.skipped,
              recorded: run.recorded.length,
              sent: run.sent,
              failed: run.failed,
              flipped: run.flipped.length,
            },
            'scheduler tick',
          );
        },
        (err: unknown) => {
          // Failure 1 above. The loop is still armed after this.
          log.error({ err }, 'scheduler tick failed; the loop continues and the next tick retries');
        },
      )
      .finally(() => {
        if (inFlight === settled) inFlight = null;
      });
    inFlight = settled;
    // The § 9.4 drain joins here. See the import comment: `shutdown()` awaits `settleEmails()`
    // first, so an orderly redeploy finishes this tick's mail instead of cutting it off between the
    // committed ledger row and the send — which is the one window the ledger-first ordering loses.
    queueMailTask('scheduler tick', () => settled);
  };

  timer = setInterval(fire, intervalMs);
  // `unref` so a scheduler nobody stopped cannot hold the process open. In production the Fastify
  // server is what keeps the event loop alive, so this costs nothing there; in a test it is the
  // difference between a failed assertion and a vitest run that passes and then hangs forever.
  timer.unref();

  const signals = options.signals ?? (['SIGTERM', 'SIGINT'] as const);
  const handlers = signals.map((signal) => {
    // `void stop()`: a signal handler cannot be awaited, and `clearInterval` — the part that must
    // happen now — is synchronous and happens on this line's first tick. `installShutdown`'s
    // handler runs in the same synchronous dispatch (Node calls listeners in registration order)
    // and its first `await`, inside `settleEmails()`, yields before this interval could fire again.
    const handler = (): void => void stop();
    process.once(signal, handler);
    return { signal, handler };
  });
  uninstall = (): void => {
    for (const { signal, handler } of handlers) process.off(signal, handler);
  };

  async function stop(): Promise<void> {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    uninstall();
    uninstall = (): void => {};
    if (inFlight) await inFlight;
  }

  return {
    get running() {
      return timer !== null;
    },
    stop,
    tick,
  };
}
