import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../../data/repository';
import type { CourseLoad } from './data';
import type * as DataModule from './data';
import { learnerV2Enabled } from './flag';
import { learnerRoutes } from './routes';
import { LEARNER_ID, learnState, liveState, prelaunchState } from './test/fixture';
import type { LearnState } from './test/fixture';

// D-177: the learner portal v2, rendered for real through its own routes and shell; only the data
// hooks and `GET /api/course` are stood in for, with the course and snapshot the API would send
// (the deployed seed's new Weeks 0 to 3).

const state: { db: Db; viewer: Viewer; now: number; course: CourseLoad } = {
  db: prelaunchState().db,
  viewer: { actor: { kind: 'learner', userId: LEARNER_ID }, role: 'learner' },
  now: prelaunchState().now,
  course: { kind: 'ready', payload: prelaunchState().payload },
};
const mutate = vi.fn(async () => ({}));

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
  const router = createMemoryRouter([...learnerRoutes(true), { path: '/', element: <p>the portal</p> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const aside = () => document.querySelector<HTMLElement>('aside[aria-label="Primary"]')!;

beforeEach(() => {
  setViewerZone('America/Denver');
  setWidth(1440);
  use(prelaunchState());
  mutate.mockClear();
  delete document.body.dataset.appReady;
});
afterEach(() => {
  setViewerZone(null);
  delete document.body.dataset.appReady;
});

describe('the learner shell (D-177)', () => {
  it('draws every required landmark and marks the app ready', async () => {
    at('/learn');
    expect(await screen.findByRole('heading', { level: 1, name: 'Good afternoon, Dana' }, { timeout: 5000 })).toBeInTheDocument();
    expect(aside()).not.toBeNull();
    expect(document.querySelector('header nav[aria-label="Breadcrumb"]')).not.toBeNull();
    expect(document.querySelector('main')).not.toBeNull();
    expect(document.querySelector('[data-brand-slot]')).not.toBeNull();
    expect(document.querySelector('[data-r2-scope][data-learner-v2]')).not.toBeNull();
    await waitFor(() => expect(document.body.dataset.appReady).toBe('true'));
  });

  it('the nav: Home and Schedule as today’s pages, the Skill library as its own (D-179), the vault locked in the preview, and each week with its status', async () => {
    at('/learn');
    await screen.findByRole('heading', { level: 1 });
    const nav = within(aside());
    expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('link', { name: 'Schedule' })).toHaveAttribute('href', '/sessions');
    expect(nav.getByRole('link', { name: 'Skill library' })).toHaveAttribute('href', '/learn/skills');
    const vault = nav.getByRole('button', { name: /Resource vault/ });
    expect(vault).toHaveAttribute('aria-disabled', 'true');
    expect(vault).toHaveAccessibleDescription('Opens Wed, Dec 2 · 12:00 PM MT');
    expect(nav.getByRole('button', { name: /AI employees/ })).toHaveAttribute('aria-expanded', 'true');
    expect(nav.getByRole('link', { name: /Foundations/ })).toHaveAttribute('href', '/learn/week/0');
    expect(nav.getByRole('link', { name: /Leads That Pay/ })).toHaveTextContent('Opens Dec 9');
    expect(nav.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/learn/week/'))).toHaveLength(9);
    expect(nav.getByRole('link', { name: 'Get help' })).toHaveAttribute('href', 'mailto:support@amplifiedimpact.io');
    fireEvent.click(nav.getByRole('button', { name: /AI employees/ }));
    expect(nav.queryByRole('link', { name: /Foundations/ })).toBeNull();
  });

  it('the bar says the next live build, or the session live now with Join', async () => {
    at('/learn');
    const bar = (await screen.findByRole('banner')) as HTMLElement;
    expect(bar).toHaveTextContent('Next live build');
    expect(bar).toHaveTextContent('Map Your Spend Live Build');
    expect(within(bar).getByRole('button', { name: 'Add to calendar' })).toBeInTheDocument();
  });

  it('on a phone: a 56px bar, the next session strip, and the sidebar as a modal drawer', async () => {
    setWidth(390);
    at('/learn');
    await screen.findByRole('heading', { level: 1 });
    expect(document.querySelector('[role="dialog"][data-drawer="open"]')).toBeNull();
    expect(screen.getByRole('link', { name: /Next live build/ })).toHaveAttribute('href', '/sessions');
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const drawer = document.querySelector<HTMLElement>('[role="dialog"][data-drawer="open"]')!;
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(drawer.querySelector('aside[aria-label="Primary"]')).not.toBeNull();
    await waitFor(() => expect(within(drawer).getByRole('button', { name: 'Close menu' })).toHaveFocus());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('[data-drawer="open"]')).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus());
  });
});

describe('Home (D-177)', () => {
  it('before launch: one hero with the step up next, the cards from the API, what is coming up and the cohort', async () => {
    at('/learn');
    await screen.findByRole('heading', { level: 1, name: 'Good afternoon, Dana' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Pre-launch preview: Week 0 is open now, and each week opens on the date shown.')).toBeInTheDocument();
    const hero = screen.getByRole('region', { name: 'Start Your Time Baseline' });
    expect(within(hero).getByRole('link', { name: /Continue step 3/ })).toHaveAttribute('href', '/learn/week/0/step/3');
    expect(within(hero).getByRole('link', { name: 'See all eight steps' })).toHaveAttribute('href', '/learn/week/0');
    expect(within(hero).getByRole('timer')).toHaveAccessibleName('13 days, 22 hrs, 0 min');
    const cards = screen.getByRole('region', { name: 'Your AI employees' });
    expect(within(cards).getByRole('link', { name: 'Foundations, 2 of 8' })).toHaveAttribute('href', '/learn/week/0');
    expect(within(cards).getByRole('link', { name: 'Where the Money Goes, Opens Dec 2' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Coming up' })).toHaveTextContent('Map Your Spend Office Hours');
    expect(screen.getByRole('region', { name: 'Your cohort' })).toHaveTextContent('15in your cohort');
  });

  it('at a live build: live now, Join the live build, and the time left', async () => {
    use(liveState());
    at('/learn');
    const hero = await screen.findByRole('region', { name: 'Lead Source Review Live Build' });
    expect(hero).toHaveTextContent('Live now · Week 2');
    expect(within(hero).getByRole('button', { name: 'Join the live build' })).toBeInTheDocument();
    expect(within(hero).getByRole('timer')).toHaveAccessibleName('1 hr, 25 min');
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Join' })).toBeInTheDocument();
  });

  it('without the course (Utah Life, a plan of skills): no cohort pieces, the way to the Library', async () => {
    state.course = { kind: 'locked' };
    at('/learn');
    await screen.findByRole('heading', { level: 1, name: 'Good afternoon, Dana' });
    expect(screen.getByRole('link', { name: 'Open Your Skill Library' })).toHaveAttribute('href', '/learn/skills');
    expect(screen.queryByRole('region', { name: 'Your AI employees' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Your cohort' })).toBeNull();
    expect(within(aside()).queryByRole('link', { name: 'Schedule' })).toBeNull();
    expect(within(aside()).queryByRole('button', { name: /AI employees/ })).toBeNull();
    expect(screen.getByRole('banner')).not.toHaveTextContent('Next live build');
  });
});

describe('the week overview (D-177)', () => {
  it('an open week: its steps with who and time, the step up next, and its kit linked only where the page exists', async () => {
    at('/learn/week/0');
    expect(await screen.findByRole('heading', { level: 1, name: 'Foundations' })).toBeInTheDocument();
    const steps = screen.getByRole('region', { name: 'Eight steps' });
    expect(within(steps).getAllByRole('link')).toHaveLength(8);
    expect(within(steps).getByRole('link', { name: 'Step 3, Start Your Time Baseline, up next' })).toHaveAttribute('href', '/learn/week/0/step/3');
    const kit = screen.getByRole('region', { name: 'Week 0 kit' });
    expect(within(kit).getByRole('link', { name: /AI Brain Setup/ })).toHaveAttribute('href', '/learn/skills/ai-brain-setup');
    expect(within(kit).queryByRole('link', { name: /Map Your Spend/ })).toBeNull();
    expect(kit).toHaveTextContent('Map Your SpendSkill · Coming With Week 1');
    expect(within(aside()).getByRole('link', { name: /Foundations/ })).toHaveAttribute('aria-current', 'page');
  });

  it('a locked week: its stub alone, when it opens, and its sessions; never its steps', async () => {
    at('/learn/week/2');
    expect(await screen.findByRole('heading', { level: 1, name: 'Leads That Pay' })).toBeInTheDocument();
    expect(screen.getByText('Opens Wed, Dec 9 · 12:00 PM MT · Week 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Which lead sources pay, and is every lead worked?' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Build it live' })).toHaveTextContent('Lead Source Review Live Build');
    expect(document.querySelector('main a[href^="/learn/week/2/step/"]')).toBeNull();
  });

  it('a step of a locked week, or a week not in the course, goes somewhere real', async () => {
    const router = at('/learn/week/2/step/1');
    await screen.findByRole('heading', { level: 1, name: 'Leads That Pay' });
    expect(router.state.location.pathname).toBe('/learn/week/2');
    act(() => void router.navigate('/learn/week/42'));
    await screen.findByRole('heading', { level: 1, name: 'Good afternoon, Dana' });
    expect(router.state.location.pathname).toBe('/learn');
  });
});

describe('the step player (D-177)', () => {
  it('Claude and ChatGPT tabs from the step’s own paths', async () => {
    at('/learn/week/0/step/4');
    expect(await screen.findByRole('heading', { level: 1, name: 'Get Your AI Ready' })).toBeInTheDocument();
    expect(screen.getByText('20 min · Claude or ChatGPT · Operator')).toBeInTheDocument();
    const tabs = screen.getByRole('radiogroup', { name: 'Your AI' });
    expect(within(tabs).getByRole('radio', { name: 'Claude' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('A paid Claude plan')).toBeInTheDocument();
    fireEvent.click(within(tabs).getByRole('radio', { name: 'ChatGPT' }));
    expect(within(tabs).getByRole('radio', { name: 'ChatGPT' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('A paid ChatGPT plan')).toBeInTheDocument();
    expect(screen.queryByText('A paid Claude plan')).toBeNull();
  });

  it('Mark step done writes through the portal’s own toggleStep, for this step’s id', async () => {
    at('/learn/week/0/step/4');
    const mark = await screen.findByRole('button', { name: 'Mark step done' });
    expect(mark).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mark);
    await waitFor(() => expect(mutate).toHaveBeenCalledWith('toggleStep', { moduleId: 'accelerator-week-0', stepId: 'c4' }));
    expect(screen.getByRole('link', { name: /Previous/ })).toHaveAttribute('href', '/learn/week/0/step/3');
    expect(screen.getByRole('link', { name: /Next step/ })).toHaveAttribute('href', '/learn/week/0/step/5');
  });

  it('a step already done shows pressed; staff can’t mark one', async () => {
    at('/learn/week/0/step/1');
    expect(await screen.findByRole('button', { name: 'Mark step done' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('a copy block has a copy button that puts its text on the clipboard', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    use(learnState(Date.parse('2026-12-17T20:00:00Z'), false, {}));
    at('/learn/week/3/step/4');
    await screen.findByRole('heading', { level: 1, name: 'Schedule the Finance Analyst' });
    const copy = screen.getByRole('button', { name: 'Copy: The Finance Analyst prompt' });
    fireEvent.click(copy);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(String((writeText.mock.calls[0] as unknown[])[0]).length).toBeGreaterThan(40);
    expect(await within(copy).findByText('Copied')).toBeInTheDocument();
  });

  it('For this step: an unbuilt Library page shows the coming copy string, with no link', async () => {
    at('/learn/week/0/step/3');
    const kit = await screen.findByRole('region', { name: 'For this step' });
    expect(within(kit).getByRole('link', { name: /AI Brain Setup/ })).toHaveAttribute('href', '/learn/skills/ai-brain-setup');
    expect(within(kit).queryByRole('link', { name: /Lead Source Review/ })).toBeNull();
    expect(kit).toHaveTextContent('Lead Source ReviewSkill · Coming With Week 1');
  });
});

describe('the flag (D-177)', () => {
  it('is off unless set, on under vitest, and on in the fixture build', () => {
    expect(learnerV2Enabled({})).toBe(false);
    expect(learnerV2Enabled({ MODE: 'production' })).toBe(false);
    expect(learnerV2Enabled({ MODE: 'fixture', VITE_LEARNER_V2: 'true' })).toBe(true);
    expect(learnerV2Enabled({ MODE: 'test' })).toBe(true);
    expect(learnerV2Enabled({ MODE: 'test', VITE_LEARNER_V2: 'false' })).toBe(false);
    expect(learnerV2Enabled({ MODE: 'production', VITE_LEARNER_V2: 'yes' })).toBe(false);
  });

  it('off: every /learn address redirects to /, and no learner screen is registered', async () => {
    const routes = learnerRoutes(false);
    expect(routes).toHaveLength(1);
    expect(routes[0]!.lazy).toBeUndefined();
    for (const path of ['/learn', '/learn/week/0', '/learn/week/0/step/3', '/learn/anything']) {
      const router = createMemoryRouter([...routes, { path: '/', element: <p>the portal</p> }], { initialEntries: [path] });
      const { unmount } = render(<RouterProvider router={router} />);
      expect(await screen.findByText('the portal')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/');
      unmount();
    }
  });
});
