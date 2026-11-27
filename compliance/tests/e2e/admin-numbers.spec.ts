import { test, expect, type Page } from '@playwright/test';
import { APP_BASE, PARITY_NOW, PARITY_QUERY, PARITY_TZ } from '../../lib/admin-r2';

/**
 * R-5 audit (D-267; ADMIN-RESTRUCTURE-SPEC.md § 4 rule 1 and § 6: "a test that walks every screen of this work and fails
 * on a number that is not a link"). Connor, Nov 26: "Add the spec's test that fails on any admin number without a link".
 *
 * A number is what rule 1 lists, as the screens mark it (`data-number`): a stat tile's figure, a fact strip's value, a
 * tab's count, a readiness or seats bar's figure and a Needs You row. Each one that counts something (a value with a
 * digit that is not a date or a time) must sit inside a link or a button, so it opens the list it counts. A date
 * ("Sun, Nov 29 · 12:00 PM MT / 1:00 PM CT") opens nothing by this rule.
 *
 * It walks every screen of R-5 (the Overview, Program, every Cohort tab for December and for January as a draft, People's
 * tabs and Utah Life, Revenue's Payments and Plans & Upgrades) on the mockup's data (the parity fixture), at 1440. The planted check at the end
 * proves it fails on a number that is not a link.
 */

const SCREENS = [
  '/admin',
  '/admin/program',
  '/admin/cohort/dec26',
  '/admin/cohort/dec26/schedule',
  '/admin/cohort/dec26/people',
  '/admin/cohort/dec26/announcements',
  '/admin/cohort/dec26/settings',
  '/admin/cohort/jan27',
  '/admin/cohort/jan27/schedule',
  '/admin/cohort/jan27/settings',
  '/admin/people',
  '/admin/people/teams',
  '/admin/people/groups/utah-life',
  '/admin/revenue/payments',
  '/admin/revenue/plans',
];
// Not walked, and why (D-267, "Decided overnight"): Revenue › Summary is Billing's own until Phase 8, which draws it as the
// mockup's Revenue, every figure opening the payments behind it; Revenue › Usage is today's Usage, whose figures are
// counters (requests, storage) with no list behind them. Both are pages R-5 wraps and has not built yet.

/** A date or a time, not a count: a weekday or a month with a day, a clock, MT or CT. */
const DATE = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun),|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d|\b\d{1,2}:\d{2}\b|\b(AM|PM|MT|CT)\b/;

async function open(page: Page, path: string): Promise<void> {
  await page.clock.setFixedTime(new Date(PARITY_NOW));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}${PARITY_QUERY}`);
  await page.locator('body[data-app-ready="true"]').waitFor();
  await page.locator('main').waitFor();
  await page.waitForTimeout(300);
}

/** Every marked number on the page that counts something and opens nothing. */
async function unlinked(page: Page): Promise<string[]> {
  return page.locator('main [data-number]').evaluateAll(
    (els, date) =>
      els
        .map((el) => ({ el, text: (el.textContent ?? '').replace(/\s+/g, ' ').trim() }))
        .filter(({ el, text }) => /\d/.test(text) && !new RegExp(date).test(text) && (el as HTMLElement).offsetParent !== null)
        .filter(({ el }) => !el.closest('a[href], button, [role="tab"], [role="button"], [role="link"]'))
        .map(({ text }) => text),
    DATE.source,
  );
}

test.describe('every admin number opens the list it counts (D-267, spec § 4 rule 1) @console', () => {
  test.use({ viewport: { width: 1440, height: 900 }, timezoneId: PARITY_TZ, locale: 'en-US' });

  for (const path of SCREENS) {
    test(`no number without a link: ${path}`, async ({ page }) => {
      await open(page, path);
      const marked = await page.locator('main [data-number]').count();
      expect(await unlinked(page), `${path}: numbers that open nothing`).toEqual([]);
      // The walk saw something to check on the pages that have numbers.
      if (path === '/admin' || path === '/admin/cohort/dec26' || path === '/admin/cohort/jan27') expect(marked).toBeGreaterThan(0);
    });
  }

  test('Build completion opens the builds it counts (Connor, Nov 26)', async ({ page }) => {
    await open(page, '/admin');
    const tile = page.locator('main a').filter({ hasText: 'Build completion' });
    await expect(tile).toHaveAttribute('href', '/admin/program');
  });

  test('the walk fails on a number that is not a link (a planted one)', async ({ page }) => {
    await open(page, '/admin');
    await page.evaluate(() => {
      const plant = document.createElement('span');
      plant.setAttribute('data-number', '');
      plant.textContent = '42 learners';
      document.querySelector('main')!.appendChild(plant);
    });
    expect(await unlinked(page)).toEqual(['42 learners']);
  });
});
