import { test, expect, type Browser, type Locator, type Page } from '@playwright/test';
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

/** A list's data rows: the R2 table's (D-160 R2-3b), its header row left out. */
const rows = (page: Page) => page.locator('main [role="table"] [role="row"]:has([role="cell"])');

test.describe('the Admin Console: Roles, Denied, the 404 and the shared states (D-157) @g9 @console', () => {
  test('Roles: the matrix the Owner edits, and Invite staff’s form, in both themes', async ({ browser }) => {
    // D-160 R2-3b, editable (Connor, Nov 16, 2026): the mockup's nine rows; the Owner's column fixed,
    // Support's refund and masquerade locked (the mockup's two locks), every other Admin and Support box
    // a toggle (16), the five past `CONSOLE_CAPS` among them, named so and refused by the server.
    for (const theme of ['light', 'dark'] as const) {
      const { page, close } = await openAt(browser, '/admin/roles', { theme });
      await expectShell(page);
      await expect(page.getByRole('heading', { level: 1, name: 'Roles & Permissions' })).toBeVisible();
      await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toContainText('Roles & Permissions');
      const matrix = page.getByRole('table', { name: 'Console permissions by role' });
      await expect(matrix.locator('[role="row"]:has([role="cell"])')).toHaveCount(9);
      await expect(matrix.locator('input[type="checkbox"]')).toHaveCount(27);
      await expect(matrix.locator('input:not(:disabled)')).toHaveCount(16);
      const exportRow = matrix.getByRole('row', { name: 'Export audit and email logs' });
      await expect(exportRow.getByRole('checkbox', { name: 'Export audit and email logs, Support, fixed by product rules' })).not.toBeChecked();
      await expect(matrix.getByRole('checkbox', { name: 'Refund or void an invoice, Support. Fixed by product rules' })).toBeDisabled();
      await expect(matrix.getByRole('checkbox', { name: 'Edit curriculum, vault, sessions, announcements, tiers, Admin' })).toBeEnabled();
      await expect(matrix.getByRole('checkbox', { name: 'Edit staff roles and this matrix, Admin, fixed by product rules' })).toBeEnabled();
      await expectAccessible(page);
      if (theme === 'light') {
        // D-172: Invite staff opens its form here (the Console's audited path), no longer Staff & Roles.
        await page.getByRole('button', { name: 'Invite staff' }).click();
        await expect(page.getByRole('dialog', { name: 'Invite staff' })).toBeVisible();
        await expect(page).toHaveURL(/\/admin\/roles/);
      }
      await close();
    }
  });

  test('Roles: a change is confirmed, made, toasted and audit-logged; Cancel changes nothing', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/roles');
    const matrix = page.getByRole('table', { name: 'Console permissions by role' });
    const box = matrix.getByRole('checkbox', { name: 'View billing, Support', exact: true });
    await expect(box).toBeChecked();

    await box.click();
    const dialog = page.getByRole('dialog', { name: 'Remove this permission from Support?' });
    await expect(dialog).toContainText('View billing. Applies to every Support on staff right away.');
    await expect(dialog).toContainText('This action is audit-logged.');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(box).toBeChecked();

    await box.click();
    await dialog.getByRole('button', { name: 'Remove permission' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Permission updated')).toBeVisible();
    await expect(box).not.toBeChecked();
    await expect(matrix.getByRole('row', { name: 'View billing' })).toContainText('No');

    // Given back, with the other words.
    await box.click();
    const back = page.getByRole('dialog', { name: 'Give this permission to Support?' });
    await back.getByRole('button', { name: 'Allow' }).click();
    await expect(back).toHaveCount(0);
    await expect(box).toBeChecked();

    // The build row is the PermKey matrix's: giving it to Support sets its four PermKeys, which the
    // matrix (and Staff & Roles) read from the snapshot.
    const build = matrix.getByRole('checkbox', { name: 'Edit curriculum, vault, sessions, announcements, tiers, Support', exact: true });
    await expect(build).not.toBeChecked();
    await build.click();
    await page.getByRole('dialog', { name: 'Give this permission to Support?' }).getByRole('button', { name: 'Allow' }).click();
    await expect(build).toBeChecked();
    await page.getByRole('dialog', { name: 'Give this permission to Support?' }).waitFor({ state: 'detached' });
    await build.click();
    await page.getByRole('dialog', { name: 'Remove this permission from Support?' }).getByRole('button', { name: 'Remove permission' }).click();
    await expect(build).not.toBeChecked();

    // A box past the ceiling looks like the mockup's toggle; the server refuses it and the dialog says why.
    await matrix.getByRole('checkbox', { name: 'Export audit and email logs, Support, fixed by product rules' }).click();
    const fixed = page.getByRole('dialog', { name: 'Give this permission to Support?' });
    await expect(fixed.getByRole('alert')).toHaveText('Fixed by product rules. Only the Owner and Admins can export logs.');
    await expect(fixed.getByRole('button', { name: 'Allow' })).toBeDisabled();
    await expectAccessible(page);
    await fixed.getByRole('button', { name: 'Cancel' }).click();
    await expect(matrix.getByRole('checkbox', { name: 'Export audit and email logs, Support, fixed by product rules' })).not.toBeChecked();

    // Every change is in the audit log, newest first, in the mockup's words.
    const sidebar = page.locator('aside[aria-label="Primary"]');
    await sidebar.getByRole('button', { name: 'Operations' }).click();
    await sidebar.getByRole('button', { name: 'Audit Log' }).click();
    await expect(rows(page).first()).toContainText('permission.change');
    await expect(rows(page).nth(0)).toContainText('Edit curriculum, vault, sessions, announcements, tiers: allowed to not allowed.');
    await expect(rows(page).nth(1)).toContainText('Edit curriculum, vault, sessions, announcements, tiers: not allowed to allowed.');
    await expect(rows(page).nth(2)).toContainText('View billing: not allowed to allowed.');
    await expect(rows(page).nth(3)).toContainText('View billing: allowed to not allowed.');
    await close();
  });

  test('Roles: read-only for Admin, each box saying why', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/roles?console-role=Admin');
    const matrix = page.getByRole('table', { name: 'Console permissions by role' });
    await expect(matrix.locator('input[type="checkbox"]')).toHaveCount(27);
    await expect(matrix.locator('input:not(:disabled)')).toHaveCount(0);
    const box = matrix.getByRole('checkbox', { name: 'Start and extend masquerade, Admin', exact: true });
    await expect(box.locator('xpath=ancestor::*[@title][1]')).toHaveAttribute('title', "Your role (Admin) can't do this: Change Admin permission");
    await box.dispatchEvent('click');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expectAccessible(page);
    await close();
  });

  test('Denied: Support, Instructor and Content Editor on Roles, with the way back to the Overview', async ({ browser }) => {
    // D-160 R2-1b: Denied is the R2 mockup's, in its words (straight apostrophe, no full stop).
    for (const theme of ['light', 'dark'] as const) {
      const { page, close } = await openAt(browser, '/admin/roles?console-role=Support', { theme });
      await expectShell(page);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText("Your role can't open Roles & Permissions");
      await expect(page.getByText('You are signed in as Support. An Owner can change this in Roles & Permissions.')).toBeVisible();
      await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toHaveText('Admin/Access/Roles & Permissions');
      await expectAccessible(page);
      if (theme === 'light') {
        await page.getByRole('link', { name: 'Go to Overview' }).click();
        await expect(page).toHaveURL(/\/admin(\?|$)/);
      }
      await close();
    }
    for (const role of ['Instructor', 'Content Editor']) {
      const { page, close } = await openAt(browser, `/admin/roles?console-role=${encodeURIComponent(role)}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText("Your role can't open Roles & Permissions");
      await expect(page.getByText(`You are signed in as ${role}.`, { exact: false })).toBeVisible();
      await close();
    }
  });

  test('any other /admin/ address is the Console 404, inside the shell; a learner still goes home', async ({ browser }) => {
    // D-160 R2-1b: the 404 is the R2 mockup's, and its breadcrumb is `Admin` alone, as there.
    const { page, close } = await openAt(browser, '/admin/no-such-page');
    await expectShell(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("This page doesn't exist");
    await expect(page.getByText('The link may be old, or the record was removed. Error 404.')).toBeVisible();
    await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toHaveText('Admin');
    // "Search the admin" opens the ⌘K palette (D-160 R2-1c).
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Search the admin' }).click();
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: 'Go to Overview' }).click();
    await expect(page).toHaveURL(/\/admin(\?|$)/);
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText("This page doesn't exist");
    await close();

    // The fixture's standalone Denied page (parity only) is the 404 nowhere but the fixture build;
    // here, the fixture build, it is Denied with no page named.
    const denied = await openAt(browser, '/admin/denied');
    await expect(denied.page.getByRole('heading', { level: 1 })).toHaveText("Your role can't open this page");
    await expectAccessible(denied.page);
    await denied.close();

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
    // D-160 R2-3b: a row's time is the button that opens it.
    const first = rows(page).first().getByRole('button', { name: /^View the entry from / });
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

  /**
   * D-160 R2-3b: the mockup's filters only (search, Actor, Action, Date range); the Outcome filter's
   * "…", which the mockup does not draw, is gone (the Nov 16 eye check), and none is offered.
   */
  const action = async (page: Page, group: string) => page.getByRole('combobox', { name: 'Action' }).selectOption(group);

  test('filters narrow the list, and Clear Filters brings it back', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit');
    await expect(page.getByRole('button', { name: /More filters/ })).toHaveCount(0);
    await action(page, 'console');
    await expect(rows(page).first()).toContainText('console.access_denied');
    const n = await rows(page).count();
    for (let i = 0; i < n; i++) await expect(rows(page).nth(i)).toContainText('console.access_denied');
    await page.getByRole('textbox', { name: 'Filter target or detail' }).fill('zzz-nothing');
    await expect(page.getByText('No matches')).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(rows(page)).toHaveCount(50);
    await close();
  });

  test('Export CSV downloads the filtered rows, safe for a spreadsheet, and the export joins the log', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit');
    await action(page, 'console');
    await expect(rows(page)).toHaveCount(24);
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
    expect(download.suggestedFilename()).toBe('audit-log-2026-12-07.csv');
    const csv = await readFile((await download.path())!, 'utf8');
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toMatch(/^"id","at","actor_user_id"/);
    expect(lines).toHaveLength(25);
    expect(lines.slice(1).every((l) => l.includes('"console.access_denied"'))).toBe(true);
    await expect(page.getByText('Export downloaded. The export is in the audit log.')).toBeVisible();
    await action(page, '');
    await expect(rows(page).first()).toContainText('audit.export');
    // D-160 R2-3b: the time in MST (10:42 AM Central is 9:42 AM in Arizona).
    await expect(rows(page).first()).toContainText('9:42 AM');
    await close();
  });

  test('Support reads the log without IP or browser, and cannot export', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit?console-role=Support');
    await expect(rows(page)).toHaveCount(50);
    // D-160 R2-3b: drawn locked, as the mockup's guarded button, and it does nothing.
    await expect(page.getByRole('button', { name: 'Export CSV' })).toHaveAttribute('aria-disabled', 'true');
    await rows(page).first().getByRole('button', { name: /^View the entry from / }).click();
    const drawer = page.locator('[data-drawer="open"]');
    await expect(drawer).toContainText('Hidden for your role');
    await expect(drawer).not.toContainText('203.0.113.');
    await expectAccessible(page);
    await close();
  });

  test('Instructor and Content Editor see Denied on the audit log', async ({ browser }) => {
    for (const role of ['Instructor', 'Content Editor']) {
      const { page, close } = await openAt(browser, `/admin/audit?console-role=${encodeURIComponent(role)}`);
      // D-160 R2-1b: the R2 mockup's Denied, in its words.
      await expect(page.getByRole('heading', { level: 1 })).toHaveText("Your role can't open Audit Log");
      await expect(page.getByText(`You are signed in as ${role}.`, { exact: false })).toBeVisible();
      await close();
    }
  });

  test('its states: loading, empty, error and "Too many requests"', async ({ browser }) => {
    const loading = await openAt(browser, '/admin/audit?console-state=loading');
    await expect(loading.page.locator('main [aria-busy="true"]')).toHaveCount(1);
    await expectAccessible(loading.page);
    await loading.close();

    const empty = await openAt(browser, '/admin/audit?console-state=empty');
    await expect(empty.page.getByText('No audit entries yet')).toBeVisible();
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

test.describe('the Admin Console: the grouped sidebar (D-157, PR 1d; R2 since D-160 R2-1b) @g9 @console', () => {
  /** Open every closed group, then read each group's header and rows. */
  const groupsOf = async (scope: Locator) => {
    const nav = scope.locator('nav[aria-label="Admin"]');
    const closed = nav.locator('button[aria-expanded="false"]');
    while ((await closed.count()) > 0) await closed.first().click();
    return nav.evaluate((el) =>
      Array.from(el.children).map((g) => Array.from(g.children).map((x) => (x as HTMLElement).innerText.trim().split('\n')[0]!)),
    );
  };

  const EXPECT: Record<string, string[][]> = {
    Owner: [
      ['Health', 'Overview'],
      ['Build', 'Curriculum', 'Module Builder', 'Resource Vault', 'Cohorts & Sessions', 'Announcements'],
      // D-160 R2-1c: Workspaces and Users are on in production; D-162 3b: Masquerade (`masquerade.start`).
      ['Support', 'Learners & Teams', 'Workspaces', 'Users', 'Masquerade'],
      // D-163: Billing is on in production (billing.read: Owner, Admin, Support); D-166 Usage (usage.read).
      ['Revenue', 'Tiers & Upgrades', 'Billing', 'Usage'],
      // D-165: API & Webhooks and Scheduled Jobs are on in production (Support sees both, D3); D-166 the Email Log.
      // D-167: Incidents is on in production too (Support reads and acknowledges, D3).
      // D-168: the four infrastructure pages are on in production (ops.read: Owner, Admin; Support none, D3).
      ['Operations', 'Incidents', 'Audit Log', 'API & Webhooks', 'Scheduled Jobs', 'Email Log', 'Integrations', 'Deploys & Commits', 'DB Health', 'Environment Flags'],
      ['Access', 'Roles & Permissions', 'Staff & Roles'],
    ],
  };
  const OPS_ROWS = ['Roles & Permissions', 'Integrations', 'Deploys & Commits', 'DB Health', 'Environment Flags'];
  EXPECT.Admin = EXPECT.Owner!;
  EXPECT.Support = EXPECT.Owner!.map((g) => g.filter((x) => !OPS_ROWS.includes(x) && x !== 'Masquerade'));
  EXPECT.Instructor = EXPECT.Owner!.filter((g) => g[0] !== 'Operations').map((g) => g.filter((x) => !['Roles & Permissions', 'Workspaces', 'Users', 'Masquerade', 'Billing', 'Usage'].includes(x)));

  for (const role of ['Owner', 'Admin', 'Support', 'Instructor']) {
    test(`${role} sees the Console groups their capabilities open, and the rows go where they say`, async ({ browser }) => {
      const { page, close } = await openAt(browser, `/admin?console-role=${role}`);
      const aside = page.locator('aside[aria-label="Primary"]');
      // Health (the Overview's group) and Build start open; the rest are closed until opened.
      await expect(aside.getByRole('button', { name: 'Health', exact: true })).toHaveAttribute('aria-expanded', 'true');
      await expect(aside.getByRole('button', { name: 'Build', exact: true })).toHaveAttribute('aria-expanded', 'true');
      await expect(aside.getByRole('button', { name: 'Support', exact: true })).toHaveAttribute('aria-expanded', 'false');
      await expect.poll(() => groupsOf(aside)).toEqual(EXPECT[role]);
      if (role !== 'Instructor') {
        await aside.getByRole('button', { name: 'Audit Log' }).click();
        await expect(page).toHaveURL(/\/admin\/audit/);
        await expect(aside.locator('[aria-current="page"]')).toContainText('Audit Log');
        // The active page's group cannot close while its page is open.
        await aside.getByRole('button', { name: 'Operations', exact: true }).click();
        await expect(aside.getByRole('button', { name: 'Operations', exact: true })).toHaveAttribute('aria-expanded', 'true');
      }
      await expectAccessible(page);
      await close();
    });
  }

  test('a group the viewer closes stays closed on the next visit, in this browser', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/no-such-page');
    const aside = page.locator('aside[aria-label="Primary"]');
    await aside.getByRole('button', { name: 'Build', exact: true }).click();
    await expect(aside.getByRole('button', { name: 'Build', exact: true })).toHaveAttribute('aria-expanded', 'false');
    // A second visit in the same browser (a new tab: `openAt`'s init script, which seeds the
    // preferences, belongs to the first page only).
    const again = await page.context().newPage();
    await again.goto(page.url());
    await again.locator('body[data-app-ready="true"]').waitFor();
    await expect(again.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'Build', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await expect(again.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'Health', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await close();
  });

  for (const width of [320, 390]) {
    test(`the phone drawer at ${width}: every group, 44px rows, 16px type, nothing sideways`, async ({ browser }) => {
      const { page, close } = await openAt(browser, '/admin/audit', { width });
      await page.getByRole('button', { name: 'Open menu' }).click();
      const drawer = page.locator('[data-drawer="open"][role="dialog"]');
      await expect(drawer).toHaveCount(1);
      const aside = drawer.locator('aside[aria-label="Primary"]');
      await expect.poll(() => groupsOf(aside)).toEqual(EXPECT.Owner);
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
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-drawer="open"]')).toHaveCount(0);
      await close();
    });
  }
});
