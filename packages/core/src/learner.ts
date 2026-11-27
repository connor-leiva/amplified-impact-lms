// The learner portal v2's logic (D-177): what the new learner shell, Home, the week overview and the
// step player compute from `GET /api/course` and the learner's snapshot. Pure: no React, no clock, no
// fetch, no words. Every word a screen shows is data (the course, the sessions, the copy strings) or
// generic chrome in the web app's view-models; this file only decides which step is next, which
// session is live, what state a week is in and how a length of time reads.
//
// TWO SOURCES, ONE COURSE. `GET /api/course` sends each week open (whole) or locked (a stub), and an
// open week's steps without their ids (`CourseWeek.module.checklist`). The learner's snapshot carries
// the same week module, with its step ids and the learner's progress (`Learner.progress[moduleId]`),
// which is what "Mark step done" writes through the portal's own `toggleStep`. `weekSteps` lines the
// two up by position, and only while each step's words agree, so a step is never ticked under the
// wrong id.

import { isAcceleratorModule } from './accelerator';
import { weekModuleId } from './cohort-learner';
import { isLockedWeek } from './course';
import type { CourseSessionRow, LearnerCourseWeek, OpenCourseWeek } from './course';
import { joinMode, moduleForSession, sessionState } from './sessions';
import { implementerWords } from './role-words';
import type { SessionTiming } from './sessions';
import { viewerZone } from './time';
import type { AIEmployee, Announcement, Cohort, Db, Learner, Progress, Session, Step } from './types';

/** One step of an open week, as the learner screens use it. */
export interface LearnerStep {
  /** 0-based position in the week. */
  index: number;
  /** 1-based number, as the screens print it. */
  n: number;
  /** The step's id in the learner's progress, or null when the snapshot can't vouch for it. */
  id: string | null;
  step: Omit<Step, 'id'>;
  done: boolean;
  /** The first step not done: "Up next". */
  current: boolean;
}

/** Where a learner stands on a week. */
export type WeekState = 'locked' | 'not_started' | 'in_progress' | 'built';

/**
 * The viewer's cohort, as their snapshot carries it (their own, D-254), or undefined (staff previewing, who have no
 * learner row). R-5 Phase 4 (D-261): what a week's number means is this cohort's run (`weekModuleId`).
 */
export const cohortOfViewer = (db: Pick<Db, 'cohorts'>, me: Pick<Learner, 'cohortId'> | null): Cohort | undefined =>
  me ? db.cohorts.find((c) => c.id === me.cohortId) : undefined;

/**
 * The snapshot's module for a course week, when the snapshot carries it. R-5 Phase 4 (D-261): the week is the viewer's
 * cohort's (`weekModuleId`: its run's week `n`, or `accelerator-week-N` for a cohort with no stored run, as today).
 */
export const weekModuleOf = (db: Pick<Db, 'modules'>, week: number, cohort?: Pick<Cohort, 'run'> | null): AIEmployee | undefined => {
  const id = weekModuleId(cohort, week);
  return id === null ? undefined : db.modules.find((m) => m.id === id);
};

/** The signed-in learner's row in their snapshot, or null (staff, or no row). */
export const learnerOf = (db: Pick<Db, 'users'>, userId: string | null): Learner | null =>
  userId === null ? null : (db.users.find((u) => u.id === userId) ?? null);

/** A learner's progress on a module, when there is any. */
export const progressOnModule = (me: Learner | null, moduleId: string | null): Progress | undefined =>
  moduleId === null ? undefined : me?.progress?.[moduleId];

/** A learner's progress on a course week of their cohort (`weekModuleId`), when there is any. */
export const progressOn = (me: Learner | null, week: number, cohort?: Pick<Cohort, 'run'> | null): Progress | undefined =>
  progressOnModule(me, weekModuleId(cohort, week));

/**
 * An open week's steps, each with its id (from the snapshot's module, by position, while the words
 * match), whether it is done (its id is in the learner's progress) and whether it is the one up next.
 */
export function weekSteps(week: OpenCourseWeek, module: Pick<AIEmployee, 'checklist'> | undefined, progress: Pick<Progress, 'steps'> | undefined): LearnerStep[] {
  const done = new Set(progress?.steps ?? []);
  const steps = week.module.checklist.map((step, index): LearnerStep => {
    const twin = module?.checklist[index];
    const id = twin && twin.text === step.text && twin.ch === step.ch ? twin.id : null;
    return { index, n: index + 1, id, step, done: id !== null && done.has(id), current: false };
  });
  const next = steps.find((s) => !s.done);
  if (next) next.current = true;
  return steps;
}

/** How far through its steps a learner is: done, of how many. */
export const stepCount = (steps: readonly LearnerStep[]): { done: number; total: number } => ({
  done: steps.filter((s) => s.done).length,
  total: steps.length,
});

/** A week's state for this learner: locked, built (every step done), in progress, or not started. */
export function weekState(week: LearnerCourseWeek, steps: readonly LearnerStep[]): WeekState {
  if (isLockedWeek(week)) return 'locked';
  const { done, total } = stepCount(steps);
  if (total > 0 && done === total) return 'built';
  return done > 0 ? 'in_progress' : 'not_started';
}

/** The minutes of the steps still to do. */
export const minutesLeft = (steps: readonly LearnerStep[]): number => steps.filter((s) => !s.done).reduce((a, s) => a + (s.step.mins || 0), 0);

/**
 * B-09 (D-228): who a step is for, read from its `who` text, the words the builder already holds (Connor, Nov 20: "Read
 * the text"). "Owner" is the owner's, "AI Implementer" the AI Implementer's (the role's id stays `operator`, D-243), and
 * anything else ("Owner and AI Implementer", "Each of you", or words this rule doesn't know) is both of theirs, so no
 * step ever drops out of a role's list. A Who line saved before D-243 ("Operator") still reads the same.
 */
export type StepRole = 'owner' | 'operator';
const whoKey = (who: string | null | undefined): string => implementerWords((who ?? '').trim()).toLowerCase().replace(/[.]$/, '');
export function stepRoles(who: string | null | undefined): StepRole[] {
  const t = whoKey(who);
  if (t === 'owner') return ['owner'];
  if (t === 'ai implementer') return ['operator'];
  return ['owner', 'operator'];
}

/** Whether `stepRoles` knows a step's `who` words (the builder can warn about any it doesn't). */
export const knownStepRole = (who: string | null | undefined): boolean =>
  ['owner', 'ai implementer', 'owner and ai implementer', 'each of you'].includes(whoKey(who));

/** The minutes of every step. */
export const minutesInAll = (steps: readonly LearnerStep[]): number => steps.reduce((a, s) => a + (s.step.mins || 0), 0);

/**
 * The week a learner is on: the first open week not yet built, else the last open week, else null.
 * This is the week Home's hero and the cards' "current" outline point at.
 */
export function currentWeek<W extends { state: WeekState }>(weeks: readonly W[]): W | null {
  const open = weeks.filter((w) => w.state !== 'locked');
  return open.find((w) => w.state !== 'built') ?? open[open.length - 1] ?? null;
}

// --- sessions ------------------------------------------------------------------------------------

export const sessionEndsAt = (s: Pick<CourseSessionRow, 'start' | 'mins'>): number => s.start + s.mins * 60_000;

/**
 * The session live now, by the current portal's rule (`sessionState`): staff pressed Go Live (D-183, even
 * before its start), or it is between its start and its end and nobody has pressed End Session (which
 * moves its start back so it reads as ended). A session with no Console state reads by its times alone.
 */
export const liveSessionAt = <S extends SessionTiming>(sessions: readonly S[], now: number): S | null =>
  sessions.find((s) => learnerSessionState(s, now) === 'live') ?? null;

/**
 * `sessionState`, with End Session read off the session itself. End Session moves the start back so the
 * session ends at the server's clock (`start = now - mins`) and marks its replay processing; a browser
 * whose clock runs a few seconds behind (or that hasn't ticked yet) would still read it as under way by its
 * times. A session that isn't live, has a replay state, and whose times say it is running has been ended
 * by staff: it reads as ended at once, as the join route (on the server's clock) already answers.
 */
export function learnerSessionState(s: SessionTiming, now: number): ReturnType<typeof sessionState> {
  const st = sessionState(s, now);
  if (st === 'live' && !s.live && s.replay) return s.replay === 'ready' ? 'replay' : 'processing';
  return st;
}

// --- the Console's live state and the join window (D-183) -----------------------------------------

/** What the Console sets on a session that `GET /api/course` doesn't send: Go Live, End Session, the replay. */
export interface LiveState {
  live?: boolean;
  replay?: Session['replay'];
  /** How many attended live, once End Session records it. */
  attended?: number | null;
}

/**
 * The course's sessions with the state the Console sets, read off the learner's snapshot by id: Go Live
 * (`live`), the start and length End Session leaves (it moves the start back so the session reads as
 * ended), its attendance, and the replay (`processing`, or `ready` once published). Only a snapshot session the course
 * itself would list counts: one whose week module is a course week, the rule `courseSessions` uses. The
 * snapshot refetches on every change the server announces, so a Console press reaches an open page
 * without a reload, as it does in the current portal. A session the snapshot doesn't carry keeps the
 * course's times and reads as not started by staff, with no replay.
 */
export function withLiveState<S extends Pick<CourseSessionRow, 'id' | 'start' | 'mins'>>(sessions: readonly S[], db: Pick<Db, 'sessions' | 'modules'>): (S & LiveState)[] {
  const own = new Map<string, Session>();
  for (const x of db.sessions) {
    const m = moduleForSession(db, x);
    if (m && isAcceleratorModule(m.id)) own.set(x.id, x);
  }
  return sessions.map((s) => {
    const x = own.get(s.id);
    return x ? { ...s, start: x.start, mins: x.mins, live: x.live, replay: x.replay, attended: x.attended } : s;
  });
}

/**
 * Where a session is, by the current portal's rule: still to come, inside its join window (`ready`: 15
 * minutes before its start, `joinMode`), live, ended with its replay processing, or with its replay
 * published (`replay`).
 */
export type SessionPhase = 'upcoming' | 'ready' | 'live' | 'processing' | 'replay';

export function sessionPhase(s: SessionTiming, now: number): SessionPhase {
  const st = learnerSessionState(s, now);
  if (st === 'upcoming') return joinMode(s, now) === 'ready' ? 'ready' : 'upcoming';
  return st === 'none' ? 'upcoming' : st;
}

/**
 * Whether Join shows: from 15 minutes before the start until the session ends or staff end it, and from
 * the moment staff press Go Live. The same rule the join route enforces (`joinMode`), so a Join a learner
 * sees is one the server answers.
 */
export const canJoin = (s: SessionTiming, now: number): boolean => {
  const phase = sessionPhase(s, now);
  return phase === 'live' || phase === 'ready';
};

/** The session to join now: the live one, else the soonest inside its join window, else null. */
export function joinableSession<S extends SessionTiming>(sessions: readonly S[], now: number): S | null {
  return (
    liveSessionAt(sessions, now) ??
    sessions
      .filter((s) => sessionPhase(s, now) === 'ready')
      .slice()
      .sort((a, b) => a.start - b.start)[0] ??
    null
  );
}

// --- in-app announcements (D-183) -------------------------------------------------------------------

/**
 * The announcement a learner's Home shows, by the current portal's rule (its Dashboard banner): the first
 * one, newest first as they are stored, that was sent, on the in-app channel, for this learner's audience
 * (everyone, their tier, or Team Owners), and that they haven't dismissed.
 */
export function inAppAnnouncement(db: Pick<Db, 'announcements' | 'dismissed'>, user: Pick<Learner, 'id' | 'tier' | 'role'>): Announcement | null {
  const aud = (a: Announcement): boolean => a.audience === 'all' || a.audience === user.tier || (a.audience === 'owners' && user.role === 'Team Owner');
  return db.announcements.find((x) => x.status === 'sent' && x.channels.includes('inapp') && aud(x) && !(db.dismissed ?? {})[`${user.id}:${x.id}`]) ?? null;
}

/** The sessions still to come, soonest first, optionally of one kind. */
export function upcomingSessions<S extends Pick<CourseSessionRow, 'start' | 'kind'>>(sessions: readonly S[], now: number, kind?: S['kind']): S[] {
  return sessions
    .filter((s) => s.start > now && (kind === undefined || s.kind === kind))
    .slice()
    .sort((a, b) => a.start - b.start);
}

/** Whole days, hours and minutes from `now` to `at` (never negative). */
export function countdown(at: number, now: number): { days: number; hours: number; minutes: number } {
  const total = Math.max(0, Math.floor((at - now) / 60_000));
  return { days: Math.floor(total / 1440), hours: Math.floor((total % 1440) / 60), minutes: total % 60 };
}

// --- people and time of day ----------------------------------------------------------------------

/** The first word of a name, for "Good afternoon, Alex". */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';

/** The hour (0 to 23) at `t` in the viewer's zone. */
export function viewerHour(t: number): number {
  const h = new Intl.DateTimeFormat('en-US', { timeZone: viewerZone(), hour: 'numeric', hourCycle: 'h23' }).format(new Date(t));
  return Number(h) % 24;
}

/** Morning before noon, afternoon until 6 PM, evening after, in the viewer's own zone. */
export function partOfDay(t: number): 'morning' | 'afternoon' | 'evening' {
  const h = viewerHour(t);
  if (h < 12) return 'morning';
  return h < 18 ? 'afternoon' : 'evening';
}

/** A length of time as the learner screens write it: "30 min", "1 hr 50 min", "2 hrs 30 min". */
export function duration(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  const hrs = `${h} ${h === 1 ? 'hr' : 'hrs'}`;
  return r ? `${hrs} ${r} min` : hrs;
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/** A small count in words ("six"), a larger one in figures. */
export const countWord = (n: number): string => WORDS[n] ?? String(n);

/** "December 2026": the month and year of `t` in the viewer's zone. */
export const monthYear = (t: number): string =>
  new Intl.DateTimeFormat('en-US', { timeZone: viewerZone(), month: 'long', year: 'numeric' }).format(new Date(t));

/**
 * "Nov 12, 2026": the day of `t`, with its year (D-178, Account), in the viewer's zone unless another is
 * named (a date about money is said in billing's zone, `BILLING_TZ`, as the offer pages say it).
 */
export const dateYear = (t: number, zone: string = viewerZone()): string =>
  new Intl.DateTimeFormat('en-US', { timeZone: zone, month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(t));

/** "Tue, May 4, 2027": the weekday, day and year of `t` (D-178), in the viewer's zone unless another is named. */
export const dayYear = (t: number, zone: string = viewerZone()): string =>
  new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(t));
