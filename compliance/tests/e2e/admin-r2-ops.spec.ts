import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-168 (Console PR 9, spec §§ 7.11-7.13): Integrations, Deploys & Commits, DB Health and Environment
 * Flags on R2, in the fixture build. The Console fixture answers with the mockup's data
 * (`apps/web/src/data/parity-r2-ops.ts`); the pixels are `pnpm parity:admin-r2`'s, and these hold the
 * behaviour: the sidebar rows, Test connection for Stripe and Resend only (inert elsewhere), the
 * typed flip of `masquerade_enabled` for the Owner alone, Denied for Support (D3), and the production
 * empty states. Every screen and state passes axe (zero serious or critical).
 */

const NOW = '2026-12-10T09:30:00-07:00';

async function openAt(browser: Browser, path: string, opts: { width?: number } = {}): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width: opts.width ?? 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript(() => localStorage.setItem('ai-lms-prefs', JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' })));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const crumbs = (page: Page) => page.locator('header nav[aria-label="Breadcrumb"]');
const toast = (page: Page, text: string) => page.getByRole('status').filter({ hasText: text });

test.describe('the Operations pages on R2 (D-168) @g9 @console', () => {
  test('the sidebar opens all four, under Operations', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/integrations');
    const aside = page.locator('aside[aria-label="Primary"]');
    for (const [label, url, h1] of [
      ['Deploys & Commits', /\/admin\/deploys/, 'Deploys & Commits'],
      ['DB Health', /\/admin\/db/, 'DB Health'],
      ['Environment Flags', /\/admin\/flags/, 'Environment Flags'],
      ['Integrations', /\/admin\/integrations/, 'Integrations'],
    ] as const) {
      await aside.getByRole('button', { name: label, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible();
      await expect(crumbs(page)).toHaveText(`Admin/Operations/${label}`);
      await expect(aside.locator('[aria-current="page"]')).toContainText(label);
    }
    await close();
  });

  test('Integrations: each card’s facts, Test connection for Stripe and Resend, inert elsewhere', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/integrations');
    const card = (name: string) => page.locator('main section').filter({ has: page.getByRole('heading', { level: 2, name, exact: true }) });
    await expect(page.locator('main section')).toHaveCount(8);
    await expect(card('GoHighLevel')).toContainText('Degraded');
    await expect(card('GoHighLevel')).toContainText('Dec 10, 9:10 AM · 401 Unauthorized');
    await expect(card('Zoom')).toContainText('Not configured');
    await expect(card('GA4')).toContainText('G-TSQ5YB5BCP');
    await expect(card('GA4')).toContainText('Managed on www. View only.');
    await expect(card('GA4').getByRole('button')).toHaveCount(0);
    // Nothing to reveal, copy or replace (D9).
    await expect(page.getByRole('button', { name: /reveal|replace|copy/i })).toHaveCount(0);
    await expectAccessible(page);

    await card('Stripe').getByRole('button', { name: 'Test connection' }).click();
    await expect(toast(page, 'Stripe: connection ok')).toBeVisible();
    const ghl = card('GoHighLevel').getByRole('button', { name: 'Test connection' });
    await expect(ghl).toHaveAttribute('aria-disabled', 'true');
    await expect(ghl).toHaveAttribute('title', 'Check now is for Stripe and Resend only');
    await close();
  });

  test('Deploys & Commits: the live commit and the list; "Not configured" with no token', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/deploys');
    await expect(page.locator('main')).toContainText('a3f91c2');
    await expect(page.locator('main [role="table"] [role="row"]').filter({ has: page.locator('[role="cell"]') })).toHaveCount(5);
    await expect(page.locator('main')).toContainText('Sidebar: collapsible groups and cohort switcher');
    await expectAccessible(page);
    await close();
    const empty = await openAt(browser, '/admin/deploys?console-state=empty');
    await expect(empty.page.getByText('Not configured', { exact: true })).toBeVisible();
    await expect(empty.page.getByText(/CONSOLE_GITHUB_TOKEN or CONSOLE_RAILWAY_TOKEN/)).toBeVisible();
    await expectAccessible(empty.page);
    await empty.close();
  });

  test('DB Health: read-only figures; slow queries only where pg_stat_statements exists', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/db');
    await expect(page.locator('main')).toContainText('14 / 100');
    await expect(page.locator('main')).toContainText('0014_cohort_starts_at_first_build');
    await expect(page.locator('main pre')).toHaveCount(3);
    await expect(page.locator('main button')).toHaveCount(0);
    await expectAccessible(page);
    await close();
    const empty = await openAt(browser, '/admin/db?console-state=empty');
    await expect(empty.page.getByText('Slow queries are not available')).toBeVisible();
    await expect(empty.page.locator('main pre')).toHaveCount(0);
    await expectAccessible(empty.page);
    await empty.close();
  });

  test('Environment Flags: the Owner turns masquerade_enabled off by typing its key; Admins and the mockup-only flags can’t', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/flags');
    const main = page.locator('main');
    await expect(main).toContainText('6 of 8');
    // Only the Console's own flag is a switch, and only the Owner's (D8, D10).
    const flip = main.getByRole('button', { name: /^masquerade_enabled: On\. Turn off/ });
    await expect(flip).toHaveCount(1);
    await expect(main.getByRole('button', { name: /preview_as_learner|maintenance_mode/ })).toHaveCount(0);
    await expectAccessible(page);

    await flip.click();
    const dialog = page.getByRole('dialog', { name: 'Turn off masquerade_enabled?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('This action is audit-logged.');
    const go = dialog.getByRole('button', { name: 'Turn off' });
    await expect(go).toBeDisabled();
    await dialog.getByRole('textbox', { name: 'Type masquerade_enabled to confirm' }).fill('masquerade');
    await expect(go).toBeDisabled();
    await dialog.getByRole('textbox', { name: 'Type masquerade_enabled to confirm' }).fill('masquerade_enabled');
    await expectAccessible(page);
    await go.click();
    await expect(dialog).toHaveCount(0);
    await expect(toast(page, 'masquerade_enabled is off')).toBeVisible();
    await expect(main.getByRole('button', { name: /^masquerade_enabled: Off\. Turn on/ })).toBeVisible();
    await expect(main).toContainText('5 of 8');
    await close();

    const admin = await openAt(browser, '/admin/flags?console-role=Admin');
    await expect(admin.page.locator('main')).toContainText('masquerade_enabled');
    await expect(admin.page.locator('main').getByRole('button', { name: /masquerade_enabled/ })).toHaveCount(0);
    await admin.close();
  });

  test('Support gets none of these screens (D3)', async ({ browser }) => {
    for (const path of ['/admin/integrations', '/admin/deploys', '/admin/db', '/admin/flags']) {
      const { page, close } = await openAt(browser, `${path}?console-role=Support`);
      await expect(page.getByRole('heading', { level: 1, name: /^Your role can't open / })).toBeVisible();
      await expect(page.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'Environment Flags', exact: true })).toHaveCount(0);
      await close();
    }
  });

  test('at 390: the cards stack, the phone floor holds, and the flip is a 44px target', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/flags', { width: 390 });
    const box = await page.locator('main').getByRole('button', { name: /^masquerade_enabled/ }).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expectAccessible(page);
    await close();
  });
});
