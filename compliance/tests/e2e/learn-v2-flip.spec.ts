import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE, open } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
import type { Scenario } from '../../lib/scenarios';
// The course as the API sends it, from the deployed seed, and the fixture's own snapshot (relative:
// `compliance/` can't resolve `@ai/core`).
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { DB_KEY } from '../../../packages/core/src/constants';
import { seed } from '../../../packages/core/src/seed';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

// D-182: the learner portal's flag ON, in the flag-on fixture build (`pnpm e2e:learn`, dist-fixture-v2).
// The router routes by course access:
//   - a learner whose plan opens the course gets the learner portal at /learn, and every first-portal
//     address of theirs lands on its learner portal page, query and fragment kept;
//   - a learner without it (Utah Life, the Agent Plan, the Team Plan, Insiders, every access group's
//     member) keeps exactly what `main` serves: `/` and /learn go to the standalone Skill Library, and the
//     vault and the Team Hub are the first portal's;
//   - staff keep the Console, a staff member's preview tab shows the learner portal under its line, and a
//     masquerade lands where the learner would.
// The flag-off build (`pnpm compliance`, `pnpm e2e`) keeps the first portal for everyone, and every parity
// scenario compares it with its goldens there. `apps/web/src/routes/learn/audience.test.tsx` walks the
// same table in both flag states, at the router.

const base = { id: 'flip-e2e', gate: 4, role: 'agent', ref: 'dashboard', path: '/' } as const;
const scenario = (over: Partial<Scenario> = {}): Scenario => ({ ...base, ...over }) as Scenario;

/** The app's address, without the harness's own `?as=` and `?phase=`. */
const pathOf = (url: string): string => new URL(url).pathname;

// `GET /api/course` as it answers a buyer in the pre-launch preview, so a week's and the Schedule's pages
// stay put (the fixture build has no API, and without the course they go Home).
const NOW = '2026-11-18T14:00:00-07:00';
const seeded = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const course = {
  open: true,
  preview: false,
  prelaunch: true,
  course: courseFor(seeded, Date.parse(NOW), { open: true, preview: true }),
  sessions: courseSessions(seeded),
  copy: Object.fromEntries((seeded.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
};

/**
 * The fixture's snapshot for a plan that opens no AI Employee (Utah Life, the Agent Plan, the Team Plan,
 * Insiders): every AI Employee a draft, so `visibleModules` is empty, as the server's scoped snapshot
 * is for them. Written where the fixture repository reads its database, before the app boots.
 */
const noCourse = (() => {
  const db = seed('live');
  return JSON.stringify({ ...db, modules: db.modules.map((m) => ({ ...m, status: 'draft' })) });
})();

/** An address in the fixture build, as a persona, with the course answered; `withoutCourse` for a plan without it. */
async function visit(browser: Browser, path: string, opts: { as?: 'agent' | 'owner' | 'admin'; withoutCourse?: boolean } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Denver' });
  if (opts.withoutCourse) await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [DB_KEY, noCourse] as const);
  const page = await ctx.newPage();
  await page.route('**/api/course', (r) => r.fulfill({ json: course }));
  // The harness's own `as` and `now` join the address's query, ahead of its fragment.
  const [where, hash = ''] = path.split('#');
  await page.goto(`${APP_BASE}${where}${where!.includes('?') ? '&' : '?'}as=${opts.as ?? 'agent'}&now=${encodeURIComponent(NOW)}${hash ? `#${hash}` : ''}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  return { ctx, page };
}

/** The address with its query (less the harness's own `as` and `now`) and fragment. */
function addressOf(page: Page): string {
  const u = new URL(page.url());
  u.searchParams.delete('as');
  u.searchParams.delete('now');
  return `${u.pathname}${u.search}${u.hash}`;
}

test.describe('a learner with the course: the learner portal @g4', () => {
  test('@parity:R-1 @parity:R-2 @parity:R-3 @parity:R-4 @parity:R-5 @parity:R-6 @parity:R-7 @parity:R-8 @parity:R-9 @parity:R-14 every first-portal address lands on its learner portal page', async ({ browser }) => {
    const table: [string, string][] = [
      ['/', '/learn'],
      ['/sessions', '/learn/schedule'],
      ['/sessions?view=calendar#top', '/learn/schedule?view=calendar#top'],
      ['/employees/marketing', '/learn'],
      ['/employees/accelerator-week-3', '/learn/week/3'],
      ['/course', '/learn'],
      ['/course/week-3', '/learn/week/3'],
      ['/skill-library', '/learn/skills'],
      ['/skill-library/content-strategist', '/learn/skills/content-strategist'],
      ['/vault', '/learn/vault'],
      ['/team-tier', '/learn'],
    ];
    for (const [from, to] of table) {
      const { ctx, page } = await visit(browser, from);
      await expect.poll(() => addressOf(page), from).toBe(to);
      // Only the learner portal's frame is drawn, never the first portal's shell.
      await expect(page.locator('[data-learner-v2]'), from).toHaveCount(1);
      await expect(page.locator('aside[aria-label="Primary"]'), from).toHaveCount(1);
      await ctx.close();
    }
  });

  test('@parity:R-12 @parity:R-13 admins cannot reach portal routes and learners cannot reach admin', async ({ browser }) => {
    const a = await open(browser, scenario({ role: 'admin', ref: 'overview', path: '/sessions' }), 'app');
    await expect.poll(() => pathOf(a.page.url())).toBe('/admin');
    await a.ctx.close();

    for (const path of ['/admin/tiers', '/admin/roles', '/admin/no-such-page']) {
      const l = await open(browser, scenario({ path }), 'app');
      await expect.poll(() => pathOf(l.page.url()), path).toBe('/learn');
      await expect(l.page.locator('[data-r2-shell]')).toHaveCount(0);
      await l.ctx.close();
    }
  });

  test('@parity:R-4 @parity:R-6 the Team Hub is a Team tier learner’s; an Agent tier learner goes Home, and Team Tier is gone', async ({ browser }) => {
    const agent = await open(browser, scenario({ path: '/team' }), 'app');
    await expect.poll(() => pathOf(agent.page.url())).toBe('/learn');
    await agent.ctx.close();

    const owner = await open(browser, scenario({ role: 'owner', path: '/team' }), 'app');
    await expect.poll(() => pathOf(owner.page.url())).toBe('/learn/team');
    await expect(owner.page.getByRole('heading', { level: 1, name: 'Team Hub' })).toBeVisible();
    await expect(owner.page.getByRole('button', { name: 'Invite Member' })).toBeVisible();
    await owner.ctx.close();

    const upgrade = await open(browser, scenario({ role: 'owner', path: '/team-tier' }), 'app');
    await expect.poll(() => pathOf(upgrade.page.url())).toBe('/learn');
    await upgrade.ctx.close();
  });

  test('@parity:R-11 the password page stays where it is', async ({ browser }) => {
    const { ctx, page } = await visit(browser, '/account');
    expect(pathOf(page.url())).toBe('/account');
    await expect(page.locator('[data-learner-v2]')).toHaveCount(0);
    await ctx.close();
  });
});

test.describe('a learner without the course: today’s portal, unchanged @g4', () => {
  test('@parity:U-1 @parity:U-2 @parity:G-2 @parity:G-3 @parity:G-4 @parity:G-5 @parity:L-5 @parity:L-6 `/` and /learn go to the standalone Skill Library, never the learner portal', async ({ browser }) => {
    for (const from of ['/', '/learn', '/learn/schedule', '/sessions', '/employees/marketing', '/skill-library']) {
      const { ctx, page } = await visit(browser, from, { withoutCourse: true });
      await expect.poll(() => pathOf(page.url()), from).toBe('/skill-library');
      // The first Skill Library (D-079): outside every shell, its own heading.
      await expect(page.getByRole('heading', { level: 1, name: 'Skill Library' }), from).toBeVisible();
      await expect(page.locator('[data-learner-v2]'), from).toHaveCount(0);
      await expect(page.locator('aside[aria-label="Primary"]'), from).toHaveCount(0);
      await ctx.close();
    }
  });

  test('@parity:R-9 @parity:U-7 a skill’s address is the first guide page, from either address, fragment kept', async ({ browser }) => {
    for (const [from, to] of [
      ['/skill-library/content-strategist#download', '/skill-library/content-strategist#download'],
      ['/learn/skills/content-strategist#download', '/skill-library/content-strategist#download'],
    ] as const) {
      const { ctx, page } = await visit(browser, from, { withoutCourse: true });
      await expect.poll(() => addressOf(page), from).toBe(to);
      await expect(page.locator('[data-learner-v2]'), from).toHaveCount(0);
      await ctx.close();
    }
  });

  test('@parity:R-5 @parity:U-3 @parity:SH-2 the vault is the first portal’s, in its own shell, from either address', async ({ browser }) => {
    for (const from of ['/vault', '/learn/vault']) {
      const { ctx, page } = await visit(browser, from, { withoutCourse: true });
      await expect.poll(() => pathOf(page.url()), from).toBe('/vault');
      await expect(page.getByRole('heading', { level: 1, name: 'Resource & Compliance Vault' }), from).toBeVisible();
      await expect(page.locator('[data-learner-v2]'), from).toHaveCount(0);
      // The first portal's sidebar, which for a plan without the course keeps the Skill Library and the vault.
      const nav = page.locator('aside[aria-label="Primary"]');
      await expect(nav, from).toHaveCount(1);
      await expect(nav.getByText('Skill Library'), from).toBeVisible();
      await ctx.close();
    }
  });

  test('@parity:R-4 @parity:G-2 a Team Plan owner’s Team Hub is the first portal’s, from either address', async ({ browser }) => {
    for (const from of ['/team', '/learn/team']) {
      const { ctx, page } = await visit(browser, from, { as: 'owner', withoutCourse: true });
      await expect.poll(() => pathOf(page.url()), from).toBe('/team');
      await expect(page.getByRole('heading', { level: 1, name: 'Team Hub' }), from).toBeVisible();
      await expect(page.locator('[data-learner-v2]'), from).toHaveCount(0);
      await ctx.close();
    }
  });

  test('@parity:U-5 @parity:R-11 their account is the password page, as today', async ({ browser }) => {
    const { ctx, page } = await visit(browser, '/learn/account', { withoutCourse: true });
    await expect.poll(() => pathOf(page.url())).toBe('/account');
    await expect(page.locator('[data-learner-v2]')).toHaveCount(0);
    await ctx.close();
  });
});

test.describe('staff, preview and masquerade @g6', () => {
  const go = (browser: Browser, path: string, role: Scenario['role'] = 'admin') => open(browser, scenario({ role, path, gate: 6 }), 'app');

  test('@parity:R-13 staff without the preview flag are still sent to the Admin Console', async ({ browser }) => {
    const { ctx, page } = await go(browser, '/employees/sales');
    await expect(page).toHaveURL(/\/admin(\?|$)/);
    await expect(page.getByRole('status').filter({ hasText: 'Previewing as' })).toHaveCount(0);
    await ctx.close();
  });

  test('@parity:SH-10 staff with the flag see the learner portal as an Agent, under the preview line', async ({ browser }) => {
    const { ctx, page } = await go(browser, '/employees/sales?preview=agent');
    await expect.poll(() => pathOf(page.url())).toBe('/learn');
    expect(new URL(page.url()).searchParams.get('preview')).toBe('agent');
    await expect(page.getByRole('status').filter({ hasText: 'Previewing as Agent.' })).toBeVisible();
    await expect(page.locator('[data-learner-v2] aside[aria-label="Primary"]')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await ctx.close();
  });

  test('@parity:SH-10 a Team Owner preview says so, and Exit Preview goes back to the Curriculum page', async ({ browser }) => {
    const { ctx, page } = await go(browser, '/employees/finance?preview=owner');
    await expect.poll(() => pathOf(page.url())).toBe('/learn');
    await expect(page.getByRole('status').filter({ hasText: 'Previewing as Team Owner.' })).toBeVisible();
    await page.getByRole('link', { name: 'Exit Preview' }).click();
    await expect(page).toHaveURL(/\/admin\/curriculum$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Curriculum' })).toBeVisible();
    await ctx.close();
  });

  test('@parity:SH-10 every change in a preview is refused with Preview only, and nothing changes', async ({ browser }) => {
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

  test('@parity:C-14 @parity:SH-11 a masquerade starts where the learner lands, with the banner, and Exit comes back', async ({ browser }) => {
    const { ctx, page } = await go(browser, '/admin/masquerade');
    await page.getByRole('button', { name: 'Masquerade…' }).click();
    await page.getByRole('textbox', { name: 'Reason' }).fill('Ticket 4411: the seat invite never arrived.');
    await page.getByRole('button', { name: 'Start 15-minute session' }).click();
    await expect.poll(() => pathOf(page.url())).toBe('/learn');
    const banner = page.getByRole('region', { name: 'Masquerade session' });
    await expect(banner).toContainText('Masquerading as Elena Vargas · Northshore Group');
    await expect(page.locator('[data-learner-v2] aside[aria-label="Primary"]')).toHaveCount(1);
    await expectAccessible(page);
    await banner.getByRole('button', { name: 'Exit masquerade' }).click();
    await expect.poll(() => pathOf(page.url())).toBe('/admin/masquerade');
    await ctx.close();
  });

  test('@parity:SH-11 the masquerade banner shows over the learner portal’s pages', async ({ browser }) => {
    for (const path of ['/learn?masquerade=demo', '/learn/skills?masquerade=demo', '/learn/vault?masquerade=demo']) {
      const { ctx, page } = await go(browser, path, 'agent');
      await expect(page.getByRole('region', { name: 'Masquerade session' }), path).toContainText('Masquerading as Elena Vargas');
      await ctx.close();
    }
  });
});

test.describe('the learner shell’s own checks @g4', () => {
  test('every interactive element in the learner shell has a visible focus ring', async ({ browser }) => {
    const { ctx, page } = await open(browser, scenario({ path: '/learn' }), 'app');
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

  test('the demo controls do not exist in the DOM when demo mode is off', async ({ browser }) => {
    const { ctx, page } = await open(browser, scenario({ path: '/learn' }), 'app');
    // The fixture build ships with VITE_DEMO_MODE=false, so the controls must be absent entirely, not
    // merely hidden. In http mode they are impossible (see src/data/boot.test.ts).
    await expect(page.getByRole('group', { name: 'Demo controls' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Demo:/ })).toHaveCount(0);
    await ctx.close();
  });

  test('a fixture demo keeps View As, Timeline and Reset Demo on the learner portal, and View As goes back to Admin', async ({ browser }) => {
    const { ctx, page } = await open(browser, scenario({ path: '/learn?demo=1' }), 'app');
    const demo = page.getByRole('group', { name: 'Demo controls' });
    await expect(demo).toBeVisible();
    await expect(demo.getByRole('button', { name: 'Reset Demo' })).toBeVisible();
    await demo.getByRole('button', { name: 'Admin', exact: true }).click();
    await expect.poll(() => pathOf(page.url())).toMatch(/^\/admin/);
    await ctx.close();
  });
});
