import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';

/**
 * Phase 06's real contract: the two surfaces are one system. An admin change must reach the
 * learner's portal, and learner progress must reach admin.
 *
 * Both pages live in ONE browser context so they share localStorage — that is the channel the
 * fixture repository broadcasts over (a `storage` event), the same way the http repository will
 * broadcast over SSE in phase 07. Nothing here reloads to observe a change.
 */
const NOW = '2026-12-07T10:42:00-06:00';

async function pair(browser: Browser): Promise<{ admin: Page; learner: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', viewport: { width: 1440, height: 900 } });
  const admin = await ctx.newPage();
  const learner = await ctx.newPage();
  for (const p of [admin, learner]) {
    await p.clock.setFixedTime(new Date(NOW));
    await p.addInitScript(() => {
      if (!localStorage.getItem('ai-lms-prefs'))
        localStorage.setItem('ai-lms-prefs', JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' }));
    });
  }
  return { admin, learner, close: () => ctx.close() };
}

const open = async (page: Page, path: string) => {
  await page.goto(`${APP_BASE}${path}`);
  await page.locator('[data-app-ready="true"]').waitFor();
};

test('publishing a new AI Employee appears in the portal without a reload @g6', async ({ browser }) => {
  const { admin, learner, close } = await pair(browser);
  await open(learner, '/?as=agent');
  await open(admin, '/admin/curriculum/new?as=admin');

  // D-160 R2-2: the R2 Module Builder. Name and Summary (the outcome line) edit in place; the outputs
  // are in Edit details (the icon tile); Status's menu publishes.
  await admin.getByLabel('Name', { exact: true }).fill('Listing Coordinator AI Employee');
  await admin.getByLabel('Summary', { exact: true }).fill('Paste a listing → a coordinator checklist.');
  await admin.getByRole('button', { name: 'Edit details' }).click();
  const details = admin.getByRole('dialog', { name: 'Edit details' });
  for (const [i, v] of ['Checklist', 'Vendor emails', 'Timeline'].entries())
    await details.getByLabel(`Output ${i + 1}`).fill(v);
  await details.getByRole('button', { name: 'Done' }).click();
  for (let i = 0; i < 6; i++) await admin.getByRole('textbox', { name: `Step ${i + 1} title` }).fill(`Step ${i + 1}`);
  await admin.getByRole('button', { name: 'Status: Draft' }).click();
  await admin.getByRole('menuitem', { name: 'Published' }).click();

  await expect(admin.getByText('Listing Coordinator AI Employee is live in the learner portal')).toBeVisible();
  await expect(learner.getByText('Listing Coordinator AI Employee').first()).toBeVisible();
  await close();
});

test('the builder blocks an incomplete draft with the exact messages @g6', async ({ browser }) => {
  const { admin, close } = await pair(browser);
  await open(admin, '/admin/curriculum/new?as=admin');
  await admin.getByRole('button', { name: 'Status: Draft' }).click();
  await admin.getByRole('menuitem', { name: 'Published' }).click();
  for (const msg of ['Add the outcome line. Learners see it under the title.', 'Add all three outputs.'])
    await expect(admin.getByText(msg)).toBeVisible();
  await close();
});

test('gating an AI Employee to Team only locks it for agents @g6', async ({ browser }) => {
  const { admin, learner, close } = await pair(browser);
  await open(learner, '/?as=agent');
  await open(admin, '/admin/curriculum?as=admin');

  // D-160 R2-2: the tier pill is a menu. The Database row is the third Agent + Team one.
  await admin.getByRole('button', { name: 'Tier access: Agent + Team' }).nth(2).click();
  await admin.getByRole('menuitem', { name: 'Team only' }).click();
  await expect(
    learner.locator('aside[aria-label="Primary"]').getByRole('button', { name: /Database/ }).getByTitle('Team tier'),
  ).toBeVisible();
  await close();
});

test('learner progress shows up in admin @g6', async ({ browser }) => {
  const { admin, learner, close } = await pair(browser);
  await open(admin, '/admin?as=admin');
  await open(learner, '/employees/sales?as=agent');

  // One step at a time, and each click must land before the next count. Counting straight after a
  // click can still see the step just clicked, and then `.first().click()` waits for a button that
  // the re-render has already removed: the test hung until its timeout about one run in three.
  const verify = learner.getByRole('button', { name: 'Mark Verified' });
  for (let left = await verify.count(); left > 0; left--) {
    await verify.first().click();
    await expect(verify).toHaveCount(left - 1);
  }

  await expect(admin.getByText(/Jamie Ortiz\s*built Sales AI Employee/)).toBeVisible();
  await close();
});

test('go live, end, publish replay flows through to the portal @g6', async ({ browser }) => {
  const { admin, learner, close } = await pair(browser);
  await open(learner, '/?as=agent');
  await open(admin, '/admin/cohorts?as=admin');

  // D-160 R2-2b: each step is in the session's "…" menu. D-255: on Cohort › Schedule, where a row is its title.
  const step = async (label: string) => {
    await admin.getByRole('row').filter({ hasText: 'The Living Database' }).getByRole('button', { name: 'More actions' }).click();
    await admin.getByRole('menuitem', { name: label }).click();
  };
  await step('Go Live');
  await expect(learner.getByText('Live Now').first()).toBeVisible();
  await step('End Session');
  await step('Publish Replay');
  await expect(admin.getByText('Session 3 replay published to learners')).toBeVisible();
  await close();
});

test('editing a session time moves the learner countdown @g6', async ({ browser }) => {
  const { admin, learner, close } = await pair(browser);
  await open(learner, '/?as=agent');
  await open(admin, '/admin/cohorts?as=admin');

  // D-160 R2-2b: Edit session is in the session's "…" menu. D-255: on Cohort › Schedule, its time Mountain (2:00 PM MT
  // is 3:00 PM CT).
  await admin.getByRole('row').filter({ hasText: 'The Living Database' }).getByRole('button', { name: 'More actions' }).click();
  await admin.getByRole('menuitem', { name: 'Edit session' }).click();
  await admin.getByLabel('Start (MT)').fill('14:00');
  await admin.getByRole('button', { name: 'Save session' }).click();
  await expect(learner.getByText(/Wed, Dec 9 · 3:00 PM CT/).first()).toBeVisible();
  await close();
});

test('a warning announcement reaches the learner as an alert banner @g6', async ({ browser }) => {
  const { admin, learner, close } = await pair(browser);
  await open(learner, '/?as=agent');
  await open(admin, '/admin/announcements?as=admin');

  // D-160 R2-2b: the composer is the New announcement dialog.
  await admin.getByRole('button', { name: 'New announcement' }).click();
  const dialog = admin.getByRole('dialog', { name: 'New announcement' });
  await dialog.getByLabel('Title').fill('Office hours moved to 2:00 PM');
  await dialog.getByLabel('Message').fill('Same link as always.');
  await dialog.getByLabel('Severity').selectOption('warning');
  await dialog.getByRole('button', { name: 'Send now' }).click();

  await expect(learner.getByRole('alert').getByText('Office hours moved to 2:00 PM')).toBeVisible();
  await close();
});

test('converting an upgrade request unlocks the team employees for that learner @g6', async ({ browser }) => {
  const { admin, close } = await pair(browser);
  await open(admin, '/admin/tiers?as=admin');
  // D-160 R2-3a: a request's actions are in its "…"; the first is the oldest open request's.
  await admin.getByRole('table', { name: 'Upgrade requests' }).getByRole('button', { name: 'More actions' }).first().click();
  await admin.getByRole('menuitem', { name: 'Convert to Team' }).click();
  await expect(admin.getByText(/is on Team Tier\. All six AI Employees are unlocked in their portal\./)).toBeVisible();
  await close();
});

test('the Owner permission column is fixed @g6', async ({ browser }) => {
  const { admin, close } = await pair(browser);
  await open(admin, '/admin/staff?as=admin');
  // D-160 R2-3a: the Owner's box is fixed: checked, and disabled.
  const ownerCell = admin.getByRole('row', { name: /Publish modules/ }).getByRole('checkbox').first();
  await expect(ownerCell).toBeChecked();
  await expect(ownerCell).toBeDisabled();
  await close();
});
