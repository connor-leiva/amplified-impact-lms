// The v6 step page's switch and the one rule for where it draws (D-210).
//
//   unset, or anything but 'false'   every viewer: every step draws the v6 page, chrome-free
//   VITE_STEP_PAGE_V6=false          only the seeded test account (D-202, `Learner.test`); everyone else keeps the
//                                    step player it had before, a way back without a revert
//
// The learner shell and the step route both ask `v6StepAt`, with the same inputs, so the shell leaves its
// chrome off exactly when the step draws the v6 page.

import type { Actor, Learner } from '@ai/core';
import type { CoursePayload } from '../../course/Course.vm';
import type { WeekRow } from '../learn.vm';
import { stepVM } from '../Step.vm';
import type { StepPageVM, StepVM } from '../Step.vm';

export interface StepPageFlagEnv {
  VITE_STEP_PAGE_V6?: string;
}

export function stepPageV6Enabled(env: StepPageFlagEnv = import.meta.env as StepPageFlagEnv): boolean {
  return env.VITE_STEP_PAGE_V6 !== 'false';
}

export const STEP_PAGE_V6 = stepPageV6Enabled();

/** The week and step of `/learn/week/:week/step/:step`, or null. */
export function stepOfPath(pathname: string): { week: number; step: number } | null {
  const m = /^\/learn\/week\/(\d{1,2})\/step\/(\d{1,2})\/?$/.exec(pathname);
  return m ? { week: Number(m[1]), step: Number(m[2]) } : null;
}

/** Whether a built step view-model draws as the v6 page: every step does (D-210). */
export function v6Draws(vm: StepPageVM, _row?: WeekRow): vm is StepVM {
  return vm.kind === 'step';
}

/** Who may see it: everyone unless the build turns it off, and the seeded test account always. */
export function v6On(me: Pick<Learner, 'test'> | null, flag: boolean = STEP_PAGE_V6): boolean {
  return flag || me?.test === true;
}

/** Whether the step at `pathname` draws the v6 page for this viewer. */
export function v6StepAt(
  pathname: string,
  payload: CoursePayload | null,
  rows: readonly WeekRow[],
  actor: Actor,
  me: Learner | null,
  now: number,
  enabled: boolean = v6On(me),
): boolean {
  if (!enabled || !payload) return false;
  const at = stepOfPath(pathname);
  if (!at) return false;
  const row = rows.find((r) => r.week === at.week);
  const vm = stepVM(payload, row, at.step, actor, now, { checks: me?.checks, prefs: me?.coursePrefs, videoProgress: me?.videoProgress });
  return v6Draws(vm, row);
}
