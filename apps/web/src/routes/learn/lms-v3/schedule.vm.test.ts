// D-227: the v3 Schedule's props from today's view-model (IMPLEMENTATION-SPEC.md §7.2, B-07, B-08, B-37, C-13).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fmt, setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { weekRows } from '../learn.vm';
import { scheduleVM } from '../Schedule.vm';
import { LEARNER_ID, asShell, learnState, prelaunchState, sessionIn } from '../test/fixture';
import type { LearnState } from '../test/fixture';
import type { CourseSession } from '../../course/Course.vm';
import type { ScheduleWeekRow } from './types';
import { lineState, scheduleNext, scheduleProps, v3ScheduleDraws } from './schedule.vm';

beforeEach(() => setViewerZone('America/Chicago'));
afterEach(() => setViewerZone(null));

const B1 = Date.parse('2026-12-02T19:00:00Z');
const MIN = 60_000;

function props(st: LearnState, now = st.now) {
  const me = learnerOf(st.db, LEARNER_ID);
  const rows = weekRows(st.payload, st.db, me);
  const vm = scheduleVM(st.payload, rows, st.db.cohorts[0], 'weeks', now);
  return scheduleProps({ vm, rows, sessions: st.payload.sessions, me, now, saveIcs: () => undefined });
}
const weekRowsOf = (p: NonNullable<ReturnType<typeof props>>): ScheduleWeekRow[] =>
  p.groups.flatMap((g) => g.rows).filter((r): r is ScheduleWeekRow => r.break === undefined);
const session = (over: Partial<CourseSession> = {}): CourseSession => ({
  id: 'b1',
  n: 1,
  kind: 'build',
  week: 1,
  title: 'Map Your Spend Live Build',
  start: B1,
  mins: 90,
  ...over,
});

describe('scheduleProps', () => {
  it('heads the page with the cohort’s line, the heading, the Calendar view and the whole schedule’s file', () => {
    const p = props(prelaunchState())!;
    expect(p.sub).toBe('Wed builds and Thu office hours · 1:00 PM CT');
    expect(p.title).toBe('Nine weeks');
    expect(p.calendarHref).toBe('/learn/schedule?view=calendar');
    expect(p.calendarAllHref).toBe('/calendar/schedule.ics');
  });

  it('the hero is the next session, in the mockup’s words (B-07)', () => {
    const p = props(prelaunchState())!;
    expect(p.next).toMatchObject({
      week: 1,
      kind: 'Live build',
      title: 'Map Your Spend Live Build',
      day: 'Wed',
      date: '2',
      when: fmt.when(B1),
      length: '1 hr 30 min',
      where: 'Zoom',
      start: '2026-12-02T19:00:00.000Z',
      minutes: 90,
      joinBefore: 15,
      joinHref: '/learn/join/dec26-s1',
      weekHref: '/learn/week/1',
      cta: 'See what you’ll build',
      mode: 'wait',
    });
    expect(p.next.calendar.map((c) => c.label)).toEqual(['Calendar file (.ics)', 'Google Calendar', 'Outlook']);
  });

  it('office hours next: its kind and Open Week N', () => {
    const n = scheduleNext(
      [
        session({
          id: 'oh1',
          kind: 'office_hours',
          title: 'Map Your Spend Office Hours',
          start: B1 + 86_400_000,
          mins: 60,
        }),
      ],
      B1,
      () => undefined,
    )!;
    expect(n).toMatchObject({ kind: 'Office hours', cta: 'Open Week 1', length: '1 hr', day: 'Thu', date: '3' });
  });

  it('groups as today’s view-model does, with the break, and Week 0 first with its due tile and its two lines (B-08)', () => {
    const p = props(prelaunchState())!;
    expect(p.groups.map((g) => g.label)).toEqual(['Now', 'December 2026', 'January 2027', 'February 2027']);
    expect(p.groups[0]!.note).toBe('Self-paced, before the first build');
    const w0 = weekRowsOf(p)[0]!;
    expect(w0).toMatchObject({
      week: 0,
      title: 'Foundations',
      href: '/learn/week/0',
      tile: ['Due', '30'],
      status: 'progress',
      done: 2,
      total: 8,
      next: false,
      live: false,
    });
    expect(w0.sessions.map((s) => [s.icon, s.title])).toEqual([
      ['clock', `Self-paced, due ${fmt.day(Date.parse('2026-11-30T19:00:00Z'))}`],
      ['users', expect.stringMatching(/^Owner about .+ · operator about .+$/)],
    ]);
    const brk = p.groups.flatMap((g) => g.rows).find((r) => r.break !== undefined);
    expect(brk).toEqual({ break: 'Holiday break', text: expect.any(String) });
  });

  it('a week’s sessions: radio for a build, people otherwise; the hero’s live build with its time, the rest with their day', () => {
    const w1 = weekRowsOf(props(prelaunchState())!).find((r) => r.week === 1)!;
    expect(w1).toMatchObject({ tile: ['Wed', '2'], next: true, status: 'idle', live: false });
    expect(w1.sessions[0]).toMatchObject({
      icon: 'radio',
      title: 'Map Your Spend Live Build',
      when: fmt.when(B1),
      state: 'wait',
      replayHref: '/learn/week/1',
    });
    expect(w1.sessions[1]).toMatchObject({ icon: 'users', when: fmt.day(Date.parse('2026-12-03T19:00:00Z')) });
  });

  it('deployed: the check (B-08)', () => {
    const st = learnState(
      Date.parse('2026-11-20T21:18:00Z'),
      true,
      { 0: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] },
      15,
      (d) => {
        const u = d.users.find((x) => x.id === LEARNER_ID)!;
        u.progress['accelerator-week-0']!.deployedAt = 1;
      },
    );
    expect(weekRowsOf(props(st)!)[0]!.status).toBe('done');
  });
});

describe('lineState (B-37)', () => {
  it('its day until it starts, then join, live, and the replay or Session ended', () => {
    expect(lineState(session(), B1 - 60 * MIN)).toBe('wait');
    expect(lineState(session(), B1 - 9 * MIN)).toBe('join');
    expect(lineState(session(), B1 + 12 * MIN)).toBe('live');
    expect(lineState(session(), B1 + 120 * MIN)).toBe('processing');
    expect(lineState(session({ replay: 'ready' }), B1 + 120 * MIN)).toBe('replay');
    expect(lineState(session({ kind: 'office_hours' }), B1 + 120 * MIN)).toBe('ended');
  });
});

describe('v3ScheduleDraws (C-13)', () => {
  const vmOf = (st: LearnState, now = st.now) => {
    const rows = weekRows(st.payload, st.db, learnerOf(st.db, LEARNER_ID));
    return scheduleVM(st.payload, rows, st.db.cohorts[0], 'weeks', now);
  };
  it('draws the prelaunch Schedule', () => {
    const st = prelaunchState();
    expect(v3ScheduleDraws(vmOf(st), st.payload.sessions, st.now)).toBe(true);
  });
  it('the Calendar view is today’s', () => {
    const st = prelaunchState();
    const rows = weekRows(st.payload, st.db, learnerOf(st.db, LEARNER_ID));
    expect(
      v3ScheduleDraws(scheduleVM(st.payload, rows, st.db.cohorts[0], 'calendar', st.now), st.payload.sessions, st.now),
    ).toBe(false);
  });
  it('“attended live” keeps today’s page', () => {
    const st = asShell(
      learnState(Date.parse('2026-12-03T16:00:00Z'), false, { 0: ['c1'] }, 15, (d) => {
        const s = sessionIn(d, 'dec26-s1');
        s.replay = 'ready';
        s.attended = 12;
      }),
    );
    expect(v3ScheduleDraws(vmOf(st), st.payload.sessions, st.now)).toBe(false);
  });
  it('nothing left to come: no hero, today’s page', () => {
    const st = prelaunchState();
    expect(
      v3ScheduleDraws(
        vmOf(st, Date.parse('2027-06-01T00:00:00Z')),
        st.payload.sessions,
        Date.parse('2027-06-01T00:00:00Z'),
      ),
    ).toBe(false);
  });
  it('props are null whenever the rule says no', () => {
    const st = prelaunchState();
    expect(props(st, Date.parse('2027-06-01T00:00:00Z'))).toBeNull();
  });
});

describe('the time on a session line (the mockup on every clock)', () => {
  it('office hours that are next keep their day', () => {
    const st = prelaunchState();
    const after = Date.parse('2026-12-02T21:00:00Z'); // the first build just ended: the office hours are next
    const p = props(st, after)!;
    const w1 = weekRowsOf(p).find((r) => r.week === 1)!;
    expect(w1.sessions[1]!.when).toBe(fmt.day(Date.parse('2026-12-03T19:00:00Z')));
  });
});
