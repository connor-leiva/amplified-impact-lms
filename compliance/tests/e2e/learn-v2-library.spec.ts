import { test, expect, type Browser, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// The catalog and the deployed seed, as the API answers from them. `compliance/` can't resolve
// `@ai/core`, so these are relative.
import { FREE_SKILLS, LAUNCH_RELEASE, SKILL_CATALOG } from '../../../packages/core/src/skills';
import { GROK_TEMPLATES } from '../../../packages/core/src/grok-templates';
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

/**
 * D-179: the learner portal v2's Skill Library (/learn/skills) and a skill's page (/learn/skills/:slug),
 * in the fixture build (where the flag is on). `GET /api/skills` is answered from the catalog the way
 * the API answers a buyer before the first live build (the free skills open, every other one opening
 * Dec 2), or a Utah Life member (the agent skills open, the rest locked with the seed's
 * `locked.utah_life` line). `GET /api/skill-guides/:slug` is answered from the build's own guides file
 * (`apps/web/dist-private/skill-guides.json`, written by the same fixture build): the setup only for an
 * open skill, otherwise its steps' titles and its sample.
 *
 *   a11y      zero serious or critical axe violations on the library, an open skill's setup and a
 *             locked skill's preview, at 1440 and 390, and with the phone's chips scrolled.
 *   overflow  nothing scrolls sideways at 390, 768, 1024 and 1440 (the chips scroll inside their row).
 *   behavior  one h1; the nav's Skill library is the current page; chips filter; the phone shows three
 *             per group and "Show all"; a locked preview labels its sample made up; the setup's tabs.
 */

const NOW = '2026-11-18T14:00:00-07:00';
const at = Date.parse(NOW);
const OPENS = Date.parse('2026-12-02T12:00:00-07:00');
const db = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const course = {
  open: true,
  preview: false,
  prelaunch: true,
  course: courseFor(db, at, { open: true, preview: true }),
  sessions: courseSessions(db),
  copy: Object.fromEntries((db.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
};
const UTAH_LINE = (db.copy ?? []).find((c) => c.key === 'locked.utah_life')!.value;

const GUIDES_FILE = fileURLToPath(new URL('../../../apps/web/dist-private/skill-guides.json', import.meta.url));
type Guides = { ui: unknown; guides: Record<string, { slug: string; skill: string; title: string; lanes: { id: string; label: string; steps: { title: string }[] }[]; sample?: unknown }> };
const guides: Guides | null = existsSync(GUIDES_FILE) ? (JSON.parse(readFileSync(GUIDES_FILE, 'utf8')) as Guides) : null;

type Persona = 'buyer' | 'utah';
const catalog = [
  ...SKILL_CATALOG.map((s) => ({ id: s.id, title: s.title, summary: s.summary, sets: s.sets, page: s.page ?? s.id, files: Object.keys(s.files) })),
  ...GROK_TEMPLATES.map((g) => ({ id: g.id, title: g.title, summary: g.summary, sets: g.sets, page: g.id, files: ['grok'] })),
].sort((a, b) => a.title.localeCompare(b.title));

function stateOf(persona: Persona, s: (typeof catalog)[number]): { state: 'open' | 'locked' | 'upcoming'; opensAt: number | null } {
  const free = FREE_SKILLS.includes(s.id);
  if (persona === 'buyer') return free ? { state: 'open', opensAt: null } : { state: 'upcoming', opensAt: OPENS };
  return free || s.sets !== 'owner_ops' ? { state: 'open', opensAt: null } : { state: 'locked', opensAt: null };
}

function skillsAnswer(persona: Persona) {
  return {
    plans: [],
    accessGroups: persona === 'utah' ? [{ id: 'utah-life', name: 'Utah Life', skills: 30, welcome: false, covers: ['agent', 'both'] }] : [],
    lockedLines: persona === 'utah' ? { 'utah-life': UTAH_LINE } : {},
    paused: false,
    courseOpensAt: persona === 'buyer' ? OPENS : null,
    teamHub: false,
    skills: catalog.map((s) => ({ id: s.id, title: s.title, summary: s.summary, sets: s.sets, free: FREE_SKILLS.includes(s.id), releasedAt: LAUNCH_RELEASE, ...stateOf(persona, s), files: s.files })),
  };
}

function guideAnswer(persona: Persona, slug: string) {
  const g = guides?.guides[slug];
  const s = catalog.find((x) => x.page === slug);
  if (!g || !s) return null;
  const { state, opensAt } = stateOf(persona, s);
  const open = state === 'open';
  return {
    slug,
    skill: g.skill,
    title: g.title,
    sets: s.sets,
    free: FREE_SKILLS.includes(s.id),
    state,
    opensAt,
    accessGroups: [],
    paidPlans: false,
    preview: { lanes: g.lanes.map((l) => ({ id: l.id, label: l.label, steps: l.steps.map((x) => x.title) })) },
    sample: g.sample ?? null,
    guide: open ? g : null,
    ui: open ? guides!.ui : null,
  };
}

async function open(browser: Browser, path: string, width: number, persona: Persona = 'buyer'): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'America/Denver' });
  const page = await ctx.newPage();
  await page.route('**/api/course', (r) => (persona === 'buyer' ? r.fulfill({ json: course }) : r.fulfill({ status: 403, json: { open: false, error: 'Not in your plan.' } })));
  await page.route('**/api/skills', (r) => r.fulfill({ json: skillsAnswer(persona) }));
  await page.route('**/api/skill-guides/*', (r) => {
    const slug = decodeURIComponent(new URL(r.request().url()).pathname.split('/').pop() ?? '');
    const body = guideAnswer(persona, slug);
    return body ? r.fulfill({ json: body }) : r.fulfill({ status: 404, json: { error: 'Not found' } });
  });
  await page.goto(`${APP_BASE}${path}?as=agent&now=${encodeURIComponent(NOW)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  await page.locator('h1').first().waitFor();
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
  return page;
}

const PAGES = ['/learn/skills', '/learn/skills/ai-brain-setup', '/learn/skills/tc-file-audit'] as const;

test.describe('learner portal v2: the Skill Library (D-179) @g9', () => {
  test.skip(!guides, 'needs the fixture build’s apps/web/dist-private/skill-guides.json');

  for (const width of [1440, 390])
    for (const path of PAGES)
      test(`${path} at ${width}: accessible, one h1, no sideways scroll`, async ({ browser }) => {
        const page = await open(browser, path, width);
        await expect(page.locator('h1')).toHaveCount(1);
        await expectAccessible(page);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(over).toBe(0);
        await page.context().close();
      });

  for (const width of [768, 1024])
    test(`no sideways scroll at ${width}`, async ({ browser }) => {
      for (const path of PAGES) {
        const page = await open(browser, path, width);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBe(0);
        await page.context().close();
      }
    });

  test('the library: Start here, one lock line per group, chips that filter, the nav’s current page', async ({ browser }) => {
    const page = await open(browser, '/learn/skills', 1440);
    await expect(page.locator('aside[aria-label="Primary"]').getByRole('link', { name: 'Skill library' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 2, name: 'Start here' })).toBeVisible();
    // Every group opens on the same day, so each says it once, in its head.
    const groups = page.locator('section[aria-labelledby^="lv-g-"]');
    expect(await groups.count()).toBeGreaterThan(1);
    for (const g of await groups.all()) await expect(g.getByText(/^Opens Wed, Dec 2$/)).toHaveCount(1);
    const chips = page.getByRole('toolbar', { name: 'Filter by topic' });
    await chips.getByRole('button', { name: /^Bookkeeping/ }).click();
    await expect(groups).toHaveCount(1);
    await chips.getByRole('button', { name: /^All/ }).click();
    expect(await groups.count()).toBeGreaterThan(1);
    await page.context().close();
  });

  test('the phone: chips scroll in their row, three skills a group, then Show all', async ({ browser }) => {
    const page = await open(browser, '/learn/skills', 390);
    const row = page.getByRole('toolbar', { name: 'Filter by topic' });
    expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await row.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    const first = page.locator('section[aria-labelledby^="lv-g-"]').first();
    await expect(first.locator('a:visible')).toHaveCount(3);
    await first.getByRole('button', { name: /^Show all \d+$/ }).click();
    expect(await first.locator('a:visible').count()).toBeGreaterThan(3);
    await page.context().close();
  });

  test('a locked skill’s preview: when it opens, its sample labelled made up, and nothing of its setup', async ({ browser }) => {
    const page = await open(browser, '/learn/skills/tc-file-audit', 1440);
    await expect(page.getByRole('heading', { level: 1, name: 'TC File Audit' })).toBeVisible();
    await expect(page.getByText(/^Opens Wed, Dec 2 at /)).toBeVisible();
    const sample = page.getByRole('region', { name: 'A sample of what it builds' });
    await expect(sample.getByText('Made-up data')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'When it opens' })).toBeVisible();
    await expect(page.getByText('Downloads for Claude and ChatGPT')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark step done' })).toHaveCount(0);
    await page.context().close();
  });

  test('a Utah Life member: locked skills read the seed’s copy string, with no upsell', async ({ browser }) => {
    const page = await open(browser, '/learn/skills', 1440, 'utah');
    await expect(page.getByText(UTAH_LINE, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'See Plans' })).toHaveCount(0);
    await expectAccessible(page);
    await page.context().close();
    const preview = await open(browser, '/learn/skills/tc-file-audit', 1440, 'utah');
    await expect(preview.getByText(UTAH_LINE, { exact: false })).toBeVisible();
    await expect(preview.getByRole('link', { name: 'See Plans' })).toHaveCount(0);
    await preview.context().close();
  });

  test('an open skill’s setup runs in the step player: its steps, its app tabs, Next', async ({ browser }) => {
    const page = await open(browser, '/learn/skills/ai-brain-setup', 1440);
    const lanes = guides!.guides['ai-brain-setup']!.lanes;
    await expect(page.getByRole('heading', { level: 1, name: lanes[0]!.steps[0]!.title })).toBeVisible();
    await page.getByRole('button', { name: 'Next step' }).click();
    await expect(page.getByRole('heading', { level: 1, name: lanes[0]!.steps[1]!.title })).toBeVisible();
    if (lanes.length > 1) {
      await page.getByRole('radio', { name: lanes[1]!.label }).click();
      await expect(page.getByRole('heading', { level: 1, name: lanes[1]!.steps[0]!.title })).toBeVisible();
    }
    await page.context().close();
  });
});
