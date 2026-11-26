// D-226: the v3 shell's props from the portal's view-models (IMPLEMENTATION-SPEC.md §7.1).
import { describe, expect, it, vi } from 'vitest';
import { fmt } from '@ai/core';
import type { Learner } from '@ai/core';
import type { CourseSession } from '../../course/Course.vm';
import type { NavVM, SideVM, WeekRow } from '../learn.vm';
import { JOIN_BEFORE_MIN, currentOf, joinOfHref, learnJoin, shellNext, shellProps, shellWeek } from './shell.vm';

const START = Date.parse('2026-12-02T19:00:00Z');
const MIN = 60_000;
const session = (over: Partial<CourseSession> = {}): CourseSession => ({
  id: 'b1',
  n: 1,
  kind: 'build',
  week: 1,
  title: 'Map Your Spend Live Build',
  start: START,
  mins: 90,
  ...over,
});

const nav = (cohort = true): NavVM => ({
  cohort,
  home: { label: 'Home', href: '/learn', active: false },
  schedule: { label: 'Schedule', href: '/learn/schedule', active: false },
  library: { label: 'Skill library', href: '/learn/skills', active: false },
  vault: { label: 'Resource vault', href: '/learn/vault', locked: false, title: null, active: false },
  employees: null,
  help: { label: 'Get help', href: 'mailto:support@example.com' },
});
const side = (teamHub = true): SideVM => ({
  teamHub: teamHub ? { label: 'Team Hub', href: '/learn/team', active: false } : null,
  cohortLine: 'Amplified AI Accelerator · December 2026 Cohort · Starts Dec 2',
  program: 'Amplified AI Accelerator',
  cohortOnly: 'December 2026 Cohort · Starts Dec 2',
});
const row = (over: Partial<WeekRow>): WeekRow =>
  ({
    week: 0,
    title: 'Foundations',
    outcome: '',
    icon: 'lvLock',
    tone: 'forest',
    state: 'in_progress',
    steps: [],
    done: 1,
    total: 8,
    href: '/learn/week/0',
    opensShort: null,
    open: null,
    locked: null,
    module: undefined,
    // R-5 Phase 4 (D-261): the week's module in the viewer's cohort, which its progress is read by.
    moduleId: 'accelerator-week-0',
    ...over,
  }) as WeekRow;
const learner = (deployedAt: number | null): Learner =>
  ({
    progress: { 'accelerator-week-0': { steps: [], builtAt: null, deployedAt, runtime: null } },
  }) as unknown as Learner;

describe('currentOf', () => {
  it.each([
    ['/learn', 'home'],
    ['/learn/', 'home'],
    ['/learn/schedule', 'schedule'],
    ['/learn/community', 'community'],
    ['/learn/community/7', 'community'],
    ['/learn/skills', 'library'],
    ['/learn/skills/map-your-spend', 'library'],
    ['/learn/team', 'team'],
    ['/learn/vault', 'vault'],
    ['/learn/week/0', 'week-0'],
    ['/learn/week/3/step/2', 'week-3'],
    ['/learn/account', undefined],
  ])('%s → %s', (path, id) => expect(currentOf(path)).toBe(id));
});

describe('shellWeek: the mockup’s statuses', () => {
  it('a step done: a ring and N of M', () =>
    expect(shellWeek(row({ done: 1 }), learner(null))).toMatchObject({
      n: 0,
      status: 'progress',
      done: 1,
      total: 8,
      locked: false,
      id: 'week-0',
    }));
  it('every step done but not deployed is still a ring (8 of 8)', () =>
    expect(shellWeek(row({ done: 8, state: 'built' }), learner(null))).toMatchObject({ status: 'progress', done: 8 }));
  it('deployed: the check', () =>
    expect(shellWeek(row({ done: 8, state: 'built' }), learner(1))).toMatchObject({ status: 'done' }));
  it('nothing done: no status', () =>
    expect(shellWeek(row({ done: 0, state: 'not_started' }), learner(null)).status).toBe('idle'));
  it('locked (B-38): the lock, no count', () => {
    const w = shellWeek(row({ week: 1, state: 'locked', done: 0, total: 0, href: '/learn/week/1' }), learner(null));
    expect(w).toEqual({
      n: 1,
      title: 'Foundations',
      href: '/learn/week/1',
      id: 'week-1',
      status: 'idle',
      locked: true,
    });
  });
});

describe('shellNext (B-35, B-36)', () => {
  const save = vi.fn();
  it('none left: nothing', () => expect(shellNext([], START, save)).toBeNull());
  it('waiting: the next session of any kind, its words by kind', () => {
    const n = shellNext(
      [
        session({
          kind: 'office_hours',
          title: 'Map Your Spend Office Hours',
          start: START + 86_400_000,
          mins: 60,
          id: 'o1',
        }),
        session(),
      ],
      START - 11 * 86_400_000,
      save,
    )!;
    expect(n).toMatchObject({
      label: 'Next live build',
      title: 'Map Your Spend Live Build',
      mode: 'wait',
      joinBefore: JOIN_BEFORE_MIN,
      minutes: 90,
      where: 'Zoom',
      start: '2026-12-02T19:00:00.000Z',
      joinHref: '/learn/join/b1',
    });
    expect(n.when).toBe(fmt.when(START));
    expect(n.time).toBe(fmt.time(START));
    const oh = shellNext([session({ kind: 'office_hours', id: 'o1' })], START - MIN * 60, save)!;
    expect(oh.label).toBe('Next office hours');
  });
  it('inside the join window: Join (starting soon)', () =>
    expect(shellNext([session()], START - 9 * MIN, save)!.mode).toBe('join'));
  it('under way: live', () => expect(shellNext([session()], START + 12 * MIN, save)!.mode).toBe('live'));
  it('over: the next one', () => {
    const n = shellNext(
      [
        session(),
        session({
          id: 'o1',
          kind: 'office_hours',
          title: 'Map Your Spend Office Hours',
          start: START + 86_400_000,
          mins: 60,
        }),
      ],
      START + 120 * MIN,
      save,
    )!;
    expect(n).toMatchObject({ title: 'Map Your Spend Office Hours', mode: 'wait' });
  });
  it('the calendar menu: the file, Google Calendar, Outlook; the file downloads through saveIcs', () => {
    const n = shellNext([session()], START - 86_400_000, save)!;
    expect(n.calendar.map((c) => c.label)).toEqual(['Calendar file (.ics)', 'Google Calendar', 'Outlook']);
    expect(n.calendar[0]!.href).toBe('#');
    expect(n.calendar[1]!.href).toMatch(/^https:\/\/calendar\.google\.com\//);
    expect(n.calendar[2]!.href).toMatch(/^https:\/\/outlook\.live\.com\//);
    n.calendar[0]!.onClick!();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
  });
});

describe('shellProps', () => {
  const base = {
    rows: [
      row({}),
      row({ week: 1, title: 'Where the Money Goes', state: 'locked', done: 0, total: 0, href: '/learn/week/1' }),
    ],
    sessions: [session()],
    me: learner(null),
    name: 'Alex Morgan',
    now: START - 11 * 86_400_000,
    here: 'Foundations',
    logos: { app: 'data:a' },
    account: { open: false, onClick: () => undefined },
    saveIcs: () => undefined,
  };
  it('the nav in the mockup’s order, with its icons', () => {
    const s = shellProps({ ...base, nav: nav(), side: side() });
    expect(s.nav.map((n) => [n.icon, n.label, n.href, n.id])).toEqual([
      ['home', 'Home', '/learn', 'home'],
      ['cal', 'Schedule', '/learn/schedule', 'schedule'],
      ['talk', 'Community', '/learn/community', 'community'],
      ['grid', 'Skill library', '/learn/skills', 'library'],
      ['users', 'Team Hub', '/learn/team', 'team'],
      ['folder', 'Resource vault', '/learn/vault', 'vault'],
    ]);
    expect(s.cohort).toEqual(['Amplified AI Accelerator', 'December 2026 Cohort · Starts Dec 2']);
    expect(s.weeksLabel).toBe('Weeks');
    expect(s.weeks.map((w) => [w.n, w.title, w.locked])).toEqual([
      [0, 'Foundations', false],
      [1, 'Where the Money Goes', true],
    ]);
    // D-233 (v7): one logo; the rail shows the same file through a 26px window.
    expect(s.logo).toEqual({ label: 'Amplified Impact Academy, Home', app: 'data:a' });
    expect(s.account).toMatchObject({ initials: fmt.initials('Alex Morgan'), aria: 'Your account', open: false });
    expect(s.homeHref).toBe('/learn');
    expect(s.helpHref).toBe('mailto:support@example.com');
    expect(s.next?.title).toBe('Map Your Spend Live Build');
  });
  it('no Team Hub: no row', () =>
    expect(shellProps({ ...base, nav: nav(), side: side(false) }).nav.map((n) => n.id)).not.toContain('team'));
  it('no course: no Schedule, Community or next session', () => {
    const s = shellProps({
      ...base,
      rows: [],
      nav: nav(false),
      side: { teamHub: null, cohortLine: null, program: null, cohortOnly: null },
    });
    expect(s.nav.map((n) => n.id)).toEqual(['home', 'library', 'vault']);
    expect(s.next).toBeNull();
  });
});

describe('the Join address', () => {
  it('round-trips a session id', () => expect(joinOfHref(learnJoin('b 1'))).toBe('b 1'));
  it('ignores anything else', () => expect(joinOfHref('/learn/week/1')).toBeNull());
});
