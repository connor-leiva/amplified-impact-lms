// R-5 Phase 9 (D-270): the screens this phase builds or changes, their whole length, at 1440, 1280, 1024 and 390 (the
// Overview and People have lists that become tables) and the two dialogs at 1280 and 390. Device scale 2, America/Denver.
//
//   1. The fixture build, on the R2 reference's data (the parity world, `?parity=r2`): the Overview, Cohort › Settings
//      (its Clean-Up card), People › Everyone filtered as the Overview's audience bar opens it, and the palette finding a
//      cohort; and the plain fixture after December's last session, its enrollment closed, with Archive's dialog open.
//        pnpm --filter @ai/web preview:fixture   # on :4173
//   2. The http build against the real API with a fake Stripe in test mode (`serve-http.sh`, on :4391): the Overview,
//      signed in as the Owner, with a Utah Life agent and a test account in the database.
//
//   npx playwright test -c handoff/admin-mockup/compare/r5-phase9/shoot.config.ts shoot
import { readFileSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { APP_BASE, PARITY_NOW, PARITY_QUERY, PARITY_TZ } from '../../../../compliance/lib/admin-r2';

const OUT = fileURLToPath(new URL('.', import.meta.url));
const HTTP = 'http://127.0.0.1:4391';
const COOKIE = fileURLToPath(new URL('../../../../compliance/test-results/r5-phase9-cookie.txt', import.meta.url));

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
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
const shootView = async (page: Page, name: string, width: number) => {
  await settle(page);
  await page.screenshot({ path: `${OUT}${name}-${width}.png` });
};

const ctxAt = (browser: import('@playwright/test').Browser, width: number) =>
  browser.newContext({ timezoneId: PARITY_TZ, locale: 'en-US', viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 2 });

for (const width of [1440, 1280, 1024, 390]) {
  test(`fixture, parity world, at ${width}`, async ({ browser }) => {
    const ctx = await ctxAt(browser, width);
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(PARITY_NOW));
    for (const [name, path, wait] of [
      ['overview', '/admin', 'Who Has a Sign-In'],
      ['cohort-settings', '/admin/cohort/dec26/settings', 'Archive this cohort'],
      ['people-filtered', '/admin/people?gotIn=plan%3Acohort', 'Devon Achterberg'],
    ] as const) {
      await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}${PARITY_QUERY}`);
      await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
      await page.locator('main').getByText(wait).first().waitFor();
      await shootPage(page, name, width);
    }
    if (width === 1280 || width === 390) {
      await page.goto(`${APP_BASE}/admin?${PARITY_QUERY}`);
      await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
      if (width < 768) await page.getByRole('button', { name: 'Search' }).first().click();
      else await page.keyboard.press('Control+k');
      await page.getByRole('combobox', { name: 'Command palette search' }).fill('cohort');
      await page.getByRole('group', { name: 'Cohorts' }).waitFor();
      await shootView(page, 'palette-cohorts', width);
    }
    await ctx.close();
  });

  if (width === 1280 || width === 390)
    test(`fixture, Archive's dialog, at ${width}`, async ({ browser }) => {
      const now = '2027-02-01T17:00:00.000Z';
      const ctx = await ctxAt(browser, width);
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date(now));
      await page.goto(`${APP_BASE}/admin/cohort/dec26/settings?as=admin&now=${encodeURIComponent(now)}`);
      await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
      await page.locator('#cohort-enrollment').getByRole('button', { name: 'Close enrollment' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Close enrollment' }).click();
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Archive…' }).click();
      await page.getByRole('dialog', { name: /^Archive the / }).waitFor();
      await shootView(page, 'archive-dialog', width);
      await ctx.close();
    });

  test(`http with a fake Stripe, at ${width}`, async ({ browser }) => {
    const [cname, ...rest] = readFileSync(COOKIE, 'utf8').trim().split('=');
    const ctx = await browser.newContext({ timezoneId: 'America/Denver', locale: 'en-US', viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 2 });
    await ctx.addCookies([{ name: cname!, value: rest.join('='), url: HTTP }]);
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(PARITY_NOW));
    await page.goto(`${HTTP}/admin`);
    await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
    await page.locator('main').getByRole('heading', { name: 'Who Has a Sign-In' }).waitFor();
    await page.locator('main').getByText(/collected$/).first().waitFor();
    await shootPage(page, 'http-overview', width);
    await ctx.close();
  });
}
