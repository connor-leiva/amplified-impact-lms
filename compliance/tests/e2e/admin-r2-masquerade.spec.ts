import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE, HTTP_BASE, HTTP_PARITY } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-162 3b: Masquerade on R2 (spec § 6), in the fixture build: `/admin/masquerade` (the picker, the
 * recent sessions, the rules), the reason dialog's lock and its 10 characters, Support's lock card,
 * the entry points, the learner view, and a session simulated by the fixture's data layer: the
 * banner on every page at 320, 390 and 1280 (spec § 14) with no sideways scroll, the paused Console,
 * Extend, the blocked dialog and Exit. Every screen, dialog and state passes axe. The last test runs
 * the whole flow against the real API (http mode, GATE ≥ 7): Start, the banner, a refused write, Exit.
 */

const NOW = '2026-12-10T09:30:00-07:00';

async function openAt(
  browser: Browser,
  path: string,
  opts: { width?: number; persona?: 'admin' | 'agent' } = {},
): Promise<{ page: Page; close: () => Promise<void> }> {
  const width = opts.width ?? 1280;
  const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width, height: width < 768 ? 844 : 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript(() =>
    localStorage.setItem('ai-lms-prefs', JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' })),
  );
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=${opts.persona ?? 'admin'}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const crumbs = (page: Page) => page.locator('header nav[aria-label="Breadcrumb"]');
const banner = (page: Page) => page.getByRole('region', { name: 'Masquerade session' });
const recent = (page: Page) =>
  page.locator('section', { has: page.getByRole('heading', { name: 'Recent sessions' }) }).locator('[role="row"]').filter({ has: page.locator('[role="cell"]') });
const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const reason = 'Ticket 4411: the seat invite never arrived.';

test.describe('Masquerade on R2 (D-162 3b) @g9 @console', () => {
  test('the page: the picker, the recent sessions, the rules, and the way to Curriculum', async ({ browser }) => {
    // D-253: People › Masquerade; the old address lands there. The page keeps its words under People's head.
    const { page, close } = await openAt(browser, '/admin/masquerade');
    await expect(page).toHaveURL(/\/admin\/people\/masquerade(\?|$)/);
    await expect(page.getByRole('heading', { level: 1, name: 'People' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Masquerade' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Sign in as a user to see exactly what they see. Owner and Admin only, time-boxed, and audit-logged.')).toBeVisible();
    await expect(crumbs(page)).toHaveText('Admin/People/Masquerade');
    const pick = page.getByRole('combobox', { name: 'User' });
    await expect(pick.locator('option').first()).toHaveText('Elena Vargas · Northshore Group');
    await expect(page.getByText('You will be asked for a reason. You can also start from any user or workspace record.')).toBeVisible();
    await expect(recent(page)).toHaveCount(3);
    await expect(recent(page).first()).toContainText('Sam Whitlock');
    await expect(recent(page).first()).toContainText('by Avery Stone');
    await expect(recent(page).first()).toContainText('6 min');
    await expect(recent(page).nth(1)).toContainText('Expired');
    for (const rule of ['A written reason is required to start.', 'Start, stop, extend, and every blocked attempt go to the audit log.'])
      await expect(page.getByText(rule)).toBeVisible();
    await expect(page.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'People' })).toHaveAttribute('aria-current', 'page');
    await expectAccessible(page);
    await page.getByRole('main').getByRole('button', { name: 'Curriculum' }).click();
    await expect(page).toHaveURL(/\/admin\/program$/);
    await close();
  });

  test('the reason dialog: locked until Cancel, and 10 characters before Start', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/masquerade');
    await page.getByRole('combobox', { name: 'User' }).selectOption({ label: 'Jordan Hale · Hale & Marlowe Realty' });
    await page.getByRole('button', { name: 'Masquerade…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Masquerade as Jordan Hale' });
    await expect(dialog).toContainText(
      'You will be signed in as Jordan Hale (Hale & Marlowe Realty) for 15 minutes. Every write is blocked, and the session is audit-logged.',
    );
    await expect(dialog.getByRole('button', { name: 'Close' })).toHaveCount(0);
    const start = dialog.getByRole('button', { name: 'Start 15-minute session' });
    await expect(start).toBeDisabled();
    await expect(dialog).toContainText('Required. Saved to the audit log with your name.');
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    await expect(dialog).toBeVisible();
    const field = dialog.getByRole('textbox', { name: 'Reason' });
    await expect(field).toHaveAttribute('placeholder', 'Ticket, or what you need to check');
    await field.fill('123456789');
    await expect(start).toBeDisabled();
    await field.fill('1234567890');
    await expect(start).toBeEnabled();
    await expect(dialog).toContainText('Saved to the audit log with your name.');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await close();
  });

  test('Start → the learner portal with the banner; the Console is paused; Exit comes back', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/masquerade');
    await page.getByRole('button', { name: 'Masquerade…' }).click();
    await page.getByRole('textbox', { name: 'Reason' }).fill(reason);
    await page.getByRole('button', { name: 'Start 15-minute session' }).click();
    await expect(page).toHaveURL(`${APP_BASE}/`);
    await expect(banner(page)).toContainText('Masquerading as Elena Vargas · Northshore Group');
    await expect(banner(page)).toContainText(`Reason: ${reason} All writes are blocked.`);
    await expect(banner(page).getByRole('timer', { name: 'Time remaining' })).toHaveText('15:00 left');
    await expect(page.locator('aside[aria-label="Primary"]')).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${APP_BASE}/admin/workspaces`);
    await expect(page.getByRole('heading', { level: 1, name: 'Console is paused while you masquerade' })).toBeVisible();
    // D-253: the paused Console names the page asked for by its new place.
    await expect(crumbs(page)).toHaveText('Admin/People/Teams');
    await expect(page.getByRole('main')).toContainText('Elena Vargas · Northshore Group');
    await expect(page.getByRole('main')).toContainText('15 of 60 minutes');
    await expect(page.getByRole('main').getByRole('table')).toHaveCount(0);
    await expectAccessible(page);

    await banner(page).getByRole('button', { name: 'Exit masquerade' }).click();
    // Back where it started: People › Masquerade.
    await expect(page).toHaveURL(`${APP_BASE}/admin/people/masquerade`);
    await expect(page.getByRole('tab', { name: 'Masquerade' })).toHaveAttribute('aria-selected', 'true');
    await expect(banner(page)).toHaveCount(0);
    await close();
  });

  test('Support sees the lock card, no history, no sidebar row and no entry points', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/masquerade?console-role=Support');
    await expect(page.getByText("Your role (Support) can't start masquerade. Ask an Owner or Admin, or send them the user record.")).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'User' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Recent sessions' })).toHaveCount(0);
    await expect(page.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'Masquerade' })).toHaveCount(0);
    await expectAccessible(page);
    await page.goto(`${APP_BASE}/admin/users/u_1042?console-role=Support`);
    await expect(page.getByRole('heading', { level: 1, name: 'Elena Vargas' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('button', { name: 'Masquerade' })).toHaveCount(0);
    await close();
  });

  test('the entry points open the reason dialog; disabled, saying why, while the flag is off', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/users/u_1042');
    const dialogFor = (name: string) => page.getByRole('dialog', { name: `Masquerade as ${name}` });
    const cancel = async (name: string) => {
      await expect(dialogFor(name)).toBeVisible();
      await dialogFor(name).getByRole('button', { name: 'Cancel' }).click();
    };
    await page.getByRole('main').getByRole('button', { name: 'Masquerade', exact: true }).click();
    await cancel('Elena Vargas');

    await page.goto(`${APP_BASE}/admin/users`);
    await page.locator('main [role="row"]').filter({ hasText: 'Sam Whitlock' }).getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Masquerade…' }).click();
    await cancel('Sam Whitlock');

    await page.goto(`${APP_BASE}/admin/workspaces`);
    await page.locator('main [role="row"]').filter({ hasText: 'Hale & Marlowe Realty' }).getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Masquerade as owner…' }).click();
    await cancel('Jordan Hale');

    await page.goto(`${APP_BASE}/admin/workspaces/ws_northshore`);
    await page.getByRole('button', { name: 'Masquerade as owner' }).click();
    await cancel('Elena Vargas');
    await page.locator('main [role="row"]').filter({ hasText: 'Marcus Oyelaran' }).getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Masquerade…' }).click();
    await cancel('Marcus Oyelaran');

    await page.goto(`${APP_BASE}/admin/learners`);
    await page.locator('main [role="row"]').filter({ has: page.locator('[role="cell"]') }).first().getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Masquerade…' }).click();
    await expect(page.getByRole('dialog', { name: /^Masquerade as / })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await page.goto(`${APP_BASE}/admin/users/u_1042?masquerade-flag=off`);
    const off = page.getByRole('main').getByRole('button', { name: 'Masquerade', exact: true });
    await expect(off).toBeDisabled();
    await expect(off).toHaveAttribute('title', 'Masquerade is turned off.');
    await close();
  });

  test('the learner view: the mockup’s "No masquerade session is active"', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/masquerade/learner-view');
    // D-253: the learner view keeps its address, a record of People › Masquerade.
    await expect(crumbs(page)).toHaveText('Admin/People/Masquerade/Learner view');
    await expect(page.getByRole('heading', { level: 1, name: 'No masquerade session is active' })).toBeVisible();
    await expect(page.getByText('Start one from a user or workspace record.')).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Go to Masquerade' }).click();
    await expect(page).toHaveURL(/\/admin\/people\/masquerade$/);
    await close();
  });

  for (const width of [320, 390, 1280]) {
    test(`the banner on a learner page, outside the shell and on the paused Console at ${width}px, nothing sideways @lms-mobile`, async ({ browser }) => {
      const phone = width < 768;
      for (const [path, persona] of [
        ['/?masquerade=demo', 'agent'],
        ['/course?masquerade=demo', 'agent'],
        ['/admin/workspaces?masquerade=demo', 'admin'],
      ] as const) {
        const { page, close } = await openAt(browser, path, { width, persona });
        const b = banner(page);
        await expect(b).toContainText(phone ? 'Masquerading as Elena Vargas' : 'Masquerading as Elena Vargas · Northshore Group');
        if (phone) await expect(b).not.toContainText('Northshore Group');
        if (!phone) await expect(b).toContainText('Reason: Customer reports Week 2 steps are out of order. All writes are blocked.');
        await expect(b.getByRole('button', { name: phone ? 'Extend' : 'Extend 15 min', exact: true })).toBeVisible();
        await expect(b.getByRole('button', { name: phone ? 'Exit' : 'Exit masquerade', exact: true })).toBeVisible();
        if (phone) {
          const sizes = await b.locator('button').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
          expect(sizes).toEqual([44, 48]);
          const font = await b.locator('span').first().evaluate((e) => Number.parseFloat(getComputedStyle(e).fontSize));
          expect(font).toBeGreaterThanOrEqual(16);
        }
        // In flow: the page starts under it, never beneath it.
        const top = await page.evaluate(() => document.querySelector('[data-masquerade-banner]')!.getBoundingClientRect().bottom);
        const next = await page.evaluate(() => {
          const el = document.querySelector('[data-masquerade-banner]')!.parentElement!.nextElementSibling ?? document.querySelector('[data-r2-shell]');
          return el!.getBoundingClientRect().top;
        });
        expect(next).toBeGreaterThanOrEqual(top - 0.5);
        expect(await noSidewaysScroll(page)).toBe(true);
        if (path.startsWith('/admin')) await expect(page.getByRole('heading', { level: 1, name: 'Console is paused while you masquerade' })).toBeVisible();
        if (width === 390) await expectAccessible(page);
        await close();
      }
    });
  }

  test('Extend asks for a new reason and adds 15 minutes; at the cap it is "Max 60 min"', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/?masquerade=demo', { persona: 'agent' });
    await banner(page).getByRole('button', { name: 'Extend 15 min' }).click();
    const dialog = page.getByRole('dialog', { name: 'Extend masquerade by 15 minutes' });
    await expect(dialog.getByRole('button', { name: 'Extend 15 minutes' })).toBeDisabled();
    await dialog.getByRole('textbox', { name: 'New reason' }).fill('Still checking the Session 2 replay.');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Extend 15 minutes' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(banner(page).getByRole('timer')).toHaveText('30:00 left');
    await expect(banner(page)).toContainText('Reason: Still checking the Session 2 replay. All writes are blocked.');
    await close();

    const capped = await openAt(browser, '/?masquerade=max', { persona: 'agent' });
    const max = banner(capped.page).getByRole('button', { name: 'Max 60 min' });
    await expect(max).toBeDisabled();
    await expect(max).toHaveAttribute('title', '60-minute maximum reached');
    await capped.close();
  });

  test('a refused write opens "Blocked while masquerading"; Exit ends the session', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/vault?masquerade=demo', { persona: 'agent' });
    await page.getByRole('button', { name: 'Upgrade' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Blocked while masquerading' });
    await expect(dialog).toContainText('POST /api/mutate/requestUpgrade');
    await expect(dialog).toContainText(
      'You are signed in as Elena Vargas. Every write is blocked until you exit: edits, publishes, refunds, exports, retries, and notes.',
    );
    await expect(dialog).toContainText('This attempt was added to the audit log.');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: 'Upgrade' }).first().click();
    await dialog.getByRole('button', { name: 'Exit masquerade' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(banner(page)).toHaveCount(0);
    await close();
  });
});

// The whole flow against the real API (spec § 11.7): the http-mode server `GATE=7+` starts, signed in
// as the seed's Owner. Start → the learner portal with the banner → a refused write → Exit restores
// the staff member's own session, on the page the session started from.
test.describe('Masquerade against the real API (D-162 3b) @g9 @console', () => {
  test.skip(!HTTP_PARITY || !!process.env.APP_URL, 'Needs the local http-mode server: run with GATE=7 or HTTP_PARITY=1.');

  test('start → banner → blocked write → exit restores the staff view', async ({ browser }) => {
    const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    expect((await ctx.request.post(`${HTTP_BASE}/api/test/session`, { data: { userId: 'st1' } })).ok()).toBe(true);
    await page.goto(`${HTTP_BASE}/admin/users/u_jamie`);
    await expect(page.getByRole('heading', { level: 1, name: 'Jamie Ortiz' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('main').getByRole('button', { name: 'Masquerade', exact: true }).click();
    await page.getByRole('textbox', { name: 'Reason' }).fill(reason);
    await page.getByRole('button', { name: 'Start 15-minute session' }).click();
    await expect(banner(page)).toContainText('Masquerading as Jamie Ortiz', { timeout: 15_000 });
    await expect(banner(page).getByRole('timer')).toHaveText(/^1[45]:\d\d left$/);

    await page.goto(`${HTTP_BASE}/vault`);
    await page.getByRole('button', { name: 'Upgrade' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Blocked while masquerading' });
    await expect(dialog).toContainText('POST /api/mutate/requestUpgrade');
    await expect(dialog).toContainText('This attempt was added to the audit log.');

    await dialog.getByRole('button', { name: 'Exit masquerade' }).click();
    await expect(page).toHaveURL(`${HTTP_BASE}/admin/users/u_jamie`);
    await expect(page.getByRole('heading', { level: 1, name: 'Jamie Ortiz' })).toBeVisible();
    await expect(banner(page)).toHaveCount(0);
    const me = await ctx.request.get(`${HTTP_BASE}/api/console/masquerade/current`);
    expect((await me.json()).session).toBeNull();
    await ctx.close();
  });
});
