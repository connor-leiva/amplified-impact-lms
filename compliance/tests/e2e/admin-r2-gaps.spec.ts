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

test.describe('R2-gaps b: the Resource Vault, Cohorts & Sessions and Announcements (D-172) @g9 @r2', () => {
  test('Vault: the hover Download saves the file; Edit details changes the row and its Attached to', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/vault');
    const row = rowOf(page, 'Standard chart of accounts');
    await row.hover();
    const dl = row.getByRole('button', { name: 'Download' });
    await expect(dl).toBeVisible();
    const saved = page.waitForEvent('download');
    await dl.click();
    expect((await saved).suggestedFilename()).toBe('standard-chart-of-accounts.md');
    await expect(page.getByText('Download started')).toBeVisible();

    await row.getByRole('button', { name: 'More actions' }).click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveText(['Edit details', 'Replace file', 'Give Agent + Team access', 'Hide from learners', 'Remove from vault']);
    // D-188: Replace file works now (a real upload); `vault-upload.spec.ts` drives it.
    await expect(menu.getByRole('menuitem', { name: 'Replace file' })).toBeEnabled();
    await expectAccessible(page);
    await menu.getByRole('menuitem', { name: 'Edit details' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit details' });
    await expect(dialog.getByLabel('Title')).toHaveValue('Standard chart of accounts');
    await expect(dialog.getByLabel('Attached to')).toHaveValue('m10');
    await expectAccessible(page);
    await dialog.getByLabel('Title').fill('Standard chart of accounts v2');
    await dialog.getByLabel('Attached to').selectOption({ label: 'Sales AI Employee' });
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog).toHaveCount(0);
    const edited = rowOf(page, 'Standard chart of accounts v2');
    await expect(edited).toContainText('Sales AI Employee');

    // None detaches: "Attached to" reads "—".
    await edited.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit details' }).click();
    await page.getByRole('dialog', { name: 'Edit details' }).getByLabel('Attached to').selectOption({ label: 'None' });
    await page.getByRole('dialog', { name: 'Edit details' }).getByRole('button', { name: 'Save changes' }).click();
    await expect(rowOf(page, 'Standard chart of accounts v2')).toContainText('—');
    await close();
  });

  test('Cohorts: Add session adds the next session in MST; Attach replay takes a past session’s link', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/cohorts');
    await page.getByRole('button', { name: 'Add session' }).click();
    const add = page.getByRole('dialog', { name: 'Add session' });
    await expect(add.getByLabel('Start time (MST)')).toHaveValue('12:00');
    await expect(add.getByLabel('Duration (minutes)')).toHaveValue('75');
    await expectAccessible(page);
    await add.getByRole('button', { name: 'Add session' }).click();
    await expect(add.getByRole('alert')).toHaveText('Add a title.');
    await add.getByLabel('Title').fill('Office Hours');
    await add.getByLabel('Date').fill('2027-01-13');
    await add.getByRole('button', { name: 'Add session' }).click();
    await expect(add).toHaveCount(0);
    const added = rowOf(page, 'Session 7 · Office Hours');
    await expect(added).toContainText('Wed, Jan 13 · 12:00 PM MST');
    await expect(added).toContainText('Draft');

    // A session still to come: Attach replay is there, and disabled.
    await rowOf(page, 'Session 4 ·').getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Attach replay' })).toBeDisabled();
    await page.keyboard.press('Escape');

    await rowOf(page, 'Session 2 ·').getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menu').getByRole('menuitem')).toHaveText(['Edit session', 'Copy join link', 'Attach replay']);
    await page.getByRole('menuitem', { name: 'Attach replay' }).click();
    const attach = page.getByRole('dialog', { name: 'Attach replay' });
    await expectAccessible(page);
    await attach.getByLabel('Replay link for Session 2').fill('http://example.com/replay');
    await attach.getByRole('button', { name: 'Attach replay' }).click();
    await expect(attach.getByRole('alert')).toHaveText('Enter the replay’s https:// link.');
    await attach.getByLabel('Replay link for Session 2').fill('https://example.com/replays/session-2');
    await attach.getByRole('button', { name: 'Attach replay' }).click();
    await expect(attach).toHaveCount(0);
    await expect(page.getByText('Session 2 replay attached')).toBeVisible();
    await close();
  });

  test('Announcements: Save draft adds a draft; Edit is for drafts and scheduled ones; Duplicate copies as a draft', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/announcements');
    await page.getByRole('button', { name: 'New announcement' }).click();
    const dialog = page.getByRole('dialog', { name: 'New announcement' });
    await expect(dialog.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    await dialog.getByLabel('Title').fill('Office hours move to Thursday');
    await dialog.getByRole('button', { name: 'Save draft' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Saved as a draft')).toBeVisible();
    const draft = rowOf(page, 'Office hours move to Thursday');
    await expect(draft).toContainText('Draft');
    await expect(draft).toContainText('—');

    // A sent row's Edit is drawn disabled; Duplicate copies it as a draft.
    await rowOf(page, 'Session 2 replay is ready').getByRole('button', { name: 'More actions' }).click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveText(['Edit', 'Duplicate']);
    await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeDisabled();
    await expectAccessible(page);
    await menu.getByRole('menuitem', { name: 'Duplicate' }).click();
    await expect(page.getByText('Duplicated as a draft')).toBeVisible();
    await expect(rowOf(page, 'Session 2 replay is ready')).toHaveCount(2);
    await expect(page.getByRole('row').nth(1)).toContainText('Draft');

    // Edit the draft: the dialog filled in, saved as a draft again.
    await rowOf(page, 'Office hours move to Thursday').getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit announcement' });
    await expect(edit.getByLabel('Title')).toHaveValue('Office hours move to Thursday');
    await expectAccessible(page);
    await edit.getByLabel('Title').fill('Office hours moved to Thursday');
    await edit.getByRole('button', { name: 'Save draft' }).click();
    await expect(edit).toHaveCount(0);
    await expect(rowOf(page, 'Office hours moved to Thursday')).toContainText('Draft');
    await close();
  });
});

test.describe('R2-gaps c: the Audit Log’s Export selected, and Roles’ Invite staff and Change role… (D-172) @g9 @r2', () => {
  test('Audit Log: Export selected saves exactly the selected rows, and the export is in the log', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit');
    const table = page.getByRole('table', { name: 'Audit log entries' });
    const boxes = table.getByRole('checkbox', { name: 'Select row' });
    await boxes.nth(0).check();
    await boxes.nth(2).check();
    await expect(page.getByText('2 selected')).toBeVisible();
    const saved = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export selected' }).click();
    const file = await saved;
    expect(file.suggestedFilename()).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c as Buffer[]).toString('utf8'));
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('job.run_now');
    expect(lines[2]).toContain('masquerade.blocked_action');
    await expect(table.getByText('CSV, 2 rows.')).toBeVisible();
    await close();
  });

  test('Audit Log: a role that may not export (Support) gets no Export selected', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit?console-role=Support');
    await page.getByRole('table', { name: 'Audit log entries' }).getByRole('checkbox', { name: 'Select row' }).first().check();
    await expect(page.getByText('1 selected')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export selected' })).toHaveCount(0);
    await close();
  });

  test('Roles: Change role… is a form, then the confirm; the change is made and toasted', async ({ browser }) => {
    for (const width of [1280, 390]) {
      const { page, close } = await openAt(browser, '/admin/roles', width);
      // A phone card has no row role: the innermost block holding the name and its "…".
      const staffRow = (name: string) =>
        width < 768
          ? page.locator('main div').filter({ hasText: name }).filter({ has: page.getByRole('button', { name: 'More actions' }) }).last()
          : rowOf(page, name);
      // The Owner's own row: fixed.
      await staffRow('Connor Leiva (you)').getByRole('button', { name: 'More actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Change role…' })).toBeDisabled();
      await page.keyboard.press('Escape');

      await staffRow('Avery Stone').getByRole('button', { name: 'More actions' }).click();
      await page.getByRole('menuitem', { name: 'Change role…' }).click();
      const form = page.getByRole('dialog', { name: 'Change role for Avery Stone' });
      await expect(form.getByLabel('Role')).toHaveValue('Admin');
      await expect(form.getByRole('button', { name: 'Continue' })).toBeDisabled();
      await expectAccessible(page);
      await form.getByLabel('Role').selectOption('Support');
      await form.getByRole('button', { name: 'Continue' }).click();
      const confirm = page.getByRole('dialog', { name: 'Change Avery Stone to Support?' });
      await expect(confirm).toContainText('Admin to Support. It applies right away.');
      await expect(confirm).toContainText('This action is audit-logged.');
      await expectAccessible(page);
      await confirm.getByRole('button', { name: 'Change role' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByText('Avery Stone is now Support')).toBeVisible();
      await close();
    }
  });

  test('Roles: Invite staff is a form, then the confirm; the new member is on staff; a bad address is refused', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/roles');
    await page.getByRole('button', { name: 'Invite staff' }).click();
    const form = page.getByRole('dialog', { name: 'Invite staff' });
    await expect(form.getByLabel('Role').locator('option')).toHaveText(['Admin', 'Instructor', 'Content Editor', 'Support']);
    await expectAccessible(page);
    await form.getByLabel('Email').fill('not-an-email');
    await form.getByRole('button', { name: 'Continue' }).click();
    await expect(form.getByRole('alert')).toHaveText('Enter a valid email address.');
    await form.getByLabel('Email').fill('jo.hale@amplifiedimpact.example');
    await form.getByLabel('Role').selectOption('Instructor');
    await form.getByRole('button', { name: 'Continue' }).click();
    const confirm = page.getByRole('dialog', { name: 'Invite jo.hale@amplifiedimpact.example as Instructor?' });
    await expect(confirm).toContainText('They join staff as Instructor right away. No email is sent.');
    await confirm.getByRole('button', { name: 'Invite staff' }).click();
    await expect(page.getByText('jo.hale@amplifiedimpact.example added to staff as Instructor')).toBeVisible();
    await expect(rowOf(page, 'Jo Hale')).toContainText('Instructor');
    await close();
  });

  test('Roles: for anyone but the Owner, Invite staff and Change role… are locked', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/roles?console-role=Admin');
    await expect(page.getByRole('button', { name: 'Invite staff' })).toHaveAttribute('aria-disabled', 'true');
    await rowOf(page, 'Imani Brooks').getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Change role…' })).toBeDisabled();
    await close();
  });
});
