// D-180: the Schedule's view-model, by week and by month, before launch and at a live build.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { weekRows } from './learn.vm';
import { scheduleVM, typeOf, viewOf } from './Schedule.vm';
import type { BreakItemVM, CalBreakVM, CalEventVM, ScheduleView, WeekItemVM } from './Schedule.vm';
import { LEARNER_ID, liveState, prelaunchState } from './test/fixture';
import type { LearnState } from './test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const schedule = (st: LearnState, view: ScheduleView = 'weeks') =>
  scheduleVM(st.payload, weekRows(st.payload, st.db, learnerOf(st.db, LEARNER_ID)), st.db.cohorts[0], view, st.now);
const weekItems = (vm: ReturnType<typeof schedule>) =>
  vm.weeks.groups.flatMap((g) => g.items).filter((i): i is WeekItemVM => i.kind === 'week');

describe('the Schedule (D-180)', () => {
  it('heads the page with its title, the cohort’s line, the view switch and the whole schedule’s calendar file', () => {
    const vm = schedule(prelaunchState());
    expect(vm.title).toBe('Schedule');
    expect(vm.lede).toBe('Wed builds and Thu office hours · 1:00 PM CT');
    expect(vm.views.items).toEqual([
      { key: 'weeks', label: 'Weeks', href: '/learn/schedule', on: true },
      { key: 'calendar', label: 'Calendar', href: '/learn/schedule?view=calendar', on: false },
    ]);
    expect(vm.addAll).toEqual({ label: 'Add all to calendar', href: '/calendar/schedule.ics' });
  });

  it('prefers a schedule.subtitle copy string to the cohort’s line', () => {
    const st = prelaunchState();
    st.payload.copy = { ...st.payload.copy, 'schedule.subtitle': 'A subtitle from the builder.' };
    expect(schedule(st).lede).toBe('A subtitle from the builder.');
  });

  it('reads the view from the address', () => {
    expect(viewOf('calendar')).toBe('calendar');
    expect(viewOf(null)).toBe('weeks');
    expect(viewOf('nonsense')).toBe('weeks');
  });

  it('puts the next live build in the hero, with its countdown, its calendar file and its week', () => {
    const vm = schedule(prelaunchState());
    expect(vm.hero).toMatchObject({
      tile: { dw: 'Wed', dd: '2' },
      eyebrow: 'Next · Week 1 · Live build',
      title: 'Map Your Spend Live Build',
      meta: 'Wed, Dec 2 · 12:00 PM MT (1:00 PM CT) · 1 hr 30 min · Zoom · Join opens 15 minutes before',
      addLabel: 'Add to calendar',
      see: { label: 'See what you’ll build', href: '/learn/week/1' },
      right: {
        label: 'Starts in',
        parts: [
          { n: 13, unit: 'days' },
          { n: 22, unit: 'hrs' },
          { n: 0, unit: 'min' },
        ],
      },
    });
    expect(vm.hero!.ics).toEqual([
      {
        id: 'dec26-s1',
        title: 'Map Your Spend Live Build',
        start: Date.parse('2026-12-02T19:00:00Z'),
        end: Date.parse('2026-12-02T20:30:00Z'),
      },
    ]);
  });

  it('at a live build, the hero is the build after it', () => {
    expect(schedule(liveState()).hero).toMatchObject({
      eyebrow: 'Next · Week 3 · Live build',
      title: 'Monthly Numbers Live Build',
    });
  });
});

describe('the weeks view (D-180)', () => {
  it('opens with the self-paced week, then a group per month, the break where the builds stop', () => {
    const vm = schedule(prelaunchState());
    expect(vm.weeks.heading).toBe('Nine weeks');
    expect(
      vm.weeks.groups.map((g) => [g.label, g.meta, g.items.map((i) => (i.kind === 'week' ? i.week : 'break'))]),
    ).toEqual([
      ['Now', 'Self-paced, before the first build', [0]],
      ['December 2026', null, [1, 2, 3, 'break']],
      ['January 2027', null, [4, 5, 6, 7]],
      ['February 2027', null, [8]],
    ]);
  });

  it('draws the open week whole: its pill, its steps done, its due date and its time', () => {
    const w0 = weekItems(schedule(prelaunchState()))[0]!;
    expect(w0).toMatchObject({
      title: 'Week 0 · Foundations',
      tile: { dw: 'Week', dd: '0' },
      now: true,
      locked: false,
      pill: { tone: 'ip', label: 'In progress' },
      line: 'Every team at the same starting line by Mon, Nov 30 · 2 of 8 done',
      aria: 'Week 0, Foundations, In progress',
      href: '/learn/week/0',
    });
    expect(w0.lines.map((x) => [x.dot, x.text])).toEqual([
      ['build', 'Self-paced, due Mon, Nov 30'],
      ['oh', 'Owner about 1 hr 30 min · operator about 2 hr 15 min'],
    ]);
  });

  it('draws a locked week from its stub: locked, and when it opens', () => {
    const w1 = weekItems(schedule(prelaunchState()))[1]!;
    expect(w1).toMatchObject({
      title: 'Week 1 · Where the Money Goes',
      locked: true,
      pill: null,
      tile: { dw: 'Wed', dd: '2' },
      aria: 'Week 1, Where the Money Goes, opens Wed, Dec 2',
    });
  });

  it('lists every session of a week, of any type: Weeks 2 and 3 have a goal-planning Thursday and a Friday office hour', () => {
    const items = weekItems(schedule(prelaunchState()));
    expect(items[1]!.lines.map((x) => [x.key, x.dot, x.text])).toEqual([
      ['dec26-s1', 'build', 'Live build · Wed, Dec 2'],
      ['dec26-oh1', 'oh', 'Office hours · Thu, Dec 3'],
    ]);
    expect(items[2]!.lines.map((x) => [x.key, x.dot, x.text])).toEqual([
      ['dec26-s2', 'build', 'Live build · Wed, Dec 9'],
      ['dec26-oh2', 'oh', 'Goal-Planning Session 1 and Office Hours · Thu, Dec 10'],
      ['dec26-fri-oh2', 'oh', 'Office hours · Fri, Dec 11'],
    ]);
    expect(items[3]!.lines.map((x) => x.key)).toEqual(['dec26-s3', 'dec26-oh3', 'dec26-fri-oh3']);
  });

  it('says the holiday break in the cohort’s words, and in the skipped days when it has none', () => {
    const brk = (vm: ReturnType<typeof schedule>) =>
      vm.weeks.groups.flatMap((g) => g.items).find((i): i is BreakItemVM => i.kind === 'break');
    expect(brk(schedule(prelaunchState()))).toMatchObject({
      title: 'Holiday break',
      line: 'No sessions on Dec 23 or Dec 30. No new build until Jan 6.',
    });
    const st = prelaunchState();
    st.payload.course = { ...st.payload.course, intro: { ...st.payload.course.intro, holiday: '' } };
    expect(brk(schedule(st))).toMatchObject({ title: 'Holiday break', line: 'No sessions Wed, Dec 23 or Wed, Dec 30' });
  });

  it('has no break when a build fills the gap', () => {
    const st = prelaunchState();
    const s3 = st.payload.sessions.find((s) => s.id === 'dec26-s3')!;
    const week = 7 * 86_400_000;
    st.payload.sessions = [
      ...st.payload.sessions,
      { ...s3, id: 'x1', start: s3.start + week },
      { ...s3, id: 'x2', start: s3.start + 2 * week },
    ];
    expect(
      schedule(st)
        .weeks.groups.flatMap((g) => g.items)
        .some((i) => i.kind === 'break'),
    ).toBe(false);
  });

  it('marks the week of the live build as the one a learner is on', () => {
    const items = weekItems(schedule(liveState()));
    expect(items.filter((i) => i.now).map((i) => i.week)).toEqual([2]);
    expect(items[0]!.pill).toEqual({ tone: 'done', label: 'Done' });
  });

  it('reads a row from before the builder’s types by its id', () => {
    expect(typeOf({ kind: 'build' })).toBe('live_build');
    expect(typeOf({ kind: 'office_hours' })).toBe('office_hours');
    expect(typeOf({ kind: 'office_hours', type: 'setup' })).toBe('setup');
  });
});

describe('the calendar view (D-180)', () => {
  it('draws each month of the schedule, opening on the first, with every session on its day', () => {
    const cal = schedule(prelaunchState(), 'calendar').calendar;
    expect(cal.months.map((m) => m.label)).toEqual(['December 2026', 'January 2027', 'February 2027']);
    expect(cal.start).toBe(0);
    expect(cal.days).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    const dec = cal.months[0]!;
    expect(dec.rows).toHaveLength(5);
    const on = (key: string) => dec.rows.flat().find((c) => c.key === key)!.events;
    expect(on('2026-12-02')).toEqual([
      {
        kind: 'session',
        id: 'dec26-s1',
        dot: 'build',
        label: 'Live build',
        title: 'Map Your Spend Live Build',
        aria: 'Map Your Spend Live Build, Wed, Dec 2, 12:00 PM MT (1:00 PM CT)',
        href: '/learn/week/1',
      },
    ]);
    expect(on('2026-12-10')[0] as CalEventVM).toMatchObject({
      dot: 'oh',
      label: 'Goal planning',
      title: 'Goal-Planning Session 1 and Office Hours',
    });
    expect(on('2026-12-11')[0] as CalEventVM).toMatchObject({ id: 'dec26-fri-oh2', dot: 'oh', label: 'Office hours' });
    expect(on('2026-12-23')).toEqual([
      { kind: 'break', key: 'break0-0', label: 'Holiday break', line: 'No build' } satisfies CalBreakVM,
    ]);
    expect(on('2026-12-30')).toHaveLength(1);
    expect(dec.rows[0]!.slice(0, 2).every((c) => c.out && c.events.length === 0)).toBe(true);
  });

  it('opens on today’s month during the course, and marks today', () => {
    const cal = schedule(liveState(), 'calendar').calendar;
    expect(cal.start).toBe(0);
    expect(
      cal.months[0]!.rows.flat()
        .filter((c) => c.today)
        .map((c) => c.key),
    ).toEqual(['2026-12-09']);
  });

  it('lists every session by month for a phone, with its week, start and length, and the break', () => {
    const cal = schedule(prelaunchState(), 'calendar').calendar;
    expect(cal.agendaLabel).toBe('All sessions');
    expect(cal.agenda.map((g) => [g.label, g.items.length])).toEqual([
      ['December 2026', 9],
      ['January 2027', 8],
      ['February 2027', 2],
    ]);
    expect(cal.agenda[0]!.items[0]).toEqual({
      kind: 'session',
      id: 'dec26-s1',
      tile: { dw: 'Wed', dd: '2' },
      title: 'Map Your Spend Live Build',
      meta: 'Week 1 · 12:00 PM MT (1:00 PM CT) · 1 hr 30 min',
      href: '/learn/week/1',
    });
    expect(cal.agenda[0]!.items[8]).toMatchObject({ kind: 'break', title: 'Holiday break' });
  });

  it('writes times in the viewer’s zone first, the program’s in parentheses', () => {
    setViewerZone('America/New_York');
    const vm = schedule(prelaunchState(), 'calendar');
    expect(vm.hero!.meta).toContain('2:00 PM ET (1:00 PM CT)');
    expect(vm.calendar.agenda[0]!.items[0]).toMatchObject({ meta: 'Week 1 · 2:00 PM ET (1:00 PM CT) · 1 hr 30 min' });
  });
});
