import { test, expect, type Browser, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// `compliance/` can't resolve `@ai/core`, so these are relative.
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { DB_KEY } from '../../../packages/core/src/constants';
import { seed } from '../../../packages/core/src/seed';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';
import { previewOf } from '../../../packages/core/src/skill-guides';
import { PLAN_NAMES } from '../../../packages/core/src/offer';
import { courseOutline } from '../../../packages/core/src/course';
import type { SkillGuide } from '../../../packages/core/src/skill-guides';

// D-257: LMS v3 for EVERY learner type (Connor, Nov 25, 2026), in the both-flags-on fixture build (`pnpm e2e:v3`,
// dist-fixture-v3). For each kind of learner without the course (Utah Life, the Agent Plan, Agent Insiders, the Team
// Plan, Team Leader Insiders), `GET /api/skills` answers as the API answers that kind and the fixture's snapshot opens
// no AI Employee, as the server's scoped snapshot is for them. Each kind (with Connor's answers of Nov 25):
//   frame    every first-portal and /learn address of theirs lands inside the v3 frame (`#sh-app`): Home for `/`, their
//            Skill Library for `/skill-library`, which is today's page with what their plan shows today and no logo of
//            its own (one logo, the frame's)
//   nav      Home, Skill library, Team Hub when they have one, Resource vault; no Schedule, Community or Weeks group;
//            the program line is their plan's name or their group's; every link opens a page inside the frame
//   a11y     zero serious or critical axe violations at 1280 and 390, and nothing scrolls sideways at 390
// The $37 buyer (D-241) and the course's learner are checked too: each keeps their own v3 frame.

const NOW = '2026-11-25T11:00:00-07:00';
const seeded = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const course = {
  open: true,
  preview: false,
  prelaunch: true,
  course: courseFor(seeded, Date.parse(NOW), { open: true, preview: true }),
  sessions: courseSessions(seeded),
  copy: Object.fromEntries((seeded.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
};

// A skill's guided setup, as `GET /api/skill-guides/:slug` answers a locked one (the build's own guides, as the buyer's
// spec reads them): the fixture build has no API.
const GUIDES_FILE = fileURLToPath(new URL('../../../apps/web/dist-private/skill-guides.json', import.meta.url));
const guides: SkillGuide[] = existsSync(GUIDES_FILE) ? Object.values((JSON.parse(readFileSync(GUIDES_FILE, 'utf8')) as { guides: Record<string, SkillGuide> }).guides) : [];

/** The fixture's snapshot for a plan that opens no AI Employee: every AI Employee a draft (`visibleModules` empty). */
const noCourse = (() => {
  const db = seed('live');
  return JSON.stringify({ ...db, modules: db.modules.map((m) => ({ ...m, status: 'draft' })) });
})();

/** The skill whose page the specs open: the first guided setup the build wrote. */
const GUIDE = guides[0];
const SKILLS = [
  ...(GUIDE ? [{ id: GUIDE.slug, title: GUIDE.title, summary: 'Its guided setup.', sets: 'both', free: true, releasedAt: 0, state: 'open', files: ['claude', 'chatgpt'] }] : []),
  { id: 'content-strategist', title: 'Content Strategist', summary: 'A month of posts.', sets: 'agent', free: false, releasedAt: 0, state: 'open', files: ['claude', 'chatgpt'] },
  { id: 'commission-tie-out', title: 'Commission Tie-Out', summary: 'Every check matched.', sets: 'owner_ops', free: false, releasedAt: 0, state: 'locked', files: [] },
];
const OUTLINE = courseOutline(seeded) ?? [];
const answer = (over: Record<string, unknown>) => ({ plans: [], teamHub: false, paused: false, courseOpensAt: null, accessGroups: [], lockedLines: {}, planCopy: {}, purchased: [], training: 'hidden', skills: SKILLS, ...over });

interface Kind {
  name: string;
  as: 'agent' | 'owner';
  teamHub: boolean;
  skills: ReturnType<typeof answer>;
  /** The program line under the logo (Q-B3). */
  program: string;
  /** What their Skill Library shows today that the plan decides (D-150, the weekly training row). */
  shows: string[];
  hides?: string[];
}

const KINDS: Kind[] = [
  {
    name: 'Utah Life',
    as: 'agent',
    teamHub: false,
    skills: answer({ accessGroups: [{ id: 'utah-life', name: 'Utah Life', skills: 1, welcome: true, covers: ['agent'] }] }),
    program: 'Utah Life',
    shows: ['Included with your Utah Life team', 'Welcome, Utah Life'],
    hides: ['See Plans', 'Weekly Live Training'],
  },
  { name: 'the Agent Plan', as: 'agent', teamHub: false, skills: answer({ plans: [{ kind: 'agent_plan', status: 'active' }], training: 'open' }), program: PLAN_NAMES.agent_plan, shows: ['Weekly live training is included in your plan.'] },
  { name: 'Agent Insiders', as: 'agent', teamHub: false, skills: answer({ plans: [{ kind: 'insiders_agent', status: 'active' }], training: 'locked' }), program: PLAN_NAMES.insiders_agent, shows: ['Weekly live training is not in this plan.'] },
  { name: 'the Team Plan', as: 'owner', teamHub: true, skills: answer({ plans: [{ kind: 'agents', status: 'active' }], training: 'open', teamHub: true }), program: PLAN_NAMES.agents, shows: ['Weekly live training is included in your plan.'] },
  { name: 'Team Leader Insiders', as: 'owner', teamHub: true, skills: answer({ plans: [{ kind: 'membership', status: 'active' }], teamHub: true }), program: PLAN_NAMES.membership, shows: [], hides: ['Weekly Live Training'] },
];

/** An address in the v3 fixture build, as a persona, with the API's answers for a learner without the course. */
async function visit(browser: Browser, path: string, kind: Kind | null, width = 1280): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'America/Denver', locale: 'en-US' });
  if (kind) await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [DB_KEY, noCourse] as const);
  // A $37 buyer's 403 carries the course's outline (D-241); everyone else's carries none.
  const buyer = !!kind && !(kind.skills.plans as unknown[]).length && !(kind.skills.accessGroups as unknown[]).length && !!(kind.skills.purchased as unknown[]).length;
  await ctx.route('**/api/course', (r) =>
    kind ? r.fulfill({ status: 403, json: { open: false, error: 'The AI Accelerator isn’t in your plan.', ...(buyer ? { outline: OUTLINE } : {}) } }) : r.fulfill({ json: course }),
  );
  await ctx.route('**/api/offer', (r) => r.fulfill({ json: { carts: [] } }));
  if (kind) await ctx.route('**/api/skills', (r) => r.fulfill({ json: kind.skills }));
  await ctx.route('**/api/skills/welcome/dismiss', (r) => r.fulfill({ json: { ok: true } }));
  await ctx.route('**/api/skill-guides/*', (r) => {
    const slug = decodeURIComponent(new URL(r.request().url()).pathname.split('/').pop() ?? '');
    const g = guides.find((x) => x.slug === slug);
    return g
      ? r.fulfill({ json: { slug, skill: g.skill, title: g.title, state: 'locked', opensAt: null, preview: previewOf(g), sample: null, guide: null, ui: null } })
      : r.fulfill({ status: 404, json: { error: 'Not found' } });
  });
  const page = await ctx.newPage();
  const [where, hash = ''] = path.split('#');
  await page.goto(`${APP_BASE}${where}${where!.includes('?') ? '&' : '?'}as=${kind?.as ?? 'owner'}&now=${encodeURIComponent(NOW)}${hash ? `#${hash}` : ''}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  return { page, close: () => ctx.close() };
}

const pathOf = (page: Page): string => new URL(page.url()).pathname;
const sidebar = (page: Page) => page.locator('aside[aria-label="Primary"]');
const navLabels = (page: Page) => sidebar(page).locator('#sh-main .sh-label').allTextContents();

for (const kind of KINDS) {
  test.describe(`${kind.name} in the v3 frame`, () => {
    test('every address of theirs lands inside the v3 frame: Home, or their Skill Library with what their plan shows today and one logo', async ({ browser }) => {
      for (const from of ['/', '/learn', '/learn/schedule', '/sessions', '/learn/week/0']) {
        const { page, close } = await visit(browser, from, kind);
        await expect.poll(() => pathOf(page), from).toBe('/learn');
        await expect(page.locator('#sh-app'), from).toHaveCount(1);
        await expect(sidebar(page).locator('.sh-link[data-nav="home"]'), from).toHaveAttribute('aria-current', 'page');
        await close();
      }
      const { page, close } = await visit(browser, '/skill-library', kind);
      await expect.poll(() => pathOf(page)).toBe('/learn/skills');
      await expect(page.locator('#sh-app')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1, name: 'Skill Library' })).toBeVisible();
      for (const words of kind.shows) await expect(page.getByText(words, { exact: true }), words).toBeVisible();
      for (const words of kind.hides ?? []) await expect(page.getByText(words, { exact: true }), words).toHaveCount(0);
      // Q-B2: one logo (the frame's), and one main landmark.
      await expect(page.locator('[data-brand-slot]')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      await close();
    });

    test('the sidebar: Home, their pages, their plan’s name; no Schedule, Community or Weeks group, and no dead link', async ({ browser }) => {
      const { page, close } = await visit(browser, '/learn/skills', kind);
      expect(await navLabels(page)).toEqual(kind.teamHub ? ['Home', 'Skill library', 'Team Hub', 'Resource vault'] : ['Home', 'Skill library', 'Resource vault']);
      await expect(sidebar(page).locator('#sh-group')).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Weeks' })).toHaveCount(0);
      await expect(page.locator('#sh-next')).toBeHidden();
      await expect(sidebar(page).locator('.sh-logo')).toHaveAttribute('href', '/learn');
      await expect(sidebar(page).locator('.sh-cohort')).toHaveText(kind.program);
      // Each row opens its page inside the frame.
      const pages: [string, string, string][] = [
        ['vault', '/learn/vault', 'Resource & Compliance Vault'],
        ...(kind.teamHub ? ([['team', '/learn/team', 'Team Hub']] as [string, string, string][]) : []),
        ['library', '/learn/skills', 'Skill Library'],
        ['home', '/learn', ''],
      ];
      for (const [id, to, heading] of pages) {
        await sidebar(page).locator(`.sh-link[data-nav="${id}"]`).click();
        await expect.poll(() => pathOf(page), id).toBe(to);
        if (heading) await expect(page.getByRole('heading', { level: 1, name: heading }), id).toBeVisible();
        else await expect(page.getByRole('heading', { level: 1 }), id).toBeVisible();
        await expect(page.locator('#sh-app'), id).toHaveCount(1);
      }
      // The account menu: Account opens inside the frame.
      await page.locator('.sh-acct').click();
      await page.getByRole('menuitem', { name: 'Account' }).click();
      await expect.poll(() => pathOf(page)).toBe('/learn/account');
      await expect(page.locator('#sh-app')).toHaveCount(1);
      await close();
    });

    test('a skill opens inside the frame; the Team Hub’s address without a Team Hub goes Home, with no Team Plan window', async ({ browser }) => {
      const slug = GUIDE?.slug ?? 'ai-brain-setup';
      const skill = await visit(browser, `/skill-library/${slug}`, kind);
      await expect.poll(() => pathOf(skill.page)).toBe(`/learn/skills/${slug}`);
      await expect(skill.page.locator('#sh-app')).toHaveCount(1);
      await expect(skill.page.getByRole('heading', { level: 1 })).toBeVisible();
      await skill.close();
      const team = await visit(browser, '/team', kind);
      await expect.poll(() => pathOf(team.page)).toBe(kind.teamHub ? '/learn/team' : '/learn');
      await expect(team.page.getByRole('dialog')).toHaveCount(0);
      await team.close();
    });

    test('zero serious or critical axe violations at 1280 and 390, and nothing scrolls sideways at 390', async ({ browser }) => {
      for (const width of [1280, 390]) {
        for (const at of ['/learn', '/learn/skills', '/learn/vault']) {
          const { page, close } = await visit(browser, at, kind, width);
          await expect(page.locator('#sh-app')).toHaveCount(1);
          await expectAccessible(page);
          if (width === 390) expect(await page.evaluate(() => document.documentElement.scrollWidth), `${at} at 390`).toBeLessThanOrEqual(390);
          await close();
        }
      }
    });
  });
}

// The $37 skill buyer (D-241): their own LMS in the v3 frame, flags or not, unchanged by D-257.
const BUYER: Kind = {
  name: 'the $37 skill buyer',
  as: 'agent',
  teamHub: false,
  skills: answer({ purchased: GUIDE ? [GUIDE.slug] : [], training: 'locked' }),
  program: 'Amplified Skill',
  shows: [],
};

test.describe('the $37 skill buyer in the v3 frame (D-241)', () => {
  test('every address lands in the buyer’s LMS: Home, Skill library, Office hours and Weekly training locked, the Accelerator’s weeks locked', async ({ browser }) => {
    for (const from of ['/', '/learn', '/skill-library']) {
      const { page, close } = await visit(browser, from, BUYER);
      await expect.poll(() => pathOf(page), from).toMatch(/^\/learn(\/skills)?$/);
      await expect(page.locator('#sh-app'), from).toHaveCount(1);
      await close();
    }
    const { page, close } = await visit(browser, '/learn', BUYER);
    expect(await navLabels(page)).toEqual(['Home', 'Skill library', 'Office hours', 'Weekly training']);
    await expect(sidebar(page).locator('.sh-cohort')).toContainText('Amplified Skill');
    await expect(sidebar(page).locator('#sh-group')).toHaveCount(OUTLINE.length ? 1 : 0);
    await expect(sidebar(page).locator('#sh-weeks .sh-week[data-locked]')).toHaveCount(OUTLINE.length);
    await close();
  });

  test('zero serious or critical axe violations at 1280 and 390, and nothing scrolls sideways at 390', async ({ browser }) => {
    for (const width of [1280, 390]) {
      for (const at of ['/learn', '/learn/skills']) {
        const { page, close } = await visit(browser, at, BUYER, width);
        await expect(page.locator('#sh-app')).toHaveCount(1);
        await expectAccessible(page);
        if (width === 390) expect(await page.evaluate(() => document.documentElement.scrollWidth), `${at} at 390`).toBeLessThanOrEqual(390);
        await close();
      }
    }
  });
});

test.describe('the course’s learner in the v3 frame, unchanged', () => {
  test('Home first, the Schedule, Community and the weeks under Weeks', async ({ browser }) => {
    const { page, close } = await visit(browser, '/learn', null);
    await expect(page.locator('#sh-app')).toHaveCount(1);
    expect((await navLabels(page))[0]).toBe('Home');
    expect(await navLabels(page)).toEqual(expect.arrayContaining(['Schedule', 'Community', 'Skill library', 'Resource vault']));
    await expect(sidebar(page).locator('#sh-group')).toHaveCount(1);
    await expect(sidebar(page).locator('.sh-logo')).toHaveAttribute('href', '/learn');
    await close();
  });
});
