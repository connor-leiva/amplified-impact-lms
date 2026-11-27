import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-167: Incidents and Incident on R2 (spec § 7.14), in the fixture build, on the R2 mockup's own
 * `INCIDENTS`. The behaviour: the list and its status filter, a row opening its incident, Acknowledge
 * and Resolve (with its required note) through the stack's R2 dialogs, no chrome the mockup doesn't
 * draw (no Add note: the eye check), the sidebar's
 * "1 incident" following them, Support acknowledging but never resolving (D3), and the timeline
 * stacking on a phone. Every screen and dialog passes axe.
 */

const NOW = '2026-12-10T09:30:00-07:00';

async function openAt(browser: Browser, path: string, opts: { width?: number } = {}): Promise<{ page: Page; close: () => Promise<void> }> {
  const width = opts.width ?? 1280;
  const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width, height: width < 768 ? 844 : 900 } });
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
const toast = (page: Page, text: string) => page.locator('[role="status"]').filter({ hasText: text });
const timeline = (page: Page) => page.locator('main section').filter({ has: page.getByRole('heading', { name: 'Timeline' }) });

test.describe('Incidents on R2 (D-167) @g9 @console', () => {
  test('the list, its status filter, and a row opening its incident', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/incidents');
    await expect(page.getByRole('heading', { level: 1, name: 'Incidents' })).toBeVisible();
    await expect(crumbs(page)).toHaveText('Admin/Operations/Incidents');
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).first()).toContainText('GHL order sync failing with 401');
    await expect(rows(page).first()).toContainText('Sev 2');
    await expect(rows(page).first()).toContainText('Imani Brooks');
    await expectAccessible(page);
    await page.getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Resolved' });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('INC-0005');
    await page.getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Any status' });
    await rows(page).first().click();
    await expect(page).toHaveURL(/\/admin\/incidents\/INC-0007/);
    await expect(crumbs(page)).toHaveText('Admin/Operations/Incidents/INC-0007');
    const aside = page.locator('aside[aria-label="Primary"]');
    await expect(aside.locator('[aria-current="page"]')).toContainText('Incidents');
    await close();
  });

  test('Acknowledge and Resolve through the R2 dialogs; the sidebar’s count follows', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/incidents/INC-0007');
    const aside = page.locator('aside[aria-label="Primary"]');
    await expect(aside.getByRole('button', { name: /Incidents/ })).toContainText('1');
    await expect(page.getByRole('heading', { level: 1, name: 'GHL order sync failing with 401' })).toBeVisible();
    for (const t of ['INC-0007', 'Open', 'Sev 2', 'Imani Brooks', 'Dec 9, 9:14 PM MT', 'Job ghl-orders', '3 webhook deliveries']) await expect(page.locator('main')).toContainText(t);
    // Exactly the mockup's two actions, and no other control in the header or the cards' heads.
    await expect(page.locator('main button')).toHaveText(['Acknowledge', 'Resolve']);
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Acknowledge', exact: true }).click();
    const ack = page.getByRole('dialog', { name: 'Acknowledge INC-0007?' });
    await expect(ack).toContainText('This action is audit-logged.');
    await expectAccessible(page);
    await ack.getByRole('button', { name: 'Acknowledge' }).click();
    await expect(toast(page, 'INC-0007 is acknowledged')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acknowledge', exact: true })).toHaveCount(0);
    await expect(timeline(page)).toContainText('Acknowledged by Casey Lin.');
    await expect(aside.getByRole('button', { name: /Incidents/ })).not.toContainText('1');

    await page.getByRole('button', { name: 'Resolve', exact: true }).click();
    const resolve = page.getByRole('dialog', { name: 'Resolve INC-0007?' });
    await expect(resolve.getByRole('button', { name: 'Resolve' })).toBeDisabled();
    await resolve.getByRole('textbox', { name: 'What fixed it' }).fill('Rotated the GHL token; orders sync again.');
    await expectAccessible(page);
    await resolve.getByRole('button', { name: 'Resolve' }).click();
    await expect(toast(page, 'INC-0007 is resolved')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resolve', exact: true })).toHaveCount(0);
    await expect(timeline(page)).toContainText('Resolved by Casey Lin. Rotated the GHL token; orders sync again.');
    await close();
  });

  test('Support acknowledges and never resolves (D3)', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/incidents/INC-0007?console-role=Support');
    await expect(page.getByRole('button', { name: 'Acknowledge', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resolve', exact: true })).toHaveCount(0);
    await expectAccessible(page);
    await close();
  });

  test('on a phone the timeline stacks, Linked under it, nothing sideways', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/incidents/INC-0007', { width: 390 });
    const tl = await timeline(page).boundingBox();
    const linked = await page.locator('main section').filter({ has: page.getByRole('heading', { name: 'Linked' }) }).boundingBox();
    expect(tl && linked && linked.y >= tl.y + tl.height).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await expectAccessible(page);
    await close();
  });

  test('an unknown incident is the Console 404', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/incidents/INC-0404');
    await expect(page.getByRole('heading', { name: "This page doesn't exist" })).toBeVisible();
    await close();
  });
});
