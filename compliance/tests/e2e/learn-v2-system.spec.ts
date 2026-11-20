import { test, expect, type Browser, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APP_BASE } from '../../lib/prepare';
// The course and the catalog as the API sends them, built from the deployed seed. `compliance/` can't
// resolve `@ai/core`, so these are relative; the seed's own imports are relative too.
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { COHORT_ONE_LIVE_UNTIL } from '../../../packages/core/src/offer';
import { FREE_SKILLS, LAUNCH_RELEASE, SKILL_CATALOG } from '../../../packages/core/src/skills';
import { GROK_TEMPLATES } from '../../../packages/core/src/grok-templates';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

/**
 * D-181: the phone pass of the learner portal v2 (/learn), in the fixture build (where its flag is
 * on). Every /learn screen at 390, against the 390 artboards in `docs/design/learner-v2/`: Home before
 * launch and at a live build, a week, a step, a locked week, the Schedule's two views, the Skill
 * Library, an open skill's setup, a locked skill and Account. The reads are answered as the other
 * learn-v2 specs answer them (the deployed seed's course, the catalog for a buyer before the first live
 * build, an AI Accelerator owner's plan).
 *
 *   overflow  nothing scrolls sideways, at 390, 768 and 1024 (a row that scrolls inside itself, the
 *             library's chips, may).
 *   tap       at 390, every visible button, link and field is at least 44px in its smaller dimension.
 *             A link inside running text is exempt (WCAG 2.5.8's inline exception); a visually hidden
 *             one (the bar's breadcrumb, which the mockup does not draw) is not a target.
 *   type      at 390, no visible text under 16px (the repo's phone floor, D-156 and D-160).
 *   a11y      zero serious or critical axe violations, and exactly one h1.
 *   drawer    the phone menu (artboard 03) is a modal dialog: data-drawer="open", focus on Close, Tab
 *             and Shift+Tab stay inside it, the page behind it is inert, Escape and the scrim close it,
 *             and focus goes back to the menu button. With reduced motion it does not slide.
 */

const PRE = '2026-11-18T14:00:00-07:00';
const LIVE = '2026-12-09T12:05:00-07:00';
const OPENS = Date.parse('2026-12-02T12:00:00-07:00');
const db = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const copy = Object.fromEntries((db.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value]));
const coursePre = { open: true, preview: false, prelaunch: true, course: courseFor(db, Date.parse(PRE), { open: true, preview: true }), sessions: courseSessions(db), copy };
const courseLive = { open: true, preview: false, prelaunch: false, course: courseFor(db, Date.parse(LIVE), { open: true, preview: false }), sessions: courseSessions(db), copy };

const catalog = [
  ...SKILL_CATALOG.map((s) => ({ id: s.id, title: s.title, summary: s.summary, sets: s.sets, page: s.page ?? s.id, files: Object.keys(s.files) })),
  ...GROK_TEMPLATES.map((g) => ({ id: g.id, title: g.title, summary: g.summary, sets: g.sets, page: g.id, files: ['grok'] })),
].sort((a, b) => a.title.localeCompare(b.title));
const stateOf = (id: string) => (FREE_SKILLS.includes(id) ? { state: 'open' as const, opensAt: null } : { state: 'upcoming' as const, opensAt: OPENS });
const buyerSkills = {
  plans: [],
  accessGroups: [],
  lockedLines: {},
  paused: false,
  courseOpensAt: OPENS,
  teamHub: false,
  skills: catalog.map((s) => ({ id: s.id, title: s.title, summary: s.summary, sets: s.sets, free: FREE_SKILLS.includes(s.id), releasedAt: LAUNCH_RELEASE, ...stateOf(s.id), files: s.files })),
};
const ownerSkills = {
  plans: [{ kind: 'cohort', status: 'active', paidThrough: COHORT_ONE_LIVE_UNTIL }],
  accessGroups: [],
  paused: false,
  courseOpensAt: null,
  teamHub: true,
  skills: Array.from({ length: 53 }, (_, i) => ({ id: `s${i}`, title: 'Skill', summary: '', sets: i < 30 ? 'owner_ops' : i < 50 ? 'agent' : 'both', free: false, releasedAt: 0, state: 'open', opensAt: null, files: [] })),
};
const password = { hasPassword: true, changedAt: Date.parse('2026-11-12T16:00:00Z') };

const GUIDES_FILE = fileURLToPath(new URL('../../../apps/web/dist-private/skill-guides.json', import.meta.url));
type Guides = { ui: unknown; guides: Record<string, { slug: string; skill: string; title: string; lanes: { id: string; label: string; steps: { title: string }[] }[]; sample?: unknown }> };
const guides: Guides | null = existsSync(GUIDES_FILE) ? (JSON.parse(readFileSync(GUIDES_FILE, 'utf8')) as Guides) : null;

function guideAnswer(slug: string) {
  const g = guides?.guides[slug];
  const s = catalog.find((x) => x.page === slug);
  if (!g || !s) return null;
  const { state, opensAt } = stateOf(s.id);
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

interface Screen {
  name: string;
  path: string;
  live?: boolean;
  as?: 'agent' | 'owner';
  guides?: boolean;
}

/** Every /learn screen, with the 390 artboard it follows. */

async function open(browser: Browser, screen: Screen, width: number, reducedMotion: 'reduce' | 'no-preference' = 'no-preference'): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, timezoneId: 'America/Denver', reducedMotion });
  const page = await ctx.newPage();
  const as = screen.as ?? 'agent';
  await page.route('**/api/course', (r) => r.fulfill({ json: screen.live ? courseLive : coursePre }));
  await page.route('**/api/skills', (r) => r.fulfill({ json: as === 'owner' ? ownerSkills : buyerSkills }));
  await page.route('**/api/auth/password', (r) => r.fulfill({ json: password }));
  await page.route('**/api/skill-guides/*', (r) => {
    const body = guideAnswer(decodeURIComponent(new URL(r.request().url()).pathname.split('/').pop() ?? ''));
    return body ? r.fulfill({ json: body }) : r.fulfill({ status: 404, json: { error: 'Not found' } });
  });
  const now = screen.live ? LIVE : PRE;
  await page.goto(`${APP_BASE}${screen.path}${screen.path.includes('?') ? '&' : '?'}as=${as}&now=${encodeURIComponent(now)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  await page.locator('h1').first().waitFor();
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  return page;
}


/**
 * D-214: the step page's rules (D-210, D-211, D-213), checked on every learner page at a desk and a phone width.
 * Each page must draw on the bone canvas in the v6 ink, title itself with the step page's title (650, 39px),
 * size its filled primary buttons as the one button system does (Geist 500, 40px on a desk, 32px for the shell's
 * small bar buttons, 44px on a phone, 8px radius) and round its white cards to the large 14px radius.
 */
const PAGES: readonly Screen[] = [
  { name: 'Home, before launch', path: '/learn' },
  { name: 'Home, live build', path: '/learn', live: true },
  { name: 'Week 0', path: '/learn/week/0' },
  { name: 'an open week, live', path: '/learn/week/1', live: true },
  { name: 'a locked week', path: '/learn/week/2' },
  { name: 'a step (v6)', path: '/learn/week/0/step/2' },
  { name: 'a checklist step (v6)', path: '/learn/week/0/step/4' },
  { name: 'a step at a live build (v6)', path: '/learn/week/1/step/1', live: true },
  { name: 'Schedule, weeks', path: '/learn/schedule' },
  { name: 'Schedule, calendar', path: '/learn/schedule?view=calendar' },
  { name: 'the Skill Library', path: '/learn/skills', guides: true },
  { name: 'an open skill', path: '/learn/skills/ai-brain-setup', guides: true },
  { name: 'a locked skill', path: '/learn/skills/tc-file-audit', guides: true },
  { name: 'Account', path: '/learn/account', as: 'owner' },
  { name: 'Team Hub', path: '/learn/team', as: 'owner' },
  { name: 'the Vault', path: '/learn/vault', as: 'owner' },
  { name: 'an AI employee', path: '/learn/employees/marketing', live: true },
  { name: 'the Team Plan window', path: '/learn?plan=team' },
];

/** What on the page breaks the step page's rules. */
function systemFindings(page: Page, phone: boolean) {
  return page.evaluate((phone) => {
    const out: string[] = [];
    const seen = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      }
      return true;
    };
    // The canvas: the frame's own ground (the step page's, or the learner frame's), not a card on it.
    const ground = document.querySelector('[data-step-page]') ?? document.querySelector('main') ?? document.body;
    let bg = 'rgba(0, 0, 0, 0)';
    for (let e: Element | null = ground; e && bg === 'rgba(0, 0, 0, 0)'; e = e.parentElement) bg = getComputedStyle(e).backgroundColor;
    if (bg === 'rgba(0, 0, 0, 0)') bg = getComputedStyle(document.documentElement).backgroundColor;
    if (bg !== 'rgb(241, 240, 235)') out.push(`canvas is ${bg}, not bone`);
    const h1 = [...document.querySelectorAll('h1')].find(seen);
    if (!h1) out.push('no visible h1');
    else {
      const cs = getComputedStyle(h1);
      if (cs.fontSize !== '39px' || cs.fontWeight !== '650') out.push(`h1 is ${cs.fontWeight} ${cs.fontSize}, not 650 39px`);
      if (cs.color !== 'rgb(10, 13, 12)') out.push(`h1 ink is ${cs.color}`);
    }
    // Filled primary buttons: a button or link painted forest, with words, that is not a radio, a tab or a chip.
    for (const el of document.querySelectorAll('button, a')) {
      if (!seen(el) || el.closest('[aria-hidden="true"]')) continue;
      const cs = getComputedStyle(el);
      if (cs.backgroundColor !== 'rgb(31, 77, 64)') continue;
      if (el.matches('[role="radio"], [role="tab"], [aria-current], [aria-pressed]')) continue;
      const text = (el.textContent ?? '').trim();
      if (!text) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 30) continue; // a small badge or an inline chip, not a button
      if (r.height > 64) continue; // a card that is a link (the step page's Next card), not a button
      // The shell's bar and sidebar use the system's small size (32px, the step page's .btn-sm) on a desk.
      const floor = phone ? 44 : el.closest('header, aside') ? 32 : 40;
      const name = text.slice(0, 32);
      if (r.height < floor - 0.5) out.push(`primary "${name}" is ${Math.round(r.height)}px tall, under ${floor}px`);
      if (cs.fontWeight !== '500') out.push(`primary "${name}" is weight ${cs.fontWeight}, not 500`);
      if (parseFloat(cs.borderTopLeftRadius) < 8 || (parseFloat(cs.borderTopLeftRadius) > 8 && parseFloat(cs.borderTopLeftRadius) < 20)) out.push(`primary "${name}" radius ${cs.borderTopLeftRadius}`);
    }
    // White cards: a surface with a hairline and a radius, wide enough to hold content.
    for (const el of document.querySelectorAll('main *, [role="dialog"] *, [data-step-page] *')) {
      const cs = getComputedStyle(el);
      if (cs.backgroundColor !== 'rgb(255, 255, 255)' || cs.borderTopStyle === 'none' || cs.borderTopWidth === '0px') continue;
      const radius = parseFloat(cs.borderTopLeftRadius);
      const r = el.getBoundingClientRect();
      if (radius <= 10 || r.width < 240 || r.height < 64 || !seen(el)) continue;
      if (radius !== 14 && radius < 100) out.push(`card ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} radius ${radius}px, not 14px`);
    }
    return [...new Set(out)];
  }, phone);
}

test.describe('the step page’s rules on every learner page (D-214) @g9', () => {
  for (const width of [1440, 390])
    for (const screen of PAGES)
      test(`${screen.name} at ${width}`, async ({ browser }) => {
        const page = await open(browser, screen, width, 'reduce');
        expect(await systemFindings(page, width < 768)).toEqual([]);
        await page.context().close();
      });
});
