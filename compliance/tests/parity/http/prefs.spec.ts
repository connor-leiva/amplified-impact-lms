import { test, expect, type Browser, type BrowserContext, type Page, type Route } from '@playwright/test';
import { NOW, courseAnswer, skillsAnswer, worldDb } from '../world';

/**
 * D-185: the learner shell's Theme and desktop sidebar are remembered per PERSON, by the API: the same
 * screens built in http mode (the `parity-learner-http` project, `parity/learner.config.ts`), every `/api/*`
 * answered here. `GET /api/me` carries the person's stored `prefs` (`users.prefs`), and a choice is stored
 * with `PATCH /api/me/prefs`, so it follows the person to another browser and is nobody else's.
 */

const baseOf = (): string =>
  (test.info().project.metadata as { learnerHttpBase?: string }).learnerHttpBase ?? 'http://127.0.0.1:4474';

interface Server {
  ctx: BrowserContext;
  page: Page;
  /** Each person's stored prefs, as `users.prefs` holds them. */
  stored: Record<string, { theme?: string; sidebar?: string }>;
  patches: { userId: string; body: unknown }[];
}

/** One browser, signed in as `userId`, over a server that keeps every person's prefs in `stored`. */
async function server(
  browser: Browser,
  userId: string,
  stored: Server['stored'],
  patches: Server['patches'],
): Promise<Server> {
  const now = Date.parse(NOW.week1);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: 'America/Denver',
    locale: 'en-US',
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(now));
  const db = worldDb();
  await ctx.route(/\/api\//, async (route: Route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/api/me' && req.method() === 'GET')
      return json({ viewer: { actor: { kind: 'learner', userId }, role: 'agent' }, prefs: stored[userId] ?? {} });
    if (path === '/api/me/prefs' && req.method() === 'PATCH') {
      const body = req.postDataJSON() as Record<string, string>;
      patches.push({ userId, body });
      stored[userId] = { ...stored[userId], ...body };
      return json({ prefs: stored[userId] });
    }
    if (path === '/api/snapshot') return json(db);
    if (path === '/api/course') return json(courseAnswer(db, now));
    if (path === '/api/events')
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: 'retry: 600000\n\n',
      });
    if (path === '/api/skills') return json(skillsAnswer('buyer'));
    return json({ error: 'not answered by the parity test' }, 404);
  });
  return { ctx, page, stored, patches };
}

async function go(s: Server, path: string): Promise<void> {
  await s.page.goto(`${baseOf()}${path}`);
  await s.page.waitForSelector('body[data-app-ready="true"]');
}

const frame = (page: Page) => page.locator('[data-learner-v2]');
const aside = (page: Page) => page.locator('aside[aria-label="Primary"]');

test.describe('learner parity: the shell’s Theme and sidebar, stored per person by the API (http mode)', () => {
  test('a theme chosen in one browser is stored for that person and drawn in their next browser, not another person’s @parity:SH-5', async ({
    browser,
  }) => {
    const stored: Server['stored'] = {};
    const patches: Server['patches'] = [];
    const first = await server(browser, 'u_jamie', stored, patches);
    await go(first, '/learn');
    await expect(frame(first.page)).toHaveAttribute('data-lv-theme', 'light');
    await first.page.getByRole('button', { name: 'Your account' }).click();
    await first.page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await expect(frame(first.page)).toHaveAttribute('data-lv-theme', 'dark');
    await expect.poll(() => patches).toEqual([{ userId: 'u_jamie', body: { theme: 'dark' } }]);
    await first.ctx.close();

    // A fresh browser (nothing on the device): the API's Dark.
    const second = await server(browser, 'u_jamie', stored, patches);
    await go(second, '/learn');
    await expect(frame(second.page)).toHaveAttribute('data-lv-theme', 'dark');
    await expect(second.page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await second.ctx.close();

    // Another person: their own (none), light.
    const other = await server(browser, 'u_alex', stored, patches);
    await go(other, '/learn');
    await expect(frame(other.page)).toHaveAttribute('data-lv-theme', 'light');
    await other.ctx.close();
  });

  test('the desktop sidebar collapsed in one browser is the rail in the person’s next one @parity:SH-6 @parity:MO-3', async ({
    browser,
  }) => {
    const stored: Server['stored'] = {};
    const patches: Server['patches'] = [];
    const first = await server(browser, 'u_jamie', stored, patches);
    await go(first, '/learn');
    await first.page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(aside(first.page)).toHaveAttribute('data-rail', 'true');
    await expect.poll(() => patches).toEqual([{ userId: 'u_jamie', body: { sidebar: 'rail' } }]);
    await first.ctx.close();

    const second = await server(browser, 'u_jamie', stored, patches);
    await go(second, '/learn');
    await expect(aside(second.page)).toHaveAttribute('data-rail', 'true');
    await expect(second.page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
    await second.ctx.close();
  });
});
