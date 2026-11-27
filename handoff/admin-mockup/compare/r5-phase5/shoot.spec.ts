// R-5 Phase 5 (D-262): the admin's selling screens, fixture build, launch database (README.md). Each at 1280 and 390,
// device scale 2, America/Denver; a page is its whole length, a dialog the viewport at the page top with it open.
//
//   pnpm --filter @ai/web preview:fixture   # on :4173
//   npx playwright test -c handoff/admin-mockup/compare/r5-phase5/shoot.config.ts shoot
import { test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { launchDb } from '../../../../compliance/lib/launch-db';
import { JAN_KEYS, JAN_LINKS, januaryFacts, openAt, withJanuary } from '../../../../compliance/lib/selling-world';

const OUT = fileURLToPath(new URL('.', import.meta.url));
const card = (page: Page) => page.locator('main #cohort-enrollment');

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}
async function shootPage(page: Page, name: string, width: number): Promise<void> {
  await settle(page);
  // The admin frame scrolls inside itself, so the page's whole length is its tallest scroller's: the viewport grows to it.
  const view = page.viewportSize()!;
  const tall = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight, ...[...document.querySelectorAll<HTMLElement>('*')].filter((e) => e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)).map((e) => e.scrollHeight + e.getBoundingClientRect().top)),
  );
  await page.setViewportSize({ width: view.width, height: Math.max(view.height, Math.ceil(tall)) });
  await settle(page);
  await page.screenshot({ path: `${OUT}${name}-${width}.png`, fullPage: true });
  await page.setViewportSize(view);
}
async function shootDialog(page: Page, name: string, width: number): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await page.screenshot({ path: `${OUT}${name}-${width}.png` });
}
/** Another of the app's addresses, the fixture's query kept (the tab's database stays: `openAt`). */
async function go(page: Page, path: string): Promise<void> {
  const url = new URL(page.url());
  url.pathname = path;
  await page.goto(url.toString());
  await page.locator('body[data-app-ready="true"]').waitFor();
}
/** Let the toasts go before a page shot. */
async function quiet(page: Page): Promise<void> {
  await page.locator('[data-tone="success"]').first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);
}

for (const width of [1280, 390]) {
  test(`December at ${width}`, async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/cohort/dec26/settings', { db: launchDb(), width, context: { deviceScaleFactor: 2 } });
    await shootPage(page, 'december-settings', width);
    await card(page).getByRole('button', { name: 'Change the price' }).click();
    await shootDialog(page, 'december-price', width);
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await card(page).getByRole('button', { name: 'Edit enrollment' }).click();
    await shootDialog(page, 'december-enrollment', width);
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await go(page, '/admin/cohort/dec26');
    await shootPage(page, 'december-overview', width);
    await go(page, '/admin/cohort/new');
    await shootPage(page, 'new-cohort', width);
    await close();
  });

  test(`January at ${width}`, async ({ browser }) => {
    const { db, id } = withJanuary();
    const { page, close } = await openAt(browser, `/admin/cohort/${id}/settings`, { db, facts: januaryFacts(id), width, context: { deviceScaleFactor: 2 } });
    const dialog = page.getByRole('dialog');
    await shootPage(page, 'january-settings', width);
    await card(page).getByRole('button', { name: 'Open enrollment' }).click();
    await shootDialog(page, 'january-open-refused', width);
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await card(page).getByRole('button', { name: 'Set the price' }).click();
    await dialog.getByLabel('Lookup key, paid in full').fill(JAN_KEYS.full);
    await dialog.getByLabel('Lookup key, Insiders after').fill(JAN_KEYS.rollover);
    await dialog.getByLabel('Lookup key, two payments').fill(JAN_KEYS.twoPay);
    await shootDialog(page, 'january-price-typed', width);
    await dialog.getByRole('button', { name: 'Save price' }).click();
    await quiet(page);
    await card(page).getByRole('button', { name: 'Change the price' }).click();
    await shootDialog(page, 'january-price', width);
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await card(page).getByRole('button', { name: 'Edit enrollment' }).click();
    await dialog.getByLabel('Founding closes', { exact: true }).fill('2026-12-31');
    await dialog.getByLabel('Time (MT)').fill('23:59');
    await dialog.getByLabel('Payment Link, paid in full').fill(JAN_LINKS.full);
    await dialog.getByLabel('Payment Link, two payments').fill(JAN_LINKS.twoPay);
    await shootDialog(page, 'january-enrollment', width);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await quiet(page);

    await go(page, `/admin/cohort/${id}`);
    await shootPage(page, 'january-before-it-opens', width);
    await go(page, `/admin/cohort/${id}/settings`);
    await card(page).getByRole('button', { name: 'Open enrollment' }).click();
    await shootDialog(page, 'january-open-ready', width);
    await dialog.getByRole('button', { name: 'Open enrollment' }).click();
    await quiet(page);
    await shootPage(page, 'january-settings-open', width);
    await card(page).getByRole('button', { name: 'Close enrollment' }).click();
    await shootDialog(page, 'january-close', width);
    await dialog.getByRole('button', { name: 'Close enrollment' }).click();
    await quiet(page);
    await shootPage(page, 'january-settings-closed', width);
    await close();
  });
}
