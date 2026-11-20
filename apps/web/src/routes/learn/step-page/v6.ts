// The v6 step page's switch and the one rule for where it draws (D-210).
//
//   VITE_STEP_PAGE_V6=true    on: a step whose content the v6 page draws in full renders it, with no app chrome
//   anything else, or unset   off: every step keeps today's player. Production stays off until a build sets it.
//
// The learner shell and the step route both ask `v6StepAt`, with the same inputs, so the shell leaves its
// chrome off exactly when the step draws the v6 page. It reads no intake answers or operator counts: those
// only hide items or add a line the v6 page leaves out, so the answer cannot change once they load.

import type { Actor, Learner } from '@ai/core';
import { isVideoUpload } from '@ai/core/course-types';
import type { CoursePayload } from '../../course/Course.vm';
import { classifyReplayUrl } from '../../../components/replay/source';
import type { WeekRow } from '../learn.vm';
import { asideRows, stepVM } from '../Step.vm';
import type { StepPageVM, StepVM } from '../Step.vm';
import { buildKitVM } from '../WeekContent.vm';
import { v6Gap } from './StepPage.vm';

export interface StepPageFlagEnv {
  VITE_STEP_PAGE_V6?: string;
}

export function stepPageV6Enabled(env: StepPageFlagEnv = import.meta.env as StepPageFlagEnv): boolean {
  return env.VITE_STEP_PAGE_V6 === 'true';
}

export const STEP_PAGE_V6 = stepPageV6Enabled();

/** The week and step of `/learn/week/:week/step/:step`, or null. */
export function stepOfPath(pathname: string): { week: number; step: number } | null {
  const m = /^\/learn\/week\/(\d{1,2})\/step\/(\d{1,2})\/?$/.exec(pathname);
  return m ? { week: Number(m[1]), step: Number(m[2]) } : null;
}

/** Whether a built step view-model draws as the v6 page. */
export function v6Draws(vm: StepPageVM, row: WeekRow | undefined): vm is StepVM {
  if (vm.kind !== 'step') return false;
  const on = vm.tabs[0] ?? 'claude';
  const layout = vm.layouts?.[on];
  const block = layout?.videos[0];
  const kind = !block ? null : isVideoUpload(block.source) ? 'file' : (classifyReplayUrl(block.source.url)?.kind ?? 'link');
  return v6Gap(vm, layout, buildKitVM(row?.module, () => null), asideRows(vm.aside, vm.tabs.length ? on : null), kind) === null;
}

/** Whether the step at `pathname` draws the v6 page for this viewer. False with the flag off. */
export function v6StepAt(
  pathname: string,
  payload: CoursePayload | null,
  rows: readonly WeekRow[],
  actor: Actor,
  me: Learner | null,
  now: number,
  enabled: boolean = STEP_PAGE_V6,
): boolean {
  if (!enabled || !payload) return false;
  const at = stepOfPath(pathname);
  if (!at) return false;
  const row = rows.find((r) => r.week === at.week);
  const vm = stepVM(payload, row, at.step, actor, now, { checks: me?.checks, prefs: me?.coursePrefs, videoProgress: me?.videoProgress });
  return v6Draws(vm, row);
}
