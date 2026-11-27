import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-165: API & Webhooks and Scheduled Jobs on R2 (spec §§ 7.9-7.10), in the fixture build, on the R2
 * mockup's own records. The behaviour: the stats, both tabs at their own addresses, the source filter,
 * the GHL retry through the R2 Confirm (a Stripe delivery is view-only, D13), Run Now through the R2
 * Confirm (billing never, D14), and Support seeing both screens with neither Retry nor Run Now (D3).
 * Every screen and dialog passes axe.
 */

const NOW = '2026-12-10T09:30:00-07:00';

async function openAt(
  browser: Browser,
  path: string,
  opts: { width?: number } = {},
): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({
    timezoneId: 'America/Phoenix',
    viewport: { width: opts.width ?? 1280, height: 900 },
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript(() =>
    localStorage.setItem('ai-lms-prefs', JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' })),
  );
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const rows = (page: Page) =>
  page.locator('main [role="table"] [role="row"]').filter({ has: page.locator('[role="cell"]') });
const crumbs = (page: Page) => page.locator('header nav[aria-label="Breadcrumb"]');
const toast = (page: Page, text: string) => page.locator('[role="status"]').filter({ hasText: text });

test.describe('API & Webhooks on R2 (D-165) @g9 @console', () => {
  test('the stats and Endpoints; the Failed deliveries tile opens the deliveries at their own address', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/api');
    await expect(page.getByRole('heading', { level: 1, name: 'API & Webhooks' })).toBeVisible();
    await expect(crumbs(page)).toHaveText('Admin/Operations/API & Webhooks');
    const main = page.locator('main');
    for (const t of [
      'p95 latency',
      '212 ms',
      'Error rate',
      '0.4%',
      'Requests, 24h',
      '76,320',
      'Failed deliveries',
      '3 GHL, 1 Stripe',
    ])
      await expect(main).toContainText(t);
    await expect(rows(page)).toHaveCount(8);
    await expect(rows(page).last()).toContainText('POST /api/crm-sync');
    await expect(rows(page).last()).toContainText('High');
    await expectAccessible(page);
    await page.getByRole('link', { name: /Failed deliveries/ }).click();
    await expect(page).toHaveURL(/\/admin\/api\/hooks/);
    await expect(page.getByRole('tab', { name: /Webhook deliveries/ })).toHaveAttribute('aria-selected', 'true');
    await expect(crumbs(page)).toHaveText('Admin/Operations/API & Webhooks');
    await expect(rows(page)).toHaveCount(7);
    await expect(main).toContainText('Payloads and signing secrets are not shown.');
    await page.getByRole('combobox', { name: 'Source' }).selectOption('Stripe');
    await expect(rows(page)).toHaveCount(3);
    await expectAccessible(page);
    await close();
  });

  test('Retry now… resets a GHL delivery through the confirm; a Stripe one is view-only, with its Dashboard link', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/api/hooks');
    const first = rows(page).first();
    await expect(first).toContainText('ord_2291');
    await expect(first).toContainText('Failed');
    await first.getByRole('button', { name: 'More actions' }).click();
    // D-167: it opens the Incidents screen.
    await expect(page.getByRole('menuitem', { name: 'Related incidents' })).toBeEnabled();
    await page.getByRole('menuitem', { name: 'Retry now…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Retry order.sync for ord_2291?' });
    await expect(dialog).toContainText(
      'Sends this GoHighLevel delivery again now. Handlers are idempotent, so a repeat is safe.',
    );
    await expect(dialog).toContainText('This action is audit-logged.');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Retry delivery' }).click();
    await expect(toast(page, 'Retry queued')).toBeVisible();
    await expect(rows(page).first()).toContainText('Queued');
    await expect(rows(page).first()).toContainText('0 of 5');

    const stripe = rows(page).filter({ hasText: 'evt_1QxN1hHm79' });
    await stripe.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Retry now…' })).toBeDisabled();
    await expect(page.getByRole('menuitem', { name: 'View in Stripe' })).toBeVisible();
    await close();
  });
});

test.describe('Scheduled Jobs on R2 (D-165) @g9 @console', () => {
  test('every job; Run Now through the confirm; billing runs on its schedule only', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/jobs');
    await expect(page.getByRole('heading', { level: 1, name: 'Scheduled Jobs' })).toBeVisible();
    await expect(crumbs(page)).toHaveText('Admin/Operations/Scheduled Jobs');
    await expect(rows(page)).toHaveCount(12);
    await expect(page.locator('main')).toContainText(
      'The billing job only runs on its schedule. It cannot be started by hand.',
    );
    await expectAccessible(page);

    const billing = rows(page)
      .filter({ hasText: /^billing/ })
      .first();
    await billing.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Run now is off for billing' })).toBeDisabled();
    await page.keyboard.press('Escape');

    const first = rows(page).first();
    await first.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Run now…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Run session-24h now?' });
    await expect(dialog).toContainText(
      'Starts one extra run outside the schedule (every 5 min). Anything already sent is skipped.',
    );
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Run session-24h' }).click();
    await expect(toast(page, 'session-24h started')).toBeVisible();
    // The manual run is now its latest: no longer the mockup's 9:20 AM.
    await expect(rows(page).first()).not.toContainText('Dec 10, 9:20 AM MT / 10:20 AM CT');
    await expect(rows(page).first()).toContainText('Succeeded');
    await close();
  });

  test('a failed job’s Open incident goes to the Incidents screen (D-167)', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/jobs');
    const failed = rows(page).filter({ hasText: 'ghl-orders' });
    await failed.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Run now is off for ghl-orders' })).toBeDisabled();
    await page.getByRole('menuitem', { name: 'Open incident' }).click();
    await expect(page).toHaveURL(/\/admin\/incidents$|\/admin\/incidents\?/);
    await close();
  });
});

test.describe('Support sees both screens, without Retry or Run Now (D-165, D3) @g9 @console', () => {
  test('no Run Now, no Retry; the lists and the sidebar rows are there', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/jobs?console-role=Support');
    await expect(rows(page)).toHaveCount(12);
    await rows(page).filter({ hasText: 'ghl-orders' }).getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Open incident' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Run now/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    const aside = page.locator('aside[aria-label="Primary"]');
    await expect(aside.getByRole('button', { name: 'API & Webhooks' })).toBeVisible();
    await expect(aside.getByRole('button', { name: 'Scheduled Jobs' })).toBeVisible();

    await page.goto(`${APP_BASE}/admin/api/hooks?as=admin&console-role=Support`);
    await page.locator('body[data-app-ready="true"]').waitFor();
    await expect(rows(page)).toHaveCount(7);
    await rows(page).first().getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Related incidents' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Retry now…' })).toHaveCount(0);
    await expectAccessible(page);
    await close();
  });
});
