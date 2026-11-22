import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-238 (B-45): Admin › Support › Community, in the fixture build with the admin mockup's own threads, at the
 * mockup's "now" (Fri, Nov 20, 2026, 3:20 PM CT). The list's facts, tabs, find and space; a row's Pin and Hide; Start
 * a thread; a thread's Reply as staff, Hide a reply and the deletes behind the confirm; the sidebar's "N waiting";
 * and axe on each.
 */

const NOW = '2026-11-20T21:20:00.000Z';

async function openAt(browser: Browser, path: string, width = 1440, role?: string): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', viewport: { width, height: width < 768 ? 844 : 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(`${APP_BASE}${path}?as=admin${role ? `&console-role=${role}` : ''}&now=${encodeURIComponent(NOW)}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const rows = (page: Page) => page.locator('main').getByRole('row').filter({ has: page.getByRole('cell') });
const toast = (page: Page, text: string) => page.getByText(text, { exact: true });
const communityRow = (page: Page) => page.locator('aside[aria-label="Primary"]').getByRole('button', { name: /^Community/ });

test.describe('Admin › Support › Community (D-238) @g9 @console', () => {
  test('the list: the facts, the tabs, find and space, as the mockup', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/community');
    await expect(page.getByRole('heading', { level: 1, name: 'Community' })).toBeVisible();
    await expect(page.locator('main')).toContainText('148 in 7 teams');
    // The sidebar: the row, under Support, with what waits on staff.
    await expect(communityRow(page)).toHaveText('Community3 waiting');
    await expect(rows(page)).toHaveCount(5);
    await expect(rows(page).first()).toContainText('Start here: how to ask so the cohort can help');
    await expect(rows(page).first()).toContainText('Pinned');
    await page.getByRole('tab', { name: /Waiting on you/ }).click();
    await expect(rows(page)).toHaveCount(3);
    await page.getByRole('tab', { name: /^All/ }).click();
    await page.getByRole('combobox', { name: 'Space' }).selectOption({ label: 'Week 0 · Foundations' });
    await expect(rows(page)).toHaveCount(2);
    await page.getByRole('textbox', { name: 'Find a thread' }).fill('quickbooks');
    await expect(rows(page)).toHaveCount(1);
    await expectAccessible(page);
    await page.getByRole('textbox', { name: 'Find a thread' }).fill('nothing like this');
    await expect(page.locator('main')).toContainText('No threads here');
    await close();
  });

  test('a row’s menu pins and hides, each toasted and shown on the row', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/community');
    const row = rows(page).filter({ hasText: 'Ready Check is green on Claude' });
    await row.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('menuitem', { name: 'Pin to the top' }).click();
    await expect(toast(page, 'Pinned to the top for the cohort')).toBeVisible();
    await expect(row).toContainText('Pinned');
    await row.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Hide from the cohort' }).click();
    await expect(toast(page, 'Hidden. Only staff can see it.')).toBeVisible();
    await expect(row).toContainText('Hidden');
    // A hidden thread waits on no one: the tab and the sidebar count drop.
    await expect(page.getByRole('tab', { name: /Waiting on you/ })).toContainText('2');
    await expect(communityRow(page)).toHaveText('Community2 waiting');
    await close();
  });

  test('Start a thread posts as staff and opens the new thread', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/community');
    await page.getByRole('button', { name: 'Start a thread' }).click();
    const dialog = page.getByRole('dialog', { name: 'Start a thread' });
    await expect(dialog).toContainText('Posts as Casey Lin · Staff. Everyone in the cohort can read it. Nothing is emailed.');
    await expect(dialog.getByRole('button', { name: 'Post thread' })).toBeDisabled();
    await expectAccessible(page);
    await dialog.getByRole('combobox', { name: 'Space' }).selectOption({ label: 'Wins' });
    await dialog.getByRole('textbox', { name: 'Title' }).fill('Office hours this week');
    await dialog.getByRole('textbox', { name: 'Details' }).fill('Thursday at noon, on the usual link.');
    await dialog.getByRole('button', { name: 'Post thread' }).click();
    await expect(toast(page, 'Posted to the cohort as staff')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Office hours this week' })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/community\/\d+/);
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveText('Admin/Support/Community/Office hours this week');
    await close();
  });

  test('a thread: Reply as staff, hide a reply, delete a reply and the thread, each behind its own step', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/community/2');
    await expect(page.getByRole('heading', { level: 1, name: /Our bookkeeper keeps the QuickBooks login/ })).toBeVisible();
    await expect(page.locator('main')).toContainText('Thu, Nov 19 · 4:10 PM CT');
    await expect(page.locator('main')).toContainText('2 replies');
    await expectAccessible(page);

    await page.getByRole('textbox', { name: 'Your reply' }).fill('An export each month is fine. Put the bookkeeper on the card.');
    await page.getByRole('button', { name: 'Reply as staff' }).click();
    await expect(toast(page, 'Reply posted as staff')).toBeVisible();
    await expect(page.locator('main')).toContainText('3 replies');
    // Staff had the last word: it no longer waits.
    await expect(page.locator('main').getByText('Waiting on you')).toHaveCount(0);
    await expect(communityRow(page)).toHaveText('Community2 waiting');

    // Hide Alex Morgan's reply.
    const alex = page.locator('main').locator('div').filter({ hasText: /^AMAlex Morgan/ }).first();
    await alex.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Hide from the cohort' }).click();
    await expect(toast(page, 'Reply hidden. Only staff can see it.')).toBeVisible();

    // Delete it, behind the confirm.
    await alex.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete reply' }).click();
    const confirm = page.getByRole('dialog', { name: 'Delete this reply?' });
    await expect(confirm).toContainText('The reply by Alex Morgan is removed for everyone. This can’t be undone.');
    await expectAccessible(page);
    await confirm.getByRole('button', { name: 'Delete' }).click();
    await expect(toast(page, 'Reply deleted')).toBeVisible();
    await expect(page.locator('main')).toContainText('2 replies');

    // Delete the thread: its first post's menu, the confirm, then back to the list.
    await page.locator('main').getByRole('button', { name: 'More actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Delete thread' }).click();
    await page.getByRole('dialog', { name: 'Delete this thread?' }).getByRole('button', { name: 'Delete' }).click();
    await expect(toast(page, 'Thread deleted')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/community$/);
    await expect(rows(page)).toHaveCount(4);
    await close();
  });

  test('Pin and Hide on a thread’s page, and the hidden note', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/community/3');
    await page.getByRole('button', { name: 'Hide from the cohort' }).click();
    await expect(toast(page, 'Hidden. Only staff can see it.')).toBeVisible();
    await expect(page.locator('main')).toContainText('Hidden from the cohort. Only staff can see this thread.');
    await expect(page.locator('main')).toContainText('No. It is hidden.');
    await page.getByRole('button', { name: 'Show to the cohort' }).click();
    await expect(toast(page, 'The cohort can see it again')).toBeVisible();
    await page.getByRole('button', { name: 'Pin to the top' }).click();
    await expect(toast(page, 'Pinned to the top for the cohort')).toBeVisible();
    await expect(page.locator('main')).toContainText('Yes, pinned to the top');
    await close();
  });

  test('Support reads and writes; an Instructor has no Community', async ({ browser }) => {
    {
      const { page, close } = await openAt(browser, '/admin/community', 1440, 'Support');
      await expect(page.getByRole('button', { name: 'Start a thread' })).toBeEnabled();
      await expect(communityRow(page)).toBeVisible();
      await close();
    }
    {
      const { page, close } = await openAt(browser, '/admin/community', 1440, 'Instructor');
      await expect(page.locator('main')).toContainText("Your role can't open Community");
      await expect(communityRow(page)).toHaveCount(0);
      await close();
    }
  });

  test('on a phone: the list as cards, a thread, both accessible', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/community', 390);
    await expect(page.getByRole('heading', { level: 1, name: 'Community' })).toBeVisible();
    await expect(page.locator('main')).toContainText('Start here: how to ask so the cohort can help');
    await expectAccessible(page);
    await page.goto(`${APP_BASE}/admin/community/2?as=admin&now=${encodeURIComponent(NOW)}`);
    await page.locator('body[data-app-ready="true"]').waitFor();
    await expect(page.getByRole('button', { name: 'Reply as staff' })).toBeVisible();
    await expectAccessible(page);
    await close();
  });
});
