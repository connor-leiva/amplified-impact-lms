import { test, expect, type Browser, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APP_BASE } from '../../lib/prepare';
// `compliance/` can't resolve `@ai/core`, so these are relative.
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { DB_KEY } from '../../../packages/core/src/constants';
import { seed } from '../../../packages/core/src/seed';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';
import { previewOf } from '../../../packages/core/src/skill-guides';
import { courseOutline } from '../../../packages/core/src/course';
import type { SkillGuide } from '../../../packages/core/src/skill-guides';

// D-260 (Connor, Nov 25, Q-C3): "force today's pages light inside the v3 frame for learners with Dark theme until the
// dark-mode pass". In the both-flags-on fixture build (`pnpm e2e:v3`), a learner whose Theme is Dark sees the v3 frame
// and every page inside it light: the root's `data-theme`, each `data-lv-theme` wrapper, and the page's own background.
// The step page, which has no frame (D-210), keeps the person's theme, and so does their choice, for the dark pass.

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


/** An address in the v3 fixture build, as a persona, with the API's answers for a learner without the course. */
async function visit(browser: Browser, path: string, kind: Kind | null, width = 1280, zone = 'America/Denver'): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: zone, locale: 'en-US' });
  if (kind) await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [DB_KEY, noCourse] as const);
  // The device's theme is Dark, so every learner on it starts Dark (`learnerTheme`, D-185).
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), ['ai-lms-prefs', JSON.stringify({ theme: 'dark' })] as const);
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




const BUYER: Kind = { name: 'the $37 skill buyer', as: 'agent', teamHub: false, skills: answer({ purchased: GUIDE ? [GUIDE.slug] : [], training: 'locked' }), program: 'Amplified Skill', shows: [] };

/** How light the page is where it shows (0 black, 1 white): the first painted background under a point in the page. */
async function lightness(page: Page, x = 900, y = 600): Promise<number> {
  return page.evaluate(([px, py]) => {
    let e: Element | null = document.elementFromPoint(px!, py!);
    let c = 'rgba(0, 0, 0, 0)';
    while (e && /^(rgba\(0, 0, 0, 0\)|transparent)$/.test(c)) {
      c = getComputedStyle(e).backgroundColor;
      e = e.parentElement;
    }
    const ok = /oklch\(([\d.]+)(%?)/.exec(c);
    if (ok) return ok[2] ? Number(ok[1]) / 100 : Number(ok[1]);
    const [r, g, b] = (c.match(/[\d.]+/g) ?? ['255', '255', '255']).map(Number);
    return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255;
  }, [x, y]);
}

const themes = (page: Page) =>
  page.evaluate(() => ({ root: document.documentElement.dataset.theme, frames: [...document.querySelectorAll('[data-lv-theme]')].map((e) => e.getAttribute('data-lv-theme')) }));

test.describe('a learner whose Theme is Dark, inside the v3 frame (D-260)', () => {
  test('today’s pages inside the frame draw light: the root, every wrapper and the page itself', async ({ browser }) => {
    for (const at of ['/learn', '/learn/vault', '/learn/skills', '/learn/account']) {
      const { page, close } = await visit(browser, at, null);
      await expect(page.locator('#sh-app'), at).toHaveCount(1);
      const t = await themes(page);
      expect(t.root, at).toBe('light');
      expect(t.frames.every((f) => f === 'light'), `${at}: ${t.frames.join(',')}`).toBe(true);
      expect(await lightness(page), at).toBeGreaterThan(0.8);
      await close();
    }
  });

  test('the account menu draws light, and the person’s Dark choice is kept', async ({ browser }) => {
    const { page, close } = await visit(browser, '/learn', null);
    await page.locator('.sh-acct').click();
    await expect(page.getByRole('menuitem', { name: 'Account' })).toBeVisible();
    const t = await themes(page);
    expect(t.frames.every((f) => f === 'light'), t.frames.join(',')).toBe(true);
    expect(await page.getByRole('menuitemradio', { name: 'Dark' }).getAttribute('aria-checked')).toBe('true');
    await close();
  });

  test('the step page, which has no frame (D-210), keeps the person’s Dark', async ({ browser }) => {
    const { page, close } = await visit(browser, '/learn/week/0/step/1', null);
    await expect(page.locator('[data-step-page]').first()).toBeVisible();
    expect((await themes(page)).root).toBe('dark');
    await close();
  });

  test('the $37 buyer’s LMS is the v3 frame too: its Account page draws light', async ({ browser }) => {
    const { page, close } = await visit(browser, '/learn/account', BUYER);
    await expect(page.locator('#sh-app')).toHaveCount(1);
    const t = await themes(page);
    expect(t.root).toBe('light');
    expect(t.frames.every((f) => f === 'light'), t.frames.join(',')).toBe(true);
    expect(await lightness(page)).toBeGreaterThan(0.8);
    await close();
  });
});
