import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-253 (R-5 Phase 1, ADMIN-RESTRUCTURE-SPEC.md § 3): the frame, in the fixture build. Every old admin address lands on
 * its new one in the real router, query kept; the rail's single rows open their page with no fly-out; the cohort picker
 * in the sidebar and in the Cohort page's title; the palette's pages and tabs; a page's tab drops its own title and its
 * own tabs become a segmented control; and axe on each of the four pages at 1280 and 390.
 */

async function openAt(browser: Browser, path: string, width = 1280): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width, height: width < 768 ? 844 : 900 } });
  const page = await ctx.newPage();
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const aside = (page: Page) => page.locator('aside[aria-label="Primary"]');
const crumbs = (page: Page) => page.locator('header nav[aria-label="Breadcrumb"]');

/** Every address that moved, and where it lands (`apps/web/src/shell/admin/addresses.ts`). */
const MOVED: [string, string][] = [
  ['/admin/curriculum', '/admin/program'],
  ['/admin/curriculum/new', '/admin/program/weeks/new'],
  ['/admin/curriculum/accelerator-week-1', '/admin/program/weeks/accelerator-week-1'],
  ['/admin/curriculum/course', '/admin/program/course'],
  ['/admin/vault', '/admin/program/vault'],
  ['/admin/build', '/admin/program'],
  ['/admin/cohorts', '/admin/cohort/dec26/schedule'],
  ['/admin/learners', '/admin/cohort/dec26/people'],
  ['/admin/community', '/admin/cohort/dec26/community'],
  ['/admin/community/2', '/admin/cohort/dec26/community/2'],
  ['/admin/announcements', '/admin/cohort/dec26/announcements'],
  ['/admin/users', '/admin/people'],
  ['/admin/users/u_1042', '/admin/people/u_1042'],
  ['/admin/workspaces', '/admin/people/teams'],
  ['/admin/workspaces/ws_northshore', '/admin/people/teams/ws_northshore'],
  ['/admin/masquerade', '/admin/people/masquerade'],
  ['/admin/billing', '/admin/revenue'],
  ['/admin/billing/invoices', '/admin/revenue/payments/invoices'],
  ['/admin/billing/failed', '/admin/revenue/payments/failed'],
  ['/admin/tiers', '/admin/revenue/plans'],
  ['/admin/usage', '/admin/revenue/usage'],
  ['/admin/cohort', '/admin/cohort/dec26'],
];

test.describe('the admin frame (D-253) @g9 @console', () => {
  test('every old address lands on its new one, its query kept', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin');
    for (const [from, to] of MOVED) {
      await page.goto(`${APP_BASE}${from}?as=admin&x=1`);
      await page.locator('body[data-app-ready="true"]').waitFor();
      await expect.poll(() => new URL(page.url()).pathname, { message: from }).toBe(to);
      expect(new URL(page.url()).searchParams.get('x'), from).toBe('1');
      await expect(page.getByRole('heading', { level: 1, name: "This page doesn't exist" }), from).toHaveCount(0);
    }
    // The learner view keeps its address (spec § 3).
    await page.goto(`${APP_BASE}/admin/masquerade/learner-view?as=admin`);
    await expect(page.getByRole('heading', { level: 1, name: 'No masquerade session is active' })).toBeVisible();
    await close();
  });

  test('a page’s tab: the page’s title once, its words and actions kept, its own tabs a segmented control', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/cohort/dec26/people');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('December 2026 Cohort');
    await expect(crumbs(page)).toHaveText('Admin/Cohort/People');
    await expect(page.getByRole('tablist', { name: 'Cohort' }).getByRole('tab')).toHaveText(['Overview', /^Schedule\d+$/, /^People\d+$/, /^Community/, 'Announcements', 'Settings']);
    // Learners & Teams keeps its description; its Learners and Teams are a segmented control under it.
    await expect(page.locator('main')).toContainText('Everyone enrolled in the December 2026 Cohort, with build progress.');
    await expect(page.getByRole('tablist', { name: 'Section' }).getByRole('tab')).toHaveText([/^Learners/, /^Teams/]);
    await page.getByRole('tablist', { name: 'Section' }).getByRole('tab', { name: /^Teams/ }).click();
    await expect(page.getByRole('tablist', { name: 'Section' }).getByRole('tab', { name: /^Teams/ })).toHaveAttribute('aria-selected', 'true');
    // Revenue › Payments: Billing's lists as a segmented control, Customers first.
    await page.goto(`${APP_BASE}/admin/revenue/payments?as=admin`);
    await expect(page.getByRole('tablist', { name: 'Section' }).getByRole('tab')).toHaveText(['Customers', 'Subscriptions', 'Invoices', /^Failed payments/, 'Refunds']);
    await close();
  });

  test('the cohort picker: the sidebar’s switcher and the Cohort page’s title list the cohorts, and picking keeps the tab', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/cohort/dec26/announcements');
    await page.getByRole('heading', { level: 1 }).getByRole('button', { name: 'Switch cohort. December 2026 Cohort' }).click();
    const menu = page.getByRole('menu', { name: 'Cohorts' });
    await expect(menu.getByRole('menuitem').first()).toHaveText('December 2026 Cohort');
    // D-255 (R-5 Phase 3): the picker ends with "New cohort…" for staff who may create one; still no "All cohorts".
    await expect(menu.getByRole('menuitem').last()).toHaveText('New cohort…');
    await expect(menu.getByRole('menuitem', { name: /All cohorts/ })).toHaveCount(0);
    await expectAccessible(page);
    await menu.getByRole('menuitem', { name: /February 2027 Cohort/ }).click();
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/admin\/cohort\/[^/]+\/announcements$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('February 2027 Cohort');
    // The sidebar's switcher names the same cohort, and its menu is the same list.
    await expect(aside(page).getByRole('button', { name: /^Switch cohort/ })).toHaveAccessibleName('Switch cohort. Amplified AI Accelerator, February 2027 Cohort');
    await aside(page).getByRole('button', { name: /^Switch cohort/ }).click();
    await page.getByRole('menu', { name: 'Cohorts' }).getByRole('menuitem', { name: 'December 2026 Cohort' }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/admin/cohort/dec26/announcements');
    await close();
  });

  test('the rail: a single row is one icon that opens its page; Operations and Access fly out', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit', 1024);
    await expect(aside(page)).toHaveAttribute('data-mode', 'rail');
    for (const name of ['Overview', 'Program', 'Cohort', 'People', 'Revenue']) await expect(aside(page).getByRole('button', { name, exact: true })).not.toHaveAttribute('aria-haspopup');
    await aside(page).getByRole('button', { name: 'Revenue', exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/admin/revenue');
    await expect(aside(page).getByRole('button', { name: 'Revenue', exact: true })).toHaveAttribute('aria-current', 'page');
    await aside(page).getByRole('button', { name: 'Operations menu' }).click();
    await expect(page.getByRole('menu', { name: 'Operations' }).getByRole('menuitem').first()).toHaveText('System Health');
    await expectAccessible(page);
    await close();
  });

  test('the palette lists the four pages, and their tabs once something is typed', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin');
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette.getByRole('combobox', { name: 'Command palette search' })).toHaveAttribute('placeholder', 'Search people, teams, weeks, invoices, pages');
    await expect(palette.getByRole('group', { name: 'Pages' }).getByRole('option')).toHaveText(['Overview', 'Program', 'Cohort', 'People', 'Revenue']);
    await palette.getByRole('combobox', { name: 'Command palette search' }).fill('settings');
    // D-255: Title Case tab labels, and the Cohort page's own Settings tab.
    await expect(palette.getByRole('group', { name: 'Pages' }).getByRole('option')).toHaveText(['Program › Course Settings', 'Cohort › Settings']);
    await page.keyboard.press('Enter');
    await expect.poll(() => new URL(page.url()).pathname).toBe('/admin/program/course');
    await expect(crumbs(page)).toHaveText('Admin/Program/Course Settings');
    await close();
  });

  for (const width of [1280, 390])
    test(`the four pages pass axe and keep the landmarks at ${width}`, async ({ browser }) => {
      for (const path of ['/admin/program', '/admin/program/course', '/admin/cohort/dec26/schedule', '/admin/people', '/admin/revenue', '/admin/revenue/payments']) {
        const { page, close } = await openAt(browser, path, width);
        await expect(page.locator('aside[aria-label="Primary"]')).toHaveCount(1);
        await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toHaveCount(1);
        await expect(page.locator('main')).toHaveCount(1);
        await expect(page.getByRole('heading', { level: 1 }), path).toHaveCount(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), path).toBe(true);
        await expectAccessible(page);
        await close();
      }
    });
});
