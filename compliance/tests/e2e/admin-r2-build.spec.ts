import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-160 R2-2: the Build screens on the Admin redesign R2, in the fixture build with the mockup's own
 * data (`?parity=r2`, fixture only) at the mockup's "now" (Thu, Dec 10, 2026, 9:30 AM MST). Each one
 * passes axe (zero serious or critical) at desktop and phone widths, keeps the shell's landmarks, and
 * does what BUILD-SPEC § 7 decided: "Hidden from learners" in full at 1280 and up, a "Hidden" pill at
 * laptop width, the meta line on a phone; Live session's short name at 1280 with the full title in
 * its title and name; row numbers only at 1440; one zone label, MST, and no CT.
 */

const NOW = '2026-12-10T16:30:00.000Z';

async function openAt(browser: Browser, path: string, width = 1440): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({
    timezoneId: 'America/Phoenix',
    viewport: { width, height: width < 768 ? 844 : 900 },
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${APP_BASE}${path}${sep}as=admin&parity=r2&now=${encodeURIComponent(NOW)}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  return { page, close: () => ctx.close() };
}

async function expectShell(page: Page) {
  await expect(page.locator('aside[aria-label="Primary"]')).toHaveCount(1);
  await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
}

const noCentral = async (page: Page) => {
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\bCT\b|Central/);
};

test.describe('Curriculum on R2 (D-160 R2-2) @g9 @r2', () => {
  test('passes axe and keeps the landmarks, at 1440, 1280, 1024 and 390', async ({ browser }) => {
    for (const w of [1440, 1280, 1024, 390]) {
      const { page, close } = await openAt(browser, '/admin/curriculum', w);
      await expectShell(page);
      await expect(page.getByRole('heading', { level: 1, name: 'Curriculum' })).toBeVisible();
      await noCentral(page);
      await expectAccessible(page);
      await close();
    }
  });

  test('BUILD-SPEC § 7: row numbers at 1440 only; the short Live session at 1280; Hidden in full, as a pill, on the meta line', async ({
    browser,
  }) => {
    const wide = await openAt(browser, '/admin/curriculum', 1440);
    const row = (p: Page, name: string) => p.getByRole('row').filter({ hasText: name });
    await expect(row(wide.page, 'Week 1 · Know the Business').getByRole('cell').nth(1)).toContainText(/^3/);
    await expect(row(wide.page, 'Week 1 · Know the Business')).toContainText('Session 1 · Lead-Source ROI Live Build');
    await expect(row(wide.page, 'Finance AI Employee')).toContainText('Hidden from learners');
    await wide.close();

    const desk = await openAt(browser, '/admin/curriculum', 1280);
    const full = 'Session 1 · Lead-Source ROI Live Build · Wed, Dec 2 · 12:00 PM MST · Replay ready';
    const cell = desk.page.getByLabel(full);
    await expect(cell).toHaveAttribute('title', full);
    await expect(cell).toContainText('Lead-Source ROI');
    await expect(cell).toContainText('Wed, Dec 2 · 12:00 PM');
    await expect(cell).not.toContainText('Live Build');
    await expect(row(desk.page, 'Week 1 · Know the Business').getByRole('cell').nth(1)).not.toContainText(/^3/);
    await expect(row(desk.page, 'Finance AI Employee')).toContainText('Hidden from learners');
    await desk.close();

    const lap = await openAt(browser, '/admin/curriculum', 1024);
    const hidden = row(lap.page, 'Finance AI Employee').getByLabel('Hidden from learners');
    await expect(hidden).toHaveText('Hidden');
    await expect(hidden).toHaveAttribute('title', 'Hidden from learners');
    await expect(row(lap.page, 'Week 1 · Know the Business')).toContainText('Session 1 · Wed, Dec 2 · 12:00 PM MST');
    await lap.close();

    const phone = await openAt(browser, '/admin/curriculum', 390);
    await expect(phone.page.getByText('Hidden from learners · Wed, Dec 30')).toBeVisible();
    await expect(phone.page.getByLabel('Draft. Hidden from learners').first()).toHaveAttribute('title', 'Hidden from learners');
    await phone.close();
  });

  test('reorders with Alt and an arrow key, changes tier access, and publishes after the confirm', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/curriculum', 1440);
    const first = () => page.getByRole('row').nth(1);
    await expect(first()).toContainText('Marketing AI Employee');
    await page.getByRole('button', { name: 'Reorder row 2. Alt plus arrow keys move it.' }).press('Alt+ArrowUp');
    await expect(first()).toContainText('Week 0 · Get Ready');

    const sales = page.getByRole('row').filter({ hasText: 'Sales AI Employee' });
    await sales.getByRole('button', { name: 'Tier access: Agent + Team' }).click();
    await page.getByRole('menuitem', { name: 'Team only' }).click();
    await expect(sales.getByRole('button', { name: 'Tier access: Team only' })).toBeVisible();

    const finance = page.getByRole('row').filter({ hasText: 'Finance AI Employee' });
    await finance.getByRole('button', { name: 'Publish', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Publish Finance AI Employee?' });
    await expect(dialog).toContainText('Learners with access see it in the portal right away.');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(finance).toContainText('Draft');
    await close();
  });
});

test.describe('Module Builder on R2 (D-160 R2-2) @g9 @r2', () => {
  test('passes axe and keeps the landmarks, at 1440, 1280, 1024 and 390, for an AI Employee and a new one', async ({
    browser,
  }) => {
    for (const path of ['/admin/curriculum/m1', '/admin/curriculum/new'])
      for (const w of [1440, 1280, 1024, 390]) {
        const { page, close } = await openAt(browser, path, w);
        await expectShell(page);
        await expect(page.getByRole('heading', { level: 1, name: 'Module Builder' })).toBeVisible();
        await noCentral(page);
        await expectAccessible(page);
        await close();
      }
  });

  test('edits in place, asks before leaving with unsaved changes, and keeps the details in Edit details', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/curriculum/m1', 1440);
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Step 1 title' }).fill('What this AI Employee does for you');
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit details' }).click();
    const details = page.getByRole('dialog', { name: 'Edit details' });
    await expect(details.getByLabel('Output 1')).toBeVisible();
    await expectAccessible(page);
    await details.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('navigation', { name: 'AI Employees' }).getByRole('button', { name: 'Sales AI Employee' }).click();
    await expect(page.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeVisible();
    await page.getByRole('button', { name: 'Keep Editing' }).click();
    await expect(page.getByRole('textbox', { name: 'Step 1 title' })).toHaveValue('What this AI Employee does for you');
    await close();
  });
});
