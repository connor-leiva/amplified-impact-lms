// The Amplified AI Accelerator, cohort one, as the platform's `dec26` cohort (DECISIONS.md D-110).
//
// THIS FILE IS THE CALENDAR AND THE RULES, NOT THE WORDS. The course's words (each week's intro,
// setup order, live-build page, office-hours page, homework, evidence packet and rubric) are in
// `accelerator-content.ts`; the Week 1 calculation worksheet is `worksheet.ts`. This file holds what
// a test can pin exactly: the session dates and times, the ids, which plans open the course, and the
// Library routes the course links to.
//
// THE CALENDAR IS LOCKED (the PM's brief, Connor): builds on Wednesdays at 1:00 PM Central for 90
// minutes, office hours on Thursdays at 1:00 PM Central for 60 minutes, nothing on Dec 23 or Dec 30.
// Dec 10 and Dec 17 are the two goal-planning sessions, each with a short office-hours segment.
// Every date here is in CST (UTC-6): the cohort ends Feb 4, a month before daylight time starts.
//
// TWO SERIES IN ONE COHORT. `moduleForSession` matches a module's `session` to a session's `n`, so a
// build's `n` is its week (1 to 8) and is unique. The office hours are a second series: ids
// `dec26-oh1` to `dec26-oh8` and `n` = 100 + week, which no module's `session` ever names. The week an
// office hour belongs to is read off its id (`sessionWeek` in sessions.ts), so the series needs no new
// column and no migration.
//
// Pure: no clock, no random source. Every instant is a `Date.parse` of a literal.

import { COHORT_ONE } from './offer';
import type { Cohort, Session } from './types';

/** A bare `YYYY-MM-DDTHH:MM` read as Central Time. December to February is CST. */
const CT = (s: string): number => Date.parse(`${s}:00-06:00`);

/** The platform's production cohort: cohort one, `COHORT_ONE.id` in offer.ts. */
export const ACCELERATOR_COHORT_ID = 'dec26';

/** Who teaches cohort one. Never the prototype's invented instructor. */
export const ACCELERATOR_INSTRUCTOR = 'Connor Leiva';

/** The program's name, as `PLAN_NAMES.cohort` prints it. */
export const ACCELERATOR_NAME = 'Amplified AI Accelerator';

/** Where learners write for help (the PM's brief). */
export const ACCELERATOR_SUPPORT_EMAIL = 'support@amplifiedimpact.io';

/** Live builds: Wednesday, 1:00 PM Central, 90 minutes. */
export const BUILD_MINS = 90;
/** Office hours and the goal-planning sessions: Thursday, 1:00 PM Central, 60 minutes. */
export const OFFICE_HOURS_MINS = 60;
/** The session time, said in the program's zone. Screens say it through `fmt.*`. */
export const SESSION_TIME_CT = '13:00';

/** No session on these days: the holiday break (the brief: "nothing on Dec 23 or Dec 30"). */
export const HOLIDAY_SKIPS: readonly string[] = ['2026-12-23', '2026-12-24', '2026-12-30', '2026-12-31'];

/**
 * When the course opens, Week 0 and all eight weeks at once: the first live build, Wednesday, Dec 2,
 * 2026, 1:00 PM Central (12:00 PM Mountain), `COHORT_ONE.firstBuildAt` (D-153, Connor, 2026-11-13:
 * logins go out now, and nothing paid opens until the sessions start). It used to be the Nov 16 invite
 * hold; it no longer follows `INVITES_FROM` in any way.
 */
export const COURSE_OPENS_AT = COHORT_ONE.firstBuildAt;

/** Week 0 is due before the first build. */
export const WEEK0_DUE_AT = CT('2026-12-02T13:00');

export interface CalendarWeek {
  week: number;
  /** The Wednesday build, `YYYY-MM-DD`, Central. */
  build: string;
  /** The Thursday office hour (or goal-planning session), `YYYY-MM-DD`, Central. */
  thursday: string;
  /** The Thursday session's title. */
  thursdayTitle: string;
  /** The build's title: the week's flagship, then "Live Build". */
  buildTitle: string;
}

/**
 * The locked calendar, one row per week. Week 0 is async and has no row: it opens with the invite
 * hold and is due before Dec 2.
 */
export const ACCELERATOR_CALENDAR: readonly CalendarWeek[] = [
  { week: 1, build: '2026-12-02', thursday: '2026-12-03', buildTitle: 'Lead-Source ROI Live Build', thursdayTitle: 'Lead-Source ROI Office Hours' },
  { week: 2, build: '2026-12-09', thursday: '2026-12-10', buildTitle: 'Morning Brief Live Build', thursdayTitle: 'Goal-Planning Session 1 and Office Hours' },
  { week: 3, build: '2026-12-16', thursday: '2026-12-17', buildTitle: 'L10 Meeting Prep Live Build', thursdayTitle: 'Goal-Planning Session 2 and Office Hours' },
  { week: 4, build: '2027-01-06', thursday: '2027-01-07', buildTitle: 'FUB Pipeline Review Live Build', thursdayTitle: 'FUB Pipeline Review Office Hours' },
  { week: 5, build: '2027-01-13', thursday: '2027-01-14', buildTitle: 'Agent 1:1 Prep Live Build', thursdayTitle: 'Agent 1:1 Prep Office Hours' },
  { week: 6, build: '2027-01-20', thursday: '2027-01-21', buildTitle: 'Team Playbook Builder Live Build', thursdayTitle: 'Team Playbook Builder Office Hours' },
  { week: 7, build: '2027-01-27', thursday: '2027-01-28', buildTitle: 'New Agent Onboarding Plan Live Build', thursdayTitle: 'New Agent Onboarding Plan Office Hours' },
  { week: 8, build: '2027-02-03', thursday: '2027-02-04', buildTitle: 'Cohort-End Review Live Build', thursdayTitle: 'Cohort-End Review Office Hours' },
];

/** The Thursdays that are goal-planning sessions rather than plain office hours (Dec 10 and Dec 17). */
export const GOAL_PLANNING_WEEKS: readonly number[] = [2, 3];

export const buildSessionId = (week: number): string => `${ACCELERATOR_COHORT_ID}-s${week}`;
export const officeHoursSessionId = (week: number): string => `${ACCELERATOR_COHORT_ID}-oh${week}`;
/** An office hour's `n`: a second series, never equal to a module's `session` (1 to 8). */
export const officeHoursN = (week: number): number => 100 + week;

/**
 * The sixteen sessions: eight builds and eight Thursdays, in date order. No Zoom URL is invented:
 * `zoom` is empty until staff set the real link (the course page says "Join in Sessions"), and the
 * join route reads an empty URL as shut.
 */
export function acceleratorSessions(): Session[] {
  const out: Session[] = [];
  for (const w of ACCELERATOR_CALENDAR) {
    out.push({
      id: buildSessionId(w.week),
      cohortId: ACCELERATOR_COHORT_ID,
      n: w.week,
      title: w.buildTitle,
      start: CT(`${w.build}T${SESSION_TIME_CT}`),
      mins: BUILD_MINS,
      zoom: '',
      live: false,
      attended: null,
      replay: null,
      views: 0,
    });
    out.push({
      id: officeHoursSessionId(w.week),
      cohortId: ACCELERATOR_COHORT_ID,
      n: officeHoursN(w.week),
      title: w.thursdayTitle,
      start: CT(`${w.thursday}T${SESSION_TIME_CT}`),
      mins: OFFICE_HOURS_MINS,
      zoom: '',
      live: false,
      attended: null,
      replay: null,
      views: 0,
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

/**
 * Cohort one. It starts with the first build and ends when the Feb 4 office hour does. 15 seats, the
 * offer's `COHORT_SEATS`; `enrolled` is derived from the learner rows, so it starts at zero.
 */
export function acceleratorCohort(): Cohort {
  const last = ACCELERATOR_CALENDAR[ACCELERATOR_CALENDAR.length - 1]!;
  return {
    id: ACCELERATOR_COHORT_ID,
    name: `${ACCELERATOR_NAME} · December 2026`,
    start: CT(`${ACCELERATOR_CALENDAR[0]!.build}T${SESSION_TIME_CT}`),
    end: CT(`${last.thursday}T${SESSION_TIME_CT}`) + OFFICE_HOURS_MINS * 60_000,
    weeks: 8,
    status: 'enrolling',
    capacity: 15,
    enrolled: 0,
    cadence: 'Wed builds and Thu office hours · 1:00 PM CT',
  };
}

// --- the modules' ids ------------------------------------------------------------------------------

/** Week 0 to Week 8. */
export const ACCELERATOR_WEEKS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const MODULE_PREFIX = 'accelerator-week-';
export const acceleratorModuleId = (week: number): string => `${MODULE_PREFIX}${week}`;
export const ACCELERATOR_MODULE_IDS: readonly string[] = ACCELERATOR_WEEKS.map(acceleratorModuleId);
/** Whether an AI Employee is one of the course's nine weeks. The demo's six never are. */
export const isAcceleratorModule = (id: string): boolean => ACCELERATOR_MODULE_IDS.includes(id);

/** `/course/week-3`: the course page for a week, on the learn host. */
export const coursePath = (week: number): string => `/course/week-${week}`;

// --- who can open it -------------------------------------------------------------------------------

/** The plan rows the rule reads: `plans.kind`, `plans.option`, `plans.status`, `plans.starts_at`. */
export interface AcceleratorPlan {
  kind: string;
  option: string | null;
  status: string;
  startsAt?: number | null;
}

/** The two ways to buy the AI Accelerator (offer.ts `CARTS`): in full and in two payments. */
export const ACCELERATOR_OPTIONS: readonly string[] = ['full', 'two_pay'];

/**
 * Whether an account's plans open the course: Week 0 and all eight weeks at once (no drip), from the
 * invite hold on.
 *
 * A plan of kind `cohort`, bought in full or in two payments, that has started and has not ended. A
 * refund ends a plan (`ended`) and closes the course. Every other plan (Amplified Insiders, the Team
 * Plan, the retired library) opens the Library as before and not the course. Live sessions keep their
 * own window: the Zoom join stays date-gated by `joinMode`.
 */
export function acceleratorOpen(plans: readonly AcceleratorPlan[], now: number, opensAt: number = COURSE_OPENS_AT): boolean {
  if (now < opensAt) return false;
  return plans.some(
    (p) =>
      p.kind === 'cohort' &&
      p.option !== null &&
      ACCELERATOR_OPTIONS.includes(p.option) &&
      p.status !== 'ended' &&
      !pausedForPayment(p) &&
      (p.startsAt === undefined || p.startsAt === null || now >= p.startsAt),
  );
}

/**
 * D-153: when the course opens for an account that has bought it but cannot open it yet, or null.
 *
 * A live AI Accelerator plan (not ended, not paused for a payment) whose course is closed only by
 * time: before `opensAt`, or before the plan's own `startsAt`. The later of the two is when it opens.
 * What the pre-launch welcome says ("sessions start Wednesday, Dec 2"), drawn from the plan rows, so it
 * shows while the snapshot holds none of the course.
 */
export function acceleratorUpcoming(plans: readonly AcceleratorPlan[], now: number, opensAt: number = COURSE_OPENS_AT): number | null {
  let at: number | null = null;
  for (const p of plans) {
    if (p.kind !== 'cohort' || p.option === null || !ACCELERATOR_OPTIONS.includes(p.option)) continue;
    if (p.status === 'ended' || pausedForPayment(p)) continue;
    const opens = Math.max(opensAt, p.startsAt ?? 0);
    if (now >= opens) return null; // one plan already opens it
    if (at === null || opens < at) at = opens;
  }
  return at;
}

/**
 * D-143: a plan whose access is paused until a payment goes through. The AI Accelerator bought in
 * two payments, once its second payment fails: Stripe marks the subscription past due and keeps
 * retrying, and the webhook mirrors that as `past_due`. The course, its sessions, its skills and its
 * live sessions close until that invoice is paid, which sets the plan `active` again and reopens
 * everything with no one doing anything. Every other `past_due` plan keeps its access as before.
 */
export function pausedForPayment(p: { kind: string; option?: string | null; status: string }): boolean {
  return p.kind === 'cohort' && p.option === 'two_pay' && p.status === 'past_due';
}

/** Whether the course is closed only because a payment is due (D-143): what the screen says instead of "not in your plan". */
export function acceleratorPaused(plans: readonly AcceleratorPlan[], now: number, opensAt: number = COURSE_OPENS_AT): boolean {
  return !acceleratorOpen(plans, now, opensAt) && plans.some(pausedForPayment);
}

// --- the Library it piggybacks on ------------------------------------------------------------------

/** The public site, where every Library page and its guided setup lives (`SETUP_GUIDE_ORIGIN`). */
export const LIBRARY_ORIGIN = 'https://www.amplifiedimpact.io';

/** A Library route, absolute: the course is on learn, the Library pages are on www. */
export const libraryHref = (route: string): string => `${LIBRARY_ORIGIN}${route}`;

/** Where a buyer downloads every skill their plan opens: the Skill Library, on learn (D-079). */
export const SKILL_LIBRARY_PATH = '/skill-library';

/**
 * EXPECTED, NOT YET MERGED: none. Morning Brief (Week 2's flagship, D-108) and New Agent Onboarding Plan
 * (Week 7's, D-109) were here while they were built on their own branches; both are in this branch's
 * history now (Ampy, 2026-11-11: "empty LIBRARY_ROUTES_PENDING_MERGE once #27 and #25 are in its
 * history"), so every flagship is a Library page like the rest.
 *
 * KEEP THIS LIST EMPTY. A course link to a page that does not exist is a bug, not a pending item.
 */
export const LIBRARY_ROUTES_PENDING_MERGE: readonly string[] = [];
