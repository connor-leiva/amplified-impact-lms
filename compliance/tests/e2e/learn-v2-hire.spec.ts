import { test, expect, type Page } from '@playwright/test';
import { expectAccessible } from '../../lib/a11y';
import { openWorld, sideways, storedDb, WEEK1_MODULE } from '../parity/world';
import type { WorldOptions } from '../parity/world';
// The demo's non-course AI Employees. `compliance/` can't resolve `@ai/core`, so this is relative.
import { seed } from '../../../packages/core/src/seed';
import type { Db, Progress } from '../../../packages/core/src/types';

/**
 * D-186: the hire's page in the learner portal v2, in the fixture build, in the learner parity world
 * (`tests/parity/world.ts`: the deployed course at Week 1, Jamie `?as=agent` an Agent tier course learner):
 *
 *   - the Your Deployment card on an open week's page (E-14, A-6): Mark as Deployed, Pause, Resume and
 *     Reconnect change its status, through core's mutations, as the fixture runs them;
 *   - the Run dialog (E-15): Run shows the output and records the last run on the card (`recordRun`);
 *   - a non-course AI Employee's page (E-22): listed in the sidebar, its steps marked done;
 *   - an Agent tier course learner marks a step of a Team tier week (Connor's answer 2, `canOpenModule`);
 *   - a Notion file in the kit: Preview, no Download and no link (Connor's answer 3: no link in data);
 *   - axe, one h1, no sideways scroll and 44px targets at 1440 and 390.
 */

const demo = seed('live');
const MARKETING = 'marketing';

/** Week 1's steps all done (built), with its deployment as given. */
function week1(p: Partial<Progress>): (db: Db) => void {
  return (db) => {
    const m = db.modules.find((x) => x.id === WEEK1_MODULE)!;
    const jamie = db.users.find((u) => u.id === 'u_jamie')!;
    jamie.progress[WEEK1_MODULE] = { steps: m.checklist.map((s) => s.id), builtAt: Date.parse('2026-12-03T09:00:00-07:00'), deployedAt: null, runtime: null, ...p };
  };
}

/** The demo's Marketing AI Employee, a published module that isn't a course week, in Jamie's snapshot. */
const withMarketing = (db: Db): void => {
  db.modules.push(structuredClone(demo.modules.find((m) => m.id === MARKETING)!));
};

const both =
  (...edits: ((db: Db) => void)[]) =>
  (db: Db): void =>
    edits.forEach((e) => e(db));

async function open(browser: Parameters<typeof openWorld>[0], path: string, o: WorldOptions = {}): Promise<Page> {
  const page = await openWorld(browser, path, o);
  await page.locator('h1').first().waitFor();
  return page;
}

const card = (page: Page) => page.getByRole('region', { name: 'Your Deployment' });

/** Visible controls under 44px at a phone width (the phone pass's rule, D-181), as `learn-v2-content.spec.ts` checks. */
function smallTargets(page: Page) {
  return page.evaluate(() => {
    const hidden = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return true;
        if (e.getAttribute('aria-hidden') === 'true' || (e as HTMLElement).inert) return true;
        if (cs.position === 'absolute' && cs.overflow === 'hidden' && parseFloat(cs.width) <= 1 && parseFloat(cs.height) <= 1) return true;
      }
      const r = el.getBoundingClientRect();
      return !(r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth);
    };
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('a[href], button, [role=button], [role=radio]'))) {
      if (hidden(el) || (el as HTMLButtonElement).disabled) continue;
      const r = el.getBoundingClientRect();
      if (Math.min(r.width, r.height) < 43.5) out.push(`${el.tagName} "${(el.getAttribute('aria-label') || (el as HTMLElement).innerText).trim().slice(0, 40)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return out;
  });
}

test.describe('learner portal v2, the hire’s page (D-186) @g9', () => {
  test('@parity:E-14 @parity:A-6 the card’s actions change its status: Mark as Deployed, Pause, Resume', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', { edit: week1({}) });
    await expect(card(page)).toContainText('Not Deployed');
    await card(page).getByRole('button', { name: 'Mark as Deployed' }).click();
    await expect(card(page).locator('[data-runtime]')).toHaveText('Deployed');
    await card(page).getByRole('button', { name: 'Pause' }).click();
    await expect(card(page).locator('[data-runtime]')).toHaveText('Paused');
    await expect(card(page)).toContainText('Paused. It won’t pick up new work until you resume it.');
    await card(page).getByRole('button', { name: 'Resume' }).click();
    await expect(card(page).locator('[data-runtime]')).toHaveText('Deployed');
    const p = (await storedDb(page)).users.find((u) => u.id === 'u_jamie')!.progress[WEEK1_MODULE]!;
    expect(p.runtime).toBe('deployed');
    expect(p.deployedAt).not.toBeNull();
    await page.context().close();
  });

  test('@parity:E-14 @parity:A-6 needing attention: the issue, and Reconnect deploys it again', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', { edit: week1({ deployedAt: Date.parse('2026-12-03T10:00:00-07:00'), runtime: 'needs_attention', issue: 'The bank feed disconnected.' }) });
    await expect(card(page).locator('[data-runtime]')).toHaveText('Needs Attention');
    await expect(card(page)).toContainText('The bank feed disconnected.');
    await card(page).getByRole('button', { name: 'Reconnect' }).click();
    await expect(card(page).locator('[data-runtime]')).toHaveText('Deployed');
    await expect(page.getByText('Reconnected. Test run passed.')).toBeVisible();
    await page.context().close();
  });

  test('@parity:E-15 @parity:A-6 the Run dialog runs, shows the output and records the last run on the card', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', { edit: week1({ deployedAt: Date.parse('2026-12-03T10:00:00-07:00'), runtime: 'deployed' }) });
    await card(page).locator('button').filter({ hasNotText: /^(Pause|Open)$/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox').fill('October card statement');
    await dialog.getByRole('button', { name: 'Run', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Run Again' })).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByRole('button', { name: 'Copy All' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(card(page)).toContainText('Last Output');
    await expect(card(page)).toContainText('October card statement');
    const p = (await storedDb(page)).users.find((u) => u.id === 'u_jamie')!.progress[WEEK1_MODULE]!;
    expect(p.lastRun?.title).toMatch(/· October card statement$/);
    await page.context().close();
  });

  test('@parity:E-22 a non-course AI Employee is in the sidebar, its page draws, and a step is marked done', async ({ browser }) => {
    const page = await open(browser, '/learn', { edit: withMarketing });
    const link = page.locator('aside[aria-label="Primary"]').getByRole('link', { name: /^Marketing/ });
    await expect(link).toHaveAttribute('href', '/learn/employees/marketing');
    await link.click();
    await expect(page.getByRole('heading', { level: 1, name: 'Marketing AI Employee' })).toBeVisible();
    await expect(card(page)).toBeVisible();
    const steps = page.getByRole('region', { name: 'Six steps' });
    await steps.getByRole('button', { name: 'Mark step done' }).first().click();
    await expect(steps.getByRole('button', { name: 'Undo' })).toHaveCount(1);
    expect((await storedDb(page)).users.find((u) => u.id === 'u_jamie')!.progress[MARKETING]!.steps).toEqual(['c1']);
    await page.context().close();
  });

  test('@parity:E-16 an Agent tier course learner marks a step of a Team tier week done', async ({ browser }) => {
    // The deployed seed's weeks, Team tier, as production has them (the world opens them to both tiers).
    const page = await open(browser, '/learn/week/1/step/1', { edit: (db) => db.modules.forEach((m) => m.id.startsWith('accelerator-week-') && (m.tier = 'team')) });
    const stored = await storedDb(page);
    expect(stored.users.find((u) => u.id === 'u_jamie')!.tier).toBe('agent');
    expect(stored.modules.find((m) => m.id === WEEK1_MODULE)!.tier).toBe('team');
    await page.getByRole('button', { name: 'Mark step done' }).click();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
    await expect(page.getByText('Team tier required')).toHaveCount(0);
    expect((await storedDb(page)).users.find((u) => u.id === 'u_jamie')!.progress[WEEK1_MODULE]!.steps).toHaveLength(1);
    await page.context().close();
  });

  test('@parity:E-11 a Notion file previews, with no Download and no link', async ({ browser }) => {
    const page = await open(browser, '/learn/employees/marketing', { edit: withMarketing });
    const kit = page.getByRole('region', { name: 'Build Kit' });
    const notion = demo.modules.find((m) => m.id === MARKETING)!.files.find((f) => f.type === 'Notion')!;
    await expect(kit.getByRole('button', { name: `Preview ${notion.name}` })).toBeVisible();
    await expect(kit.getByRole('link', { name: `Download ${notion.name}` })).toHaveCount(0);
    await expect(kit.getByRole('link', { name: /Notion/ })).toHaveCount(0);
    await kit.getByRole('button', { name: `Preview ${notion.name}` }).click();
    await expect(page.getByRole('dialog', { name: notion.name })).toBeVisible();
    await page.context().close();
  });

  for (const width of [1440, 390])
    for (const [path, edit] of [
      ['/learn/week/1', week1({ deployedAt: Date.parse('2026-12-03T10:00:00-07:00'), runtime: 'needs_attention', issue: 'The bank feed disconnected.', lastRun: { at: Date.parse('2026-12-03T11:00:00-07:00'), title: 'Spend map · Q4', preview: 'Three lines over budget.' } })],
      ['/learn/employees/marketing', both(withMarketing)],
    ] as const)
      test(`@parity:E-14 @parity:E-22 ${path} with the card at ${width}: accessible, one h1, no sideways scroll${width === 390 ? ', 44px targets' : ''}`, async ({ browser }) => {
        const page = await open(browser, path, { width, height: width < 768 ? 844 : 900, edit });
        await expect(card(page)).toBeVisible();
        await expect(page.locator('h1')).toHaveCount(1);
        await expectAccessible(page);
        expect(await sideways(page)).toBe(0);
        if (width === 390) expect(await smallTargets(page)).toEqual([]);
        await page.context().close();
      });

  test('@parity:E-15 the Run dialog is accessible', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', { edit: week1({ deployedAt: Date.parse('2026-12-03T10:00:00-07:00'), runtime: 'deployed' }) });
    await card(page).locator('button').filter({ hasNotText: /^(Pause|Open)$/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectAccessible(page);
    await page.context().close();
  });
});
