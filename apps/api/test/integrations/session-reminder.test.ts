// Gate 8's third automated line — phase 08 § 8.5's scheduler and § 8.1's `session-24h` template.
//
//   "The scheduler at `2026-12-08T13:00 CT` sends `session-24h` for Session 3 to each eligible
//    learner once. Running it twice sends nothing new."
//
// ================================================================================================
// WHY 2026-12-08T13:00 CT IS EXACTLY THE RIGHT INSTANT, AND WHY IT LOOKS WRONG
// ================================================================================================
// `dec26-s3` was MOVED. The seed's own announcement `a1` says so — "Session 3 moved to Wed Dec 9 ·
// 1:00 PM CT" — and `seed.ts` writes the move as the NEW time plus a `movedFrom`:
//
//   mkSessions('dec26', …, ['2026-12-01', '2026-12-03', '2026-12-09', …])   → s3.start = Dec 9 13:00 CT
//   sessions[2].movedFrom = T('2026-12-08T13:00')                          → the old instant
//
// So Gate 8's instant is `s3.start - 24 h` to the millisecond, and `due.ts`'s window is half-open
// at its lower bound (`isDue`: `now >= opens`). A reader who assumes Session 3 is on December 8
// concludes the checklist names the session's own start; it does not. The first assertion below
// derives the instant from the row so the relationship is pinned rather than described.
//
// ================================================================================================
// WHAT IS DUE AT THAT INSTANT, MEASURED
// ================================================================================================
//   session-24h   `dec26-s3`, window `[start-24h, start-1h)` → OPEN, at its first millisecond
//   session-1h    nothing starts within the hour                                      → no
//   replay-ready  s1 and s2 ended Dec 1 / Dec 3; the window is `end + 1 day`          → closed
//   build-48h     the same two, `end + 48 h + 1 day`                                  → closed
//   weekly-digest `rm5` is seeded OFF, and `toggleOn` filters it in BOTH passes        → off
//   announcement  the seed's only scheduled one, `a3`, is `at` Dec 11 08:00           → not yet
//
// so the tick owes exactly `session-24h` and the assertions can be about the whole outbox. They
// check the template anyway: an assertion that silently depends on the rest of that table is one
// that fails for an unrelated reason later.
//
// ================================================================================================
// WHO IS "EACH ELIGIBLE LEARNER", AND WHY IT IS ALL FOURTEEN
// ================================================================================================
// `sessionAudience` is `cohortId === s.cohortId ∧ reachable ∧ (!m || canAccess(u, m))`. Session 3
// teaches the **Database** AI Employee, which is `tier: 'agent'` — and `canAccess` is
// `m.tier === 'agent' || u.tier === 'team'`, so an agent-tier module is open to everybody. Every
// seeded learner is `status: 'active'` with an address, and `dec26` is `status: 'live'`. Fourteen.
//
// That is worth stating because the NEIGHBOURING session is the opposite case: `dec26-s4` teaches
// `meetings`, which is `tier: 'team'`, which is why Gate 8's join line expects Jamie to be refused
// it. The two lines are the same rule read from two sides, and `join-window.test.ts` is the other.
//
// ================================================================================================
// WHAT THIS ADDS OVER `test/scheduler.test.ts` AND `jobs/due.test.ts`
// ================================================================================================
// `due.test.ts` proves WHICH sends are owed, purely, with a hand-built `alreadySent` set.
// `scheduler.test.ts` proves the shell's own mechanics — the advisory lock, the loop, SIGTERM, a
// refused send not being retried. Neither asserts the thing Gate 8's line is about, which is the
// END of the chain: that fourteen real addresses out of fourteen real `users` rows received § 8.1's
// exact subject, once, through the outbox the checklist names, and that the mechanism which makes
// "twice" a no-op is the `job_runs` ledger and not an accident of the window. The last test proves
// that last clause by emptying the ledger and watching the same tick send again — which is the only
// way to tell "idempotent" apart from "the window happened to close".
//
// ================================================================================================
// TIME ZONES
// ================================================================================================
// D-250: the reminders show their time in Mountain Time first and Central Time after it, the same for every
// recipient and on any host (`sessionTimeMtCt` takes no viewer zone). § 8.1 had rendered each recipient's saved
// zone. What is asserted here is the SUBJECT, which now carries that time, and the `job_runs` keys, which are ids.
// `templates.test.tsx` and `sessionTimeMtCt`'s own tests own the time's words.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { canAccess, moduleForSession, seedForDatabase } from '@ai/core';
import type { Db } from '@ai/core';
import { build } from '../../src/app';
import type { App } from '../../src/app';
import { jobRuns } from '../../src/db/schema';
import { resetOutbox } from '../../src/email/transport';
import type { OutboxEntry } from '../../src/email/transport';
import { runScheduledJobs } from '../../src/jobs/scheduler';
import type { SchedulerLog } from '../../src/jobs/scheduler';
import { loadDb, resetDatabase, testDatabase } from '../helpers';

/** Gate 8's instant, with an explicit offset so the suite does not inherit the runner's zone. */
const NOW_ISO = '2026-12-08T13:00:00-06:00';
const NOW = Date.parse(NOW_ISO);

const APP_URL = 'https://learn.example.com';

const HOUR = 3600e3;

/**
 * § 8.1's `session-24h` subject, `Tomorrow: Session {n} · {title}`, resolved for Session 3, with its time after it in
 * Mountain and Central (D-250): Wed, Dec 9, 12:00 PM MT, 75 minutes.
 */
const SUBJECT = 'Tomorrow: Session 3 · The Living Database · Wed, Dec 9, 12:00 to 1:15 PM MT / 1:00 to 2:15 PM CT';

let app: App;
let savedAppUrl: string | undefined;

beforeAll(async () => {
  await testDatabase();
});

beforeEach(async () => {
  process.env.FIXED_NOW = NOW_ISO;
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = APP_URL;
  resetOutbox();
  await resetDatabase(seedForDatabase('live'));
  // `build()` is what calls `setRenderer(renderTemplate)`. Without it every send still lands in the
  // outbox but with `html: null`, so a template that threw would be invisible here — which is the
  // failure mode § 8.1's nine templates exist to make impossible.
  app = await build({ logger: false });
});

afterEach(async () => {
  await app?.close();
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
});

afterAll(() => {
  delete process.env.FIXED_NOW;
});

// --- helpers --------------------------------------------------------------------------------------

function countingLog(): SchedulerLog & { counts: { info: number; warn: number; error: number } } {
  const counts = { info: 0, warn: 0, error: 0 };
  return {
    counts,
    info: () => void (counts.info += 1),
    warn: () => void (counts.warn += 1),
    error: () => void (counts.error += 1),
  };
}

async function outboxOverHttp(): Promise<OutboxEntry[]> {
  const res = await app.inject({ method: 'GET', url: '/api/test/outbox' });
  expect(res.statusCode).toBe(200);
  return (res.json() as { messages: OutboxEntry[] }).messages;
}

/** Every `session-24h` row in § 8.5's ledger, which is the gate the dispatch is driven from. */
async function ledgerFor(job: string): Promise<{ key: string; sentAt: number }[]> {
  const db = await testDatabase();
  const rows = await db
    .select({ key: jobRuns.key, sentAt: jobRuns.sentAt })
    .from(jobRuns)
    .where(eq(jobRuns.job, job));
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * `sessionAudience` for Session 3, spelled out from the rule's parts rather than imported, so the
 * expectation and the implementation are not one expression evaluated twice.
 */
function eligibleFor(db: Db, sessionId: string) {
  const session = db.sessions.find((s) => s.id === sessionId)!;
  const employee = moduleForSession(db, session);
  const cohort = db.cohorts.find((c) => c.id === session.cohortId)!;
  expect(cohort.status, 'the cohort must be under way or no reminder is owed at all').toBe('live');
  return db.users.filter(
    (u) =>
      u.cohortId === session.cohortId &&
      u.status !== 'invited' &&
      !!u.email &&
      (!employee || canAccess(u, employee)),
  );
}

// --------------------------------------------------------------------------------------------------

describe('Gate 8 · the scheduler sends Session 3’s 24-hour reminder once, to each eligible learner @g8', () => {
  it('2026-12-08T13:00 CT IS `dec26-s3.start - 24 h`, which is why the checklist names it @g8', async () => {
    const db = await loadDb();
    const s3 = db.sessions.find((s) => s.id === 'dec26-s3');
    expect(s3, 'dec26-s3 must exist in the live seed').toBeDefined();
    // The move: `start` is already December 9 and `movedFrom` is the old December 8 instant. A
    // reader who has those backwards concludes this file's instant is the session's own start.
    expect(s3!.start).toBe(Date.parse('2026-12-09T13:00:00-06:00'));
    expect(s3!.movedFrom).toBe(Date.parse('2026-12-08T13:00:00-06:00'));
    expect(NOW).toBe(s3!.start - 24 * HOUR);
    // Session 4 is a day later, so its own 24-hour window has not opened. That is what keeps this
    // tick to one session and lets the outbox be asserted whole.
    expect(db.sessions.find((s) => s.id === 'dec26-s4')!.start).toBe(s3!.start + 24 * HOUR);
  });

  it('one tick mails § 8.1’s exact subject to all fourteen eligible learners, and records fourteen keys @g8', async () => {
    const db = await loadDb();
    const eligible = eligibleFor(db, 'dec26-s3');
    // Stated, not only derived: if a seed change moves this number the test should say so here
    // rather than quietly agree with itself on both sides.
    expect(eligible).toHaveLength(14);

    const log = countingLog();
    const run = await runScheduledJobs({ log });

    expect(run.ran).toBe(true);
    // § 7.7's clock reached the job. `runScheduledJobs` takes no `now` parameter on purpose, so
    // this is the only place the pinned instant is observable from outside.
    expect(run.now).toBe(NOW);
    expect(run.candidates).toBe(eligible.length);
    expect(run.skipped).toBe(0);
    expect(run.sent).toBe(eligible.length);
    expect(run.failed).toBe(0);
    expect(log.counts.error).toBe(0);
    expect(log.counts.warn).toBe(0);

    // § 8.5's example key, verbatim: `session-24h:dec26-s3:u_jamie` is one of these fourteen.
    const expectedKeys = eligible.map((u) => `session-24h:dec26-s3:${u.id}`).sort();
    expect([...run.recorded].sort()).toEqual(expectedKeys);
    expect(expectedKeys).toContain('session-24h:dec26-s3:u_jamie');

    // The ledger as Postgres actually holds it, with `job` derived from the key (`keys.ts`'s rule)
    // and `sent_at` as epoch ms (`schema.ts`'s bigint rule) rather than a driver `Date`.
    const ledger = await ledgerFor('session-24h');
    expect(ledger.map((r) => r.key)).toEqual(expectedKeys);
    for (const row of ledger) expect(row.sentAt).toBe(NOW);

    const messages = await outboxOverHttp();
    expect(messages).toHaveLength(eligible.length);
    for (const m of messages) {
      expect(m.template).toBe('session-24h');
      expect(m.subject).toBe(SUBJECT);
      // A rendered body, so a template that threw is a failure here rather than an empty inbox in
      // production. `transport.ts` leaves `html: null` when no renderer is registered.
      expect(m.html).toBeTruthy();
    }
    expect(messages.map((m) => m.to).sort()).toEqual(eligible.map((u) => u.email).sort());
  });

  it('running it twice sends nothing new, and the ledger is what makes that true @g8', async () => {
    const first = await runScheduledJobs({ log: countingLog() });
    expect(first.sent).toBe(14);
    const afterFirst = await outboxOverHttp();
    const ledgerAfterFirst = await ledgerFor('session-24h');

    const second = await runScheduledJobs({ log: countingLog() });
    expect(second.ran).toBe(true);

    // THE OBSERVABLE FIRST, the bookkeeping after. Gate 8's "sends nothing new" is a statement
    // about inboxes, so the assertion that should name the failure is the one about inboxes —
    // measured: with both of `scheduler.ts`'s defences disabled this reads 28 instead of 14, and
    // asserting `skipped` first would have reported "expected 0 to be 14" for the same bug.
    expect(await outboxOverHttp()).toHaveLength(afterFirst.length);
    expect(second.sent).toBe(0);
    expect(second.failed).toBe(0);
    expect(second.recorded).toEqual([]);
    // No new rows and no rewritten `sent_at`: `on conflict do nothing`, not an upsert.
    expect(await ledgerFor('session-24h')).toEqual(ledgerAfterFirst);

    // The window is still open — the same fourteen are still CANDIDATES — and the ledger is the
    // only reason none of them is sent. A test that merely asserted an empty second run could pass
    // because the window had closed, which would prove nothing about idempotence. `skipped` is the
    // half that catches the `keysAlreadyIn` read being removed on its own, which `scheduler.ts`'s
    // header says is otherwise visible only as a warning.
    expect(second.candidates).toBe(14);
    expect(second.skipped).toBe(14);
  });

  it('emptying `job_runs` makes the same tick send again, which is the ledger doing the work @g8', async () => {
    // This is the positive control for the test above. Without it, "running it twice sends nothing
    // new" is consistent with a scheduler that computed nothing on either run — so the suite would
    // be green for a `dueWork` that had stopped proposing Session 3 altogether.
    const first = await runScheduledJobs({ log: countingLog() });
    expect(first.sent).toBe(14);

    const db = await testDatabase();
    await db.delete(jobRuns).where(eq(jobRuns.job, 'session-24h'));
    resetOutbox();

    const again = await runScheduledJobs({ log: countingLog() });
    expect(again.skipped).toBe(0);
    expect(again.recorded).toHaveLength(14);
    expect(again.sent).toBe(14);
    expect(await outboxOverHttp()).toHaveLength(14);
  });
});
