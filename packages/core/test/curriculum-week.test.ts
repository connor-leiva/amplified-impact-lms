// A session's week is the curriculum week's, not a count of days since the cohort opened.
// The December 2026 cohort skips Dec 23 and Dec 30, so day-counting calls Jan 6 Week 6 and Feb 3
// Week 10. The course's own weeks call them Week 4 and Week 8.
import { describe, expect, it } from 'vitest';
import { courseSessions } from '../src/course';
import { courseOpensAt, curriculumWeekAt, curriculumWeeks, sessionCurriculumWeek } from '../src/curriculum-week';
import type { CurriculumWeekRef } from '../src/curriculum-week';
import type { Db, Session } from '../src/types';
import { planContentV2 } from '../seed/content-v2';
import { seedProduction } from '../seed/curriculum';
import { planReleaseV1 } from '../seed/release-plan-v1';

/** `YYYY-MM-DD` in MST, the day the admin prints. */
const mstDay = (t: number): string => new Date(t - 7 * 3600_000).toISOString().slice(0, 10);
const at = (day: string, time = '12:00'): number => Date.parse(`${day}T${time}:00-07:00`);

/** The deployed course, with Week 1 opening at 8:00 AM MT as the builder now has it, and Week 0 given an earlier Opens that must not count. */
function courseDb(): Db {
  const db = planContentV2(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db;
  db.modules.find((m) => m.id === 'accelerator-week-0')!.opens = at('2026-11-01', '08:00');
  db.modules.find((m) => m.id === 'accelerator-week-1')!.opens = at('2026-12-02', '08:00');
  return db;
}

const EXPECTED: Record<string, number> = {
  '2026-12-02': 1,
  '2026-12-03': 1,
  '2026-12-09': 2,
  '2026-12-10': 2,
  '2026-12-11': 2,
  '2026-12-16': 3,
  '2026-12-17': 3,
  '2026-12-18': 3,
  '2027-01-06': 4,
  '2027-01-07': 4,
  '2027-01-13': 5,
  '2027-01-14': 5,
  '2027-01-20': 6,
  '2027-01-21': 6,
  '2027-01-27': 7,
  '2027-01-28': 7,
  '2027-02-03': 8,
  '2027-02-04': 8,
};

describe('session weeks across the holiday gap', () => {
  const db = courseDb();
  const weeks = curriculumWeeks(db.modules);

  it('reads each session’s week from the curriculum, including the two weeks with no session', () => {
    const weekOf = (rows: { start: number; week: number | null }[]) =>
      rows.map((s) => [mstDay(s.start), s.week]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const fromRule = weekOf(db.sessions.map((s) => ({ start: s.start, week: sessionCurriculumWeek(weeks, s) })));
    expect(Object.fromEntries(fromRule)).toEqual(EXPECTED);
    expect(weekOf(courseSessions(db))).toEqual(fromRule);
  });

  it('does not count the skipped Wednesdays: Jan 6 is Week 4 and Feb 3 is Week 8, not 6 and 10', () => {
    const start = db.cohorts[0]!.start;
    const buckets = (t: number) => Math.max(1, Math.floor((t - start) / (7 * 864e5)) + 1);
    const on = (day: string) => db.sessions.find((s) => mstDay(s.start) === day && s.n < 100)!;
    expect(buckets(on('2027-01-06').start)).toBe(6);
    expect(sessionCurriculumWeek(weeks, on('2027-01-06'))).toBe(4);
    expect(buckets(on('2027-02-03').start)).toBe(10);
    expect(sessionCurriculumWeek(weeks, on('2027-02-03'))).toBe(8);
  });

  it('opens on Week 1’s Opens, not Week 0 and not Session 1’s noon', () => {
    expect(courseOpensAt(weeks)).toBe(at('2026-12-02', '08:00'));
    expect(courseOpensAt(weeks)).not.toBe(db.cohorts[0]!.start);
    expect(curriculumWeekAt(weeks, at('2026-11-22', '09:00'))).toBe(0);
    expect(curriculumWeekAt(weeks, at('2026-12-23', '09:00'))).toBe(3);
    expect(curriculumWeekAt(weeks, at('2027-01-06', '11:00'))).toBe(4);
  });
});

describe('which week a session belongs to', () => {
  const weeks: CurriculumWeekRef[] = [
    { week: 0, session: null, opens: at('2026-11-01', '08:00') },
    { week: 1, session: 1, opens: at('2026-12-02', '08:00') },
    { week: 3, session: 3, opens: at('2026-12-16', '12:00') },
    { week: 4, session: 4, opens: at('2027-01-06', '12:00') },
  ];

  it('keeps a week’s own live session even when the date falls in an earlier week', () => {
    expect(sessionCurriculumWeek(weeks, { n: 4, start: at('2026-12-20') })).toBe(4);
  });

  it('uses the latest week already open on the date for any other session', () => {
    const extra = (day: string, time = '12:00'): Pick<Session, 'n' | 'start'> => ({ n: 300, start: at(day, time) });
    expect(sessionCurriculumWeek(weeks, extra('2026-12-01'))).toBeNull();
    // Dec 2, before the 8:00 AM Opens instant, is still that day’s week.
    expect(sessionCurriculumWeek(weeks, extra('2026-12-02', '07:00'))).toBe(1);
    expect(sessionCurriculumWeek(weeks, extra('2026-12-20'))).toBe(3);
    expect(sessionCurriculumWeek(weeks, extra('2027-01-06', '11:00'))).toBe(4);
  });

  it('ignores a draft and a week with no Opens date', () => {
    const modules = [
      { kind: 'week', status: 'draft', session: 9, opens: at('2026-11-01'), course: { week: 9 } },
      { kind: 'week', status: 'published', session: 1, opens: null, course: { week: 1 } },
      { kind: 'employee', status: 'published', session: 2, opens: at('2026-01-01'), course: { week: 2 } },
    ];
    expect(curriculumWeeks(modules)).toEqual([{ week: 1, session: 1, opens: null }]);
    expect(courseOpensAt(curriculumWeeks(modules))).toBeNull();
  });
});
