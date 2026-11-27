import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { phaseNow, seed } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../../data/repository';
import { PREFS_KEY } from '../../lib/prefs';

// D-160 R2-1b: the admin AppShell of the R2 redesign, rendered for real; only the data hooks are
// stood in for. The landmarks, the rows (D-239: one group open; D-253: five single rows, a hairline, then
// Operations and Access), the rail, the phone drawer, the breadcrumb, the roll-ups, the cohort switcher, the
// four pages' tabs, every old address, and the old screens' type kept for them. The travel itself needs a real
// browser: compliance/tests/e2e/admin-sidebar.spec.ts.

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
const { Component: CohortArea } = await import('../../routes/admin/areas/CohortArea');
const { Component: ProgramArea } = await import('../../routes/admin/areas/ProgramArea');
const { Component: PeopleArea } = await import('../../routes/admin/areas/PeopleArea');
const { Component: RevenueArea } = await import('../../routes/admin/areas/RevenueArea');
const { Component: CohortHome } = await import('../../routes/admin/areas/CohortHome');
const { Component: Moved } = await import('../../routes/admin/areas/Moved');
const { PageHead, Tabs } = await import('../../components/r2/kit');

/** A tab's page, as today's pages draw themselves: a head with a title, a description and an action, and tabs. */
function TabPage({ name }: { name: string }) {
  return (
    <div>
      <PageHead title={name} description={`${name}'s own words.`} right={<button type="button">{`${name} action`}</button>} />
      <Tabs label="Section" phone={false} value="a" onChange={() => {}} tabs={[{ id: 'a', label: 'First', count: 3 }, { id: 'b', label: 'Second' }]} />
      <p>{`the ${name.toLowerCase()} page`}</p>
    </div>
  );
}

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
          {
            path: 'admin/program',
            Component: ProgramArea,
            children: [
              { index: true, element: <TabPage name="Curriculum" /> },
              { path: 'course', element: <TabPage name="Course settings" /> },
              { path: 'vault', element: <TabPage name="Vault" /> },
            ],
          },
          { path: 'admin/cohort', Component: CohortHome },
          {
            path: 'admin/cohort/:cohortId',
            Component: CohortArea,
            children: [
              { index: true, element: <TabPage name="Schedule" /> },
              { path: 'schedule', element: <TabPage name="Schedule" /> },
              { path: 'people', element: <TabPage name="Learners" /> },
              { path: 'community', element: <TabPage name="Community" /> },
              { path: 'announcements', element: <TabPage name="Announcements" /> },
            ],
          },
          {
            path: 'admin/people',
            Component: PeopleArea,
            children: [
              { index: true, element: <TabPage name="Users" /> },
              { path: 'teams', element: <TabPage name="Workspaces" /> },
              { path: 'masquerade', element: <TabPage name="Masquerade" /> },
            ],
          },
          {
            path: 'admin/revenue',
            Component: RevenueArea,
            children: [
              { index: true, element: <TabPage name="Summary" /> },
              { path: 'payments', element: <TabPage name="Payments" /> },
              { path: 'payments/:tab', element: <TabPage name="Payments" /> },
              { path: 'plans', element: <TabPage name="Tiers" /> },
              { path: 'usage', element: <TabPage name="Usage" /> },
            ],
          },
          ...['admin/curriculum', 'admin/curriculum/:id', 'admin/cohorts', 'admin/learners', 'admin/workspaces/:id', 'admin/billing/:tab', 'admin/build'].map(
            (path) => ({ path, Component: Moved }),
          ),
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
/** D-239: the groups that open, in order (a shut group's name is followed by its roll-up, if it has one). */
const groupHeads = (scope: HTMLElement = aside()) =>
  Array.from(scope.querySelectorAll<HTMLButtonElement>('nav[aria-label="Admin"] > div > button[aria-expanded]'));
/** D-253: the single rows (Overview, Program, Cohort, People, Revenue), each a button that opens its page. */
const soloRows = (scope: HTMLElement = aside()) => Array.from(scope.querySelectorAll<HTMLButtonElement>('nav[aria-label="Admin"] > button'));
const crumbs = () => document.querySelector('nav[aria-label="Breadcrumb"]')!.textContent;
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

  it('shows the five single rows, a hairline, then Operations and Access; the page’s row current (D-253)', async () => {
    renderAt('/admin');
    await screen.findByText('the overview');
    const drafts = state.db.modules.filter((m) => m.status === 'draft').length;
    expect(soloRows().map((b) => b.textContent)).toEqual(['Overview', drafts ? `Program${drafts} draft` : 'Program', 'Cohort', 'People', 'Revenue']);
    expect(soloRows()[0]).toHaveAttribute('aria-current', 'page');
    expect(soloRows()[0]).toHaveAttribute('data-has', 'true');
    expect(groupHeads().map((b) => b.textContent!.match(/^[A-Z][a-z]+/)![0])).toEqual(['Operations', 'Access']);
    // The hairline (the mockup's `gsep`) wraps the first group that opens.
    expect(groupHeads()[0]!.parentElement!.className).toMatch(/sep/);
    expect(groupHeads()[1]!.parentElement!.className).not.toMatch(/sep/);
    expect(openGroups()).toEqual([]);
    // D-253: System Health is Operations' first page.
    expect(pageRow('System Health')).toBe(groupHeads()[0]!.parentElement!.querySelector('button:not([aria-expanded])'));
    expect(crumbs()).toBe('Admin/Overview');
  });

  it('a single row opens its page; the Cohort row opens the cohort the admin is on', async () => {
    const router = renderAt('/admin');
    await screen.findByText('the overview');
    fireEvent.click(soloRows()[1]!);
    await screen.findByText('the curriculum page');
    expect(router.state.location.pathname).toBe('/admin/program');
    expect(soloRows()[1]).toHaveAttribute('aria-current', 'page');
    fireEvent.click(soloRows()[2]!);
    await screen.findByText('the schedule page');
    expect(router.state.location.pathname).toBe('/admin/cohort/dec26');
    // D-255: the cohort's own address is its Overview.
    expect(crumbs()).toBe('Admin/Cohort/Overview');
  });

  it('on a page that is on no row (the 404), every group is shut and the crumbs say `Admin`', async () => {
    renderAt('/admin/no-such-page');
    await screen.findByText('the 404');
    expect(groupHeads()).toHaveLength(2);
    expect(soloRows().filter((b) => b.getAttribute('aria-current'))).toEqual([]);
    expect(openGroups()).toEqual([]);
    expect(crumbs()).toBe('Admin');
  });

  it('opens one group at a time: a click opens it and shuts the rest, a second shuts it, a new page resets it', async () => {
    const old = { st1: { Operations: false, Build: true } };
    localStorage.setItem(PREFS_KEY, JSON.stringify({ navGroups: old }));
    const router = renderAt('/admin');
    await screen.findByText('the overview');
    // The old stored groups are not read.
    expect(openGroups()).toEqual([]);

    fireEvent.click(groupHead('Access'));
    expect(openGroups()).toEqual(['Access']);
    expect(router.state.location.pathname).toBe('/admin');
    expect(soloRows()[0]).toHaveAttribute('aria-current', 'page');
    // A shut group's pages are out of the keyboard's way; the open group's are in it.
    expect(pageRow('Roles & Permissions')).toHaveAttribute('tabindex', '0');
    expect(pageRow('Audit Log')).toHaveAttribute('tabindex', '-1');

    fireEvent.click(groupHead('Access'));
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
    expect(openGroups()).toEqual([]);
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
    expect(crumbs()).toBe('Admin/Operations/Audit Log');
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

  it('is a 64px rail from 768 to 1199px: a single row is one icon that opens its page, a group has a flyout', async () => {
    setWidth(1024);
    const router = renderAt('/admin/no-such-page');
    await screen.findByText('the 404');
    expect(aside()).toHaveAttribute('data-mode', 'rail');
    expect(aside()).toHaveAttribute('data-narrow', 'true');
    expect(within(aside()).getAllByRole('button', { name: / menu$/ }).map((b) => b.getAttribute('aria-label'))).toEqual(['Operations menu', 'Access menu']);
    expect(soloRows().map((b) => [b.getAttribute('aria-label'), b.getAttribute('aria-haspopup')])).toEqual([
      ['Overview', null],
      ['Program', null],
      ['Cohort', null],
      ['People', null],
      ['Revenue', null],
    ]);
    fireEvent.click(within(aside()).getByRole('button', { name: 'People' }));
    await screen.findByText('the users page');
    expect(router.state.location.pathname).toBe('/admin/people');
    expect(within(aside()).getByRole('button', { name: 'People' })).toHaveAttribute('aria-current', 'page');
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
    expect(soloRows(rows)).toHaveLength(5);
    expect(groupHeads(rows)).toHaveLength(2);
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

  it('the cohort switcher lists the cohorts that exist and picks one, keeping the tab (D-253)', async () => {
    const base = seed('live');
    const dec = base.cohorts.find((c) => c.id === 'dec26')!;
    state.db = { ...base, cohorts: [...base.cohorts, { ...dec, id: 'jan27', name: 'January 2027', status: 'draft', start: dec.start + 90 * 864e5, end: dec.end + 90 * 864e5 }] };
    const router = renderAt('/admin/cohort/dec26/people');
    await screen.findByText('the learners page');
    const sw = within(aside()).getByRole('button', { name: /^Switch cohort/ });
    expect(sw).toHaveAccessibleName('Switch cohort. Amplified AI Accelerator, December 2026 Cohort');
    fireEvent.click(sw);
    const menu = await screen.findByRole('menu', { name: 'Cohorts' });
    // Every cohort that exists, in start order (the fixture has two more), a draft marked; the current one checked.
    const items = within(menu).getAllByRole('menuitem').map((m) => m.textContent);
    // D-255: then "New cohort…", for a role with the cohorts permission. No "All cohorts".
    expect(items).toHaveLength(state.db.cohorts.length + 1);
    expect(items.slice(0, 1)).toEqual(['December 2026 Cohort']);
    expect(items).toContain('January 2027 Cohort · Draft');
    expect(items.at(-1)).toBe('New cohort…');
    expect(within(menu).queryByRole('menuitem', { name: /All cohorts/ })).toBeNull();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'January 2027 Cohort · Draft' }));
    // Picking keeps the tab.
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/cohort/jan27/people'));
    expect(within(aside()).getByRole('button', { name: /^Switch cohort/ })).toHaveAccessibleName('Switch cohort. Amplified AI Accelerator, January 2027 Cohort');
    // The Cohort row says "Draft" for a draft cohort.
    expect(soloRows()[2]).toHaveTextContent('CohortDraft');
    // The page's title is the same picker.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('January 2027 Cohort');
    // Elsewhere, the switcher keeps the cohort looked at last; /admin/cohort opens it.
    await act(async () => {
      await router.navigate('/admin/cohort');
    });
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/cohort/jan27'));
  });

  it('/admin/cohort opens the default cohort; an address that names no cohort is the 404', async () => {
    const router = renderAt('/admin/cohort');
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/cohort/dec26'));
    await screen.findByText('the schedule page');
    await act(async () => {
      await router.navigate('/admin/cohort/nope/people');
    });
    expect(await screen.findByRole('heading', { name: "This page doesn't exist" })).toBeInTheDocument();
  });

  it('draws a page with tabs: the head once, the tabs with counts, the tab’s page without its own h1 (D-253)', async () => {
    const router = renderAt('/admin/cohort/dec26/schedule');
    await screen.findByText('the schedule page');
    // One h1: the page's (the cohort picker), not the tab page's.
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['December 2026 Cohort']);
    expect(screen.queryByRole('heading', { name: 'Schedule' })).toBeNull();
    // The tab page keeps its description and its action, beside each other (`.shd`).
    expect(screen.getByText("Schedule's own words.").parentElement!.className).toMatch(/shd/);
    expect(screen.getByRole('button', { name: 'Schedule action' })).toBeInTheDocument();
    // The page's tabs, and the tab page's own tabs as a segmented control.
    const lists = screen.getAllByRole('tablist');
    expect(lists).toHaveLength(2);
    const sessions = state.db.sessions.filter((x) => x.cohortId === 'dec26').length;
    const teams = state.db.base.teams + state.db.teams.length;
    expect(within(lists[0]!).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Overview', `Schedule${sessions}`, `People${teams}`, 'Submissions', 'Community', 'Announcements', 'Settings']);
    expect(within(lists[0]!).getByRole('tab', { name: /^Schedule/ })).toHaveAttribute('aria-selected', 'true');
    expect(lists[1]!.className).toMatch(/sgm/);
    expect(within(lists[1]!).getAllByRole('tab').map((t) => t.textContent)).toEqual(['First3', 'Second']);
    fireEvent.click(within(lists[0]!).getByRole('tab', { name: 'Announcements' }));
    await screen.findByText('the announcements page');
    expect(router.state.location.pathname).toBe('/admin/cohort/dec26/announcements');
    expect(crumbs()).toBe('Admin/Cohort/Announcements');
  });

  it('draws Program, People and Revenue with the mockup’s heads, each tab current at its address', async () => {
    const router = renderAt('/admin/program');
    await screen.findByText('the curriculum page');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Amplified AI Accelerator');
    expect(screen.getByText('What you teach. A week is built once here, and every cohort that runs it gets the same week on its own dates.')).toBeInTheDocument();
    expect(within(screen.getAllByRole('tablist')[0]!).getAllByRole('tab').map((t) => t.textContent)).toEqual([
      // D-265: Curriculum counts the program's weeks.
      `Curriculum${state.db.modules.filter((m) => m.kind === 'week').length}`,
      'Course Settings',
      'Resource Vault',
    ]);
    await act(async () => {
      await router.navigate('/admin/revenue/payments/failed');
    });
    await screen.findByText('the payments page');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Revenue');
    expect(within(screen.getAllByRole('tablist')[0]!).getByRole('tab', { name: 'Payments' })).toHaveAttribute('aria-selected', 'true');
    expect(crumbs()).toBe('Admin/Revenue/Payments');
    await act(async () => {
      await router.navigate('/admin/people');
    });
    await screen.findByText('the users page');
    expect(within(screen.getAllByRole('tablist')[0]!).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Everyone', 'Teams', 'Masquerade']);
  });

  it('for Support, People has no Masquerade tab; its page still answers at its address, alone, as before (D-162 3b)', async () => {
    const base = seed('live');
    state.db = { ...base, staff: base.staff.map((x) => (x.id === 'st1' ? { ...x, role: 'Support' as const } : x)) };
    const router = renderAt('/admin/people');
    await screen.findByText('the users page');
    expect(within(screen.getAllByRole('tablist')[0]!).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Everyone', 'Teams']);
    await act(async () => {
      await router.navigate('/admin/people/masquerade');
    });
    await screen.findByText('the masquerade page');
    // A tab the role may not open is the page alone, its own title and all: no frame of tabs it isn't one of.
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Masquerade']);
    expect(screen.getAllByRole('tablist')).toHaveLength(1);
    expect(screen.getByRole('tablist').className).not.toMatch(/sgm/);
    expect(crumbs()).toBe('Admin/People/Masquerade');
  });

  it('an Instructor’s sidebar: no People, no Operations, and Revenue opens Plans & upgrades', async () => {
    const base = seed('live');
    state.db = { ...base, staff: base.staff.map((x) => (x.id === 'st1' ? { ...x, role: 'Instructor' as const } : x)) };
    const router = renderAt('/admin');
    await screen.findByText('the overview');
    expect(soloRows().map((b) => b.textContent!.replace(/\d+ draft$/, ''))).toEqual(['Overview', 'Program', 'Cohort', 'Revenue']);
    expect(groupHeads().map((b) => b.textContent!.match(/^[A-Z][a-z]+/)![0])).toEqual(['Access']);
    fireEvent.click(soloRows()[3]!);
    await screen.findByText('the tiers page');
    expect(router.state.location.pathname).toBe('/admin/revenue/plans');
    expect(within(screen.getAllByRole('tablist')[0]!).getAllByRole('tab').map((t) => t.textContent)).toEqual([expect.stringMatching(/^Plans & Upgrades\d*$/)]);
  });

  it('sends every old address to its new one, its query kept (D-253)', async () => {
    const router = renderAt('/admin/cohorts?x=1');
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/cohort/dec26/schedule'));
    expect(router.state.location.search).toBe('?x=1');
    for (const [from, to] of [
      ['/admin/curriculum', '/admin/program'],
      ['/admin/learners', '/admin/cohort/dec26/people'],
      ['/admin/billing/failed', '/admin/revenue/payments/failed'],
      ['/admin/build', '/admin/program'],
    ] as const) {
      await act(async () => {
        await router.navigate(from);
      });
      await waitFor(() => expect(router.state.location.pathname, from).toBe(to));
    }
  });

  it('leaves the learner shell to learners', async () => {
    state.viewer = { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' };
    renderAt('/sessions');
    expect(await screen.findByText('the sessions')).toBeInTheDocument();
    expect(document.querySelector('[data-r2-shell]')).toBeNull();
  });
});
