// D-225: which pages draw a v3 page of their own, so the shell (`V3Frame`) knows whether to keep today's frame tokens
// around the page. The shell asks the same rules the routes do (IMPLEMENTATION-SPEC.md §4.D), so a page and its
// chrome never disagree.
import type { CoursePayload } from '../../course/Course.vm';
import type { WeekRow } from '../learn.vm';
import { scheduleVM, viewOf } from '../Schedule.vm';
import { learnSchedule } from '../routes';
import { v3ScheduleDraws } from './schedule.vm';

export function v3PageAt(
  pathname: string,
  search: string,
  payload: CoursePayload | null,
  rows: readonly WeekRow[],
  now: number,
): boolean {
  if (!payload) return false;
  const path = pathname.replace(/\/$/, '');
  if (path === learnSchedule()) {
    const vm = scheduleVM(payload, rows, undefined, viewOf(new URLSearchParams(search).get('view')), now);
    return v3ScheduleDraws(vm, payload.sessions, now);
  }
  return false;
}
