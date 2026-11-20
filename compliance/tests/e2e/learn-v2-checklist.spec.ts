import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
import { DB_KEY } from '../../../packages/core/src/constants';
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { seed } from '../../../packages/core/src/seed';
import type { Db } from '../../../packages/core/src/types';
import type { PathBlock } from '../../../packages/core/src/course-types';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

/**
 * D-190, fixture only: a Week 0 step whose path holds checklist blocks. Nothing here is seeded
 * into production. Walk check, uncheck, the gate, done, undo, an accordion that survives reload,
 * 390 and 1440, light and dark.
 */

const LIVE = '2026-12-09T12:05:00-07:00';
const blocks: PathBlock[] = [
  { type: 'check', id: 's4-one', title: 'Watch the video', detail: 'The short one.' },
  { type: 'callout', kind: 'tip', text: 'Keep both files zipped.' },
  { type: 'check', id: 's4-two', title: 'Download the skills', role: 'operator' },
  { type: 'accordion', title: 'What ready looks like', body: ['A paid plan, and both skills on.'] },
];

const deployed = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const w0 = deployed.modules.find((m) => m.id === 'accelerator-week-0')!;
w0.checklist[3]!.paths = { claude: { blocks }, chatgpt: { blocks } };
const copy = Object.fromEntries((deployed.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value]));
const course = { open: true, preview: false, prelaunch: false, course: courseFor(deployed, Date.parse(LIVE), { open: true, preview: false }), sessions: courseSessions(deployed), copy };

function snapshot(): Db {
  const db = seed('live');
  db.modules.push(...deployed.modules.filter((m) => m.id.startsWith('accelerator-week-')));
  db.cohorts = [...deployed.cohorts, ...db.cohorts.filter((c) => !deployed.cohorts.some((x) => x.id === c.id))];
  return db;
}

async function open(browser: Browser, width: number): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, timezoneId: 'America/Denver', colorScheme: 'light' });
  const page = await ctx.newPage();
  // Seeded once per tab, so a reload keeps what the page stored (the remembered accordion).
  await page.addInitScript(
    ([key, db]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem(key, db);
      sessionStorage.setItem('seeded', '1');
    },
    [DB_KEY, JSON.stringify(snapshot())] as const,
  );
  await page.route('**/api/course', (r) => r.fulfill({ json: course }));
  await page.goto(`${APP_BASE}/learn/week/0/step/4?as=agent&now=${encodeURIComponent(LIVE)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  return page;
}

test.describe('a checklist step (D-190)', () => {
  test('checks, the gate, done, undo and a remembered accordion, at 1440 and 390, light and dark', async ({ browser }) => {
    const page = await open(browser, 1440);
    await expect(page.getByRole('heading', { name: 'Your Checklist' })).toBeVisible();
    await expect(page.getByText('Tip')).toBeVisible();
    // D-210: the v6 page's Mark step done is locked (aria-disabled) until every item is checked; a click still
    // lands, and says what is left.
    const mark = page.getByRole('button', { name: 'Mark step done' });
    await expect(mark).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled, not disabled: the click is real (Playwright waits for "enabled" unless forced).
    await mark.click({ force: true });
    await expect(page.getByRole('button', { name: 'Step done', exact: true })).toHaveCount(0);
    await expect(page.getByText('Check off 2 more to mark this step done.')).toBeVisible();

    await page.getByRole('checkbox', { name: 'Watch the video' }).click();
    await page.getByRole('checkbox', { name: 'Download the skills' }).click();
    await expect(mark).toHaveAttribute('aria-disabled', 'false');
    await mark.click();
    await expect(page.getByRole('button', { name: 'Step done', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('button', { name: 'Mark step done' })).toBeVisible();

    await page.getByText('What ready looks like').click();
    await expect(page.getByText('A paid plan, and both skills on.')).toBeVisible();
    await page.reload();
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(page.getByText('A paid plan, and both skills on.')).toBeVisible();
    await expectAccessible(page);

    // The step page has no account menu (D-210: no app chrome), so Dark is chosen on the week page.
    await page.goto(`${APP_BASE}/learn/week/0?as=agent&now=${encodeURIComponent(LIVE)}`);
    await page.waitForSelector('body[data-app-ready="true"]');
    await page.getByRole('button', { name: 'Your account' }).click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await page.goto(`${APP_BASE}/learn/week/0/step/4?as=agent&now=${encodeURIComponent(LIVE)}`);
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(page.locator('[data-learner-v2]')).toHaveAttribute('data-lv-theme', 'dark');
    await expectAccessible(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: 'Your Checklist' })).toBeVisible();
    await expectAccessible(page);
    await page.context().close();
  });
});
