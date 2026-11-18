import { test, expect, type Browser } from '@playwright/test';
import { open } from '../../lib/prepare';
import type { Scenario } from '../../lib/scenarios';

// D-138: the Admin Console's "Preview as learner" (the eye button on /admin/curriculum). It opens
// `/employees/<id>?preview=agent|owner`, and the tab shows the portal as a read-only learner.
// `open` signs in as the scenario's role: `?as=` in fixture mode, a session cookie in http mode.
//
// D-182: the learner portal at /learn is what every learner sees now, so the preview tab shows it: the
// old address redirects (an AI Employee that is a course week to its week, any other to Home), keeping
// the flag, under the same "Previewing as" line and Exit Preview. Every write in the tab is still refused
// before any request (`data/preview.test.ts`); the Vault's Upgrade, the one write the fixture build can
// reach here without the course, shows it.

const base = { id: 'preview-e2e', gate: 6, role: 'admin', ref: 'overview', path: '/' } as const;
const scenario = (over: Partial<Scenario> = {}): Scenario => ({ ...base, ...over }) as Scenario;
const go = (browser: Browser, path: string, role: Scenario['role'] = 'admin') => open(browser, scenario({ role, path }), 'app');
const pathOf = (url: string): string => new URL(url).pathname;

test('staff without the preview flag are still sent to the Admin Console @g6', async ({ browser }) => {
  const { ctx, page } = await go(browser, '/employees/sales');
  await expect(page).toHaveURL(/\/admin(\?|$)/);
  await expect(page.getByRole('status').filter({ hasText: 'Previewing as' })).toHaveCount(0);
  await ctx.close();
});

test('staff with the flag see the learner portal as an Agent, under the preview line @g6', async ({ browser }) => {
  const { ctx, page } = await go(browser, '/employees/sales?preview=agent');
  await expect.poll(() => pathOf(page.url())).toBe('/learn');
  expect(new URL(page.url()).searchParams.get('preview')).toBe('agent');
  await expect(page.getByRole('status').filter({ hasText: 'Previewing as Agent.' })).toBeVisible();
  await expect(page.locator('[data-learner-v2] aside[aria-label="Primary"]')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await ctx.close();
});

test('a Team Owner preview says so @g6', async ({ browser }) => {
  const { ctx, page } = await go(browser, '/employees/finance?preview=owner');
  await expect.poll(() => pathOf(page.url())).toBe('/learn');
  await expect(page.getByRole('status').filter({ hasText: 'Previewing as Team Owner.' })).toBeVisible();
  await ctx.close();
});

test('every change in a preview is refused with Preview only, and nothing changes @g6', async ({ browser }) => {
  const { ctx, page } = await go(browser, '/vault?preview=agent');
  await expect.poll(() => pathOf(page.url())).toBe('/learn/vault');
  const upgrade = page.getByRole('button', { name: 'Upgrade' });
  const n = await upgrade.count();
  expect(n).toBeGreaterThan(0);
  await upgrade.first().click();
  await expect(page.getByText('Preview only', { exact: true }).first()).toBeVisible();
  await expect(upgrade).toHaveCount(n);
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
  await expect.poll(() => pathOf(page.url())).toBe('/learn');
  await expect(page.getByRole('status').filter({ hasText: 'Previewing as' })).toHaveCount(0);
  await ctx.close();
});
