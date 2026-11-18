import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { phaseNow, seed } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../data/repository';

// D-182: the first learner portal's shell is gone. A learner who opens any address under `/` (the
// dashboard, Sessions, an AI Employee, the Team Hub, the vault, Team Tier, or anything else it caught)
// goes to the learner portal's page for it, without this shell drawing anything on the way, and keeps
// the address's query. Staff still get the Admin Console. The shell is rendered for real; only the data
// hooks are stood in for.

const JAMIE: Viewer = { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' };
const state: { db: Db; viewer: Viewer } = { db: seed('live'), viewer: JAMIE };

vi.mock('../data/hooks', () => ({
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => phaseNow('live'),
  useMutate: () => async () => ({}),
}));

const { default: AppShell } = await import('./AppShell');

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { path: 'admin', element: <p>the admin overview</p> },
          { path: '*', element: <p>anything else</p> },
        ],
      },
      { path: '/learn/*', element: <p>the learner portal</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const where = (router: ReturnType<typeof renderAt>) => `${router.state.location.pathname}${router.state.location.search}`;

beforeEach(() => {
  delete document.body.dataset.appReady;
  state.db = seed('live');
  state.viewer = JAMIE;
});
afterEach(() => {
  delete document.body.dataset.appReady;
});

describe('a learner at an address of the first portal (D-182)', () => {
  it('goes from `/` to /learn, by replacing the address, with nothing of the old shell drawn', async () => {
    const router = renderAt('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/learn'));
    expect(screen.getByText('the learner portal')).toBeInTheDocument();
    expect(router.state.historyAction).toBe('REPLACE');
    expect(document.querySelector('aside[aria-label="Primary"]')).toBeNull();
    expect(document.body.dataset.appReady).toBeUndefined();
  });

  it.each([
    ['/sessions', '/learn/schedule'],
    ['/team', '/learn/team'],
    ['/vault?tab=executive', '/learn/vault?tab=executive'],
    ['/team-tier', '/learn'],
    ['/employees/marketing', '/learn'],
    ['/admin', '/learn'],
    ['/admin/curriculum', '/learn'],
    ['/anything/else', '/learn'],
  ])('%s goes to %s', async (from, to) => {
    const router = renderAt(from);
    await waitFor(() => expect(where(router)).toBe(to));
    expect(screen.queryByText('the admin overview')).toBeNull();
  });

  it('an AI Employee that is a course week goes to its week, its query kept (a preview tab’s, D-138)', async () => {
    const router = renderAt('/employees/accelerator-week-3?preview=agent');
    await waitFor(() => expect(where(router)).toBe('/learn/week/3?preview=agent'));
  });
});

describe('staff (unchanged)', () => {
  it('get the Admin Console', async () => {
    state.viewer = { actor: { kind: 'staff', staffId: 'st1' }, role: 'admin' };
    const router = renderAt('/admin');
    expect(await screen.findByText('the admin overview')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin');
    expect(screen.queryByText('the learner portal')).toBeNull();
  });
});
