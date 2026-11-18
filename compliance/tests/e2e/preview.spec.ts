import { test, expect, type Browser } from '@playwright/test';
import { open } from '../../lib/prepare';
import type { Scenario } from '../../lib/scenarios';

// D-138: the Admin Console's "Preview as learner" (the eye button on /admin/curriculum). It opens
// `/employees/<id>?preview=agent|owner`, and the tab shows that AI Employee as a read-only learner.
// `open` signs in as the scenario's role: `?as=` in fixture mode, a session cookie in http mode.

const base = { id: 'preview-e2e', gate: 6, role: 'admin', ref: 'overview', path: '/' } as const;
const scenario = (over: Partial<Scenario> = {}): Scenario => ({ ...base, ...over }) as Scenario;
const go = (browser: Browser, path: string, role: Scenario['role'] = 'admin') => open(browser, scenario({ role, path }), 'app');

test('staff without the preview flag are still sent to the Admin Console @g6', async ({ browser }) => {
  const { ctx, page } = await go(browser, '/employees/sales');
  await expect(page).toHaveURL(/\/admin(\?|$)/);
  await expect(page.getByRole('status').filter({ hasText: 'Previewing as' })).toHaveCount(0);
  await ctx.close();
});

test('staff with the flag see the AI Employee as an Agent, under the preview banner @g6', async ({ browser }) => {
  const { ctx, page } = await go(browser, '/employees/sales?preview=agent');
  await expect(page).toHaveURL(/\/employees\/sales/);
  await expect(page.getByRole('status').filter({ hasText: 'Previewing as Agent.' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Sales AI Employee' })).toBeVisible();
  await expect(page.locator('aside[aria-label="Primary"]')).toContainText('Preview Agent');
  await ctx.close();
});

test('an Agent preview locks a Team-only AI Employee and a Team Owner preview opens it @g6', async ({ browser }) => {
  const agent = await go(browser, '/employees/finance?preview=agent');
  await expect(agent.page.getByRole('dialog', { name: 'Finance AI Employee' })).toBeVisible();
  await expect(agent.page).not.toHaveURL(/\/employees\/finance/);
  await agent.ctx.close();

  const owner = await go(browser, '/employees/finance?preview=owner');
  await expect(owner.page).toHaveURL(/\/employees\/finance/);
  await expect(owner.page.getByRole('status').filter({ hasText: 'Previewing as Team Owner.' })).toBeVisible();
  await expect(owner.page.getByRole('heading', { level: 1, name: 'Finance AI Employee' })).toBeVisible();
  await expect(owner.page.getByRole('dialog')).toHaveCount(0);
  await owner.ctx.close();
});

test('every change in a preview is refused with Preview only, and nothing changes @g6', async ({ browser }) => {
  const { ctx, page } = await go(browser, '/employees/sales?preview=agent');
  const verify = page.getByRole('button', { name: 'Mark Verified' });
  const n = await verify.count();
  expect(n).toBeGreaterThan(0);
  await verify.first().click();
  await expect(page.getByText('Preview only', { exact: true })).toBeVisible();
  await expect(verify).toHaveCount(n);
  await ctx.close();
});

test('Exit Preview goes back to the Curriculum page @g6', async ({ browser }) => {
  const { ctx, page } = await go(browser, '/employees/sales?preview=owner');
  await page.getByRole('link', { name: 'Exit Preview' }).click();
  await expect(page).toHaveURL(/\/admin\/curriculum$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Curriculum' })).toBeVisible();
  await ctx.close();
});

test('a learner who adds the flag gets their own portal, unchanged @g6', async ({ browser }) => {
  const { ctx, page } = await go(browser, '/employees/finance?preview=owner', 'agent');
  await expect(page.getByRole('dialog', { name: 'Finance AI Employee' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Previewing as' })).toHaveCount(0);
  await ctx.close();
});
