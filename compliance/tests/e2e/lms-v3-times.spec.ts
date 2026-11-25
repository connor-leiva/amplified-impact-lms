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

// D-259: the learner portal's times with LMS v3 on, in the both-flags-on fixture build (`pnpm e2e:v3`). Connor, Nov 25:
// "Times everywhere in the learner portal use one line: '12:00 PM MT / 1:00 PM CT'." For a viewer in Eastern, Pacific
// or Hawaii time, every time Home, the Schedule, a locked week, the Community and a step print reads Mountain then
// Central on one line: no viewer zone, no Central time in parentheses. The $37 buyer's office hours too. Words staff
// type are theirs (a cohort's cadence, the Schedule's lede), so the lede is left out of the check.

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
async function visit(browser: Browser, path: string, kind: Kind | null, width = 1280, zone = 'America/New_York'): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: zone, locale: 'en-US' });
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



/** One instant on one line: "12:00 PM MT / 1:00 PM CT", Central's day with it when it differs. */
const ONE_LINE = /\d{1,2}:\d{2}\s[AP]M MT \/ (?:[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, )?\d{1,2}:\d{2}\s[AP]M CT/gi;
const A_TIME = /\d{1,2}:\d{2}\s[AP]M(?:\s[A-Z]{2,3})?/gi;

/** The page's words, with the Schedule's lede (the cohort's cadence, as staff typed it) left out. */
async function wordsOf(page: Page): Promise<string> {
  // Read in place (a detached copy's innerText has no line breaks); the page is closed right after.
  return page.evaluate(() => {
    document.querySelectorAll('.wk-h1 + .wk-purpose').forEach((el) => el.remove());
    return document.body.innerText;
  });
}

/** Every time on the page that isn't the one line. */
const strays = (text: string): string[] => text.replace(ONE_LINE, '').match(A_TIME) ?? [];

const BUYER: Kind = { name: 'the $37 skill buyer', as: 'agent', teamHub: false, skills: answer({ purchased: GUIDE ? [GUIDE.slug] : [], training: 'locked' }), program: 'Amplified Skill', shows: [] };

test.describe('the learner portal’s times with LMS v3 on (D-259)', () => {
  for (const zone of ['America/New_York', 'America/Los_Angeles', 'Pacific/Honolulu']) {
    test(`every time reads "12:00 PM MT / 1:00 PM CT" for a viewer in ${zone}`, async ({ browser }) => {
      for (const at of ['/learn', '/learn/schedule', '/learn/week/1', '/learn/community', '/learn/week/0/step/1']) {
        const { page, close } = await visit(browser, at, null, 1280, zone);
        // The v3 frame, or the step page's own (D-210).
        await expect(page.locator('#sh-app, [data-step-page]').first(), at).toBeVisible();
        const words = await wordsOf(page);
        expect(words.match(ONE_LINE)?.length ?? 0, `${at}: a time on the one line`).toBeGreaterThan(0);
        expect(strays(words), `${at}: every time on the one line`).toEqual([]);
        await close();
      }
    });
  }

  test('the next live build, word for word, on the Schedule and the locked week', async ({ browser }) => {
    const sched = await visit(browser, '/learn/schedule', null);
    await expect(sched.page.locator('main').getByText('Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT').first()).toBeVisible();
    await sched.close();
    const week = await visit(browser, '/learn/week/1', null);
    await expect(week.page.locator('main').getByText(/Opens Sun, Nov 29 · 12:00 PM MT \/ 1:00 PM CT/i).first()).toBeVisible();
    await week.close();
  });

  test('the $37 buyer’s office hours: Thursdays at 12:00 PM MT / 1:00 PM CT', async ({ browser }) => {
    for (const at of ['/learn', '/learn/office-hours']) {
      const { page, close } = await visit(browser, at, BUYER);
      await expect(page.locator('#sh-app'), at).toHaveCount(1);
      const words = await wordsOf(page);
      expect(words, at).toContain('Thursdays at 12:00 PM MT / 1:00 PM CT');
      // The tile sets the clock large and the rest small: "12:00" then "PM MT / 1:00 PM CT".
      expect(strays(words.replace(/12:00\s*PM MT \/ 1:00 PM CT/g, '')), at).toEqual([]);
      await close();
    }
  });

  test('nothing scrolls sideways at 390 with the longer line', async ({ browser }) => {
    for (const [at, kind] of [['/learn', null], ['/learn/schedule', null], ['/learn/week/1', null], ['/learn/office-hours', BUYER]] as [string, Kind | null][]) {
      const { page, close } = await visit(browser, at, kind, 390);
      await expect(page.locator('#sh-app'), at).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${at} at 390`).toBeLessThanOrEqual(390);
      await close();
    }
  });
});
