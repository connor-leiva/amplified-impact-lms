import { test, expect, type Browser } from '@playwright/test';
import { open } from '../../lib/prepare';
import type { Scenario } from '../../lib/scenarios';

// Phase 04 behaviour gate. These run against the fixture build, which is the prototype's own
// data and localStorage shapes, so they also prove the demo environment behaves correctly.

const base = { id: 'shell-e2e', gate: 4, role: 'agent', ref: 'dashboard', path: '/' } as const;
const scenario = (over: Partial<Scenario> = {}): Scenario => ({ ...base, ...over }) as Scenario;

const sidebar = 'aside[aria-label="Primary"]';

test('collapse persists across reload @g4', async ({ browser }: { browser: Browser }) => {
  const { ctx, page } = await open(browser, scenario(), 'app');
  await page.getByRole('button', { name: 'Collapse Sidebar' }).click();
  await expect(page.locator(sidebar)).toHaveCSS('width', '64px');
  await page.reload();
  await expect(page.locator(sidebar)).toHaveCSS('width', '64px');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ai-lms-prefs')!).sidebar)).toBe('rail');
  await ctx.close();
});

test('mobile drawer opens and closes on Escape @g4', async ({ browser }) => {
  const { ctx, page } = await open(browser, scenario({ viewport: 'mobile' }), 'app');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.locator(sidebar)).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.locator(sidebar)).not.toBeInViewport();
  await ctx.close();
});

test('time zone change updates every time on screen @g4', async ({ browser }) => {
  const { ctx, page } = await open(browser, scenario(), 'app');
  await page.getByRole('button', { name: /Jamie Ortiz/ }).click();
  await page.getByRole('button', { name: 'Change' }).click();
  await page.getByRole('radio', { name: /Eastern/ }).click();
  await expect(page.getByText('Session Times Show as 2:00 PM ET (1:00 PM CT)')).toBeVisible();
  await ctx.close();
});

test('theme toggle sets data-theme and persists @g4', async ({ browser }) => {
  const { ctx, page } = await open(browser, scenario(), 'app');
  await page.getByRole('button', { name: /Jamie Ortiz/ }).click();
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await ctx.close();
});

test('a locked employee never navigates, opens the preview, and its CTA goes to Team Tier @g4', async ({ browser }) => {
  const { ctx, page } = await open(browser, scenario(), 'app');
  await page.locator(sidebar).getByRole('button', { name: /Meetings/ }).click();
  await expect(page).toHaveURL(/\/($|\?)/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('tab', { name: 'Finance' }).click();
  await page.getByRole('button', { name: /See Team Tier/ }).click();
  await expect(page).toHaveURL(/\/team-tier/);
  await ctx.close();
});

test('admins cannot reach portal routes and learners cannot reach admin @g4', async ({ browser }) => {
  const a = await open(browser, scenario({ role: 'admin', ref: 'overview', path: '/sessions' }), 'app');
  await expect(a.page).toHaveURL(/\/admin/);
  await a.ctx.close();

  const l = await open(browser, scenario({ path: '/admin/tiers' }), 'app');
  await expect(l.page).toHaveURL(/\/(\?|$)/);
  await l.ctx.close();
});

test('tier guards redirect Team Hub and Team Tier @g4', async ({ browser }) => {
  // Agent tier has no Team Hub.
  const agent = await open(browser, scenario({ path: '/team' }), 'app');
  await expect(agent.page).toHaveURL(/\/(\?|$)/);
  await agent.ctx.close();

  // Team tier has nothing to upgrade to.
  const owner = await open(browser, scenario({ role: 'owner', path: '/team-tier' }), 'app');
  await expect(owner.page).toHaveURL(/\/(\?|$)/);
  await owner.ctx.close();
});

test('every interactive element in the shell has a visible focus ring @g4', async ({ browser }) => {
  const { ctx, page } = await open(browser, scenario(), 'app');
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return 'skip';
      const cs = getComputedStyle(el);
      return `${cs.boxShadow}|${cs.outlineStyle}:${cs.outlineWidth}`;
    });
    if (ring === 'skip') continue;
    expect(ring, `tab stop ${i + 1} has no visible focus indicator`).not.toMatch(/^none\|none:0px$/);
  }
  await ctx.close();
});

test('the demo controls do not exist in the DOM when demo mode is off @g4', async ({ browser }) => {
  const { ctx, page } = await open(browser, scenario(), 'app');
  // The fixture build ships with VITE_DEMO_MODE=false, so the controls must be absent entirely —
  // not merely hidden. In http mode they are impossible (see src/data/boot.test.ts).
  await expect(page.getByRole('group', { name: 'Demo controls' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Demo:/ })).toHaveCount(0);
  await ctx.close();
});
