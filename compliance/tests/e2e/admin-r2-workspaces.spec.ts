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
    const { page, close } = await openAt(browser, '/admin/workspaces');
    await expect(page.locator('aside[aria-label="Primary"]')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Workspaces' })).toBeVisible();
    await expect(crumbs(page)).toHaveText('Admin/Support/Workspaces');
    await expect(page.locator('aside[aria-label="Primary"] [aria-current="page"]')).toContainText('Workspaces');
    await expect(rows(page)).toHaveCount(7);
    await expect(rows(page).first()).toContainText('Northshore Group');
    await expect(rows(page).first()).toContainText('33 of 41');
    await expectAccessible(page);

    await page.getByRole('combobox', { name: 'Plan' }).selectOption({ label: 'Insiders' });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Past due');
    await page.getByRole('combobox', { name: 'Plan' }).selectOption({ label: 'All plans' });
    await page.getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Trialing' });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Lantern Street Partners');
    await page.getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Any status' });
    await page.getByRole('textbox', { name: 'Filter workspace or owner' }).fill('nobody at all');
    await expect(page.getByText('No matches')).toBeVisible();
    await page.getByRole('textbox', { name: 'Filter workspace or owner' }).fill('priya');
    await expect(rows(page)).toHaveCount(1);
    await page.getByRole('textbox', { name: 'Filter workspace or owner' }).fill('');
    await expect(rows(page)).toHaveCount(7);

    // A row's "…" holds its actions; masquerade is locked until the Masquerade screen exists.
    await rows(page).nth(1).getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: /Masquerade as owner/ })).toBeDisabled();
    await page.keyboard.press('Escape');
    await rows(page).first().getByRole('cell').nth(2).click();
    await expect(page).toHaveURL(/\/admin\/workspaces\/ws_northshore(\?|$)/);
    await expect(page.getByRole('heading', { level: 1, name: 'Northshore Group' })).toBeVisible();
    await close();
  });

  test('a workspace: key facts, five tabs, and the way back', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/workspaces/ws_northshore');
    await expect(crumbs(page)).toHaveText('Admin/Support/Workspaces/Northshore Group');
    await expect(crumbs(page).getByRole('link', { name: 'Workspaces' })).toHaveAttribute('href', '/admin/workspaces');
    await expect(page.locator('aside[aria-label="Primary"] [aria-current="page"]')).toContainText('Workspaces');
    await expect(page.getByText('Active', { exact: true }).first()).toBeVisible();
    for (const t of ['ws_northshore', 'Team Plan · 41 seats', '33 of 41', '$1,495', 'Dec 10, 8:52 AM'])
      await expect(page.locator('main').getByText(t, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Masquerade as owner' })).toHaveAttribute('aria-disabled', 'true');
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
    await page.getByRole('link', { name: 'Workspaces' }).first().click();
    await expect(page).toHaveURL(/\/admin\/workspaces(\?|$)/);
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
      ['empty', 'No workspaces yet'],
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

  test('production’s sidebar lists Workspaces in Support (the parity fixture lists the whole NAV)', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/workspaces');
    await expect(page.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'Workspaces' })).toBeVisible();
    await expect(page.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'Masquerade' })).toHaveCount(
      0,
    );
    await close();
  });
});
