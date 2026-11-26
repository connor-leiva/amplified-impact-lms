import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-169: System Health (spec § 7.1) and the Build hub (spec § 7.2) on R2, in the fixture build. The
 * Console fixture answers Health with the R2 mockup's own figures, and its fixture-only sample draws the
 * mockup's frame ("Live sessions", "p95 latency", "DB connections", "Services"); `?console-sample=off`
 * shows production's composition (spec § 7.1's tiles, Seat pressure, Recent deploys) from the same
 * data. Health's pixels are `pnpm parity:admin-r2`'s; these hold the behaviour: the links, the empty
 * state, the shared states, deploys hidden from Support, Denied. Every screen and state passes axe (zero serious or
 * critical). D-253 (R-5 Phase 1): System Health is Operations' first page, its links at the four pages' addresses;
 * the Build hub is Program now (spec § 3), so `/admin/build` lands there.
 */

const NOW = '2026-12-10T09:30:00-07:00';

async function openAt(browser: Browser, path: string, width = 1280): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript(() =>
    localStorage.setItem('ai-lms-prefs', JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' })),
  );
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const crumbs = (page: Page) => page.locator('header nav[aria-label="Breadcrumb"]');
const main = (page: Page) => page.locator('main');
const card = (page: Page, title: string) => page.locator('main section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });

test.describe('System Health on R2 (D-169) @g9 @console', () => {
  test('the mockup’s frame: the head, eight tiles, Needs attention, Services and the latest deploy', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/health');
    await expect(page.getByRole('heading', { level: 1, name: 'System Health' })).toBeVisible();
    await expect(crumbs(page)).toHaveText('Admin/Operations/System Health');
    await expect(page.locator('aside[aria-label="Primary"] [aria-current="page"]')).toContainText('System Health');
    await expect(main(page).getByText('1 open incident', { exact: true })).toBeVisible();
    for (const [label, sub, to] of [
      ['Live sessions', 'on /api/events', '/admin/revenue/usage'],
      ['Sign-in success', 'Healthy · 24h', '/admin/revenue/usage'],
      ['Failed payments', 'Needs review', '/admin/revenue/payments/failed'],
      ['Failed webhooks', '3 GHL, 1 Stripe', '/admin/api/hooks'],
      ['Job failures, 24h', 'ghl-orders', '/admin/jobs'],
      ['Open incidents', 'Sev 2 · INC-0007', '/admin/incidents'],
      ['p95 latency', 'Healthy', '/admin/api'],
      ['DB connections', 'Healthy', '/admin/db'],
    ]) {
      const tile = main(page).getByRole('link', { name: new RegExp(`^${label}`) });
      await expect(tile, label).toContainText(sub!);
      await expect(tile, label).toHaveAttribute('href', to!);
    }
    const attention = card(page, 'Needs attention');
    for (const [title, href] of [
      ['GHL order sync failing with 401', '/admin/incidents/INC-0007'],
      ['Tidewater Property Co. is past due', '/admin/revenue/payments/failed'],
      ['Stripe subscription.updated used all 5 attempts', '/admin/api/hooks'],
      ['Hale & Marlowe Realty is at 15 of 16 seats', '/admin/people/teams/ws_halemarlowe'],
    ])
      await expect(attention.getByRole('link', { name: title! })).toHaveAttribute('href', href!);
    await expect(attention).toContainText('Insiders · $97.00 · 2 retries left');
    await expect(card(page, 'Services')).toContainText('GoHighLevel');
    await expect(card(page, 'Services')).toContainText('Degraded');
    const deploy = card(page, 'Latest deploy');
    await expect(deploy).toContainText('a3f91c2');
    await expect(deploy.getByRole('link', { name: 'All deploys' })).toHaveAttribute('href', '/admin/deploys');
    // A tile is a link to its screen.
    await expectAccessible(page);
    await main(page).getByRole('link', { name: /^Failed payments/ }).click();
    await expect(page).toHaveURL(/\/admin\/revenue\/payments\/failed(\?|$)/);
    await close();
  });

  test('the mockup’s empty state: "All systems normal" and nothing needs attention', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/health?console-state=empty');
    await expect(main(page).getByText('All systems normal', { exact: true })).toBeVisible();
    await expect(card(page, 'Needs attention')).toContainText('Nothing needs attention');
    await expect(card(page, 'Needs attention')).toContainText('Failed payments, webhooks, and jobs show up here when they happen.');
    await expect(main(page).getByRole('link', { name: /^Job failures, 24h/ })).toContainText('12 of 12 succeeded');
    await expect(card(page, 'Services')).not.toContainText('Degraded');
    await expectAccessible(page);
    await close();
  });

  test('production’s composition: spec § 7.1’s tiles, Seat pressure (never red) and Recent deploys', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/health?console-sample=off');
    for (const [label, value] of [
      ['Connected browsers', '37'],
      ['MRR', '$18,516'],
      ['Accelerator seats', '11 / 15'],
    ])
      await expect(main(page).getByRole('link', { name: new RegExp(`^${label}`) }), label).toContainText(value!);
    for (const gone of ['Live sessions', 'p95 latency', 'DB connections', 'Services']) await expect(main(page).getByText(gone, { exact: true })).toHaveCount(0);
    const seats = card(page, 'Seat pressure');
    await expect(seats.getByRole('link')).toHaveCount(5);
    await expect(seats.getByRole('link', { name: 'Hale & Marlowe Realty' })).toHaveAttribute('href', '/admin/people/teams/ws_halemarlowe');
    await expect(seats).toContainText('15 / 16');
    await expect(card(page, 'Recent deploys')).toContainText('c41d8e0');
    await expectAccessible(page);
    await close();
  });

  test('Support reads Health without the deploys (D3); an Instructor is denied', async ({ browser }) => {
    const support = await openAt(browser, '/admin/health?console-role=Support');
    await expect(main(support.page).getByRole('heading', { name: 'Needs attention' })).toBeVisible();
    await expect(main(support.page).getByRole('heading', { name: 'Latest deploy' })).toHaveCount(0);
    await support.close();
    const instructor = await openAt(browser, '/admin/health?console-role=Instructor');
    await expect(instructor.page.getByRole('heading', { level: 1, name: "Your role can't open System Health" })).toBeVisible();
    await expectAccessible(instructor.page);
    await instructor.close();
  });

  test('the shared states: an error with Retry, and "Too many requests."', async ({ browser }) => {
    const err = await openAt(browser, '/admin/health?console-state=error');
    await expect(main(err.page).getByRole('alert')).toContainText('This didn’t load.');
    await expect(main(err.page).getByRole('button', { name: 'Retry' })).toBeVisible();
    await expectAccessible(err.page);
    await err.close();
    const busy = await openAt(browser, '/admin/health?console-state=rate_limited');
    await expect(main(busy.page).getByRole('alert')).toContainText('Too many requests.');
    await busy.close();
  });
});

test.describe('the Build hub is Program now (D-253, spec § 3) @g9 @console', () => {
  test('its address lands on Program, whose tabs are the builder screens it listed', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/build');
    await expect(page).toHaveURL(/\/admin\/program(\?|$)/);
    await expect(page.getByRole('heading', { level: 1, name: 'Amplified AI Accelerator' })).toBeVisible();
    await expect(crumbs(page)).toHaveText('Admin/Program/Curriculum');
    await expect(page.getByRole('tablist', { name: 'Program' }).getByRole('tab')).toHaveText([/^Curriculum/, 'Course Settings', 'Resource Vault']);
    // Its "Module Builder" link was Curriculum's add button's address, which is the week page's now.
    await expect(page.getByRole('link', { name: 'New AI Employee' })).toHaveAttribute('href', '/admin/program/weeks/new');
    await expectAccessible(page);
    await close();
  });

  test('no crumb or page of the palette names it, for any role', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/program');
    await expect(crumbs(page).getByRole('link', { name: 'Build' })).toHaveCount(0);
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await palette.getByRole('combobox', { name: 'Command palette search' }).fill('Build');
    await expect(palette.getByRole('group', { name: 'Pages' })).toHaveCount(0);
    await close();
  });
});
