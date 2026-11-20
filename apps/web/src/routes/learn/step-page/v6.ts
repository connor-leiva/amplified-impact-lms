// The v6 step page's switch and the one rule for where it draws (D-210).
//
//   VITE_STEP_PAGE_V6=true    every viewer: a step whose content the v6 page draws in full renders it, chrome-free
//   unset, or anything else   only the seeded test account (D-202, `Learner.test`), in every build, production
//                             included, so the owner can look at it live; every other learner keeps today's player
//
// The learner shell and the step route both ask `v6StepAt`, with the same inputs, so the shell leaves its
// chrome off exactly when the step draws the v6 page. It reads no intake answers or operator counts: those
// only hide items or add a line the v6 page leaves out, so the answer cannot change once they load.

import type { Actor, Learner } from '@ai/core';
import { isVideoUpload } from '@ai/core/course-types';
import type { CoursePayload } from '../../course/Course.vm';
import { classifyReplayUrl } from '../../../components/replay/source';
import type { WeekRow } from '../learn.vm';
import { PLATFORM_LABEL, asideRows, stepVM } from '../Step.vm';
import type { Platform, StepPageVM, StepVM } from '../Step.vm';
import { buildKitVM } from '../WeekContent.vm';
import { v6Gaps } from './StepPage.vm';

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

/** Every reason a built step keeps today's player, across all of its paths (empty: it draws as the v6 page). */
export function v6Whys(vm: StepPageVM, row: WeekRow | undefined): string[] {
  if (vm.kind !== 'step') return ['no such step'];
  if (!vm.pills || !Object.keys(vm.layouts ?? {}).length) return ['not a checklist step'];
  const kit = buildKitVM(row?.module, () => null);
  const paths: (Platform | null)[] = vm.tabs.length ? vm.tabs : [null];
  const out = new Set<string>();
  for (const on of paths) {
    const layout = vm.layouts?.[on ?? 'claude'] ?? (on === null ? Object.values(vm.layouts ?? {})[0] : undefined);
    const block = layout?.videos[0];
    const kind = !block ? null : isVideoUpload(block.source) ? 'file' : (classifyReplayUrl(block.source.url)?.kind ?? 'link');
    for (const why of v6Gaps(vm, layout, kit, asideRows(vm.aside, on), kind)) out.add(vm.tabs.length > 1 && on ? `${why} (${PLATFORM_LABEL[on]})` : why);
  }
  return [...out];
}

/** Why a built step keeps today's player (the first reason), or null when it draws as the v6 page. */
export function v6Why(vm: StepPageVM, row: WeekRow | undefined): string | null {
  return v6Whys(vm, row)[0] ?? null;
}

/** Whether a built step view-model draws as the v6 page. */
export function v6Draws(vm: StepPageVM, row: WeekRow | undefined): vm is StepVM {
  return v6Why(vm, row) === null;
}

/** Who may see it: everyone when the build sets the flag, otherwise only the seeded test account. */
export function v6On(me: Pick<Learner, 'test'> | null, flag: boolean = STEP_PAGE_V6): boolean {
  return flag || me?.test === true;
}

/** The step at `pathname` for this viewer: every reason it keeps today's player (empty: it draws the v6 page). */
function whysAt(pathname: string, payload: CoursePayload | null, rows: readonly WeekRow[], actor: Actor, me: Learner | null, now: number): string[] {
  if (!payload) return ['no course'];
  const at = stepOfPath(pathname);
  if (!at) return ['not a step'];
  const row = rows.find((r) => r.week === at.week);
  const vm = stepVM(payload, row, at.step, actor, now, { checks: me?.checks, prefs: me?.coursePrefs, videoProgress: me?.videoProgress });
  return v6Whys(vm, row);
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
  if (!enabled) return false;
  return whysAt(pathname, payload, rows, actor, me, now).length === 0;
}

const told = new Set<string>();
/**
 * For the test account only: says once per step, in the browser console, why a step keeps today's player
 * (a part of its content the v6 page does not draw), so the owner knows what to change. Nobody else is told.
 */
export function tellTestAccount(pathname: string, payload: CoursePayload | null, rows: readonly WeekRow[], actor: Actor, me: Learner | null, now: number): void {
  if (me?.test !== true) return;
  const whys = whysAt(pathname, payload, rows, actor, me, now);
  const why = whys.join('; ');
  if (!why || told.has(`${pathname}\0${why}`)) return;
  told.add(`${pathname}\0${why}`);
  console.info(`[v6 step page] ${pathname} keeps today's player: ${why}.`);
}
