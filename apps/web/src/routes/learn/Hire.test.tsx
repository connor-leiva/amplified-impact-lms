import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { seed, setViewerZone } from '@ai/core';
import type { Db, Progress } from '@ai/core';
import { acceleratorModuleId } from '@ai/core/accelerator';
import type { Viewer } from '../../data/repository';
import type { CourseLoad } from './data';
import type * as DataModule from './data';
import { learnerRoutes } from './routes';
import { LEARNER_ID, liveState } from './test/fixture';
import type { LearnState } from './test/fixture';

// D-186: the hire's page in the learner portal v2, rendered through its own routes and shell: the Your
// Deployment card and its Run dialog on an open week's page (E-14, E-15, A-6), the non-course AI Employee's
// page (E-22), and a Notion file in the kit (E-11). Only the data hooks and `GET /api/course` are stood in for.

const state: { db: Db; viewer: Viewer; now: number; course: CourseLoad } = {
  db: liveState().db,
  viewer: { actor: { kind: 'learner', userId: LEARNER_ID }, role: 'learner' },
  now: liveState().now,
  course: { kind: 'ready', payload: liveState().payload },
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

const WEEK1 = acceleratorModuleId(1);
const demo = seed('live');

function use(st: LearnState) {
  state.db = st.db;
  state.viewer = st.viewer;
  state.now = st.now;
  state.course = { kind: 'ready', payload: st.payload };
}

/** The live state, Week 1's progress set to `p`, and the demo's non-course AI Employees in the snapshot. */
function world(p: Partial<Progress> | null = null): LearnState {
  const st = liveState();
  const me = st.db.users.find((u) => u.id === LEARNER_ID)!;
  if (p) {
    const m = st.db.modules.find((x) => x.id === WEEK1)!;
    me.progress[WEEK1] = { steps: m.checklist.map((s) => s.id), builtAt: st.now - 3_600_000, deployedAt: null, runtime: null, ...p };
  }
  st.db.modules.push(...structuredClone(demo.modules));
  st.db.sessions.push(...structuredClone(demo.sessions).map((s) => ({ ...s, id: `demo-${s.id}`, cohortId: 'demo' })));
  return st;
}

function at(path: string) {
  const router = createMemoryRouter([...learnerRoutes(true), { path: '/', element: <p>the portal</p> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const card = () => screen.getByRole('region', { name: 'Your Deployment' });

beforeEach(() => {
  setViewerZone('America/Denver');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
  use(world());
  mutate.mockClear();
});
afterEach(() => setViewerZone(null));

describe('the Your Deployment card on an open week’s page (D-186)', () => {
  it('not built yet: Not Deployed with its icon, and Mark as Deployed off @parity:E-14', async () => {
    at('/learn/week/1');
    await screen.findByRole('heading', { level: 1 });
    expect(within(card()).getByText('Not Deployed')).toBeInTheDocument();
    const btn = within(card()).getByRole('button', { name: 'Mark as Deployed' });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(btn);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('built: Mark as Deployed runs `markDeployed` @parity:E-14 @parity:A-6', async () => {
    use(world({}));
    at('/learn/week/1');
    await screen.findByRole('heading', { level: 1 });
    fireEvent.click(within(card()).getByRole('button', { name: 'Mark as Deployed' }));
    expect(mutate).toHaveBeenCalledWith('markDeployed', { moduleId: WEEK1 });
  });

  it('deployed: Pause runs `setRuntime` paused; the last output shows @parity:E-14 @parity:A-6', async () => {
    use(world({ deployedAt: liveState().now - 1_800_000, runtime: 'deployed', lastRun: { at: liveState().now - 600_000, title: 'Spend map · Q4', preview: 'Three lines over budget.' } }));
    at('/learn/week/1');
    await screen.findByRole('heading', { level: 1 });
    expect(within(card()).getByText('Deployed')).toBeInTheDocument();
    expect(within(card()).getByText('Spend map · Q4')).toBeInTheDocument();
    fireEvent.click(within(card()).getByRole('button', { name: 'Pause' }));
    expect(mutate).toHaveBeenCalledWith('setRuntime', { moduleId: WEEK1, runtime: 'paused' });
  });

  it('paused: Resume runs `setRuntime` deployed; needing attention: the issue and Reconnect @parity:E-14 @parity:A-6', async () => {
    use(world({ deployedAt: liveState().now - 1_800_000, runtime: 'paused' }));
    const { unmount } = render(<RouterProvider router={createMemoryRouter(learnerRoutes(true), { initialEntries: ['/learn/week/1'] })} />);
    await screen.findByRole('heading', { level: 1 });
    expect(within(card()).getByText('Paused')).toBeInTheDocument();
    fireEvent.click(within(card()).getByRole('button', { name: 'Resume' }));
    expect(mutate).toHaveBeenLastCalledWith('setRuntime', { moduleId: WEEK1, runtime: 'deployed' });
    unmount();

    use(world({ deployedAt: liveState().now - 1_800_000, runtime: 'needs_attention', issue: 'The sheet moved.' }));
    at('/learn/week/1');
    await screen.findByRole('heading', { level: 1 });
    expect(within(card()).getByText('Needs Attention')).toBeInTheDocument();
    expect(within(card()).getByText('The sheet moved.')).toBeInTheDocument();
    fireEvent.click(within(card()).getByRole('button', { name: 'Reconnect' }));
    expect(mutate).toHaveBeenLastCalledWith('setRuntime', { moduleId: WEEK1, runtime: 'deployed' });
  });

  it('the Run dialog: a real dialog with the input, Run, the output and Copy All; it records the run @parity:E-15 @parity:A-6', async () => {
    use(world({ deployedAt: liveState().now - 1_800_000, runtime: 'deployed' }));
    at('/learn/week/1');
    await screen.findByRole('heading', { level: 1 });
    const run = within(card()).getAllByRole('button').find((b) => !['Pause', 'Open'].includes(b.textContent ?? ''))!;
    fireEvent.click(run);
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByRole('textbox');
    fireEvent.change(input, { target: { value: 'October card statement' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run' }));
    expect(await within(dialog).findByText(/AI Employee Is Working…$/)).toBeInTheDocument();
    await waitFor(() => expect(mutate).toHaveBeenCalledWith('recordRun', expect.objectContaining({ moduleId: WEEK1 })), { timeout: 3000 });
    const call = mutate.mock.calls.find((c) => (c as unknown[])[0] === 'recordRun') as unknown as [string, { title: string }];
    expect(call[1].title).toMatch(/· October card statement$/);
    expect(within(dialog).getByRole('button', { name: 'Run Again' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Copy All' })).toBeInTheDocument();
  });
});

describe('a non-course AI Employee’s page (D-186, E-22)', () => {
  it('is listed in the sidebar’s AI employees group and on Home, and links its page @parity:E-22', async () => {
    at('/learn');
    await screen.findByRole('heading', { level: 1 });
    const aside = document.querySelector<HTMLElement>('aside[aria-label="Primary"]')!;
    expect(within(aside).getByRole('link', { name: /^Marketing/ })).toHaveAttribute('href', '/learn/employees/marketing');
    const home = screen.getByRole('region', { name: 'Your AI employees' });
    expect(within(home).getByRole('link', { name: /^Marketing AI Employee/ })).toHaveAttribute('href', '/learn/employees/marketing');
  });

  it('draws its steps, kit and deployment card; Mark step done runs `toggleStep` @parity:E-22 @parity:E-16', async () => {
    at('/learn/employees/marketing');
    expect(await screen.findByRole('heading', { level: 1, name: 'Marketing AI Employee' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your Deployment' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Build Kit' })).toBeInTheDocument();
    const steps = screen.getByRole('region', { name: 'Six steps' });
    fireEvent.click(within(steps).getAllByRole('button', { name: 'Mark step done' })[0]!);
    expect(mutate).toHaveBeenCalledWith('toggleStep', { moduleId: 'marketing', stepId: 'c1' });
  });

  it('a Notion file previews and has no Download and no link @parity:E-11', async () => {
    at('/learn/employees/marketing');
    await screen.findByRole('heading', { level: 1, name: 'Marketing AI Employee' });
    const kit = screen.getByRole('region', { name: 'Build Kit' });
    const notion = demo.modules.find((m) => m.id === 'marketing')!.files.find((f) => f.type === 'Notion')!;
    expect(within(kit).getByRole('button', { name: `Preview ${notion.name}` })).toBeInTheDocument();
    expect(within(kit).queryByRole('link', { name: `Download ${notion.name}` })).toBeNull();
    expect(within(kit).queryByRole('link', { name: /Notion/ })).toBeNull();
    fireEvent.click(within(kit).getByRole('button', { name: `Preview ${notion.name}` }));
    expect(await screen.findByRole('dialog', { name: notion.name })).toBeInTheDocument();
  });

  it('an unknown AI Employee goes Home', async () => {
    const router = at('/learn/employees/nope');
    await screen.findByRole('heading', { level: 1 });
    expect(router.state.location.pathname).toBe('/learn');
  });
});
