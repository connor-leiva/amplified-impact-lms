// D-257: LMS v3 for every learner type (Connor, Nov 25, 2026: "v3 rolls out to EVERY learner type, not only the
// cohort"). A learner without the course (the Agent Plan, the Team Plan, both Insiders, Utah Life, a paused or
// not-yet-open buyer) is in the v3 frame once `VITE_LMS_V3=true`, with today's pages inside it and today's sidebar:
// no Home, no Schedule, no Community, no empty Weeks group. With v3 off, D-182's routing is unchanged.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { seed } from '@ai/core';
import type { Db } from '@ai/core';
import type { NavVM, SideVM } from './learn.vm';
import { isCourseLearner, isNoCourseLearner, learnFrameFor, learnsInLms } from './audience';
import { AppShell } from './lms-v3/AppShell';
import type { Shell } from './lms-v3/AppShell';
import { shellProps } from './lms-v3/shell.vm';

const withCourse = (): Db => seed('live');
/** The scoped snapshot of a plan that opens no AI Employee: every module a draft, so `visibleModules` is empty. */
const withoutCourse = (): Db => {
  const db = seed('live');
  return { ...db, modules: db.modules.map((m) => ({ ...m, status: 'draft' as const })) };
};
const learner = { actor: { kind: 'learner' as const, userId: 'u_jamie' } };
const staff = { actor: { kind: 'staff' as const, staffId: 'st1' } };

describe('who is a learner without the course', () => {
  it('is a learner whose snapshot opens no AI Employee; never staff, never the course’s learner', () => {
    expect(isNoCourseLearner(learner, withoutCourse())).toBe(true);
    expect(isNoCourseLearner(learner, withCourse())).toBe(false);
    expect(isCourseLearner(learner, withCourse())).toBe(true);
    expect(isNoCourseLearner(staff, withoutCourse())).toBe(false);
  });
});

describe('where a learner’s /learn address draws (learnFrameFor)', () => {
  it('gives the course’s learner the learner portal, flag or not (D-182)', () => {
    expect(learnFrameFor({ course: true, buyer: false, v3: false })).toBe('portal');
    expect(learnFrameFor({ course: true, buyer: false, v3: true })).toBe('portal');
  });

  it('gives a $37 buyer with nothing else the buyer’s LMS, whatever the flags say (D-241)', () => {
    expect(learnFrameFor({ course: false, buyer: true, v3: false })).toBe('buyer');
    expect(learnFrameFor({ course: false, buyer: true, v3: true })).toBe('buyer');
  });

  it('gives every other learner without the course the learner portal with v3 on, and the first portal with it off', () => {
    expect(learnFrameFor({ course: false, buyer: false, v3: true })).toBe('portal');
    expect(learnFrameFor({ course: false, buyer: false, v3: false })).toBe('first-portal');
  });
});

describe('whether /skill-library and a guide send the visitor into /learn (learnsInLms)', () => {
  it('sends the course’s learner always, every other learner only with v3 on, and never a visitor or staff', () => {
    expect(learnsInLms('course', false)).toBe(true);
    expect(learnsInLms('course', true)).toBe(true);
    expect(learnsInLms('no-course', true)).toBe(true);
    expect(learnsInLms('no-course', false)).toBe(false);
    expect(learnsInLms('other', true)).toBe(false);
    expect(learnsInLms('other', false)).toBe(false);
  });
});

const nav = (cohort: boolean): NavVM => ({
  cohort,
  home: { label: 'Home', href: '/learn', active: false },
  schedule: { label: 'Schedule', href: '/learn/schedule', active: false },
  library: { label: 'Skill library', href: '/learn/skills', active: false },
  vault: { label: 'Resource vault', href: '/learn/vault', locked: false, title: null, active: false },
  employees: null,
  help: { label: 'Get help', href: 'mailto:support@example.com' },
});
const side = (teamHub: boolean): SideVM => ({
  teamHub: teamHub ? { label: 'Team Hub', href: '/learn/team', active: false } : null,
  cohortLine: null,
  program: null,
  cohortOnly: null,
});
const props = (noCourse: boolean, teamHub: boolean) =>
  shellProps({
    nav: nav(!noCourse),
    side: side(teamHub),
    rows: [],
    sessions: [],
    me: null,
    name: 'Morgan Team Plan',
    now: Date.parse('2026-11-25T18:00:00Z'),
    here: 'Skill library',
    logos: { app: 'data:image/svg+xml,' },
    account: { open: false, onClick: () => undefined },
    saveIcs: () => undefined,
    noCourse,
  });

describe('the v3 sidebar for a learner without the course (shellProps, noCourse)', () => {
  it('lists what they have today: Skill library, Team Hub when they have one, Resource vault; no Home, Schedule or Community', () => {
    expect(props(true, true).nav.map((n) => n.id)).toEqual(['library', 'team', 'vault']);
    expect(props(true, false).nav.map((n) => n.id)).toEqual(['library', 'vault']);
  });

  it('sends the logo to their Skill Library, has no weeks and no next session', () => {
    const s = props(true, false);
    expect(s.homeHref).toBe('/learn/skills');
    expect(s.weeks).toEqual([]);
    expect(s.next).toBeNull();
  });

  it('leaves the course’s learner’s sidebar as it was: Home first, the logo Home', () => {
    const s = props(false, true);
    expect(s.nav.map((n) => n.id)).toEqual(['home', 'schedule', 'community', 'library', 'team', 'vault']);
    expect(s.homeHref).toBe('/learn');
  });
});

describe('the Weeks group (AppShell)', () => {
  const shell = (weeks: Shell['weeks']): Shell => ({ ...props(true, false), weeks });

  it('is not drawn for a learner with no weeks: no empty "Weeks 0", no empty list', () => {
    const { container } = render(<AppShell shell={shell([])} current="library" />);
    expect(container.querySelector('#sh-group')).toBeNull();
    expect(container.querySelector('#sh-weeks')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Weeks' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(container.querySelector('.sh-logo')!.getAttribute('href')).toBe('/learn/skills');
  });

  it('is drawn as before once there are weeks', () => {
    const { container } = render(<AppShell shell={shell([{ n: 0, title: 'Foundations', href: '/learn/week/0', id: 'week-0', status: 'idle' }])} current="library" />);
    expect(container.querySelector('#sh-group')!.textContent).toContain('Weeks');
    expect(container.querySelectorAll('#sh-weeks .sh-week')).toHaveLength(1);
  });
});

// The pages: Home sends them to their Skill Library (their landing, D-119), with the address's query kept so the
// Team Plan window (`?plan=team`) still opens; the Skill Library is today's standalone page, unchanged.
const state = vi.hoisted(() => ({ db: null as unknown as Db, viewer: { actor: { kind: 'learner', userId: 'u_jamie' } } as { actor: { kind: string; userId?: string } } }));
vi.mock('../../data/hooks', async (orig) => ({ ...(await orig<object>()), useDb: () => state.db, useViewer: () => state.viewer }));
vi.mock('../library/SkillLibrary', async (orig) => ({ ...(await orig<object>()), Component: () => <p>today’s standalone Skill Library</p> }));
vi.mock('./skills-data', async (orig) => ({ ...(await orig<object>()), useSkills: () => ({ kind: 'loading' }) }));
vi.mock('./data', async (orig) => ({
  ...(await orig<object>()),
  useLearn: () => ({ course: { kind: 'locked' }, db: state.db, viewer: state.viewer, now: Date.parse('2026-11-25T18:00:00Z') }),
}));

function Where() {
  const { pathname, search } = useLocation();
  return <p>at {pathname + search}</p>;
}

describe('the pages a learner without the course reaches', () => {
  it('Home sends them to their Skill Library, keeping the query', async () => {
    state.db = withoutCourse();
    const { Component: Home } = await import('./Home');
    render(
      <MemoryRouter initialEntries={['/learn?plan=team']}>
        <Routes>
          <Route path="/learn" element={<Home />} />
          <Route path="/learn/skills" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('at /learn/skills?plan=team')).toBeInTheDocument();
  });

  it('the Skill Library is today’s standalone page; the course’s learner keeps the members’ library', async () => {
    const { Component: Library } = await import('./Library');
    state.db = withoutCourse();
    const { unmount } = render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>,
    );
    expect(screen.getByText('today’s standalone Skill Library')).toBeInTheDocument();
    unmount();
    state.db = withCourse();
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>,
    );
    expect(screen.queryByText('today’s standalone Skill Library')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Skill library' })).toBeInTheDocument();
  });
});
