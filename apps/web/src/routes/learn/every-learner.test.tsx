// D-257: LMS v3 for every learner type (Connor, Nov 25, 2026: "v3 rolls out to EVERY learner type, not only the
// cohort"). A learner without the course (the Agent Plan, the Team Plan, both Insiders, Utah Life, a paused or
// not-yet-open buyer) is in the v3 frame once `VITE_LMS_V3=true`, with today's pages inside it: Home, Skill library,
// Team Hub when they have one, Resource vault, and no Schedule, Community or empty Weeks group. Their program line is
// their plan's name or their group's (Connor's answers, Nov 25). With v3 off, D-182's routing is unchanged.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { seed } from '@ai/core';
import type { Db } from '@ai/core';
import type { NavVM, SideVM } from './learn.vm';
import { isCourseLearner, isNoCourseLearner, learnFrameFor, learnsInLms } from './audience';
import { AppShell } from './lms-v3/AppShell';
import type { Shell } from './lms-v3/AppShell';
import { programNameOf, shellProps } from './lms-v3/shell.vm';

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
const props = (noCourse: boolean, teamHub: boolean, programName = 'Amplified Team Plan') =>
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
    programName,
  });

describe('the v3 sidebar for a learner without the course (shellProps, noCourse)', () => {
  it('lists Home, Skill library, Team Hub when they have one, Resource vault; no Schedule or Community (Q-B4)', () => {
    expect(props(true, true).nav.map((n) => n.id)).toEqual(['home', 'library', 'team', 'vault']);
    expect(props(true, false).nav.map((n) => n.id)).toEqual(['home', 'library', 'vault']);
  });

  it('sends the logo Home, has no weeks and no next session', () => {
    const s = props(true, false);
    expect(s.homeHref).toBe('/learn');
    expect(s.weeks).toEqual([]);
    expect(s.next).toBeNull();
  });

  it('shows their plan’s name, or their group’s, in the program line (Q-B3)', () => {
    expect(props(true, false, 'Amplified Agent Plan').cohort).toEqual(['Amplified Agent Plan', '']);
    expect(props(true, false, 'Utah Life').cohort).toEqual(['Utah Life', '']);
  });

  it('leaves the course’s learner’s sidebar as it was', () => {
    const s = props(false, true);
    expect(s.nav.map((n) => n.id)).toEqual(['home', 'schedule', 'community', 'library', 'team', 'vault']);
    expect(s.homeHref).toBe('/learn');
  });
});

describe('the program line’s name (programNameOf, Q-B3)', () => {
  it('is the first plan that hasn’t ended, by its billing name', () => {
    expect(programNameOf({ plans: [{ kind: 'agent_plan', status: 'active' }] })).toBe('Amplified Agent Plan');
    expect(programNameOf({ plans: [{ kind: 'agents', status: 'active' }] })).toBe('Amplified Team Plan');
    expect(programNameOf({ plans: [{ kind: 'insiders_agent', status: 'active' }] })).toBe('Amplified Insiders for Agents');
    expect(programNameOf({ plans: [{ kind: 'agent_plan', status: 'ended' }, { kind: 'agents', status: 'active' }] })).toBe('Amplified Team Plan');
  });

  it('is the access group’s name for a member with no plan of their own', () => {
    expect(programNameOf({ plans: [], accessGroups: [{ name: 'Utah Life' }] })).toBe('Utah Life');
  });

  it('is nothing when there is neither', () => {
    expect(programNameOf({ plans: [], accessGroups: [] })).toBe('');
    expect(programNameOf(null)).toBe('');
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
    expect(container.querySelector('.sh-logo')!.getAttribute('href')).toBe('/learn');
  });

  it('is drawn as before once there are weeks', () => {
    const { container } = render(<AppShell shell={shell([{ n: 0, title: 'Foundations', href: '/learn/week/0', id: 'week-0', status: 'idle' }])} current="library" />);
    expect(container.querySelector('#sh-group')!.textContent).toContain('Weeks');
    expect(container.querySelectorAll('#sh-weeks .sh-week')).toHaveLength(1);
  });
});

// The pages: the Skill Library is today's standalone page inside the frame, without its own logo and ground (Q-B2).
const state = vi.hoisted(() => ({ db: null as unknown as Db, viewer: { actor: { kind: 'learner', userId: 'u_jamie' } } as { actor: { kind: string; userId?: string } } }));
vi.mock('../../data/hooks', async (orig) => ({ ...(await orig<object>()), useDb: () => state.db, useViewer: () => state.viewer }));
vi.mock('../library/SkillLibrary', async (orig) => ({ ...(await orig<object>()), Component: ({ framed }: { framed?: boolean }) => <p>today’s standalone Skill Library{framed ? ', framed' : ''}</p> }));
vi.mock('./skills-data', async (orig) => ({ ...(await orig<object>()), useSkills: () => ({ kind: 'loading' }) }));
vi.mock('./data', async (orig) => ({
  ...(await orig<object>()),
  useLearn: () => ({ course: { kind: 'locked' }, db: state.db, viewer: state.viewer, now: Date.parse('2026-11-25T18:00:00Z') }),
}));


describe('the pages a learner without the course reaches', () => {
  it('the Skill Library is today’s standalone page; the course’s learner keeps the members’ library', async () => {
    const { Component: Library } = await import('./Library');
    state.db = withoutCourse();
    const { unmount } = render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>,
    );
    expect(screen.getByText('today’s standalone Skill Library, framed')).toBeInTheDocument();
    unmount();
    state.db = withCourse();
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/today’s standalone Skill Library/)).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Skill library' })).toBeInTheDocument();
  });
});
