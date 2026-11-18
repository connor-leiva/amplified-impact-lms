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

import { acceleratorModuleId } from './accelerator';
import { isLockedWeek } from './course';
import type { CourseSessionRow, LearnerCourseWeek, OpenCourseWeek } from './course';
import { viewerZone } from './time';
import type { AIEmployee, Db, Learner, Progress, Step } from './types';

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

/** The snapshot's module for a course week, when the snapshot carries it. */
export const weekModuleOf = (db: Pick<Db, 'modules'>, week: number): AIEmployee | undefined =>
  db.modules.find((m) => m.id === acceleratorModuleId(week));

/** The signed-in learner's row in their snapshot, or null (staff, or no row). */
export const learnerOf = (db: Pick<Db, 'users'>, userId: string | null): Learner | null =>
  userId === null ? null : (db.users.find((u) => u.id === userId) ?? null);

/** A learner's progress on a course week, when there is any. */
export const progressOn = (me: Learner | null, week: number): Progress | undefined => me?.progress?.[acceleratorModuleId(week)];

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

/** The session running now, if one is. */
export const liveSessionAt = <S extends Pick<CourseSessionRow, 'start' | 'mins'>>(sessions: readonly S[], now: number): S | null =>
  sessions.find((s) => s.start <= now && now < sessionEndsAt(s)) ?? null;

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
