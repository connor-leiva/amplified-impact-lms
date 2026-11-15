import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-157: the Admin Console's PR 1 screens in the fixture build (fictional data from
 * `apps/web/src/data/console-fixture.ts`): the read-only Roles matrix, Denied, the Console 404 and the
 * shared loading, error and 429 states. Every screen and state passes axe (zero serious or critical),
 * in light and dark.
 *
 * `?console-role=` and `?console-state=` are the fixture's own switches; the http build does not
 * contain them (`apps/web/src/data/console-build.test.ts`).
 */

const NOW = '2026-12-07T10:42:00-06:00';

async function openAt(browser: Browser, path: string, opts: { width?: number; theme?: 'light' | 'dark'; persona?: string } = {}): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', viewport: { width: opts.width ?? 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript((theme) => {
    localStorage.setItem('ai-lms-prefs', JSON.stringify({ phase: 'live', theme, tz: null, sidebar: 'full' }));
  }, opts.theme ?? 'light');
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${APP_BASE}${path}${sep}as=${opts.persona ?? 'admin'}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  return { page, close: () => ctx.close() };
}

/** The shell's landmarks, which every Console screen renders inside. */
async function expectShell(page: Page) {
  await expect(page.locator('aside[aria-label="Primary"]')).toHaveCount(1);
  await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
}

const rows = (page: Page) => page.locator('main tbody tr');

test.describe('the Admin Console: Roles, Denied, the 404 and the shared states (D-157) @g9 @console', () => {
  test('Roles: the read-only matrix, with a link to Staff & Roles, in both themes', async ({ browser }) => {
    for (const theme of ['light', 'dark'] as const) {
      const { page, close } = await openAt(browser, '/admin/roles', { theme });
      await expectShell(page);
      await expect(page.getByRole('heading', { level: 1, name: 'Roles & Permissions' })).toBeVisible();
      await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toContainText('Roles & Permissions');
      await expect(rows(page)).toHaveCount(28);
      await expect(page.locator('main input, main select, main [role="switch"], main [role="checkbox"]')).toHaveCount(0);
      await expect(rows(page).filter({ hasText: 'Export Logs as CSV' })).toContainText('No');
      await expectAccessible(page);
      if (theme === 'light') {
        await page.getByRole('link', { name: 'Go to Staff & Roles' }).click();
        await expect(page).toHaveURL(/\/admin\/staff/);
      }
      await close();
    }
  });

  test('Denied: Support, Instructor and Content Editor on Roles, with the way back to the Overview', async ({ browser }) => {
    for (const theme of ['light', 'dark'] as const) {
      const { page, close } = await openAt(browser, '/admin/roles?console-role=Support', { theme });
      await expectShell(page);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your role can’t open Roles & Permissions.');
      await expect(page.locator('[data-console-state="denied"]')).toContainText('Permission Needed');
      await expect(page.getByText('You’re signed in as Support.', { exact: false })).toBeVisible();
      await expectAccessible(page);
      if (theme === 'light') {
        await page.getByRole('link', { name: 'Go to Overview' }).click();
        await expect(page).toHaveURL(/\/admin(\?|$)/);
      }
      await close();
    }
    for (const role of ['Instructor', 'Content Editor']) {
      const { page, close } = await openAt(browser, `/admin/roles?console-role=${encodeURIComponent(role)}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your role can’t open Roles & Permissions.');
      await expect(page.getByText(`You’re signed in as ${role}.`, { exact: false })).toBeVisible();
      await close();
    }
  });

  test('any other /admin/ address is the Console 404, inside the shell; a learner still goes home', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/no-such-page');
    await expectShell(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('That Console page doesn’t exist.');
    await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toContainText('Page Not Found');
    await expectAccessible(page);
    await page.getByRole('link', { name: 'Go to Overview' }).click();
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('That Console page doesn’t exist.');
    await close();

    for (const path of ['/admin/roles', '/admin/no-such-page']) {
      const learner = await openAt(browser, path, { persona: 'agent' });
      await expect(learner.page).toHaveURL(/127\.0\.0\.1:\d+\/(\?|$)/);
      await learner.close();
    }
  });

  test('the shared states: loading, error and "Too many requests"', async ({ browser }) => {
    const loading = await openAt(browser, '/admin/roles?console-state=loading');
    await expect(loading.page.locator('main [aria-busy="true"]')).toHaveCount(1);
    await expectAccessible(loading.page);
    await loading.close();

    const failed = await openAt(browser, '/admin/roles?console-state=error');
    await expect(failed.page.getByRole('alert')).toContainText('This didn’t load.');
    await expect(failed.page.getByRole('alert').getByRole('button', { name: 'Retry' })).toBeVisible();
    await expectAccessible(failed.page);
    await failed.close();

    for (const theme of ['light', 'dark'] as const) {
      const limited = await openAt(browser, '/admin/roles?console-state=rate_limited', { theme });
      await expect(limited.page.getByRole('alert')).toContainText('Too many requests.');
      await expectAccessible(limited.page);
      await limited.close();
    }
  });
});
