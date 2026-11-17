import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-172 R2-gaps: the R2 mockup's remaining controls, made real, in the fixture build with the mockup's
 * own data (`?parity=r2`, fixture only) at the mockup's "now" (Thu, Dec 10, 2026, 9:30 AM MST). Each
 * one does what it says, through the same `@ai/core` function the API runs (the API writes the audit
 * row; `apps/api/test/admin-actions.test.ts` checks it), and each new menu and dialog passes axe.
 */

const NOW = '2026-12-10T16:30:00.000Z';

/**
 * The page as the admin. `parity` (the default) is the mockup's data; without it, the ordinary fixture
 * (the seed), whose AI Employees carry everything the publish checks need, so a save goes through.
 */
async function openAt(browser: Browser, path: string, width = 1280, parity = true): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width, height: width < 768 ? 844 : 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${APP_BASE}${path}${sep}as=admin${parity ? '&parity=r2' : ''}&now=${encodeURIComponent(NOW)}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const rowOf = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });

test.describe('R2-gaps a: Curriculum › Duplicate and the Module Builder’s steps (D-172) @g9 @r2', () => {
  test('Curriculum: a row’s "…" › Duplicate adds a draft copy and says so', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/curriculum');
    const row = rowOf(page, 'Sales AI Employee').first();
    await row.getByRole('button', { name: 'More actions' }).click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveText(['Edit in Module Builder', 'Preview as Learner', 'Duplicate', 'Unpublish']);
    await expectAccessible(page);
    await menu.getByRole('menuitem', { name: 'Duplicate' }).click();
    await expect(page.getByText('Duplicated as a draft')).toBeVisible();
    const copy = rowOf(page, 'Sales AI Employee (copy)');
    await expect(copy).toHaveCount(1);
    await expect(copy).toContainText('Draft');
    await expect(copy).toContainText('Hidden from learners');
    await close();
  });

  test('Builder: Add step, Duplicate step and Remove step change the draft; Save changes keeps them', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/curriculum/sales', 1280, false);
    const steps = page.getByRole('heading', { name: /^Steps · / });
    await expect(steps).toHaveText('Steps · 6');
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

    await page.getByRole('button', { name: 'Add step' }).click();
    await expect(steps).toHaveText('Steps · 7');
    await expect(page.getByRole('textbox', { name: 'Step 7 title' })).toHaveValue('New step');
    await expect(rowOf(page, 'New step').last()).toContainText('Build');
    await expect(rowOf(page, 'New step').last()).toContainText('5 min');
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();

    // Duplicate step 3: a copy, last.
    const third = await page.getByRole('textbox', { name: 'Step 3 title' }).inputValue();
    await page.getByRole('row').filter({ has: page.getByRole('textbox', { name: 'Step 3 title' }) }).getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menu').getByRole('menuitem')).toHaveText(['Edit step details', 'Duplicate step', 'Remove step']);
    await expectAccessible(page);
    await page.getByRole('menuitem', { name: 'Duplicate step' }).click();
    await expect(steps).toHaveText('Steps · 8');
    await expect(page.getByRole('textbox', { name: 'Step 8 title' })).toHaveValue(third);

    // Remove step 2, after the confirm; Cancel first changes nothing.
    const second = await page.getByRole('textbox', { name: 'Step 2 title' }).inputValue();
    const removeVia = async () => {
      await page.getByRole('row').filter({ has: page.getByRole('textbox', { name: 'Step 2 title' }) }).getByRole('button', { name: 'More actions' }).click();
      await page.getByRole('menuitem', { name: 'Remove step' }).click();
    };
    await removeVia();
    const dialog = page.getByRole('dialog', { name: 'Remove step 2?' });
    await expect(dialog).toContainText(`“${second}” is removed when you save. Learners’ checks on it are cleared.`);
    await expect(dialog).toContainText('This action is audit-logged.');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(steps).toHaveText('Steps · 8');
    await removeVia();
    await page.getByRole('dialog', { name: 'Remove step 2?' }).getByRole('button', { name: 'Remove step' }).click();
    await expect(steps).toHaveText('Steps · 7');
    await expect(page.getByRole('textbox', { name: 'Step 2 title' })).not.toHaveValue(second);

    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
    await expect(steps).toHaveText('Steps · 7');
    await close();
  });

  test('Builder: Discard undoes an unsaved Add step', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/curriculum/m1');
    await page.getByRole('button', { name: 'Add step' }).click();
    await expect(page.getByRole('heading', { name: 'Steps · 7' })).toBeVisible();
    await page.getByRole('navigation', { name: 'AI Employees' }).getByRole('button', { name: 'Sales AI Employee' }).click();
    const ask = page.getByRole('dialog', { name: 'Discard unsaved changes?' });
    await ask.getByRole('button', { name: 'Discard' }).click();
    await expect(page.getByRole('heading', { name: 'Steps · 6' })).toBeVisible();
    await page.getByRole('navigation', { name: 'AI Employees' }).getByRole('button', { name: 'Marketing AI Employee' }).click();
    await expect(page.getByRole('heading', { name: 'Steps · 6' })).toBeVisible();
    await close();
  });

  test('Builder: a saved step count reaches Curriculum', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/curriculum/sales', 1280, false);
    await page.getByRole('button', { name: 'Add step' }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
    // The parity snapshot lives in this tab only, so the check stays in the app (no reload).
    await page.getByRole('navigation', { name: 'Admin' }).getByRole('button', { name: 'Curriculum' }).click();
    await expect(rowOf(page, 'Sales AI Employee').first()).toContainText('7 steps');
    await close();
  });
});
