import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// The course as the API sends it, built from the deployed seed. `compliance/` can't resolve `@ai/core`,
// so these are relative; the seed's own imports are relative too.
import { DB_KEY, DB_V } from '../../../packages/core/src/constants';
import { attachReplay } from '../../../packages/core/src/admin-actions';
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import type { Db } from '../../../packages/core/src/types';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

/**
 * D-183: what the current portal does around a live session, in the learner portal v2 (/learn), in the
 * fixture build (where its flag is on), with `GET /api/course` answered from the deployed seed.
 *
 *   join      Join shows at start minus 15 (Home's hero, the bar, the Schedule's hero and the week's row)
 *             and not at start minus 16, when the Schedule's next row draws it off with "Opens 15 Min
 *             Before". The fixture's `?now=` pins the clock.
 *   banner    the fixture snapshot's in-app announcement (the demo's moved session) shows on Home.
 *   live      a session set live in the snapshot (Go Live, hours early) shows the live badge and Join
 *             on its week, in the bar and on Home; one ended with its replay published shows the
 *             player, which plays.
 *   a11y      zero serious or critical axe violations on each, at 1440 and 390; on a phone, 44px targets
 *             and no text under 16px.
 *
 * The live and replay cases store a snapshot in the fixture's own localStorage key: the deployed seed's
 * course with the Console's state on one session, and the fixture persona as a learner in its cohort.
 */

const S1 = Date.parse('2026-12-02T12:00:00-07:00');
const MIN = 60_000;
const iso = (t: number) => new Date(t).toISOString();
const deployed = (): Db => planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const base = deployed();
const copy = Object.fromEntries((base.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value]));
const course = (at: number, preview: boolean) => ({ open: true, preview: false, prelaunch: preview, course: courseFor(base, at, { open: true, preview }), sessions: courseSessions(base), copy });

/** The snapshot a fixture tab reads: the deployed seed, the persona as a learner, and the Console's edit. */
function snapshot(edit: (d: Db) => void): string {
  const d = deployed();
  d.v = DB_V;
  d.users.push({ id: 'u_jamie', name: 'Jamie Park', email: 'jamie@example.com', tier: 'team', role: 'Team Owner', teamId: null, cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} });
  edit(d);
  return JSON.stringify(d);
}

async function open(browser: Browser, path: string, width: number, now: number, payload: object, db?: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, timezoneId: 'America/Denver' });
  const page = await ctx.newPage();
  if (db) await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [DB_KEY, db] as const);
  await page.route('**/api/course', (r) => r.fulfill({ json: payload }));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=agent&now=${encodeURIComponent(iso(now))}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  return page;
}

/** Visible text under 16px, the repo's phone floor (D-156), as learn-v2-phone.spec.ts reads it. */
function smallType(page: Page) {
  return page.evaluate(() => {
    const out = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const p = n.parentElement;
      if (!(n.textContent ?? '').trim() || !p || p.closest('svg, script, style, noscript')) continue;
      let hidden = false;
      for (let e: Element | null = p; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || e.getAttribute('aria-hidden') === 'true' || (e as HTMLElement).inert) hidden = true;
        if (cs.position === 'absolute' && cs.overflow === 'hidden' && parseFloat(cs.width) <= 1) hidden = true;
      }
      const r = p.getBoundingClientRect();
      if (hidden || !(r.width > 0 && r.height > 0)) continue;
      const size = parseFloat(getComputedStyle(p).fontSize);
      if (size < 16) out.add(`${(n.textContent ?? '').trim().slice(0, 30)} ${size}px`);
    }
    return [...out];
  });
}

/** Controls under 44px in their smaller dimension, at a phone width (as learn-v2-phone.spec.ts counts). */
function smallTargets(page: Page) {
  return page.evaluate(() => {
    const hidden = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return true;
        if (e.getAttribute('aria-hidden') === 'true' || (e as HTMLElement).inert) return true;
        if (cs.position === 'absolute' && cs.overflow === 'hidden' && parseFloat(cs.width) <= 1 && parseFloat(cs.height) <= 1) return true;
      }
      const r = el.getBoundingClientRect();
      return !(r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth);
    };
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('main a[href], main button, main input, main [role=slider], header button, header a[href]'))) {
      if (hidden(el) || (el as HTMLButtonElement).disabled) continue;
      const cs = getComputedStyle(el);
      if (el.tagName === 'A' && cs.display === 'inline') {
        const block = el.parentElement;
        if (block && Array.from(block.childNodes).some((c) => c !== el && /[\p{L}\p{N}]/u.test(c.textContent ?? ''))) continue;
      }
      const r = el.getBoundingClientRect();
      const t = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || '').trim().slice(0, 40);
      if (Math.min(r.width, r.height) < 43.5) out.push(`${el.tagName.toLowerCase()} "${t}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return out;
  });
}

const pre = course(S1 - 16 * MIN, true);
const liveDb = snapshot((d) => {
  d.sessions.find((s) => s.id === 'dec26-s2')!.live = true;
});
const LIVE_AT = Date.parse('2026-12-09T09:00:00-07:00');
const REPLAY_AT = Date.parse('2026-12-05T10:00:00-07:00');
/** D-183: staff attach a recording to Week 1's build in the Console (core's own Attach replay), after it ended. */
const ATTACHED = 'https://media.example.test/replays/week-1.mp4';
const ZOOM_SHARE = 'https://us02web.zoom.us/rec/share/week-one';
const attached = (url: string) =>
  snapshot((d) => {
    const out = attachReplay(d, { kind: 'staff', staffId: d.staff[0]!.id }, { sessionId: 'dec26-s1', url }, { now: REPLAY_AT, id: (p: string) => `${p}1` });
    if (out.error) throw new Error(out.error);
    Object.assign(d, out.db);
  });
const fileDb = attached(ATTACHED);
const zoomDb = attached(ZOOM_SHARE);
const replayDb = snapshot((d) => {
  Object.assign(d.sessions.find((s) => s.id === 'dec26-s1')!, { replay: 'ready', attended: 12 });
  d.modules.find((m) => m.id === 'accelerator-week-1')!.dur = 4800;
});

test.describe('learner portal v2, the live session (D-183) @g9', () => {
  test('Join enabled at start-15m on Home, the top bar and the Schedule; at start-16m absent, the next row off with “Opens 15 Min Before” @parity:D-2 @parity:S-2 @parity:A-8 @parity:M-2', async ({ browser }) => {
    const early = await open(browser, '/learn', 1440, S1 - 16 * MIN, pre);
    await expect(early.getByRole('button', { name: /^Join/ })).toHaveCount(0);
    await early.goto(`${APP_BASE}/learn/schedule?as=agent&now=${encodeURIComponent(iso(S1 - 16 * MIN))}`);
    await early.waitForSelector('body[data-app-ready="true"]');
    const off = early.getByRole('button', { name: 'Join' });
    await expect(off).toHaveAttribute('aria-disabled', 'true');
    await expect(early.getByText('Opens 15 Min Before')).toBeVisible();
    await early.context().close();

    const on = await open(browser, '/learn', 1440, S1 - 15 * MIN, pre);
    await expect(on.getByRole('region', { name: 'Map Your Spend Live Build' }).getByRole('button', { name: 'Join the live build' })).toBeVisible();
    await expect(on.locator('header').getByText('Starting soon')).toBeVisible();
    await expect(on.locator('header').getByRole('button', { name: 'Join' })).toBeVisible();
    await on.goto(`${APP_BASE}/learn/schedule?as=agent&now=${encodeURIComponent(iso(S1 - 15 * MIN))}`);
    await on.waitForSelector('body[data-app-ready="true"]');
    await expect(on.getByRole('group', { name: 'Starting soon: Map Your Spend Live Build' }).getByRole('button', { name: 'Join' })).toBeVisible();
    await on.context().close();
  });

  test('the in-app announcement (the demo’s moved session) shows on Home, with Update Calendar and Dismiss @parity:D-1 @parity:A-5', async ({ browser }) => {
    const page = await open(browser, '/learn', 1440, S1 - 16 * MIN, pre);
    const banner = page.getByRole('alert').filter({ hasText: 'moved to' });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Update Calendar' })).toBeVisible();
    await banner.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'moved to' })).toHaveCount(0);
    await page.context().close();
  });

  test('a session set live (Go Live, hours early) shows Live now and Join on its week, the top bar and Home @parity:C-1 @parity:E-9', async ({ browser }) => {
    const page = await open(browser, '/learn/week/2', 1440, LIVE_AT, course(LIVE_AT, false), liveDb);
    const card = page.getByRole('region', { name: 'Live now' });
    await expect(card.getByRole('button', { name: 'Join the live build' })).toBeVisible();
    await expect(page.locator('header').getByText('Live now')).toBeVisible();
    await page.goto(`${APP_BASE}/learn?as=agent&now=${encodeURIComponent(iso(LIVE_AT))}`);
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(page.getByText('Live now · Week 2')).toBeVisible();
    await page.context().close();
  });

  test('an ended session with its replay published: the week page’s player plays, Watch at seeks, the Schedule says Replay Ready with Watch Replay @parity:E-1 @parity:E-2 @parity:E-17 @parity:C-3 @parity:M-3 @parity:S-3 @parity:S-4', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', 1440, REPLAY_AT, course(REPLAY_AT, false), replayDb);
    const player = page.getByRole('region', { name: 'Session replay' });
    await expect(player).toContainText('0:00 / 1:20:00');
    await expect(page.getByRole('button', { name: /^Join/ })).toHaveCount(0);
    await player.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(player.getByRole('slider', { name: 'Seek' })).not.toHaveAttribute('aria-valuenow', '0', { timeout: 5000 });
    await player.getByRole('button', { name: 'Pause', exact: true }).click();
    // Each step's chapter, "Watch at mm:ss", seeks the player to it.
    await player.getByRole('button', { name: /Watch at 10:00/ }).first().click();
    await expect(player).toContainText('10:00 / 1:20:00');
    // A live-build step's player, and its own "Watch at".
    await page.goto(`${APP_BASE}/learn/week/1/step/5?as=agent&now=${encodeURIComponent(iso(REPLAY_AT))}`);
    await page.waitForSelector('body[data-app-ready="true"]');
    await page.getByRole('button', { name: 'Watch at 50:00', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Session replay' })).toContainText('50:00 / 1:20:00');
    // The Schedule: Replay Ready and Watch Replay, to the week's player.
    await page.goto(`${APP_BASE}/learn/schedule?as=agent&now=${encodeURIComponent(iso(REPLAY_AT))}`);
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(page.getByRole('link', { name: 'Watch Replay: Map Your Spend Live Build' })).toHaveAttribute('href', '/learn/week/1');
    await page.context().close();
  });

  test('before the course opens: the pre-launch welcome beside the countdown on Home, accessible at 1440 and 390 @parity:K-14 @parity:G-7', async ({ browser }) => {
    for (const width of [1440, 390]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'America/Denver' });
      const page = await ctx.newPage();
      await page.route('**/api/course', (r) => r.fulfill({ status: 403, json: { open: false, upcoming: true, opensAt: S1, error: 'Your AI Accelerator opens at the first live build.' } }));
      await page.goto(`${APP_BASE}/learn?as=agent&now=${encodeURIComponent(iso(S1 - 3 * 86400_000))}`);
      await page.waitForSelector('body[data-app-ready="true"]');
      await expect(page.getByRole('heading', { name: 'You’re in the Amplified AI Accelerator.' })).toBeVisible();
      await expect(page.getByText('Live sessions start Wednesday, Dec 2, at 12:00 PM MT (1:00 PM CT).', { exact: false })).toBeVisible();
      await expect(page.getByRole('timer')).toBeVisible();
      await expectAccessible(page);
      await ctx.close();
    }
  });

  test('a recording attached in the Console plays on the week page: its video element gets the source @parity:E-1 @parity:C-3 @parity:M-3', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Denver' });
    const page = await ctx.newPage();
    await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [DB_KEY, fileDb] as const);
    await page.route('**/api/course', (r) => r.fulfill({ json: course(REPLAY_AT, false) }));
    await page.route(ATTACHED, (r) => r.fulfill({ status: 200, contentType: 'video/mp4', body: '' }));
    await page.goto(`${APP_BASE}/learn/week/1?as=agent&now=${encodeURIComponent(iso(REPLAY_AT))}`);
    await page.waitForSelector('body[data-app-ready="true"]');
    const player = page.getByRole('region', { name: 'Session replay' });
    await expect(player.locator('video')).toHaveAttribute('src', ATTACHED);
    await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await expectAccessible(page);
    await ctx.close();
  });

  test('a recording on another site: "Watch Replay" opens it in a new tab @parity:E-1 @parity:C-3', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', 1440, REPLAY_AT, course(REPLAY_AT, false), zoomDb);
    const link = page.getByRole('region', { name: 'Session replay' }).getByRole('link', { name: 'Watch Replay' });
    await expect(link).toHaveAttribute('href', ZOOM_SHARE);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener');
    await expectAccessible(page);
    await page.context().close();
  });

  const SCREENS = [
    { name: 'Home with the announcement and Join', path: '/learn', now: S1 - 15 * MIN, payload: pre, db: undefined },
    { name: 'the Schedule with Join', path: '/learn/schedule', now: S1 - 15 * MIN, payload: pre, db: undefined },
    { name: 'the Schedule with the next row’s hint', path: '/learn/schedule', now: S1 - 16 * MIN, payload: pre, db: undefined },
    { name: 'a live week', path: '/learn/week/2', now: LIVE_AT, payload: course(LIVE_AT, false), db: liveDb },
    { name: 'a week with its replay', path: '/learn/week/1', now: REPLAY_AT, payload: course(REPLAY_AT, false), db: replayDb },
    { name: 'a live-build step with its replay', path: '/learn/week/1/step/5', now: REPLAY_AT, payload: course(REPLAY_AT, false), db: replayDb },
    { name: 'the Schedule after a replay', path: '/learn/schedule', now: REPLAY_AT, payload: course(REPLAY_AT, false), db: replayDb },
    { name: 'a week whose recording is on another site', path: '/learn/week/1', now: REPLAY_AT, payload: course(REPLAY_AT, false), db: zoomDb },
  ];
  for (const width of [1440, 390])
    for (const s of SCREENS)
      test(`${s.name} at ${width}: one h1, accessible, no sideways scroll${width < 768 ? ', 44px targets, 16px type @parity:MO-5' : ''}`, async ({ browser }) => {
        const page = await open(browser, s.path, width, s.now, s.payload, s.db);
        await expect(page.locator('h1')).toHaveCount(1);
        if (s.path === '/learn/week/1' && s.db !== zoomDb) {
          // The transcript panel open too.
          await page.getByRole('button', { name: 'Transcript' }).click();
        }
        await expectAccessible(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
        if (width < 768) {
          expect(await smallTargets(page), 'targets under 44px').toEqual([]);
          expect(await smallType(page), 'text under 16px').toEqual([]);
        }
        await page.context().close();
      });
});
