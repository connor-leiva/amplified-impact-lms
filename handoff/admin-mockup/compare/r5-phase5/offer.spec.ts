// R-5 Phase 5 (D-262): December's offer page on this branch and on main, at the same instant, from a real API each
// (README.md says how the two servers and their databases were made). Each at 1280 and 390, device scale 2, its whole
// length; the two must not differ by one pixel (pixelmatch, threshold 0: any channel difference counts). Then Revenue ›
// Summary signed in as the Owner, whose AI Accelerator card now reads December's seat cap from its record: the same.
//
//   MAIN_BASE=http://127.0.0.1:4601 BRANCH_BASE=http://127.0.0.1:4602 \
//   REVENUE_MAIN_BASE=http://127.0.0.1:4603 REVENUE_BRANCH_BASE=http://127.0.0.1:4604 \
//     npx playwright test -c handoff/admin-mockup/compare/r5-phase5/shoot.config.ts offer
import { test, expect, type Browser } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const OUT = fileURLToPath(new URL('.', import.meta.url));
const MAIN = process.env.MAIN_BASE ?? 'http://127.0.0.1:4601';
const BRANCH = process.env.BRANCH_BASE ?? 'http://127.0.0.1:4602';
/** The same two databases, served with a fake, empty console Stripe in test mode (README.md), so Revenue draws its cards. */
const REVENUE_MAIN = process.env.REVENUE_MAIN_BASE ?? 'http://127.0.0.1:4603';
const REVENUE_BRANCH = process.env.REVENUE_BRANCH_BASE ?? 'http://127.0.0.1:4604';
/** The servers' FIXED_NOW: Fri, Nov 27, 2026, 12:00 PM MT, December's founding still open. */
const NOW = '2026-11-27T19:00:00.000Z';

async function shoot(browser: Browser, base: string, width: number): Promise<Buffer> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, timezoneId: 'America/Denver' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(`${base}/offer`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const png = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await ctx.close();
  return png;
}

for (const width of [1280, 390]) {
  test(`December's offer page at ${width}: this branch and main, pixel for pixel`, async ({ browser }) => {
    const main = PNG.sync.read(await shoot(browser, MAIN, width));
    const branchBuf = await shoot(browser, BRANCH, width);
    const branch = PNG.sync.read(branchBuf);
    writeFileSync(`${OUT}december-offer-${width}.png`, branchBuf);
    expect([branch.width, branch.height]).toEqual([main.width, main.height]);
    const diff = pixelmatch(main.data, branch.data, undefined, main.width, main.height, { threshold: 0 });
    console.log(`december-offer-${width}: ${main.width}x${main.height}, ${diff} px differ from main`);
    expect(diff).toBe(0);
  });
}

/** Revenue › Summary as the Owner: the admin frame scrolls inside itself, so the viewport grows to the content. */
async function revenue(browser: Browser, base: string, width: number): Promise<Buffer> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, timezoneId: 'America/Denver' });
  const signIn = await ctx.request.post(`${base}/api/test/session`, { data: { userId: 'st_owner' } });
  expect(signIn.ok()).toBe(true);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(`${base}/admin/revenue`);
  await page.locator('body[data-app-ready="true"]').waitFor();
  await page.locator('main').getByText('AI Accelerator', { exact: true }).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  const tall = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight, ...[...document.querySelectorAll<HTMLElement>('*')].filter((e) => e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)).map((e) => e.scrollHeight + e.getBoundingClientRect().top)),
  );
  await page.setViewportSize({ width, height: Math.max(900, Math.ceil(tall)) });
  await page.waitForTimeout(500);
  const png = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await ctx.close();
  return png;
}

for (const width of [1280, 390]) {
  test(`Revenue's AI Accelerator card at ${width}: December's cap from its record, as main showed it`, async ({ browser }) => {
    const main = PNG.sync.read(await revenue(browser, REVENUE_MAIN, width));
    const branchBuf = await revenue(browser, REVENUE_BRANCH, width);
    const branch = PNG.sync.read(branchBuf);
    writeFileSync(`${OUT}revenue-summary-${width}.png`, branchBuf);
    expect([branch.width, branch.height]).toEqual([main.width, main.height]);
    const diff = pixelmatch(main.data, branch.data, undefined, main.width, main.height, { threshold: 0 });
    console.log(`revenue-summary-${width}: ${main.width}x${main.height}, ${diff} px differ from main`);
    expect(diff).toBe(0);
  });
}
