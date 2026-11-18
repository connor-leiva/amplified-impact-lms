// D-180: the Schedule's view-model, by week and by month, before launch and at a live build.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { weekRows } from './learn.vm';
import { scheduleVM, typeOf, viewOf } from './Schedule.vm';
import type { BreakItemVM, CalBreakVM, CalEventVM, ScheduleView, WeekItemVM } from './Schedule.vm';
import { LEARNER_ID, PRELAUNCH_NOW, asShell, learnState, liveState, prelaunchState, sessionIn } from './test/fixture';
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

  it('at a live build, the Schedule hero is the live build itself, with Live now and Join (D-183) @parity:S-2', () => {
    expect(schedule(liveState()).hero).toMatchObject({
      eyebrow: 'Live now · Week 2 · Live build',
      eyebrowTail: 'Week 2 · Live build',
      title: 'Lead Source Review Live Build',
      join: { state: 'live', badge: 'Live now', sessionId: 'dec26-s2', joinLabel: 'Join the live build' },
      right: { label: 'Time left' },
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

  it('lists every session of a week by its own title, of any type: Weeks 2 and 3 have a goal-planning Thursday and a Friday office hour @parity:S-1 @parity:R-2', () => {
    const items = weekItems(schedule(prelaunchState()));
    // Each session by its own title, as the current portal's Sessions page names it (R-2, S-1).
    expect(items[1]!.lines.map((x) => [x.key, x.dot, x.text])).toEqual([
      ['dec26-s1', 'build', 'Map Your Spend Live Build · Wed, Dec 2'],
      ['dec26-oh1', 'oh', 'Map Your Spend Office Hours · Thu, Dec 3'],
    ]);
    expect(items[2]!.lines.map((x) => [x.key, x.dot, x.text])).toEqual([
      ['dec26-s2', 'build', 'Lead Source Review Live Build · Wed, Dec 9'],
      ['dec26-oh2', 'oh', 'Goal-Planning Session 1 and Office Hours · Thu, Dec 10'],
      ['dec26-fri-oh2', 'oh', 'Lead Source Review Office Hours · Fri, Dec 11'],
    ]);
    expect(items[3]!.lines.map((x) => x.key)).toEqual(['dec26-s3', 'dec26-oh3', 'dec26-fri-oh3']);
    // A locked week names its sessions too, as the current Sessions page does.
    expect(items[3]!.lines[0]!.text).toBe('Monthly Numbers Live Build · Wed, Dec 16');
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
      join: null,
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

// D-183: Join from 15 minutes before, the 1-hour reminder's landing, Go Live and End Session, past states.
describe('Join, Go Live and the past sessions on the Schedule (D-183)', () => {
  const S1 = Date.parse('2026-12-02T19:00:00Z');
  const MIN = 60_000;
  const at = (now: number, edit?: Parameters<typeof learnState>[4]) => asShell(learnState(now, true, { 0: ['c1', 'c2'] }, 15, edit));
  const week1 = (vm: ReturnType<typeof schedule>) => weekItems(vm).find((w) => w.week === 1)!;

  it('Schedule Join enabled on the hero and the row at start-15m; at start-16m the next row’s Join is off with “Opens 15 Min Before” @parity:S-2 @parity:A-8', () => {
    const off = schedule(at(S1 - 16 * MIN));
    expect(off.hero!.join).toBeNull();
    expect(off.hero!.meta).toContain('Join opens 15 minutes before');
    expect(week1(off).join).toBeNull();
    // The next row before its window: Join drawn off, with the current portal's hint.
    expect(week1(off).soon).toEqual({ title: 'Map Your Spend Live Build', meta: '12:00 PM MT (1:00 PM CT) · Zoom', label: 'Join', hint: 'Opens 15 Min Before' });

    const on = schedule(at(S1 - 15 * MIN));
    expect(on.hero).toMatchObject({ eyebrow: 'Starting soon · Week 1 · Live build', join: { state: 'ready', badge: 'Starting soon', sessionId: 'dec26-s1' } });
    expect(on.hero!.meta).not.toContain('Join opens');
    expect(week1(on).join).toMatchObject({ state: 'ready', sessionId: 'dec26-s1' });
    expect(week1(on).soon).toBeNull();
    expect(schedule(at(S1 - 15 * MIN), 'calendar').calendar.agenda[0]!.items[0]).toMatchObject({ join: { state: 'ready' } });
  });

  it('the 1-hour reminder lands on its session: within the hour it is the Schedule hero, whatever its type, and Join opens there at start-15m @parity:M-2', () => {
    const OH1 = Date.parse('2026-12-03T19:00:00Z');
    expect(schedule(at(OH1 - 61 * MIN)).hero!.title).toBe('Lead Source Review Live Build');
    expect(schedule(at(OH1 - 60 * MIN)).hero).toMatchObject({ title: 'Map Your Spend Office Hours', join: null });
    expect(schedule(at(OH1 - 10 * MIN)).hero).toMatchObject({ title: 'Map Your Spend Office Hours', join: { state: 'ready', joinLabel: 'Join' } });
  });

  it('the Schedule follows Go Live hours early (Live now, Join) and End Session (Join gone, Replay Processing, attendance) @parity:C-1 @parity:C-2 @parity:S-3', () => {
    const early = S1 - 3 * 3600_000;
    const live = schedule(at(early, (d) => (sessionIn(d, 'dec26-s1').live = true)));
    expect(live.hero).toMatchObject({ join: { state: 'live', badge: 'Live now' }, eyebrow: 'Live now · Week 1 · Live build' });
    expect(week1(live).join).toMatchObject({ state: 'live' });
    expect(week1(live).now).toBe(true);

    const ended = schedule(
      at(early + 30 * MIN, (d) => {
        const s = sessionIn(d, 'dec26-s1');
        Object.assign(s, { live: false, start: early + 30 * MIN - s.mins * MIN, replay: 'processing', attended: 12 });
      }),
    );
    expect(ended.hero!.join).toBeNull();
    expect(week1(ended).join).toBeNull();
    expect(week1(ended).lines[0]).toMatchObject({ badge: { tone: 'neutral', label: 'Replay Processing' }, extra: '12 attended live' });
  });

  it('a published replay reads Replay Ready with Watch Replay to the week’s player; an office hour’s Recording Posted @parity:S-3 @parity:S-4 @parity:C-3', () => {
    const vm = schedule(
      at(Date.parse('2026-12-05T19:00:00Z'), (d) => {
        Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'ready', attended: 14 });
        Object.assign(sessionIn(d, 'dec26-oh1'), { replay: 'ready' });
      }),
    );
    const lines = week1(vm).lines;
    expect(lines[0]).toMatchObject({ badge: { tone: 'ok', label: 'Replay Ready' }, extra: '14 attended live' });
    expect(lines[1]).toMatchObject({ badge: { tone: 'ok', label: 'Recording Posted' }, extra: null });
    // The current portal's "Watch Replay": the week's page, where the player is.
    expect(week1(vm).watch).toEqual({ label: 'Watch Replay', href: '/learn/week/1', title: 'Map Your Spend Live Build' });
    expect(weekItems(vm).find((w) => w.week === 2)!.watch).toBeNull();
    // Nothing on a session still to come.
    expect(weekItems(vm).find((w) => w.week === 2)!.lines.every((l) => l.badge === null && l.extra === null)).toBe(true);
  });

  it('draws no past state before the course has run', () => {
    expect(weekItems(schedule(prelaunchState())).flatMap((w) => w.lines).every((l) => l.badge === null)).toBe(true);
    expect(PRELAUNCH_NOW).toBeLessThan(S1);
  });
});
