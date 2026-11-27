// R-5 Phase 7 (D-268): People, Utah Life and the cohort's roster, fixture build, on the R2 reference's data (the parity
// world, `?parity=r2`: the mockup's people, teams and Utah Life's agents). Every screen its whole length at 1440, 1280,
// 1024 and 390 (each has a table). Device scale 2, America/Denver.
//
//   pnpm --filter @ai/web preview:fixture   # on :4173
//   npx playwright test -c handoff/admin-mockup/compare/r5-phase7/shoot.config.ts shoot
import { test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { APP_BASE, PARITY_NOW, PARITY_QUERY, PARITY_TZ } from '../../../../compliance/lib/admin-r2';

const OUT = fileURLToPath(new URL('.', import.meta.url));

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}
async function shootPage(page: Page, name: string, width: number): Promise<void> {
  await settle(page);
  // The admin frame scrolls inside itself, so the page's whole length is its tallest scroller's: the viewport grows to it.
  const view = page.viewportSize()!;
  const tall = await page.evaluate(() =>
    Math.max(
      document.documentElement.scrollHeight,
      ...[...document.querySelectorAll<HTMLElement>('*')]
        .filter((e) => e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY))
        .map((e) => e.scrollHeight + e.getBoundingClientRect().top),
    ),
  );
  await page.setViewportSize({ width: view.width, height: Math.max(view.height, Math.ceil(tall)) });
  await settle(page);
  await page.screenshot({ path: `${OUT}${name}-${width}.png`, fullPage: true });
  await page.setViewportSize(view);
}

const SCREENS: [name: string, path: string][] = [
  ['everyone', '/admin/people'],
  ['everyone-utah-life', '/admin/people'],
  ['teams', '/admin/people/teams'],
  ['utah-life', '/admin/people/groups/utah-life'],
  ['team', '/admin/people/teams/ws_northshore'],
  ['person', '/admin/people/u_1042'],
  ['cohort-people', '/admin/cohort/dec26/people'],
  ['cohort-people-learners', '/admin/cohort/dec26/people?tab=learners'],
  ['cohort-submissions', '/admin/cohort/dec26/submissions'],
  ['cohort-submissions-teams', '/admin/cohort/dec26/submissions?view=teams'],
  ['cohort-submissions-asks', '/admin/cohort/dec26/submissions?view=asks'],
  ['cohort-submissions-files', '/admin/cohort/dec26/submissions?view=files'],
];

for (const width of [1440, 1280, 1024, 390]) {
  test(`People and the cohort's roster at ${width}`, async ({ browser }) => {
    const ctx = await browser.newContext({ timezoneId: PARITY_TZ, locale: 'en-US', viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(PARITY_NOW));
    for (const [name, path] of SCREENS) {
      await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}${PARITY_QUERY}`);
      await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
      await page.locator('main').waitFor();
      // Everyone, filtered to Utah Life by its chip.
      if (name === 'everyone-utah-life') await page.getByRole('group', { name: 'Audience' }).getByRole('button', { name: /^Utah Life/ }).click();
      await page.mouse.move(0, 0);
      await shootPage(page, name, width);
    }
    await ctx.close();
  });
}
