import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  OPEN_GUIDE,
  UTAH,
  fixtureUrl,
  guides,
  learnerCopy,
  openWorld,
  worldContext,
  type Audience,
  type Persona,
} from './world';

/**
 * The learner parity suite: access groups (Connor's parity brief § 1 and § 3). Learners whose plan does
 * not open the course (Utah Life, the Agent Plan, the Team Plan, Insiders, a free account) keep exactly
 * today's portal: the standalone Skill Library at `/` and at sign-in, the old guide, and the Vault and
 * Team Hub as they are. "Route by course access, not by flag."
 *
 * The fixture build tells them apart as production does: `GET /api/course` answers 403 (no course in the
 * plan), `GET /api/skills` answers their plan or group, and their snapshot holds no AI Employee (the API's
 * `scopeSnapshot`; `world.ts`). On #171 these pass with the flag on, because #171 never sends a
 * no-course learner to /learn; the reworked #172 must keep them passing.
 *
 * GOLDENS. No golden captures the standalone Skill Library, the old guide or a no-course learner's shell
 * (the prototype has neither). The goldens of the two shell screens these learners keep, the Vault and the
 * Team Hub, are pinned below byte for byte, as they are on `main` @ e5f5dd2; fixture parity (`pnpm
 * compliance`) is what keeps rendering them against those files.
 */

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const sidebar = (page: Page) => page.locator('aside[aria-label="Primary"]');

async function library(page: Page): Promise<void> {
  await expect(h1(page)).toHaveText('Skill Library');
  await expect(page.getByText('Every skill your plan includes.', { exact: false })).toBeVisible();
}

test.describe('learner parity: Utah Life keeps today’s portal', () => {
  test('the sign-in landing is the standalone Skill Library, with no sidebar @parity:U-1', async ({ browser }) => {
    const ctx = await worldContext(browser, { audience: 'utah' });
    const page = await ctx.newPage();
    await page.goto(fixtureUrl('/sign-in?token=tok_signin'));
    await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'));
    await page.waitForSelector('body[data-app-ready="true"]');
    await library(page);
    await expect(sidebar(page)).toHaveCount(0);
    await ctx.close();
  });

  test('visiting / sends them to the Skill Library @parity:U-2', async ({ browser }) => {
    const page = await openWorld(browser, '/', { audience: 'utah' });
    await expect(page).toHaveURL(/\/skill-library(\?|$)/);
    await library(page);
    await page.context().close();
  });

  test('their nav: the library has none; in the shell, only the Skill Library and the Vault @parity:U-3', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/skill-library', { audience: 'utah' });
    await expect(sidebar(page)).toHaveCount(0);
    await page.goto(fixtureUrl('/vault'));
    await page.waitForSelector('body[data-app-ready="true"]');
    const nav = sidebar(page);
    await expect(
      nav.getByRole('link', { name: /Skill Library/i }).or(nav.getByRole('button', { name: /Skill Library/i })),
    ).toBeVisible();
    await expect(
      nav.getByRole('link', { name: /Resource Vault/i }).or(nav.getByRole('button', { name: /Resource Vault/i })),
    ).toBeVisible();
    for (const gone of [/^Dashboard$/, /^Sessions$/, /^Schedule$/, /^Home$/, /^AI Employees/i]) {
      await expect(nav.getByRole('link', { name: gone })).toHaveCount(0);
      await expect(nav.getByRole('button', { name: gone })).toHaveCount(0);
    }
    await page.context().close();
  });

  test('the welcome panel and the "Included with your Utah Life team" line @parity:U-4 @parity:L-6', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/skill-library', { audience: 'utah' });
    const welcome = page.getByRole('region', { name: `Welcome, ${UTAH.name}` });
    await expect(welcome).toBeVisible();
    await expect(welcome).toContainText('Your team access includes 30 agent skills.');
    await expect(welcome.getByRole('button', { name: 'Dismiss' })).toBeVisible();
    // The line as `main` renders it (SkillLibrary.tsx COPY.included). The inventory quotes it as "…access"; the code says "…team".
    await expect(page.getByText(`Included with your ${UTAH.name} team`, { exact: true })).toBeVisible();
    await page.context().close();
  });

  test('the welcome panel’s Dismiss hides it and posts to the server @parity:L-5 @parity:A-14', async ({ browser }) => {
    const page = await openWorld(browser, '/skill-library', { audience: 'utah' });
    const posted = page.waitForRequest((r) => r.url().endsWith('/api/skills/welcome/dismiss') && r.method() === 'POST');
    await page
      .getByRole('region', { name: `Welcome, ${UTAH.name}` })
      .getByRole('button', { name: 'Dismiss' })
      .click();
    expect((await posted).postDataJSON()).toEqual({ group: UTAH.id });
    await expect(page.getByRole('region', { name: `Welcome, ${UTAH.name}` })).toHaveCount(0);
    await page.context().close();
  });

  test('their Account is the password page only @parity:U-5', async ({ browser }) => {
    const page = await openWorld(browser, '/skill-library', { audience: 'utah' });
    await expect(page.locator('a[href="/learn/account"]')).toHaveCount(0);
    await page.goto(fixtureUrl('/account'));
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(h1(page)).toHaveText('Your Password');
    await page.context().close();
  });

  test('locked skills say "Not included with Utah Life access", with no See Plans @parity:U-6', async ({ browser }) => {
    const page = await openWorld(browser, '/skill-library', { audience: 'utah' });
    // Their skills come first. Owner skills sit at the bottom, closed, with a computed count (D-201).
    const headings = (await page.getByRole('heading', { level: 2 }).allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
    const agentAt = headings.findIndex((h) => h.startsWith('Agent Skills'));
    const ownerAt = headings.findIndex((h) => h.startsWith('Owner and Operations Skills'));
    expect(agentAt).toBeGreaterThanOrEqual(0);
    expect(ownerAt).toBeGreaterThan(agentAt);
    const toggle = page.getByRole('button', { name: /Owner and Operations Skills/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toContainText(/Skills, Not Included With Utah Life Access/);
    await expect(page.getByRole('link', { name: 'See Plans' })).toHaveCount(0);
    await toggle.click();
    await expect(page.getByText(`Not included with ${UTAH.name} access`).first()).toBeVisible();
    expect(learnerCopy('locked.utah_life')).toBe(`Not included with ${UTAH.name} access`);
    await expect(page.getByRole('link', { name: 'See Plans' })).toHaveCount(0);
    await page.context().close();
  });

  test('downloads and Setup Guides on the list, and the old guide @parity:U-7', async ({ browser }) => {
    test.skip(!guides, 'needs the fixture build’s apps/web/dist-private/skill-guides.json');
    const page = await openWorld(browser, '/skill-library', { audience: 'utah' });
    await expect(page.locator(`a[href="/api/skills/${OPEN_GUIDE}/download/claude"]`)).toBeVisible();
    const guide = page.locator(`a[href="/skill-library/${OPEN_GUIDE}"]`).filter({ hasText: 'Setup Guide' });
    await guide.click();
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(page).toHaveURL(new RegExp(`/skill-library/${OPEN_GUIDE}`));
    await expect(
      page.getByText(guides!.guides[OPEN_GUIDE]!.lanes[0]!.steps[0]!.title, { exact: true }).first(),
    ).toBeVisible();
    await expect(sidebar(page)).toHaveCount(0);
    await page.context().close();
  });
});

test.describe('learner parity: an Accelerator learner gets the new portal, whole', () => {
  test('Home, a week, a step, the Schedule, the library, the Vault, Account and (Team tier) Team Hub @parity:G-1', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn', { as: 'owner' });
    for (const [path, heading] of [
      ['/learn', /^Good (morning|afternoon|evening), Alex$/],
      ['/learn/week/1', /^Where the Money Goes$/],
      ['/learn/week/1/step/1', /^Run Map Your Spend$/],
      ['/learn/schedule', /^Schedule$/],
      ['/learn/skills', /^Skill library$/],
      ['/learn/account', /^Account$/],
    ] as const) {
      await page.goto(fixtureUrl(path, 'owner'));
      await page.waitForSelector('body[data-app-ready="true"]');
      await expect(h1(page), path).toHaveText(heading);
      await expect(sidebar(page), path).toBeVisible();
    }
    await sidebar(page).getByRole('link', { name: 'Resource vault' }).click();
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(h1(page)).toHaveText('Resource & Compliance Vault');
    await page.goto(fixtureUrl('/learn', 'owner'));
    await page.waitForSelector('body[data-app-ready="true"]');
    const inNav = sidebar(page).getByRole('link', { name: 'Team Hub' });
    if (!(await inNav.count())) await page.getByRole('button', { name: 'Your account' }).click();
    await inNav
      .or(page.getByRole('menuitem', { name: 'Team Hub' }))
      .first()
      .click();
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(h1(page)).toHaveText('Team Hub');
    await page.context().close();
  });
});

test.describe('learner parity: every no-course plan keeps today’s portal', () => {
  const PLANS: { id: string; audience: Audience; as: Persona; teamHub: boolean; seePlans: boolean }[] = [
    { id: 'G-2', audience: 'team-plan', as: 'owner', teamHub: true, seePlans: false },
    { id: 'G-3', audience: 'agent-plan', as: 'agent', teamHub: false, seePlans: true },
    { id: 'G-4', audience: 'insiders', as: 'agent', teamHub: false, seePlans: false },
    { id: 'G-5', audience: 'free', as: 'agent', teamHub: false, seePlans: true },
  ];
  for (const plan of PLANS)
    test(`${plan.audience}: / is the standalone Skill Library, with its own buttons, and the Vault stays @parity:${plan.id}`, async ({
      browser,
    }) => {
      const page = await openWorld(browser, '/', { audience: plan.audience, as: plan.as });
      await expect(page).toHaveURL(/\/skill-library(\?|$)/);
      await library(page);
      await expect(sidebar(page)).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Open Team Hub' })).toHaveCount(plan.teamHub ? 1 : 0);
      await expect(page.getByRole('link', { name: 'Manage Billing' })).toHaveAttribute('href', '/api/billing/portal');
      await expect(page.getByRole('link', { name: 'Open the AI Accelerator' })).toHaveCount(0);
      if (plan.seePlans) {
        // An Agent Plan member's owner skills are closed until opened (D-201). A free account has no such section.
        const toggle = page.getByRole('button', { name: /Owner and Operations Skills/ });
        if ((await toggle.count()) > 0 && (await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
        await expect(page.getByRole('link', { name: 'See Plans' }).first()).toBeVisible();
      }
      await page.goto(fixtureUrl('/vault', plan.as));
      await page.waitForSelector('body[data-app-ready="true"]');
      await expect(h1(page)).toHaveText('Resource & Compliance Vault');
      if (plan.teamHub) {
        await page.goto(fixtureUrl('/team', plan.as));
        await page.waitForSelector('body[data-app-ready="true"]');
        await expect(h1(page)).toHaveText('Team Hub');
      }
      await page.context().close();
    });

  test('the goldens of the screens they keep (Vault, Team Hub) are byte-identical to main @ e5f5dd2 @parity:G-2 @parity:G-3 @parity:G-4 @parity:U-3', () => {
    const GOLDENS = fileURLToPath(new URL('../../goldens/', import.meta.url));
    const sha = (f: string) =>
      createHash('sha256')
        .update(readFileSync(GOLDENS + f))
        .digest('hex');
    const MAIN: Record<string, string> = {
      'team-owner-invite-page.json': '82ee26ab61ca07e548a33d71ad5f4a72ba6dc5adbbb55cc81726f84a0d77df97',
      'team-owner-main.json': 'f44ee0d870e28f28943defb011e1c2538f47b2af29ece6d0a87350b614f5e6c2',
      'team-owner-member-drawer.json': 'a367b099167d6ef0559c5e2205f107b3499ba7d01c0c7a6019669a8f13ef5995',
      'team-owner-page.json': '0144ed7a0731251c37c0a2ef527d22cf56a4ae90cb6b126479b40a30e5a011fb',
      'vault-agent-exec-main.json': 'ee4d8d78d861e00a5fd4d9b4cd8bed8a9f565bf8cabf8cccc1e6d7bfde4d5b81',
      'vault-agent-exec-page.json': 'f8c0a3b9dae36bab29d9207fc60e8f2a3cc66e9ec4f986000f1584e4045b9328',
      'vault-agent-main.json': 'eee94d4d1e66468642e667f47244f3c9423ec749335fe23c5026c4f10b55b942',
      'vault-agent-page.json': 'ec8808bd5816c3fdfe84798ee176f3722ed1f45e875e8e8bf404519cb4cf1c06',
      'vault-owner-exec-main.json': '21983baa446b3feb138605d5e057fdc04271830fc7619ebffe8b34a71053fc40',
      'vault-owner-exec-page.json': 'e1b8bd25edc4e0c95f057087748fe6aa393f94fc3bc321ec378a2982ff29c90f',
      'linux/team-owner-invite-page.png': '57f1fc2a525b6e4bf3b834bdeae715fef2afd3f52f7bb42c479d1816a5df0c60',
      'linux/team-owner-main.png': '27130cf856692e006321f34f7bc647c686d295cfeb4ee3ead1e7f9e5e447ee93',
      'linux/team-owner-member-drawer.png': '05d08b66affa54041657b89911d38d86c36d14cc74c3ef109471163e43a2a48a',
      'linux/team-owner-page.png': '7698545259d7767a733407ad9177bf81de0ce110c39935f452616541dae9e472',
      'linux/vault-agent-exec-main.png': 'aa8b2a0602e133601011e6513db68a4014ff24131590b5e2d76a4fb549384dab',
      'linux/vault-agent-exec-page.png': '362a9e04395745171c2b0927baed562ef3766e2f3384a8fc337241a82d6e48f1',
      'linux/vault-agent-main.png': 'bb99ec05368911c597707ebca29a3fc90bc057cef6dba9b75501c47c60755752',
      'linux/vault-agent-page.png': '5baa44c8b812c629668cd3652d00ccfdbfb47f96c9be9f1ceb55e948fe7a9970',
      'linux/vault-owner-exec-main.png': '8e517efa0b9423b4edeaf9fe19f475a96aeffc24e965af3aef5d58759db51639',
      'linux/vault-owner-exec-page.png': '9ea1cd45454872fdeed4c2c7c03683c0765dd464703353722d5bcb9dc12469b7',
    };
    for (const [file, hash] of Object.entries(MAIN)) expect(sha(file), file).toBe(hash);
  });
});
