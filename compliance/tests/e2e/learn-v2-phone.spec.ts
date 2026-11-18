import { test, expect, type Browser, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
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
const SCREENS: readonly Screen[] = [
  { name: 'Home, before launch (02)', path: '/learn' },
  { name: 'Home, live build (05)', path: '/learn', live: true },
  { name: 'the week (07)', path: '/learn/week/0' },
  { name: 'the step player (09)', path: '/learn/week/0/step/4' },
  { name: 'a step at a live build', path: '/learn/week/1/step/1', live: true },
  { name: 'the locked week (15)', path: '/learn/week/2' },
  { name: 'Schedule, weeks (11)', path: '/learn/schedule' },
  { name: 'Schedule, calendar (13)', path: '/learn/schedule?view=calendar' },
  { name: 'the Skill Library (17)', path: '/learn/skills', guides: true },
  { name: 'an open skill’s setup', path: '/learn/skills/ai-brain-setup', guides: true },
  { name: 'a locked skill (19)', path: '/learn/skills/tc-file-audit', guides: true },
  { name: 'Account (21)', path: '/learn/account', as: 'owner' },
];

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

/** What is out of line on the page at a phone width: sideways scroll, small targets, small type. */
function phoneFindings(page: Page) {
  return page.evaluate(() => {
    const hidden = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return true;
        if (e.getAttribute('aria-hidden') === 'true' || (e as HTMLElement).inert) return true;
        // Visually hidden (`clip: rect(0 0 0 0)` in a 1px box): read, never tapped or seen.
        if (cs.position === 'absolute' && cs.overflow === 'hidden' && parseFloat(cs.width) <= 1 && parseFloat(cs.height) <= 1) return true;
      }
      const r = el.getBoundingClientRect();
      return !(r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth);
    };
    const label = (el: Element) => {
      const t = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ');
      return `${el.tagName.toLowerCase()}${t ? ` "${t.slice(0, 40)}"` : ''}`;
    };
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;

    const font = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!(n.textContent ?? '').trim()) continue;
      const p = n.parentElement;
      if (!p || p.closest('svg, script, style, noscript') || hidden(p)) continue;
      const size = Number.parseFloat(getComputedStyle(p).fontSize);
      if (size < 16) font.add(`${label(p)} ${size}px`);
    }

    const tap = new Set<string>();
    const controls = document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=link], [role=menuitem], [role=switch], [role=radio], [role=checkbox]');
    for (const el of Array.from(controls)) {
      if (hidden(el) || (el as HTMLButtonElement).disabled) continue;
      const cs = getComputedStyle(el);
      if (el.tagName === 'A' && cs.display === 'inline') {
        const block = el.parentElement;
        if (block && Array.from(block.childNodes).some((c) => c !== el && /[\p{L}\p{N}]/u.test(c.textContent ?? ''))) continue;
      }
      if (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'text' && Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (Math.min(r.width, r.height) < 43.5) tap.add(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return { overflow, font: [...font], tap: [...tap] };
  });
}

test.describe('learner portal v2, the phone pass (D-181) @g9', () => {
  for (const screen of SCREENS)
    test(`${screen.name} at 390: no sideways scroll, 44px targets, 16px type, one h1, accessible`, async ({ browser }) => {
      test.skip(!!screen.guides && !guides, 'needs the fixture build’s apps/web/dist-private/skill-guides.json');
      const page = await open(browser, screen, 390);
      await expect(page.locator('h1')).toHaveCount(1);
      const f = await phoneFindings(page);
      expect(f.overflow, 'sideways scroll').toBe(0);
      expect(f.tap, 'targets under 44px').toEqual([]);
      expect(f.font, 'text under 16px').toEqual([]);
      await expectAccessible(page);
      await page.context().close();
    });

  for (const width of [768, 1024])
    test(`every screen at ${width}: no sideways scroll, one h1`, async ({ browser }) => {
      for (const screen of SCREENS) {
        if (screen.guides && !guides) continue;
        const page = await open(browser, screen, width);
        await expect(page.locator('h1'), screen.name).toHaveCount(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), screen.name).toBe(0);
        await page.context().close();
      }
    });

  test('the phone menu (03) is a modal drawer: focus trapped, the page inert, Escape and the scrim close it', async ({ browser }) => {
    const page = await open(browser, SCREENS[0]!, 390);
    const trigger = page.getByRole('button', { name: 'Open menu' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    const drawer = page.locator('[role="dialog"][data-drawer="open"]');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(drawer.locator('aside[aria-label="Primary"]')).toHaveCount(1);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer.getByRole('button', { name: 'Close menu' })).toBeFocused();
    // Its rows are phone-sized, and it is accessible open.
    const f = await phoneFindings(page);
    expect(f.tap).toEqual([]);
    expect(f.font).toEqual([]);
    await expectAccessible(page);

    // The page behind it can't be reached.
    expect(await page.locator('main').evaluate((m) => !!m.closest('[inert]'))).toBe(true);
    // Tab and Shift+Tab stay inside it, both ways round.
    const count = await drawer.locator('a[href], button:not([disabled])').count();
    for (let i = 0; i < count + 2; i++) {
      await page.keyboard.press('Tab');
      expect(await drawer.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    for (let i = 0; i < count + 2; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await drawer.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }

    // Escape closes it and hands focus back to the menu button.
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-drawer="open"]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.locator('main').evaluate((m) => !!m.closest('[inert]'))).toBe(false);

    // The scrim closes it too, and a row in it navigates and closes it.
    await trigger.click();
    await expect(drawer).toBeVisible();
    await page.mouse.click(380, 400);
    await expect(page.locator('[data-drawer="open"]')).toHaveCount(0);
    await trigger.click();
    await drawer.getByRole('link', { name: 'Skill library' }).click();
    await expect(page).toHaveURL(/\/learn\/skills/);
    await expect(page.locator('[data-drawer="open"]')).toHaveCount(0);
    await page.context().close();
  });

  test('with reduced motion the drawer does not slide in', async ({ browser }) => {
    const page = await open(browser, SCREENS[0]!, 390, 'reduce');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const drawer = page.locator('[role="dialog"][data-drawer="open"]');
    await expect(drawer).toBeVisible();
    expect(await drawer.evaluate((d) => getComputedStyle(d).animationName)).toBe('none');
    await page.context().close();
  });

  test('the step player’s actions at 390: Mark step done across the top, then Previous and Next step', async ({ browser }) => {
    const page = await open(browser, SCREENS[3]!, 390);
    const done = page.getByRole('button', { name: 'Mark step done' });
    const prev = page.getByRole('link', { name: 'Previous' });
    const next = page.getByRole('link', { name: 'Next step' });
    const [d, p, n] = await Promise.all([done.boundingBox(), prev.boundingBox(), next.boundingBox()]);
    expect(d && p && n).toBeTruthy();
    // The artboard's `.actb` at 390: Mark step done full width and 48px tall, above the two links.
    expect(d!.height).toBeGreaterThanOrEqual(48);
    expect(d!.width).toBeGreaterThan(300);
    expect(p!.y).toBeGreaterThan(d!.y + d!.height - 1);
    expect(Math.abs(p!.y - n!.y)).toBeLessThan(2);
    await page.context().close();
  });
});
