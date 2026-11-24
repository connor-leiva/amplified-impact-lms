import { test, expect, type Browser, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// `compliance/` can't resolve `@ai/core`, so these are relative.
import { FREE_SKILLS, LAUNCH_RELEASE, SKILL_CATALOG } from '../../../packages/core/src/skills';
import { GROK_TEMPLATES } from '../../../packages/core/src/grok-templates';
import { previewOf } from '../../../packages/core/src/skill-guides';
import type { SkillGuide } from '../../../packages/core/src/skill-guides';

/**
 * D-241: the $37 skill buyer inside the LMS, in the fixture build (VITE_LEARNER_V2 off, as production builds by default:
 * the buyer's pages show whatever that flag says). `GET /api/skills` answers from the catalog the way the API answers
 * a buyer with no plan and no access group (the skill they bought and the free ones open, `purchased` naming theirs),
 * or a Utah Life member, or an Agent Insiders member who also bought one. `GET /api/offer` names each cart's Payment
 * Link; `GET /api/skill-guides/:slug` answers a locked skill with its steps' titles.
 *
 *   landing   a buyer who opens /skill-library is in the LMS (/learn), their skill first; nobody else is
 *   pages     the sidebar reaches the Skill Library, a locked skill, Office Hours, Weekly Live Training and the
 *             AI Accelerator; every upgrade is its cart's Payment Link; "Get This Skill, $37" starts checkout
 *   a11y      zero serious or critical axe violations on every page at 1280 and 390; nothing scrolls sideways at 390
 */

const GUIDES_FILE = fileURLToPath(new URL('../../../apps/web/dist-private/skill-guides.json', import.meta.url));
const guides: SkillGuide[] = existsSync(GUIDES_FILE) ? Object.values((JSON.parse(readFileSync(GUIDES_FILE, 'utf8')) as { guides: Record<string, SkillGuide> }).guides) : [];
const LINKS: Record<string, string> = {
  'insiders-monthly': 'https://buy.stripe.com/test-leader',
  'insiders-agent-monthly': 'https://buy.stripe.com/test-agent',
  'agent-monthly': 'https://buy.stripe.com/test-agent-plan',
};

/** The catalog as `GET /api/skills` answers: the bought ones (the latest first) and the free ones open, the rest locked. */
function skillsAnswer(bought: readonly string[], over: Record<string, unknown> = {}) {
  const skills = [
    ...SKILL_CATALOG.map((s) => ({ id: s.id, title: s.title, summary: s.summary, sets: s.sets, files: Object.keys(s.files) })),
    ...GROK_TEMPLATES.map((g) => ({ id: g.id, title: g.title, summary: g.summary, sets: g.sets, files: ['grok'] })),
  ]
    .map((s) => {
      const free = FREE_SKILLS.includes(s.id);
      return { ...s, free, releasedAt: LAUNCH_RELEASE, state: free || bought.includes(s.id) ? 'open' : 'locked', opensAt: null };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
  return { skills, plans: [], accessGroups: [], lockedLines: {}, planCopy: {}, paused: false, courseOpensAt: null, teamHub: false, training: 'locked', purchased: [...bought], ...over };
}

async function world(browser: Browser, width: number, skills: unknown): Promise<{ page: Page; checkouts: string[] }> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'America/Denver', locale: 'en-US' });
  const checkouts: string[] = [];
  await ctx.route('**/api/skills', (route) => route.fulfill({ json: skills }));
  await ctx.route('**/api/offer', (route) => route.fulfill({ json: { carts: Object.entries(LINKS).map(([id, paymentLink]) => ({ id, paymentLink })) } }));
  await ctx.route('**/api/skill-guides/*', (route) => {
    const slug = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '');
    const g = guides.find((x) => x.slug === slug);
    return g
      ? route.fulfill({ json: { slug, skill: g.skill, title: g.title, state: 'locked', opensAt: null, preview: previewOf(g), sample: null, guide: null, ui: null } })
      : route.fulfill({ status: 404, json: { error: 'Not found' } });
  });
  await ctx.route('**/api/skills/*/checkout', (route) => {
    checkouts.push(new URL(route.request().url()).pathname);
    return route.fulfill({ json: { url: `${APP_BASE}/learn?paid=1` } });
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-24T14:00:00-07:00'));
  return { page, checkouts };
}

async function open(page: Page, path: string): Promise<void> {
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=agent`);
  await page.waitForSelector('body[data-app-ready="true"]');
}

const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('the $37 skill buyer inside the LMS (D-241)', () => {
  test('a buyer who opens the Skill Library is in the LMS, the skill they bought first, in the members’ shell', async ({ browser }) => {
    const { page } = await world(browser, 1280, skillsAnswer(['team-pnl-review']));
    await open(page, '/skill-library');
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.locator('main .wk-hero-t').first()).toHaveText('Team P&L Review');
    // The shell's landmarks (CLAUDE.md), and the buyer's rows: their skill on two lines, the plans they don't hold locked.
    await expect(page.locator('aside[aria-label="Primary"]')).toBeVisible();
    await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toHaveCount(1);
    await expect(page.locator('[data-brand-slot]')).toHaveCount(1);
    await expect(page.locator('.sh-cohort')).toHaveText(/Amplified Skill\s*1 skill bought/);
    await expect(page.locator('#sh-main .sh-link[data-locked]')).toHaveText(['Office hoursLocked', 'Weekly trainingLocked']);
    await expect(page.locator('#sh-weeks .sh-week[data-locked]')).toHaveCount(9);
    // One upgrade, the Insiders of the skill's set, as its cart's Payment Link.
    await expect(page.getByRole('link', { name: 'Upgrade to Amplified Insiders' })).toHaveAttribute('href', LINKS['insiders-monthly']!);
    // Claude and ChatGPT are the same button.
    const claude = page.getByRole('link', { name: 'Download for Claude' });
    const chatgpt = page.getByRole('link', { name: 'Download for ChatGPT' });
    expect(await claude.getAttribute('class')).toBe(await chatgpt.getAttribute('class'));
    await expect(claude).toHaveAttribute('href', '/api/skills/team-pnl-review/download/claude');
  });

  test('the sidebar reaches every locked area, each with the plan that opens it', async ({ browser }) => {
    const { page, checkouts } = await world(browser, 1280, skillsAnswer(['team-pnl-review']));
    await open(page, '/learn');
    await page.locator('#sh-main').getByRole('link', { name: 'Skill library' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Skill Library');
    await expect(page.getByRole('heading', { name: 'Your Skill' })).toBeVisible();
    await page.getByRole('link', { name: /Database Health Check/ }).first().click();
    await expect(page).toHaveURL(/\/learn\/skills\/database-health-check$/);
    await expect(page.getByRole('link', { name: 'Upgrade to Amplified Insiders, $169/Month' })).toHaveAttribute('href', LINKS['insiders-monthly']!);
    await expect(page.getByRole('radio', { name: /Claude/ })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'Get This Skill, $37' }).click();
    await expect(page).toHaveURL(/\/learn\?paid=1$/);
    expect(checkouts).toEqual(['/api/skills/database-health-check/checkout']);

    await page.locator('#sh-main').getByRole('link', { name: /Weekly training/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weekly Live Training');
    await expect(page.getByRole('link', { name: 'Upgrade to the Agent Plan, $117/Month' })).toHaveAttribute('href', LINKS['agent-monthly']!);
    await page.locator('#sh-main').getByRole('link', { name: /Office hours/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Office Hours');
    await page.locator('#sh-weeks').getByRole('link').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('AI Accelerator');
    await expect(page.getByText('Every hire reads and drafts. Nothing is sent without you.')).toBeVisible();
  });

  test('an agent skill’s buyer is offered Agent Insiders, $79/Month', async ({ browser }) => {
    const { page } = await world(browser, 1280, skillsAnswer(['appointment-follow-up']));
    await open(page, '/learn');
    await expect(page.getByRole('link', { name: 'Upgrade to Agent Insiders' })).toHaveAttribute('href', LINKS['insiders-agent-monthly']!);
  });

  for (const width of [1280, 390]) {
    test(`every page is accessible and nothing scrolls sideways at ${width}`, async ({ browser }) => {
      test.skip(guides.length === 0, 'the fixture build writes the guides file');
      const { page } = await world(browser, width, skillsAnswer(['team-pnl-review']));
      for (const path of ['/learn', '/learn/skills', '/learn/skills/database-health-check', '/learn/training', '/learn/office-hours', '/learn/week/0']) {
        await open(page, path);
        await page.locator('main .wk-page').first().waitFor();
        await expectAccessible(page);
        expect(await sideways(page), path).toBeLessThanOrEqual(0);
      }
    });
  }

  test('a Utah Life member, a plan’s member and a learner who bought nothing keep the Skill Library as it was', async ({ browser }) => {
    const cases = [
      skillsAnswer(['team-pnl-review'], { accessGroups: [{ id: 'utah-life', name: 'Utah Life', covers: ['agent', 'both'] }], training: 'hidden' }),
      skillsAnswer(['team-pnl-review'], { plans: [{ kind: 'insiders_agent', status: 'active', paidThrough: null }] }),
      skillsAnswer([]),
    ];
    for (const answer of cases) {
      const { page } = await world(browser, 1280, answer);
      await open(page, '/skill-library');
      await expect(page.getByRole('heading', { level: 1, name: 'Skill Library' })).toBeVisible();
      await expect(page).toHaveURL(/\/skill-library/);
      await expect(page.locator('[data-buyer]')).toHaveCount(0);
      await page.context().close();
    }
  });

  test('anyone but a buyer who opens /learn goes where they went before', async ({ browser }) => {
    const { page } = await world(browser, 1280, skillsAnswer([]));
    await open(page, '/learn');
    await expect(page).not.toHaveURL(/\/learn/);
    await expect(page.locator('[data-buyer]')).toHaveCount(0);
  });
});
