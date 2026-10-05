// § 8.5's scheduler shell, against a real Postgres — the half `jobs/due.test.ts` cannot reach.
//
// `due.test.ts` already proves WHICH sends are owed at an instant, exhaustively and in
// microseconds: sixty-odd assertions over windows, audiences, tiers, toggles and cohort status.
// Repeating any of that here would be theatre. What a database and a transport add is everything
// between "fourteen sends are owed" and "fourteen emails left the building exactly once", and
// there are five classes of failure that live only there:
//
//   1. IDEMPOTENCE ACROSS PROCESSES. `due.test.ts` passes `alreadySent` as a hand-built `Set`.
//      Nothing in it executes the `job_runs` round trip — the insert, the unique `(job, key)`, the
//      `on conflict do nothing`, the read back on the next tick — which is the actual mechanism
//      Gate 8's "running it twice sends nothing new" rides on.
//   2. THE ADVISORY LOCK. `pg_try_advisory_xact_lock(4242)` is the one line keeping two replicas
//      from both running jobs, and there is no way to test it without two connections.
//   3. THE ORDERING. Ledger row first, mail second (`scheduler.ts`'s header carries the whole
//      argument). The observable consequence — a refused send is NOT retried — is a promise this
//      file has to pin, because it is the cost of the choice and the thing a future reader would
//      otherwise "fix".
//   4. THE ZONE COLUMN. `users.prefs.tz` has no `Learner` field (D-022's sibling problem), so
//      `dueWork` takes a `ZoneLookup` it cannot populate. `savedZones` is the query, and whether
//      it reaches the recipient's email is only visible end to end.
//   5. THE LOOP ITSELF. SIGTERM stopping the interval, and a thrown job not killing it.
//
// Every test here is one of those five. The transport is in test mode (an in-memory outbox,
// § 8.1), the clock is pinned with `FIXED_NOW` (§ 7.7), and the renderer is registered — so an
// unrenderable payload fails here as a refused send rather than reaching a learner as an empty
// email.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { fmt, seedForDatabase } from '@ai/core';
import type { Db } from '@ai/core';
import { renderTemplate } from '../src/email/templates';
import { outbox, outboxFor, resetOutbox, resetRenderer, setRenderer } from '../src/email/transport';
import type { OutboxEntry } from '../src/email/transport';
import { SCHEDULER_LOCK, TICK_MS, runScheduledJobs, startScheduler } from '../src/jobs/scheduler';
import type { SchedulerDb, SchedulerLog } from '../src/jobs/scheduler';
import { announcements, jobRuns, reminders, users } from '../src/db/schema';
import { loadDb, resetDatabase, testDatabase } from './helpers';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Gate 8's own instant: "The scheduler at 2026-12-08T13:00 CT". */
const GATE_NOW_ISO = '2026-12-08T13:00:00-06:00';
/** § 8.5's `a3`: 'Weekly team progress digest', audience `owners`, email only. */
const ANNOUNCE_ISO = '2026-12-11T08:00:00-06:00';

const MINUTE = 60e3;

/** The seeded snapshot, for deriving the expected audiences rather than hard-coding ids. */
const SEED = seedForDatabase('live');
const EVERYONE = SEED.users.map((u) => u.id);
const OWNERS = SEED.users.filter((u) => u.role === 'Team Owner').map((u) => u.id);
const S3 = SEED.sessions.find((s) => s.id === 'dec26-s3')!;

/** A copy of the seed to bend before loading it. */
const variant = (change: (d: Db) => void): Db => {
  const copy = structuredClone(SEED);
  change(copy);
  return copy;
};

/** `FIXED_NOW` as the scheduler will read it, so a test instant and `clock.now()` cannot differ. */
const fixNow = (iso: string): number => {
  process.env.FIXED_NOW = iso;
  return Date.parse(iso);
};

/**
 * Wall-clock plumbing, deliberately NOT `clock.now()`.
 *
 * `clock.now()` is frozen at `FIXED_NOW` for the whole file, which is the point — but a test that
 * waits for an interval to fire has to wait in real seconds. `waitUntil`'s `Date.now()` is the only
 * host-clock read in this file, and it bounds a wait rather than deciding anything about a job.
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(done: () => boolean, label: string, limitMs = 3000): Promise<void> {
  const deadline = Date.now() + limitMs;
  while (!done()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(2);
  }
}

/** A logger that counts instead of printing, so an expected failure does not fill the run with noise. */
function countingLog(): SchedulerLog & { counts: { info: number; warn: number; error: number } } {
  const counts = { info: 0, warn: 0, error: 0 };
  return {
    counts,
    info: () => void (counts.info += 1),
    warn: () => void (counts.warn += 1),
    error: () => void (counts.error += 1),
  };
}

/** Every `job_runs` row, which is the only table the scheduler writes besides one status column. */
async function ledger(): Promise<{ job: string; key: string; sentAt: number }[]> {
  const db = await testDatabase();
  return db.select().from(jobRuns).orderBy(jobRuns.job, jobRuns.key);
}

const keysOf = (rows: readonly { key: string }[]): string[] => rows.map((r) => r.key);
const toOf = (entries: readonly OutboxEntry[]): string[] => entries.map((e) => e.to);

let savedAppUrl: string | undefined;

beforeAll(() => {
  // What `app.ts` does once at startup. Registered here too, so a payload the template refuses
  // shows up as `failed` in this file instead of as an email with no body in production — which is
  // the failure three of the five jobs shipped with before `EmailData` was tightened.
  setRenderer(renderTemplate);
  // MEASURED, and the reason this line exists rather than a mock renderer: with the real templates
  // registered and `APP_URL` unset, every single send fails with "APP_URL is not set, so an email
  // link cannot be made absolute" — `templates/links.ts` refuses to build a relative CTA — so the
  // scheduler records fourteen ledger rows and delivers nothing. `.railway/railway.ts` does set
  // `APP_URL` per environment, so this is the harness supplying what a deploy supplies, not a
  // workaround; `templates.test.tsx` saves and restores it the same way.
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://learn.example.com';
});

afterAll(() => {
  resetRenderer();
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  delete process.env.FIXED_NOW;
});

beforeEach(() => {
  resetOutbox();
});

// ===========================================================================
// 1. The loop, SIGTERM, and a job that throws
// ===========================================================================
//
// No database. These three are properties of `startScheduler` itself, and a stub handle whose
// `transaction()` throws is the only honest way to test the third: breaking a real database on
// purpose would prove that the loop survives whatever THAT break happened to be.

describe('§8.5 the loop @g8', () => {
  /**
   * A handle that counts ticks and fails every one of them.
   *
   * The cast is to `SchedulerDb`, which is the one-method seam `scheduler.ts` declares for exactly
   * this: `runScheduledJobs` needs `transaction` and nothing else, so a test does not have to
   * fabricate a drizzle `Database`.
   */
  const brokenDb = (onCall: () => void): SchedulerDb =>
    ({
      transaction: async () => {
        onCall();
        throw new Error('the connection went away mid-tick');
      },
    }) as unknown as SchedulerDb;

  it('keeps ticking after a job throws @g8', async () => {
    // THE failure this guards: `setInterval(async () => …)` with an unhandled rejection terminates
    // Node by default, so one malformed announcement — one `jobKey` throw, one dropped socket —
    // would stop every future reminder for every learner. The evidence would be a restarted
    // container, not a log line about an announcement.
    let calls = 0;
    const log = countingLog();
    const scheduler = startScheduler({ db: brokenDb(() => void (calls += 1)), intervalMs: 5, log, signals: [] });
    try {
      await waitUntil(() => calls >= 3, 'three failing ticks');
      // Still armed, and every failure was reported rather than swallowed.
      expect(scheduler.running).toBe(true);
      expect(log.counts.error).toBeGreaterThanOrEqual(3);
    } finally {
      await scheduler.stop();
    }
  });

  it('stops on SIGTERM and leaves no process listener behind @g8', async () => {
    // § 8.5 says nothing about shutdown, but `app.ts` does: `installShutdown` drains SSE and the
    // pool on SIGTERM, and a `setInterval` still firing into a closing pool turns an orderly
    // redeploy into a stack trace per replica. The listener is also REMOVED on stop, for the reason
    // `app.ts` gives about `build()`: one listener per instance leaks until Node warns about it.
    //
    // The handler is invoked directly rather than by `process.emit('SIGTERM')`, on purpose.
    // `app.ts`'s header: "a test that called `process.emit('SIGTERM')` would take the whole run
    // down" — in a process where `installShutdown` is also listening, the signal reaches a handler
    // that calls `process.exit(0)`. Calling this one function tests this one wiring.
    let calls = 0;
    const log = countingLog();
    const before = process.listeners('SIGTERM');
    const scheduler = startScheduler({ db: brokenDb(() => void (calls += 1)), intervalMs: 5, log });
    try {
      const added = process.listeners('SIGTERM').filter((l) => !before.includes(l));
      expect(added, 'startScheduler registered exactly one SIGTERM listener').toHaveLength(1);
      await waitUntil(() => calls >= 1, 'the first tick');

      // The argument Node passes a signal listener. Irrelevant to this handler, supplied because
      // the type says a listener receives it.
      added[0]!('SIGTERM');
      expect(scheduler.running).toBe(false);
      await scheduler.stop();

      const settled = calls;
      await sleep(10 * 5);
      expect(calls, 'no tick fired after SIGTERM').toBe(settled);
      expect(process.listeners('SIGTERM'), 'the listener was removed').toEqual(before);
    } finally {
      await scheduler.stop();
    }
  });

  it('arms nothing in fixture mode @g8', async () => {
    // § 7.1's demo guard. `.railway/railway.ts` gives the demo environment no `DATABASE_URL` at
    // all, so an armed scheduler would throw `DatabaseConfigError` every 60 seconds on the deploy
    // that is serving the live sales demo. `server.ts` passes the same flag it passes to `build()`.
    let calls = 0;
    const scheduler = startScheduler({
      db: brokenDb(() => void (calls += 1)),
      intervalMs: 5,
      fixtureOnly: true,
      log: countingLog(),
    });
    expect(scheduler.running).toBe(false);
    await sleep(30);
    expect(calls).toBe(0);
    // And a tick asked for explicitly still touches nothing.
    expect((await scheduler.tick()).ran).toBe(false);
    await scheduler.stop();
  });

  it('keeps § 8.5’s two constants @g8', () => {
    // Both are in § 8.5's snippet verbatim. The lock id especially: a replica on a different id is
    // not excluded by anything, and the symptom is duplicate work rather than a failure.
    expect(SCHEDULER_LOCK).toBe(4242);
    expect(TICK_MS).toBe(60_000);
  });
});

// ===========================================================================
// 2. Gate 8, verbatim
// ===========================================================================

describe('Gate 8 · the scheduler at 2026-12-08T13:00 CT @g8', () => {
  // ONE reset for this block, because the ORDER IS THE SCENARIO: Gate 8's sentence is "sends …
  // once. Running it twice sends nothing new", and the second run has to see what the first one
  // left in `job_runs`.
  beforeAll(async () => {
    await resetDatabase(SEED);
  });

  beforeEach(() => {
    fixNow(GATE_NOW_ISO);
  });

  it('is reading the instant the checklist means @g8', () => {
    // The same pin `due.test.ts` opens with, repeated because this file's `FIXED_NOW` string is a
    // second, independent spelling of the instant and could drift from `fmt.fromCT`'s reading of it.
    expect(Date.parse(GATE_NOW_ISO)).toBe(fmt.fromCT('2026-12-08', '13:00'));
    expect(Date.parse(GATE_NOW_ISO)).toBe(S3.start - 24 * 3600e3);
    expect(S3.n).toBe(3);
  });

  it('sends session-24h for Session 3 to each eligible learner once @g8', async () => {
    const run = await runScheduledJobs();

    expect(run.ran).toBe(true);
    expect(run.now).toBe(Date.parse(GATE_NOW_ISO));
    expect(run.candidates).toBe(EVERYONE.length);
    expect(run.skipped).toBe(0);
    expect(run.sent).toBe(EVERYONE.length);
    expect(run.failed).toBe(0);
    expect(run.flipped).toEqual([]);

    // The ledger: one row per learner, § 8.5's own key format, and the `job` column derived from
    // the key rather than restated (`keys.ts`).
    const rows = await ledger();
    expect(keysOf(rows)).toEqual(EVERYONE.map((id) => `session-24h:dec26-s3:${id}`).sort());
    expect(new Set(rows.map((r) => r.job))).toEqual(new Set(['session-24h']));
    // `sent_at` is epoch ms, not a `Date` — `schema.ts`'s rule, and the driver is what would break
    // it. A `Date` here lands in the middle of `dueWork`'s arithmetic.
    expect(rows.map((r) => r.sentAt)).toEqual(Array(EVERYONE.length).fill(Date.parse(GATE_NOW_ISO)));

    // The inbox: one email each, § 8.1's exact subject, nothing else sent.
    const sent = outbox();
    expect(sent).toHaveLength(EVERYONE.length);
    expect(toOf(sent)).toEqual(SEED.users.map((u) => u.email));
    expect(new Set(sent.map((e) => e.subject))).toEqual(new Set(['Tomorrow: Session 3 · The Living Database']));
    // The renderer is registered, so a body is proof the payload rendered rather than proof it
    // typechecked.
    for (const entry of sent) expect(entry.html).toContain('The Living Database');
  });

  it('sends nothing new when it runs again @g8', async () => {
    // Gate 8's second sentence. The `job_runs` rows the previous test committed are the whole
    // mechanism, and the scheduler has TWO independent readings of them:
    //   - `keysAlreadyIn` reads the keys and `dueWork` subtracts them, so nothing is even owed;
    //   - the insert's `on conflict do nothing ... returning` reports what it actually claimed, and
    //     the dispatch is gated on THAT, so a key some other writer holds is never mailed.
    //
    // MEASURED: the second alone is sufficient. Deleting the `keysAlreadyIn` result (passing
    // `NO_KEYS` to the second `dueWork`) changes not one assertion below — `recorded` is still
    // empty, `sent` is still 0, the outbox is still empty — because the unique `(job, key)` absorbs
    // all fourteen redundant inserts. That is the right order of defences, but it means "the
    // scheduler consults the ledger" is NOT observable in the sends, and the counting logger below
    // is what makes it observable: `runScheduledJobs` warns when it claimed fewer rows than it owed,
    // which under the advisory lock can only mean it asked for keys it should have known about.
    // Without that assertion this test passes against a scheduler that reads nothing and leans on
    // the constraint every minute.
    const log = countingLog();
    const run = await runScheduledJobs({ log });

    expect(run.ran).toBe(true);
    expect(run.candidates).toBe(EVERYONE.length);
    expect(run.skipped).toBe(EVERYONE.length);
    expect(run.recorded).toEqual([]);
    expect(run.sent).toBe(0);
    expect(outbox()).toEqual([]);
    expect(await ledger()).toHaveLength(EVERYONE.length);
    expect(log.counts.warn, 'nothing was owed, so nothing collided').toBe(0);
  });

  it('sends nothing new on the next tick, with the window still open @g8', async () => {
    // What "runs again" actually looks like: a minute later, inside the same open window. § 8.5's
    // windows are open-ended BY DESIGN (`due.ts`'s header), so without the ledger this would send
    // fourteen more emails every 60 seconds for the next 23 hours.
    fixNow(new Date(Date.parse(GATE_NOW_ISO) + MINUTE).toISOString());
    const run = await runScheduledJobs();
    expect(run.sent).toBe(0);
    expect(run.recorded).toEqual([]);
    expect(outbox()).toEqual([]);
    expect(await ledger()).toHaveLength(EVERYONE.length);
  });

  it('sends only the learner a half-finished run missed @g8', async () => {
    // A crash between the commit and the thirteenth send cannot happen (the ledger commits in one
    // statement), but a crash between two TICKS can — and a run that was interrupted before its
    // transaction committed leaves no rows at all. The in-between state worth testing is the one
    // an operator creates by hand when repairing a bad send: delete one row, and exactly that
    // learner is owed again.
    const db = await testDatabase();
    const orphan = `session-24h:dec26-s3:${EVERYONE[13]!}`;
    await db.delete(jobRuns).where(eq(jobRuns.key, orphan));

    fixNow(GATE_NOW_ISO);
    const run = await runScheduledJobs();
    expect(run.recorded).toEqual([orphan]);
    expect(run.sent).toBe(1);
    expect(toOf(outbox())).toEqual([SEED.users[13]!.email]);
    expect(await ledger()).toHaveLength(EVERYONE.length);
  });
});

// ===========================================================================
// 3. A toggle that is off
// ===========================================================================

describe('§8.1 a reminder that is switched off @g8', () => {
  beforeEach(() => {
    fixNow(GATE_NOW_ISO);
  });

  it('suppresses its job entirely, and turning it on releases the same sends @g8', async () => {
    // § 8.1: each reminder sends "when the reminder is on". `rm1` is the 24-hour switch. The second
    // half of this test is what makes the first half mean anything: without it, a scheduler that
    // was broken in some other way would also send nothing and pass.
    await resetDatabase(
      variant((d) => {
        d.reminders.find((r) => r.id === 'rm1')!.on = false;
      }),
    );

    const off = await runScheduledJobs();
    expect(off.ran).toBe(true);
    expect(off.candidates).toBe(0);
    expect(off.recorded).toEqual([]);
    expect(outbox()).toEqual([]);
    expect(await ledger()).toEqual([]);

    // Flip the switch the way the admin Announcements screen does, and tick again.
    const db = await testDatabase();
    await db.update(reminders).set({ on: true }).where(eq(reminders.id, 'rm1'));

    const on = await runScheduledJobs();
    expect(on.candidates).toBe(EVERYONE.length);
    expect(on.sent).toBe(EVERYONE.length);
    expect(keysOf(await ledger())).toEqual(EVERYONE.map((id) => `session-24h:dec26-s3:${id}`).sort());
  });
});

// ===========================================================================
// 4. The advisory lock
// ===========================================================================

describe('§8.5 pg_try_advisory_xact_lock(4242) @g8', () => {
  beforeEach(async () => {
    fixNow(GATE_NOW_ISO);
    await resetDatabase(SEED);
  });

  it('excludes a second runner, and releases when the first transaction ends @g8', async () => {
    // § 8.5: "guarded by a Postgres advisory lock so only one replica executes jobs". Without it,
    // two replicas both compute the same fourteen candidates, and `job_runs` is then the ONLY thing
    // between a cohort and two copies of every reminder — a unique constraint doing a job that was
    // supposed to be done by the lock, with both replicas paying for a `loadDb` to find out.
    //
    // The holder is a separate transaction, which `postgres`'s pool puts on a separate connection.
    // That matters: advisory locks are re-entrant WITHIN a session, so a holder on the same
    // connection would be granted the lock twice and this test would pass against a scheduler with
    // no lock in it at all.
    const db = await testDatabase();

    let acquired!: () => void;
    let release!: () => void;
    const held = new Promise<void>((resolve) => void (acquired = resolve));
    const finish = new Promise<void>((resolve) => void (release = resolve));

    const holder = db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(4242)`);
      acquired();
      await finish;
    });

    try {
      await held;

      const blocked = await runScheduledJobs();
      expect(blocked.ran).toBe(false);
      expect(blocked.candidates).toBe(0);
      expect(blocked.recorded).toEqual([]);
      // Nothing was read and nothing was written — not a send, not a row.
      expect(outbox()).toEqual([]);
      expect(await ledger()).toEqual([]);
    } finally {
      release();
      await holder;
    }

    // `_xact_` means the commit released it. The same tick that did nothing a moment ago now owes
    // all fourteen, which is what proves the lock — and not an empty window — was the reason.
    const after = await runScheduledJobs();
    expect(after.ran).toBe(true);
    expect(after.sent).toBe(EVERYONE.length);
    expect(await ledger()).toHaveLength(EVERYONE.length);
  });
});

// ===========================================================================
// 5. Scheduled announcements
// ===========================================================================

describe('§8.5 scheduled announcements @g8', () => {
  beforeAll(async () => {
    await resetDatabase(SEED);
  });

  beforeEach(() => {
    fixNow(ANNOUNCE_ISO);
  });

  it('flips a3 to sent and emails its audience once @g8', async () => {
    // § 8.5: "`scheduledAnnouncements` flips `status: 'scheduled' → 'sent'` at `at`. The in-app
    // banner appears from that moment, and email goes out if the channel is set."
    const run = await runScheduledJobs();

    expect(run.ran).toBe(true);
    expect(run.flipped).toEqual(['a3']);
    expect(run.recorded.sort()).toEqual(OWNERS.map((id) => `announcement:a3:${id}`).sort());
    expect(run.sent).toBe(OWNERS.length);
    expect(run.failed).toBe(0);

    // The flip is the banner: `scope.ts`'s `forAudience` shows an announcement only when its status
    // is `sent`, so this column IS the in-app channel.
    const stored = (await loadDb()).announcements.find((a) => a.id === 'a3')!;
    expect(stored.status).toBe('sent');

    const sent = outboxFor({ template: 'announcement' });
    expect(sent).toHaveLength(OWNERS.length);
    expect(new Set(sent.map((e) => e.subject))).toEqual(new Set([stored.title]));
    // § 8.1: the announcement's subject IS its title, with no prefix of ours.
    expect(sent[0]!.subject).toBe('Weekly team progress digest');
  });

  it('re-runs the flip without re-sending the email @g8', async () => {
    // The two halves can come apart, and `dueWork` deliberately does NOT gate `flip` on
    // `alreadySent`: re-running it is idempotent while skipping it leaves a banner that never
    // appears. Here the status is already `sent`, so the conditional update matches nothing — which
    // is the same end state, reported honestly as "nothing moved".
    const run = await runScheduledJobs();
    expect(run.flipped).toEqual([]);
    expect(run.recorded).toEqual([]);
    expect(run.sent).toBe(0);
    expect(outboxFor({ template: 'announcement' })).toEqual([]);
    expect((await loadDb()).announcements.find((a) => a.id === 'a3')!.status).toBe('sent');
  });

  it('never re-sends an announcement a tick already mailed, even with its status reverted @g8', async () => {
    // The race `scheduler.ts`'s header describes: `routes/mutate.ts` upserts whole rows through
    // `persistDiff`, so an admin editing `a3` from a snapshot loaded just before the flip committed
    // writes `status: 'scheduled'` back. The banner then appears one tick later — and the EMAIL
    // must not go out a second time. That property is `job_runs`, not the status column, which is
    // exactly why the flip and the send are recorded differently.
    const db = await testDatabase();
    await db.update(announcements).set({ status: 'scheduled' }).where(eq(announcements.id, 'a3'));

    const run = await runScheduledJobs();
    expect(run.flipped).toEqual(['a3']);
    expect(run.recorded).toEqual([]);
    expect(run.sent).toBe(0);
    expect(outboxFor({ template: 'announcement' })).toEqual([]);
  });
});

// ===========================================================================
// 6. The recipient's saved zone
// ===========================================================================

describe('§8.1 the recipient’s saved zone @g8', () => {
  it('reads users.prefs.tz into dueWork’s ZoneLookup, per recipient @g8', async () => {
    // § 8.1: "Session times in emails use `fmt.when` with the RECIPIENT's saved zone, and fall back
    // to CT." `dueWork` takes that as a parameter because `@ai/core`'s `Learner` has no `prefs`
    // field while `users` has a `prefs` column — see `due.ts`'s `ZoneLookup`. `savedZones` is the
    // query, and this is the only test that can prove the column reaches an inbox.
    //
    // Honolulu on purpose: it is the one zone where the 13:00 CT session renders on a DIFFERENT
    // DAY, so a shell that shared one payload across all fourteen learners (or dropped the field)
    // would send "Tomorrow:" about a session that is today.
    await resetDatabase(SEED);
    const db = await testDatabase();
    await db.update(users).set({ prefs: { tz: 'Pacific/Honolulu' } }).where(eq(users.id, 'u_jamie'));

    fixNow(GATE_NOW_ISO);
    const run = await runScheduledJobs();
    expect(run.sent).toBe(EVERYONE.length);

    const jamie = SEED.users.find((u) => u.id === 'u_jamie')!;
    const [mine] = outboxFor({ to: jamie.email });
    expect(mine!.data.zone).toBe('Pacific/Honolulu');

    // Everybody else keeps § 8.1's CT fallback, spelled as an explicit `null` rather than as a
    // missing key — the defect `due.ts` records at length, because an absent `zone` reads as "the
    // recipient is Central" for all fourteen, silently.
    for (const entry of outbox()) {
      if (entry.to === jamie.email) continue;
      expect(entry.data).toHaveProperty('zone');
      expect(entry.data.zone).toBeNull();
    }
  });
});

// ===========================================================================
// 7. The cost of the ordering, stated out loud
// ===========================================================================

describe('§8.5 ledger first, mail second @g8', () => {
  // `beforeEach` rather than `beforeAll`: the second test re-runs the same instant and must see the
  // first test's rows, but the counting logger has to be fresh.
  let log: ReturnType<typeof countingLog>;

  beforeAll(async () => {
    await resetDatabase(
      variant((d) => {
        // A shape `transport.ts`'s `invalidRecipient` refuses (whitespace, no `@`). `dueWork`'s
        // `mailable` only screens an EMPTY address, so this learner is a candidate, is recorded,
        // and is then refused by the transport — which is the only way to observe the ordering from
        // outside.
        d.users[0]!.email = 'not an address';
      }),
    );
  });

  beforeEach(() => {
    fixNow(GATE_NOW_ISO);
    log = countingLog();
  });

  it('records a send the transport then refuses, and reports it @g8', async () => {
    const run = await runScheduledJobs({ log });

    expect(run.sent).toBe(EVERYONE.length - 1);
    expect(run.failed).toBe(1);
    // THE POINT: the row is there anyway. The ledger committed before the transport was asked.
    expect(keysOf(await ledger())).toEqual(EVERYONE.map((id) => `session-24h:dec26-s3:${id}`).sort());
    // And it is not silent — `scheduler.ts` logs the key, the recipient and the transport's reason.
    expect(log.counts.error).toBe(1);
    // The other thirteen still went. One bad recipient must not cost the rest their reminder.
    expect(outbox()).toHaveLength(EVERYONE.length - 1);
  });

  it('does not retry the refused send @g8', async () => {
    // The cost of the choice, pinned so nobody "fixes" it by accident. `scheduler.ts`'s header
    // argues it: `send` reports `ok: false` for a malformed address, a subject builder that threw
    // and a template that threw — none of which a retry fixes — and retrying them every 60 seconds
    // for the width of an open window would bury the one failure that was transient.
    const run = await runScheduledJobs({ log });
    expect(run.skipped).toBe(EVERYONE.length);
    expect(run.recorded).toEqual([]);
    expect(run.sent).toBe(0);
    expect(run.failed).toBe(0);
    expect(outbox()).toEqual([]);
  });
});
