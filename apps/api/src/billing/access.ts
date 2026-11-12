// The one rule that decides whether an account can open a skill (D-079), and the one that decides
// whether its live sessions are open.
//
//   The skill is free; or one of the account's plans covers the skill's set, has started, and is paid
//   up now or was paid up when the skill was released.
//
// "Has started" is the plan's `starts_at`: purchase for every plan but the Team Plan, whose agent
// skills open on Dec 14, 2026 with the starter path while its logins open at purchase (D-104), and the
// Agent Plan, whose skills open on Jan 4, 2027, the day of its first charge (D-106). The Agent Plan is
// paid through nothing until that charge is paid, so a trial that never pays opens nothing.
//
// That is "cancel and keep": a lapsed plan keeps everything released while it was paid, and nothing
// after. Since a skill opens only once it is released (`released_at <= now`), "paid up now" and "paid
// up at release" collapse into one comparison: `released_at <= paid_through`. A refund ends the plan
// (`ended`), which opens nothing at all.
//
// Pure, and every check goes through it: the library screen, `/api/skills` and every download.

import { pausedForPayment } from '@ai/core/accelerator';
import { PLAN_SETS } from './catalog';
import type { PlanKind, PlanStatus, SkillSet } from './catalog';

export interface PlanAccess {
  kind: PlanKind;
  /** How it was bought (`full`, `two_pay`, …): a two-pay AI Accelerator pauses on a failed payment (D-143). */
  option?: string | null;
  status: PlanStatus;
  /** When the plan's skills open. Absent: from the start. */
  startsAt?: number;
  paidThrough: number | null;
  liveUntil: number | null;
}

export interface SkillAccess {
  sets: SkillSet;
  free: boolean;
  releasedAt: number;
  status: 'draft' | 'published' | 'hidden';
}

/** Whether a plan of this kind opens a skill tagged with these sets. */
export function planCovers(kind: PlanKind, sets: SkillSet): boolean {
  const opens = PLAN_SETS[kind];
  return sets === 'both' ? opens.length > 0 : opens.includes(sets);
}

export function canOpenSkill(plans: readonly PlanAccess[], skill: SkillAccess, now: number): boolean {
  if (skill.status !== 'published' || skill.releasedAt > now) return false;
  if (skill.free) return true;
  return plans.some(
    (p) =>
      p.status !== 'ended' &&
      !pausedForPayment(p) &&
      p.paidThrough !== null &&
      (p.startsAt === undefined || now >= p.startsAt) &&
      planCovers(p.kind, skill.sets) &&
      skill.releasedAt <= p.paidThrough,
  );
}

/**
 * Whether a plan's live sessions (office hours, builds, coaching) are open at `now`. A plan with a
 * `live_until` has them until then; one without has them while it is paid up and not cancelled.
 */
export function liveSessionsOpen(plan: PlanAccess, now: number): boolean {
  if (plan.status === 'ended' || pausedForPayment(plan)) return false;
  if (plan.liveUntil !== null) return now < plan.liveUntil;
  return plan.status !== 'canceled' && plan.paidThrough !== null && now <= plan.paidThrough;
}

/**
 * A skill's state on the library screen. `upcoming` is announced but not yet released, or (D-140)
 * released and covered by a plan this viewer holds whose skills open on a later day: a Team Plan's
 * agent skills on Dec 14, an Agent Plan's on Jan 4. Before D-140 those read `locked`, so a buyer
 * who had just paid saw "Not in your plan." on every skill they had bought.
 */
export type SkillState = 'open' | 'locked' | 'upcoming';

/**
 * When a plan this viewer holds will open a released skill it doesn't open yet: the earliest
 * `startsAt` still ahead among the plans that cover the skill and are still going to start. Null
 * when none will. A cancelled plan is not going to start, and neither is an ended one. A plan that
 * has started and still doesn't open the skill (an Agent Plan whose Jan 4 charge isn't paid, a
 * lapsed one) is not "coming" either: that skill is `locked`.
 */
export function planOpensAt(plans: readonly PlanAccess[], skill: SkillAccess, now: number): number | null {
  if (skill.status !== 'published' || skill.free) return null;
  let at: number | null = null;
  for (const p of plans) {
    if (p.status === 'ended' || p.status === 'canceled') continue;
    if (p.startsAt === undefined || p.startsAt <= now) continue;
    if (!planCovers(p.kind, skill.sets)) continue;
    if (at === null || p.startsAt < at) at = p.startsAt;
  }
  return at;
}

export function skillState(plans: readonly PlanAccess[], skill: SkillAccess, now: number): SkillState {
  if (skill.releasedAt > now) return 'upcoming';
  if (canOpenSkill(plans, skill, now)) return 'open';
  return planOpensAt(plans, skill, now) !== null ? 'upcoming' : 'locked';
}

/** The day an `upcoming` skill opens: its release, or else its plan's first day (D-140). */
export function skillOpensAt(plans: readonly PlanAccess[], skill: SkillAccess, now: number): number | null {
  if (skill.releasedAt > now) return skill.releasedAt;
  return canOpenSkill(plans, skill, now) ? null : planOpensAt(plans, skill, now);
}
