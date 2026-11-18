import { test, expect, type Browser, type Page } from '@playwright/test';
import { ctaPath } from './emails';
import { inApi } from './in-api';
import {
  NOW,
  S1,
  S2,
  WEEK1_MODULE,
  fixtureUrl,
  storedDb,
  visit,
  worldContext,
  worldDb,
  type NowKey,
  type WorldOptions,
} from './world';

/**
 * The learner parity suite: Console actions that change what a learner sees (Connor's parity brief § 3,
 * "console-effect"). Each test opens the Console and a learner screen side by side in ONE browser context,
 * runs the action in the Console as staff would, and asserts that the ALREADY OPEN learner screen changes
 * without a reload.
 *
 * HOW THE TWO TABS SHARE STATE. The fixture build keeps the database in localStorage and tells every other
 * tab through the `storage` event, which the fixture repository turns into the same "something changed"
 * signal the http repository takes from SSE (`/api/events`). That is the fixture's honest stand-in for the
 * API: the Console runs the real core mutation, the learner tab refetches as it would on SSE, and
 * `GET /api/course` is answered from the stored database by the API's own core functions (`world.ts`).
 * Nothing in this file reloads the learner tab.
 *
 * Expected to fail on this branch until claude/learner-pr9b-parity merges: goLive, endSession, the replay,
 * updateSession, a week's publishing and the announcement, which need its live state, player, banner and
 * course refetch on change. setLearnerTier needs Team Hub in the new shell (claude/learner-pr9c-content's
 * sidebar entry, or the reworked #172's account menu).
 */

interface Pair {
  admin: Page;
  learner: Page;
  close: () => Promise<void>;
}

async function pair(
  browser: Browser,
  learnerPath: string,
  o: { now?: NowKey; as?: 'agent' | 'owner'; edit?: WorldOptions['edit'] } = {},
): Promise<Pair> {
  const now = o.now ?? 'week1';
  const ctx = await worldContext(browser, { now, ...(o.edit ? { edit: o.edit } : {}) });
  const learner = await ctx.newPage();
  await visit(learner, learnerPath, o.as ?? 'agent', now);
  const admin = await ctx.newPage();
  return { admin, learner, close: () => ctx.close() };
}

async function console_(p: Pair, path: string, now: NowKey = 'week1'): Promise<void> {
  await visit(p.admin, path, 'admin', now);
}

/** A session's "…" menu on Cohorts & Sessions, then one of its items. */
async function sessionAction(admin: Page, session: string, item: string): Promise<void> {
  await admin
    .getByRole('row')
    .filter({ hasText: `${session} ·` })
    .getByRole('button', { name: 'More actions' })
    .click();
  await admin.getByRole('menuitem', { name: item }).click();
}

const liveNow = (page: Page) => page.getByText(/^Live now$/i).first();
const joinButton = (page: Page) => page.getByRole('button', { name: /^Join/ }).first();
const noReload = (page: Page) => {
  let loads = 0;
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) loads++;
  });
  return () => loads;
};

test.describe('learner parity: Console effects on an open learner screen', () => {
  test('Go Live shows Live now and Join early; End Session takes them away @parity:C-1 @parity:C-2', async ({
    browser,
  }) => {
    const p = await pair(browser, '/learn');
    const loads = noReload(p.learner);
    await expect(liveNow(p.learner)).toHaveCount(0);
    await console_(p, '/admin/cohorts');
    await sessionAction(p.admin, 'Session 2', 'Go Live');
    await expect.poll(async () => (await storedDb(p.learner)).sessions.find((x) => x.id === S2)?.live).toBe(true);
    await expect(liveNow(p.learner)).toBeVisible();
    await expect(joinButton(p.learner)).toBeVisible();
    await sessionAction(p.admin, 'Session 2', 'End Session');
    await expect.poll(async () => (await storedDb(p.learner)).sessions.find((x) => x.id === S2)?.live).toBe(false);
    await expect(liveNow(p.learner)).toHaveCount(0);
    await expect(p.learner.getByRole('button', { name: /^Join/ })).toHaveCount(0);
    expect(loads()).toBe(0);
    await p.close();
  });

  test('attaching a replay (ready for learners) puts the player on the open week page @parity:C-3', async ({
    browser,
  }) => {
    const p = await pair(browser, '/learn/week/1', {
      edit: (db) => {
        db.sessions = db.sessions.map((s) =>
          s.id === S1 ? { ...s, replay: null, replayUrl: undefined, replayVisibility: undefined } : s,
        );
        db.modules = db.modules.map((m) =>
          m.id === WEEK1_MODULE ? ({ ...m, playbackUrl: undefined } as typeof m) : m,
        );
      },
    });
    const loads = noReload(p.learner);
    await expect(p.learner.locator('video')).toHaveCount(0);
    await console_(p, '/admin/cohorts');
    await sessionAction(p.admin, 'Session 1', 'Attach replay');
    await p.admin.getByLabel('Replay link for Session 1').fill('https://stream.example.test/dec26-s1/playlist.m3u8');
    await p.admin.getByRole('dialog', { name: 'Attach replay' }).getByRole('button', { name: 'Attach replay' }).click();
    await expect(p.admin.getByRole('dialog', { name: 'Attach replay' })).toHaveCount(0);
    // Attaching marks the replay ready for learners (D-172), which is what Publish Replay does for a recording.
    await expect.poll(async () => (await storedDb(p.admin)).sessions.find((x) => x.id === S1)?.replay).toBe('ready');
    await expect(p.learner.locator('video').first()).toBeAttached();
    await expect(p.learner.getByRole('button', { name: /^Play/ }).first()).toBeVisible();
    expect(loads()).toBe(0);
    await p.close();
  });

  test('editing a session’s time moves it on the open Schedule @parity:C-4', async ({ browser }) => {
    const p = await pair(browser, '/learn/schedule');
    const loads = noReload(p.learner);
    const next = p.learner.getByRole('region', { name: 'Lead Source Review Live Build' });
    await expect(next).toContainText('12:00 PM MT');
    await console_(p, '/admin/cohorts');
    await sessionAction(p.admin, 'Session 2', 'Edit session');
    await p.admin.getByLabel('Start time (MST)').fill('14:00');
    await p.admin.getByRole('button', { name: 'Save session' }).click();
    await expect
      .poll(async () => (await storedDb(p.learner)).sessions.find((x) => x.id === S2)?.start)
      .toBe(Date.parse('2026-12-09T14:00:00-07:00'));
    await expect(next).toContainText('2:00 PM MT (3:00 PM CT)');
    expect(loads()).toBe(0);
    await p.close();
  });

  test('publishing a week opens it in the open learner’s nav @parity:C-5', async ({ browser }) => {
    const p = await pair(browser, '/learn');
    const loads = noReload(p.learner);
    const nav = p.learner.locator('aside[aria-label="Primary"]');
    await expect(nav.getByRole('link', { name: 'Leads That Pay Opens Dec 9' })).toBeVisible();
    await console_(p, '/admin/curriculum');
    await p.admin
      .getByRole('row')
      .filter({ hasText: 'Week 2 · Leads That Pay' })
      .getByRole('button', { name: 'More actions' })
      .click();
    await p.admin.getByRole('menuitem', { name: 'Publish' }).click();
    await p.admin.getByRole('dialog').getByRole('button', { name: 'Publish', exact: true }).click();
    await expect
      .poll(async () => (await storedDb(p.learner)).modules.find((m) => m.id === 'accelerator-week-2')?.status)
      .toBe('published');
    await expect(nav.getByRole('link', { name: /^Leads That Pay/ })).not.toHaveAccessibleName(
      'Leads That Pay Opens Dec 9',
    );
    expect(loads()).toBe(0);
    await p.close();
  });

  test('an in-app announcement reaches the open Home @parity:C-6', async ({ browser }) => {
    const p = await pair(browser, '/learn');
    const loads = noReload(p.learner);
    await console_(p, '/admin/announcements');
    await p.admin.getByRole('button', { name: 'New announcement' }).click();
    const dialog = p.admin.getByRole('dialog', { name: 'New announcement' });
    await dialog.getByLabel('Title').fill('Office hours moved to 2:00 PM');
    await dialog.getByLabel('Message').fill('Same link as always.');
    await dialog.getByLabel('Severity').selectOption('warning');
    await dialog.getByRole('button', { name: 'Send now' }).click();
    await expect
      .poll(async () =>
        (await storedDb(p.learner)).announcements.some(
          (x) => x.title === 'Office hours moved to 2:00 PM' && x.status === 'sent',
        ),
      )
      .toBe(true);
    await expect(p.learner.getByText('Office hours moved to 2:00 PM')).toBeVisible();
    expect(loads()).toBe(0);
    await p.close();
  });

  test('turning an automated reminder off stops its emails @parity:C-7', async () => {
    // No learner screen shows a reminder; its effect is the email. So: the Console's mutation
    // (`toggleReminder`), then the scheduler's own `dueWork`, one hour before Session 2, on and off.
    const db = worldDb();
    const at = Date.parse(NOW.s2Minus14) - 46 * 60_000;
    const out = inApi<{ on: string[]; off: string[] }>(
      [
        "const { toggleReminder } = await import('@ai/core/mutations');",
        "const { dueWork } = await import('./src/jobs/due.ts');",
        'const { db, at } = JSON.parse(process.env.PARITY_INPUT);',
        'const jobs = (d) => dueWork(d, at, new Set()).sends.map((s) => s.job);',
        "const id = db.reminders.find((r) => r.id === 'rm2').id;",
        "const off = toggleReminder(db, { kind: 'staff', staffId: 'st1' }, { id }, { now: at, id: (p) => p + '1' }).db;",
        'process.stdout.write(JSON.stringify({ on: jobs(db), off: jobs(off) }));',
      ].join('\n'),
      { db, at },
    );
    expect(out.on).toContain('session-1h');
    expect(out.off).not.toContain('session-1h');
  });

  test('hiding a Vault resource takes it off the open Vault @parity:C-8', async ({ browser }) => {
    const p = await pair(browser, '/vault');
    const loads = noReload(p.learner);
    await expect(p.learner.getByText('Fair Housing Language Checker')).toBeVisible();
    await console_(p, '/admin/vault');
    await p.admin
      .getByRole('row')
      .filter({ hasText: 'Fair Housing Language Checker' })
      .getByRole('button', { name: 'More actions' })
      .click();
    await p.admin.getByRole('menuitem', { name: 'Hide from learners' }).click();
    await expect(p.learner.getByText('Fair Housing Language Checker')).toHaveCount(0);
    expect(loads()).toBe(0);
    await p.close();
  });

  test('moving a learner to Team tier gives the open portal Team Hub @parity:C-11', async ({ browser }) => {
    const p = await pair(browser, '/');
    const loads = noReload(p.learner);
    const teamHub = async (page: Page) => {
      const shown = page
        .locator('aside[aria-label="Primary"]')
        .getByRole('link', { name: 'Team Hub' })
        .or(page.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'Team Hub' }));
      if (await shown.count()) return true;
      const menu = page.getByRole('button', { name: 'Your account' });
      if (!(await menu.count())) return false;
      await menu.click();
      const item = await page.getByRole('menuitem', { name: 'Team Hub' }).count();
      await page.keyboard.press('Escape');
      return item > 0;
    };
    expect(await teamHub(p.learner)).toBe(false);
    await console_(p, '/admin/learners');
    await p.admin.getByRole('row').filter({ hasText: 'Jamie Ortiz' }).first().click();
    await p.admin.getByRole('button', { name: 'Upgrade to Team Tier' }).click();
    await expect.poll(() => teamHub(p.learner)).toBe(true);
    expect(loads()).toBe(0);
    await p.close();
  });

  test('a nudge sends the build reminder, whose link lands on the week’s steps @parity:C-12', async ({ browser }) => {
    const p = await pair(browser, '/learn');
    await console_(p, '/admin/learners');
    await p.admin.getByRole('row').filter({ hasText: 'Jamie Ortiz' }).first().click();
    await p.admin.getByRole('button', { name: /Send Nudge/ }).click();
    await expect
      .poll(async () => (await storedDb(p.admin)).users.find((u) => u.id === 'u_jamie')?.nudged ?? null)
      .not.toBeNull();
    await p.learner.goto(fixtureUrl(ctaPath('build-reminder')));
    await p.learner.waitForSelector('body[data-app-ready="true"]');
    await expect(p.learner.getByRole('main').getByText('Run Map Your Spend').first()).toBeVisible();
    await p.close();
  });

  test('a masquerade lands staff in the learner portal, with its banner @parity:C-14', async ({ browser }) => {
    const ctx = await worldContext(browser);
    const page = await ctx.newPage();
    await visit(page, '/admin/masquerade', 'admin');
    await page.getByRole('button', { name: 'Masquerade…' }).click();
    await page.getByRole('textbox', { name: 'Reason' }).fill('Ticket 4411: the seat invite never arrived.');
    await page.getByRole('button', { name: 'Start 15-minute session' }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/admin'));
    expect(new URL(page.url()).pathname).toMatch(/^\/(learn(\/skills)?|skill-library)?$/);
    await expect(page.getByRole('region', { name: 'Masquerade session' })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await ctx.close();
  });

  test('Preview as Learner: the week the Console opens shows the learner portal with the preview banner @parity:C-15', async ({
    browser,
  }) => {
    // The Console's button opens `/employees/<id>?preview=agent` in a new tab (`data/preview.ts`). The fixture
    // build answers that button with a persona switch (`?as=`), so the address it opens in http mode is
    // visited here directly, as staff, which is what makes `?preview=` take effect.
    const ctx = await worldContext(browser);
    const page = await ctx.newPage();
    await page.goto(`${fixtureUrl(`/employees/${WEEK1_MODULE}`, 'admin')}&preview=agent`);
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(
      page.getByRole('button', { name: /Exit Preview/i }).or(page.getByRole('link', { name: /Exit Preview/i })),
    ).toBeVisible();
    await expect(page.locator('aside[aria-label="Primary"]')).toBeVisible();
    await expect(page.getByRole('main').getByText('Run Map Your Spend').first()).toBeVisible();
    await ctx.close();
  });
});
