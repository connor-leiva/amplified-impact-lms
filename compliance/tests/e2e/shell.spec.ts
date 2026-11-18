import { test, expect, type Browser } from '@playwright/test';
import { APP_BASE, open } from '../../lib/prepare';
import type { Scenario } from '../../lib/scenarios';
// The course as the API sends it, from the deployed seed (relative: `compliance/` can't resolve `@ai/core`).
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

// Phase 04 behaviour gate, after D-182. The first learner portal's shell (its rail, profile menu, time
// zone and theme switches, and Locked Employee Preview) retired with the screens it framed; the learner
// portal at /learn is every learner's now, and its shell is held to its mockup by the `learn-v2*` specs.
// What stays here is the shell's guards, which still have to hold: staff and learners each keep to their
// own side, every old learner address lands on its new page, and the demo controls exist only in a
// fixture demo. These run against the fixture build.

const base = { id: 'shell-e2e', gate: 4, role: 'agent', ref: 'dashboard', path: '/' } as const;
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

/** An address in the fixture build, as an Agent tier learner, with the course answered. */
async function visit(browser: Browser, path: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Denver' });
  const page = await ctx.newPage();
  await page.route('**/api/course', (r) => r.fulfill({ json: course }));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=agent&now=${encodeURIComponent(NOW)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  return { ctx, page };
}

test('admins cannot reach portal routes and learners cannot reach admin @g4', async ({ browser }: { browser: Browser }) => {
  const a = await open(browser, scenario({ role: 'admin', ref: 'overview', path: '/sessions' }), 'app');
  await expect.poll(() => pathOf(a.page.url())).toBe('/admin');
  await a.ctx.close();

  const l = await open(browser, scenario({ path: '/admin/tiers' }), 'app');
  await expect.poll(() => pathOf(l.page.url())).toBe('/learn');
  await expect(l.page.locator('[data-r2-shell]')).toHaveCount(0);
  await l.ctx.close();
});

test('every learner address of the first portal lands on its learner portal page (D-182) @g4', async ({ browser }) => {
  const table: [string, string][] = [
    ['/', '/learn'],
    ['/sessions', '/learn/schedule'],
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
    await expect.poll(() => pathOf(page.url()), from).toBe(to);
    // Only the learner portal's frame is drawn, never the first portal's shell.
    await expect(page.locator('[data-learner-v2]'), from).toHaveCount(1);
    await expect(page.locator('aside[aria-label="Primary"]'), from).toHaveCount(1);
    await ctx.close();
  }
});

test('the Team Hub is a Team tier learner’s; an Agent tier learner goes Home, and Team Tier is gone @g4', async ({ browser }) => {
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

test('every interactive element in the learner shell has a visible focus ring @g4', async ({ browser }) => {
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

test('the demo controls do not exist in the DOM when demo mode is off @g4', async ({ browser }) => {
  const { ctx, page } = await open(browser, scenario({ path: '/learn' }), 'app');
  // The fixture build ships with VITE_DEMO_MODE=false, so the controls must be absent entirely —
  // not merely hidden. In http mode they are impossible (see src/data/boot.test.ts).
  await expect(page.getByRole('group', { name: 'Demo controls' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Demo:/ })).toHaveCount(0);
  await ctx.close();
});

test('a fixture demo keeps View As, Timeline and Reset Demo on the learner portal, and View As goes back to Admin @g4', async ({ browser }) => {
  const { ctx, page } = await open(browser, scenario({ path: '/learn?demo=1' }), 'app');
  const demo = page.getByRole('group', { name: 'Demo controls' });
  await expect(demo).toBeVisible();
  await expect(demo.getByRole('button', { name: 'Reset Demo' })).toBeVisible();
  await demo.getByRole('button', { name: 'Admin', exact: true }).click();
  await expect.poll(() => pathOf(page.url())).toMatch(/^\/admin/);
  await ctx.close();
});
