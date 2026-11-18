// D-184: the open week's content, build kit, downloads and trail, and the sidebar's Team Hub and cohort
// line, rendered for real through the learner portal's own routes and shell; only the data hooks and
// `GET /api/course` are stood in for, with the course and snapshot the API would send.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../../data/repository';
import type { CourseLoad } from './data';
import type * as DataModule from './data';
import type * as ToasterModule from '../../components/primitives/Toaster';
import { learnerRoutes } from './routes';
import { LEARNER_ID, liveState, prelaunchState } from './test/fixture';
import type { LearnState } from './test/fixture';

const state: { db: Db; viewer: Viewer; now: number; course: CourseLoad } = {
  db: prelaunchState().db,
  viewer: { actor: { kind: 'learner', userId: LEARNER_ID }, role: 'learner' },
  now: prelaunchState().now,
  course: { kind: 'ready', payload: prelaunchState().payload },
};
const mutate = vi.fn(async () => ({}));
const toast = vi.fn();

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
vi.mock('../../components/primitives/Toaster', async (importOriginal) => ({
  ...(await importOriginal<typeof ToasterModule>()),
  useToaster: () => ({ toast }),
}));

function use(st: LearnState) {
  state.db = st.db;
  state.viewer = st.viewer;
  state.now = st.now;
  state.course = { kind: 'ready', payload: st.payload };
}

function at(path: string) {
  const router = createMemoryRouter([...learnerRoutes(true), { path: '/', element: <p>the portal</p> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const aside = () => document.querySelector<HTMLElement>('aside[aria-label="Primary"]')!;
const week0 = () => state.db.modules.find((m) => m.id === 'accelerator-week-0')!;

beforeEach(() => {
  setViewerZone('America/Denver');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
  use(prelaunchState());
  mutate.mockClear();
  toast.mockClear();
});
afterEach(() => setViewerZone(null));

describe('the week page’s content (D-184)', () => {
  it('@parity:K-3 @parity:K-4 @parity:K-6 @parity:K-8 the open week shows what the builder edits, each section under its own heading', async () => {
    at('/learn/week/0');
    // The first render of the file loads the lazy routes; give it the time Learn.test.tsx gives its first.
    await screen.findByRole('heading', { level: 1, name: 'Foundations' }, { timeout: 5000 });
    const w = (state.course as { payload: { course: { weeks: { why?: string[]; homework?: { byWeekEnd: string[] } }[] } } }).payload.course.weeks[0]!;
    expect(screen.getByRole('region', { name: 'How It Works' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Why It Matters' })).toHaveTextContent(w.why![0]!);
    expect(screen.getByRole('region', { name: 'Who Does What' })).toHaveTextContent('Time This Week');
    const hw = screen.getByRole('region', { name: 'Homework' });
    expect(within(hw).getByRole('heading', { level: 3, name: 'Implemented by Week’s End' })).toBeInTheDocument();
    expect(hw).toHaveTextContent(w.homework!.byWeekEnd[0]!);
    expect(screen.getByRole('region', { name: 'Media' })).toHaveTextContent('Course Materials');
    // Week 0 has no live build: no Live Build section and no empty heading for one.
    expect(screen.queryByRole('region', { name: 'Live Build' })).toBeNull();
    expect(screen.getByRole('link', { name: /Next.*Week 1/ })).toHaveAttribute('href', '/learn/week/1');
  });

  it('@parity:K-1 @parity:K-2 @parity:K-7 @parity:K-13 a week in the course: its live build, office hours, rubric and its CSV download', async () => {
    use(liveState());
    at('/learn/week/1');
    await screen.findByRole('heading', { level: 1 });
    const live = screen.getByRole('region', { name: 'Live Build' });
    expect(within(live).getByRole('heading', { level: 3, name: 'Agenda' })).toBeInTheDocument();
    expect(live).toHaveTextContent('Wed, Dec 2 · 12:00 PM MT (1:00 PM CT) · 90 Minutes');
    expect(screen.getByRole('region', { name: 'Office Hours' })).toHaveTextContent('Issue Form');
    expect(screen.getByRole('region', { name: 'Rubric' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Readiness' })).toBeInTheDocument();
    const dl = screen.getByRole('region', { name: 'Downloads' });
    expect(within(dl).getByRole('button', { name: /Download the Use Log/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'How It Works' })).toBeNull();
  });

  it('@parity:K-5 @parity:K-15 a week’s question under its title, its skills tagged with their role and Free, the Library link, and its seat and playbook cards', async () => {
    use(liveState());
    at('/learn/week/1');
    const h1 = await screen.findByRole('heading', { level: 1 });
    const w = (state.course as { payload: { course: { weeks: { question: string; skills: { title: string }[]; seatCard?: { seat: string }; playbookCard?: { play: string } }[] } } }).payload.course.weeks[1]!;
    expect(h1.closest('div')!.parentElement).toHaveTextContent(w.question);
    const kit = screen.getByRole('region', { name: 'Week 1 kit' });
    expect(within(kit).getByText(w.skills[0]!.title).parentElement).toHaveTextContent('Flagship');
    expect(within(kit).getByRole('link', { name: 'Download in Your Skill Library' })).toHaveAttribute('href', '/learn/skills');
    expect(screen.getByRole('region', { name: 'Seat Card' })).toHaveTextContent(w.seatCard!.seat);
    expect(screen.getByRole('region', { name: 'Playbook Card' })).toHaveTextContent(w.playbookCard!.play);
  });

  it('@parity:E-18 @parity:X-2 the week header’s line, and the tab named after the week and then the step', async () => {
    use(liveState());
    const before = document.title;
    const router = at('/learn/week/1');
    await screen.findByRole('heading', { level: 1 });
    const w = (state.course as { payload: { course: { weeks: { title: string }[] }; sessions: { week: number; kind: string; n: number; title: string }[] } }).payload;
    const s1 = w.sessions.find((s) => s.week === 1 && s.kind === 'build')!;
    expect(screen.getByText(`From Session ${s1.n} ·`, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: s1.title })).toHaveAttribute('href', '/learn/schedule');
    expect(screen.getByText(/\d+ Min Build/)).toBeInTheDocument();
    expect(document.title).toBe(`Week 1 · ${w.course.weeks[1]!.title} · Amplified AI Accelerator`);
    fireEvent.click(screen.getAllByRole('link', { name: /^Step 2,/ })[0]!);
    await waitFor(() => expect(document.title).toMatch(new RegExp(`^Step 2 · .+ · Week 1 · ${w.course.weeks[1]!.title} · Amplified AI Accelerator$`)));
    expect(router.state.location.pathname).toBe('/learn/week/1/step/2');
    // Leaving the course's pages gives the tab its own title back.
    act(() => void router.navigate('/learn/schedule'));
    await waitFor(() => expect(document.title).toBe(before));
  });

  it('@parity:SH-7 a visible trail above the week and the step: Home, the week, the step', async () => {
    const router = at('/learn/week/0/step/3');
    await screen.findByRole('heading', { level: 1, name: 'Start Your Time Baseline' });
    const main = document.querySelector('main')!;
    const trail = within(main).getByRole('list', { name: 'Breadcrumb' });
    expect(within(trail).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/learn');
    expect(within(trail).getByRole('link', { name: 'Foundations' })).toHaveAttribute('href', '/learn/week/0');
    expect(trail).toHaveTextContent('Step 3 · Start Your Time Baseline');
    fireEvent.click(within(trail).getByRole('link', { name: 'Foundations' }));
    await screen.findByRole('heading', { level: 1, name: 'Foundations' });
    expect(router.state.location.pathname).toBe('/learn/week/0');
  });
});

describe('the build kit (D-184)', () => {
  it('@parity:E-10 @parity:E-13 the system prompt with View and Copy, its variables, and the instructor notes', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    week0().prompt = '# Role\nYou set up {{TEAM_NAME}}’s AI.';
    at('/learn/week/0');
    const kit = await screen.findByRole('region', { name: 'Build Kit' });
    expect(kit).toHaveTextContent('System Prompt');
    expect(kit).toHaveTextContent('TEAM_NAME');
    fireEvent.click(within(kit).getByRole('button', { name: 'Copy: System Prompt' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('# Role\nYou set up {{TEAM_NAME}}’s AI.'));
    expect(await within(kit).findByText('Copied')).toBeInTheDocument();
    fireEvent.click(within(kit).getByRole('button', { name: 'View: System Prompt' }));
    const dialog = screen.getByRole('dialog', { name: 'System Prompt' });
    expect(dialog).toHaveTextContent('# Role');
    expect(screen.getByRole('region', { name: 'Instructor Notes' })).toHaveTextContent(week0().instructor);
  });

  it('@parity:E-11 @parity:A-9 a module file downloads through the gated files route, and previews', async () => {
    week0().files = [{ name: 'ready-check.skill.yaml', type: 'YAML', size: '1 KB', desc: 'The ready check', steps: ['Check the plan'] }];
    at('/learn/week/0');
    const kit = await screen.findByRole('region', { name: 'Build Kit' });
    expect(within(kit).getByRole('link', { name: 'Download ready-check.skill.yaml' })).toHaveAttribute('href', '/api/files/module/accelerator-week-0/ready-check.skill.yaml');
    fireEvent.click(within(kit).getByRole('button', { name: 'Preview ready-check.skill.yaml' }));
    expect(screen.getByRole('dialog', { name: 'ready-check.skill.yaml' })).toHaveTextContent('name: ready-check');
  });

  it('@parity:E-21 in a staff member’s preview tab a module file says Preview only, and opens nothing', async () => {
    week0().files = [{ name: 'ready-check.skill.yaml', type: 'YAML', size: '1 KB', desc: 'The ready check', steps: [] }];
    state.viewer = { ...state.viewer, preview: 'owner' };
    at('/learn/week/0');
    const kit = await screen.findByRole('region', { name: 'Build Kit' });
    expect(within(kit).queryByRole('link', { name: 'Download ready-check.skill.yaml' })).toBeNull();
    fireEvent.click(within(kit).getByRole('button', { name: 'Download ready-check.skill.yaml' }));
    expect(toast).toHaveBeenCalledWith('Preview only', 'info');
  });

  it('a week whose module has no prompt, files or notes shows no build kit', async () => {
    Object.assign(week0(), { prompt: '', files: [], notes: '' });
    at('/learn/week/0');
    await screen.findByRole('heading', { level: 1, name: 'Foundations' });
    expect(screen.queryByRole('region', { name: 'Build Kit' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Instructor Notes' })).toBeNull();
  });

  it('@parity:E-10 the step player shows the week’s prompt in its kit', async () => {
    week0().prompt = 'You set up the AI.';
    at('/learn/week/0/step/4');
    await screen.findByRole('heading', { level: 1, name: 'Get Your AI Ready' });
    expect(within(screen.getByRole('complementary', { name: 'This step’s kit' })).getByRole('region', { name: 'Build Kit' })).toHaveTextContent('System Prompt');
  });
});

describe('the sidebar (D-184)', () => {
  it('@parity:T-1 Team Hub for a Team tier learner on a team, linking today’s page', async () => {
    const st = prelaunchState();
    st.db.teams.push({ id: 't1', name: 'Ross Team', ownerId: LEARNER_ID, seats: 5 });
    st.db.users.find((u) => u.id === LEARNER_ID)!.teamId = 't1';
    use(st);
    at('/learn');
    await screen.findByRole('heading', { level: 1 });
    expect(within(aside()).getByRole('link', { name: 'Team Hub' })).toHaveAttribute('href', '/team');
  });

  it('@parity:T-1 no Team Hub for an Agent tier learner', async () => {
    const st = prelaunchState();
    Object.assign(st.db.users.find((u) => u.id === LEARNER_ID)!, { tier: 'agent', role: 'Agent' });
    use(st);
    at('/learn');
    await screen.findByRole('heading', { level: 1 });
    expect(within(aside()).queryByRole('link', { name: 'Team Hub' })).toBeNull();
  });

  it('@parity:SH-9 the cohort line under the wordmark', async () => {
    at('/learn');
    await screen.findByRole('heading', { level: 1 });
    const cohort = state.db.cohorts[0]!;
    expect(aside()).toHaveTextContent(`${cohort.name} Cohort · Starts Dec 2`);
  });
});
