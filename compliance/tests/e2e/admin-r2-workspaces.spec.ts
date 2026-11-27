import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-160 R2-1c: Workspaces and a workspace on R2 (spec § 7.3, D-158's API), in the fixture build. The
 * Console fixture answers with the R2 mockup's own records (`apps/web/src/data/parity-r2.ts`), so these
 * read the mockup's names. Their pixels are `pnpm parity:admin-r2`'s; these hold the behaviour: the
 * filters, a row opening its record, the tabs, staff notes, Denied, the record 404 and the shared
 * states. Every screen and state passes axe (zero serious or critical).
 */

const NOW = '2026-12-10T09:30:00-07:00';

async function openAt(
  browser: Browser,
  path: string,
  opts: { width?: number } = {},
): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({
    timezoneId: 'America/Phoenix',
    viewport: { width: opts.width ?? 1280, height: 900 },
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript(() =>
    localStorage.setItem('ai-lms-prefs', JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' })),
  );
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const rows = (page: Page) =>
  page.locator('main [role="table"] [role="row"]').filter({ has: page.locator('[role="cell"]') });
const crumbs = (page: Page) => page.locator('header nav[aria-label="Breadcrumb"]');

test.describe('Workspaces on R2 (D-160 R2-1c) @g9 @console', () => {
  test('the list: the mockup’s workspaces, its filters, and a row opens its workspace', async ({ browser }) => {
    // D-253: People › Teams; the old address lands there.
    const { page, close } = await openAt(browser, '/admin/workspaces');
    await expect(page).toHaveURL(/\/admin\/people\/teams(\?|$)/);
    await expect(page.locator('aside[aria-label="Primary"]')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'People' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Teams/ })).toHaveAttribute('aria-selected', 'true');
    await expect(crumbs(page)).toHaveText('Admin/People/Teams');
    await expect(page.locator('aside[aria-label="Primary"] [aria-current="page"]')).toContainText('People');
    await expect(rows(page)).toHaveCount(7);
    await expect(rows(page).first()).toContainText('Northshore Group');
    await expect(rows(page).first()).toContainText('33 of 41');
    // D-268 (R-5 Phase 7): People › Teams (the mockup's TeamsPg): what each team holds and pays; Utah Life's agents are
    // not teams, and the line under the table says so.
    await expect(rows(page).first()).toContainText('$1,495 a month');
    await expect(page.locator('main')).toContainText('8 Utah Life agents are not listed here.');
    await expectAccessible(page);

    await page.getByRole('combobox', { name: 'Product' }).selectOption({ label: 'Insiders' });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Past due');
    await page.getByRole('combobox', { name: 'Product' }).selectOption({ label: 'All products' });
    await page.getByRole('textbox', { name: 'Find a team or its owner' }).fill('nobody at all');
    await expect(page.getByText('No matches')).toBeVisible();
    await page.getByRole('textbox', { name: 'Find a team or its owner' }).fill('priya');
    await expect(rows(page)).toHaveCount(1);
    await page.getByRole('textbox', { name: 'Find a team or its owner' }).fill('');
    await expect(rows(page)).toHaveCount(7);

    // A row's "…" holds its actions; "Masquerade as owner…" is live since D-162 3b (Owner and Admin).
    await rows(page).nth(1).getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: /Masquerade as owner/ })).toBeEnabled();
    await page.keyboard.press('Escape');
    await rows(page).first().getByRole('cell').nth(2).click();
    await expect(page).toHaveURL(/\/admin\/people\/teams\/ws_northshore(\?|$)/);
    await expect(page.getByRole('heading', { level: 1, name: 'Northshore Group' })).toBeVisible();
    await close();
  });

  test('a workspace: key facts, five tabs, and the way back', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/people/teams/ws_northshore');
    await expect(crumbs(page)).toHaveText('Admin/People/Teams/Northshore Group');
    await expect(crumbs(page).getByRole('link', { name: 'Teams' })).toHaveAttribute('href', '/admin/people/teams');
    await expect(crumbs(page).getByRole('link', { name: 'People' })).toHaveAttribute('href', '/admin/people');
    await expect(page.locator('aside[aria-label="Primary"] [aria-current="page"]')).toContainText('People');
    // The way back is Teams (the mockup's third pass).
    await expect(page.getByRole('main').getByRole('link', { name: 'Teams' })).toHaveAttribute(
      'href',
      '/admin/people/teams',
    );
    await expect(page.getByText('Active', { exact: true }).first()).toBeVisible();
    for (const t of ['ws_northshore', 'Team Plan · 41 seats', '33 of 41', '$1,495', 'Dec 10, 8:52 AM MT / 9:52 AM CT'])
      await expect(page.locator('main').getByText(t, { exact: true }).first()).toBeVisible();
    // Live since D-162 3b: it opens the reason dialog for the owner.
    await expect(page.getByRole('button', { name: 'Masquerade as owner' })).toBeEnabled();
    const tabs = page.getByRole('tablist', { name: 'Section' });
    await expect(tabs.getByRole('tab')).toHaveText(['Members2', 'Plan & entitlements', 'Usage', 'Billing', 'Activity']);
    await expect(rows(page)).toHaveCount(2);
    await expectAccessible(page);
    for (const [tab, text] of [
      ['Plan & entitlements', 'Team Plan is sold in two sizes, 16 or 41 seats.'],
      // D-166: the last 7 days' counts, the mockup's figures in the fixture.
      ['Usage', 'Sign-ins, 7d'],
      ['Billing', 'cus_Rk3NshoreA1'],
      ['Activity', 'Team Plan order started'],
    ] as const) {
      await tabs.getByRole('tab', { name: tab }).click();
      await expect(tabs.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('main')).toContainText(text);
      await expectAccessible(page);
    }
    await page.getByRole('main').getByRole('link', { name: 'Teams' }).click();
    await expect(page).toHaveURL(/\/admin\/people\/teams(\?|$)/);
    await close();
  });

  test('staff notes: Save note waits for words, then the note leads the list', async ({ browser }) => {
    for (const role of ['Owner', 'Support']) {
      const { page, close } = await openAt(browser, `/admin/workspaces/ws_northshore?console-role=${role}`);
      const save = page.getByRole('button', { name: 'Save note' });
      await expect(save).toBeDisabled();
      await expect(page.getByText('Owner asked how seats work when an agent leaves.', { exact: false })).toBeVisible();
      await page.getByRole('textbox', { name: 'Add a note' }).fill('Called the owner about seats.');
      await save.click();
      await expect(page.getByRole('status').filter({ hasText: 'Note saved' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Add a note' })).toHaveValue('');
      const first = page
        .locator('main p')
        .filter({ hasText: /Called the owner about seats\.|Owner asked how seats work/ })
        .first();
      await expect(first).toHaveText('Called the owner about seats.');
      await close();
    }
  });

  test('Denied for a role without workspaces.read; a workspace that doesn’t exist is the 404', async ({ browser }) => {
    for (const path of [
      '/admin/workspaces?console-role=Instructor',
      '/admin/workspaces/ws_northshore?console-role=Content%20Editor',
    ]) {
      const { page, close } = await openAt(browser, path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText("Your role can't open Workspaces");
      await expectAccessible(page);
      await close();
    }
    const { page, close } = await openAt(browser, '/admin/workspaces/no_such_workspace');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("This page doesn't exist");
    await close();
  });

  test('its states: loading, empty, error and "Too many requests"', async ({ browser }) => {
    const cases = [
      ['loading', null],
      ['empty', 'No team matches'],
      ['error', 'This didn’t load.'],
      ['rate_limited', 'Too many requests.'],
    ] as const;
    for (const [state, text] of cases) {
      const { page, close } = await openAt(browser, `/admin/workspaces?console-state=${state}`);
      if (text) await expect(page.locator('main')).toContainText(text);
      else await expect(page.locator('main [aria-busy="true"]')).toBeVisible();
      if (state === 'error') await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
      await expectAccessible(page);
      await close();
    }
  });

  test('on a phone: cards, the Section select, and axe', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/workspaces', { width: 390 });
    await expect(page.locator('main [role="table"]')).toHaveCount(0);
    await expect(page.locator('main').getByText('Hale & Marlowe Realty')).toBeVisible();
    await expectAccessible(page);
    await page.locator('main').getByText('Northshore Group').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Northshore Group' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Section' }).selectOption({ label: 'Billing' });
    await expect(page.locator('main')).toContainText('sub_1Qn7NshoreT41');
    await expectAccessible(page);
    await close();
  });

  test('production’s sidebar lists People, with Teams a tab (D-253)', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/people/teams');
    await expect(page.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'People' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // D-162 3b: Masquerade is on in production too, for the Owner and Admins: a tab of People now.
    await expect(page.getByRole('tablist', { name: 'People' }).getByRole('tab', { name: 'Masquerade' })).toHaveCount(1);
    await close();
  });
});
