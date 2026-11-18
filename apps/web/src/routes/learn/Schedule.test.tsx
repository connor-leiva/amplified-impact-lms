import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../../data/repository';
import type { CourseLoad } from './data';
import type * as DataModule from './data';
import type * as IcsModule from './ics';
import { learnerRoutes } from './routes';
import { LEARNER_ID, liveState, prelaunchState } from './test/fixture';
import type { LearnState } from './test/fixture';

// D-180: the Schedule, rendered for real through the learner routes and shell; only the data hooks and
// `GET /api/course` are stood in for, with the course and snapshot the API would send (the deployed seed).

const state: { db: Db; viewer: Viewer; now: number; course: CourseLoad } = {
  db: prelaunchState().db,
  viewer: { actor: { kind: 'learner', userId: LEARNER_ID }, role: 'learner' },
  now: prelaunchState().now,
  course: { kind: 'ready', payload: prelaunchState().payload },
};
const saved = vi.fn();

vi.mock('../../data/hooks', () => ({
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => state.now,
  useMutate: () => vi.fn(async () => ({})),
}));
vi.mock('./data', async (importOriginal) => ({
  ...(await importOriginal<typeof DataModule>()),
  useCourse: () => state.course,
}));
vi.mock('./ics', async (importOriginal) => ({
  ...(await importOriginal<typeof IcsModule>()),
  saveIcs: (...args: unknown[]) => saved(...args),
}));

function use(st: LearnState) {
  state.db = st.db;
  state.viewer = st.viewer;
  state.now = st.now;
  state.course = { kind: 'ready', payload: st.payload };
}

function setWidth(w: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
  window.dispatchEvent(new Event('resize'));
}

function at(path: string) {
  const router = createMemoryRouter([...learnerRoutes(true), { path: '/', element: <p>the portal</p> }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
  return router;
}

const aside = () => document.querySelector<HTMLElement>('aside[aria-label="Primary"]')!;
const main = () => document.querySelector<HTMLElement>('main')!;

beforeEach(() => {
  setViewerZone('America/Denver');
  setWidth(1440);
  use(prelaunchState());
  saved.mockClear();
});
afterEach(() => setViewerZone(null));

describe('the Schedule (D-180)', () => {
  it('is the nav’s Schedule, marked as the page, with one h1 and the view switch', async () => {
    at('/learn/schedule');
    expect(await screen.findByRole('heading', { level: 1, name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const nav = within(aside());
    expect(nav.getByRole('link', { name: 'Schedule' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    const view = within(screen.getByRole('navigation', { name: 'View' }));
    expect(view.getByRole('link', { name: 'Weeks' })).toHaveAttribute('aria-current', 'page');
    expect(view.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/learn/schedule?view=calendar');
  });

  it('downloads the whole schedule from the calendar route, and one session’s .ics from the hero', async () => {
    at('/learn/schedule');
    await screen.findByRole('heading', { level: 1 });
    const all = within(main()).getByRole('link', { name: 'Add all to calendar' });
    expect(all).toHaveAttribute('href', '/calendar/schedule.ics');
    expect(all).toHaveAttribute('download');
    const hero = screen.getByRole('region', { name: 'Map Your Spend Live Build' });
    expect(hero).toHaveTextContent('Next · Week 1 · Live build');
    expect(within(hero).getByRole('timer')).toHaveAccessibleName('13 days, 22 hrs, 0 min');
    fireEvent.click(within(hero).getByRole('button', { name: 'Add to calendar' }));
    expect(saved).toHaveBeenCalledWith(
      [
        {
          id: 'dec26-s1',
          title: 'Map Your Spend Live Build',
          start: Date.parse('2026-12-02T19:00:00Z'),
          end: Date.parse('2026-12-02T20:30:00Z'),
        },
      ],
      state.now,
    );
    expect(within(hero).getByRole('link', { name: 'See what you’ll build' })).toHaveAttribute('href', '/learn/week/1');
  });

  it('weeks: every week from the API, locked ones with when they open, every session of each, and the break', async () => {
    at('/learn/schedule');
    await screen.findByRole('heading', { level: 1 });
    const list = screen.getByRole('region', { name: 'Nine weeks' });
    const rows = within(list).getAllByRole('link');
    expect(rows).toHaveLength(9);
    expect(rows[0]).toHaveAccessibleName('Week 0, Foundations, In progress');
    expect(rows[0]).toHaveTextContent('In progress');
    expect(rows[0]).toHaveTextContent('Self-paced, due Mon, Nov 30');
    expect(rows[2]).toHaveAccessibleName('Week 2, Leads That Pay, opens Wed, Dec 9');
    expect(rows[2]).toHaveTextContent('Lead Source Review Live Build · Wed, Dec 9');
    expect(rows[2]).toHaveTextContent('Goal-Planning Session 1 and Office Hours · Thu, Dec 10');
    expect(rows[2]).toHaveTextContent('Lead Source Review Office Hours · Fri, Dec 11');
    expect(within(rows[2]!).getByRole('img', { name: 'Locked' })).toBeInTheDocument();
    expect(within(rows[0]!).queryByRole('img', { name: 'Locked' })).toBeNull();
    const note = within(list).getByRole('note');
    expect(note).toHaveTextContent('Holiday break');
    expect(note).toHaveTextContent('No sessions on Dec 23 or Dec 30. No new build until Jan 6.');
    expect(list).toHaveTextContent('December 2026');
    expect(list).toHaveTextContent('January 2027');
  });

  it('calendar: the month grid, the legend and the months either side, and the phone’s list of every session', async () => {
    const router = at('/learn/schedule');
    await screen.findByRole('heading', { level: 1 });
    fireEvent.click(within(screen.getByRole('navigation', { name: 'View' })).getByRole('link', { name: 'Calendar' }));
    const grid = await screen.findByRole('table', { name: 'December 2026' });
    expect(router.state.location.search).toBe('?view=calendar');
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    expect(within(grid).getAllByRole('row')).toHaveLength(6);
    expect(
      within(grid).getByRole('link', { name: 'Map Your Spend Live Build, Wed, Dec 2, 12:00 PM MT (1:00 PM CT)' }),
    ).toHaveAttribute('href', '/learn/week/1');
    expect(
      within(grid).getByRole('link', { name: /^Lead Source Review Office Hours, Fri, Dec 11/ }),
    ).toBeInTheDocument();
    expect(within(grid).getAllByText('No build')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(await screen.findByRole('table', { name: 'January 2027' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'January 2027' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(await screen.findByRole('table', { name: 'February 2027' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    const agenda = document.querySelector<HTMLElement>('section[aria-label="All sessions"]')!;
    expect(within(agenda).getAllByRole('link')).toHaveLength(18);
    expect(agenda).toHaveTextContent('Week 2 · 12:00 PM MT (1:00 PM CT) · 1 hr');
  });

  it('at a live build: marks today and the week a learner is on', async () => {
    use(liveState());
    at('/learn/schedule?view=calendar');
    const grid = await screen.findByRole('table', { name: 'December 2026' });
    expect(grid.querySelectorAll('[data-today="true"]')).toHaveLength(1);
    expect(grid.querySelector('[data-today="true"]')).toHaveTextContent('9');
  });

  it('a plan without the course has no Schedule: it goes Home', async () => {
    state.course = { kind: 'locked' };
    const router = at('/learn/schedule');
    await waitFor(() => expect(router.state.location.pathname).toBe('/learn'));
  });

  it('Home’s Schedule link opens it', async () => {
    at('/learn');
    await screen.findByRole('heading', { level: 1 });
    expect(within(main()).getByRole('link', { name: 'Schedule' })).toHaveAttribute('href', '/learn/schedule');
  });

  it('flag off: /learn/schedule redirects to /, as every /learn address does', async () => {
    const router = createMemoryRouter([...learnerRoutes(false), { path: '/', element: <p>the portal</p> }], {
      initialEntries: ['/learn/schedule?view=calendar'],
    });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('the portal')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
