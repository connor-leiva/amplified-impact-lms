import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// The course as the API sends it, built from the deployed seed. `compliance/` can't resolve `@ai/core`,
// so these are relative; the seed's own imports are relative too.
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { COHORT_ONE_LIVE_UNTIL } from '../../../packages/core/src/offer';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

/**
 * D-178: the learner Account page (/learn/account), in the fixture build (where the learner v2 flag is
 * on), with the reads it uses answered as the API would: `GET /api/course` from the deployed seed, and
 * `GET /api/skills` and `GET /api/auth/password` for an AI Accelerator owner. The snapshot is the
 * fixture's own (the demo owner and their team).
 *
 *   a11y      zero serious or critical axe violations at 1440 and 390, and one h1.
 *   overflow  nothing scrolls sideways, at 390, 768, 1024 and 1440.
 *   nav       the account menu's Account opens this page.
 */

const NOW = '2026-11-18T14:00:00-07:00';
const db = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const at = Date.parse(NOW);
const course = {
  open: true,
  preview: false,
  prelaunch: true,
  course: courseFor(db, at, { open: true, preview: true }),
  sessions: courseSessions(db),
  copy: Object.fromEntries((db.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
};
const skills = {
  plans: [{ kind: 'cohort', status: 'active', paidThrough: COHORT_ONE_LIVE_UNTIL }],
  accessGroups: [],
  paused: false,
  courseOpensAt: null,
  teamHub: true,
  skills: Array.from({ length: 53 }, (_, i) => ({ id: `s${i}`, title: 'Skill', summary: '', sets: i < 30 ? 'owner_ops' : i < 50 ? 'agent' : 'both', free: false, releasedAt: 0, state: 'open', opensAt: null, files: [] })),
};
const password = { hasPassword: true, changedAt: Date.parse('2026-11-12T16:00:00Z') };

async function open(browser: Browser, path: string, width: number): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'America/Denver' });
  const page = await ctx.newPage();
  await page.route('**/api/course', (r) => r.fulfill({ json: course }));
  await page.route('**/api/skills', (r) => r.fulfill({ json: skills }));
  await page.route('**/api/auth/password', (r) => r.fulfill({ json: password }));
  await page.goto(`${APP_BASE}${path}?as=owner&now=${encodeURIComponent(NOW)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  return page;
}

test.describe('learner portal v2, Account (D-178) @g9', () => {
  for (const width of [1440, 390])
    test(`/learn/account at ${width}: accessible, one h1, no sideways scroll`, async ({ browser }) => {
      const page = await open(browser, '/learn/account', width);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('Account');
      await expect(page.getByRole('link', { name: 'Manage billing' })).toHaveAttribute('href', '/api/billing/portal');
      await expect(page.getByText('Last changed Nov 12, 2026')).toBeVisible();
      await expect(page.getByRole('region', { name: 'What’s included' })).toContainText('All 53 skills, owner and agent');
      // No time-zone picker (the brief), no money and no Save.
      await expect(page.locator('main select')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Save/ })).toHaveCount(0);
      await expectAccessible(page);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over).toBe(0);
      await page.context().close();
    });

  for (const width of [768, 1024])
    test(`no sideways scroll at ${width}`, async ({ browser }) => {
      const page = await open(browser, '/learn/account', width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      await page.context().close();
    });

  test('on a phone, every control is at least 44px tall', async ({ browser }) => {
    const page = await open(browser, '/learn/account', 390);
    const short = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('main a, main button, main input')]
        .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height < 44)
        .map((el) => el.textContent || el.getAttribute('aria-label') || el.id),
    );
    expect(short).toEqual([]);
    await page.context().close();
  });

  test('the account menu’s Account opens the page', async ({ browser }) => {
    const page = await open(browser, '/learn', 1440);
    await page.getByRole('button', { name: 'Your account' }).click();
    await page.getByRole('menuitem', { name: 'Account' }).click();
    await expect(page).toHaveURL(/\/learn\/account/);
    await expect(page.locator('h1')).toHaveText('Account');
    await page.context().close();
  });
});
