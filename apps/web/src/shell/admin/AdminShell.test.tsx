import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { phaseNow, seed } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../../data/repository';
import { PREFS_KEY, loadNavGroups } from '../../lib/prefs';

// D-160 R2-1b: the admin AppShell of the R2 redesign, rendered for real; only the data hooks are
// stood in for. The landmarks, the groups and their memory, the rail, the phone drawer, the
// breadcrumb, the badges, and the old screens' type kept for them.

const state: { db: Db; viewer: Viewer } = {
  db: seed('live'),
  viewer: { actor: { kind: 'staff', staffId: 'st1' }, role: 'admin' },
};

vi.mock('../../data/hooks', () => ({
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => phaseNow('live'),
  useMutate: () => async () => ({}),
}));

const { default: AppShell } = await import('../AppShell');

function setWidth(w: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
  window.dispatchEvent(new Event('resize'));
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { path: 'admin', element: <p>the overview</p> },
          { path: 'admin/audit', element: <p>the audit log</p> },
          { path: 'admin/*', element: <p>the 404</p> },
          { path: 'sessions', element: <p>the sessions</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const aside = () => document.querySelector<HTMLElement>('aside[aria-label="Primary"]')!;
const groupHead = (name: string) => within(aside()).getByRole('button', { name: new RegExp(`^${name}`) });

beforeEach(() => {
  localStorage.clear();
  state.db = seed('live');
  state.viewer = { actor: { kind: 'staff', staffId: 'st1' }, role: 'admin' };
  setWidth(1280);
  delete document.body.dataset.appReady;
});
afterEach(() => {
  delete document.body.dataset.appReady;
});

describe('the R2 admin shell (D-160 R2-1b)', () => {
  it('draws every required landmark, scoped as R2, and marks the app ready', async () => {
    renderAt('/admin/no-such-page');
    expect(await screen.findByText('the 404')).toBeInTheDocument();
    expect(document.querySelector('[data-r2-shell]')).not.toBeNull();
    expect(aside()).not.toBeNull();
    expect(document.querySelector('header nav[aria-label="Breadcrumb"]')).not.toBeNull();
    expect(document.querySelectorAll('main')).toHaveLength(1);
    expect(document.querySelector('[data-brand-slot]')).not.toBeNull();
    await waitFor(() => expect(document.body.dataset.appReady).toBe('true'));
  });

  it('sends staff to /admin from a portal address', async () => {
    const router = renderAt('/sessions');
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
  });

  it('shows the built screens in NAV order, Health and Build open, and the snapshot’s badges', async () => {
    renderAt('/admin/no-such-page');
    await screen.findByText('the 404');
    const heads = within(aside())
      .getAllByRole('button', { expanded: true })
      .concat(within(aside()).getAllByRole('button', { expanded: false }));
    expect(heads.map((b) => b.textContent)).toEqual(
      expect.arrayContaining(['Health', 'Build', 'Support', 'Revenue', 'Operations', 'Access']),
    );
    expect(groupHead('Health')).toHaveAttribute('aria-expanded', 'true');
    expect(groupHead('Build')).toHaveAttribute('aria-expanded', 'true');
    expect(groupHead('Operations')).toHaveAttribute('aria-expanded', 'false');
    const drafts = state.db.modules.filter((m) => m.status === 'draft').length;
    expect(within(aside()).getByRole('button', { name: /Curriculum/ })).toHaveTextContent(
      drafts ? `Curriculum${drafts} draft` : 'Curriculum',
    );
    // Not built yet, so not in production's sidebar.
    expect(within(aside()).queryByRole('button', { name: /System Health/ })).toBeNull();
    // The 404 is on no row: the breadcrumb is `Admin` alone.
    expect(document.querySelector('nav[aria-label="Breadcrumb"]')!.textContent).toBe('Admin');
  });

  it('remembers a group the viewer opens or closes, per staff member', async () => {
    renderAt('/admin/no-such-page');
    await screen.findByText('the 404');
    fireEvent.click(groupHead('Support'));
    await waitFor(() => expect(groupHead('Support')).toHaveAttribute('aria-expanded', 'true'));
    expect(within(aside()).getByRole('button', { name: 'Learners & Teams' })).toBeInTheDocument();
    fireEvent.click(groupHead('Build'));
    await waitFor(() => expect(groupHead('Build')).toHaveAttribute('aria-expanded', 'false'));
    expect(loadNavGroups('st1')).toEqual({ Support: true, Build: false });
    expect(JSON.parse(localStorage.getItem(PREFS_KEY)!).navGroups.st1).toEqual({ Support: true, Build: false });
  });

  it('keeps the active page’s group open, and the breadcrumb names group and page', async () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ navGroups: { st1: { Operations: false } } }));
    renderAt('/admin/audit');
    await screen.findByText('the audit log');
    expect(groupHead('Operations')).toHaveAttribute('aria-expanded', 'true');
    const row = within(aside()).getByRole('button', { name: 'Audit Log' });
    expect(row).toHaveAttribute('aria-current', 'page');
    fireEvent.click(groupHead('Operations'));
    expect(groupHead('Operations')).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('nav[aria-label="Breadcrumb"]')!.textContent).toBe('Admin/Operations/Audit Log');
  });

  it('is a 64px rail with one flyout per group from 768 to 1199px, and expands on request', async () => {
    setWidth(1024);
    const router = renderAt('/admin/no-such-page');
    await screen.findByText('the 404');
    expect(aside()).toHaveAttribute('data-mode', 'rail');
    const ops = within(aside()).getByRole('button', { name: 'Operations menu' });
    fireEvent.click(ops);
    const menu = await screen.findByRole('menu', { name: 'Operations' });
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Audit Log' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/audit'));
    expect(aside()).toHaveAttribute('data-mode', 'rail');
    fireEvent.click(within(aside()).getByRole('button', { name: 'Expand sidebar' }));
    await waitFor(() => expect(aside()).toHaveAttribute('data-mode', 'full'));
  });

  it('on a phone: a bar with Open menu, and a drawer that opens as a dialog and closes on Escape', async () => {
    setWidth(390);
    renderAt('/admin/no-such-page');
    await screen.findByText('the 404');
    const drawer = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Admin menu"]')!;
    expect(drawer).toHaveAttribute('hidden');
    expect(drawer.querySelector('aside[aria-label="Primary"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await waitFor(() => expect(drawer).toHaveAttribute('data-drawer', 'open'));
    expect(drawer).not.toHaveAttribute('hidden');
    expect(within(drawer).queryByRole('button', { name: /Collapse sidebar/ })).toBeNull();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    await waitFor(() => expect(drawer).toHaveAttribute('hidden'));
  });

  it('renders the ⌘K trigger and the environment, and the trigger does nothing until R2-5', async () => {
    const router = renderAt('/admin/no-such-page');
    await screen.findByText('the 404');
    const trigger = screen.getByRole('button', { name: /Search or jump to…/ });
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(router.state.location.pathname).toBe('/admin/no-such-page');
    expect(screen.getByText('Production')).toBeInTheDocument();
  });

  it('keeps an old screen’s type; R2 everywhere else, at R2’s geometry (D-160 R2-3a)', async () => {
    const router = renderAt('/admin');
    await screen.findByText('the overview');
    expect(document.querySelector('main')).not.toHaveAttribute('data-legacy');
    expect(document.querySelector('[data-r2-shell]')).not.toHaveAttribute('data-legacy-geometry');
    await act(async () => {
      await router.navigate('/admin/audit');
    });
    await screen.findByText('the audit log');
    expect(document.querySelector('main')).toHaveAttribute('data-legacy', 'true');
  });

  it('starts every screen on the rail at 1024, the Overview included', async () => {
    setWidth(1024);
    const router = renderAt('/admin');
    await screen.findByText('the overview');
    expect(aside()).toHaveAttribute('data-mode', 'rail');
    await act(async () => {
      await router.navigate('/admin/no-such-page');
    });
    await screen.findByText('the 404');
    expect(aside()).toHaveAttribute('data-mode', 'rail');
  });

  it('leaves the learner shell to learners', async () => {
    state.viewer = { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' };
    renderAt('/sessions');
    expect(await screen.findByText('the sessions')).toBeInTheDocument();
    expect(document.querySelector('[data-r2-shell]')).toBeNull();
  });
});
