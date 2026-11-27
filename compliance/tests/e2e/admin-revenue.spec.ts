import { test, expect, type Browser, type Page } from '@playwright/test';
import { expectAccessible } from '../../lib/a11y';
import { APP_BASE, PARITY_NOW, PARITY_QUERY, PARITY_TZ } from '../../lib/admin-r2';

/**
 * R-5 Phase 8 (D-269): Revenue › Summary, in the fixture build on the R2 reference's data (`REVENUE_R2`).
 *
 *   - axe at 1280 and 390 for both periods; no time on it, so no "MST"; nothing scrolls sideways on a phone;
 *   - the five figures and where each opens (two of them a section of this page), the Period select, a card per cohort
 *     that is selling or running (December, not January's draft) whose seat count opens its Enrollment, By Product's
 *     rows and Coming In's;
 *   - Stripe unreadable: "Unavailable", never a zero, the seats still drawn;
 *   - the sidebar's Revenue "3 failed" (PLAN.md § 8, § 10.8).
 *
 * The figures' rules are core's and the API's (`packages/core/test/console-revenue.test.ts`,
 * `apps/api/test/console-revenue.test.ts`); the pixels are `pnpm parity:admin-r2`'s `billing` cells.
 */

async function open(browser: Browser, path: string, width = 1280, parity = true): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: PARITY_TZ, locale: 'en-US', viewport: { width, height: width < 768 ? 844 : 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(PARITY_NOW));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}${parity ? PARITY_QUERY : 'as=admin'}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  await page.locator('main').waitFor();
  return { page, close: () => ctx.close() };
}

test.describe('Revenue › Summary (D-269) @console', () => {
  for (const path of ['/admin/revenue', '/admin/revenue?period=month'])
    test(`${path}: axe at 1280 and 390, no MST, nothing sideways on a phone`, async ({ browser }) => {
      for (const width of [1280, 390]) {
        const { page, close } = await open(browser, path, width);
        await expect(page.locator('main')).toContainText('Cash collected');
        await page.waitForTimeout(300);
        await expectAccessible(page);
        await expect(page.locator('main')).not.toContainText('MST');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        await close();
      }
    });

  test('the five figures, the period, and where each figure opens', async ({ browser }) => {
    const { page, close } = await open(browser, '/admin/revenue', 1440);
    const main = page.locator('main');
    for (const t of ['$82,694', 'Since Aug 2026', '$7,500', '2 payments · Wed, Dec 30', '$90,194', 'Collected + still to collect', '$12,429', '59 subscriptions', 'Needs review'])
      await expect(main.getByText(t, { exact: true }).first()).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Cash By Month' })).toBeVisible();
    await expect(main.getByRole('img', { name: /^Cash collected by month from September to December/ })).toBeVisible();
    await expect(main).toContainText('December counts two second payments ($7,500) and this month’s renewals. It is not a forecast of new sales.');
    // This month: December from its first day.
    await page.getByRole('combobox', { name: 'Period' }).selectOption('month');
    await expect(page).toHaveURL(/period=month/);
    await expect(main.getByText('Dec 1 to Dec 10', { exact: true })).toBeVisible();
    await expect(main.getByText('$15,660', { exact: true })).toBeVisible();
    await expect(main.getByText('3 bought', { exact: true })).toBeVisible();
    // Each figure opens the list it counts: Payments' tabs, or this page's sections.
    for (const [label, url] of [
      ['Cash collected', /\/admin\/revenue\/payments\/invoices(\?|$)/],
      ['MRR', /\/admin\/revenue\/payments\/subscriptions(\?|$)/],
      ['Failed payments', /\/admin\/revenue\/payments\/failed(\?|$)/],
    ] as const) {
      await page.goto(`${APP_BASE}/admin/revenue?${PARITY_QUERY}`);
      await page.locator('main').getByRole('link', { name: new RegExp(`^${label}`) }).click();
      await expect(page).toHaveURL(url);
    }
    await page.goto(`${APP_BASE}/admin/revenue?${PARITY_QUERY}`);
    await page.locator('main').getByRole('button', { name: /^Still to collect \$/ }).click();
    await expect(page.locator('#revenue-coming')).toBeInViewport();
    await page.locator('main').getByRole('button', { name: /^Total revenue \$/ }).click();
    await expect(page.locator('#revenue-products')).toBeInViewport();
    await close();
  });

  test('a card per cohort selling or running, By Product and Coming In', async ({ browser }) => {
    const { page, close } = await open(browser, '/admin/revenue', 1440);
    const main = page.locator('main');
    const cards = main.locator('section').filter({ has: page.getByRole('heading', { name: 'AI Accelerator', exact: true }) });
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText('December 2026 Cohort');
    await expect(cards).toContainText('5 teams · $37,500');
    await expect(cards).toContainText('2 teams · $7,500 in, $7,500 to come');
    // Seats have one source, Enrollment (PLAN.md § 10.3).
    await cards.getByRole('link', { name: /Seats sold/ }).click();
    await expect(page).toHaveURL(/\/admin\/cohort\/dec26\/settings(\?[^#]*)?#enrollment$/);
    await page.goto(`${APP_BASE}/admin/revenue?${PARITY_QUERY}`);
    const products = page.getByRole('table', { name: 'By Product' });
    for (const t of ['December 2026 · 7 of 200 seats', 'January 2027 · 0 of 200 seats', 'Team Plan · 16 seats', '5 teams · 27 people', 'Skills', '11 bought'])
      await expect(products).toContainText(t);
    await products.getByText('January 2027 · 0 of 200 seats').click();
    await expect(page).toHaveURL(/\/admin\/cohort\/jan27\/people(\?|$)/);
    await page.goto(`${APP_BASE}/admin/revenue?${PARITY_QUERY}`);
    const coming = page.getByRole('table', { name: 'Coming In' });
    await expect(page.locator('main')).toContainText('Next 60 days · $11,237');
    for (const t of ['Insiders, second try', 'Retrying', 'Accelerator, payment 2 of 2', 'Mon, Jan 4']) await expect(coming).toContainText(t);
    await coming.getByText('Northshore Group').click();
    await expect(page).toHaveURL(/\/admin\/people\/teams\/ws_northshore(\?|$)/);
    await close();
  });

  test('Stripe unreadable: every Stripe figure "Unavailable", never a zero; the seats still drawn', async ({ browser }) => {
    const { page, close } = await open(browser, '/admin/revenue?console-state=stripe_off', 1280, false);
    const main = page.locator('main');
    await expect(main.getByText('Unavailable', { exact: true }).first()).toBeVisible();
    await expect(main.getByText('$82,694')).toHaveCount(0);
    await expect(main.getByText('2 payments', { exact: true })).toBeVisible();
    await expectAccessible(page);
    await close();
  });

  test('the sidebar’s Revenue says how many payments failed (PLAN.md § 8)', async ({ browser }) => {
    const { page, close } = await open(browser, '/admin', 1440);
    await expect(page.locator('aside[aria-label="Primary"]').getByRole('button', { name: /^Revenue/ })).toContainText('3 failed');
    await close();
  });
});
