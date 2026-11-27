// R-5 Phase 8 (D-269): Revenue › Summary, its whole length at 1440, 1280, 1024 and 390 (it has tables). Device scale 2,
// America/Denver.
//
//   1. The fixture build, on the R2 reference's data (the parity world, `?parity=r2`): All time, This month, and the
//      plain fixture with Stripe unreadable (`?console-state=stripe_off`).
//        pnpm --filter @ai/web preview:fixture   # on :4173
//   2. The http build against the real API with a fake Stripe in test mode (`serve-http.sh`, on :4391): All time and
//      This month, signed in as the Owner.
//
//   npx playwright test -c handoff/admin-mockup/compare/r5-phase8/shoot.config.ts shoot
import { readFileSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { APP_BASE, PARITY_NOW, PARITY_QUERY, PARITY_TZ } from '../../../../compliance/lib/admin-r2';

const OUT = fileURLToPath(new URL('.', import.meta.url));
const HTTP = 'http://127.0.0.1:4391';
const COOKIE = fileURLToPath(new URL('../../../../compliance/test-results/r5-phase8-cookie.txt', import.meta.url));

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

const FIXTURE: [name: string, query: string][] = [
  ['revenue-summary', PARITY_QUERY],
  ['revenue-summary-this-month', `period=month&${PARITY_QUERY}`],
  ['revenue-summary-stripe-unreadable', 'console-state=stripe_off&as=admin'],
];
const LIVE: [name: string, query: string][] = [
  ['http-revenue-summary', ''],
  ['http-revenue-summary-this-month', '?period=month'],
];

for (const width of [1440, 1280, 1024, 390]) {
  test(`Revenue › Summary, fixture, at ${width}`, async ({ browser }) => {
    const ctx = await browser.newContext({ timezoneId: PARITY_TZ, locale: 'en-US', viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(PARITY_NOW));
    for (const [name, query] of FIXTURE) {
      await page.goto(`${APP_BASE}/admin/revenue?${query}`);
      await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
      await page.locator('main').getByText('Cash collected').waitFor();
      await shootPage(page, name, width);
    }
    await ctx.close();
  });

  test(`Revenue › Summary, http with a fake Stripe, at ${width}`, async ({ browser }) => {
    const [cname, ...rest] = readFileSync(COOKIE, 'utf8').trim().split('=');
    const ctx = await browser.newContext({ timezoneId: 'America/Denver', locale: 'en-US', viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 2 });
    await ctx.addCookies([{ name: cname!, value: rest.join('='), url: HTTP }]);
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(PARITY_NOW));
    for (const [name, query] of LIVE) {
      await page.goto(`${HTTP}/admin/revenue${query}`);
      await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
      await page.locator('main').getByText('Coming In').waitFor();
      await shootPage(page, name, width);
    }
    await ctx.close();
  });
}
