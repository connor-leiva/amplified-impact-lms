// D-177: the learner portal v2's logic, pure. The course and the snapshot are the deployed seed's (the
// new Weeks 0 to 3, the release plan), so the steps, ids and dates are the ones a learner meets.
import { afterEach, describe, expect, it } from 'vitest';
import { acceleratorModuleId } from '../src/accelerator';
import { courseFor, courseSessions, isLockedWeek } from '../src/course';
import type { OpenCourseWeek } from '../src/course';
import {
  countWord,
  countdown,
  dateYear,
  dayYear,
  currentWeek,
  duration,
  firstName,
  learnerOf,
  liveSessionAt,
  minutesInAll,
  minutesLeft,
  monthYear,
  partOfDay,
  progressOn,
  stepCount,
  upcomingSessions,
  weekModuleOf,
  weekState,
  weekSteps,
} from '../src/learner';
import { setViewerZone } from '../src/time';
import type { Db, Learner } from '../src/types';
import { planContentV2 } from '../seed/content-v2';
import { planCopyV1 } from '../seed/copy-v1';
import { seedProduction } from '../seed/curriculum';
import { planReleaseV1 } from '../seed/release-plan-v1';

const deployed = (): Db => planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
/** Nov 18, 2026, 2:00 PM MT: the pre-launch preview, Week 0 open and Week 1 opening Dec 2. */
const NOW = Date.parse('2026-11-18T21:00:00Z');
const PREVIEW = { open: true, preview: true };

const learner = (steps: string[]): Learner => ({
  id: 'u1',
  name: 'Dana Whitfield Ross',
  email: 'dana@example.com',
  tier: 'team',
  role: 'Team Owner',
  teamId: null,
  cohortId: 'dec26',
  joined: 0,
  last: null,
  status: 'active',
  progress: { [acceleratorModuleId(0)]: { steps, builtAt: null, deployedAt: null, runtime: null } },
});

afterEach(() => setViewerZone(null));

describe('the learner portal v2 logic (D-177)', () => {
  const db = deployed();
  const course = courseFor(db, NOW, PREVIEW)!;
  const w0 = course.weeks[0] as OpenCourseWeek;

  it('opens Week 0 and locks the rest in the preview, as the API sends them', () => {
    expect(isLockedWeek(w0)).toBe(false);
    expect(course.weeks.slice(1).every(isLockedWeek)).toBe(true);
  });

  it('lines the course’s steps up with the snapshot’s ids, and marks done and up next from progress', () => {
    const me = learner(['c1', 'c2']);
    const steps = weekSteps(w0, weekModuleOf(db, 0), progressOn(me, 0));
    expect(steps).toHaveLength(8);
    expect(steps.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
    expect(steps.map((s) => s.done)).toEqual([true, true, false, false, false, false, false, false]);
    expect(steps.filter((s) => s.current).map((s) => s.n)).toEqual([3]);
    expect(stepCount(steps)).toEqual({ done: 2, total: 8 });
    expect(weekState(w0, steps)).toBe('in_progress');
    expect(minutesInAll(steps)).toBe(165);
    expect(minutesLeft(steps)).toBe(125);
  });

  it('never vouches for an id whose step words differ, so nothing is ticked under the wrong id', () => {
    const m = structuredClone(weekModuleOf(db, 0)!);
    m.checklist[2]!.text = 'Something staff changed after the page loaded';
    const steps = weekSteps(w0, m, { steps: ['c3'] });
    expect(steps[2]).toMatchObject({ id: null, done: false });
    expect(steps.filter((s) => s.done)).toEqual([]);
    expect(weekSteps(w0, undefined, undefined).every((s) => s.id === null && !s.done)).toBe(true);
  });

  it('reads a week as not started, in progress, built or locked', () => {
    const all = weekSteps(w0, weekModuleOf(db, 0), { steps: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] });
    expect(weekState(w0, all)).toBe('built');
    expect(all.some((s) => s.current)).toBe(false);
    expect(weekState(w0, weekSteps(w0, weekModuleOf(db, 0), undefined))).toBe('not_started');
    expect(weekState(course.weeks[1]!, [])).toBe('locked');
  });

  it('picks the current week: the first open week not built, else the last open one', () => {
    const rows = [
      { week: course.weeks[0]!, state: 'built' as const },
      { week: course.weeks[1]!, state: 'in_progress' as const },
      { week: course.weeks[2]!, state: 'locked' as const },
    ];
    expect(currentWeek(rows)?.week.week).toBe(1);
    expect(currentWeek([rows[0]!, rows[2]!])?.week.week).toBe(0);
    expect(currentWeek([rows[2]!])).toBeNull();
  });

  it('finds the live session and the ones to come, from the course’s own sessions', () => {
    const sessions = courseSessions(db);
    const first = upcomingSessions(sessions, NOW, 'build')[0]!;
    expect(first.week).toBe(1);
    expect(liveSessionAt(sessions, NOW)).toBeNull();
    expect(liveSessionAt(sessions, first.start + 5 * 60_000)?.id).toBe(first.id);
    expect(liveSessionAt(sessions, first.start + first.mins * 60_000)).toBeNull();
    const oh = upcomingSessions(sessions, NOW, 'office_hours');
    expect(oh.every((s) => s.kind === 'office_hours' && s.start > NOW)).toBe(true);
    expect(oh.map((s) => s.start)).toEqual([...oh.map((s) => s.start)].sort((a, b) => a - b));
  });

  it('counts down in whole days, hours and minutes, never below zero', () => {
    const at = NOW + (14 * 1440 + 19 * 60 + 28) * 60_000 + 59_000;
    expect(countdown(at, NOW)).toEqual({ days: 14, hours: 19, minutes: 28 });
    expect(countdown(NOW - 1, NOW)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });

  it('writes lengths of time, counts and first names as the screens print them', () => {
    expect(duration(30)).toBe('30 min');
    expect(duration(60)).toBe('1 hr');
    expect(duration(110)).toBe('1 hr 50 min');
    expect(duration(150)).toBe('2 hrs 30 min');
    expect(countWord(6)).toBe('six');
    expect(countWord(8)).toBe('eight');
    expect(countWord(14)).toBe('14');
    expect(firstName('  Dana Whitfield Ross ')).toBe('Dana');
    expect(learnerOf({ users: [learner([])] }, 'u1')?.name).toBe('Dana Whitfield Ross');
    expect(learnerOf({ users: [learner([])] }, null)).toBeNull();
  });

  it('greets by the time of day in the viewer’s own zone', () => {
    setViewerZone('America/Denver');
    expect(partOfDay(Date.parse('2026-11-18T16:00:00Z'))).toBe('morning'); // 9:00 AM MT
    expect(partOfDay(NOW)).toBe('afternoon'); // 2:00 PM MT
    expect(partOfDay(Date.parse('2026-11-19T02:00:00Z'))).toBe('evening'); // 7:00 PM MT
    setViewerZone('America/New_York');
    expect(partOfDay(Date.parse('2026-11-18T16:30:00Z'))).toBe('morning'); // 11:30 AM ET
    expect(partOfDay(Date.parse('2026-11-18T17:00:00Z'))).toBe('afternoon'); // noon ET
    expect(monthYear(Date.parse('2026-12-02T18:00:00Z'))).toBe('December 2026');
  });

  it('writes a day with its year in the viewer’s own zone (D-178)', () => {
    setViewerZone('America/Denver');
    const may4 = Date.parse('2027-05-04T18:00:00Z');
    expect(dateYear(may4)).toBe('May 4, 2027');
    expect(dayYear(may4)).toBe('Tue, May 4, 2027');
    // 11:30 PM MT on Nov 11 is already Nov 12 in New York.
    const late = Date.parse('2026-11-12T06:30:00Z');
    expect(dateYear(late)).toBe('Nov 11, 2026');
    setViewerZone('America/New_York');
    expect(dateYear(late)).toBe('Nov 12, 2026');
    // A date about money, in billing's zone: midnight Central on May 4 is still May 3 in Mountain.
    setViewerZone('America/Denver');
    const charge = Date.parse('2027-05-04T00:00:00-05:00');
    expect(dayYear(charge)).toBe('Mon, May 3, 2027');
    expect(dayYear(charge, 'America/Chicago')).toBe('Tue, May 4, 2027');
    expect(dateYear(charge, 'America/Chicago')).toBe('May 4, 2027');
  });
});
