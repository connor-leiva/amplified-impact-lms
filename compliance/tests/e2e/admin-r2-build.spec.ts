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
    await expect(phone.page.getByLabel('Draft. Hidden from learners').first()).toHaveAttribute(
      'title',
      'Hidden from learners',
    );
    await phone.close();
  });

  test('reorders with Alt and an arrow key, changes tier access, and publishes after the confirm', async ({
    browser,
  }) => {
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

test.describe('Resource Vault, Cohorts & Sessions and Announcements on R2 (D-160 R2-2b) @g9 @r2', () => {
  test('each passes axe and keeps the landmarks, at 1440, 1280, 1024 and 390, with no CT', async ({ browser }) => {
    for (const [path, h1] of [
      ['/admin/vault', 'Resource Vault'],
      ['/admin/cohorts', 'Cohorts & Sessions'],
      ['/admin/announcements', 'Announcements'],
    ] as const)
      for (const w of [1440, 1280, 1024, 390]) {
        const { page, close } = await openAt(browser, path, w);
        await expectShell(page);
        await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible();
        await noCentral(page);
        await expectAccessible(page);
        await close();
      }
  });

  test('Cohorts: one zone, MST, in the header; Attendance’s and Replay’s "—" are both muted', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/cohorts', 1440);
    await expect(page.locator('main')).toContainText(
      'The cohort calendar and each live build on Zoom. All times are MST (America/Phoenix).',
    );
    const s3 = page.getByRole('row').filter({ hasText: 'Session 3 · Database Live Build' });
    const dashes = s3.getByText('—', { exact: true });
    await expect(dashes).toHaveCount(2);
    const colors = await dashes.evaluateAll((els) => els.map((e) => getComputedStyle(e).color));
    expect(colors).toEqual(['rgb(95, 106, 100)', 'rgb(95, 106, 100)']);
    await s3.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit session' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Session 3' });
    await expect(dialog.getByLabel('Start time (MST)')).toHaveValue('12:00');
    await expectAccessible(page);
    await close();
  });

  test('Vault removes after the confirm; Announcements opens its dialog', async ({ browser }) => {
    const vault = await openAt(browser, '/admin/vault', 1440);
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

    const ann = await openAt(browser, '/admin/announcements', 1440);
    await ann.page.getByRole('button', { name: 'New announcement' }).click();
    const dialog = ann.page.getByRole('dialog', { name: 'New announcement' });
    await expect(dialog.getByLabel('Title')).toBeFocused();
    await dialog.getByLabel('When').selectOption('later');
    await expect(dialog.getByLabel('Send at (MST)')).toBeVisible();
    await expectAccessible(ann.page);
    await ann.close();
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
  for (const path of ['/admin', '/admin/learners', '/admin/tiers', '/admin/staff'])
    test(`${path} passes axe and keeps the landmarks, at 1440, 1280, 1024 and 390, with no CT`, async ({ browser }) => {
      for (const width of [1440, 1280, 1024, 390]) {
        const { page, close } = await openAt(browser, path, width);
        await expectShell(page);
        await expectAccessible(page);
        await noCentral(page);
        await close();
      }
    });

  test('Overview: the mockup’s figures, from the snapshot; each tile goes where the mockup’s does', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin');
    const main = page.locator('main');
    await expect(main.getByText('December 2026 Cohort · Week 2 of 6 · Updated live from learner activity')).toBeVisible();
    await expect(main.getByRole('link', { name: /Active learners\s*148\s*104 Agent · 44 Team/ })).toHaveAttribute('href', '/admin/learners');
    await expect(main.getByRole('link', { name: /Upgrade pipeline\s*\$8,000\s*2 open requests/ })).toHaveAttribute('href', '/admin/tiers');
    await expect(main.getByText('Build completion')).toBeVisible();
    await expect(main.getByRole('img', { name: 'Deployed AI Employees rose from 22 on Dec 2 to 190 on Dec 8.' })).toBeVisible();
    await expect(main.getByText('Session 3 · Dec 16')).toBeVisible();
    await expect(main.getByText('Upcoming')).toBeVisible();
    await close();
  });

  test('Learners: a row opens the learner’s details as a drawer; the page’s "…" keeps Export roster and Needs Attention', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/learners');
    await page.getByRole('table', { name: 'Learners' }).getByText('Elena Vargas').click();
    const drawer = page.locator('[data-drawer="open"]');
    await expect(drawer).toHaveAttribute('role', 'dialog');
    await expect(drawer.getByText('Build Progress')).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Move to Agent Tier' })).toBeVisible();
    await expectAccessible(page);
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await page.getByRole('button', { name: 'More actions' }).first().click();
    await expect(page.getByRole('menuitem', { name: 'Export roster' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Learners who need attention' }).click();
    await expect(page.getByRole('dialog', { name: 'Needs Attention' })).toBeVisible();
    await close();
  });

  test('Tiers: the access matrix gates a module; Approve is drawn and does nothing; the "…" keeps the old actions', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/tiers');
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
