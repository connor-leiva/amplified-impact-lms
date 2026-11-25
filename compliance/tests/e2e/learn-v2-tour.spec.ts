import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Browser, type Page, type Route, type TestInfo } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// `compliance/` can't resolve `@ai/core`, so these are relative, as `learn-v2-video.spec.ts` has them.
import { DB_KEY } from '../../../packages/core/src/constants';
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { seed } from '../../../packages/core/src/seed';
import type { Db } from '../../../packages/core/src/types';
import type { VideoBlock } from '../../../packages/core/src/course-types';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

/**
 * D-252: "How the LMS Works" on the flag-on fixture build, at 1280 and 390.
 *
 *   - The sign-in modal opens for the agent persona (a learner in the course who hasn't seen it), focus on Close,
 *     captions on by default and showing, the chapters under the player, both buttons in view. axe passes.
 *   - Week 0's pinned card, above the week, with the poster, the length and the play button; it plays the same modal.
 *   - Both learner frames: today's, and LMS v3's (for a test learner, as `v3On` has it), where the card sits above
 *     the Hero and Week 0 still draws with the tour in its Media.
 *
 * A FIXTURE BLOCK, NEVER THE PRODUCTION FILES. The video is the suite's own two-second test mp4 (what
 * `learn-v2-video.spec.ts` plays), the captions a two-cue vtt written here, and the poster a placeholder still this spec
 * renders, so its length reads 0:02. The real tour is uploaded in the Week Builder after the deploy.
 *
 * `TOUR_REVIEW_DIR` (optional) also saves the four screenshots there at device scale 2, for the PR.
 */

const LIVE = '2026-12-09T12:05:00-07:00';
const MP4 = readFileSync(fileURLToPath(new URL('./assets/two-seconds-vp9.mp4', import.meta.url)));
const KEY = 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-0000000000d1.mp4';
const POSTER_KEY = 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-0000000000d2.jpg';
const VTT_KEY = 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-0000000000d3.vtt';
const VTT = 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nWelcome in. This is your new home for the Accelerator.\n\n00:00:01.000 --> 00:00:02.000\nStart on Home, then open Week 0.\n';

const tour: VideoBlock = {
  type: 'video',
  id: 'lms-tour',
  title: 'How the LMS Works',
  source: { upload: KEY, name: 'tour.mp4', size: MP4.length, type: 'video/mp4' },
  poster: { upload: POSTER_KEY, name: 'tour-poster.jpg', size: 1, type: 'image/jpeg' },
  transcript: { upload: VTT_KEY, name: 'tour.vtt', size: VTT.length, type: 'text/vtt' },
  chapters: [
    { t: 0, label: 'Welcome to the Accelerator' },
    { t: 0.5, label: 'Home' },
    { t: 1, label: 'Week 0 Foundations' },
    { t: 1.5, label: 'Schedule' },
  ],
  durationS: 2,
  tour: true,
};

const deployed = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
deployed.modules.find((m) => m.id === 'accelerator-week-0')!.course!.media.push(tour);
const copy = Object.fromEntries((deployed.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value]));
const course = { open: true, preview: false, prelaunch: false, course: courseFor(deployed, Date.parse(LIVE), { open: true, preview: false }), sessions: courseSessions(deployed), copy };

/** Which learner frame: today's, or LMS v3's, which draws for a test learner (`v3On`) whatever the build flag says. */
type Frame = 'today' | 'v3';
function snapshot(frame: Frame): Db {
  const db = seed('live');
  db.modules.push(...deployed.modules.filter((m) => m.id.startsWith('accelerator-week-')));
  db.cohorts = [...deployed.cohorts, ...db.cohorts.filter((c) => !deployed.cohorts.some((x) => x.id === c.id))];
  if (frame === 'v3') db.users.find((u) => u.id === 'u_jamie')!.test = true;
  return db;
}
const DB: Record<Frame, string> = { today: JSON.stringify(snapshot('today')), v3: JSON.stringify(snapshot('v3')) };

let POSTER: Buffer = Buffer.alloc(0);
/** A placeholder still for the fixture's poster: the brand's forest with the title, as a jpg. */
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.setContent(
    '<body style="margin:0"><div style="box-sizing:border-box;width:1280px;height:720px;padding:72px;background:#1f4d40;color:#f5f5f2;font:600 72px/1.1 system-ui,sans-serif">How the<br>LMS Works</div></body>',
  );
  POSTER = await page.screenshot({ type: 'jpeg', quality: 85 });
  await page.close();
});

function serve(route: Route): Promise<void> {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith('.vtt')) return route.fulfill({ status: 200, body: VTT, headers: { 'content-type': 'text/vtt' } });
  if (path.endsWith('.jpg')) return route.fulfill({ status: 200, body: POSTER, headers: { 'content-type': 'image/jpeg' } });
  const range = /bytes=(\d*)-(\d*)/.exec(route.request().headers()['range'] ?? '');
  const base = { 'content-type': 'video/mp4', 'accept-ranges': 'bytes' };
  if (!range) return route.fulfill({ status: 200, body: MP4, headers: base });
  const start = range[1] ? Number(range[1]) : Math.max(0, MP4.length - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), MP4.length - 1) : MP4.length - 1;
  return route.fulfill({ status: 206, body: MP4.subarray(start, end + 1), headers: { ...base, 'content-range': `bytes ${start}-${end}/${MP4.length}` } });
}

async function open(browser: Browser, path: string, width: number, writes: string[], frame: Frame = 'today'): Promise<Page> {
  // A context of its own (axe refuses a page from browser.newPage()), at device scale 2 for the review copies.
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 2, timezoneId: 'America/Denver' });
  const page = await ctx.newPage();
  await page.addInitScript(([key, db]) => localStorage.setItem(key, db), [DB_KEY, DB[frame]] as const);
  await page.route('**/api/course', (r) => r.fulfill({ json: course }));
  await page.route('**/api/files/course/**', serve);
  page.on('request', (r) => {
    if (r.url().includes('/api/mutate/')) writes.push(r.url());
  });
  await page.goto(`${APP_BASE}${path}?as=agent&now=${encodeURIComponent(LIVE)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  await page.locator('h1').first().waitFor();
  return page;
}

async function shot(page: Page, info: TestInfo, name: string): Promise<void> {
  const body = await page.screenshot({ animations: 'disabled' });
  await info.attach(name, { body, contentType: 'image/png' });
  const dir = process.env.TOUR_REVIEW_DIR;
  if (dir) {
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, name), animations: 'disabled' });
  }
}

/** Play the first half second and stop, so a caption is on screen. */
async function showCaption(page: Page): Promise<void> {
  const video = page.locator('[role="dialog"] video');
  await video.evaluate(
    (v: HTMLVideoElement) =>
      new Promise<void>((resolve) => {
        if (v.readyState >= 1) resolve();
        else v.addEventListener('loadedmetadata', () => resolve(), { once: true });
      }),
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Play How the LMS Works' }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3);
  await video.evaluate((v: HTMLVideoElement) => {
    v.pause();
    v.currentTime = 0.4;
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => (v.textTracks[0]?.mode === 'showing' ? (v.textTracks[0].activeCues?.length ?? 0) : -1)))
    .toBeGreaterThan(0);
}

for (const frame of ['today', 'v3'] as const) {
  for (const width of [1280, 390]) {
  const tag = frame === 'v3' ? `-v3-${width}` : `-${width}`;
  test(`the sign-in modal at ${width} (${frame}): captions on, chapters, both buttons in view`, async ({ browser }, info) => {
    const writes: string[] = [];
    const page = await open(browser, '/learn', width, writes, frame);
    const dialog = page.getByRole('dialog', { name: 'How the LMS Works' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    await expect(dialog).toContainText('0:02 · A quick tour of your new home for the Accelerator. Watch it with your AI Implementer.');
    await expect(dialog.locator('track')).toHaveAttribute('default', '');
    await expect(dialog.getByRole('list', { name: /Chapters/ })).toBeVisible();
    // Both buttons are on screen with the player, without scrolling.
    for (const name of ['Watch Later', 'I’ve Seen It']) await expect(dialog.getByRole('button', { name })).toBeInViewport();
    const box = (await dialog.locator('video').boundingBox())!;
    expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(0.02);
    if (width < 768) expect(box.width).toBeGreaterThan(width - 40);
    await showCaption(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await expectAccessible(page);
    await shot(page, info, `modal${tag}.png`);
    // Watch Later closes it, and nothing is written.
    await dialog.getByRole('button', { name: 'Watch Later' }).click();
    await expect(dialog).toHaveCount(0);
    expect(writes).toEqual([]);
    await page.context().close();
  });

  test(`Week 0’s pinned card at ${width} (${frame}), and it plays the tour`, async ({ browser }, info) => {
    const writes: string[] = [];
    const page = await open(browser, '/learn/week/0', width, writes, frame);
    // v3 draws Week 0 with the tour in its Media (the card is its place), never falling back to today's page.
    if (frame === 'v3') await expect(page.locator('[data-week-page]')).toBeVisible();
    // The modal opened by itself on sign-in; Watch Later, then the page.
    await page.getByRole('dialog', { name: 'How the LMS Works' }).getByRole('button', { name: 'Watch Later' }).click();
    const card = page.locator('[data-lms-tour-card]');
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { name: 'How the LMS Works' })).toBeVisible();
    await expect(card).toContainText('0:02');
    await expect(card.locator('img')).toHaveAttribute('src', `/api/files/course/${POSTER_KEY}`);
    await expect.poll(() => card.locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await card.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await expectAccessible(page);
    // At 1280 the card is above the fold; on a phone, the card whole, centred.
    if (width < 768) await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    else await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, info, `week0-card${tag}.png`);
    await card.getByRole('button', { name: 'Watch the Tour' }).click();
    const dialog = page.getByRole('dialog', { name: 'How the LMS Works' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Watch Later' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Watch the Tour' })).toBeFocused();
    expect(writes).toEqual([]);
    await page.context().close();
  });
  }
}

test('I’ve Seen It sends lms-tour-seen once, and the modal stays shut on the next load', async ({ browser }) => {
  const writes: string[] = [];
  const page = await open(browser, '/learn', 1280, writes);
  await page.getByRole('dialog', { name: 'How the LMS Works' }).getByRole('button', { name: 'I’ve Seen It' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // The fixture build runs the mutation in the browser (no request); the pref is on the stored snapshot.
  const prefs = await page.evaluate((key) => {
    const db = JSON.parse(localStorage.getItem(key) ?? '{}') as Db;
    return db.users?.find((u) => u.id === 'u_jamie')?.coursePrefs ?? [];
  }, DB_KEY);
  expect(prefs.map((p) => [p.key, p.value])).toContainEqual(['lms-tour-seen', '1']);
  await page.context().close();
});
