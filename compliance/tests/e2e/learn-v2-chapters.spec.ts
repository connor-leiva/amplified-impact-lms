import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Browser, type Page, type Route } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
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
 * D-191: a step video with chapters and a transcript, at the phone width and the desk width,
 * in both themes. The fixture course is this file's own. A block without these fields is the
 * other video spec, and the parity goldens are untouched.
 */

const LIVE = '2026-12-09T12:05:00-07:00';
const MP4 = readFileSync(fileURLToPath(new URL('./assets/two-seconds-vp9.mp4', import.meta.url)));
const KEY = 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa.mp4';
const POSTER = 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-0000000000bb.jpg';
const VTT_KEY = 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-0000000000cc.vtt';
const VTT = 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nWelcome in.\n\n00:00:01.000 --> 00:00:02.000\nThe starting line.\n';

const deployed = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const block: VideoBlock = {
  type: 'video',
  id: 'w0-02',
  draft: true,
  title: 'Watch the orientation',
  source: { upload: KEY, name: 'Orientation.mp4', size: MP4.length, type: 'video/mp4' },
  poster: { upload: POSTER, name: 'poster.jpg', size: 8, type: 'image/jpeg' },
  transcript: { upload: VTT_KEY, name: 'orientation.vtt', size: VTT.length, type: 'text/vtt' },
  chapters: [
    { t: 0, label: 'Welcome' },
    { t: 1, label: 'The starting line' },
  ],
};
const w1 = deployed.modules.find((m) => m.id === 'accelerator-week-1')!;
w1.checklist[0]!.paths = { claude: { blocks: [block] } };
const copy = Object.fromEntries((deployed.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value]));
const course = { open: true, preview: false, prelaunch: false, course: courseFor(deployed, Date.parse(LIVE), { open: true, preview: false }), sessions: courseSessions(deployed), copy };

function snapshot(): Db {
  const db = seed('live');
  db.modules.push(...deployed.modules.filter((m) => m.id.startsWith('accelerator-week-')));
  db.cohorts = [...deployed.cohorts, ...db.cohorts.filter((c) => !deployed.cohorts.some((x) => x.id === c.id))];
  return db;
}
const DB = JSON.stringify(snapshot());

function serve(route: Route): Promise<void> {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith('.vtt')) return route.fulfill({ status: 200, body: VTT, headers: { 'content-type': 'text/vtt' } });
  if (path.endsWith('.jpg')) return route.fulfill({ status: 200, body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]), headers: { 'content-type': 'image/jpeg' } });
  const range = /bytes=(\d*)-(\d*)/.exec(route.request().headers()['range'] ?? '');
  const base = { 'content-type': 'video/mp4', 'accept-ranges': 'bytes' };
  if (!range) return route.fulfill({ status: 200, body: MP4, headers: base });
  const start = range[1] ? Number(range[1]) : Math.max(0, MP4.length - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), MP4.length - 1) : MP4.length - 1;
  return route.fulfill({ status: 206, body: MP4.subarray(start, end + 1), headers: { ...base, 'content-range': `bytes ${start}-${end}/${MP4.length}` } });
}

async function open(browser: Browser, width: number, theme: 'light' | 'dark'): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: width < 768 ? 844 : 900 }, timezoneId: 'America/Denver' });
  await page.addInitScript(
    ([key, db, mode]) => {
      localStorage.setItem(key, db);
      if (mode === 'dark') localStorage.setItem('ai-lms-prefs', JSON.stringify({ learner: { u_jamie: { theme: 'dark' } } }));
    },
    [DB_KEY, DB, theme] as const,
  );
  await page.route('**/api/course', (r) => r.fulfill({ json: course }));
  await page.route('**/api/files/course/**', serve);
  await page.goto(`${APP_BASE}/learn/week/1/step/1?as=agent&now=${encodeURIComponent(LIVE)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  await page.locator('h1').first().waitFor();
  return page;
}

for (const width of [1440, 390])
  for (const theme of ['light', 'dark'] as const)
    test(`chapters and transcript at ${width}, ${theme}`, async ({ browser }) => {
      const page = await open(browser, width, theme);
      if (theme === 'dark') await expect(page.locator('[data-learner-v2]')).toHaveAttribute('data-lv-theme', 'dark');
      await expect(page.getByText('Draft video · narration coming')).toBeVisible();
      const video = page.locator('video[data-video-block]');
      await expect(video).toHaveAttribute('poster', `/api/files/course/${POSTER}`);
      const still = page.getByRole('img', { name: 'Watch the orientation' });
      await expect(still).toBeVisible();
      await expect(still).toHaveAttribute('src', `/api/files/course/${POSTER}`);
      await expect(page.getByRole('button', { name: 'Play Watch the orientation' })).toBeVisible();
      await video.evaluate(
        (v: HTMLVideoElement) =>
          new Promise<void>((resolve) => {
            if (v.readyState >= 1) resolve();
            else v.addEventListener('loadedmetadata', () => resolve(), { once: true });
          }),
      );
      const chapter = page.getByRole('button', { name: /The starting line/ });
      await chapter.click();
      await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.5);
      await expect(chapter).toHaveAttribute('aria-current', 'true');
      await page.getByRole('button', { name: 'Show transcript' }).click();
      const dialog = page.getByRole('dialog', { name: 'Transcript' });
      await expect(dialog).toHaveAttribute('data-drawer', 'open');
      await expect(dialog.getByRole('button', { name: /Welcome in/ })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      await expectAccessible(page);
      await page.context().close();
    });
