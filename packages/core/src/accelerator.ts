// The Amplified AI Accelerator, cohort one, as the platform's `dec26` cohort (DECISIONS.md D-110).
//
// THE RULES AND THE IDS, NOT THE WORDS OR THE CALENDAR (D-173). The course's words and its calendar
// (session dates, titles and times) are data: the database holds them, the curriculum builder edits
// them, and their first copy is the one-time seed in `packages/core/seed/accelerator-v1.ts`, which
// runtime code never imports. This file holds what code needs to find and gate the course: the cohort
// and module ids, the session id series, which plans open the course, and the Library paths.
//
// TWO SERIES IN ONE COHORT. `moduleForSession` matches a module's `session` to a session's `n`, so a
// build's `n` is its week (1 to 8) and is unique. The office hours are a second series: ids
// `dec26-oh1` to `dec26-oh8` and `n` = 100 + week, which no module's `session` ever names. The week an
// office hour belongs to is read off its id (`sessionWeek` in sessions.ts).
//
// Pure: no clock, no random source.

import { COHORT_ONE } from './offer';

/** The platform's production cohort: cohort one, `COHORT_ONE.id` in offer.ts. */
export const ACCELERATOR_COHORT_ID = 'dec26';

/** A plan without the course asking for it: `GET /api/course`'s 403, and (D-186) a course week's step. */
export const NOT_IN_PLAN = 'The AI Accelerator isn’t in your plan.';

/** Where learners write for help (the PM's brief). */
export const ACCELERATOR_SUPPORT_EMAIL = 'support@amplifiedimpact.io';

/**
 * When the course opens, Week 0 and all eight weeks at once: the first live build, Wednesday, Dec 2,
 * 2026, 1:00 PM Central (12:00 PM Mountain), `COHORT_ONE.firstBuildAt` (D-153, Connor, 2026-11-13:
 * logins go out now, and nothing paid opens until the sessions start). It used to be the Nov 16 invite
 * hold; it no longer follows `INVITES_FROM` in any way. Billing's date (offer.ts), not course content:
 * D-173 leaves it here until the pre-launch gating reads each week's open time from the database.
 */
export const COURSE_OPENS_AT = COHORT_ONE.firstBuildAt;

export const buildSessionId = (week: number): string => `${ACCELERATOR_COHORT_ID}-s${week}`;
export const officeHoursSessionId = (week: number): string => `${ACCELERATOR_COHORT_ID}-oh${week}`;
/** An office hour's `n`: a second series, never equal to a module's `session` (1 to 8). */
export const officeHoursN = (week: number): number => 100 + week;

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
 * H-14 (D-247): who is in the course at a given instant, for the scheduler's session emails. `has(userId, at)` is
 * `acceleratorOpen` on the plans of the learner's team, read at `at`, not at the tick: a reminder about a session
 * that hasn't started asks at the session's start, so the 24-hour and 1-hour reminders for the first live build
 * (which opens the course, `COURSE_OPENS_AT`) reach every buyer whose course opens with it. Nothing else changes:
 * the course, its weeks and the Join window still open at `COURSE_OPENS_AT`.
 */
export interface CourseRoster {
  has(userId: string, at: number): boolean;
}

export function courseRoster(
  plansByTeam: ReadonlyMap<string, readonly AcceleratorPlan[]>,
  teamOfLearner: ReadonlyMap<string, string | null>,
  opensAt: number = COURSE_OPENS_AT,
): CourseRoster {
  return {
    has: (userId, at) => {
      const team = teamOfLearner.get(userId);
      const plans = team ? plansByTeam.get(team) : undefined;
      return !!plans && acceleratorOpen(plans, at, opensAt);
    },
  };
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
