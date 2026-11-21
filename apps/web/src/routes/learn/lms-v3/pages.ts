// D-225: which pages draw a v3 page of their own, so the shell (`V3Frame`) knows whether to keep today's frame tokens
// around the page. The shell asks the same rules the routes do (IMPLEMENTATION-SPEC.md §4.D), so a page and its
// chrome never disagree.
import type { CoursePayload } from '../../course/Course.vm';
import type { WeekRow } from '../learn.vm';
import { scheduleVM, viewOf } from '../Schedule.vm';
import { learnSchedule } from '../routes';
import { v3ScheduleDraws } from './schedule.vm';
import { weekVM } from '../Week.vm';
import { v3LockedDraws, v3WeekDraws } from './week.vm';
import { isCommunityPath } from './v3';

export function v3PageAt(
  pathname: string,
  search: string,
  payload: CoursePayload | null,
  rows: readonly WeekRow[],
  now: number,
): boolean {
  // D-231: the Community draws its own pages (`[data-ai="community"]`, `[data-ai="thread"]`).
  if (isCommunityPath(pathname)) return true;
  if (!payload) return false;
  const path = pathname.replace(/\/$/, '');
  if (path === learnSchedule()) {
    const vm = scheduleVM(payload, rows, undefined, viewOf(new URLSearchParams(search).get('view')), now);
    return v3ScheduleDraws(vm, payload.sessions, now);
  }
  // D-228: a week's overview (not its steps): the open week when `v3WeekDraws`, the locked week when `v3LockedDraws`.
  const m = /^\/learn\/week\/(\d{1,2})$/.exec(path);
  if (m) {
    const r = rows.find((x) => x.week === Number(m[1]));
    if (!r) return false;
    if (r.state === 'locked') {
      const vm = weekVM(payload, rows, r.week, now, () => null);
      return vm.kind === 'locked' && v3LockedDraws(vm, r);
    }
    return v3WeekDraws(r, payload.sessions);
  }
  return false;
}
