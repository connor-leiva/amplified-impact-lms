// Which job sends are due — phase 08 § 8.5, the half that can be proved without a database.
//
// § 8.5's scheduler is a `setInterval` that opens a transaction, takes
// `pg_try_advisory_xact_lock(4242)` so only one replica runs, reads the clock, and calls
// `runDue(tx, now, [...])`. That shell is deferred with the rest of the Fastify server. This file
// is the decision it exists to make, lifted out as a pure function:
//
//     dueWork(db, now, alreadySent) -> { sends, flip }
//
// No clock, no transaction, no email. Given the same arguments it returns the same answer,
// which is what makes "the scheduler at 2026-12-08T13:00 CT sends session-24h for Session 3 to
// each eligible learner once, and running it twice sends nothing new" a unit test instead of a
// staging ritual. The deferred shell is then a wrapper with no decisions left in it:
//
//     const db = await loadDb(tx);
//     const sent = await keysAlreadyIn(tx, dueWork(db, now, NO_KEYS).sends); // … where key in (…)
//     const { sends, flip } = dueWork(db, now, sent);
//     for (const s of sends) { await send(s); await tx.insert(jobRuns)…onConflictDoNothing(); }
//     if (flip.length) await tx.update(announcements)…
//
// D-250: the session reminders show their time in Mountain and Central for everyone (`sessionTimeMtCt`), so no
// recipient's saved zone is read; § 8.1 had rendered it in each recipient's own.
//
// (`dueWork(db, now, sent)` and `dueWork(db, now, NO_KEYS).sends.filter(…)` are the same list by
// construction — `alreadySent` only ever subtracts. A test pins that, because it is what lets the
// wrapper above call this function twice without reasoning about it.)
//
// ---------------------------------------------------------------------------------------------
// WINDOWS: why every one of them is open-ended
//
// The obvious implementation of "24 h before each live session" is to fire when `now` is within a
// tick of `start - 24h`. It is also the bug that silently drops a day of reminders: the interval is
// 60 s, a tick that lands 61 s late (a slow query, a redeploy, a paused container, a machine whose
// clock was corrected) finds the moment already past, and nobody is ever told. Nothing fails, no
// row appears, and the only evidence is an inbox that stayed empty.
//
// So no window here is a point. Each one OPENS at its moment and stays open until a fact of the
// program closes it — the next reminder superseding it, the session beginning, the week ending —
// and idempotence, not the width of the window, is what makes a send happen once:
//
//   session-24h   [start - 24h, start - 1h)        closed by session-1h taking over
//   session-1h    [start - 1h,  start)             closed by the session beginning
//   replay-ready  [end, end + GRACE)               a replay is news for a day, then it is not
//   build-48h     [end + 48h, end + 48h + GRACE)   same
//   weekly-digest [Monday 08:00 CT, + 7 days)      closed by the week it covers ending
//   announcement  [at, forever)                    a banner must appear, however late
//
// GRACE is a day rather than a tick for exactly the reason above. A scheduler that was down for a
// day has lost an email; a scheduler that was late by a minute has not.
//
// ---------------------------------------------------------------------------------------------
// TIME
//
// Every instant comparison is epoch-ms arithmetic on numbers `@ai/core` produced, and the two
// places that need a Central Time wall clock go through `fmt.isoDate` / `fmt.fromCT`. Those two
// are the only `fmt` members safe on a server: the rest resolve through `viewerZone()`, which is
// module-level state in `@ai/core/time` set by whichever request last rendered a page. A job must
// never read it. D-250: the session reminders' time is Mountain and Central for everyone
// (`sessionTimeMtCt`), which takes no viewer zone at all.
//
// `fmt.fromCT` reads a wall clock as `-06:00`, Central STANDARD Time, all year. That is the
// reference's own behaviour and DECISIONS.md's open question ("Cohorts inside Daylight Saving Time
// run an hour later than their own label"). It reaches exactly one thing here: the weekly digest's
// 08:00 CT, which lands at 09:00 local during Daylight Saving Time. The session windows are
// relative to `session.start`, so they inherit whatever offset that instant already carries and add
// no error of their own. Fixing it is a product decision, not something to quietly do in a job, so
// this file is deliberately consistent with the rest of the app instead of accidentally better.
import {
  PROGRAM_TZ,
  buildOf,
  canAccess,
  fmt,
  hasOfficeHoursSeries,
  moduleForSession,
  sessionEnd,
  sessionKind,
  sessionState,
} from '@ai/core';
import type { AIEmployee, Announcement, Db, Learner, Session } from '@ai/core';
import { isCourseWeek } from '@ai/core/accelerator';
import type { CourseRoster } from '@ai/core/accelerator';
import { firstNameOf, sessionLabel } from '@ai/core';
import { jobKey } from './keys';
import type { JobName } from './keys';
import type { EmailData, TemplateName } from '../email/transport';

// ---------------------------------------------------------------------------
// What a run produces
// ---------------------------------------------------------------------------

/**
 * One email the scheduler owes, with the key that records it.
 *
 * Mapped over `TemplateName` rather than written as `{ template: TemplateName; data: … }` so
 * `template` and `data` stay correlated: a `session-24h` whose data has no `n` and no `title` is a
 * typecheck failure, not a subject line reading `Tomorrow: Session undefined`.
 *
 * `template`, `to` and `data` are § 8.1's `send({template, to, data})` exactly, so a `Send` is
 * handed to the transport untouched. `job` and `key` are § 8.5's ledger columns.
 *
 * `data` IS EXACTLY WHAT THE TEMPLATE RENDERS, AND NOTHING ELSE. `EmailData<T>` is now the full
 * per-template payload (`email/templates/payload.ts`), with no index signature, so a field the
 * template does not declare is a compile error here. That is deliberate: these payloads previously
 * carried `sessionId`, `mins`, `teamId`, `teamName`, `weekOf`, `announcementId` and `severity`
 * which no template reads, and carrying them is exactly how three of the five jobs came to be
 * missing fields that every template DOES read — `replay-ready` with no `employee`,
 * `build-reminder` with no `steps`, both session reminders with no `zone`. All three typechecked
 * and all three would have thrown inside `elementFor` on a live cohort. (D-250: the session reminders now declare
 * and carry `mins`, for the time's end, and no longer a `zone`.)
 *
 * Anything the SCHEDULER needs to know about a send rather than the inbox lives beside `data`:
 * `job` and `key`, and the key already encodes the scope (`session-24h:dec26-s3:u_jamie`), so
 * "which session was this about" is `key.split(':')[1]`, not a payload field.
 */
export type Send<K extends TemplateName = TemplateName> = {
  [T in TemplateName]: {
    job: JobName;
    key: string;
    template: T;
    to: string;
    data: EmailData<T>;
  };
}[K];

export interface DueWork {
  /** Emails to send, each exactly once, in `runDue`'s job order. */
  sends: Send[];
  /** Ids of scheduled announcements whose `at` has arrived: `status: 'scheduled' -> 'sent'`. */
  flip: string[];
}

/** For the candidate pass, before `job_runs` has been read. Reads better than `new Set()`. */
export const NO_KEYS: ReadonlySet<string> = new Set<string>();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** How long a window stays open past its moment when nothing else closes it. See the header. */
export const GRACE = DAY;

/** § 8.5 / § 8.1: "Build not finished 48 h after its session". */
const BUILD_DEADLINE = 48 * HOUR;

/** § 8.1: "Mondays at 08:00 CT". */
const DIGEST_TIME = '08:00';

/**
 * The fixed Central offset `@ai/core` builds every instant with (`lms-data.js`'s `T`, `fmt.fromCT`,
 * `fmt.isoDate`, `cohortWeek`). Used here only to find which CT day an instant falls on; the
 * instant itself is then rebuilt by `fmt.fromCT`, so this file cannot disagree with core about what
 * "08:00 CT" means.
 */
const CT_OFFSET = 6 * HOUR;

/**
 * Which Automated Reminders toggle gates each job — the switches on the admin Announcements screen,
 * `db.reminders`. A job whose toggle is off does not run at all: § 8.1 says each reminder sends
 * "when the reminder is on".
 *
 * `null` for `announcement`, which is not an automated reminder: an admin scheduled that one send
 * and chose its channels, so its `channels` array is the switch.
 *
 * Ids rather than labels, because the label is editable copy. `due.test.ts` asserts that each id
 * still carries the label describing the job it gates, so renumbering the seed fails loudly here
 * instead of silently wiring `weekly-digest` to the 24-hour switch.
 */
const TOGGLE: Record<JobName, string | null> = {
  'session-24h': 'rm1',
  'session-1h': 'rm2',
  'replay-ready': 'rm3',
  'build-48h': 'rm4',
  'weekly-digest': 'rm5',
  announcement: null,
};

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

/** Half-open: `opens` fires, `closes` does not. */
const isDue = (now: number, opens: number, closes: number): boolean => now >= opens && now < closes;

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

/**
 * A learner this process can put an email in front of, at all, for any reason.
 *
 *   - `status: 'invited'` has not accepted the invite. They have a row because an admin added them
 *     and a `team-invite` is already in flight; a second automated email about a program they have
 *     not joined is the wrong one. `@ai/core` draws the same line in two places:
 *     `sendAnnouncement`'s audience counts and `learnerCount` both filter `status !== 'invited'`.
 *     It is also the line the IN-APP channel draws by construction: a banner needs a session, and
 *     there is no session until the invite is accepted.
 *   - a learner with no email cannot be emailed. This is a guard against being handed a SCOPED
 *     snapshot: `scopeSnapshot` blanks teammates' email addresses for learners who may not see
 *     them, and sending to `''` would burn the idempotence key for that learner forever. Skipping
 *     instead leaves the key unwritten, so the next run retries once the db is the real one.
 *
 * Deliberately NOT part of this predicate: the cohort's status. See `reachable` below.
 */
const mailable = (u: Learner): boolean => u.status !== 'invited' && !!u.email;

/**
 * A learner whose PROGRAM is under way, which is what the five automated reminders are about.
 *
 * A cohort that is `completed` is over and one still in `draft` has not been published, so neither
 * should generate a session reminder, a replay notice, a build nudge or a digest. `enrolling` does:
 * February's cohort has real sessions on real dates and a learner enrolled in it should be
 * reminded of them.
 */
const underWay = (db: Db, u: Learner): boolean => {
  const co = db.cohorts.find((c) => c.id === u.cohortId);
  return !!co && (co.status === 'live' || co.status === 'enrolling');
};

/**
 * Who the five automated reminders may go to: mailable, and in a cohort that is running.
 *
 * The scheduled-announcement job does NOT use this — it uses `mailable` alone. See
 * `scheduledAnnouncements`.
 */
const reachable = (db: Db, u: Learner): boolean => mailable(u) && underWay(db, u);

/**
 * Who is in the AI Accelerator (D-110), asked with the instant that matters (H-14, D-248): core's `CourseRoster`. A
 * plain set of learner ids is one too (its `has` ignores the instant), which is how the pure tests pass a cohort.
 */
export type CourseAudience = CourseRoster;

/**
 * Who a session's reminders go to.
 *
 * Tier, not just enrolment: Session 4 teaches the Meetings AI Employee, which is Team-only, so an
 * Agent-tier learner is not invited to it and must not be reminded of it — the same rule
 * `accessibleSessions` applies in the portal (`!m || canAccess(u, m)`) and the same 403 § 8.4 gives
 * Jamie for `dec26-s4`. `canAccess` is `@ai/core`'s, so the email and the join button cannot
 * disagree about who the session is for.
 *
 * A session with no AI Employee goes to the whole cohort. `moduleForSession` already ignores drafts
 * (`status !== 'draft'`, the same filter `visibleModules` applies), so an employee an admin has not
 * published yet never narrows an audience.
 */
const sessionAudience = (db: Db, s: Session, now: number, accelerator?: CourseAudience): Learner[] => {
  const m = moduleForSession(db, s);
  // The AI Accelerator's sessions go only to learners whose plan opens the course (D-110): every paid
  // buyer sits in this cohort at Team tier, so the tier rule above cannot tell them apart. Absent
  // (every caller before the course, and the demo), nothing is narrowed.
  const course = !!accelerator && !!m && isCourseWeek(m.id);
  // H-14 (D-248): asked at the session's start while it is ahead, so a buyer whose course opens with the first live
  // build hears of it the day before and the hour before; once it has started, now (a replay, a build reminder).
  const at = Math.max(now, s.start);
  return db.users.filter(
    (u) => u.cohortId === s.cohortId && reachable(db, u) && (!m || canAccess(u, m)) && (!course || accelerator!.has(u.id, at)),
  );
};

/** The `owners` audience: § 8.1's "team owners", `scope.ts`'s `a.audience === 'owners'` rule. */
const isTeamOwner = (u: Learner): boolean => u.role === 'Team Owner';

/**
 * § 8.5's audience rule for an announcement, which is `scope.ts`'s `forAudience` without the
 * `status` half — the status is what this job is about to change.
 *
 * Duplicated rather than imported because `@ai/core` does not export it and this sprint is purely
 * additive to core. The two have to agree: the email and the in-app banner are one announcement
 * with two channels, and a learner who gets the email but never sees the banner (or the reverse)
 * is a bug nobody reports. Exporting `forAudience` from `@ai/core/scope` is the fix; the report
 * flags it for the integrator.
 *
 * The clause copied here is verbatim `forAudience`'s second half — `'all' | tier | ('owners' &&
 * Team Owner)` — and the ONLY other thing `forAudience` looks at is `a.status === 'sent'`. In
 * particular it looks at no cohort and no enrolment: `scopeForLearner` hands a learner every
 * announcement their audience covers, whatever their cohort's status. `scheduledAnnouncements`
 * therefore must not gate on the cohort either.
 */
const inAudience = (a: Announcement, u: Learner): boolean =>
  a.audience === 'all' || a.audience === u.tier || (a.audience === 'owners' && isTeamOwner(u));

// ---------------------------------------------------------------------------
// Monday 08:00 CT
// ---------------------------------------------------------------------------

/**
 * The 08:00 CT Monday instant of the Central-Time week `t` falls in.
 *
 * Deliberately not `new Date(t).getDay()`: that reads the HOST's zone, so the digest would go out
 * on Sunday evening in Honolulu and Monday afternoon in Berlin. Day arithmetic instead, on the
 * same CT-shifted epoch `@ai/core`'s `cohortWeek` and `fmt.isoDate` use, with the final instant
 * rebuilt by `fmt.fromCT` so the "08:00 CT" in this file is literally core's.
 *
 * 1970-01-01 was a Thursday, so `+3` rotates a Thursday-based day index onto a Monday-based one.
 */
const mondayOf = (t: number): number => {
  const ctDay = Math.floor((t - CT_OFFSET) / DAY);
  const monday = ctDay - ((ctDay + 3) % 7);
  // `monday * DAY + CT_OFFSET` is that CT day's midnight; isoDate names the day, fromCT puts 08:00
  // on it. Going through the date string rather than adding 8 hours keeps a single definition of
  // what a Central wall-clock time means.
  return fmt.fromCT(fmt.isoDate(monday * DAY + CT_OFFSET), DIGEST_TIME);
};

// ---------------------------------------------------------------------------
// The jobs
// ---------------------------------------------------------------------------

/** `session-24h` and `session-1h`: § 8.1's "Tomorrow: …" and "Starting in 1 hour: …". */
function sessionReminders(db: Db, now: number, accelerator?: CourseAudience): Send[] {
  const out: Send[] = [];
  for (const s of db.sessions) {
    // Not yet begun. `sessionState` — not `now < s.start` — because an admin who pressed Go Live
    // early makes the session live before its scheduled start, and "Tomorrow:" is then a lie.
    if (sessionState(s, now) !== 'upcoming') continue;
    const audience = sessionAudience(db, s, now, accelerator);
    if (!audience.length) continue;
    // `n` and `title` build § 8.1's subject. D-250: `start` and `mins` are the time, which the subject and the body
    // show in Mountain and Central (`sessionTimeMtCt`), the same for every recipient. The first name opens Connor's
    // note ("Hi Dana,"), which is why this takes `u` and builds a fresh object each time.
    // An office hour (D-110) is named by its week, "Week 2", not by its n (102); a build carries no
    // label, so every payload the prototype makes is unchanged.
    const label = sessionLabel(s) === `Session ${s.n}` ? {} : { label: sessionLabel(s) };
    const data = (u: Learner) => ({ n: s.n, title: s.title, ...label, start: s.start, mins: s.mins, firstName: firstNameOf(u.name) });
    // Written out twice rather than looped over a [job, opens, closes] table: `template` and `data`
    // are correlated in `Send`, and a loop variable of type `'session-24h' | 'session-1h'` loses
    // that correlation — the compiler would have to be told to stop checking the one thing worth
    // checking here.
    if (isDue(now, s.start - 24 * HOUR, s.start - HOUR)) {
      for (const u of audience) {
        out.push({ job: 'session-24h', key: jobKey('session-24h', s.id, u.id), template: 'session-24h', to: u.email, data: data(u) });
      }
    }
    if (isDue(now, s.start - HOUR, s.start)) {
      for (const u of audience) {
        out.push({ job: 'session-1h', key: jobKey('session-1h', s.id, u.id), template: 'session-1h', to: u.email, data: data(u) });
      }
    }
  }
  return out;
}

/**
 * `replay-ready`: § 8.1's "Replay is up: …".
 *
 * The primary trigger for this email is `publishReplay` (§ 8.1's table); this job is the backstop
 * for a replay that became ready without one — a Zoom `recording.completed` webhook landing while
 * the API was restarting, say. Hence the short window: a day after the session the replay is not
 * news, and `sessionState` is what says "over, and the replay is up" (`'processing'` means it is
 * not, and `'live'` means an admin never ended the session).
 *
 * A SESSION WITH NO AI EMPLOYEE SENDS NOTHING, which is the same early return
 * `buildNotFinished48h` already makes. § 8.1's `replay-ready` body is "The replay, chapters and
 * transcript are on the {employee} page" and its one button is `Watch Replay` → `/employees/:id`,
 * so without a module there is no sentence to write and nowhere to send the reader. This job used
 * to pass `moduleId: null` instead, which the template rejects ('"moduleId" must be a string, got
 * object') — a send that fails at render time for the WHOLE audience, not just for the one field.
 * Skipping leaves the key unwritten, so if the admin publishes the AI Employee while the window is
 * still open the next tick sends it properly.
 */
function replayReady(db: Db, now: number, accelerator?: CourseAudience): Send[] {
  const out: Send[] = [];
  for (const s of db.sessions) {
    if (sessionState(s, now) !== 'replay') continue;
    const end = sessionEnd(s);
    if (!isDue(now, end, end + GRACE)) continue;
    const m = moduleForSession(db, s);
    if (!m) continue;
    for (const u of sessionAudience(db, s, now, accelerator)) {
      out.push({
        job: 'replay-ready',
        key: jobKey('replay-ready', s.id, u.id),
        template: 'replay-ready',
        to: u.email,
        // `employee` is the full name ('Sales AI Employee'), which is what the body interpolates;
        // `moduleId` is the id the CTA links to. Both are required by the template.
        data: { n: s.n, title: s.title, employee: m.name, moduleId: m.id },
      });
    }
  }
  return out;
}

/**
 * `build-48h`: § 8.5's `buildNotFinished48h`, sending § 8.1's `build-reminder` ("Finish your
 * {employee}").
 *
 * "Not finished" is `buildOf(u, m).state !== 'verified'` — `@ai/core`'s own definition, the one the
 * Team Hub's "who hasn't finished earlier builds" card and the admin Learners screen already use,
 * so the email cannot disagree with the screen that prompted it.
 *
 * The job name is not the template name on purpose. A Team Owner's manual "Remind" and an admin's
 * "Nudge" send the same `build-reminder` and set `u.reminded` / `u.nudged`; this job records a
 * `job_runs` key. They are independent by design: being nudged by hand on Tuesday does not cancel
 * Thursday's automatic reminder, and the toggle (rm4) governs only this one.
 */
function buildNotFinished48h(db: Db, now: number, accelerator?: CourseAudience): Send[] {
  const out: Send[] = [];
  for (const s of db.sessions) {
    // A build reminder follows the build. An office hour (D-110) shares its week's AI Employee, and
    // would otherwise send the same reminder a day later.
    if (sessionKind(s) === 'office_hours') continue;
    const st = sessionState(s, now);
    // The session has to be over, which `s.live` can contradict long after its end instant.
    if (st !== 'replay' && st !== 'processing') continue;
    const deadline = sessionEnd(s) + BUILD_DEADLINE;
    if (!isDue(now, deadline, deadline + GRACE)) continue;
    const m: AIEmployee | null = moduleForSession(db, s);
    // Nothing to finish: a session with no AI Employee has no build.
    if (!m) continue;
    for (const u of sessionAudience(db, s, now, accelerator)) {
      const build = buildOf(u, m);
      if (build.state === 'verified') continue;
      out.push({
        job: 'build-48h',
        key: jobKey('build-48h', s.id, u.id),
        template: 'build-reminder',
        to: u.email,
        // `employee` is § 8.1's subject ("Finish your {employee}"); `steps`/`total` are the body
        // ("3 of 6 steps verified") AND the button, which reads `Start Build` at zero verified
        // steps and `Continue Build` above it — `cards.ts`'s own rule, so the email's button says
        // what the button on the page it opens will say. `buildOf` is read ONCE per learner and
        // both numbers come from that one reading: `state` and `n` disagreeing would put
        // "0 of 6 steps verified" under a `Continue Build` button.
        //
        // This job used to send `{employee, moduleId, sessionId, n}` with no `steps` at all, which
        // the template rejects ('"steps" must be a finite number, got undefined'). `n` was the
        // SESSION number, which is not what `steps` means and would have read as a step count.
        data: { employee: m.name, moduleId: m.id, steps: build.n, total: build.total },
      });
    }
  }
  return out;
}

/**
 * `weekly-digest`: § 8.1's "Your team this week", Mondays at 08:00 CT, to team owners.
 *
 * Keyed by the Monday it covers rather than by the instant it was sent, so the window can be a
 * whole week wide and still produce exactly one digest per team per week.
 *
 * An owner whose `teamId` has no team row gets nothing: the digest is about a roster, and there is
 * no roster to report on.
 */
/**
 * The day an owner's weekly digest says to review before (D-110). For a cohort with its own office-hours
 * series (the AI Accelerator) it is the weekday of the cohort's next build, in the program's zone;
 * for every other cohort it is absent, and the template keeps the prototype's Thursday.
 */
export function digestDay(db: Db, u: Learner, now: number): string | undefined {
  if (!hasOfficeHoursSeries(db.sessions, u.cohortId)) return undefined;
  const next = db.sessions
    .filter((s) => s.cohortId === u.cohortId && sessionKind(s) === 'build' && s.start > now)
    .sort((a, b) => a.start - b.start)[0];
  return next ? new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: PROGRAM_TZ }).format(next.start) : undefined;
}

function weeklyDigest(db: Db, now: number): Send[] {
  const monday = mondayOf(now);
  if (!isDue(now, monday, monday + WEEK)) return [];
  const weekOf = fmt.isoDate(monday);
  const out: Send[] = [];
  for (const u of db.users) {
    if (!isTeamOwner(u) || !reachable(db, u)) continue;
    // `some`, not `find`: the team row is a precondition, not a payload field (see `data` below).
    if (!db.teams.some((t) => t.id === u.teamId)) continue;
    out.push({
      job: 'weekly-digest',
      key: jobKey('weekly-digest', weekOf, u.id),
      template: 'weekly-digest',
      to: u.email,
      // The digest's content — who has built, who is stuck — is the template's to assemble from
      // the team's progress. What a job decides is who gets one and for which week.
      //
      // So the payload is empty, and § 8.1's `weekly-digest` template declares no body fields:
      // its subject interpolates nothing ("Your team this week") and its one button goes to
      // `/team`. The team and the week are not lost — the team is `u.teamId` and the week is in
      // the key (`weekly-digest:2026-12-07:u_alex`) — they simply are not things an inbox sees.
      // When the template grows a roster, `BodyData['weekly-digest']` grows with it and this line
      // stops compiling until it supplies one, which is the whole point of the tightened type.
      data: ((day) => (day ? { before: day } : {}))(digestDay(db, u, now)),
    });
  }
  return out;
}

/**
 * `scheduledAnnouncements`: § 8.5 — "flips `status: 'scheduled' -> 'sent'` at `at`. The in-app
 * banner appears from that moment, and email goes out if the channel is set."
 *
 * The flip is NOT gated on `alreadySent`. The two halves can come apart — the email row is written
 * and the process dies before the update commits — and of the two possible repairs, re-running the
 * flip is harmless (it is idempotent: the status is already the record) while skipping it would
 * leave a banner that never appears. So the flip is driven by the announcement's own status and
 * nothing else, and the window has no upper bound for the same reason.
 *
 * =========================================================================================
 * THE AUDIENCE IS `mailable` + `inAudience`, NOT `reachable` — THE TWO CHANNELS ARE ONE
 * ANNOUNCEMENT
 * =========================================================================================
 * § 8.5 makes the flip and the email two channels of ONE event, so they have to reach the same
 * people. The in-app side is `scope.ts`'s `forAudience`, which gates on `a.status === 'sent'` and
 * the audience, and on NOTHING ELSE — no cohort, no enrolment. `scopeForLearner` hands a learner
 * every announcement their audience covers for as long as they can sign in.
 *
 * This job used to gate on `reachable`, which requires the learner's cohort to be `live` or
 * `enrolling`. So a December learner whose cohort had been marked `completed` saw the banner and
 * got no email — the channels disagreeing, for every announcement, with nothing failing. The
 * cohort's lifecycle governs the five AUTOMATED reminders (a finished cohort has no next session to
 * remind anyone of); it does not govern an announcement an admin wrote and scheduled by hand.
 *
 * `mailable` survives because both halves of it are true of the banner too: `''` is not an address
 * this process can send to at all, and an `invited` learner has no session and therefore no banner
 * to see until they accept — at which point they are `active`. So the set this reaches is exactly
 * the set `forAudience` shows it to.
 *
 * Exporting `forAudience` from `@ai/core/scope` would delete `inAudience` and this whole argument;
 * the report flags it for the integrator, because core is not this sprint's to edit.
 */
function scheduledAnnouncements(db: Db, now: number): DueWork {
  const due = db.announcements.filter((a) => a.status === 'scheduled' && now >= a.at);
  const sends: Send[] = [];
  for (const a of due) sends.push(...announcementSends(db, a));
  return { sends, flip: due.map((a) => a.id) };
}

/**
 * One announcement's emails: one per learner its audience reaches (`mailable` + `inAudience`, above), keyed
 * `announcement:<id>:<user>` in `job_runs`. Nothing for an announcement without the Email channel.
 *
 * D-247 (H-9): exported so Send now's email (`email/announce-now.ts`) goes to exactly the people, with
 * exactly the payload and the ledger keys, a scheduled one's does. A key either path recorded is never
 * sent again by the other.
 */
export function announcementSends(db: Db, a: Announcement): Send[] {
  if (!a.channels.includes('email')) return [];
  const sends: Send[] = [];
  for (const u of db.users) {
    if (!mailable(u) || !inAudience(a, u)) continue;
    sends.push({
      job: 'announcement',
      key: jobKey('announcement', a.id, u.id),
      template: 'announcement',
      to: u.email,
      // § 8.1: the announcement's subject IS its title, and the body is the admin's own copy.
      // `action`/`actionLabel` are the one button; `Dashboard.vm.ts` renders no button at all for
      // `action: null`, and the template falls back to the app's own `Open` label, so both are
      // passed through exactly as the admin set them.
      //
      // `severity` and the announcement id are NOT here: the banner shows severity as a colour
      // and an email has one layout, and the id is already in the key (`announcement:a3:u_alex`).
      data: { title: a.title, body: a.body, action: a.action, actionLabel: a.actionLabel },
    });
  }
  return sends;
}

// ---------------------------------------------------------------------------
// dueWork
// ---------------------------------------------------------------------------

/**
 * Is this job's Automated Reminders switch on?
 *
 * Applied once, over the finished list, rather than as an early return inside each job. The jobs
 * then cannot forget it — a seventh job added below gets the check for free, and `TOGGLE` is a
 * total map so it cannot be added without declaring which switch governs it. The cost is that a
 * switched-off job still computes its audience, which is a few array filters over one cohort.
 */
const toggleOn = (db: Db, job: JobName): boolean => {
  const id = TOGGLE[job];
  if (id === null) return true;
  // An absent toggle reads as OFF. A reminder row that is missing is a database in a state nobody
  // designed, and the safe answer there is to send nothing rather than to email a whole cohort.
  return db.reminders.find((r) => r.id === id)?.on === true;
};

/**
 * Every send § 8.5's five jobs owe at `now`, minus the ones already recorded in `job_runs`, plus
 * the scheduled announcements to flip.
 *
 * Pure: it reads no clock, mutates nothing (not `db`, not `alreadySent`) and returns the same
 * result for the same arguments. The order is § 8.5's `runDue` order, then session order, then
 * `db.users` order — stable, so a diff of two runs is readable.
 *
 * `alreadySent` is required rather than defaulted, because an omitted argument would be the exact
 * shape of the bug this function exists to prevent. Pass `NO_KEYS` for the candidate pass.
 *
 * § 8.5: "Scheduled AI Employees need no job. `isOpen(m, now)` already opens them at `opens`." So
 * there is no sixth job here, by design — the Operations AI Employee's `opens` instant is read at
 * render time, not announced.
 */
export function dueWork(
  db: Db,
  now: number,
  alreadySent: ReadonlySet<string>,
  /**
   * The learners whose plan opens the AI Accelerator (D-110), which the `Db` cannot say: the
   * scheduler reads it from the plans. The course's reminders go to them only. Absent: no narrowing.
   * H-14 (D-248): asked per session at its start (`acceleratorRoster`); a plain set of ids still works.
   */
  accelerator?: CourseAudience,
): DueWork {
  const announcements = scheduledAnnouncements(db, now);
  const candidates: Send[] = [
    ...sessionReminders(db, now, accelerator),
    ...replayReady(db, now, accelerator),
    ...buildNotFinished48h(db, now, accelerator),
    ...weeklyDigest(db, now),
    ...announcements.sends,
  ];
  return {
    sends: candidates.filter((s) => toggleOn(db, s.job) && !alreadySent.has(s.key)),
    flip: announcements.flip,
  };
}
