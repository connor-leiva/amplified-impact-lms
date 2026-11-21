import { test, expect, type Browser, type BrowserContext, type Page, type Request, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ANNOUNCEMENT,
  KIT_RESOURCE,
  MODULE_FILE,
  NOW,
  OPEN_GUIDE,
  S2,
  WEEK1_MODULE,
  courseAnswer,
  guideAnswer,
  guides,
  skillsAnswer,
  worldDb,
  type NowKey,
} from '../world';

/**
 * The learner parity suite: the API the learner screens call (Connor's parity brief § 3, "api").
 *
 * The SAME screens, built in http mode (`VITE_DATA_SOURCE=http`, the flag on: the `parity-learner-http`
 * project's build, `parity/learner.config.ts`), so every read and write goes through `data/http.ts` and
 * the screens' own `fetch` calls exactly as in production. Every `/api/*` request is answered here from
 * the parity world and recorded, so a test can say which endpoint a screen called. An endpoint nobody
 * answers is a 404, and is recorded too.
 *
 * The inventory's § 9 lists what the old learner screens called (A-1 to A-17). The last test checks that
 * each is either proven called by a new screen here (or by a fixture test) or marked a signed-off drop
 * or N/A in the manifest.
 *
 * Expected to fail on this branch until the stack merges: the event stream refreshing the course (A-3)
 * and Dismiss announcement (A-5) and Join (A-8) are claude/learner-pr9b-parity's; a module file's
 * download (A-9) is claude/learner-pr9c-content's; the signed-out guide's `next` (L-12) is #172's.
 */

/** The http-mode build's origin, from the project (`learner.config.ts`). */
const baseOf = (): string =>
  (test.info().project.metadata as { learnerHttpBase?: string }).learnerHttpBase ?? 'http://127.0.0.1:4474';

interface Api {
  ctx: BrowserContext;
  page: Page;
  calls: string[];
  /** Fire one `changed` event on the open stream. */
  change: () => void;
}

type Viewer = { kind: 'learner'; userId: string; role: 'agent' | 'owner' } | { kind: 'signed-out' };

async function api(
  browser: Browser,
  o: { now?: NowKey; viewer?: Viewer; course?: 'course' | 'paused' } = {},
): Promise<Api> {
  const now = Date.parse(NOW[o.now ?? 'week1']);
  const viewer = o.viewer ?? { kind: 'learner', userId: 'u_jamie', role: 'agent' };
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: 'America/Denver',
    locale: 'en-US',
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(now));
  const db = worldDb();
  const calls: string[] = [];
  let fire = false;
  const record = (r: Request) => calls.push(`${r.method()} ${new URL(r.url()).pathname}`);
  await ctx.route(/\/api\//, async (route: Route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    record(req);
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (viewer.kind === 'signed-out' && path !== '/api/events') return json({ error: 'Not signed in' }, 401);
    if (path === '/api/me')
      return json({
        viewer: {
          actor: { kind: 'learner', userId: (viewer as { userId: string }).userId },
          role: (viewer as { role: string }).role,
        },
      });
    if (path === '/api/snapshot') return json(db);
    if (path === '/api/course')
      return o.course === 'paused'
        ? json(
            { open: false, paused: true, error: 'Your AI Accelerator is paused until your payment goes through.' },
            403,
          )
        : json(courseAnswer(db, now));
    if (path === '/api/events') {
      // Server-sent events, one response at a time: `retry` makes the browser reconnect quickly until the
      // test fires, then that connection carries one `changed` and asks for a long pause.
      const body = fire ? 'event: changed\ndata: {}\n\nretry: 600000\n\n' : 'retry: 150\n\n';
      fire = false;
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' },
        body,
      });
    }
    if (path === '/api/skills') return json(skillsAnswer('buyer'));
    if (path.startsWith('/api/skill-guides/')) {
      const g = guideAnswer('buyer', decodeURIComponent(path.split('/').pop() ?? ''));
      return g ? json(g) : json({ error: 'Not found' }, 404);
    }
    if (path === '/api/auth/password') return json({ hasPassword: true, changedAt: null });
    if (path.startsWith('/api/mutate/')) return json({});
    if (path.startsWith('/api/sessions/') && path.endsWith('/join'))
      return json({ url: 'https://zoom.example.test/j/1' });
    if (path === '/api/auth/sign-out') return json({ ok: true });
    if (path === '/api/auth/login' || path === '/api/auth/request') return json({ ok: true, landing: '/' });
    // Downloads and the billing portal are navigations: answer them with a small file or page.
    if (path.startsWith('/api/files/') || path.startsWith('/api/skills/') || path === '/api/billing/portal')
      return route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' });
    return json({ error: 'not answered by the parity test' }, 404);
  });
  return { ctx, page, calls, change: () => (fire = true) };
}

async function go(a: Api, path: string): Promise<void> {
  await a.page.goto(`${baseOf()}${path}`);
  await a.page.waitForSelector('body[data-app-ready="true"]');
}

const called = (a: Api, pattern: RegExp) => a.calls.some((c) => pattern.test(c));

/**
 * D-224: the event stream refreshes a page at most once per `CHANGED_EVERY_MS` (5 s, `apps/web/src/data/http.ts`).
 * This file's stream closes after each answer, so the browser reconnects every 150 ms and each reconnect is a
 * catch-up refresh; with the page's clock fixed, every refresh after the first waits the whole window. A `changed`
 * fired just after one is refetched about 5.9 s later (measured): the poll waits the window and a margin, not the
 * default 5 s.
 */
const CHANGED_WAIT = { timeout: 5_000 + 5_000 };

test.describe('learner parity: the API the new screens call (http mode)', () => {
  test('the shell reads the viewer, the snapshot and the course, and opens the event stream @parity:A-1 @parity:A-2 @parity:A-11', async ({
    browser,
  }) => {
    const a = await api(browser);
    await go(a, '/learn');
    await expect(a.page.getByRole('heading', { level: 1 })).toHaveText(/Jamie/);
    for (const c of [/^GET \/api\/me$/, /^GET \/api\/snapshot$/, /^GET \/api\/course$/])
      expect(called(a, c), String(c)).toBe(true);
    await expect.poll(() => called(a, /^GET \/api\/events$/)).toBe(true);
    await a.ctx.close();
  });

  test('a `changed` event refetches the snapshot and the course @parity:A-3', async ({ browser }) => {
    const a = await api(browser);
    await go(a, '/learn/schedule');
    await expect.poll(() => called(a, /^GET \/api\/events$/)).toBe(true);
    const before = {
      snapshot: a.calls.filter((c) => c === 'GET /api/snapshot').length,
      course: a.calls.filter((c) => c === 'GET /api/course').length,
    };
    a.change();
    await expect
      .poll(() => a.calls.filter((c) => c === 'GET /api/snapshot').length, CHANGED_WAIT)
      .toBeGreaterThan(before.snapshot);
    await expect
      .poll(() => a.calls.filter((c) => c === 'GET /api/course').length, CHANGED_WAIT)
      .toBeGreaterThan(before.course);
    await a.ctx.close();
  });

  test('Mark step done posts toggleStep @parity:A-4', async ({ browser }) => {
    const a = await api(browser);
    await go(a, '/learn/week/1/step/1');
    const post = a.page.waitForRequest((r) => r.url().endsWith('/api/mutate/toggleStep') && r.method() === 'POST');
    await a.page.getByRole('button', { name: 'Mark step done' }).click();
    const body = (await post).postDataJSON() as { moduleId: string; stepId: string };
    expect(body.moduleId).toBe(WEEK1_MODULE);
    expect(body.stepId).toBeTruthy();
    await a.ctx.close();
  });

  test('Dismiss on Home’s announcement posts dismissAnnouncement @parity:A-5', async ({ browser }) => {
    const a = await api(browser);
    await go(a, '/learn');
    await expect(a.page.getByText(ANNOUNCEMENT.title)).toBeVisible();
    const post = a.page.waitForRequest(
      (r) => r.url().endsWith('/api/mutate/dismissAnnouncement') && r.method() === 'POST',
    );
    await a.page
      .getByRole('button', { name: /Dismiss/ })
      .first()
      .click();
    expect((await post).postDataJSON()).toMatchObject({ id: ANNOUNCEMENT.id });
    await a.ctx.close();
  });

  test('Join inside the window asks the join route for the link @parity:A-8', async ({ browser }) => {
    const a = await api(browser, { now: 's2Minus14' });
    await go(a, '/learn/schedule');
    const asked = a.page.waitForRequest((r) => new URL(r.url()).pathname === `/api/sessions/${S2}/join`);
    await a.page.getByRole('main').getByRole('button', { name: /^Join/ }).first().click();
    await asked;
    await a.ctx.close();
  });

  test('a module file in the week kit downloads from the module files route @parity:A-9', async ({ browser }) => {
    const a = await api(browser);
    await go(a, '/learn/week/1');
    const link = a.page.locator(`a[href^="/api/files/module/${WEEK1_MODULE}/"]`);
    if (await link.count()) await expect(link.first()).toHaveAttribute('href', new RegExp(MODULE_FILE));
    else {
      const asked = a.page.waitForRequest((r) =>
        new URL(r.url()).pathname.startsWith(`/api/files/module/${WEEK1_MODULE}/`),
      );
      await a.page.getByRole('main').getByText(MODULE_FILE).first().click();
      await asked;
    }
    await a.ctx.close();
  });

  test('a kit resource downloads from the resource files route @parity:A-10 @parity:E-12', async ({ browser }) => {
    const a = await api(browser);
    await go(a, '/learn/week/1');
    const kit = a.page.getByRole('region', { name: 'Week 1 kit' });
    await expect(kit.locator(`a[href="/api/files/resource/${KIT_RESOURCE.id}"]`)).toBeVisible();
    await a.ctx.close();
  });

  test('Manage billing opens the billing portal route @parity:A-12', async ({ browser }) => {
    const a = await api(browser, { course: 'paused' });
    await go(a, '/learn');
    await expect(a.page.getByRole('link', { name: 'Manage Billing' })).toHaveAttribute('href', '/api/billing/portal');
    await a.ctx.close();
  });

  test('the library and a guide read the skills routes; downloads use the skills download route @parity:A-13', async ({
    browser,
  }) => {
    test.skip(!guides, 'needs the fixture build’s apps/web/dist-private/skill-guides.json');
    const a = await api(browser);
    await go(a, '/learn/skills');
    expect(called(a, /^GET \/api\/skills$/)).toBe(true);
    await go(a, `/learn/skills/${OPEN_GUIDE}`);
    expect(called(a, new RegExp(`^GET /api/skill-guides/${OPEN_GUIDE}$`))).toBe(true);
    await a.page
      .getByRole('navigation', { name: /steps$/ })
      .getByRole('button', { name: /Download the Skill/ })
      .click();
    await expect(a.page.locator(`a[href^="/api/skills/${OPEN_GUIDE}/download/"]`).first()).toBeVisible();
    await a.ctx.close();
  });

  test('the Account pages read the password route @parity:A-15', async ({ browser }) => {
    const a = await api(browser);
    await go(a, '/learn/account');
    await expect.poll(() => called(a, /^GET \/api\/auth\/password$/)).toBe(true);
    a.calls.length = 0;
    await go(a, '/account');
    await expect.poll(() => called(a, /^GET \/api\/auth\/password$/)).toBe(true);
    await a.ctx.close();
  });

  test('sign out posts to the auth route and leaves for sign-in; a failure says so @parity:A-16 @parity:SH-12', async ({
    browser,
  }) => {
    const a = await api(browser);
    await go(a, '/learn');
    await a.page.route('**/api/auth/sign-out', (r) => r.fulfill({ status: 500, json: { error: 'down' } }));
    await a.page.getByRole('button', { name: 'Your account' }).click();
    await a.page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(a.page.getByText('Something went wrong. Try again.')).toBeVisible();
    await a.page.unroute('**/api/auth/sign-out');
    const post = a.page.waitForRequest((r) => r.url().endsWith('/api/auth/sign-out') && r.method() === 'POST');
    await a.page.getByRole('button', { name: 'Your account' }).click();
    await a.page.getByRole('menuitem', { name: 'Sign out' }).click();
    await post;
    await expect(a.page).toHaveURL(/\/sign-in/);
    await a.ctx.close();
  });

  test('a signed-out visit to a skill’s page goes to sign-in and keeps where it was going @parity:L-12', async ({
    browser,
  }) => {
    const a = await api(browser, { viewer: { kind: 'signed-out' } });
    await a.page.goto(`${baseOf()}/learn/skills/${OPEN_GUIDE}`);
    await a.page.waitForURL(/\/sign-in/);
    expect(new URL(a.page.url()).searchParams.get('next')).toBe(`/learn/skills/${OPEN_GUIDE}`);
    await a.ctx.close();
  });

  test('every endpoint the old learner screens called is proven called by a new screen, or is a signed-off drop or N/A', () => {
    const manifest = JSON.parse(
      readFileSync(fileURLToPath(new URL('../../../parity/learner-parity.json', import.meta.url)), 'utf8'),
    ) as {
      entries: { id: string; status: string }[];
    };
    const here = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    const fixture = ['kept-shell.spec.ts', 'kept-library.spec.ts', 'access-groups.spec.ts']
      .map((f) => readFileSync(fileURLToPath(new URL(`../${f}`, import.meta.url)), 'utf8'))
      .join('\n');
    const missing = manifest.entries
      .filter((e) => /^A-\d+$/.test(e.id))
      .filter((e) => !['signed-off-drop', 'n/a'].includes(e.status))
      .filter((e) => !new RegExp(`@parity:${e.id}\\b`).test(here + fixture))
      .map((e) => e.id);
    expect(missing).toEqual([]);
  });
});
