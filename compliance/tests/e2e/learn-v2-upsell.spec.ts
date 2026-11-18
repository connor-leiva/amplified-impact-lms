import { test, expect, type Browser, type Page } from '@playwright/test';
import { expectAccessible } from '../../lib/a11y';
import {
  S1,
  WEEK1_MODULE,
  fixtureUrl,
  learnerCopy,
  storedDb,
  visit,
  worldContext,
  type WorldOptions,
} from '../parity/world';
import type { AIEmployee } from '../../../packages/core/src/types';

/**
 * D-187, in the fixture build (flag on), on the learner parity suite's world (the deployed course, the
 * fixture's personas in its cohort, and the Team Plan window's copy strings):
 *
 *   SH-8, P-1, R-6, A-7, C-13  the Team Plan window: an Agent tier learner (Jamie, `?as=agent`) who opens
 *                              something gated to the Team Plan gets a real dialog with the builder's
 *                              words and one button; the button sends `requestUpgrade`, and the request
 *                              shows in the Console's Tiers, where staff mark it contacted
 *                              (`setRequestStatus`). `/learn?plan=team` (where `/team-tier` lands) opens
 *                              it. A Utah Life member sees their group's line, no upsell and no button.
 *   D-10                       the Cohort Community link on Home, to the address the builder sets.
 *   E-1, C-3                   a replay set Published shows in a week still locked by its date; one set
 *                              After the week opens does not.
 *   C-15                       the Console's Preview as Learner, clicked at 1440 from rest, lands on the
 *                              preview.
 */

const TEAM_MODULE = 'ops-ai-employee';
const W = {
  title: learnerCopy('plan.team.title'),
  lead: learnerCopy('plan.team.lead'),
  solo: learnerCopy('plan.team.solo'),
  ask: learnerCopy('plan.team.ask'),
  asked: learnerCopy('plan.team.asked'),
};
const UTAH_LINE = learnerCopy('locked.utah_life');

/** A Team-only AI employee outside the course, as the first portal's catalog has them. */
const withTeamModule: WorldOptions['edit'] = (db) => {
  const { course: _c, kind: _k, dueAt: _d, ...like } = db.modules[0]!;
  const m: AIEmployee = {
    ...like,
    id: TEAM_MODULE,
    name: 'Operations AI Employee',
    short: 'Operations',
    tier: 'team',
    status: 'published',
    order: 99,
    session: null,
    headline: 'Upload an executed contract and get every deadline on a calendar.',
    outcome: 'Every deadline tracked.',
    outputs: ['A deadline calendar', 'A task list for the file', 'A weekly status note'],
  };
  db.modules.push(m);
};

async function learner(browser: Browser, path: string, o: WorldOptions = {}): Promise<Page> {
  const ctx = await worldContext(browser, o);
  const page = await ctx.newPage();
  await visit(page, path, o.as ?? 'agent', o.now ?? 'week1');
  return page;
}

test.describe('learner portal v2: the Team Plan window (D-187) @g9', () => {
  test('an Agent tier learner at /learn?plan=team: the window, its one button sends requestUpgrade, and the Console’s Tiers has it @parity:P-1 @parity:R-6 @parity:A-7 @parity:C-13', async ({
    browser,
  }) => {
    const page = await learner(browser, '/learn?plan=team');
    const dialog = page.getByRole('dialog', { name: W.title });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(W.lead);
    await expect(dialog).toContainText(W.solo);
    // One button besides Close.
    await expect(dialog.getByRole('button')).toHaveCount(2);
    await expectAccessible(page);
    await dialog.getByRole('button', { name: W.ask }).click();
    await expect(dialog).toContainText(W.asked);
    await expect(dialog.getByRole('button', { name: W.ask })).toHaveCount(0);
    const db = await storedDb(page);
    const mine = db.requests.filter((q) => q.userId === 'u_jamie');
    expect(mine).toMatchObject([{ source: 'Team Plan window', status: 'new' }]);

    // The Console, in the same world: Tiers lists the request, and staff mark it contacted.
    const admin = await page.context().newPage();
    await admin.goto(fixtureUrl('/admin/tiers', 'admin'));
    await admin.waitForSelector('body[data-app-ready="true"]');
    const row = admin.getByRole('row').filter({ hasText: mine[0]!.name });
    await expect(row).toContainText('Pending');
    await row.getByRole('button', { name: 'More actions' }).click();
    await admin.getByRole('menuitem', { name: 'Mark Contacted' }).click();
    await expect(row).toContainText('Contacted');
    expect((await storedDb(admin)).requests.find((q) => q.id === mine[0]!.id)!.status).toBe('contacted');
    // Closing the window leaves Home, without the window's parameters.
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('plan')).toBeNull();
    await page.context().close();
  });

  test('a Team-only AI employee opens the window over Home, previewing it; the Team Hub’s address too @parity:SH-8', async ({ browser }) => {
    const page = await learner(browser, `/learn/employees/${TEAM_MODULE}`, { edit: withTeamModule });
    const dialog = page.getByRole('dialog', { name: 'Operations AI Employee' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('A deadline calendar');
    await expect(dialog).toContainText(W.title);
    expect(new URL(page.url()).pathname).toBe('/learn');
    await expect(page.locator('h1')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Close' }).click();
    await visit(page, '/learn/team');
    await expect(page.getByRole('dialog', { name: 'Team Hub' })).toBeVisible();
    await page.context().close();
  });

  for (const width of [1440, 390])
    test(`a Utah Life member: “Not included with Utah Life access”, no upsell, no button, at ${width} @parity:SH-8 @parity:P-1`, async ({ browser }) => {
      const page = await learner(browser, '/learn?plan=team', { audience: 'utah', width });
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(UTAH_LINE);
      for (const w of [W.title, W.lead, W.solo, W.ask]) await expect(dialog).not.toContainText(w);
      await expect(dialog.getByRole('button')).toHaveCount(1);
      await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();
      await expectAccessible(page);
      expect((await storedDb(page)).requests.filter((q) => q.userId === 'u_jamie')).toEqual([]);
      await page.context().close();
    });

  test('a Team tier learner (Alex) has the plan: no window @parity:P-1', async ({ browser }) => {
    const page = await learner(browser, '/learn?plan=team', { as: 'owner' });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.context().close();
  });
});

test.describe('learner portal v2: the Cohort Community link (D-187) @g9', () => {
  test('Home links the address the builder set, in a new tab, with no member count; none without one @parity:D-10', async ({ browser }) => {
    const URL_ = 'https://www.skool.com/amplified-dec26';
    const page = await learner(browser, '/learn', {
      edit: (db) => {
        db.cohorts = db.cohorts.map((c) => (c.course ? { ...c, course: { ...c.course, intro: { ...c.course.intro, community: URL_ } } } : c));
      },
    });
    const link = page.getByRole('link', { name: /Cohort Community/ });
    await expect(link).toHaveAttribute('href', URL_);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toContainText('skool.com');
    await expect(page.getByRole('main')).not.toContainText(/members ·|new posts/);
    await page.context().close();

    const none = await learner(browser, '/learn');
    await expect(none.getByRole('heading', { name: 'Your cohort' })).toBeVisible();
    await expect(none.getByRole('link', { name: /Cohort Community/ })).toHaveCount(0);
    await none.context().close();
  });
});

test.describe('learner portal v2: replay visibility in a locked week (D-187) @g9', () => {
  /** Week 1 locked by its date until Dec 12 (its build, Dec 2, is over and its replay ready), on Dec 4. */
  const lockedWeek1 = (visibility: 'published' | 'after_open'): WorldOptions['edit'] => (db) => {
    db.modules = db.modules.map((m) => (m.id === WEEK1_MODULE ? { ...m, status: 'scheduled' as const, opens: Date.parse('2026-12-12T12:00:00-07:00') } : m));
    db.sessions = db.sessions.map((s) => (s.id === S1 ? { ...s, replayVisibility: visibility } : s));
  };

  test('Published: the locked week’s preview plays the replay as soon as it is ready @parity:E-1 @parity:C-3', async ({ browser }) => {
    const page = await learner(browser, '/learn/week/1', { edit: lockedWeek1('published') });
    await expect(page.locator('#lv-locked-t')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play' }).first()).toBeVisible();
    await page.context().close();
  });

  test('After the week opens: nothing in the locked week @parity:E-1 @parity:C-3', async ({ browser }) => {
    const page = await learner(browser, '/learn/week/1', { edit: lockedWeek1('after_open') });
    await expect(page.locator('#lv-locked-t')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0);
    await page.context().close();
  });
});

test.describe('the Console’s Preview as Learner at 1440 (D-187) @g9', () => {
  test('Curriculum’s row eye takes a click from rest and lands on the preview @parity:C-15', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Denver' });
    const page = await ctx.newPage();
    await page.goto(fixtureUrl('/admin/curriculum', 'admin'));
    await page.waitForSelector('body[data-app-ready="true"]');
    // A published row whose Deployed percent sits just left of the actions: the cell that used to cover it.
    const row = page.getByRole('row').filter({ hasText: '%' }).nth(1);
    const eye = row.getByRole('button', { name: 'Preview as Learner' });
    // No hover first: Playwright's own check fails if another element would take the click.
    await page.mouse.move(0, 0);
    await eye.click({ timeout: 5000 });
    await page.waitForURL((u) => !u.pathname.startsWith('/admin'));
    await page.waitForSelector('body[data-app-ready="true"]');
    expect(new URL(page.url()).searchParams.get('as')).toMatch(/^(agent|owner)$/);
    await expect(page.locator('aside[aria-label="Primary"]')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await ctx.close();
  });
});

