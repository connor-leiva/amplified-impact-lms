import { test, expect, type Browser, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-157: the Admin Console's PR 1 screens in the fixture build (fictional data from
 * `apps/web/src/data/console-fixture.ts`): the read-only Roles matrix, Denied, the Console 404, the
 * shared loading, empty, error and 429 states, and the audit log with its filters, drawer, Load More
 * and CSV export. Every screen and state passes axe (zero serious or critical), in light and dark.
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

    const failed = await openAt(browser, '/admin/audit?console-state=error');
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

test.describe('the Admin Console: the Audit Log (D-157) @g9 @console', () => {
  test('the audit log: newest first, 50 a page, Load More, inside the shell, accessible in both themes', async ({ browser }) => {
    for (const theme of ['light', 'dark'] as const) {
      const { page, close } = await openAt(browser, '/admin/audit', { theme });
      await expectShell(page);
      await expect(page.getByRole('heading', { level: 1, name: 'Audit Log' })).toBeVisible();
      await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toContainText('Audit Log');
      await expect(rows(page)).toHaveCount(50);
      await expect(rows(page).first()).toContainText('audit.export');
      await expectAccessible(page);
      if (theme === 'light') {
        await page.getByRole('button', { name: 'Load More' }).click();
        await expect(rows(page)).toHaveCount(56);
        await expect(page.getByRole('button', { name: 'Load More' })).toHaveCount(0);
      }
      await close();
    }
  });

  test('a row opens the detail drawer, by mouse or keyboard, and Escape closes it', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit');
    const first = rows(page).first().getByRole('button');
    await first.focus();
    await page.keyboard.press('Enter');
    const drawer = page.locator('[data-drawer="open"]');
    await expect(drawer).toHaveCount(1);
    await expect(drawer).toContainText('Audit Entry');
    await expect(drawer).toContainText('IP Address');
    await expect(drawer).toContainText('203.0.113.');
    await expectAccessible(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-drawer="open"]')).toHaveCount(0);
    await close();
  });

  test('filters narrow the list, and Clear Filters brings it back', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit');
    await page.getByRole('combobox', { name: 'Outcome' }).selectOption('denied');
    await expect(rows(page).first()).toContainText('Denied');
    const n = await rows(page).count();
    for (let i = 0; i < n; i++) await expect(rows(page).nth(i)).toContainText('Denied');
    await page.getByRole('searchbox', { name: 'Search target' }).fill('zzz-nothing');
    await expect(page.getByText('Nothing matches these filters.')).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(rows(page)).toHaveCount(50);
    await close();
  });

  test('Export CSV downloads the filtered rows, safe for a spreadsheet, and the export joins the log', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit');
    await page.getByRole('combobox', { name: 'Outcome' }).selectOption('failed');
    await expect(rows(page)).toHaveCount(1);
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
    expect(download.suggestedFilename()).toBe('audit-log-2026-12-07.csv');
    const csv = await readFile((await download.path())!, 'utf8');
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toMatch(/^"id","at","actor_user_id"/);
    expect(lines).toHaveLength(2);
    await expect(page.getByText('Export downloaded. The export is in the audit log.')).toBeVisible();
    await page.getByRole('combobox', { name: 'Outcome' }).selectOption('');
    await expect(rows(page).first()).toContainText('audit.export');
    await expect(rows(page).first()).toContainText('10:42 AM');
    await close();
  });

  test('Support reads the log without IP or browser, and cannot export', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit?console-role=Support');
    await expect(rows(page)).toHaveCount(50);
    await expect(page.getByRole('button', { name: 'Export CSV' })).toHaveCount(0);
    await rows(page).first().getByRole('button').click();
    const drawer = page.locator('[data-drawer="open"]');
    await expect(drawer).toContainText('Hidden for your role');
    await expect(drawer).not.toContainText('203.0.113.');
    await expectAccessible(page);
    await close();
  });

  test('Instructor and Content Editor see Denied on the audit log', async ({ browser }) => {
    for (const role of ['Instructor', 'Content Editor']) {
      const { page, close } = await openAt(browser, `/admin/audit?console-role=${encodeURIComponent(role)}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your role can’t open Audit Log.');
      await expect(page.locator('[data-console-state="denied"]')).toContainText('Permission Needed');
      await close();
    }
  });

  test('its states: loading, empty, error and "Too many requests"', async ({ browser }) => {
    const loading = await openAt(browser, '/admin/audit?console-state=loading');
    await expect(loading.page.locator('main [aria-busy="true"]')).toHaveCount(1);
    await expectAccessible(loading.page);
    await loading.close();

    const empty = await openAt(browser, '/admin/audit?console-state=empty');
    await expect(empty.page.getByText('No audit entries in the last 7 days.')).toBeVisible();
    await expect(empty.page.getByRole('button', { name: 'Show Last 30 Days' })).toBeVisible();
    await expectAccessible(empty.page);
    await empty.close();

    const failed = await openAt(browser, '/admin/audit?console-state=error');
    await expect(failed.page.getByRole('alert')).toContainText('This didn’t load.');
    await expect(failed.page.getByRole('alert').getByRole('button', { name: 'Retry' })).toBeVisible();
    await expectAccessible(failed.page);
    await failed.close();

    for (const theme of ['light', 'dark'] as const) {
      const limited = await openAt(browser, '/admin/audit?console-state=rate_limited', { theme });
      await expect(limited.page.getByRole('alert')).toContainText('Too many requests.');
      await expectAccessible(limited.page);
      await limited.close();
    }
  });
});

test.describe('the Admin Console: the grouped sidebar (D-157, PR 1d) @g9 @console', () => {
  const groupsOf = (page: Page) =>
    page.locator('aside[aria-label="Primary"] nav[aria-label="Main"]').evaluate((nav) =>
      Array.from(nav.children).map((g) => Array.from(g.children).map((el) => (el as HTMLElement).innerText.trim().split('\n')[0]!)),
    );

  const EXPECT: Record<string, string[][]> = {
    Owner: [
      ['Health', 'Overview'],
      ['Build', 'Curriculum', 'Module Builder', 'Resource Vault', 'Cohorts & Sessions', 'Announcements'],
      ['Support', 'Learners & Teams'],
      ['Revenue', 'Tiers & Upgrades'],
      ['Operations', 'Audit Log'],
      ['Access', 'Roles & Permissions', 'Staff & Roles'],
    ],
  };
  EXPECT.Admin = EXPECT.Owner!;
  EXPECT.Support = EXPECT.Owner!.map((g) => g.filter((x) => x !== 'Roles & Permissions'));
  EXPECT.Instructor = EXPECT.Owner!.filter((g) => g[0] !== 'Operations').map((g) => g.filter((x) => x !== 'Roles & Permissions'));

  for (const role of ['Owner', 'Admin', 'Support', 'Instructor']) {
    test(`${role} sees the Console groups their capabilities open, and the rows go where they say`, async ({ browser }) => {
      const { page, close } = await openAt(browser, `/admin?console-role=${role}`);
      await expect.poll(() => groupsOf(page)).toEqual(EXPECT[role]);
      if (role !== 'Instructor') {
        await page.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'Audit Log' }).click();
        await expect(page).toHaveURL(/\/admin\/audit/);
        await expect(page.locator('aside[aria-label="Primary"] [aria-current="page"]')).toContainText('Audit Log');
      }
      await expectAccessible(page);
      await close();
    });
  }

  for (const width of [320, 390]) {
    test(`the phone drawer at ${width}: every group, 44px rows, 16px type, nothing sideways`, async ({ browser }) => {
      const { page, close } = await openAt(browser, '/admin/audit', { width });
      await page.getByRole('button', { name: 'Open menu' }).click();
      const aside = page.locator('aside[aria-label="Primary"]');
      await expect(aside).toHaveAttribute('data-open', 'true');
      await expect.poll(() => groupsOf(page)).toEqual(EXPECT.Owner);
      const problems = await aside.evaluate((el) => {
        const out: string[] = [];
        if (el.scrollWidth > el.clientWidth + 1) out.push(`drawer ${el.scrollWidth} > ${el.clientWidth}`);
        for (const b of Array.from(el.querySelectorAll('nav button'))) {
          const r = b.getBoundingClientRect();
          if (r.height < 43.5 || r.width < 43.5) out.push(`${(b as HTMLElement).innerText} ${Math.round(r.width)}x${Math.round(r.height)}`);
          if (Number.parseFloat(getComputedStyle(b).fontSize) < 16) out.push(`${(b as HTMLElement).innerText} font`);
        }
        return out;
      });
      expect(problems).toEqual([]);
      await expect(aside.locator('[aria-current="page"]')).toContainText('Audit Log');
      await expectAccessible(page);
      await close();
    });
  }
});
