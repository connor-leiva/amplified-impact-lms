import { readFile } from 'node:fs/promises';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-160 R2-1c: Users, a user, Search and the ⌘K palette on R2 (spec §§ 7.4–7.5, D-158's API), in the
 * fixture build, on the R2 mockup's own records. The behaviour: filters, "Export selected" (a CSV of
 * exactly the chosen rows, Owner and Admin only), the staff password reset's confirm (a staff member's
 * by the Owner alone), the palette's keys, and the Search page. Every screen, dialog and state passes axe.
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
    acceptDownloads: true,
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
const palette = (page: Page) => page.getByRole('dialog', { name: 'Command palette' });

test.describe('Users on R2 (D-160 R2-1c) @g9 @console', () => {
  test('the list: the mockup’s people, by words and role; a row opens the person', async ({ browser }) => {
    // D-253: People › Everyone; the old address lands there.
    const { page, close } = await openAt(browser, '/admin/users');
    await expect(page).toHaveURL(/\/admin\/people(\?|$)/);
    await expect(page.getByRole('heading', { level: 1, name: 'People' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Everyone/ })).toHaveAttribute('aria-selected', 'true');
    await expect(crumbs(page)).toHaveText('Admin/People/Everyone');
    // D-268 (R-5 Phase 7): People › Everyone, with "Got in through" and its chips (the mockup's PeoplePg): each person
    // once, Utah Life's agents among them.
    await expect(rows(page)).toHaveCount(16);
    await expect(rows(page).first()).toContainText('Elena Vargas');
    await expect(rows(page).first()).toContainText('Team Plan');
    await expect(rows(page).first()).toContainText('Dec 10, 8:52 AM MT / 9:52 AM CT');
    await expectAccessible(page);
    const chips = page.getByRole('group', { name: 'Audience' });
    await expect(chips.getByRole('button')).toHaveText(['Everyone16', 'AI Accelerator1', 'Team Plan5', 'Agent Plan1', 'Insiders1', 'Utah Life8']);
    await chips.getByRole('button', { name: /^Utah Life/ }).click();
    await expect(chips.getByRole('button', { name: /^Utah Life/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(rows(page)).toHaveCount(8);
    await expect(page.locator('main')).toContainText('Showing 8 of 8.');
    await chips.getByRole('button', { name: /^Everyone/ }).click();
    await page.getByRole('textbox', { name: 'Find a person by name or email' }).fill('tidewater');
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Past due');
    await page.getByRole('textbox', { name: 'Find a person by name or email' }).fill('');
    await expect(rows(page)).toHaveCount(16);
    // A Utah Life agent opens Utah Life, as the mockup's does.
    await rows(page).nth(8).getByRole('link', { name: 'Utah Life agent' }).click();
    await expect(page).toHaveURL(/\/admin\/people\/groups\/utah-life(\?|$)/);
    await page.goBack();
    await rows(page).first().getByRole('link', { name: 'Elena Vargas' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Elena Vargas' })).toBeVisible();
    await close();
  });

  test('Export downloads the list on screen, and is the Owner’s and Admin’s (D-268: the mockup’s Export)', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/users');
    await page.getByRole('textbox', { name: 'Find a person by name or email' }).fill('tidewater');
    await expect(rows(page)).toHaveCount(1);
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^users-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await readFile((await download.path())!, 'utf8');
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe('"id","name","email","kind","role","team_id","workspace","status","joined","last_active"');
    expect(lines.slice(1).map((l) => l.split(',')[0])).toEqual(['"u_1104"']);
    await expect(page.getByRole('status').filter({ hasText: 'Export started. It is in the audit log.' })).toBeVisible();
    await close();

    const support = await openAt(browser, '/admin/users?console-role=Support');
    await expect(support.page.getByRole('button', { name: 'Export' })).toBeDisabled();
    await support.close();
  });

  test('a user: key facts, four tabs, identity and notes; the workspace is a link', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/users/u_1042');
    await expect(crumbs(page)).toHaveText('Admin/People/Everyone/Elena Vargas');
    for (const t of [
      'u_1042',
      'elena@northshoregroup.example',
      'Team owner',
      'Dec 10, 8:52 AM MT / 9:52 AM CT',
      'Password, Google',
      'Yes, Nov 24, 2026',
    ])
      await expect(page.locator('main').getByText(t, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Prefers email over calls. Mornings MT.')).toBeVisible();
    const tabs = page.getByRole('tablist', { name: 'Section' });
    await expect(tabs.getByRole('tab')).toHaveText(['Orders', 'Progress', 'Emails sent', 'Activity']);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('$1,495.00');
    await expectAccessible(page);
    for (const [tab, text] of [
      ['Progress', 'Week 2 · Own the Day'],
      // D-166: the email log for this person (the mockup's one email to Elena).
      ['Emails sent', 'Tomorrow at 12:00 PM MT / 1:00 PM CT: Session 2 live build'],
      ['Activity', 'Account created'],
    ] as const) {
      await tabs.getByRole('tab', { name: tab }).click();
      await expect(page.locator('main')).toContainText(text);
      await expectAccessible(page);
    }
    await page.locator('main').getByRole('link', { name: 'Northshore Group' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Northshore Group' })).toBeVisible();
    await close();
  });

  test('the staff password reset: confirm, send, audited; a staff member’s by the Owner alone; no email change', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/users/u_1042');
    await page.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Change email…' })).toBeDisabled();
    await page.getByRole('menuitem', { name: 'Send password reset…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Send a password reset to Elena Vargas?' });
    await expect(dialog).toContainText(
      'Emails a reset link to elena@northshoregroup.example. Their current password keeps working until they use it.',
    );
    await expect(dialog).toContainText('This action is audit-logged.');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Send reset email' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Reset email sent' })).toBeVisible();
    await close();

    for (const [role, locked] of [
      ['Admin', true],
      ['Owner', false],
    ] as const) {
      const staff = await openAt(browser, `/admin/users/u_0002?console-role=${role}`);
      await staff.page.getByRole('button', { name: 'More actions' }).click();
      const item = staff.page.getByRole('menuitem', { name: 'Send password reset…' });
      if (locked) await expect(item).toBeDisabled();
      else await expect(item).toBeEnabled();
      await staff.close();
    }
  });

  test('a workspace’s members open their person; Learners & Teams open the user record and the workspace', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/people/teams/ws_northshore');
    await rows(page).first().getByRole('link', { name: 'Elena Vargas' }).click();
    await expect(page).toHaveURL(/\/admin\/people\/u_1042/);
    await expect(page.getByRole('heading', { level: 1, name: 'Elena Vargas' })).toBeVisible();
    await page.goBack();
    await rows(page).first().getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Open user' }).click();
    await expect(page).toHaveURL(/\/admin\/people\/u_1042/);
    await close();

    // A learner's id is their users.id and a team's its teams.id: the ids the Console pages take. (The
    // fixture's Console records are the mockup's, not the learner seed's, so only the address is read.)
    // D-268 (R-5 Phase 7): Cohort › People, Teams first: a team's menu opens the team, a learner's the person.
    const learners = await openAt(browser, '/admin/cohort/dec26/people');
    await rows(learners.page).first().getByRole('button', { name: 'More actions' }).click();
    await learners.page.getByRole('menuitem', { name: 'Open team' }).click();
    await expect(learners.page).toHaveURL(/\/admin\/people\/teams\/[^/?]+/);
    await learners.page.goBack();
    await learners.page.getByRole('tab', { name: /Learners/ }).click();
    await rows(learners.page).first().getByRole('button', { name: 'More actions' }).click();
    await learners.page.getByRole('menuitem', { name: 'Open person' }).click();
    await expect(learners.page).toHaveURL(/\/admin\/people\/[^/?]+/);
    await learners.close();
  });

  test('Denied for a role without users.read; a user that doesn’t exist is the 404', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/users?console-role=Instructor');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Your role can't open Users");
    await close();
    const missing = await openAt(browser, '/admin/users/u_nobody');
    await expect(missing.page.getByRole('heading', { level: 1 })).toHaveText("This page doesn't exist");
    await missing.close();
  });

  test('on a phone: cards, the audience chips, and the user’s Section select', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/users', { width: 390 });
    await expect(page.locator('main [role="table"]')).toHaveCount(0);
    // D-268: People › Everyone has no row selection (the mockup's PeoplePg); its chips scroll sideways on a phone.
    await expect(page.getByRole('group', { name: 'Audience' }).getByRole('button', { name: /^Utah Life/ })).toBeAttached();
    await expect(page.locator('main').getByText('Elena Vargas')).toBeVisible();
    await expectAccessible(page);
    await page.goto(`${APP_BASE}/admin/users/u_1042?as=admin`);
    await page.getByRole('combobox', { name: 'Section' }).selectOption({ label: 'Activity' });
    await expect(page.locator('main')).toContainText('Signed in');
    await close();
  });
});

test.describe('Search and the ⌘K palette (D-160 R2-1c) @g9 @console', () => {
  test('⌘K / Ctrl+K and the top bar open the palette; arrows and Enter open a result; Escape closes', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/workspaces');
    await page.keyboard.press('Control+k');
    await expect(palette(page)).toBeVisible();
    const box = palette(page).getByRole('combobox', { name: 'Command palette search' });
    await expect(box).toBeFocused();
    await expect(palette(page).getByRole('group', { name: 'Pages' }).getByRole('option')).toHaveCount(5);
    await expectAccessible(page);
    // Tab stays inside: the box is the one stop Tab reaches on a desktop.
    await page.keyboard.press('Tab');
    await expect(box).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(box).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(palette(page)).toHaveCount(0);

    await page.getByRole('button', { name: /Search or jump to…/ }).click();
    await box.fill('elena');
    await expect(
      palette(page)
        .getByRole('group', { name: 'Users' })
        .getByRole('option', { name: /Elena Vargas/ }),
    ).toBeVisible();
    await expect(palette(page).getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    // D-253: the API's link, at its new address.
    await expect(page).toHaveURL(/\/admin\/people\/u_1042/);
    await expect(palette(page)).toHaveCount(0);

    await page.keyboard.press('Meta+k');
    await box.fill('north');
    await expect(
      palette(page)
        .getByRole('group', { name: 'Teams' })
        .getByRole('option', { name: /Northshore Group/ }),
    ).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(palette(page).getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
    await box.fill('zzzz');
    await expect(palette(page)).toContainText('No results for "zzzz"');
    await close();
  });

  test('the 404’s "Search the admin" and the phone’s Search open it; a phone closes it with Close', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/no-such-page');
    await page.getByRole('button', { name: 'Search the admin' }).click();
    await expect(palette(page)).toBeVisible();
    await close();
    const phone = await openAt(browser, '/admin/users', { width: 390 });
    await phone.page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(palette(phone.page)).toBeVisible();
    await expectAccessible(phone.page);
    await palette(phone.page).getByRole('button', { name: 'Close' }).click();
    await expect(palette(phone.page)).toHaveCount(0);
    await phone.close();
  });

  test('the Search page: two characters, then the groups; the words stay in the address', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/search');
    await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible();
    await expect(page.locator('main')).toContainText('Type at least two characters.');
    await expectAccessible(page);
    await page.getByRole('textbox', { name: 'Search users, workspaces, orders, skills, pages' }).fill('north');
    for (const g of ['Users', 'Workspaces', 'Orders'])
      await expect(page.getByRole('heading', { level: 2, name: g })).toBeVisible();
    await expect(page).toHaveURL(/q=north/);
    await expectAccessible(page);
    await page.getByRole('link', { name: 'Northshore Group' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Northshore Group' })).toBeVisible();
    await page.goto(`${APP_BASE}/admin/search?q=zzzz&as=admin`);
    await expect(page.locator('main')).toContainText('No results for "zzzz"');
    await close();
  });

  test('production’s sidebar lists People, whose tabs are Everyone and Teams (D-253)', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/people');
    const aside = page.locator('aside[aria-label="Primary"]');
    await expect(aside.getByRole('button', { name: 'People' })).toHaveAttribute('aria-current', 'page');
    // D-268: Everyone and Teams carry their counts.
    await expect(page.getByRole('tablist', { name: 'People' }).getByRole('tab')).toHaveText([/^Everyone\d+$/, /^Teams\d+$/, 'Masquerade']);
    await close();
  });
});
