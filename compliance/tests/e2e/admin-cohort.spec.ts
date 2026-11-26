import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
import { launchDb } from '../../lib/launch-db';
import { DB_KEY } from '../../../packages/core/src/constants';

/**
 * D-255 (R-5 Phase 3, ADMIN-RESTRUCTURE-SPEC.md Phase 3, "Done when"): on the seeded database (§ 9.5's launch seed and
 * every one-time data step, December's run among them: `launchDb`), Connor's January (six weeks, a Tuesday live build
 * and a Thursday office hours at 12:00 PM MT, Week 1 opening Sun, Jan 3, 2027) is created in one sitting through New
 * cohort. Its layout matches the mockup's (the setup week Sun, Dec 27; 12 sessions; the first Tue, Jan 5; the last Thu,
 * Feb 11), the overlap with December's Thursday office hours is reported, and the cohort it makes is a draft whose
 * Overview says what is left before it opens, in Open enrollment's order. Then its Settings: Edit words clears "Read them
 * once", Dates and Release sets Week 0's due date, and Schedule keeps the overlap on purpose. axe at 1280 and 390.
 *
 * The fixture build, as every e2e: the admin persona writes through the same `@ai/core` actions the API runs (the API's
 * own run of them, with their audit rows, is `apps/api/test/cohort-page.test.ts`; December's outputs with January in the
 * database are `apps/api/test/december.test.ts`).
 */

/** Thu, Nov 26, 2026, noon MT: after Phase 3 is deployed, before December's Week 1. */
const NOW = '2026-11-26T19:00:00.000Z';
const DB = JSON.stringify(launchDb());

async function openAt(browser: Browser, path: string, width = 1280): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Denver', viewport: { width, height: width < 768 ? 844 : 900 } });
  // The launch database, stored as the fixture's own once per tab, so the tab's writes stay through its navigations.
  await ctx.addInitScript(
    ({ key, db }) => {
      try {
        if (!sessionStorage.getItem('launch-db')) {
          localStorage.setItem(key, db);
          sessionStorage.setItem('launch-db', '1');
        }
      } catch {
        /* storage unavailable */
      }
    },
    { key: DB_KEY, db: DB },
  );
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin&now=${encodeURIComponent(NOW)}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const aside = (page: Page) => page.locator('aside[aria-label="Primary"]');
const crumbs = (page: Page) => page.locator('header nav[aria-label="Breadcrumb"]');
const main = (page: Page) => page.locator('main');

test.describe('the Cohort page and New cohort (D-255) @g9 @console', () => {
  test('Connor’s January, created in one sitting on the launch database: its layout, the overlap, a draft', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/cohort/dec26');
    // From the cohort picker in the sidebar: "New cohort…".
    await aside(page).getByRole('button', { name: /^Switch cohort/ }).click();
    await page.getByRole('menuitem', { name: 'New cohort…' }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/admin/cohort/new');
    await expect(crumbs(page)).toHaveText('Admin/Cohort/New Cohort');
    await expect(page.getByRole('heading', { level: 1, name: 'New Cohort' })).toBeVisible();

    // The form opens on Connor's January: six weeks, Tuesday build and Thursday office hours at noon, Week 1 Sun, Jan 3.
    await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('January 2027 Cohort');
    await expect(page.getByLabel('Week 1 opens')).toHaveValue('2027-01-03');
    await expect(page.getByLabel('Day 1')).toHaveValue('2');
    await expect(page.getByLabel('Kind 1')).toHaveValue('live_build');
    await expect(page.getByLabel('Day 2')).toHaveValue('4');
    await expect(page.getByLabel('Kind 2')).toHaveValue('office_hours');
    await expect(page.getByLabel('Time 1')).toHaveValue('12:00');
    await expect(page.getByText('6 of 8 weeks')).toBeVisible();

    // The layout, as the mockup's: the setup week Sun, Dec 27; 12 sessions; the first Tue, Jan 5; the last Thu, Feb 11.
    await expect(main(page).getByText('The setup week opens Sun, Dec 27. The first session is Tue, Jan 5 and the last is Thu, Feb 11.')).toBeVisible();
    await expect(main(page).locator('b', { hasText: /^12$/ })).toBeVisible();
    // The overlap with December's Thursday office hours, reported (a warning, never an error).
    await expect(main(page).getByText('5 sessions are at the same time as December’s.')).toBeVisible();
    await expect(main(page).getByText(/Its Wednesday build and Thursday office hours are at 12:00 PM MT through Thu, Feb 4\./)).toBeVisible();
    // Its included time, prefilled to the last live build (Tue, Feb 9) + 90 days.
    await expect(page.getByLabel('Included time ends')).toHaveValue('2027-05-10');
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Create cohort' }).click();
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/admin\/cohort\/c[^/]+$/);
    const id = new URL(page.url()).pathname.split('/').pop()!;
    await expect(page.getByRole('heading', { level: 1, name: 'January 2027 Cohort' })).toBeVisible();
    await expect(main(page).getByText('Draft', { exact: true }).first()).toBeVisible();
    await expect(main(page).getByText('Amplified AI Accelerator · 6 weeks of building · twice a week · opens Sun, Dec 27')).toBeVisible();
    // The sidebar's Cohort row says Draft.
    await expect(aside(page).getByText('Draft', { exact: true })).toBeVisible();

    // Before It Opens: Open enrollment's refusals, in its order, each opening the place to fix it.
    const before = main(page).locator('section', { has: page.getByRole('heading', { name: 'Before It Opens' }) });
    await expect(before.getByText('3 of 11 done')).toBeVisible();
    await expect(before.getByRole('link')).toHaveText([
      /^Shape6 weeks of building · twice a week, after a setup week/,
      /^Its weeks6 of 6 are published/,
      /^Sessions12 on the calendar\. 5 are at the same time as December’s office hours\./,
      /^Zoom links0 of 12 sessions have one/,
      /^Week 0 due dateNot set/,
      /^Stripe price found for each lookup key/,
      /^Payment Links entered/,
      /^Included time endsMon, May 10, 2027/,
      /^Words learners seeCopied from December/,
      /^Test emails sentNot yet: the welcome and Week 0 Is Open/,
      /^Open enrollmentOff\./,
    ]);
    await expect(before.getByRole('link', { name: /^Test emails sent/ })).toHaveAttribute('href', '/admin/flags');
    await expectAccessible(page);

    // Schedule: twelve sessions, five at the same time as December's, kept on purpose.
    await page.getByRole('tab', { name: /^Schedule/ }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(`/admin/cohort/${id}/schedule`);
    await expect(main(page).getByRole('table', { name: 'Sessions' }).getByRole('row')).toHaveCount(13);
    await expect(main(page).getByText('5 sessions are at the same time as December’s office hours.')).toBeVisible();
    await page.getByRole('button', { name: 'Keep them together' }).click();
    await expect(page.getByRole('button', { name: 'Keep them together' })).toHaveCount(0);

    // Settings: the words, and Week 0's due date.
    await page.getByRole('tab', { name: 'Settings' }).click();
    await expect(main(page).getByText('Read them once')).toBeVisible();
    await page.getByRole('button', { name: 'Edit this cohort’s words' }).click();
    const words = page.getByRole('dialog', { name: 'Words From This Cohort' });
    await words.getByRole('textbox', { name: 'The promise' }).fill('Six weeks of building. One hire a week. Built live, on your own numbers.');
    await words.getByRole('button', { name: 'Save words' }).click();
    await expect(words).toHaveCount(0);
    await expect(main(page).getByText('Read them once')).toHaveCount(0);
    await page.getByRole('button', { name: 'Edit' }).nth(1).click();
    const dates = page.getByRole('dialog', { name: 'Dates and Release' });
    await dates.getByLabel('Week 0 is due').fill('2027-01-04');
    await dates.getByRole('button', { name: 'Save' }).click();
    await expect(dates).toHaveCount(0);
    await expect(main(page).getByText('Mon, Jan 4 · 12:00 PM MT / 1:00 PM CT')).toBeVisible();
    await expectAccessible(page);

    // Back on the Overview: the words, the sessions and Week 0's due date are done now.
    await page.getByRole('tab', { name: 'Overview' }).click();
    await expect(before.getByText('6 of 11 done')).toBeVisible();
    await close();
  });

  for (const width of [1280, 390])
    test(`December’s Overview, Schedule and Settings, and New cohort, are accessible at ${width}`, async ({ browser }) => {
      const { page, close } = await openAt(browser, '/admin/cohort/dec26', width);
      await expect(page.getByRole('heading', { level: 1, name: 'December 2026 Cohort' })).toBeVisible();
      await expectAccessible(page);
      for (const [path, heading] of [
        ['/admin/cohort/dec26/schedule', 'December 2026 Cohort'],
        ['/admin/cohort/dec26/settings', 'December 2026 Cohort'],
        ['/admin/cohort/new', 'New Cohort'],
      ] as const) {
        await page.goto(`${APP_BASE}${path}?as=admin&now=${encodeURIComponent(NOW)}`);
        await page.locator('body[data-app-ready="true"]').waitFor();
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), { message: path }).toBe(true);
        await expectAccessible(page);
      }
      // December's shape is read off its sessions: only its hosts change.
      await page.goto(`${APP_BASE}/admin/cohort/dec26/settings?as=admin&now=${encodeURIComponent(NOW)}`);
      await page.locator('body[data-app-ready="true"]').waitFor();
      await expect(main(page).getByText('This cohort’s shape is read from its own sessions. Only its hosts change here.')).toBeVisible();
      await close();
    });

  test('the week builder no longer edits a week’s dates or sessions: Where it runs, each a link to the cohort', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/program/weeks/accelerator-week-2');
    await expect(main(page).getByText('Where it runs')).toBeVisible();
    await expect(main(page).getByRole('link', { name: /Week 2 of the December 2026 Cohort/ })).toHaveAttribute('href', '/admin/cohort/dec26/settings#dates');
    await expect(main(page).getByRole('button', { name: 'Add session' })).toHaveCount(0);
    await expect(main(page).getByLabel('Opens', { exact: true })).toHaveCount(0);
    await close();
  });
});
