import { test, expect, type Browser, type Page } from '@playwright/test';
import { expectAccessible } from '../../lib/a11y';
import { APP_BASE, PARITY_NOW, PARITY_QUERY, PARITY_TZ } from '../../lib/admin-r2';

/**
 * R-5 Phase 7 (D-268): People, Utah Life and the cohort's roster, in the fixture build on the R2 reference's data.
 *
 *   - People › Everyone, Teams and Utah Life, Cohort › People and Cohort › Submissions: axe at 1280 and 390, every time
 *     printed "MT / CT" and never "MST".
 *   - Utah Life's two writes (PLAN.md § 10.7): Owner and Admin only, each confirmed before it writes, End access with a
 *     reason; Support sees both locked.
 *   - Cohort › Submissions: its four views, each at its own address (`?view=`).
 *
 * The rules behind them (how a person got in, the team of one left out, the writes' audit rows) are the API's
 * (`apps/api/test/people.test.ts`).
 */

async function open(browser: Browser, path: string, width = 1280): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: PARITY_TZ, locale: 'en-US', viewport: { width, height: width < 768 ? 844 : 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(PARITY_NOW));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}${PARITY_QUERY}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  await page.locator('main').waitFor();
  return { page, close: () => ctx.close() };
}

const SCREENS = [
  '/admin/people',
  '/admin/people/teams',
  '/admin/people/groups/utah-life',
  '/admin/cohort/dec26/people',
  '/admin/cohort/dec26/people?tab=learners',
  '/admin/cohort/dec26/submissions',
  '/admin/cohort/dec26/submissions?view=teams',
  '/admin/cohort/dec26/submissions?view=asks',
  '/admin/cohort/dec26/submissions?view=files',
];

test.describe('People, Utah Life and the cohort’s roster (D-268) @console', () => {
  for (const path of SCREENS)
    test(`${path}: axe at 1280 and 390, and every time MT / CT`, async ({ browser }) => {
      for (const width of [1280, 390]) {
        const { page, close } = await open(browser, path, width);
        await page.waitForTimeout(300);
        await expectAccessible(page);
        await expect(page.locator('main')).not.toContainText('MST');
        await close();
      }
    });

  test('Utah Life: its facts, its cards, and the counts open its agents', async ({ browser }) => {
    const { page, close } = await open(browser, '/admin/people/groups/utah-life', 1440);
    const main = page.locator('main');
    for (const t of ['Agents signed in', 'Active, last 30 days', 'Agent Plan skills, free', 'A verified @liveutah.com address', 'Thu, Nov 12, 2026', 'No end date'])
      await expect(main).toContainText(t);
    await expect(main.getByRole('heading', { name: 'What They Can Open' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Most Opened' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Where They Are Counted' })).toBeVisible();
    await expect(main).toContainText('Dec 10, 8:02 AM MT / 9:02 AM CT');
    await expect(main.getByRole('link', { name: 'Change that line in Words' })).toHaveAttribute('href', '/admin/program/course?section=words');
    await main.getByRole('button', { name: /^Agents signed in/ }).click();
    await close();
  });

  test('Utah Life’s two writes: Admin adds an address and ends access, each confirmed; Support sees both locked', async ({ browser }) => {
    const { page, close } = await open(browser, '/admin/people/groups/utah-life?console-role=Admin');
    await page.getByRole('button', { name: 'More for this group' }).click();
    await page.getByRole('menuitem', { name: 'Add an address outside the domain…' }).click();
    const add = page.getByRole('dialog', { name: 'Add an address to Utah Life' });
    await expect(add).toContainText('This action is audit-logged.');
    await expect(add.getByRole('button', { name: 'Add address' })).toBeDisabled();
    await add.getByLabel('Email address').fill('friend@example.com');
    await expectAccessible(page);
    await add.getByRole('button', { name: 'Add address' }).click();
    await expect(add).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Address added' })).toBeVisible();

    await page.getByRole('button', { name: 'More for this group' }).click();
    await page.getByRole('menuitem', { name: 'End access…' }).click();
    const end = page.getByRole('dialog', { name: 'End Utah Life access?' });
    await expect(end).toContainText('8 agents lose the Agent Plan’s skills right away. Their accounts stay, with nothing to open.');
    await expect(end.getByRole('button', { name: 'End access' })).toBeDisabled();
    await end.getByLabel('Reason').fill('The partnership ended today.');
    await end.getByRole('button', { name: 'End access' }).click();
    await expect(end).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Access ended' })).toBeVisible();
    await expect(page.locator('main')).toContainText('Thu, Dec 10, 2026');
    await close();

    const support = await open(browser, '/admin/people/groups/utah-life?console-role=Support');
    await support.page.getByRole('button', { name: 'More for this group' }).click();
    await expect(support.page.getByRole('menuitem', { name: /Add an address outside the domain/ })).toBeDisabled();
    await expect(support.page.getByRole('menuitem', { name: /End access/ })).toBeDisabled();
    await support.close();
  });

  test('Cohort › People: Teams first with Paid and Intake, Learners, the roster line, and Export', async ({ browser }) => {
    const { page, close } = await open(browser, '/admin/cohort/dec26/people', 1440);
    const main = page.locator('main');
    await expect(page.getByRole('tablist', { name: 'Section' }).getByRole('tab')).toHaveText(['Teams7 of 200', 'Learners7']);
    await expect(main.getByRole('table', { name: 'Teams' })).toContainText('2 of 41 signed in');
    await expect(main.getByRole('table', { name: 'Teams' })).toContainText('Not started');
    await expect(main).toContainText('This is the cohort’s roster: who is in it and how far along they are.');
    const [download] = await Promise.all([page.waitForEvent('download'), main.getByRole('button', { name: 'Export' }).click()]);
    expect(download.suggestedFilename()).toBe('cohort-roster-dec26.csv');
    await close();
  });

  test('Cohort › Submissions: the tab, its four views at their addresses, and every file’s week', async ({ browser }) => {
    const { page, close } = await open(browser, '/admin/cohort/dec26/submissions', 1440);
    await expect(page.getByRole('tablist', { name: 'Cohort' }).getByRole('tab', { name: 'Submissions' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toHaveText('Admin/Cohort/Submissions');
    const views = page.getByRole('tablist', { name: 'View' });
    await expect(views.getByRole('tab')).toHaveText(['Intake, added up', /^Intake, team by team/, 'Turned in, by step', 'Turned in, every file']);
    await expect(page.locator('main')).toContainText('Week 0 Intake');
    await views.getByRole('tab', { name: /^Intake, team by team/ }).click();
    await expect(page).toHaveURL(/view=teams/);
    await views.getByRole('tab', { name: 'Turned in, by step' }).click();
    await expect(page.locator('main')).toContainText('What Each Week Asks For');
    await views.getByRole('tab', { name: 'Turned in, every file' }).click();
    await expect(page).toHaveURL(/view=files/);
    await close();
  });
});
