import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { phaseNow, seed } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../../data/repository';
import { PREFS_KEY } from '../../lib/prefs';

// D-160 R2-1b: the admin AppShell of the R2 redesign, rendered for real; only the data hooks are
// stood in for. The landmarks, the groups (D-239: six rows, one open), the rail, the phone drawer, the
// breadcrumb, the badges, and the old screens' type kept for them. The travel itself needs a real browser:
// compliance/tests/e2e/admin-sidebar.spec.ts.

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
/** D-239: the six group rows, in order (a shut group's name is followed by its roll-up, if it has one). */
const groupHeads = (scope: HTMLElement = aside()) =>
  Array.from(scope.querySelectorAll<HTMLButtonElement>('nav[aria-label="Admin"] > div > button[aria-expanded]'));
const openGroups = (scope: HTMLElement = aside()) =>
  groupHeads(scope)
    .filter((b) => b.getAttribute('aria-expanded') === 'true')
    .map((b) => b.textContent);
/** A page's row in the full sidebar, open or shut. */
const pageRow = (label: string) =>
  Array.from(aside().querySelectorAll<HTMLButtonElement>('nav[aria-label="Admin"] button:not([aria-expanded])')).find(
    (b) => b.firstElementChild?.textContent === label,
  )!;

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

  it('shows the six groups in NAV order, the page’s group alone open, and the snapshot’s counts (D-239)', async () => {
    renderAt('/admin');
    await screen.findByText('the overview');
    expect(groupHeads().map((b) => b.textContent!.match(/^[A-Z][a-z]+/)![0])).toEqual([
      'Health',
      'Build',
      'Support',
      'Revenue',
      'Operations',
      'Access',
    ]);
    expect(openGroups()).toEqual(['Health']);
    expect(pageRow('Overview')).toHaveAttribute('aria-current', 'page');
    // A shut group's roll-up is its first count; a page's row carries its own.
    const drafts = state.db.modules.filter((m) => m.status === 'draft').length;
    expect(groupHead('Build')).toHaveTextContent(drafts ? `Build${drafts} draft` : 'Build');
    expect(pageRow('Curriculum')).toHaveTextContent(drafts ? `Curriculum${drafts} draft` : 'Curriculum');
    // D-169: System Health is built, so production's sidebar lists it under Health.
    expect(pageRow('System Health')).toBeInTheDocument();
    expect(document.querySelector('nav[aria-label="Breadcrumb"]')!.textContent).toBe('Admin/Health/Overview');
  });

  it('on a page that is on no row (the 404), every group is shut and the crumbs say `Admin`', async () => {
    renderAt('/admin/no-such-page');
    await screen.findByText('the 404');
    expect(groupHeads()).toHaveLength(6);
    expect(openGroups()).toEqual([]);
    expect(document.querySelector('nav[aria-label="Breadcrumb"]')!.textContent).toBe('Admin');
  });

  it('opens one group at a time: a click opens it and shuts the rest, a second shuts it, a new page resets it', async () => {
    const old = { st1: { Operations: false, Build: true } };
    localStorage.setItem(PREFS_KEY, JSON.stringify({ navGroups: old }));
    const router = renderAt('/admin');
    await screen.findByText('the overview');
    // The old stored groups are not read: Build stays shut.
    expect(openGroups()).toEqual(['Health']);

    fireEvent.click(groupHead('Support'));
    expect(openGroups()).toEqual(['Support']);
    expect(router.state.location.pathname).toBe('/admin');
    // Health still holds the page: shut, it is the one marked (`data-has`, the tint).
    expect(groupHead('Health')).toHaveAttribute('data-has', 'true');
    expect(groupHead('Health')).not.toHaveAttribute('data-open');
    expect(pageRow('Overview')).toHaveAttribute('aria-current', 'page');
    // A shut group's pages are out of the keyboard's way; the open group's are in it.
    expect(pageRow('Learners & Teams')).toHaveAttribute('tabindex', '0');
    expect(pageRow('Overview')).toHaveAttribute('tabindex', '-1');
    expect(pageRow('Curriculum')).toHaveAttribute('tabindex', '-1');

    fireEvent.click(groupHead('Support'));
    expect(openGroups()).toEqual([]);

    fireEvent.click(groupHead('Operations'));
    expect(openGroups()).toEqual(['Operations']);
    fireEvent.click(pageRow('Audit Log'));
    await screen.findByText('the audit log');
    expect(openGroups()).toEqual(['Operations']);
    await act(async () => {
      await router.navigate('/admin');
    });
    await screen.findByText('the overview');
    expect(openGroups()).toEqual(['Health']);
    // ... and the old map is left where it was, unread and unwritten.
    expect(JSON.parse(localStorage.getItem(PREFS_KEY)!).navGroups).toEqual(old);
  });

  it('shuts the page’s own group on a click; its row stays current, and the crumbs name group and page', async () => {
    renderAt('/admin/audit');
    await screen.findByText('the audit log');
    expect(openGroups()).toEqual(['Operations']);
    expect(groupHead('Operations')).toHaveAttribute('aria-expanded', 'true');
    expect(pageRow('Audit Log')).toHaveAttribute('aria-current', 'page');
    fireEvent.click(groupHead('Operations'));
    expect(groupHead('Operations')).toHaveAttribute('aria-expanded', 'false');
    expect(groupHead('Operations')).toHaveAttribute('data-has', 'true');
    expect(pageRow('Audit Log')).toHaveAttribute('aria-current', 'page');
    expect(pageRow('Audit Log')).toHaveAttribute('tabindex', '-1');
    expect(document.querySelector('nav[aria-label="Breadcrumb"]')!.textContent).toBe('Admin/Operations/Audit Log');
  });

  it('draws the academy lockup at 161×34 and the program’s own tile in the switcher (D-239)', async () => {
    renderAt('/admin');
    await screen.findByText('the overview');
    const logo = aside().querySelector<HTMLElement>('[data-brand-slot="lockup"]')!;
    const img = logo.querySelector('img')!;
    expect(img).toHaveAttribute('alt', 'Amplified Impact Academy');
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['161', '34']);
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
    const tile = within(aside()).getByRole('button', { name: /^Switch cohort/ }).querySelector('img')!;
    expect(tile).toHaveAttribute('alt', '');
    expect([tile.getAttribute('width'), tile.getAttribute('height')]).toEqual(['32', '32']);
    expect(decodeURIComponent(tile.getAttribute('src')!)).toContain('<svg');
  });

  it('is a 64px rail with one flyout per group from 768 to 1199px, and expands on request', async () => {
    setWidth(1024);
    const router = renderAt('/admin/no-such-page');
    await screen.findByText('the 404');
    expect(aside()).toHaveAttribute('data-mode', 'rail');
    expect(aside()).toHaveAttribute('data-narrow', 'true');
    expect(within(aside()).getAllByRole('button', { name: / menu$/ }).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Health menu',
      'Build menu',
      'Support menu',
      'Revenue menu',
      'Operations menu',
      'Access menu',
    ]);
    // The same lockup, seen through the 26px window (`data-short`), never a second image.
    expect(aside().querySelector('[data-brand-slot="mark"]')).toHaveAttribute('data-short', 'true');
    expect(aside().querySelector('[data-brand-slot="mark"] img')).toHaveAttribute('width', '161');
    const ops = within(aside()).getByRole('button', { name: 'Operations menu' });
    fireEvent.click(ops);
    const menu = await screen.findByRole('menu', { name: 'Operations' });
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Audit Log' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/audit'));
    expect(aside()).toHaveAttribute('data-mode', 'rail');
    fireEvent.click(within(aside()).getByRole('button', { name: 'Expand sidebar' }));
    await waitFor(() => expect(aside()).toHaveAttribute('data-mode', 'full'));
    expect(aside()).not.toHaveAttribute('data-narrow');
    expect(openGroups()).toEqual(['Operations']);
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
    const rows = drawer.querySelector<HTMLElement>('aside[aria-label="Primary"]')!;
    expect(groupHeads(rows)).toHaveLength(6);
    expect(openGroups(rows)).toEqual([]);
    expect(rows).toHaveAttribute('data-mode', 'drawer');
    expect(rows).not.toHaveAttribute('data-narrow');
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    await waitFor(() => expect(drawer).toHaveAttribute('hidden'));
  });

  it('renders the ⌘K trigger and the environment; the trigger and ⌘K open the palette, Escape closes it (R2-1c)', async () => {
    const router = renderAt('/admin/no-such-page');
    await screen.findByText('the 404');
    const trigger = screen.getByRole('button', { name: /Search or jump to…/ });
    expect(trigger).not.toHaveAttribute('aria-disabled');
    fireEvent.click(trigger);
    const palette = await screen.findByRole('dialog', { name: 'Command palette' });
    expect(within(palette).getByRole('combobox', { name: 'Command palette search' })).toHaveFocus();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Command palette' })).toBeNull());
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });
    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/no-such-page');
    expect(screen.getByText('Production')).toBeInTheDocument();
  });

  it('draws every admin screen in R2: no legacy type or geometry is left (D-160 R2-3b)', async () => {
    const router = renderAt('/admin');
    await screen.findByText('the overview');
    for (const path of ['/admin/audit', '/admin/roles', '/admin/no-such-page']) {
      await act(async () => {
        await router.navigate(path);
      });
      expect(document.querySelector('main')).not.toHaveAttribute('data-legacy');
      expect(document.querySelector('[data-r2-shell]')).not.toHaveAttribute('data-legacy-geometry');
    }
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
