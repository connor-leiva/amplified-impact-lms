import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// The course as the API sends it, built from the deployed seed. `compliance/` can't resolve `@ai/core`,
// so these are relative; the seed's own imports are relative too.
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

/**
 * D-180: the learner portal v2's Schedule (/learn/schedule), in the fixture build (where its flag is on),
 * with `GET /api/course` answered from the deployed seed in the pre-launch preview: Week 0 open, the rest
 * locked, eighteen sessions (Weeks 2 and 3 with a Thursday goal planning and a Friday office hour).
 *
 *   a11y      zero serious or critical axe violations on the weeks and the calendar, at 1440 and 390.
 *   overflow  nothing scrolls sideways, at 390, 768, 1024 and 1440.
 *   one h1    on each view.
 */

const NOW = '2026-11-18T14:00:00-07:00';
const db = planContentV2(
  planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db)
    .db,
).db;
const at = Date.parse(NOW);
const payload = {
  open: true,
  preview: false,
  prelaunch: true,
  course: courseFor(db, at, { open: true, preview: true }),
  sessions: courseSessions(db),
  copy: Object.fromEntries((db.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
};

const PAGES = ['/learn/schedule', '/learn/schedule?view=calendar'] as const;

async function open(browser: Browser, path: string, width: number): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'America/Denver' });
  const page = await ctx.newPage();
  await page.route('**/api/course', (r) => r.fulfill({ json: payload }));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=agent&now=${encodeURIComponent(NOW)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  return page;
}

const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('learner portal v2: the Schedule (D-180) @g9', () => {
  for (const width of [1440, 390])
    for (const path of PAGES)
      test(`${path} at ${width}: accessible, one h1, no sideways scroll`, async ({ browser }) => {
        const page = await open(browser, path, width);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('h1')).toHaveText('Schedule');
        await expectAccessible(page);
        expect(await sideways(page)).toBe(0);
        await page.context().close();
      });

  for (const width of [768, 1024])
    test(`no sideways scroll at ${width}`, async ({ browser }) => {
      for (const path of PAGES) {
        const page = await open(browser, path, width);
        expect(await sideways(page), path).toBe(0);
        await page.context().close();
      }
    });

  test('the switch, the month grid on a desk and the session list on a phone', async ({ browser }) => {
    const page = await open(browser, '/learn/schedule', 1440);
    await expect(page.getByRole('region', { name: 'Nine weeks' }).getByRole('note')).toContainText('Holiday break');
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Calendar' }).click();
    await expect(page.getByRole('table', { name: 'December 2026' })).toBeVisible();
    await expect(page.locator('section[aria-label="All sessions"]')).toBeHidden();
    await page.getByRole('button', { name: 'Next month' }).click();
    await expect(page.getByRole('table', { name: 'January 2027' })).toBeVisible();
    await expectAccessible(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(page.locator('section[aria-label="All sessions"]')).toBeVisible();
    await expect(page.getByRole('table')).toBeHidden();
    await page.context().close();
  });

  test('phone tap targets: the view switch is 44px tall', async ({ browser }) => {
    const page = await open(browser, '/learn/schedule', 390);
    for (const name of ['Weeks', 'Calendar']) {
      const box = await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name }).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.context().close();
  });
});
