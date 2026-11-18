// D-180: the learner Schedule's logic, pure. The sessions are the deployed seed's (the sixteen, plus
// Week 2 and 3's Friday office hours), so the break and the months are the ones a learner meets.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { courseSessions, sessionType } from '../src/course';
import {
  buildBreaks,
  civilDate,
  civilMonthName,
  dayKey,
  holidayNote,
  liveBuilds,
  monthGrid,
  openingMonth,
  scheduleMonths,
} from '../src/schedule';
import { setViewerZone } from '../src/time';
import { planContentV2 } from '../seed/content-v2';
import { planCopyV1 } from '../seed/copy-v1';
import { seedProduction } from '../seed/curriculum';
import { planReleaseV1 } from '../seed/release-plan-v1';

const db = planContentV2(
  planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db)
    .db,
).db;
const sessions = courseSessions(db);

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

describe('the sessions’ types (D-180)', () => {
  it('sends the builder’s type with each session, and reads one off the id for a row without', () => {
    expect(sessions).toHaveLength(18);
    const type = Object.fromEntries(sessions.map((s) => [s.id, s.type]));
    expect(type['dec26-s1']).toBe('live_build');
    expect(type['dec26-oh1']).toBe('office_hours');
    expect(type['dec26-oh2']).toBe('goal_planning');
    expect(type['dec26-oh3']).toBe('goal_planning');
    expect(type['dec26-fri-oh2']).toBe('office_hours');
    expect(type['dec26-fri-oh3']).toBe('office_hours');
    expect(sessionType({ id: 'dec26-s9' })).toBe('live_build');
    expect(sessionType({ id: 'dec26-oh9' })).toBe('office_hours');
    expect(sessionType({ id: 'x', kind: 'setup' })).toBe('setup');
  });

  it('puts the Friday office hours in their week, beside the Thursday goal planning', () => {
    const week2 = sessions.filter((s) => s.week === 2).map((s) => [s.type, dayKey(civilDate(s.start))]);
    expect(week2).toEqual([
      ['live_build', '2026-12-09'],
      ['goal_planning', '2026-12-10'],
      ['office_hours', '2026-12-11'],
    ]);
  });
});

describe('the holiday break, read off the builds (D-180)', () => {
  it('finds the two Wednesdays with no build between Dec 16 and Jan 6', () => {
    const breaks = buildBreaks(sessions);
    expect(breaks).toHaveLength(1);
    expect(breaks[0]!.skipped.map((t) => dayKey(civilDate(t)))).toEqual(['2026-12-23', '2026-12-30']);
    expect(dayKey(civilDate(breaks[0]!.after))).toBe('2026-12-16');
    expect(dayKey(civilDate(breaks[0]!.before))).toBe('2027-01-06');
  });

  it('moves with the data: a build added in the gap closes it, one moved a day is no break', () => {
    const dec23 = Date.parse('2026-12-23T19:00:00Z');
    expect(buildBreaks([...sessions, { type: 'live_build', start: dec23 }])).toHaveLength(1);
    expect(
      buildBreaks([
        ...sessions,
        { type: 'live_build', start: dec23 },
        { type: 'live_build', start: dec23 + 7 * 86_400_000 },
      ]),
    ).toEqual([]);
    const moved = sessions.map((s) => (s.id === 'dec26-s2' ? { ...s, start: s.start + 86_400_000 } : s));
    expect(buildBreaks(moved)).toHaveLength(1);
    expect(buildBreaks([])).toEqual([]);
  });

  it('counts live builds only, never office hours', () => {
    expect(liveBuilds(sessions)).toHaveLength(8);
  });

  it('splits the cohort’s holiday note into a title and a line', () => {
    expect(holidayNote(db.cohorts[0]!.course!.intro.holiday)).toEqual({
      title: 'Holiday break',
      line: 'No sessions on Dec 23 or Dec 30. No new build until Jan 6.',
    });
    expect(holidayNote('No sessions over the holidays.')).toEqual({
      title: null,
      line: 'No sessions over the holidays.',
    });
    expect(holidayNote('  ')).toBeNull();
    expect(holidayNote(undefined)).toBeNull();
  });
});

describe('the month grid (D-180)', () => {
  it('draws December 2026 from Sunday, Nov 29 to Saturday, Jan 2, five rows of seven', () => {
    const rows = monthGrid({ y: 2026, m: 11 });
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.length === 7)).toBe(true);
    expect(rows[0]!.map((c) => c.date.d)).toEqual([29, 30, 1, 2, 3, 4, 5]);
    expect(rows[0]!.map((c) => c.out)).toEqual([true, true, false, false, false, false, false]);
    expect(rows[4]!.map((c) => c.key)).toEqual([
      '2026-12-27',
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it('spans the schedule’s months, and opens on today’s month or the nearest one', () => {
    const months = scheduleMonths(sessions.map((s) => s.start));
    expect(months.map(civilMonthName)).toEqual(['December 2026', 'January 2027', 'February 2027']);
    expect(openingMonth(months, Date.parse('2026-11-18T21:00:00Z'))).toBe(0);
    expect(openingMonth(months, Date.parse('2027-01-10T21:00:00Z'))).toBe(1);
    expect(openingMonth(months, Date.parse('2027-05-10T21:00:00Z'))).toBe(2);
    expect(scheduleMonths([])).toEqual([]);
  });

  it('reads a session’s day where the viewer is', () => {
    const late = Date.parse('2026-12-03T05:30:00Z'); // Dec 2, 10:30 PM in Denver; Dec 3 in New York
    expect(dayKey(civilDate(late))).toBe('2026-12-02');
    setViewerZone('America/New_York');
    expect(dayKey(civilDate(late))).toBe('2026-12-03');
  });
});
