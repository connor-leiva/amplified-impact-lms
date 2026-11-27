import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-163: Billing on R2, read-only (spec § 7.6), in the fixture build. The Console fixture answers with
 * the R2 mockup's own Billing figures and records (`apps/web/src/data/console-fixture-billing.ts`), so
 * these read the mockup's words. The Summary's pixels are `pnpm parity:admin-r2`'s; these hold the
 * behaviour: the tabs at their own addresses, rows opening their workspace, "View in Stripe", the
 * actions' places (D-164 opens them: `admin-r2-billing-actions.spec.ts`), Support's read-only view,
 * Denied and the shared states. Every screen and state passes axe (zero serious or critical). D-253 (R-5 Phase 1): the
 * Summary is Revenue › Summary (`/admin/revenue`, Billing's own until Phase 8) and the lists are Revenue › Payments
 * (`/admin/revenue/payments[/:tab]`), their tabs a segmented control; every `/admin/billing…` address lands there.
 */

const NOW = '2026-12-10T09:30:00-07:00';

async function openAt(
  browser: Browser,
  path: string,
  width = 1280,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width, height: 900 } });
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

test.describe('Billing on R2 (D-163) @g9 @console', () => {
  test('the Summary: the stats, the plan lines and the AI Accelerator card, with its view-only cap', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/billing');
    await expect(page).toHaveURL(/\/admin\/revenue\?/);
    await expect(page.getByRole('heading', { level: 1, name: 'Revenue' })).toBeVisible();
    await expect(crumbs(page)).toHaveText('Admin/Revenue/Summary');
    await expect(page.locator('aside[aria-label="Primary"] [aria-current="page"]')).toContainText('Revenue');
    await expect(page.getByRole('tab', { name: 'Summary' })).toHaveAttribute('aria-selected', 'true');
    // The lists are Payments' (the Summary draws no segmented control of its own).
    await expect(page.getByRole('tab', { name: /^Failed payments/ })).toHaveCount(0);
    // The Owner may act, so no read-only pill.
    await expect(page.getByText('Read-only for your role')).toHaveCount(0);
    for (const t of [
      'MRR · sample',
      '$18,516',
      '+$695 this week',
      '77',
      'Needs review',
      'Refunds, 30d',
      'Plan economics · sample figures',
      '212 agents',
      '11 of 15 seats',
    ])
      await expect(page.locator('main').getByText(t, { exact: true }).first()).toBeVisible();
    const card = page.locator('main section').filter({ has: page.getByRole('heading', { name: 'AI Accelerator' }) });
    await expect(card).toContainText('$7,500, or two payments of $3,750');
    await expect(card).toContainText('11 of 15');
    await expect(card).toContainText('15 seats. Product rule, view only.');
    await expect(card).toContainText('4 × $3,750 = $15,000');
    // The cap is view-only: nothing on the card can be changed.
    await expect(card.locator('button, input, select, textarea')).toHaveCount(0);
    await expectAccessible(page);
    // A stat that goes somewhere is a link to its tab.
    await page.getByRole('link', { name: /Failed payments/ }).click();
    await expect(page).toHaveURL(/\/admin\/revenue\/payments\/failed(\?|$)/);
    await expect(page.getByRole('tab', { name: /^Failed payments\s*3$/ })).toHaveAttribute('aria-selected', 'true');
    await expect(rows(page)).toHaveCount(3);
    await close();
  });

  test('the lists: each tab at its address, a row opens its workspace, and "View in Stripe"', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/revenue/payments');
    await expect(page.getByRole('tab', { name: 'Customers' })).toHaveAttribute('aria-selected', 'true');
    await expect(rows(page)).toHaveCount(7);
    await expect(rows(page).first()).toContainText('cus_Rk3NshoreA1');
    await expectAccessible(page);
    await page.getByRole('tab', { name: 'Subscriptions' }).click();
    await expect(page).toHaveURL(/\/admin\/revenue\/payments\/subscriptions(\?|$)/);
    await expect(crumbs(page)).toHaveText('Admin/Revenue/Payments');
    await expect(rows(page)).toHaveCount(6);
    await page.getByRole('tab', { name: 'Refunds' }).click();
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Canceled inside trial window');
    await expect(rows(page).first()).toContainText('Nov 1, 4:44 PM MT / 5:44 PM CT');
    await page.getByRole('tab', { name: 'Invoices' }).click();
    await expect(rows(page)).toHaveCount(6);
    await expectAccessible(page);

    // Paid: Refund… (D-164 opens it; `admin-r2-billing-actions.spec.ts`), and no void.
    await rows(page).first().getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: /Refund…/ })).toBeEnabled();
    await expect(page.getByRole('menuitem', { name: /Void invoice…/ })).toHaveCount(0);
    // Never Stripe itself (no live calls): the Dashboard page is answered here.
    await page
      .context()
      .route('https://dashboard.stripe.com/**', (r) =>
        r.fulfill({ contentType: 'text/html', body: '<title>Stripe</title>' }),
      );
    const popup = page.waitForEvent('popup');
    await page.getByRole('menuitem', { name: 'View in Stripe' }).click();
    expect((await popup).url()).toBe('https://dashboard.stripe.com/test/invoices/in_1QxT4mNs0291');
    // Open: Void invoice… instead.
    await rows(page).nth(4).getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: /Void invoice…/ })).toBeEnabled();
    await expect(page.getByRole('menuitem', { name: /Refund…/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    // A row opens its workspace.
    await rows(page).first().getByRole('cell').nth(1).click();
    await expect(page).toHaveURL(/\/admin\/people\/teams\/ws_northshore(\?|$)/);

    // Failed payments: "Open email log" opens the Email Log for the customer's workspace (D-166).
    await page.goto(`${APP_BASE}/admin/revenue/payments/failed?as=admin`);
    await rows(page).first().getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Open email log' }).click();
    await expect(page).toHaveURL(/\/admin\/email\?teamId=ws_tidewater&workspace=Tidewater/);
    await expect(page.getByRole('heading', { level: 1, name: 'Email Log' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Workspace: Tidewater Property Co.' })).toBeVisible();
    await close();
  });

  test('Support reads billing: the read-only pill, and no refund or void at all', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/revenue/payments/invoices?console-role=Support');
    // D-253: inside a tab a page's head drops its title but keeps its description, its status and its actions, so
    // Payments keeps the read-only pill (Connor, Nov 25, 2026; the mockup's `AreaCtx` drops it). Support still has no
    // refund or void, and every tab of Revenue.
    await expect(page.getByText('Read-only for your role')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Billing' })).toHaveCount(0);
    await expect(page.getByRole('tablist', { name: 'Revenue' }).getByRole('tab')).toHaveText([
      'Summary',
      'Payments',
      /^Plans & Upgrades/,
      'Usage',
    ]);
    await rows(page).first().getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'View in Stripe' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Refund|Void/ })).toHaveCount(0);
    await expectAccessible(page);
    await close();
  });

  test('Denied without billing.read; an unknown tab is the Console 404', async ({ browser }) => {
    for (const path of [
      '/admin/billing?console-role=Instructor',
      '/admin/billing/invoices?console-role=Content%20Editor',
    ]) {
      const { page, close } = await openAt(browser, path);
      await expect(page.getByRole('heading', { level: 1, name: "Your role can't open Billing" })).toBeVisible();
      await close();
    }
    const { page, close } = await openAt(browser, '/admin/billing/nope');
    await expect(page.getByRole('heading', { level: 1, name: "This page doesn't exist" })).toBeVisible();
    await close();
  });

  test('its states: loading, empty, error, "Too many requests", Stripe not connected, a missing scope', async ({
    browser,
  }) => {
    for (const [state, path, words] of [
      ['loading', '/admin/billing', null],
      ['empty', '/admin/billing/invoices', 'No invoices yet'],
      ['error', '/admin/billing', 'This didn’t load.'],
      ['rate_limited', '/admin/billing/refunds', 'Too many requests.'],
      ['stripe_off', '/admin/billing', "Stripe isn't connected"],
      [
        'stripe_scope',
        '/admin/billing/invoices',
        'Stripe’s restricted key can’t read Invoices. Add Read on Invoices to the key.',
      ],
    ] as const) {
      const { page, close } = await openAt(browser, `${path}?console-state=${state}`);
      if (words) await expect(page.locator('main').getByText(words)).toBeVisible();
      else await expect(page.locator('main [aria-busy="true"]').first()).toBeVisible();
      if (state !== 'loading' && state !== 'empty') {
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
      }
      await expectAccessible(page);
      await close();
    }
  });

  test('a workspace’s Billing tab opens Billing, as the mockup’s does', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/people/teams/ws_northshore');
    await page.getByRole('tablist', { name: 'Section' }).getByRole('tab', { name: 'Billing' }).click();
    await page.getByRole('link', { name: 'Open in Billing' }).click();
    await expect(page).toHaveURL(/\/admin\/revenue\/payments\/invoices(\?|$)/);
    await expect(page.getByRole('tab', { name: 'Invoices' })).toHaveAttribute('aria-selected', 'true');
    await close();
  });

  test('every time is MT with CT after it (D-267), and nothing scrolls sideways on a phone', async ({ browser }) => {
    for (const tab of ['', '/invoices', '/failed', '/refunds']) {
      const { page, close } = await openAt(browser, `/admin/billing${tab}`, 390);
      await page.locator('main').waitFor();
      const words = (await page.locator('main').textContent()) ?? '';
      expect(words, tab).not.toMatch(/\bMST\b/);
      expect(
        words.replace(/\d{1,2}:\d{2} [AP]M MT \/ \d{1,2}:\d{2} [AP]M CT/g, '').match(/\d{1,2}:\d{2} [AP]M/g) ?? [],
        tab,
      ).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true);
      await close();
    }
  });
});
