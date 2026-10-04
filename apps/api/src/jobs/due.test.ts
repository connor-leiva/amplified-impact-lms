// What the scheduler owes at a given instant — phase 08 § 8.5.
//
// The Gate 8 checklist's own line is the first test in this file: "The scheduler at
// `2026-12-08T13:00 CT` sends `session-24h` for Session 3 to each eligible learner once. Running it
// twice sends nothing new." Everything after it is one of the three ways that sentence can be true
// of a broken scheduler:
//
//   - it can send to the wrong people (an invitee who never joined, a learner in February's
//     cohort, an Agent-tier learner invited to a Team-only session, a completed cohort);
//   - it can send when it should not (a window that has not opened, a switch that is off);
//   - it can send once and then never again — the 60-second window that a 61-second-late tick
//     steps straight over, which drops a whole day of reminders and fails nothing.
//
// Every instant is built with `fmt.fromCT`, the same Central-Time reader `@ai/core`'s seed uses, so
// a test instant and a seeded session instant cannot be a DST hour apart by accident.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fmt, seed, setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import { NO_KEYS, dueWork } from './due';
import type { Send, ZoneLookup } from './due';
// The templates, imported BY THE JOBS' OWN TEST on purpose. A `Send`'s `data` is handed to
// `transport.send` untouched and from there straight to this renderer, so "does the scheduler build
// a payload this template can render" is a question only these two files together can answer — and
// it is the question three of the five jobs got wrong while `tsc --noEmit` stayed green.
import { renderEmail } from '../email/templates';
import type { EmailPayload } from '../email/templates';
import { SUBJECTS } from '../email/subjects';
import type { TemplateName } from '../email/subjects';

const MINUTE = 60e3;
const HOUR = 3600e3;

const db = seed('live');

/** A copy to bend. `dueWork` is pure, so every scenario gets its own db rather than a restore. */
const variant = (change: (d: Db) => void): Db => {
  const copy = structuredClone(db);
  change(copy);
  return copy;
};

const at = (date: string, time: string): number => fmt.fromCT(date, time);

const sessionOf = (id: string) => db.sessions.find((s) => s.id === id)!;

const keys = (sends: readonly Send[]): string[] => sends.map((s) => s.key);
const recipients = (sends: readonly Send[]): string[] => sends.map((s) => s.key.split(':')[2]!);
/**
 * The key's middle segment: which session, week or announcement a send is about.
 *
 * Read off the KEY rather than out of `data`, because `data` is now exactly the template's payload
 * and nothing else — § 8.5's own example key is `session-24h:dec26-s3:u_jamie`, so the scope is
 * already recorded where the scheduler records things, and a `sessionId` in the email payload was
 * one of the extra fields that let three payloads go missing the fields that matter. See `Send`.
 */
const scopeOf = (s: Send): string => s.key.split(':')[1]!;
const scopes = (sends: readonly Send[]): string[] => sends.map(scopeOf);

/**
 * One send's payload, narrowed to the template it names.
 *
 * `Send` is a discriminated union over `template` and each arm's `data` is a different shape, so
 * `s.data.n` does not typecheck until the template is known — which is the tightened
 * `EmailData<K>` doing its job. The `expect` is what makes the cast honest: a send of the wrong
 * template fails the test here rather than reading a field off the wrong payload.
 */
function dataOf<K extends TemplateName>(s: Send, template: K): EmailPayload<K> {
  expect(s.template, `expected a ${template} send, got ${s.template}`).toBe(template);
  return s.data as EmailPayload<K>;
}
/** Every job that produced a send, with how many — the shape of a whole run in one object. */
const byJob = (sends: readonly Send[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const s of sends) out[s.job] = (out[s.job] ?? 0) + 1;
  return out;
};

/** The 14 modelled learners of the December cohort, in `db.users` order. */
const EVERYONE = db.users.map((u) => u.id);
/** Team tier: who Session 4's Team-only Meetings AI Employee is for. */
const TEAM_TIER = db.users.filter((u) => u.tier === 'team').map((u) => u.id);
const OWNERS = db.users.filter((u) => u.role === 'Team Owner').map((u) => u.id);

// ---------------------------------------------------------------------------
// 1. The Gate 8 case, verbatim
// ---------------------------------------------------------------------------

const S3 = sessionOf('dec26-s3');
const GATE_NOW = at('2026-12-08', '13:00');

describe('Gate 8 · the scheduler at 2026-12-08T13:00 CT @g8', () => {
  it('is reading the instant the checklist means: 24 h before Session 3 @g8', () => {
    // The checklist's instant and the seeded session have to be the pair the test thinks they are.
    // Session 3 was MOVED in the seed (`movedFrom: 2026-12-08T13:00`), so the naive reading of
    // "Session 3 starts the day after Dec 8" is true of the old date too — this pins the new one.
    expect(S3.start).toBe(at('2026-12-09', '13:00'));
    expect(GATE_NOW).toBe(S3.start - 24 * HOUR);
    expect(S3.n).toBe(3);
    expect(S3.title).toBe('The Living Database');
  });

  const run = dueWork(db, GATE_NOW, NO_KEYS);

  it('sends session-24h for Session 3 to each eligible learner once @g8', () => {
    expect(byJob(run.sends)).toEqual({ 'session-24h': EVERYONE.length });
    // Session 3 teaches the Database AI Employee, which is Agent tier, so the whole cohort is
    // eligible — one send each, nobody twice.
    expect(keys(run.sends)).toEqual(EVERYONE.map((id) => `session-24h:dec26-s3:${id}`));
    expect(new Set(keys(run.sends)).size).toBe(run.sends.length);
    expect(run.sends.map((s) => s.to)).toEqual(db.users.map((u) => u.email));
    expect(run.flip).toEqual([]);
  });

  it('carries everything § 8.1 interpolates into the subject @g8', () => {
    // "Tomorrow: Session {n} · {title}". A reminder with the wrong `n` is worse than none.
    for (const s of run.sends) {
      const data = dataOf(s, 'session-24h');
      expect(data.n).toBe(3);
      expect(data.title).toBe('The Living Database');
      expect(data.start).toBe(S3.start);
      // § 8.1's zone field is PRESENT on every session reminder, as an explicit `null` when no
      // zone was supplied. Absent and null mean the same thing to the template (both fall back to
      // CT) but not to a reader of this code: the job used to omit the key entirely, which read as
      // "every learner is Central" by accident rather than on purpose. See `dueWork`'s `zones`.
      expect(data).toHaveProperty('zone');
      expect(data.zone).toBeNull();
    }
  });

  it('sends nothing new when it runs again with those keys recorded @g8', () => {
    const sent = new Set(keys(run.sends));
    expect(dueWork(db, GATE_NOW, sent).sends).toEqual([]);
    // And on the next tick a minute later, which is what "runs again" actually looks like.
    expect(dueWork(db, GATE_NOW + MINUTE, sent).sends).toEqual([]);
    // Still nothing most of a day later, with the window still open.
    expect(dueWork(db, GATE_NOW + 22 * HOUR, sent).sends).toEqual([]);
  });

  it('sends only the one learner who was missed when a run half-finished @g8', () => {
    // A crash after 13 of the 14 inserts. The 14th is owed; the other 13 are not.
    const sent = new Set(keys(run.sends).slice(0, 13));
    const resumed = dueWork(db, GATE_NOW + MINUTE, sent);
    expect(keys(resumed.sends)).toEqual([`session-24h:dec26-s3:${EVERYONE[13]}`]);
  });
});

// ---------------------------------------------------------------------------
// 2. Windows
// ---------------------------------------------------------------------------

describe('§8.5 windows @g8', () => {
  it('produces nothing before the window opens @g8', () => {
    const early = dueWork(db, GATE_NOW - MINUTE, NO_KEYS);
    expect(early.sends).toEqual([]);
    expect(early.flip).toEqual([]);
  });

  it('still fires when the tick is a minute late @g8', () => {
    // THE bug this window shape exists to prevent. A scheduler that only fires inside a 60 s
    // window around `start - 24h` finds the moment gone and never tells anyone: no error, no row,
    // no send, and the only evidence is fourteen empty inboxes. The window therefore stays OPEN
    // from its moment, and idempotence — not the width of the window — is what sends once.
    expect(keys(dueWork(db, GATE_NOW + MINUTE, NO_KEYS).sends)).toEqual(keys(dueWork(db, GATE_NOW, NO_KEYS).sends));
  });

  it('still fires after an outage of hours @g8', () => {
    for (const late of [5 * MINUTE, HOUR, 12 * HOUR, 22 * HOUR]) {
      expect(byJob(dueWork(db, GATE_NOW + late, NO_KEYS).sends)).toEqual({ 'session-24h': 14 });
    }
  });

  it('hands over to session-1h an hour before the session @g8', () => {
    // The 24 h window closes where the 1 h window opens: no gap (a reminder cannot fall between
    // them) and no overlap (nobody gets "Tomorrow" and "Starting in 1 hour" in the same minute).
    const handover = S3.start - HOUR;
    expect(byJob(dueWork(db, handover - MINUTE, NO_KEYS).sends)).toEqual({ 'session-24h': 14 });
    expect(byJob(dueWork(db, handover, NO_KEYS).sends)).toEqual({ 'session-1h': 14 });
    expect(keys(dueWork(db, handover, NO_KEYS).sends)).toEqual(EVERYONE.map((id) => `session-1h:dec26-s3:${id}`));
  });

  it('stops reminding once the session has begun @g8', () => {
    // Both windows are closed at `start`: a "starting in 1 hour" email during the session is worse
    // than silence. Filtered to Session 3, because Session 3 starting is also the moment Session
    // 4's own 24 h window opens — which is the next test.
    const aboutS3 = (now: number) => dueWork(db, now, NO_KEYS).sends.filter((s) => scopeOf(s) === 'dec26-s3');
    expect(aboutS3(S3.start)).toEqual([]);
    expect(aboutS3(S3.start + MINUTE)).toEqual([]);
    expect(aboutS3(S3.start + S3.mins * MINUTE)).toEqual([]);
  });

  it('keeps two sessions apart in one tick @g8', () => {
    // Session 3 begins at the same instant Session 4 moves 24 h out. Two jobs, two sessions, one
    // tick: the keys differ in the scope segment, so neither suppresses the other.
    const run = dueWork(db, sessionOf('dec26-s4').start - 24 * HOUR, NO_KEYS);
    expect(new Set(scopes(run.sends))).toEqual(new Set(['dec26-s4']));
    expect(byJob(run.sends)).toEqual({ 'session-24h': TEAM_TIER.length });
  });

  it('does not remind about a session an admin took live early @g8', () => {
    // `live: true` before the scheduled start is the States-sheet case and a real one: Go Live is a
    // manual button. `sessionState` says 'live', so "Tomorrow:" would be false.
    const early = variant((d) => {
      d.sessions.find((s) => s.id === 'dec26-s3')!.live = true;
    });
    expect(dueWork(early, GATE_NOW, NO_KEYS).sends).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. The Automated Reminders toggles
// ---------------------------------------------------------------------------

describe('§8.5 reminder toggles @g8', () => {
  it('wires each job to the switch whose label describes it @g8', () => {
    // `due.ts` keys the toggles by id because labels are editable copy. That makes renumbering the
    // seed a silent re-wiring, so the pairing is asserted here instead: rm1 must still be the
    // 24-hour switch.
    const label = (id: string): string => db.reminders.find((r) => r.id === id)!.label;
    expect(label('rm1')).toMatch(/^24 hours before/);
    expect(label('rm2')).toMatch(/^1 hour before/);
    expect(label('rm3')).toMatch(/^Replay is ready/);
    expect(label('rm4')).toMatch(/48 hours after/);
    expect(label('rm5')).toMatch(/^Weekly progress digest/);
  });

  it('suppresses a job whose switch is off @g8', () => {
    const off = variant((d) => {
      d.reminders.find((r) => r.id === 'rm1')!.on = false;
    });
    expect(dueWork(off, GATE_NOW, NO_KEYS).sends).toEqual([]);
    // Only its own job: the 1 h reminder (rm2) is untouched by rm1 being off.
    expect(byJob(dueWork(off, S3.start - HOUR, NO_KEYS).sends)).toEqual({ 'session-1h': 14 });
  });

  it('treats a missing switch as off @g8', () => {
    // A `reminders` table missing a row is a database nobody designed. Sending to a whole cohort
    // on the strength of an absent config is the expensive way to be wrong.
    const gone = variant((d) => {
      d.reminders = d.reminders.filter((r) => r.id !== 'rm1');
    });
    expect(dueWork(gone, GATE_NOW, NO_KEYS).sends).toEqual([]);
  });

  it('sends no weekly digest, because rm5 ships off @g8', () => {
    // The one switch the seed has OFF (`{ id: 'rm5', …, on: false }`). Monday 08:00 CT is exactly
    // when the digest would go out, so this instant is the one that proves the gate works.
    const monday = at('2026-12-07', '08:00');
    expect(dueWork(db, monday, NO_KEYS).sends).toEqual([]);
  });

  it('sends one digest per team owner for the week, once rm5 is on @g8', () => {
    const on = variant((d) => {
      d.reminders.find((r) => r.id === 'rm5')!.on = true;
    });
    const monday = at('2026-12-07', '08:00');
    const run = dueWork(on, monday, NO_KEYS);
    expect(byJob(run.sends)).toEqual({ 'weekly-digest': OWNERS.length });
    // Keyed by the Monday it covers, not by the instant it was sent — which is what lets the
    // window be a week wide and still produce one digest per week.
    expect(keys(run.sends)).toEqual(OWNERS.map((id) => `weekly-digest:2026-12-07:${id}`));
    // One per TEAM, which is what three distinct owners of three distinct teams means. This used
    // to read the team name out of `data`; § 8.1's `weekly-digest` template declares no body
    // fields at all (its subject interpolates nothing and its button goes to `/team`), so the
    // payload is `{}` and the name is no longer there to read. The address is the honest check of
    // "the right owner of the right team", and `teams` is asserted non-empty per owner by the job.
    expect(run.sends.map((s) => s.to)).toEqual(
      OWNERS.map((id) => db.users.find((u) => u.id === id)!.email),
    );
    expect(new Set(OWNERS.map((id) => db.users.find((u) => u.id === id)!.teamId)).size).toBe(3);
    for (const s of run.sends) expect(dataOf(s, 'weekly-digest')).toEqual({});
  });

  it('does not send the digest before Monday 08:00, or twice in one week @g8', () => {
    const on = variant((d) => {
      d.reminders.find((r) => r.id === 'rm5')!.on = true;
    });
    const monday = at('2026-12-07', '08:00');
    const digests = (now: number, sent: ReadonlySet<string>): string[] =>
      keys(dueWork(on, now, sent).sends.filter((s) => s.job === 'weekly-digest'));
    expect(digests(monday - MINUTE, NO_KEYS)).toEqual([]);
    const sent = new Set(digests(monday, NO_KEYS));
    // Thursday of the same week: inside the window, same keys, nothing new. (Session 4's own 24 h
    // reminder is due that morning, which is why this looks at the digest sends only.)
    expect(digests(at('2026-12-10', '08:00'), sent)).toEqual([]);
    // The following Monday is a new week and a new key, so one more digest each.
    expect(digests(at('2026-12-14', '08:00'), sent)).toEqual(OWNERS.map((id) => `weekly-digest:2026-12-14:${id}`));
  });
});

// ---------------------------------------------------------------------------
// 4. Who is eligible
// ---------------------------------------------------------------------------

describe('§8.5 eligibility @g8', () => {
  it('skips a learner who has not accepted their invite @g8', () => {
    const invited = variant((d) => {
      d.users.find((u) => u.id === 'u_jamie')!.status = 'invited';
    });
    const run = dueWork(invited, GATE_NOW, NO_KEYS);
    expect(recipients(run.sends)).toEqual(EVERYONE.filter((id) => id !== 'u_jamie'));
  });

  it('skips a learner in another cohort @g8', () => {
    const moved = variant((d) => {
      d.users.find((u) => u.id === 'u_jamie')!.cohortId = 'feb27';
    });
    expect(recipients(dueWork(moved, GATE_NOW, NO_KEYS).sends)).toEqual(EVERYONE.filter((id) => id !== 'u_jamie'));
  });

  it('reminds only Team-tier learners about a Team-only session @g8', () => {
    // Session 4 teaches the Meetings AI Employee, which is Team tier. § 8.4 gives Jamie a 403 for
    // `dec26-s4`; a reminder for a session she cannot join would be the same leak by email.
    const s4 = sessionOf('dec26-s4');
    const run = dueWork(db, s4.start - 24 * HOUR, NO_KEYS);
    expect(byJob(run.sends)).toEqual({ 'session-24h': TEAM_TIER.length });
    expect(keys(run.sends)).toEqual(TEAM_TIER.map((id) => `session-24h:dec26-s4:${id}`));
    expect(recipients(run.sends)).not.toContain('u_jamie');
  });

  it('gates every send on the cohort being under way @g8', () => {
    const sendsWith = (status: Db['cohorts'][number]['status']): number =>
      dueWork(
        variant((d) => {
          d.cohorts.find((c) => c.id === 'dec26')!.status = status;
        }),
        GATE_NOW,
        NO_KEYS,
      ).sends.length;
    // A cohort still in draft has not been published to anyone; a completed one is over. One that
    // is enrolling has real sessions on real dates, so it does send.
    expect(sendsWith('draft')).toBe(0);
    expect(sendsWith('enrolling')).toBe(14);
    expect(sendsWith('live')).toBe(14);
    expect(sendsWith('completed')).toBe(0);
  });

  it('never addresses an email to an empty string @g8', () => {
    // The guard against being handed a SCOPED snapshot: `scopeSnapshot` blanks a teammate's email
    // for learners who may not see it. Sending to '' would write the idempotence key for that
    // learner and never retry; skipping leaves the key unwritten, so the next run repairs it.
    const scoped = variant((d) => {
      d.users.find((u) => u.id === 'u_priya')!.email = '';
    });
    const run = dueWork(scoped, GATE_NOW, NO_KEYS);
    expect(run.sends.map((s) => s.to)).not.toContain('');
    expect(recipients(run.sends)).toEqual(EVERYONE.filter((id) => id !== 'u_priya'));
  });
});

// ---------------------------------------------------------------------------
// 5. The replay and the 48-hour build reminder
// ---------------------------------------------------------------------------

describe('§8.5 replay-ready and build-48h @g8', () => {
  const S1 = sessionOf('dec26-s1');
  const S2 = sessionOf('dec26-s2');
  const BUSY = at('2026-12-03', '15:00');

  it('is reading an instant where both jobs are live @g8', () => {
    // Session 2 ended 45 minutes ago with its replay up; Session 1 ended 48 h ago.
    expect(S2.start + S2.mins * 60e3).toBe(at('2026-12-03', '14:15'));
    expect(S1.start + S1.mins * 60e3 + 48 * HOUR).toBe(at('2026-12-03', '14:15'));
    expect(S2.replay).toBe('ready');
  });

  it('announces a fresh replay and nudges the builds that are 48 h overdue @g8', () => {
    const run = dueWork(db, BUSY, NO_KEYS);
    expect(byJob(run.sends)).toEqual({ 'replay-ready': 14, 'build-48h': 4 });

    const replay = run.sends.filter((s) => s.job === 'replay-ready');
    expect(keys(replay)).toEqual(EVERYONE.map((id) => `replay-ready:dec26-s2:${id}`));
    const first = dataOf(replay[0]!, 'replay-ready');
    expect(first.n).toBe(2);
    expect(first.title).toBe('Speed to Lead');
    // The two fields § 8.1's `replay-ready` body and button are made of, which this job did not
    // send at all: `employee` was missing and `moduleId` was `m ? m.id : null`. Session 2 teaches
    // the Sales AI Employee, so the body reads "… are on the Sales AI Employee page" and the
    // `Watch Replay` button opens `/employees/sales`.
    expect(first.employee).toBe('Sales AI Employee');
    expect(first.moduleId).toBe('sales');

    const nudge = run.sends.filter((s) => s.job === 'build-48h');
    // Exactly the four learners who have not verified the Marketing build: Michael is on step 4,
    // Ben on step 2, Lena and Omar have not started. Everyone else deployed it.
    expect(recipients(nudge)).toEqual(['u_michael', 'u_lena', 'u_omar', 'u_ben']);
    expect(keys(nudge)).toEqual(['u_michael', 'u_lena', 'u_omar', 'u_ben'].map((id) => `build-48h:dec26-s1:${id}`));
    // § 8.1's subject is "Finish your {employee}", and the job is not the template: a manual Nudge
    // sends the same `build-reminder` and must not share this key.
    for (const s of nudge) {
      const data = dataOf(s, 'build-reminder');
      expect(data.employee).toBe('Marketing AI Employee');
      expect(data.moduleId).toBe('marketing');
    }

    // `steps` is the field the template requires and this job did not send ('"steps" must be a
    // finite number, got undefined'). It is the LEARNER's verified count, not the session number
    // the payload used to carry: Michael is 4 of 6, Ben 2 of 6, Lena and Omar 0 of 6 — which is
    // also what decides whether their button reads `Continue Build` or `Start Build`.
    expect(nudge.map((s) => dataOf(s, 'build-reminder').steps)).toEqual([4, 0, 0, 2]);
    for (const s of nudge) expect(dataOf(s, 'build-reminder').total).toBe(6);
  });

  it('does not announce a replay that went up a week ago @g8', () => {
    // Both December replays were ready long before the Gate 8 instant. Without an upper bound,
    // turning the scheduler on would email the whole cohort about every past session at once.
    expect(byJob(dueWork(db, GATE_NOW, NO_KEYS).sends)).toEqual({ 'session-24h': 14 });
  });

  it('says nothing while the replay is still processing @g8', () => {
    // `replay: null` is § 8.3's `ended_processing` card. There is nothing to link to yet, and the
    // window stays open for a day, so the next run after it lands still sends.
    const processing = variant((d) => {
      d.sessions.find((s) => s.id === 'dec26-s2')!.replay = null;
    });
    const run = dueWork(processing, BUSY, NO_KEYS);
    expect(byJob(run.sends)).toEqual({ 'build-48h': 4 });
  });

  it('does not nudge a build that is finished @g8', () => {
    const done = variant((d) => {
      const u = d.users.find((x) => x.id === 'u_michael')!;
      u.progress['marketing'] = { steps: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'], builtAt: BUSY, deployedAt: BUSY, runtime: 'deployed' };
    });
    const nudge = dueWork(done, BUSY, NO_KEYS).sends.filter((s) => s.job === 'build-48h');
    expect(recipients(nudge)).toEqual(['u_lena', 'u_omar', 'u_ben']);
  });

  it('announces no replay for a session with no AI Employee @g8', () => {
    // `moduleForSession` ignores drafts, so an admin who un-publishes the Sales AI Employee leaves
    // Session 2 with no module — and § 8.1's `replay-ready` is made of nothing but that module: the
    // body is "… are on the {employee} page" and the button opens `/employees/:id`.
    //
    // This job used to send `moduleId: m ? m.id : null` instead, which the template rejects
    // ('"moduleId" must be a string, got object') for the WHOLE audience: fourteen `{ok:false}`
    // results and fourteen empty inboxes, with the only trace in a log. Skipping leaves the
    // idempotence key unwritten, so publishing the AI Employee while the window is still open
    // makes the next tick send it properly — which the second half of this test is.
    const drafted = variant((d) => {
      d.modules.find((m) => m.id === 'sales')!.status = 'draft';
    });
    expect(byJob(dueWork(drafted, BUSY, NO_KEYS).sends)).toEqual({ 'build-48h': 4 });

    const republished = variant((d) => {
      d.modules.find((m) => m.id === 'sales')!.status = 'published';
    });
    const resumed = dueWork(republished, BUSY + HOUR, NO_KEYS).sends.filter((s) => s.job === 'replay-ready');
    expect(keys(resumed)).toEqual(EVERYONE.map((id) => `replay-ready:dec26-s2:${id}`));
  });
});

// ---------------------------------------------------------------------------
// 6. Scheduled announcements
// ---------------------------------------------------------------------------

describe('§8.5 scheduled announcements @g8', () => {
  // The seed's third announcement: 'Weekly team progress digest', audience 'owners', email only,
  // scheduled for 2026-12-11T08:00 CT.
  const A3 = db.announcements.find((a) => a.id === 'a3')!;
  const SEND_AT = at('2026-12-11', '08:00');

  it('is reading the seeded scheduled announcement @g8', () => {
    expect(A3.status).toBe('scheduled');
    expect(A3.at).toBe(SEND_AT);
    expect(A3.audience).toBe('owners');
    expect(A3.channels).toEqual(['email']);
  });

  it('leaves it alone before its instant @g8', () => {
    const before = dueWork(db, SEND_AT - MINUTE, NO_KEYS);
    expect(before.flip).toEqual([]);
    expect(before.sends).toEqual([]);
  });

  it('flips it to sent at its instant and emails its audience @g8', () => {
    const run = dueWork(db, SEND_AT, NO_KEYS);
    expect(run.flip).toEqual(['a3']);
    expect(byJob(run.sends)).toEqual({ announcement: OWNERS.length });
    expect(keys(run.sends)).toEqual(OWNERS.map((id) => `announcement:a3:${id}`));
    // § 8.1: the announcement's subject IS its title, so the title is the one field that must
    // survive into the payload verbatim. `body` with it: the template refuses an empty one.
    expect(run.sends.map((s) => dataOf(s, 'announcement').title)).toEqual(Array(3).fill(A3.title));
    expect(run.sends.map((s) => dataOf(s, 'announcement').body)).toEqual(Array(3).fill(A3.body));
  });

  it('flips an in-app-only announcement without emailing anyone @g8', () => {
    // § 8.5: "The in-app banner appears from that moment, and email goes out if the channel is set."
    const inapp = variant((d) => {
      d.announcements.find((a) => a.id === 'a3')!.channels = ['inapp'];
    });
    const run = dueWork(inapp, SEND_AT, NO_KEYS);
    expect(run.flip).toEqual(['a3']);
    expect(run.sends).toEqual([]);
  });

  it('flips it even when the emails are already recorded @g8', () => {
    // The two halves can come apart: the ledger row commits, the status update does not. Re-running
    // the flip is harmless; skipping it leaves a banner that never appears.
    const sent = new Set(keys(dueWork(db, SEND_AT, NO_KEYS).sends));
    const again = dueWork(db, SEND_AT + MINUTE, sent);
    expect(again.sends).toEqual([]);
    expect(again.flip).toEqual(['a3']);
  });

  it('emails an audience of all learners, not just the owners @g8', () => {
    const all = variant((d) => {
      d.announcements.find((a) => a.id === 'a3')!.audience = 'all';
    });
    expect(recipients(dueWork(all, SEND_AT, NO_KEYS).sends)).toEqual(EVERYONE);
  });

  it('never re-sends an announcement that already went out @g8', () => {
    // a1 and a2 are `status: 'sent'` with instants in the past, and a1's channels include email. A
    // job that selected on `at` alone rather than on the status would mail the whole cohort about a
    // session that moved last week, every single tick.
    for (const now of [GATE_NOW, SEND_AT, at('2027-01-20', '09:00')]) {
      const run = dueWork(db, now, NO_KEYS);
      const about = new Set(scopes(run.sends.filter((s) => s.job === 'announcement')));
      expect([...about].filter((id) => id === 'a1' || id === 'a2')).toEqual([]);
      expect(run.flip.filter((id) => id !== 'a3')).toEqual([]);
    }
  });

  it('emails a completed cohort, because the banner reaches them too @g8', () => {
    // THE TWO CHANNELS OF ONE ANNOUNCEMENT HAVE TO AGREE. `scope.ts`'s `forAudience` — which is
    // what puts the in-app banner on a learner's dashboard — gates on `a.status === 'sent'` and the
    // audience, and on nothing else: no cohort, no enrolment. So a learner whose cohort has been
    // marked `completed` still sees every banner their audience covers, for as long as they can
    // sign in.
    //
    // This job used to gate the email on `reachable`, which requires the cohort to be `live` or
    // `enrolling`. The result was an announcement that appeared on screen and never arrived by
    // email, for every learner in every finished cohort, with nothing failing anywhere. The
    // cohort's lifecycle governs the five AUTOMATED reminders — a finished cohort has no next
    // session to remind anyone of — not an announcement an admin wrote and scheduled by hand.
    const over = variant((d) => {
      d.cohorts.find((c) => c.id === 'dec26')!.status = 'completed';
      d.announcements.find((a) => a.id === 'a3')!.audience = 'all';
    });
    const run = dueWork(over, SEND_AT, NO_KEYS);
    expect(recipients(run.sends)).toEqual(EVERYONE);
    expect(byJob(run.sends)).toEqual({ announcement: EVERYONE.length });
    expect(run.flip).toEqual(['a3']);
  });

  it('still skips an invitee and a blanked address in a completed cohort @g8', () => {
    // The half of `reachable` the announcement job KEEPS, and why it is not an inconsistency:
    //   - an `invited` learner has no session, so they have no banner to see either — the in-app
    //     channel does not reach them whatever `forAudience` says, and `@ai/core`'s own audience
    //     counts filter `status !== 'invited'` for the same reason;
    //   - `''` is not an address this process can send to at all. `scopeSnapshot` blanks a
    //     teammate's email, and sending to `''` would burn that learner's idempotence key.
    const over = variant((d) => {
      d.cohorts.find((c) => c.id === 'dec26')!.status = 'completed';
      d.announcements.find((a) => a.id === 'a3')!.audience = 'all';
      d.users.find((u) => u.id === 'u_jamie')!.status = 'invited';
      d.users.find((u) => u.id === 'u_priya')!.email = '';
    });
    const run = dueWork(over, SEND_AT, NO_KEYS);
    expect(recipients(run.sends)).toEqual(EVERYONE.filter((id) => id !== 'u_jamie' && id !== 'u_priya'));
    expect(run.sends.map((s) => s.to)).not.toContain('');
  });

  it('sends no automated reminder to a completed cohort, announcement or not @g8', () => {
    // The other side of the same rule: relaxing the announcement audience must NOT relax the five
    // reminders. Gate 8's own instant, with the cohort marked over — section 4 asserts 0 sends
    // there, and this pins that the announcement change did not quietly reopen it.
    const over = variant((d) => {
      d.cohorts.find((c) => c.id === 'dec26')!.status = 'completed';
    });
    expect(dueWork(over, GATE_NOW, NO_KEYS).sends).toEqual([]);
    expect(dueWork(over, at('2026-12-03', '15:00'), NO_KEYS).sends).toEqual([]);
    // And with rm5 on, the digest stays off for a finished cohort's owners too.
    const overAndOn = variant((d) => {
      d.cohorts.find((c) => c.id === 'dec26')!.status = 'completed';
      d.reminders.find((r) => r.id === 'rm5')!.on = true;
    });
    expect(dueWork(overAndOn, at('2026-12-07', '08:00'), NO_KEYS).sends).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 7. Purity
// ---------------------------------------------------------------------------

describe('§8.5 dueWork is pure @g8', () => {
  it('mutates neither the db nor the key set @g8', () => {
    // The deferred shell calls this inside a transaction, between a `loadDb` and a `persistDiff`.
    // A mutation here would be written back to the database as though an admin had made it.
    const before = JSON.stringify(db);
    const sent = new Set(['session-24h:dec26-s3:u_jamie']);
    dueWork(db, GATE_NOW, sent);
    expect(JSON.stringify(db)).toBe(before);
    expect([...sent]).toEqual(['session-24h:dec26-s3:u_jamie']);
  });

  it('answers the same twice @g8', () => {
    expect(dueWork(db, GATE_NOW, NO_KEYS)).toEqual(dueWork(db, GATE_NOW, NO_KEYS));
  });

  it('lets alreadySent subtract and nothing else @g8', () => {
    // What makes the deferred wrapper trivial: it calls `dueWork(db, now, NO_KEYS)` to learn which
    // keys to look up, then calls again with what it found. That is only sound if passing keys in
    // cannot change which OTHER sends appear.
    for (const now of [GATE_NOW, S3.start - HOUR, at('2026-12-03', '15:00'), at('2026-12-11', '08:00')]) {
      const all = dueWork(db, now, NO_KEYS);
      const half = new Set(keys(all.sends).filter((_, i) => i % 2 === 0));
      const run = dueWork(db, now, half);
      expect(run.sends).toEqual(all.sends.filter((s) => !half.has(s.key)));
      expect(run.flip).toEqual(all.flip);
    }
  });

  it('sends nothing at all in the quiet hours between windows @g8', () => {
    // Most ticks do nothing. A job that fires on an empty window is how a cohort gets mailed twice
    // a minute at three in the morning.
    // Dec 7 at 3am (before Monday's 08:00 digest), Dec 8 at 5:30am (before Session 3's 24 h window
    // opens at 13:00) and Dec 10 at 5pm (Session 4 ended at 14:15 with its replay still
    // processing, Session 3's build deadline is not until Dec 11 and Session 5's reminder opens on
    // Dec 14).
    for (const now of [at('2026-12-07', '03:00'), at('2026-12-08', '05:30'), at('2026-12-10', '17:00')]) {
      expect(dueWork(db, now, NO_KEYS).sends).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// 8. The payloads, rendered by the templates they name
// ---------------------------------------------------------------------------
//
// WHY A JOBS TEST RENDERS EMAILS. A `Send` goes to `transport.send({template, to, data})` untouched
// and from there straight to `elementFor`, which reads every field it needs by name and THROWS if
// one is missing — `send` then logs `template render threw: …` and returns `{ok: false}` without
// sending. So a scheduler whose payload is wrong produces no error here, no error in the template
// tests (which build their own payloads), and an empty inbox in production.
//
// That is not hypothetical: three of § 8.5's five jobs shipped payloads § 8.1's templates reject.
// `replay-ready` had no `employee` and a `moduleId` of `null`; `build-reminder` had no `steps`;
// both session reminders had no `zone`, which is not a throw but a wrong answer — Central for every
// learner on earth. Every one of them typechecked, because `transport.EmailData` was
// `SubjectData[K] & Record<string, unknown>`: the subject half, plus anything.
//
// The type is tightened now (`email/templates/payload.ts`), so those three are compile errors. This
// suite is the runtime half of the same statement, and it is the half that survives a cast.

describe('§8.5 payloads § 8.1 can render @g8', () => {
  /** A reserved-TLD origin (RFC 2606), so no link in a fixture can reach anything real. */
  const APP = 'https://app.amplifiedimpact.test';
  const NEW_YORK = 'America/New_York';
  const BUSY = at('2026-12-03', '15:00');
  const MONDAY = at('2026-12-07', '08:00');
  const ANNOUNCED = at('2026-12-11', '08:00');

  let savedAppUrl: string | undefined;

  beforeAll(() => {
    savedAppUrl = process.env.APP_URL;
    process.env.APP_URL = APP;
  });

  afterAll(() => {
    if (savedAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = savedAppUrl;
    // `whenFor` restores this itself, per call. This is the suite's own belt and braces: nothing
    // else in `apps/api/src` formats through `fmt`, so a latched zone here would be invisible.
    setViewerZone(null);
  });

  /** Every switch on, so one run can produce all five jobs. The seed ships rm5 off. */
  const ALL_ON = variant((d) => {
    for (const r of d.reminders) r.on = true;
  });

  /**
   * What the deferred shell will read out of `users.prefs`: three learners with a saved zone and
   * eleven without.
   *
   * `''` is what `ZONES`'s first entry ("Auto") stores and `'America/Chigago'` is the realistic bad
   * value — `prefs` is free-form jsonb with no enum and no check constraint, so one letter off the
   * program zone is a value this column really can hold. Both must render as CT, not throw.
   */
  const SAVED: ZoneLookup = new Map([
    ['u_jamie', NEW_YORK],
    ['u_priya', ''],
    ['u_omar', 'America/Chigago'],
  ]);

  const EVERY_SEND: Send[] = [
    ...dueWork(ALL_ON, GATE_NOW, NO_KEYS, SAVED).sends,
    ...dueWork(ALL_ON, S3.start - HOUR, NO_KEYS, SAVED).sends,
    ...dueWork(ALL_ON, BUSY, NO_KEYS, SAVED).sends,
    ...dueWork(ALL_ON, MONDAY, NO_KEYS, SAVED).sends,
    ...dueWork(ALL_ON, ANNOUNCED, NO_KEYS, SAVED).sends,
  ];

  it('is looking at all five jobs and the announcement @g8', () => {
    // Without this, "every payload renders" could be true of three of them.
    expect(Object.keys(byJob(EVERY_SEND)).sort()).toEqual([
      'announcement',
      'build-48h',
      'replay-ready',
      'session-1h',
      'session-24h',
      'weekly-digest',
    ]);
  });

  it('renders every send the scheduler produces, subject and all @g8', async () => {
    for (const s of EVERY_SEND) {
      // `as never`: `template` and `data` are correlated per arm of the `Send` union, but a generic
      // call instantiates `K` from the union as a whole and cannot see the pairing. The pairing is
      // what `Send` guarantees at the push site; this call is only asserting the payload renders.
      const out = await renderEmail(s.template, s.data as never);
      expect(out.subject, `${s.key} rendered an empty subject`).toBeTruthy();
      // § 8.1's subject reaches the inbox AND the <title>, the preheader and the H1 — one string,
      // from `SUBJECTS`. If the payload were missing a subject field this would be `Session
      // undefined`, which is why the exact table value is checked rather than mere presence.
      expect(out.html).toContain(`<title>${out.subject}</title>`);
    }
  });

  it('builds a replay-ready its template accepts, with § 8.1’s copy @g8', async () => {
    const s = EVERY_SEND.find((x) => x.job === 'replay-ready')!;
    const out = await renderEmail('replay-ready', dataOf(s, 'replay-ready'));
    expect(out.subject).toBe('Replay is up: Session 2 · Speed to Lead');
    // The body and the button are made of the two fields this job used to omit. `a2` in the seed
    // IS this notice, so the sentence is the product's own.
    expect(out.html).toContain('The replay, chapters and transcript are on the Sales AI Employee page.');
    expect(out.html).toContain('Watch Replay');
    expect(out.html).toContain(`${APP}/employees/sales`);
  });

  it('builds a build-reminder whose step count is the learner’s own @g8', async () => {
    const nudges = EVERY_SEND.filter((x) => x.job === 'build-48h');
    expect(recipients(nudges)).toEqual(['u_michael', 'u_lena', 'u_omar', 'u_ben']);

    // Michael is 4 of 6 — `in_progress`, so `cards.ts` says `Continue Build`.
    const michael = await renderEmail('build-reminder', dataOf(nudges[0]!, 'build-reminder'));
    expect(michael.subject).toBe('Finish your Marketing AI Employee');
    expect(michael.html).toContain('4 of 6 steps verified');
    expect(michael.html).toContain('Continue Build');

    // Lena has not started — `not_started`, so `Start Build`. This is the arm a payload carrying
    // the SESSION number as `steps` would have got wrong in the other direction: session 1 is a
    // truthy 1, which reads as `in_progress` and promises her a build she has not begun.
    const lena = await renderEmail('build-reminder', dataOf(nudges[1]!, 'build-reminder'));
    expect(lena.html).toContain('0 of 6 steps verified');
    expect(lena.html).toContain('Start Build');
    expect(lena.html).not.toContain('Continue Build');
  });

  it('renders each session reminder in that recipient’s saved zone @g8', async () => {
    // § 8.1: "Session times in emails use `fmt.when` with the RECIPIENT's saved zone, and fall back
    // to CT." A Send is per recipient, so the zone is per recipient; the job used to send no
    // `zone` at all, which rendered Central for all fourteen learners — the one learner this
    // sentence exists for being the one it failed.
    const run = dueWork(db, GATE_NOW, NO_KEYS, SAVED);
    const forUser = (id: string) => run.sends.find((s) => recipients([s])[0] === id)!;

    expect(dataOf(forUser('u_jamie'), 'session-24h').zone).toBe(NEW_YORK);
    expect(dataOf(forUser('u_priya'), 'session-24h').zone).toBe('');
    expect(dataOf(forUser('u_omar'), 'session-24h').zone).toBe('America/Chigago');
    // Not in the map at all: an explicit null, which the template reads as "we were never told".
    expect(dataOf(forUser('u_michael'), 'session-24h').zone).toBeNull();

    // And the HTML, which is the only place the difference is visible to a learner. Session 3
    // starts 2026-12-09 at 13:00 CT. Every expected string is written out rather than computed
    // through `fmt`, because `fmt` with no viewer zone reads the HOST's — and this program's
    // machines are in Central, so a computed expectation would pass here and fail on a UTC runner
    // (or worse, pass on both while measuring nothing).
    const html = async (id: string) =>
      (await renderEmail('session-24h', dataOf(forUser(id), 'session-24h'))).html;

    // Eastern: viewer zone first, program zone in parentheses — CLAUDE.md's time rule.
    expect(await html('u_jamie')).toContain('Wed, Dec 9 · 2:00 PM ET (1:00 PM CT)');
    // "Auto" (`''`) falls back to CT, and a Central recipient gets one clock, not two.
    expect(await html('u_priya')).toContain('Wed, Dec 9 · 1:00 PM CT');
    expect(await html('u_priya')).not.toContain('(1:00 PM CT)');
    // A zone `Intl` cannot use falls back to CT as well, rather than throwing `RangeError` out of
    // the render and leaving that one learner with no email at all. See `templates/recipient.ts`.
    expect(await html('u_omar')).toContain('Wed, Dec 9 · 1:00 PM CT');
    expect(await html('u_omar')).not.toContain('(1:00 PM CT)');
    // Nothing saved: CT, same as Auto.
    expect(await html('u_michael')).toContain('Wed, Dec 9 · 1:00 PM CT');
  });

  it('leaves every subject exactly as § 8.1’s table writes it @g8', async () => {
    // The subject is the one piece of copy that lands in an inbox with no stylesheet and no parity
    // scenario covering it. `SUBJECTS` is the table; this checks the scheduler's payload produces
    // the table's string for each of the six sends a run can make.
    const subjectOf = async (job: string) => {
      const s = EVERY_SEND.find((x) => x.job === job)!;
      return (await renderEmail(s.template, s.data as never)).subject;
    };
    expect(await subjectOf('session-24h')).toBe(SUBJECTS['session-24h']({ n: 3, title: 'The Living Database' }));
    expect(await subjectOf('session-1h')).toBe(SUBJECTS['session-1h']({ n: 3, title: 'The Living Database' }));
    expect(await subjectOf('replay-ready')).toBe(SUBJECTS['replay-ready']({ n: 2, title: 'Speed to Lead' }));
    expect(await subjectOf('build-48h')).toBe(SUBJECTS['build-reminder']({ employee: 'Marketing AI Employee' }));
    expect(await subjectOf('weekly-digest')).toBe(SUBJECTS['weekly-digest']({}));
    expect(await subjectOf('announcement')).toBe(SUBJECTS.announcement({ title: 'Weekly team progress digest' }));
  });
});
