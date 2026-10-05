// Gate 8's second automated line — phase 08 § 8.1's `announcement` row and § 8.5's
// `scheduledAnnouncements`.
//
//   "A `sendAnnouncement` with the email channel and `audience: 'team'` sends to Team-tier learners
//    only. In-app-only sends no email."
//
// ================================================================================================
// WHICH PATH ACTUALLY CARRIES THE EMAIL, AND THE GAP THAT FORCED THIS FILE TO CHOOSE
// ================================================================================================
// § 8.1's table says the `announcement` template is triggered by "`sendAnnouncement` with the
// `email` channel (now or scheduled)". MEASURED: only the SCHEDULED half has a sender.
//
//   `packages/core/src/mutations.ts` › `sendAnnouncement` returns `{ db, toast }` and NO `effects`
//   array at all — grep it: the function has no `effects` key on either branch. So
//   `routes/mutate.ts` › `dispatchEffects` is handed nothing, for `when: 'now'` as much as for
//   `when: 'later'`.
//
//   `apps/api/src/jobs/due.ts` › `scheduledAnnouncements` is the only producer of an
//   `announcement` send anywhere in the repository, and it filters
//   `a.status === 'scheduled' && now >= a.at`. A `when: 'now'` announcement is written with
//   `status: 'sent'`, so it is never a candidate.
//
// Net effect, and it is reported rather than fixed (core is not this sprint's to edit, D-022): an
// admin who picks "Send Now" with the Email channel gets the toast, gets the banner, and nobody
// gets an email. The last test in this file pins the MECHANISM of that gap — not its emptiness —
// so that closing it does not turn a green suite red: see its own comment.
//
// So Gate 8's line is exercised through the path that sends, which is a scheduled announcement
// whose `at` has arrived, driven by one `runScheduledJobs()` tick. That is also the more demanding
// reading: it crosses mutation → row → scheduler → ledger → transport → outbox, five components
// and four seams, and it is the only test in the repository that does.
//
// ================================================================================================
// WHY THE INSTANT IS 09:00 AND NOT GATE 8's 13:00
// ================================================================================================
// At `2026-12-08T13:00 CT` the scheduler also owes fourteen `session-24h` sends for Session 3 (that
// is § 8.5's own checklist line, covered in `session-reminder.test.ts`). Four hours earlier NOTHING
// else is due — measured against every window in `due.ts`:
//
//   session-24h  s3's window opens at 13:00 that day; s4's a day later        → not yet
//   session-1h   nothing starts within the hour                                → no
//   replay-ready s1/s2 ended Dec 1 and Dec 3; the window is `end + 1 day`      → closed
//   build-48h    the same two, `end + 48 h + 1 day`                            → closed
//   weekly-digest`rm5` is seeded OFF, and `toggleOn` filters it in both passes  → off
//   announcement the seed's only scheduled one, `a3`, is `at` Dec 11 08:00      → not yet
//
// so the announcement under test is the ONLY candidate and the assertions can be about the whole
// outbox rather than a filtered slice. The filter is applied anyway, because an assertion that
// depends on that table staying true is an assertion that breaks for an unrelated reason.
//
// ================================================================================================
// WHAT "ONLY" IS MEASURED AGAINST, AND THE SEAT THAT HAD TO BE PLANTED
// ================================================================================================
// `audience: 'team'` is `inAudience`'s `a.audience === u.tier`, and `due.ts` applies `mailable` on
// top of it — `status !== 'invited'` and a non-blank address. The seed has no invited learner at
// all, so "Team tier but not yet a learner" cannot be expressed with it and the one case that
// distinguishes the two halves of the rule would be untested. `PENDING_SEAT` below is Team tier ON
// PURPOSE: if `mailable` were dropped from this job that seat would receive the email, and its
// absence from the recipient set is the only thing that notices.
//
// The reason it matters is § 8.5's own: the banner and the email are two channels of ONE
// announcement. `scope.ts` › `forAudience` decides the banner, and an `invited` seat has no session
// and therefore no banner. A learner on the email list but not the banner list (or the reverse) is
// a bug nobody reports, because each half looks right from its own side.
//
// ================================================================================================
// TIME ZONES
// ================================================================================================
// No assertion in this file reads a rendered date. The `announcement` template interpolates
// `{title}`, `{body}` and the action label, none of which is an instant, and the subject IS the
// title (§ 8.1). The admin toast IS zone-dependent and is deliberately NOT asserted: for
// `when: 'later'` it is `Scheduled for ${fmt.day(at)}`, and `fmt.day` resolves through
// `viewerZone()`, which on the server falls back to the API HOST's zone — so its text differs
// between this machine and a UTC runner. That is a real divergence in admin-visible copy and it is
// in the report; pinning it here would mean a suite that passes in one zone and fails in the other,
// which is exactly what the two-zone run exists to prevent.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedForDatabase } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { build } from '../../src/app';
import type { App } from '../../src/app';
import { runScheduledJobs } from '../../src/jobs/scheduler';
import type { SchedulerLog } from '../../src/jobs/scheduler';
import { resetOutbox } from '../../src/email/transport';
import type { OutboxEntry } from '../../src/email/transport';
import { loadDb, resetDatabase, testDatabase } from '../helpers';

/** Four hours before Gate 8's scheduler instant, where nothing else is due. See the header. */
const NOW_ISO = '2026-12-08T09:00:00-06:00';
/** The composer's `datetime-local` value for that instant: `sendAnnouncement` reads it as CT. */
const AT_CT = '2026-12-08T09:00';

const APP_URL = 'https://learn.example.com';

/** `st1` Casey Lin, role Owner — the seed's `perms` give Owner `announce: 1`. */
const ANNOUNCER = 'st1';

/**
 * A Team-tier seat that was invited and never accepted. See the header: the seed cannot express it,
 * and it is the one input that tells `inAudience` and `mailable` apart.
 */
const PENDING_SEAT: Learner = {
  id: 'u_pending',
  name: 'Tess Okafor',
  email: 'tess@northlinerealty.com',
  tier: 'team',
  role: 'Sales Agent',
  teamId: 'northline',
  cohortId: 'dec26',
  joined: Date.parse('2026-12-07T09:00:00-06:00'),
  last: null,
  status: 'invited',
  progress: {},
};

const ANNOUNCEMENT = {
  title: 'Bring your CRM export to Session 3',
  body: 'Clean the file first: remove duplicates and anything without a last-touch date.',
} as const;

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
  await resetDatabase(withPendingSeat());
  // `build()` registers the real renderer (`setRenderer(renderTemplate)`), which is why the tick
  // below produces bodies rather than nine `{ ok: false }` results. Per test, for the rate-limit
  // store — see `test/routes.test.ts`.
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

// --- fixtures -------------------------------------------------------------------------------------

/** The `'live'` seed plus the invited Team-tier seat. */
function withPendingSeat(): Db {
  const db = seedForDatabase('live');
  db.users.push(structuredClone(PENDING_SEAT));
  return db;
}

/**
 * Who § 8.1 says an `audience: 'team'` email is for, derived from the seed rather than listed.
 *
 * `inAudience` ∧ `mailable`, spelled out from the rule's two halves so that the expectation and the
 * implementation are not the same expression: Team tier, and a seat that has accepted.
 */
function expectedRecipients(db: Db): string[] {
  return db.users.filter((u) => u.tier === 'team' && u.status !== 'invited' && u.email).map((u) => u.email);
}

/** A logger that counts rather than printing: a tick logs a line per run and nobody reads it. */
function countingLog(): SchedulerLog & { counts: { info: number; warn: number; error: number } } {
  const counts = { info: 0, warn: 0, error: 0 };
  return {
    counts,
    info: () => void (counts.info += 1),
    warn: () => void (counts.warn += 1),
    error: () => void (counts.error += 1),
  };
}

// --- helpers --------------------------------------------------------------------------------------

const mutate = (cookie: string, name: string, args: unknown) =>
  app.inject({
    method: 'POST',
    url: `/api/mutate/${name}`,
    headers: { cookie, 'content-type': 'application/json' },
    payload: args as object,
  });

/** The outbox through § 7.7's route, which awaits `settleEmails()` first. */
async function outboxOverHttp(): Promise<OutboxEntry[]> {
  const res = await app.inject({ method: 'GET', url: '/api/test/outbox' });
  expect(res.statusCode).toBe(200);
  return (res.json() as { messages: OutboxEntry[] }).messages;
}

/**
 * Compose one announcement through the real route, and return the row the mutation wrote.
 *
 * Found by title rather than by reconstructing `ctx.id('a')`: the id is deterministic under
 * `FIXED_NOW` (§ 7.7) but reproducing the generator here would couple this file to the id shape for
 * no gain, and the title is what the admin typed.
 */
async function compose(channels: { inapp: boolean; email: boolean }, when: 'now' | 'later') {
  const cookie = await app.signInAs(ANNOUNCER);
  const res = await mutate(cookie, 'sendAnnouncement', {
    ...ANNOUNCEMENT,
    audience: 'team',
    inapp: channels.inapp,
    email: channels.email,
    when,
    ...(when === 'later' ? { at: AT_CT } : {}),
  });
  expect(res.statusCode, res.body).toBe(200);

  const db = await loadDb();
  const row = db.announcements.find((a) => a.title === ANNOUNCEMENT.title);
  expect(row, 'sendAnnouncement must have written the row').toBeDefined();
  return { db, row: row! };
}

// --------------------------------------------------------------------------------------------------

describe('Gate 8 · a scheduled announcement emails its audience and nobody else @g8', () => {
  it('audience "team" + the email channel reaches every active Team-tier learner, exactly once each @g8', async () => {
    const { db, row } = await compose({ inapp: false, email: true }, 'later');
    expect(row.channels).toEqual(['email']);
    expect(row.status).toBe('scheduled');
    expect(row.at).toBe(Date.parse('2026-12-08T09:00:00-06:00'));

    const log = countingLog();
    const run = await runScheduledJobs({ log });
    expect(run.ran).toBe(true);
    expect(log.counts.error).toBe(0);

    const recipients = expectedRecipients(db);
    // Nine Team-tier seats in the seed; stated so a seed change that alters the audience shows up
    // as this number rather than as a silent re-derivation of both sides from the same filter.
    expect(recipients).toHaveLength(9);

    // § 8.5's ledger: one row per recipient, keyed `announcement:<id>:<learner>` (`keys.ts`). The
    // ledger is the DISPATCH GATE, not a log of it (`scheduler.ts`'s header), so asserting it is
    // asserting who was allowed to be mailed.
    const expectedKeys = db.users
      .filter((u) => recipients.includes(u.email))
      .map((u) => `announcement:${row.id}:${u.id}`);
    expect([...run.recorded].sort()).toEqual([...expectedKeys].sort());
    expect(run.sent).toBe(recipients.length);
    expect(run.failed).toBe(0);

    const messages = await outboxOverHttp();
    const sentTo = messages.filter((m) => m.template === 'announcement').map((m) => m.to);
    expect([...sentTo].sort()).toEqual([...recipients].sort());
    // "ONLY": no Agent-tier learner, and no invited Team-tier seat. Asserted as set DIFFERENCE
    // rather than by listing the five agents, so a new learner in the seed is covered too.
    const everyoneElse = db.users.filter((u) => !recipients.includes(u.email)).map((u) => u.email);
    for (const address of everyoneElse) expect(sentTo).not.toContain(address);
    // The planted seat is Team tier, so it is excluded by `status`, not by `tier` — the one thing
    // this fixture exists to prove. See the header.
    expect(PENDING_SEAT.tier).toBe('team');
    expect(sentTo).not.toContain(PENDING_SEAT.email);

    // § 8.1: "the announcement's subject IS its title", with no prefix of ours.
    for (const m of messages.filter((x) => x.template === 'announcement')) {
      expect(m.subject).toBe(ANNOUNCEMENT.title);
    }

    // § 8.5: "flips `status: 'scheduled' → 'sent'` at `at`. The in-app banner appears from that
    // moment". The flip and the mail are one event, so the flip is asserted in the same test.
    expect(run.flipped).toEqual([row.id]);
    const after = await loadDb();
    expect(after.announcements.find((a) => a.id === row.id)?.status).toBe('sent');
  });

  it('a second tick mails nobody a second time, and re-flips nothing @g8', async () => {
    const { db, row } = await compose({ inapp: false, email: true }, 'later');

    const first = await runScheduledJobs({ log: countingLog() });
    expect(first.sent).toBe(expectedRecipients(db).length);
    const afterFirst = (await outboxOverHttp()).length;

    const second = await runScheduledJobs({ log: countingLog() });
    expect(second.ran).toBe(true);
    // Nothing is even a CANDIDATE the second time: the flip moved the row out of
    // `status === 'scheduled'`, so `scheduledAnnouncements` no longer proposes it. The `job_runs`
    // unique `(job, key)` is the second, independent defence and `session-reminder.test.ts` is
    // where it is exercised on its own.
    expect(second.recorded).toEqual([]);
    expect(second.sent).toBe(0);
    expect(second.flipped).toEqual([]);
    expect(await outboxOverHttp()).toHaveLength(afterFirst);
    expect((await loadDb()).announcements.find((a) => a.id === row.id)?.status).toBe('sent');
  });

  it('in-app only sends no email, while still raising the banner @g8', async () => {
    const { row } = await compose({ inapp: true, email: false }, 'later');
    expect(row.channels).toEqual(['inapp']);

    const run = await runScheduledJobs({ log: countingLog() });
    expect(run.ran).toBe(true);
    // The channel array is the switch — `due.ts`: `if (!a.channels.includes('email')) continue`.
    // Nothing recorded means nothing was even claimed, so this is not "the mail failed quietly".
    expect(run.recorded).toEqual([]);
    expect(run.sent).toBe(0);
    expect(await outboxOverHttp()).toHaveLength(0);

    // But the banner DOES appear: § 8.5 makes the flip unconditional on the channel, and the flip
    // is what `scope.ts` › `forAudience` reads (`a.status === 'sent'`). An in-app-only announcement
    // that never flipped would be an announcement nobody ever sees at all.
    expect(run.flipped).toEqual([row.id]);
    expect((await loadDb()).announcements.find((a) => a.id === row.id)?.status).toBe('sent');
  });

  it('a "Send Now" announcement is never a scheduler candidate — § 8.1’s "now" half has no sender @g8', async () => {
    // RECORDED GAP, NOT A CONTRACT. See the header: `sendAnnouncement` returns no `effects`, so the
    // mutation cannot mail anything, and this is the OTHER half of why the "now" path is silent —
    // the only producer of an `announcement` send filters on `status === 'scheduled'`.
    //
    // The assertion is deliberately about the MECHANISM and not about an empty outbox. Whoever
    // closes the gap will do it by giving the mutation an email effect (the § 8.1 table's own
    // reading, and D-022's list of files), and that leaves this assertion true: a `sent`
    // announcement still must not be re-mailed by a tick, or every admin "Send Now" would be
    // mailed twice. An `expect(outbox).toHaveLength(0)` here would have gone red on the fix.
    const { row } = await compose({ inapp: true, email: true }, 'now');
    expect(row.status).toBe('sent');
    expect(row.channels).toEqual(['inapp', 'email']);

    const run = await runScheduledJobs({ log: countingLog() });
    expect(run.ran).toBe(true);
    expect(run.recorded.filter((key) => key.startsWith(`announcement:${row.id}:`))).toEqual([]);
    expect(run.flipped).not.toContain(row.id);
  });
});
