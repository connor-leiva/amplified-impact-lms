import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { phaseNow, seed } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../data/repository';

// D-150: a learner with no cohort portal (an access group's member, an Agent Plan buyer) who opens
// `/` goes to the Skill Library without the shell drawing the empty cohort dashboard first, not even
// for a frame. The shell is rendered for real; only the data hooks are stood in for.

const state: { db: Db; viewer: Viewer } = {
  db: seed('live'),
  viewer: { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' },
};

vi.mock('../data/hooks', () => ({
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => phaseNow('live'),
  useMutate: () => async () => ({}),
}));

const { default: AppShell } = await import('./AppShell');

let dashboardRenders = 0;
function Dashboard() {
  dashboardRenders += 1;
  return <p>the cohort dashboard</p>;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'vault', element: <p>the vault</p> },
          { path: 'sessions', element: <p>the sessions</p> },
        ],
      },
      { path: '/skill-library', element: <p>the skill library</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  dashboardRenders = 0;
  delete document.body.dataset.appReady;
  state.db = seed('live');
  state.viewer = { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' };
});
afterEach(() => {
  delete document.body.dataset.appReady;
});

describe('the shell, for a learner with no cohort portal (D-119, D-150)', () => {
  beforeEach(() => {
    // The scoped snapshot of a plan that opens no AI Employee: no modules at all.
    state.db = { ...seed('live'), modules: [] };
  });

  it('goes from `/` to the Skill Library without ever drawing the dashboard or the sidebar', async () => {
    const router = renderAt('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/skill-library'));
    expect(screen.getByText('the skill library')).toBeInTheDocument();
    expect(dashboardRenders).toBe(0);
    expect(document.querySelector('aside[aria-label="Primary"]')).toBeNull();
    expect(router.state.historyAction).toBe('REPLACE');
    // The shell never marks the page ready on its way through; the Skill Library marks itself.
    expect(document.body.dataset.appReady).toBeUndefined();
  });

  it('does the same from any other cohort screen', async () => {
    const router = renderAt('/sessions');
    await waitFor(() => expect(router.state.location.pathname).toBe('/skill-library'));
    expect(screen.queryByText('the sessions')).toBeNull();
  });

  it('keeps the Resource Vault, a screen they keep', async () => {
    const router = renderAt('/vault');
    expect(await screen.findByText('the vault')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/vault');
  });
});

describe('the shell, for a learner with a portal', () => {
  it('draws the dashboard at `/`, as before', async () => {
    const router = renderAt('/');
    expect(await screen.findByText('the cohort dashboard')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(dashboardRenders).toBeGreaterThan(0);
    expect(document.querySelector('aside[aria-label="Primary"]')).not.toBeNull();
  });
});
