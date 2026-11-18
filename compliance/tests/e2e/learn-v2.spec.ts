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
 * D-177: the learner portal v2 (/learn), in the fixture build (where its flag is on), with
 * `GET /api/course` answered from the deployed seed: Week 0 open in the pre-launch preview, the rest
 * locked. The fixture's snapshot is the demo's, so no step carries a progress id here; the view-model
 * and render tests cover progress.
 *
 *   a11y      zero serious or critical axe violations on Home, a week, a step, a locked week and the
 *             phone drawer, at 1440 and 390.
 *   overflow  nothing scrolls sideways, at 390, 768, 1024 and 1440.
 *   landmarks the shell's required landmarks, and the drawer as a modal dialog with data-drawer="open".
 */

const NOW = '2026-11-18T14:00:00-07:00';
const db = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const at = Date.parse(NOW);
const payload = {
  open: true,
  preview: false,
  prelaunch: true,
  course: courseFor(db, at, { open: true, preview: true }),
  sessions: courseSessions(db),
  copy: Object.fromEntries((db.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
};

const PAGES = ['/learn', '/learn/week/0', '/learn/week/0/step/4', '/learn/week/2'] as const;

async function open(browser: Browser, path: string, width: number): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'America/Denver' });
  const page = await ctx.newPage();
  await page.route('**/api/course', (r) => r.fulfill({ json: payload }));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=agent&now=${encodeURIComponent(NOW)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  return page;
}

test.describe('learner portal v2 (D-177) @g9', () => {
  for (const width of [1440, 390])
    for (const path of PAGES)
      test(`${path} at ${width}: accessible, no sideways scroll`, async ({ browser }) => {
        const page = await open(browser, path, width);
        await expect(page.locator('h1')).toHaveCount(1);
        await expectAccessible(page);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(over).toBe(0);
        await page.context().close();
      });

  test('the shell’s landmarks, and the phone drawer as a modal dialog', async ({ browser }) => {
    const page = await open(browser, '/learn', 390);
    await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('[data-brand-slot]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Open menu' }).click();
    const drawer = page.locator('[role="dialog"][data-drawer="open"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('aside[aria-label="Primary"]')).toHaveCount(1);
    await expectAccessible(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-drawer="open"]')).toHaveCount(0);
    await page.context().close();
  });

  for (const width of [768, 1024])
    test(`no sideways scroll at ${width}`, async ({ browser }) => {
      for (const path of PAGES) {
        const page = await open(browser, path, width);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBe(0);
        await page.context().close();
      }
    });

  test('the step player switches between Claude and ChatGPT', async ({ browser }) => {
    const page = await open(browser, '/learn/week/0/step/4', 1440);
    await expect(page.getByText('A paid Claude plan')).toBeVisible();
    await page.getByRole('radio', { name: 'ChatGPT' }).click();
    await expect(page.getByText('A paid ChatGPT plan')).toBeVisible();
    await page.context().close();
  });
});
