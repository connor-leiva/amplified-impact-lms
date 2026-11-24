// When the course, and each of its weeks, opens to a learner (D-175). LOGIC HERE, EVERY DATE FROM DATA:
// the preview's opening is the cohort's `previewOpensAt` (Course settings), a week's opening is its
// module's (Scheduled, with its Opens date and time in the Module Builder), and D-153's instant stays
// the course's own opening for a plan. Nothing here names a date.
//
//   - ENTRY: a learner may enter the course once the course itself opens for their plan (D-153's
//     `acceleratorOpen`: the first live build and the plan's own start), or, before that, once the
//     cohort's pre-launch preview opens, with a live plan (bought in full or in two payments, not
//     ended, not paused for a payment). The preview ignores the plan's `startsAt`, which stays as
//     billing set it. With no preview date there is no preview: until the course opens, nothing does.
//   - A WEEK is open to a learner who may enter when the builder says it is: Published (open now), or
//     Scheduled and past its Opens (`isOpen`, the builder's own rule). A draft is not in the course.
//   - A KIT ITEM (a vault resource attached to a week) follows its week, by its visibility.
//
// OFF UNTIL THE DATA SAYS SO. With no preview date and every week Published (the seed), entry is
// D-153's exactly and every week opens with the course: deploying this changes nothing by itself.
//
// `acceleratorOpen` and `acceleratorLearnerIds` are untouched: the scheduler's reminders and digests
// read them, so no email moves (the brief's hard rule). H-14 (D-248) reads `acceleratorOpen` at a
// session's start for its reminders (`courseRoster`), so the first live build's reminders go out.

import { ACCELERATOR_OPTIONS, acceleratorOpen, acceleratorUpcoming, isAcceleratorModule, pausedForPayment } from './accelerator';
import type { AcceleratorPlan } from './accelerator';
import { canAccess, isOpen } from './status';
import type { AIEmployee, Cohort, Learner, Resource } from './types';

/** Whether a learner may enter the course now, and whether that is the pre-launch preview. */
export interface CourseEntry {
  open: boolean;
  preview: boolean;
  /**
   * D-202: this learner is a test account with early access. The course and its weeks are open
   * before the preview and before each week's date. Absent means the dates apply, as they do for
   * every real learner.
   */
  early?: boolean;
}

export const CLOSED: CourseEntry = { open: false, preview: false };

/** A plan that holds the course and is live: bought in full or in two payments, not ended, not paused. */
export const liveCoursePlan = (plans: readonly AcceleratorPlan[]): boolean =>
  plans.some((p) => p.kind === 'cohort' && p.option !== null && ACCELERATOR_OPTIONS.includes(p.option) && p.status !== 'ended' && !pausedForPayment(p));

/** Whether these plans let a learner into the course at `now`, given the cohort's release plan. */
export function courseEntry(plans: readonly AcceleratorPlan[], now: number, cohort: Pick<Cohort, 'previewOpensAt'> | null | undefined): CourseEntry {
  if (acceleratorOpen(plans, now)) return { open: true, preview: false };
  if (!liveCoursePlan(plans)) return CLOSED;
  const at = cohort?.previewOpensAt;
  return at !== undefined && now >= at ? { open: true, preview: true } : CLOSED;
}

/**
 * When the course opens for a buyer who can't enter it yet: the earlier of the preview's opening and
 * the course's own (D-153), or null (not a buyer, already open, or paused for a payment).
 */
export function courseUpcoming(plans: readonly AcceleratorPlan[], now: number, cohort: Pick<Cohort, 'previewOpensAt'> | null | undefined): number | null {
  if (!liveCoursePlan(plans)) return null;
  const course = acceleratorUpcoming(plans, now);
  const at = cohort?.previewOpensAt;
  const preview = at !== undefined && at > now ? at : null;
  if (course === null) return preview;
  return preview !== null && preview < course ? preview : course;
}

/**
 * Whether a week is open to a learner with this entry: published, or scheduled and past its opening.
 * Early access (a test account, D-202) opens every week that is in the course, before its date.
 * A draft stays out, as it does for everyone else.
 */
export const weekOpenFor = (m: Pick<AIEmployee, 'status' | 'opens'>, now: number, entry: CourseEntry): boolean =>
  entry.open && (entry.early ? m.status !== 'draft' : isOpen(m, now));

/** D-202: a seeded test account is left out of enrollment counts. Absent on every other learner. */
export const countsTowardEnrollment = (u: { test?: true }): boolean => u.test !== true;

/**
 * D-186: whether a learner may open a module (its steps, Mark step done, its files, its live build).
 *
 *   - A COURSE WEEK (`accelerator-week-N`) follows course access, which the plan decides (D-110), never the
 *     tier: the seed makes the weeks Team tier, and an Agent tier learner who bought the course must open
 *     them as a Team tier buyer does, while a plan without the course stays shut out whatever its tier.
 *     `course` is that answer where the caller knows it (the API reads it from the plan). Where it does
 *     not (the fixture build, whose snapshot carries a course week only for a learner in the course), a
 *     course week the learner has is open.
 *   - Every other module follows the tier, as before (`canAccess`).
 */
export const canOpenModule = (u: Pick<Learner, 'tier'> | null | undefined, m: Pick<AIEmployee, 'id' | 'tier'>, course?: boolean): boolean =>
  isAcceleratorModule(m.id) ? (course ?? true) : canAccess(u, m);

/**
 * Whether a learner sees a vault resource, by the week it is attached to. One attached to no course week
 * is the vault's as before. One attached to a course week follows that week by its visibility:
 * `hidden` never; `published` always; `open_in_preview` once its week opens or the preview does;
 * `hidden_until_open`, or none set, once its week opens.
 */
export function kitVisible(r: Pick<Resource, 'module' | 'visibility'>, weekOpen: boolean, preview: boolean): boolean {
  if (!r.module || !isAcceleratorModule(r.module)) return true;
  if (r.visibility === 'hidden') return false;
  if (r.visibility === 'published') return true;
  if (r.visibility === 'open_in_preview') return weekOpen || preview;
  return weekOpen;
}

// --- how the course shows a time (D-175): Mountain Time, with "MT", as the copy rules say ---------

const MT_DAY = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', weekday: 'short', month: 'short', day: 'numeric' });
const MT_TIME = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit' });

/** "Wed, Dec 9 · 12:00 PM MT": an instant as the course shows it. */
export const mountainWhen = (t: number): string => `${MT_DAY.format(new Date(t))} · ${MT_TIME.format(new Date(t))} MT`;
