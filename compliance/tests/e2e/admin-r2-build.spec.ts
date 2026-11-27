import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-160 R2-2: the Build screens on the Admin redesign R2, in the fixture build with the mockup's own
 * data (`?parity=r2`, fixture only) at the mockup's "now" (Thu, Dec 10, 2026, 9:30 AM MST). Each one
 * passes axe (zero serious or critical) at desktop and phone widths, keeps the shell's landmarks, and
 * does what BUILD-SPEC § 7 decided: "Hidden from learners" in full at 1280 and up, a "Hidden" pill at
 * laptop width, the meta line on a phone; Live session's short name at 1280 with the full title in
 * its title and name; row numbers only at 1440; one zone, MT, with CT after a time that names it (D-267). D-253 (R-5 Phase 1): each is a tab
 * now, at its new address, under its page's head (Program, or the cohort's), its own h1 dropped.
 */

const NOW = '2026-12-10T16:30:00.000Z';

async function openAt(
  browser: Browser,
  path: string,
  width = 1440,
): Promise<{ page: Page; close: () => Promise<void> }> {
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

// R-5 audit (D-267): the admin's times are MT, with CT after one that names its zone; never MST.
const noMst = async (page: Page) => {
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\bMST\b/);
};

test.describe('Curriculum on R2 (D-160 R2-2) @g9 @r2', () => {
  test('passes axe and keeps the landmarks, at 1440, 1280, 1024 and 390', async ({ browser }) => {
    for (const w of [1440, 1280, 1024, 390]) {
      const { page, close } = await openAt(browser, '/admin/program', w);
      await expectShell(page);
      // D-253: Program › Curriculum. One h1, the page's; the tab is Curriculum's (a select on a phone).
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Amplified AI Accelerator');
      if (w >= 768) await expect(page.getByRole('tab', { name: /^Curriculum/ })).toHaveAttribute('aria-selected', 'true');
      else await expect(page.getByRole('combobox', { name: 'Program' })).toHaveValue('curriculum');
      await noMst(page);
      await expectAccessible(page);
      await close();
    }
  });

  test('BUILD-SPEC § 7: row numbers at 1440 only; the short Live session at 1280; Hidden in full, as a pill, on the meta line', async ({
    browser,
  }) => {
    const wide = await openAt(browser, '/admin/program', 1440);
    const row = (p: Page, name: string) => p.getByRole('row').filter({ hasText: name });
    await expect(row(wide.page, 'Week 1 · Know the Business').getByRole('cell').nth(1)).toContainText(/^3/);
    await expect(row(wide.page, 'Week 1 · Know the Business')).toContainText('Session 1 · Lead-Source ROI Live Build');
    await expect(row(wide.page, 'Finance AI Employee')).toContainText('Hidden from learners');
    await wide.close();

    const desk = await openAt(browser, '/admin/program', 1280);
    const full = 'Session 1 · Lead-Source ROI Live Build · Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT · Replay ready';
    const cell = desk.page.getByLabel(full);
    await expect(cell).toHaveAttribute('title', full);
    await expect(cell).toContainText('Lead-Source ROI');
    await expect(cell).toContainText('Wed, Dec 2 · 12:00 PM');
    await expect(cell).not.toContainText('Live Build');
    await expect(row(desk.page, 'Week 1 · Know the Business').getByRole('cell').nth(1)).not.toContainText(/^3/);
    await expect(row(desk.page, 'Finance AI Employee')).toContainText('Hidden from learners');
    await desk.close();

    const lap = await openAt(browser, '/admin/program', 1024);
    const hidden = row(lap.page, 'Finance AI Employee').getByLabel('Hidden from learners');
    await expect(hidden).toHaveText('Hidden');
    await expect(hidden).toHaveAttribute('title', 'Hidden from learners');
    await expect(row(lap.page, 'Week 1 · Know the Business')).toContainText('Session 1 · Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT');
    await lap.close();

    const phone = await openAt(browser, '/admin/program', 390);
    await expect(phone.page.getByText('Hidden from learners · Wed, Dec 30')).toBeVisible();
    await expect(phone.page.getByLabel('Draft. Hidden from learners').first()).toHaveAttribute(
      'title',
      'Hidden from learners',
    );
    await phone.close();
  });

  test('reorders with Alt and an arrow key, changes tier access, and publishes after the confirm', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/program', 1440);
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

test.describe('Resource Vault, Cohort › Schedule and Announcements on R2 (D-160 R2-2b, D-255) @g9 @r2', () => {
  test('each passes axe and keeps the landmarks, at 1440, 1280, 1024 and 390, with no CT', async ({ browser }) => {
    // Twelve pages, each scanned by axe: about 29s alone, past the 30s default on a busy machine (D-255).
    test.setTimeout(90_000);
    for (const [path, h1, tab] of [
      ['/admin/program/vault', 'Amplified AI Accelerator', 'Resource Vault'],
      ['/admin/cohort/dec26/schedule', 'December 2026 Cohort', 'Schedule'],
      ['/admin/cohort/dec26/announcements', 'December 2026 Cohort', 'Announcements'],
    ] as const)
      for (const w of [1440, 1280, 1024, 390]) {
        const { page, close } = await openAt(browser, path, w);
        await expectShell(page);
        // D-253: each is a tab; the page's own h1 is its page's (Program, or the cohort's picker).
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
        if (w >= 768) await expect(page.getByRole('tab', { name: new RegExp(`^${tab}`) })).toHaveAttribute('aria-selected', 'true');
        // D-255 (R-5 Phase 3, PLAN.md § 10.8): the Schedule writes each time in Mountain with Central after it, what
        // learners see. R-5 audit (D-267): so does every page; none says MST.
        await noMst(page);
        await expectAccessible(page);
        await close();
      }
  });

  // D-255 (R-5 Phase 3): Cohorts & Sessions is Cohort › Schedule. Mountain, with Central after it for what learners
  // see (PLAN.md § 10.8); no dash in an empty cell, a muted "None".
  test('Schedule: Mountain with Central after it, an empty Week is a muted "None", and Edit Session is in MT', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/cohort/dec26/schedule', 1440);
    await expect(page.locator('main')).toContainText('Times are Mountain, with Central after each for what learners see.');
    const s3 = page.getByRole('row').filter({ hasText: 'Database Live Build' });
    await expect(s3).toContainText('12:00 PM MT / 1:00 PM CT');
    await expect(s3.getByText('—', { exact: true })).toHaveCount(0);
    expect(await s3.getByText('None', { exact: true }).evaluate((e) => getComputedStyle(e).color)).toBe('rgb(95, 106, 100)');
    await s3.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit session' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Session' });
    await expect(dialog.getByLabel('Start (MT)')).toHaveValue('12:00');
    await expectAccessible(page);
    await close();
  });

  test('Vault removes after the confirm; Announcements opens its dialog', async ({ browser }) => {
    const vault = await openAt(browser, '/admin/program/vault', 1440);
    const row = vault.page.getByRole('row').filter({ hasText: 'Session 2 replay' });
    await row.getByRole('button', { name: 'More actions' }).click();
    await vault.page.getByRole('menuitem', { name: 'Remove from vault' }).click();
    await vault.page
      .getByRole('dialog', { name: 'Remove "Session 2 replay"?' })
      .getByRole('button', { name: 'Remove resource' })
      .click();
    await expect(vault.page.getByRole('row').filter({ hasText: 'Session 2 replay' })).toHaveCount(0);
    await vault.page.getByRole('button', { name: 'Add resource' }).click();
    await expect(vault.page.getByRole('dialog', { name: 'Add resource' })).toBeVisible();
    await expectAccessible(vault.page);
    await vault.close();

    const ann = await openAt(browser, '/admin/cohort/dec26/announcements', 1440);
    await ann.page.getByRole('button', { name: 'New announcement' }).click();
    const dialog = ann.page.getByRole('dialog', { name: 'New announcement' });
    await expect(dialog.getByLabel('Title')).toBeFocused();
    await dialog.getByLabel('When').selectOption('later');
    await expect(dialog.getByLabel('Send at (MT)')).toBeVisible();
    await expectAccessible(ann.page);
    await ann.close();
  });
});

test.describe('Module Builder on R2 (D-160 R2-2) @g9 @r2', () => {
  test('passes axe and keeps the landmarks, at 1440, 1280, 1024 and 390, for an AI Employee and a new one', async ({
    browser,
  }) => {
    for (const path of ['/admin/program/weeks/m1', '/admin/program/weeks/new'])
      for (const w of [1440, 1280, 1024, 390]) {
        const { page, close } = await openAt(browser, path, w);
        await expectShell(page);
        await expect(page.getByRole('heading', { level: 1, name: 'Module Builder' })).toBeVisible();
        await noMst(page);
        await expectAccessible(page);
        await close();
      }
  });

  test('edits in place, asks before leaving with unsaved changes, and keeps the details in Edit details', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/program/weeks/m1', 1440);
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Step 1 title' }).fill('What this AI Employee does for you');
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit details' }).click();
    const details = page.getByRole('dialog', { name: 'Edit details' });
    await expect(details.getByLabel('Output 1')).toBeVisible();
    await expectAccessible(page);
    await details.getByRole('button', { name: 'Done' }).click();
    await page
      .getByRole('navigation', { name: 'AI Employees' })
      .getByRole('button', { name: 'Sales AI Employee' })
      .click();
    await expect(page.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeVisible();
    await page.getByRole('button', { name: 'Keep Editing' }).click();
    await expect(page.getByRole('textbox', { name: 'Step 1 title' })).toHaveValue('What this AI Employee does for you');
    await close();
  });
});

test.describe('Overview, Learners & Teams, Tiers & Upgrades and Staff & Roles on R2 (D-160 R2-3a) @g9 @r2', () => {
  for (const path of ['/admin', '/admin/cohort/dec26/people', '/admin/revenue/plans', '/admin/staff'])
    test(`${path} passes axe and keeps the landmarks, at 1440, 1280, 1024 and 390, with no CT`, async ({ browser }) => {
      for (const width of [1440, 1280, 1024, 390]) {
        const { page, close } = await openAt(browser, path, width);
        await expectShell(page);
        await expectAccessible(page);
        await noMst(page);
        await close();
      }
    });

  test('Overview: the mockup’s figures, from the snapshot; each tile goes where the mockup’s does', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin');
    const main = page.locator('main');
    await expect(main.getByText('December 2026 Cohort · Week 2 of 6 · Updated live from learner activity')).toBeVisible();
    await expect(main.getByRole('link', { name: /Active learners\s*148\s*104 Agent · 44 Team/ })).toHaveAttribute('href', '/admin/cohort/dec26/people');
    await expect(main.getByRole('link', { name: /Upgrade pipeline\s*\$8,000\s*2 open requests/ })).toHaveAttribute('href', '/admin/revenue/plans');
    await expect(main.getByText('Build completion')).toBeVisible();
    await expect(main.getByRole('img', { name: 'Deployed AI Employees rose from 22 on Dec 2 to 190 on Dec 8.' })).toBeVisible();
    await expect(main.getByText('Session 3 · Dec 16')).toBeVisible();
    await expect(main.getByText('Upcoming')).toBeVisible();
    await close();
  });

  test('Learners: a row opens the learner’s details as a drawer, with the nudge; the head is the mockup’s, with no page "…"', async ({ browser }) => {
    for (const width of [1440, 390]) {
      const { page, close } = await openAt(browser, '/admin/cohort/dec26/people', width);
      // D-160 R2-3a: the mockup's head has no page-level "…", so every "More actions" is a row's.
      // The table's card (`section`), whose rows are a table on a desktop and cards on a phone.
      const rows = page.locator('main section[aria-label="Learners"]').getByRole('button', { name: 'More actions' });
      await expect(rows.first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'More actions' })).toHaveCount(await rows.count());
      await expect(page.getByRole('menu', { name: 'Learners & Teams actions' })).toHaveCount(0);
      await close();
    }
    const { page, close } = await openAt(browser, '/admin/cohort/dec26/people');
    await page.getByRole('table', { name: 'Learners' }).getByText('Elena Vargas').click();
    const drawer = page.locator('[data-drawer="open"]');
    await expect(drawer).toHaveAttribute('role', 'dialog');
    await expect(drawer.getByText('Build Progress')).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Move to Agent Tier' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: /Nudge|Resend Invite/ })).toBeVisible();
    await expectAccessible(page);
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await close();
  });

  test('Tiers: the access matrix gates a module; Approve is drawn and does nothing; the "…" keeps the old actions', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/revenue/plans');
    const cell = page.getByRole('button', { name: 'Marketing AI Employee, Agent Tier: included' });
    await cell.click();
    await expect(page.getByRole('button', { name: 'Marketing AI Employee, Agent Tier: gated' })).toBeVisible();
    const approve = page.getByRole('button', { name: 'Approve' }).first();
    await expect(approve).toHaveAttribute('aria-disabled', 'true');
    await approve.dispatchEvent('click');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const requests = page.getByRole('table', { name: 'Upgrade requests' });
    await requests.getByRole('button', { name: 'More actions' }).first().click();
    await expect(page.getByRole('menuitem', { name: 'Mark Contacted' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Decline' })).toBeVisible();
    await close();
  });
});

test.describe('the Audit Log and Roles & Permissions on R2 (D-160 R2-3b) @g9 @r2', () => {
  for (const path of ['/admin/audit', '/admin/roles'])
    test(`${path} passes axe and keeps the landmarks, at 1440, 1280, 1024 and 390, with no CT`, async ({ browser }) => {
      for (const width of [1440, 1280, 1024, 390]) {
        const { page, close } = await openAt(browser, path, width);
        await expectShell(page);
        await expectAccessible(page);
        await noMst(page);
        await close();
      }
    });

  test('Audit Log: the times in MT; selecting rows draws Export selected (D-172: it exports them); a row opens its entry', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit');
    const table = page.getByRole('table', { name: 'Audit log entries' });
    await expect(table.getByRole('button', { name: 'View the entry from Dec 10, 8:58 AM' })).toBeVisible();
    await expect(table.getByText('CSV, last 7 days, 212 rows.')).toBeVisible();
    await table.getByRole('checkbox', { name: 'Select row' }).first().check();
    const exportSelected = page.getByRole('button', { name: 'Export selected' });
    await expect(exportSelected).toBeVisible();
    await expect(exportSelected).not.toHaveAttribute('aria-disabled', 'true');
    await table.getByRole('button', { name: 'View the entry from Dec 9, 9:27 PM' }).click();
    const drawer = page.locator('[data-drawer="open"]');
    await expect(drawer).toContainText('masquerade.blocked_action');
    await expect(drawer).toContainText('Dec 9, 2026, 9:27 PM MT');
    await expectAccessible(page);
    await close();
  });

  test('Roles & Permissions: the Owner column on; the mockup’s two locks; a box opens the mockup’s confirm', async ({ browser }) => {
    // D-160 R2-3b, editable (Connor, Nov 16, 2026, 8:27 AM MST).
    for (const width of [1440, 390]) {
      const { page, close } = await openAt(browser, '/admin/roles', width);
      const matrix = page.getByRole('table', { name: 'Console permissions by role' });
      for (const cap of ['Edit curriculum, vault, sessions, announcements, tiers', 'Edit staff roles and this matrix']) {
        await expect(matrix.getByRole('checkbox', { name: `${cap}, Owner` })).toBeChecked();
        await expect(matrix.getByRole('checkbox', { name: `${cap}, Owner` })).toBeDisabled();
      }
      for (const cap of ['Start and extend masquerade', 'Refund or void an invoice'])
        await expect(matrix.getByRole('checkbox', { name: `${cap}, Support. Fixed by product rules` })).toBeDisabled();
      // Past the ceiling but drawn as the mockup's toggles: named so, refused by the server.
      for (const cap of ['Run a job now, retry a webhook, update incidents', 'Export audit and email logs', 'View integrations, deploys, DB health, flags, roles', 'Edit staff roles and this matrix'])
        await expect(matrix.getByRole('checkbox', { name: `${cap}, Support, fixed by product rules` })).not.toBeChecked();
      await expect(matrix.getByRole('checkbox', { name: 'Edit staff roles and this matrix, Admin, fixed by product rules' })).toBeEnabled();
      await matrix.getByRole('checkbox', { name: 'Start and extend masquerade, Admin', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Remove this permission from Admin?' });
      await expect(dialog).toContainText('Start and extend masquerade. Applies to every Admin on staff right away.');
      await expect(dialog).toContainText('This action is audit-logged.');
      await expect(dialog.getByRole('button', { name: 'Remove permission' })).toBeEnabled();
      await expectAccessible(page);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(matrix.getByRole('checkbox', { name: 'Start and extend masquerade, Admin', exact: true })).toBeChecked();
      await matrix.getByRole('checkbox', { name: 'Edit staff roles and this matrix, Admin, fixed by product rules' }).click();
      const fixed = page.getByRole('dialog', { name: 'Give this permission to Admin?' });
      await expect(fixed.getByRole('alert')).toHaveText('Fixed by product rules. Only the Owner can edit staff roles and this matrix.');
      await expect(fixed.getByRole('button', { name: 'Allow' })).toBeDisabled();
      await expectAccessible(page);
      await page.keyboard.press('Escape');
      await expect(page.getByText('Connor Leiva (you)')).toBeVisible();
      await close();
    }
  });
});
