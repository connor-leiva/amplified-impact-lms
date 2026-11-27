import { readFile } from 'node:fs/promises';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-166 (Console PR 7): the Email Log and Usage on R2 (spec §§ 7.7, 7.15), a workspace's Usage tab and
 * a user's "Emails sent", in the fixture build. The Console fixture answers with the R2 mockup's own
 * `EMAILS` and `Usage` figures (`apps/web/src/data/parity-r2.ts`); their pixels are
 * `pnpm parity:admin-r2`'s. These hold the behaviour: the filters, the detail with its note, the
 * export and who may make it, the tiles and chart, the states, and Denied. Every state passes axe.
 * D-263: each send's delivery, opens and clicks from Resend's webhook, and the rollup tiles, which
 * follow the filters.
 */

const NOW = '2026-12-10T09:30:00-07:00';

async function openAt(browser: Browser, path: string, opts: { width?: number } = {}): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width: opts.width ?? 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript(() =>
    localStorage.setItem('ai-lms-prefs', JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' })),
  );
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const rows = (page: Page) => page.locator('main [role="table"] [role="row"]').filter({ has: page.locator('[role="cell"]') });
const crumbs = (page: Page) => page.locator('header nav[aria-label="Breadcrumb"]');

test.describe('the Email Log on R2 (D-166) @g9 @console', () => {
  test('lists the log, filters it, and opens a send’s detail, which keeps no body', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/email');
    await expect(page.getByRole('heading', { level: 1, name: 'Email Log' })).toBeVisible();
    await expect(crumbs(page)).toHaveText('Admin/Operations/Email Log');
    await expect(page.locator('aside[aria-label="Primary"] [aria-current="page"]')).toContainText('Email Log');
    await expect(rows(page)).toHaveCount(7);
    await expect(rows(page).first()).toContainText('Tomorrow at 12:00 PM MT / 1:00 PM CT: Session 2 live build');
    await expect(rows(page).first()).toContainText('Dec 8, 12:00 PM');
    // D-263: the rollup over every row the filters pick, and each row's opens and clicks.
    // The tiles' grid is the Sent tile's parent; a tile is its label's parent ("Sent" and "Delivered" are row words too).
    const grid = page.locator('main').getByText('Last 180 days', { exact: true }).locator('../..');
    const tile = (label: string) => grid.getByText(label, { exact: true }).locator('..');
    await expect(tile('Sent')).toContainText('7Last 180 days');
    await expect(tile('Delivered')).toContainText('71%5 of 7 sent');
    await expect(tile('Bounced')).toContainText('114% of sent');
    await expect(tile('Unique opens')).toContainText('80%4 of 5 delivered');
    await expect(tile('Unique clicks')).toContainText('60%3 of 5 delivered');
    for (const h of ['Opens', 'Clicks']) await expect(page.getByRole('columnheader', { name: h })).toBeVisible();
    await expect(rows(page).nth(2).getByRole('cell').nth(4)).toHaveText('3');
    await expect(rows(page).nth(2).getByRole('cell').nth(5)).toHaveText('2');
    await expectAccessible(page);

    await page.getByRole('combobox', { name: 'Template' }).selectOption({ label: 'weekly-digest' });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Bounced');
    await expect(tile('Bounced')).toContainText('1100% of sent');
    await expect(tile('Unique opens')).toContainText('—0 of 0 delivered');
    await page.getByRole('combobox', { name: 'Template' }).selectOption({ label: 'Any template' });
    await page.getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Sent' });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Receipt for Team Plan, 16 seats');
    await expect(tile('Delivered')).toContainText('0%0 of 1 sent');
    await page.getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Any status' });
    await page.getByRole('textbox', { name: 'Filter recipient or subject' }).fill('nobody at all');
    await expect(page.getByText('No matches')).toBeVisible();
    await page.getByRole('textbox', { name: 'Filter recipient or subject' }).fill('tidewater');
    await expect(rows(page)).toHaveCount(1);
    await page.getByRole('textbox', { name: 'Filter recipient or subject' }).fill('');
    await expect(rows(page)).toHaveCount(7);

    await rows(page).nth(1).getByRole('cell').nth(2).click();
    const dialog = page.getByRole('dialog', { name: 'Your Insiders payment did not go through' });
    await expect(dialog).toBeVisible();
    for (const t of ['sam@tidewaterproperty.example', 'Amplified Impact', 'payment-failed', 'Resend', 'First opened', 'Last opened'])
      await expect(dialog.getByText(t, { exact: true })).toBeVisible();
    // Sent and Delivered the same minute; one open, so its first and last are the same minute too.
    await expect(dialog.getByText('Dec 4, 9:04 AM MT', { exact: true })).toHaveCount(2);
    await expect(dialog.getByText('Dec 4, 9:30 AM MT', { exact: true })).toHaveCount(2);
    await expect(dialog).toContainText('The log keeps the subject and delivery events. The message body is not stored here.');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toHaveCount(0);
    await close();
  });

  test('opens filtered from a link (Billing’s “Open email log”)', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/email?q=sam%40tidewaterproperty.example');
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByRole('textbox', { name: 'Filter recipient or subject' })).toHaveValue('sam@tidewaterproperty.example');
    await close();
    // One workspace's people, named on a chip that clears it.
    const ws = await openAt(browser, '/admin/email?teamId=ws_tidewater&workspace=Tidewater%20Property%20Co.');
    await expect(rows(ws.page)).toHaveCount(1);
    await expect(rows(ws.page).first()).toContainText('sam@tidewaterproperty.example');
    await expectAccessible(ws.page);
    await ws.page.getByRole('button', { name: 'Workspace: Tidewater Property Co.' }).click();
    await expect(rows(ws.page)).toHaveCount(7);
    await ws.close();
  });

  test('exports CSV, all or selected, for the Owner and Admin; Support reads and cannot export', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/email');
    const [all] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
    expect(all.suggestedFilename()).toMatch(/^email-log-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = (await readFile((await all.path())!, 'utf8')).trimEnd().split('\r\n');
    expect(csv[0]).toBe(
      '"id","sent_at","to","user_id","template","subject","provider","provider_id","status","error_kind",' +
        '"delivery","delivered_at","delayed_at","bounced_at","bounce_type","bounce_sub_type","bounce_message","complained_at",' +
        '"open_count","first_opened_at","last_opened_at","click_count","first_clicked_at","last_clicked_at","last_clicked_link"',
    );
    expect(csv).toHaveLength(8);
    await expect(page.getByRole('status').filter({ hasText: 'Export started. It is in the audit log.' })).toBeVisible();
    await rows(page).nth(0).getByRole('checkbox', { name: 'Select row' }).check();
    await rows(page).nth(4).getByRole('checkbox', { name: 'Select row' }).check();
    const [picked] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export selected' }).click()]);
    const lines = (await readFile((await picked.path())!, 'utf8')).trimEnd().split('\r\n');
    expect(lines.slice(1).map((l) => l.split(',')[0])).toEqual(['"1"', '"5"']);
    await close();

    const support = await openAt(browser, '/admin/email?console-role=Support');
    await expect(rows(support.page)).toHaveCount(7);
    await expect(support.page.getByRole('button', { name: 'Export CSV' })).toHaveCount(0);
    await rows(support.page).first().getByRole('checkbox', { name: 'Select row' }).check();
    await expect(support.page.getByRole('button', { name: 'Export selected' })).toBeDisabled();
    await expectAccessible(support.page);
    await support.close();
  });

  test('the shared states, and Denied for a role without email.read', async ({ browser }) => {
    for (const [state, text] of [
      ['empty', 'No emails sent yet'],
      // D-263: an empty log's tiles have nothing to rate.
      ['empty', 'None sent'],
      ['error', 'This didn’t load.'],
      ['rate_limited', 'Too many requests.'],
    ] as const) {
      const { page, close } = await openAt(browser, `/admin/email?console-state=${state}`);
      await expect(page.locator('main')).toContainText(text);
      await expectAccessible(page);
      await close();
    }
    const denied = await openAt(browser, '/admin/email?console-role=Instructor');
    await expect(denied.page.getByRole('heading', { name: "Your role can't open Email Log" })).toBeVisible();
    await denied.close();
  });
});

test.describe('Usage on R2 (D-166) @g9 @console', () => {
  test('the six tiles, sign-ins per day and By workspace, and its filters', async ({ browser }) => {
    // D-253: Revenue › Usage; the old address lands there.
    const { page, close } = await openAt(browser, '/admin/usage');
    await expect(page).toHaveURL(/\/admin\/revenue\/usage(\?|$)/);
    await expect(page.getByRole('heading', { level: 1, name: 'Revenue' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Usage' })).toHaveAttribute('aria-selected', 'true');
    await expect(crumbs(page)).toHaveText('Admin/Revenue/Usage');
    await expect(page.locator('aside[aria-label="Primary"] [aria-current="page"]')).toContainText('Revenue');
    for (const t of ['1,648', '4,429', '7,622', '82%', '41.2 GB', 'of 100 GB bucket', '2,987'])
      await expect(page.locator('main').getByText(t, { exact: true })).toBeVisible();
    // The app's own clock (the fixture's "now") ends the range; the parity run freezes it at Dec 10.
    await expect(page.getByRole('img', { name: /^Sign-ins per day, [A-Z][a-z]{2} \d+ to [A-Z][a-z]{2} \d+: / })).toBeVisible();
    await expect(rows(page)).toHaveCount(6);
    await expect(rows(page).first()).toContainText('Northshore Group');
    await expect(rows(page).first()).toContainText('80%');
    await expectAccessible(page);

    await page.getByRole('combobox', { name: 'Plan' }).selectOption({ label: 'Insiders' });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Tidewater Property Co.');
    await page.getByRole('combobox', { name: 'Plan' }).selectOption({ label: 'All plans' });
    await page.getByRole('combobox', { name: 'Workspace' }).selectOption({ label: 'Red Cliff Collective' });
    await expect(rows(page)).toHaveCount(1);
    await expect(page.locator('main').getByText('736', { exact: true }).first()).toBeVisible();
    await page.getByRole('combobox', { name: 'Date range' }).selectOption({ label: 'Last 30 days' });
    await expect(page.locator('main')).toContainText('Last 30 days');
    await close();
  });

  test('before anything is counted it says when counting starts; errors and Denied', async ({ browser }) => {
    const empty = await openAt(browser, '/admin/usage?console-state=empty');
    await expect(empty.page.locator('main')).toContainText(/Usage starts counting on [A-Z][a-z]{2} \d+, 2026/);
    await expect(empty.page.locator('main')).toContainText('No usage in this range');
    await expectAccessible(empty.page);
    await empty.close();
    const failed = await openAt(browser, '/admin/usage?console-state=rate_limited');
    await expect(failed.page.locator('main')).toContainText('Too many requests.');
    await failed.close();
    const support = await openAt(browser, '/admin/usage?console-role=Support');
    await expect(support.page.locator('main')).toContainText('1,648');
    await support.close();
    const denied = await openAt(browser, '/admin/usage?console-role=Instructor');
    await expect(denied.page.getByRole('heading', { name: "Your role can't open Usage" })).toBeVisible();
    await denied.close();
  });
});

test.describe('the record tabs (D-166) @g9 @console', () => {
  test('a workspace’s Usage tab: the last 7 days, four tiles', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/workspaces/ws_northshore');
    await page.getByRole('tablist', { name: 'Section' }).getByRole('tab', { name: 'Usage' }).click();
    for (const t of ['Sign-ins, 7d', '198', 'Lesson plays, 7d', '132', 'Guide views, 7d', '297', 'Storage', '6.6 GB'])
      await expect(page.locator('main').getByText(t, { exact: true })).toBeVisible();
    await expectAccessible(page);
    await close();
  });

  test('a user’s Emails sent: the log for their address', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/users/u_1042');
    await page.getByRole('tablist', { name: 'Section' }).getByRole('tab', { name: 'Emails sent' }).click();
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Tomorrow at 12:00 PM MT / 1:00 PM CT: Session 2 live build');
    await expect(rows(page).first()).toContainText('Delivered');
    await expectAccessible(page);
    await close();
    const none = await openAt(browser, '/admin/users/u_1043');
    await none.page.getByRole('tablist', { name: 'Section' }).getByRole('tab', { name: 'Emails sent' }).click();
    await expect(none.page.locator('main')).toContainText('No emails sent to this user');
    await none.close();
  });
});
