import { test, expect, type Browser, type Page } from '@playwright/test';
import { expectAccessible } from '../../lib/a11y';
import { APP_BASE, PARITY_NOW, PARITY_QUERY, PARITY_TZ } from '../../lib/admin-r2';

/**
 * R-5 Phase 9 (D-270), in the fixture build:
 *
 *   - The Overview (`/admin`), the mockup's `Home`, on the R2 reference's data (`?parity=r2`): four tiles, each opening its
 *     page; Needs You by cohort, then payments and the system, each row opening its place; Who Has a Sign-In, each
 *     segment opening People filtered (`?gotIn=`), which People › Everyone reads from the address; Cohorts and Coming Up.
 *     axe at 1280 and 390, the landmarks, one h1, no "MST", nothing sideways on a phone.
 *   - The palette finds cohorts.
 *   - Cohort › Settings › Clean-Up: Archive is refused before the last session and while the cohort sells (the mockup's
 *     toast says why), then confirmed in a dialog; the archived cohort leaves the switcher and the Overview.
 */

async function parity(browser: Browser, path: string, width = 1440): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: PARITY_TZ, locale: 'en-US', viewport: { width, height: width < 768 ? 844 : 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(PARITY_NOW));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}${PARITY_QUERY}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

async function fixture(browser: Browser, path: string, now: string, width = 1280): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Denver', viewport: { width, height: width < 768 ? 844 : 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(now));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin&now=${encodeURIComponent(now)}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const tile = (page: Page, label: string) => page.locator('main a').filter({ has: page.getByText(label, { exact: true }) }).first();

test.describe('the Overview (D-270) @console', () => {
  for (const width of [1280, 390])
    test(`passes axe and keeps the landmarks at ${width}`, async ({ browser }) => {
      const { page, close } = await parity(browser, '/admin', width);
      await expect(page.locator('main')).toContainText('16 with a sign-in');
      await expect(page.locator('aside[aria-label="Primary"]')).toHaveCount(1);
      await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overview');
      expect(await page.locator('main').innerText()).not.toContain('MST');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await expectAccessible(page);
      await close();
    });

  test('four tiles, each opening its page; Needs You by cohort, each row opening its place', async ({ browser }) => {
    const { page, close } = await parity(browser, '/admin');
    const main = page.locator('main');
    await expect(main).toContainText('What you teach, who is going through it, who has a sign-in, and what has been paid. Each one opens its page.');
    for (const [label, href, text] of [
      ['Program', '/admin/program', '9 weeks · 3 published, 6 in draft'],
      ['Cohort', '/admin/cohort/dec26', 'Week 2 of 2 · 1 of 200 seats'],
      ['People', '/admin/people', '1 in the cohort · 8 Utah Life, kept apart'],
      ['Revenue', '/admin/revenue', '$7,500 still to collect · $12,429 a month'],
    ] as const) {
      await expect(tile(page, label)).toHaveAttribute('href', href);
      await expect(tile(page, label)).toContainText(text);
    }
    // The old five stats are gone, and "Active learners" with them.
    await expect(main.getByText('Active learners')).toHaveCount(0);
    await expect(main.getByRole('button', { name: 'Export report' })).toHaveCount(0);

    const needs = main.locator('section', { has: page.getByRole('heading', { name: 'Needs You' }) });
    for (const g of ['December 2026 Cohort', 'January 2027 Cohort · Draft', 'Payments and system']) await expect(needs.getByText(g, { exact: true })).toBeVisible();
    await expect(needs.getByRole('link', { name: /^3 payments failed/ })).toHaveAttribute('href', '/admin/revenue/payments/failed');
    await expect(needs.getByRole('link', { name: /^2 teams asked to move up a plan/ })).toHaveAttribute('href', '/admin/revenue/plans');
    await expect(needs.getByRole('link', { name: /^1 incident is open/ })).toHaveAttribute('href', '/admin/incidents');
    await expect(needs.getByRole('link', { name: /^Payment Links entered/ })).toHaveAttribute('href', '/admin/cohort/jan27/settings#enrollment');
    await needs.getByRole('link', { name: /^5 sessions have no Zoom link/ }).click();
    await expect(page).toHaveURL(/\/admin\/cohort\/dec26\/schedule(\?|$)/);
    await close();
  });

  test('Who Has a Sign-In: each segment opens People filtered by how they got in', async ({ browser }) => {
    const { page, close } = await parity(browser, '/admin');
    const card = page.locator('main section', { has: page.getByRole('heading', { name: 'Who Has a Sign-In' }) });
    await expect(card).toContainText('16 people, each counted once. Utah Life agents are kept out of the learner count and out of revenue.');
    await card.getByRole('link', { name: /AI Accelerator/ }).click();
    await expect(page).toHaveURL(/\/admin\/people\?gotIn=plan%3Acohort/);
    await expect(page.locator('main').getByRole('button', { name: /^AI Accelerator/ })).toHaveAttribute('aria-pressed', 'true');
    await close();
  });

  test('Cohorts and Coming Up: every cohort not archived, and the next sessions in MT and CT', async ({ browser }) => {
    const { page, close } = await parity(browser, '/admin');
    const cohorts = page.locator('main section', { has: page.getByRole('heading', { name: 'Cohorts', exact: true }) });
    await expect(cohorts.getByRole('link', { name: 'New cohort' })).toHaveAttribute('href', '/admin/cohort/new');
    await expect(cohorts.getByRole('link', { name: /January 2027 Cohort/ })).toHaveAttribute('href', '/admin/cohort/jan27');
    const coming = page.locator('main section', { has: page.getByRole('heading', { name: 'Coming Up' }) });
    await expect(coming.getByText('Thu · 12:00 PM MT / 1:00 PM CT · December 2026')).toBeVisible();
    await expect(coming.getByText('Tue · 12:00 PM MT / 1:00 PM CT · January 2027')).toBeVisible();
    await close();
  });

  test('the palette finds cohorts', async ({ browser }) => {
    const { page, close } = await parity(browser, '/admin');
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await palette.getByRole('combobox', { name: 'Command palette search' }).fill('january');
    await expect(palette.getByRole('group', { name: 'Cohorts' }).getByRole('option')).toHaveText([/January 2027 Cohort/]);
    await page.keyboard.press('Enter');
    await expect.poll(() => new URL(page.url()).pathname).toBe('/admin/cohort/jan27');
    await close();
  });
});

test.describe('Cohort › Settings › Clean-Up: Archive this cohort (D-270) @console', () => {
  test('refused before the last session, with the mockup’s words', async ({ browser }) => {
    const { page, close } = await fixture(browser, '/admin/cohort/dec26/settings', '2026-12-10T16:30:00.000Z');
    const clean = page.locator('main section', { has: page.getByRole('heading', { name: 'Clean-Up' }) });
    await expect(clean).toContainText('Hides it from the switcher when it is over. Its people, files and payments are kept.');
    await clean.getByRole('button', { name: 'Archive…' }).click();
    await expect(page.getByText(/^A cohort can be archived after its last session, \w{3}, \w{3} \d{1,2}\.$/)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await close();
  });

  test('after its last session: refused while it sells; closed, then confirmed, it leaves the switcher and the Overview', async ({ browser }) => {
    const { page, close } = await fixture(browser, '/admin/cohort/dec26/settings', '2027-02-01T17:00:00.000Z');
    const clean = page.locator('main section', { has: page.getByRole('heading', { name: 'Clean-Up' }) });
    await clean.getByRole('button', { name: 'Archive…' }).click();
    await expect(page.getByText('Close enrollment first. An archived cohort sells no seats.', { exact: true })).toBeVisible();

    const enrollment = page.locator('#cohort-enrollment');
    await enrollment.getByRole('button', { name: 'Close enrollment' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Close enrollment' }).click();
    await expect(page.getByText('Enrollment is closed', { exact: true })).toBeVisible();

    await clean.getByRole('button', { name: 'Archive…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Archive the December 2026 Cohort?' });
    await expect(dialog).toContainText('Its people, files and payments are kept, and nothing is sent to anyone.');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('The cohort is archived', { exact: true })).toBeVisible();

    await page.locator('aside[aria-label="Primary"]').getByRole('button', { name: /^Switch cohort/ }).click();
    const menu = page.getByRole('menu', { name: 'Cohorts' });
    await expect(menu.getByRole('menuitem', { name: /December 2026/ })).toHaveCount(0);
    await expect(menu.getByRole('menuitem', { name: /February 2027 Cohort/ })).toHaveCount(1);
    await page.keyboard.press('Escape');

    await page.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'Overview', exact: true }).click();
    const cohorts = page.locator('main section', { has: page.getByRole('heading', { name: 'Cohorts', exact: true }) });
    await expect(cohorts.getByRole('link', { name: /February 2027 Cohort/ })).toBeVisible();
    await expect(cohorts.getByRole('link', { name: /December 2026/ })).toHaveCount(0);
    await close();
  });
});
