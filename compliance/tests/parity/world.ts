import { expect, type Browser, type BrowserContext, type Page, type Route } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APP_BASE } from '../../lib/prepare';
// The deployed seed and the core functions the API answers with. `compliance/` can't resolve `@ai/core`,
// so these are relative, as in `e2e/learn-v2.spec.ts`.
import { DB_KEY } from '../../../packages/core/src/constants';
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { seed } from '../../../packages/core/src/seed';
import type { Db } from '../../../packages/core/src/types';
import { FREE_SKILLS, LAUNCH_RELEASE, SKILL_CATALOG } from '../../../packages/core/src/skills';
import { GROK_TEMPLATES } from '../../../packages/core/src/grok-templates';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

/**
 * The learner parity suite's world (Connor's parity brief § 3): ONE database that both the fixture
 * build's portal and its Console read, so a Console action and a learner screen are about the same
 * cohort.
 *
 *   the course    the deployed seed (`seedProduction` plus the v2 content, copy and release plans), the
 *                 same database `GET /api/course` reads in production
 *   the people    the fixture's three personas (`data/fixture.ts`): Jamie (`?as=agent`, Agent tier),
 *                 Alex (`?as=owner`, Team Owner) and staff `st1` (`?as=admin`, the seed's Owner), moved
 *                 into the course's cohort
 *
 * HOW THE TWO TABS SHARE IT. The fixture repository keeps its database in localStorage and tells other
 * tabs through the `storage` event (`data/fixture.ts`), the fixture's stand-in for the API's SSE. This
 * world is written there before the app boots, once per context (a later write by the app is kept).
 *
 * HOW `/api/course` IS ANSWERED. The fixture build has no API, so `GET /api/course` is answered here,
 * from the SAME stored database, by the SAME core functions the route uses (`courseFor`,
 * `courseSessions`, the learner copy strings: `apps/api/src/routes/course.ts`). It is read afresh on
 * every request, so a screen that refetches after a Console change sees the change, and one that does
 * not, does not. Nothing here decides what a screen shows.
 */

export const NOW = {
  /** Before the preview: Week 0 open in the pre-launch preview, the rest locked. */
  prelaunch: '2026-11-18T14:00:00-07:00',
  /** Week 1 open, Session 1 (Dec 2) over with its replay published, Session 2 next (Dec 9, 12:00 MT). */
  week1: '2026-12-04T10:00:00-07:00',
  /** 14 minutes before Session 2: inside the 15-minute join window. */
  s2Minus14: '2026-12-09T11:46:00-07:00',
  /** 16 minutes before Session 2: outside it. */
  s2Minus16: '2026-12-09T11:44:00-07:00',
  /** Session 2 running. */
  s2Live: '2026-12-09T12:20:00-07:00',
} as const;
export type NowKey = keyof typeof NOW;

export const COHORT = 'dec26';
export const S1 = 'dec26-s1';
export const S2 = 'dec26-s2';
export const WEEK1_MODULE = 'accelerator-week-1';
export const REPLAY_URL = 'https://stream.example.test/dec26-s1/playlist.m3u8';
export const MODULE_FILE = 'spend-map-config';
export const KIT_RESOURCE = { id: 'parity-kit-1', title: 'Spend Map Worksheet' } as const;
export const ANNOUNCEMENT = {
  id: 'parity-a1',
  title: 'Session 2 starts 30 minutes later',
  body: 'Same Zoom link as always.',
};

/** The fixture's localStorage key for the live phase (`data/fixture.ts` `dbKey('live')`). */
export const STORE_KEY = DB_KEY;

const demo = seed('live');
const prod = planContentV2(
  planCopyV1(
    planReleaseV1(seedProduction({ owner: { id: 'st1', name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }))
      .db,
  ).db,
).db;

/** The world's database: the deployed course, the fixture's people in its cohort, one replay, one announcement. */
export function worldDb(): Db {
  const db: Db = structuredClone(prod);
  db.phase = 'live';
  db.users = demo.users.map((u) => ({ ...u, cohortId: COHORT, progress: {} }));
  db.teams = structuredClone(demo.teams);
  db.tiers = structuredClone(demo.tiers);
  db.resources = structuredClone(demo.resources);
  db.requests = structuredClone(demo.requests);
  db.cohorts = db.cohorts.map((c) => ({ ...c, status: 'live' as const, enrolled: db.users.length }));
  // Session 1 is over: its replay is attached and published to learners (D-172's fields), and its week's
  // module carries the manifest the player reads (`EmployeeDetail.vm.ts` `replayUrl`).
  db.sessions = db.sessions.map((s) =>
    s.id === S1
      ? { ...s, replay: 'ready' as const, replayVisibility: 'published' as const, replayUrl: REPLAY_URL, attended: 3 }
      : s,
  );
  // Every course week open to both tiers. The deployed seed makes them Team only, and production's course
  // buyers are Team tier (`billing/provision.ts` `ownerTier`); the fixture's Jamie is Agent tier, which the
  // setLearnerTier test needs, so the weeks open to him as they open to a real buyer.
  db.modules = db.modules.map((m) => ({
    ...m,
    tier: 'agent' as const,
    ...(m.id === WEEK1_MODULE ? { playbackUrl: REPLAY_URL } : {}),
  }));
  // Week 1's module as the Module Builder fills it in (E-10, E-11): a system prompt with a variable, and one
  // uploaded file, so a build kit that shows them has something to show.
  db.modules = db.modules.map((m) =>
    m.id === WEEK1_MODULE
      ? {
          ...m,
          prompt: m.prompt || 'You map a real estate team’s spend for {{TEAM_NAME}}.',
          files: [
            ...m.files,
            { name: MODULE_FILE, type: 'JSON' as const, size: '4 KB', desc: 'The spend map’s settings.', steps: [] },
          ],
        }
      : m,
  );
  db.announcements = [
    {
      id: ANNOUNCEMENT.id,
      title: ANNOUNCEMENT.title,
      body: ANNOUNCEMENT.body,
      severity: 'warning',
      action: 'sessions',
      actionLabel: 'Open Sessions',
      audience: 'all',
      channels: ['inapp', 'email'],
      status: 'sent',
      at: Date.parse('2026-12-03T09:00:00-07:00'),
      opens: null,
    },
  ];
  db.dismissed = {};
  // One published file in Week 1's kit (E-12), as the Module Builder attaches it.
  const like = demo.resources[0]!;
  db.resources.push({
    ...like,
    id: KIT_RESOURCE.id,
    title: KIT_RESOURCE.title,
    desc: 'The worksheet Week 1 fills in.',
    tier: 'agent',
    exec: false,
    status: 'published',
    module: WEEK1_MODULE,
    kind: 'file',
    visibility: 'published',
  });
  return db;
}

/** What `GET /api/course` answers a course learner, from a database (`apps/api/src/routes/course.ts`). */
export function courseAnswer(db: Db, now: number, prelaunch = false) {
  return {
    open: true,
    preview: false,
    prelaunch,
    course: courseFor(db, now, { open: true, preview: prelaunch }),
    sessions: courseSessions(db),
    copy: Object.fromEntries((db.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
  };
}

export const learnerCopy = (key: string): string => (prod.copy ?? []).find((c) => c.key === key)?.value ?? '';

// ---- The Skill Library's answers (as `e2e/learn-v2-library.spec.ts` builds them) ----------------------

export type LibraryPersona = 'buyer' | 'utah' | 'agent-plan' | 'team-plan' | 'insiders' | 'free';
const OPENS = Date.parse('2026-12-02T12:00:00-07:00');
const catalog = [
  ...SKILL_CATALOG.map((s) => ({
    id: s.id,
    title: s.title,
    summary: s.summary,
    sets: s.sets,
    page: s.page ?? s.id,
    files: Object.keys(s.files),
  })),
  ...GROK_TEMPLATES.map((g) => ({
    id: g.id,
    title: g.title,
    summary: g.summary,
    sets: g.sets,
    page: g.id,
    files: ['grok'],
  })),
].sort((a, b) => a.title.localeCompare(b.title));

function stateOf(
  persona: LibraryPersona,
  s: (typeof catalog)[number],
): { state: 'open' | 'locked' | 'upcoming'; opensAt: number | null } {
  const free = FREE_SKILLS.includes(s.id);
  if (free) return { state: 'open', opensAt: null };
  switch (persona) {
    case 'buyer':
      return { state: 'upcoming', opensAt: OPENS };
    case 'utah':
    case 'agent-plan':
      return s.sets !== 'owner_ops' ? { state: 'open', opensAt: null } : { state: 'locked', opensAt: null };
    case 'team-plan':
    case 'insiders':
      return { state: 'open', opensAt: null };
    case 'free':
      return { state: 'locked', opensAt: null };
  }
}

export const UTAH = { id: 'utah-life', name: 'Utah Life' } as const;

export function skillsAnswer(persona: LibraryPersona, opts: { welcome?: boolean } = {}) {
  // A bought plan as `GET /api/skills` reports it (`kind`, `status`, `paidThrough`); an access group's grant is not one.
  const kind: Partial<Record<LibraryPersona, string>> = {
    buyer: 'cohort',
    'agent-plan': 'agent_plan',
    'team-plan': 'agents',
    insiders: 'membership',
  };
  return {
    plans: kind[persona] ? [{ kind: kind[persona], status: 'active', paidThrough: null }] : [],
    accessGroups:
      persona === 'utah'
        ? [{ id: UTAH.id, name: UTAH.name, skills: 30, welcome: opts.welcome ?? true, covers: ['agent', 'both'] }]
        : [],
    lockedLines: persona === 'utah' ? { [UTAH.id]: learnerCopy('locked.utah_life') } : {},
    paused: false,
    courseOpensAt: persona === 'buyer' ? OPENS : null,
    teamHub: persona === 'team-plan',
    skills: catalog.map((s) => ({
      id: s.id,
      title: s.title,
      summary: s.summary,
      sets: s.sets,
      free: FREE_SKILLS.includes(s.id),
      releasedAt: LAUNCH_RELEASE,
      ...stateOf(persona, s),
      files: s.files,
    })),
  };
}

const GUIDES_FILE = fileURLToPath(new URL('../../../apps/web/dist-private/skill-guides.json', import.meta.url));
type Guides = {
  ui: unknown;
  guides: Record<
    string,
    {
      slug: string;
      skill: string;
      title: string;
      lanes: { id: string; label: string; steps: { title: string }[] }[];
      sample?: unknown;
    }
  >;
};
export const guides: Guides | null = existsSync(GUIDES_FILE)
  ? (JSON.parse(readFileSync(GUIDES_FILE, 'utf8')) as Guides)
  : null;

export function guideAnswer(persona: LibraryPersona, slug: string) {
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
    accessGroups: persona === 'utah' ? [{ id: UTAH.id, name: UTAH.name }] : [],
    paidPlans: persona !== 'utah' && persona !== 'free',
    preview: { lanes: g.lanes.map((l) => ({ id: l.id, label: l.label, steps: l.steps.map((x) => x.title) })) },
    sample: g.sample ?? null,
    guide: open ? g : null,
    ui: open ? guides!.ui : null,
  };
}

/** An open skill's guide slug, for the guided-setup routes. */
export const OPEN_GUIDE = 'ai-brain-setup';

// ---- Opening a page ------------------------------------------------------------------------------

export type Persona = 'agent' | 'owner' | 'admin';
/** Who the learner is to the API: a course buyer, or one of the no-course plans and groups. */
export type Audience = 'course' | 'upcoming' | 'paused' | 'failed' | LibraryPersona;
/** The audiences whose plan opens no course: Utah Life and every access-group-only or skills-only plan. */
export const NO_COURSE: readonly Audience[] = ['utah', 'agent-plan', 'team-plan', 'insiders', 'free'];

export interface WorldOptions {
  as?: Persona;
  now?: NowKey;
  width?: number;
  height?: number;
  audience?: Audience;
  /** Change the world before the app boots. */
  edit?: (db: Db) => void;
  /** Leave the welcome panel undismissed (true, the default) or already dismissed. */
  welcome?: boolean;
}

/** Read the world as the app has it now (another tab may have changed it). */
export async function storedDb(page: Page): Promise<Db> {
  const raw = await page.evaluate((k) => localStorage.getItem(k), STORE_KEY);
  return JSON.parse(raw ?? 'null') as Db;
}

/** `GET /api/course`, `/api/skills` and `/api/skill-guides/:slug`, answered for an audience from the stored world. */
export async function answerApi(
  ctx: BrowserContext,
  audience: Audience,
  nowKey: NowKey,
  opts: { welcome?: boolean } = {},
): Promise<void> {
  const now = Date.parse(NOW[nowKey]);
  await ctx.route('**/api/course', async (route: Route) => {
    if (audience === 'course') {
      const page = route.request().frame().page();
      const db = await storedDb(page);
      return route.fulfill({ json: courseAnswer(db, now, nowKey === 'prelaunch') });
    }
    if (audience === 'upcoming')
      return route.fulfill({
        status: 403,
        json: {
          open: false,
          upcoming: true,
          opensAt: Date.parse('2026-12-02T12:00:00-07:00'),
          error: 'Your AI Accelerator opens at the first live build.',
        },
      });
    if (audience === 'paused')
      return route.fulfill({
        status: 403,
        json: { open: false, paused: true, error: 'Your AI Accelerator is paused until your payment goes through.' },
      });
    if (audience === 'failed') return route.fulfill({ status: 500, json: { error: 'boom' } });
    return route.fulfill({ status: 403, json: { open: false, error: 'The AI Accelerator isn’t in your plan.' } });
  });
  const lib: LibraryPersona =
    audience === 'course' || audience === 'upcoming' || audience === 'paused' || audience === 'failed'
      ? 'buyer'
      : audience;
  await ctx.route('**/api/skills', (r) => r.fulfill({ json: skillsAnswer(lib, opts) }));
  await ctx.route('**/api/skills/welcome/dismiss', (r) => r.fulfill({ json: { ok: true } }));
  // The auth screens' reads: a set-password token that is good, a password already set, and a sign-in
  // (or invite) link that verifies and sends the learner where the API would (`core/landing.ts`).
  await ctx.route('**/api/auth/password/token', (r) => r.fulfill({ json: { ok: true, purpose: 'set' } }));
  await ctx.route('**/api/auth/password', (r) => r.fulfill({ json: { hasPassword: true, changedAt: null } }));
  await ctx.route('**/api/auth/verify', (r) =>
    r.fulfill({ json: { ok: true, landing: lib === 'buyer' ? '/' : '/skill-library' } }),
  );
  await ctx.route('**/api/skill-guides/*', (r) => {
    const slug = decodeURIComponent(new URL(r.request().url()).pathname.split('/').pop() ?? '');
    const body = guideAnswer(lib, slug);
    return body ? r.fulfill({ json: body }) : r.fulfill({ status: 404, json: { error: 'Not found' } });
  });
}

/** A browser context holding the world, its API answers and the clock. Open as many tabs in it as needed. */
export async function worldContext(browser: Browser, o: WorldOptions = {}): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    viewport: { width: o.width ?? 1440, height: o.height ?? 900 },
    timezoneId: 'America/Denver',
    locale: 'en-US',
  });
  const db = worldDb();
  // A learner whose plan opens no course gets no AI Employee in their snapshot: the API sends a learner
  // only what their plan opens (`scopeSnapshot`, D-110), and that is how the portal tells them apart
  // (`shell/navModel.ts` `hasPortal`, D-119).
  if (NO_COURSE.includes(o.audience ?? 'course')) db.modules = [];
  o.edit?.(db);
  await ctx.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
      if (!localStorage.getItem('ai-lms-prefs'))
        localStorage.setItem(
          'ai-lms-prefs',
          JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' }),
        );
    },
    [STORE_KEY, JSON.stringify(db)] as const,
  );
  await answerApi(ctx, o.audience ?? 'course', o.now ?? 'week1', { welcome: o.welcome ?? true });
  return ctx;
}

/** The fixture address for a path, as a persona, at a moment (`?as=` and `?now=` exist only in fixture mode). */
export function fixtureUrl(path: string, as: Persona = 'agent', now: NowKey = 'week1'): string {
  const u = new URL(path, APP_BASE);
  u.searchParams.set('as', as);
  u.searchParams.set('now', NOW[now]);
  return u.toString();
}

/** Go to a path in a tab and wait for the app to say it is ready. */
export async function visit(page: Page, path: string, as: Persona = 'agent', now: NowKey = 'week1'): Promise<void> {
  await page.goto(fixtureUrl(path, as, now));
  await page.waitForSelector('body[data-app-ready="true"]');
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
}

/** One tab, in its own world. */
export async function openWorld(browser: Browser, path: string, o: WorldOptions = {}): Promise<Page> {
  const ctx = await worldContext(browser, o);
  const page = await ctx.newPage();
  await visit(page, path, o.as ?? 'agent', o.now ?? 'week1');
  return page;
}

/** How far the page scrolls sideways (0 is none). */
export const sideways = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
