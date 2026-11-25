// The cohort welcome email (LMS-sent, after enrollment). Pure: no clock, no mail, no database.
//
// WHEN IT SENDS. Not at account creation and not with the set-password email. One welcome per
// (team owner, cohort). It is due at the later of the enrollment and the cohort's send time.
// The send time is the builder's "Welcome email sends at" when that is set, and otherwise the
// cohort's access-open time (see `accessOpensAt`). Someone who enrolls after the cohort is already
// live gets it at enrollment.
//
// THE SWITCH. `cohort_welcome_email` is off until a Console flip turns it on. `enabledAt` is that
// flip's time, recorded as `console_flags.turned_on_at` (an off-to-on flip stamps it, an on-to-off
// flip clears it). THE RULE: an enrollment that existed when the switch came on never gets the
// welcome, whatever the cohort's send time and whether or not the cohort is live yet. Only an
// enrollment made after the switch-on time qualifies (`enrolledBeforeSwitch`). Turning the switch
// on does not backfill. There is no bulk send; that would be a separate action if Connor asks for one.
//
// THE WORDS. The email is the Week 0 Is Open email's design, and its words live with its template
// (`apps/api/src/email/templates/cohort-welcome-html.ts`), as that email's do. This file gives it the
// instants (`welcomeSchedule`), Week 0's facts (`welcomeWeek0`), the cohort's name with its noun
// (`cohortLabel`) and the subject (`welcomeSubject`). Every clock the template shows is Mountain Time
// first and Central Time after it, computed from these instants (`sessionTimeMtCt`, `dueTimeMtCt` in
// release.ts), so each zone's daylight saving is its own. Nothing here names a calendar day of its own.
//
// WEEK 0 FROM DATA. Week 0's due date is the Week 0 module's Due (`modules.due_at`, the week
// builder's "Due"), its name is the title the learner course page shows (`course.title`), and its
// step count and the number of baseline tasks are read off its stored steps (`baselineTaskCount`).
// While Week 0 has no Due, or its baseline table can't be read, the welcome waits on the builder
// (`welcomeWeek0`) rather than name a day or a number of its own. Whether the "How the LMS Works" tour
// is live is read the way the LMS reads it (`tourVideoOf`, D-252), so the email mentions the tour only
// once staff have flagged it in Week 0's Media.

import { courseOpensAt } from './curriculum-week';
import type { CurriculumWeekRef } from './curriculum-week';
import { COURSE_DEFAULT_TIME, zonedInputs, zonedInstant } from './course-actions';
import type { StepPaths } from './course-types';
import type { Cohort } from './types';

/** The Console flag. Off until a flip turns it on. */
export const COHORT_WELCOME_FLAG = 'cohort_welcome_email';

/** The only address a test send may use, unless `WELCOME_TEST_ALLOWLIST` adds more. */
export const WELCOME_TEST_ADDRESS = 'accelerator-test@amplifiedimpact.io';

/** The tag GoHighLevel gets after a real welcome is sent. */
export const WELCOME_SENT_TAG = 'welcome-sent';


const MT = 'America/Denver';

export interface WelcomeWeek {
  week: number | null;
  opens: number | null;
  status: string;
  liveSessionId?: string | null;
  officeSessionId?: string | null;
  /** The week's Due (`modules.due_at`): Week 0's due date. */
  dueAt?: number | null;
  /** The week's title as the learner course page shows it (`course.title`). */
  title?: string | null;
  /** How many steps the week has (its checklist). */
  steps?: number | null;
  /** The rows of the week's time-baseline table, when it has one (`baselineTaskCount`). */
  baselineTasks?: number | null;
  /** D-252: the week's Media holds the flagged "How the LMS Works" tour (`tourVideoOf`). Only Week 0's can. */
  tour?: boolean;
}

/**
 * How many tasks a week's time baseline times: the rows of the table in its baseline step (the step whose title names a
 * baseline, Week 0's "Start Your Time Baseline"). Read off the stored steps, so a builder's edit is what the copy says.
 * Null when there is no such step or table, or when its Claude and ChatGPT tables disagree: the caller waits rather
 * than guess.
 */
export function baselineTaskCount(checklist: readonly { ch?: string; paths?: StepPaths }[] | null | undefined): number | null {
  if (!Array.isArray(checklist)) return null;
  const counts = new Set<number>();
  for (const step of checklist) {
    if (typeof step?.ch !== 'string' || !/baseline/i.test(step.ch)) continue;
    for (const path of [step.paths?.claude, step.paths?.chatgpt]) {
      for (const block of path?.blocks ?? []) {
        if (block && typeof block === 'object' && 'type' in block && block.type === 'table' && Array.isArray(block.rows)) counts.add(block.rows.length);
      }
    }
  }
  return counts.size === 1 ? [...counts][0]! : null;
}

/** The course's Week 0, as the learner course page has it: week 0, not a draft. */
export function week0Of(modules: readonly WelcomeWeek[]): WelcomeWeek | undefined {
  return modules.find((m) => m.week === 0 && m.status !== 'draft');
}

/** Week 0's Due, or null while the builder has not set one. */
export function week0DueAt(modules: readonly WelcomeWeek[]): number | null {
  const due = week0Of(modules)?.dueAt;
  return typeof due === 'number' && Number.isFinite(due) ? due : null;
}

/** What the welcome says about Week 0, all of it read from the Week 0 module. */
export interface WelcomeWeek0 {
  dueAt: number;
  title: string;
  steps: number;
  baselineTasks: number;
  /** The "How the LMS Works" tour is live: it opens on sign-in until seen, and is pinned on Week 0 (D-252). */
  tour: boolean;
}

export type WelcomeWeek0Result = { ok: true; week0: WelcomeWeek0 } | { ok: false; reason: 'no-week0' | 'no-week0-due' | 'no-baseline' };

/** Week 0's due date, name, step count and baseline count, or why the welcome must wait on the builder. */
export function welcomeWeek0(modules: readonly WelcomeWeek[]): WelcomeWeek0Result {
  const w = week0Of(modules);
  const title = w?.title?.trim() ?? '';
  if (!w || !title || !w.steps) return { ok: false, reason: 'no-week0' };
  const dueAt = week0DueAt(modules);
  if (dueAt === null) return { ok: false, reason: 'no-week0-due' };
  const baselineTasks = w.baselineTasks ?? null;
  if (!baselineTasks) return { ok: false, reason: 'no-baseline' };
  return { ok: true, week0: { dueAt, title, steps: w.steps, baselineTasks, tour: w.tour === true } };
}

export interface WelcomeSession {
  id: string;
  n: number;
  start: number;
  mins: number;
  kind: string | null;
}

/** What `welcomeDecision` tells the job to do with one enrollment on this tick. */
export type WelcomeDecision = 'hold' | 'wait' | 'send' | 'skip';

/**
 * The access-open time the welcome defaults to, when the builder has not set "Welcome email sends at".
 *
 * Week 0's Opens, when that week is scheduled. Otherwise the pre-launch preview. Otherwise the
 * earliest Opens of a dated week (Week 0 left out: it is "Open now"). Otherwise the cohort's start.
 * There is no separate "goes live" column; this is that time.
 */
export function accessOpensAt(cohort: Pick<Cohort, 'start' | 'previewOpensAt'>, modules: readonly WelcomeWeek[]): number {
  const week0 = modules.find((m) => m.week === 0 && m.status !== 'draft' && m.opens != null);
  if (week0?.opens != null) return week0.opens;
  if (cohort.previewOpensAt != null) return cohort.previewOpensAt;
  const weeks: CurriculumWeekRef[] = modules
    .filter((m): m is WelcomeWeek & { week: number } => m.week != null && m.week > 0 && m.status !== 'draft')
    .map((m) => ({ week: m.week, session: null, opens: m.opens }));
  return courseOpensAt(weeks) ?? cohort.start;
}

/** When the welcome may go out: the builder's instant, or `accessOpensAt`. */
export function welcomeSendInstant(
  cohort: Pick<Cohort, 'start' | 'previewOpensAt' | 'welcomeSendsAt'>,
  modules: readonly WelcomeWeek[],
): number {
  return cohort.welcomeSendsAt ?? accessOpensAt(cohort, modules);
}

/**
 * Whether an enrollment existed when the switch came on: made at or before the switch-on time.
 * Such an enrollment never gets the welcome. Only one made strictly after it qualifies.
 */
export function enrolledBeforeSwitch(enrolledAt: number, switchOnAt: number): boolean {
  return enrolledAt <= switchOnAt;
}

/**
 * One enrollment on one tick.
 *
 * `enabledAt` (the switch-on time) null: the switch is off, so nothing is decided (`hold`). An
 * enrollment that existed when the switch came on is `skip`, before anything else: its cohort's
 * send time and whether the cohort is live yet don't matter (no backfill, ever). Not yet due is
 * `wait`. Otherwise `send`.
 */
export function welcomeDecision(input: { enabledAt: number | null; now: number; enrolledAt: number; sendsAt: number }): WelcomeDecision {
  if (input.enabledAt === null) return 'hold';
  if (enrolledBeforeSwitch(input.enrolledAt, input.enabledAt)) return 'skip';
  const due = Math.max(input.enrolledAt, input.sendsAt);
  if (input.now < due) return 'wait';
  return 'send';
}

/** Whether a test send may go to this address. The built-in address, plus any extra list. */
export function welcomeTestAllowed(email: string, extra: readonly string[] = []): boolean {
  const to = email.trim().toLowerCase();
  if (!to) return false;
  if (to === WELCOME_TEST_ADDRESS) return true;
  return extra.some((a) => a.trim().toLowerCase() === to);
}

export interface WelcomeSchedule {
  cohortName: string;
  sendsAt: number;
  session1At: number;
  session1Mins: number;
  officeHoursAt: number;
  /** Week 1's Opens, when the builder set one. */
  weekOpenAt: number | null;
  /** The cohort's default open time (`HH:MM`), used when Week 1 has no Opens. */
  weekOpenClock: string;
  /**
   * `weekOpenClock` as a real instant: that Mountain wall time on the cohort's start date, so its Central half is
   * computed for that date's daylight saving, not assumed. Used when Week 1 has no Opens.
   */
  weekOpenClockAt: number;
}

export type WelcomeScheduleResult = { ok: true; schedule: WelcomeSchedule } | { ok: false; reason: 'no-session' | 'no-office-hours' };

/**
 * The instants the copy needs, from the cohort and its sessions.
 *
 * The live build is the week-1 module's session, else the session marked `live_build`, else session
 * 1, else the earliest session. Office hours is the week-1 module's office-hours session, else the
 * earliest `office_hours` session, else the next session after the live build. A cohort with no
 * second session cannot name an office-hours time, and the job waits rather than invent one.
 */
export function welcomeSchedule(
  cohort: {
    name: string;
    start: number;
    previewOpensAt?: number | null;
    welcomeSendsAt?: number | null;
    defaultOpenTime?: string | null;
  },
  modules: readonly WelcomeWeek[],
  sessions: readonly WelcomeSession[],
): WelcomeScheduleResult {
  const week1 = modules.find((m) => m.week === 1 && m.status !== 'draft');
  const byId = (id: string | null | undefined) => (id ? sessions.find((s) => s.id === id) : undefined);
  const tagged = (kind: string) => sessions.filter((s) => s.kind === kind).sort((a, b) => a.n - b.n)[0];
  const earliest = [...sessions].sort((a, b) => a.n - b.n)[0];
  const live = byId(week1?.liveSessionId) ?? tagged('live_build') ?? sessions.find((s) => s.n === 1) ?? earliest;
  if (!live) return { ok: false, reason: 'no-session' };
  const office =
    byId(week1?.officeSessionId) ??
    tagged('office_hours') ??
    [...sessions].filter((s) => s.id !== live.id).sort((a, b) => a.start - b.start)[0];
  if (!office) return { ok: false, reason: 'no-office-hours' };
  return {
    ok: true,
    schedule: {
      cohortName: cohort.name,
      sendsAt: welcomeSendInstant(
        {
          start: cohort.start,
          previewOpensAt: cohort.previewOpensAt ?? undefined,
          welcomeSendsAt: cohort.welcomeSendsAt ?? undefined,
        },
        modules,
      ),
      session1At: live.start,
      session1Mins: live.mins,
      officeHoursAt: office.start,
      weekOpenAt: week1?.opens ?? null,
      weekOpenClock: cohort.defaultOpenTime ?? COURSE_DEFAULT_TIME,
      weekOpenClockAt: clockOnDay(cohort.defaultOpenTime ?? COURSE_DEFAULT_TIME, cohort.start),
    },
  };
}

/** `HH:MM` Mountain on the Mountain date of `day`, as an instant. An unreadable clock falls back to the default time. */
function clockOnDay(hhmm: string, day: number): number {
  const date = zonedInputs(day, MT).date;
  const at = zonedInstant(date, hhmm, MT);
  return Number.isNaN(at) ? zonedInstant(date, COURSE_DEFAULT_TIME, MT) : at;
}

/**
 * The cohort as the copy names it, with its noun: "December 2026" is "December 2026 Cohort", as the Week 0 email and the
 * admin's Learners page say it. A name that already ends in "Cohort" is left as it is.
 */
export function cohortLabel(name: string): string {
  const n = name.trim();
  return /\bcohort$/i.test(n) ? n : `${n} Cohort`;
}

/** The welcome's subject: "🎉 Welcome to the December 2026 Cohort: You’re In". The subject table and the template share it. */
export const welcomeSubject = (cohortName: string): string => `🎉 Welcome to the ${cohortLabel(cohortName)}: You’re In`;
