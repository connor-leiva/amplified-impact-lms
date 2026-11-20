import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../../data/repository';
import type { CourseLoad } from './data';
import type * as DataModule from './data';
import type { SkillsLoad } from './skills-data';
import { learnerRoutes } from './routes';
import type { LearnState } from './test/fixture';
import { UTAH_LINE } from './test/library-fixture';
import { PLAN_COPY, TEAM_MODULE, groupSkills, offerSkills, planState } from './test/plan-fixture';
import { PRELOAD_TIMEOUT, preloadLearnerRoutes } from './test/preload';

// D-187: the Team Plan window, rendered for real through the learner routes and shell: opened by its address
// (where `/team-tier` lands), by a page that comes with the Team Plan, and never offered to an access group's
// member. Only the data hooks are stood in for.

const state: { db: Db; viewer: Viewer; now: number; course: CourseLoad; skills: SkillsLoad } = {
  db: planState().db,
  viewer: planState().viewer,
  now: planState().now,
  course: { kind: 'ready', payload: planState().payload },
  skills: { kind: 'ready', payload: offerSkills() },
};
const mutate = vi.fn(async (_name: string, _args?: unknown) => ({}));

vi.mock('../../data/hooks', () => ({
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => state.now,
  useMutate: () => mutate,
}));
vi.mock('./data', async (importOriginal) => ({
  ...(await importOriginal<typeof DataModule>()),
  useCourse: () => state.course,
}));
vi.mock('./skills-data', () => ({
  useSkills: () => state.skills,
  useGuide: () => ({ kind: 'loading' }),
}));

function use(st: LearnState, skills: SkillsLoad = { kind: 'ready', payload: offerSkills() }) {
  state.db = st.db;
  state.viewer = st.viewer;
  state.now = st.now;
  state.course = { kind: 'ready', payload: st.payload };
  state.skills = skills;
}

function at(path: string) {
  const router = createMemoryRouter([...learnerRoutes(true), { path: '/', element: <p>the portal</p> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

// Every lazy route chunk loaded once, so no first render races its import (E-16).
beforeAll(preloadLearnerRoutes, PRELOAD_TIMEOUT);

beforeEach(() => {
  setViewerZone('America/Denver');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
  mutate.mockClear();
});
afterEach(() => setViewerZone(null));

describe('the Team Plan window (D-187)', () => {
  it('/learn?plan=team opens it over Home: the builder’s words and one button, which sends requestUpgrade @parity:P-1 @parity:R-6 @parity:A-7', async () => {
    use(planState());
    const router = at('/learn?plan=team&as=agent');
    const dialog = await screen.findByRole('dialog', { name: PLAN_COPY['plan.team.title'] }, { timeout: 5000 });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(within(dialog).getByText(PLAN_COPY['plan.team.lead']!)).toBeInTheDocument();
    expect(within(dialog).getByText(PLAN_COPY['plan.team.solo']!)).toBeInTheDocument();
    const buttons = within(dialog).getAllByRole('button');
    expect(buttons.map((b) => b.textContent || b.getAttribute('aria-label'))).toEqual(['Close', PLAN_COPY['plan.team.ask']]);
    fireEvent.click(within(dialog).getByRole('button', { name: PLAN_COPY['plan.team.ask'] }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith('requestUpgrade', { source: 'Team Plan window' }));
    // Closing it leaves Home, and the address loses only the window's parameters.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(router.state.location.pathname).toBe('/learn');
    expect(router.state.location.search).toBe('?as=agent');
  });

  it('a Team-only AI employee opens the window over Home, previewing it; the Team Hub too @parity:SH-8', async () => {
    use(planState());
    const router = at(`/learn/employees/${TEAM_MODULE}`);
    const dialog = await screen.findByRole('dialog', { name: 'Operations AI Employee' }, { timeout: 5000 });
    expect(router.state.location.pathname).toBe('/learn');
    expect(within(dialog).getByText('A deadline calendar')).toBeInTheDocument();
    expect(within(dialog).getByText(PLAN_COPY['plan.team.title']!)).toBeInTheDocument();
  });

  it('the Team Hub’s address, for an Agent tier learner @parity:SH-8', async () => {
    use(planState());
    at('/learn/team');
    expect(await screen.findByRole('dialog', { name: 'Team Hub' }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('Utah Life: “Not included with Utah Life access”, no upsell and no button but Close @parity:SH-8 @parity:P-1', async () => {
    use(planState(), { kind: 'ready', payload: groupSkills() });
    at('/learn?plan=team');
    const dialog = await screen.findByRole('dialog', {}, { timeout: 5000 });
    expect(within(dialog).getByText(UTAH_LINE)).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent(PLAN_COPY['plan.team.title']!);
    expect(dialog).not.toHaveTextContent(PLAN_COPY['plan.team.lead']!);
    expect(within(dialog).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Close']);
  });

  it('a Team tier learner has the plan: no window', async () => {
    use(planState('team'));
    at('/learn?plan=team');
    await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
