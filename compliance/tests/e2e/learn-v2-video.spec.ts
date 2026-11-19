import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Browser, type Page, type Route } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// `compliance/` can't resolve `@ai/core`, so these are relative, as `learn-v2-content.spec.ts` has them.
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
 * D-188: a video block, built in the Week Builder and played on the learner's step page and week Media,
 * on the flag-on fixture build.
 *
 *   - The builder adds a link video and an uploaded mp4 to a step's paths. Fixture mode has no bucket:
 *     the file is recorded, never sent (no `upload-url`, no PUT), and the save goes through.
 *   - The learner's step page plays an uploaded video from its same-origin API address in a `<video>`:
 *     `GET /api/course` is answered from the deployed seed with videos in Week 1, and the API's
 *     `/api/files/course/<key>` is stubbed with a two-second VP9 mp4 (Chromium's open codecs), served
 *     with Range as the API serves it. It plays, seeks, and takes the keyboard focus; a link to another
 *     site is a Watch link to a new tab. axe passes at 1440 and 390.
 */

const LIVE = '2026-12-09T12:05:00-07:00';
const MP4 = readFileSync(fileURLToPath(new URL('./assets/two-seconds-vp9.mp4', import.meta.url)));
const KEY = 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-000000000001.mp4';
const MEDIA_KEY = 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-000000000002.mp4';

const deployed = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const upload = (key: string, title: string): VideoBlock => ({ type: 'video', source: { upload: key, name: 'Build.mp4', size: MP4.length, type: 'video/mp4' }, title });
// Week 1, step 1: an uploaded video and a link in the Claude path, a Loom link in the ChatGPT path; one more in Media.
const w1 = deployed.modules.find((m) => m.id === 'accelerator-week-1')!;
w1.checklist[0]!.paths = {
  claude: { blocks: [{ type: 'text', text: 'Watch this first.' }, upload(KEY, 'Watch the build')] },
  chatgpt: { blocks: [{ type: 'video', source: { url: 'https://www.loom.com/share/abc' }, title: 'Walkthrough' }] },
};
w1.course!.media = [...w1.course!.media, upload(MEDIA_KEY, 'Week 1 recap')];
const copy = Object.fromEntries((deployed.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value]));
const course = { open: true, preview: false, prelaunch: false, course: courseFor(deployed, Date.parse(LIVE), { open: true, preview: false }), sessions: courseSessions(deployed), copy };

/** The demo's snapshot with the course's week modules in it, as the fixture build reads it from localStorage. */
function snapshot(): Db {
  const db = seed('live');
  db.modules.push(...deployed.modules.filter((m) => m.id.startsWith('accelerator-week-')));
  db.cohorts = [...deployed.cohorts, ...db.cohorts.filter((c) => !deployed.cohorts.some((x) => x.id === c.id))];
  return db;
}
const DB = JSON.stringify(snapshot());

/** `/api/files/course/<key>` as the API answers it: the object, a single Range as 206. */
function serveVideo(route: Route): Promise<void> {
  const range = /bytes=(\d*)-(\d*)/.exec(route.request().headers()['range'] ?? '');
  const base = { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=300', 'content-disposition': 'inline; filename="Build.mp4"' };
  if (!range) return route.fulfill({ status: 200, body: MP4, headers: base });
  const start = range[1] ? Number(range[1]) : Math.max(0, MP4.length - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), MP4.length - 1) : MP4.length - 1;
  return route.fulfill({ status: 206, body: MP4.subarray(start, end + 1), headers: { ...base, 'content-range': `bytes ${start}-${end}/${MP4.length}` } });
}

interface Opened {
  page: Page;
  asked: { url: string; range: string | undefined }[];
  uploads: string[];
}

async function open(browser: Browser, path: string, width: number, as: 'agent' | 'admin' = 'agent'): Promise<Opened> {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, timezoneId: 'America/Denver' });
  const page = await ctx.newPage();
  const asked: Opened['asked'] = [];
  const uploads: string[] = [];
  await page.addInitScript(([key, db]) => localStorage.setItem(key, db), [DB_KEY, DB] as const);
  await page.route('**/api/course', (r) => r.fulfill({ json: course }));
  await page.route('**/api/files/course/**', (r) => {
    asked.push({ url: r.request().url(), range: r.request().headers()['range'] });
    return serveVideo(r);
  });
  page.on('request', (r) => {
    if (r.url().includes('/api/files/upload-url') || r.method() === 'PUT') uploads.push(`${r.method()} ${r.url()}`);
  });
  await page.goto(`${APP_BASE}${path}?as=${as}&now=${encodeURIComponent(LIVE)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  await page.locator('h1').first().waitFor();
  return { page, asked, uploads };
}

test.describe('a course video block (D-188)', () => {
  test('the builder adds a link video and an uploaded mp4 to a step, recorded without a bucket, and saves', async ({ browser }) => {
    const { page, uploads } = await open(browser, '/admin/curriculum/accelerator-week-2', 1440, 'admin');
    await page.getByRole('row').filter({ has: page.getByRole('textbox', { name: 'Step 1 title' }) }).getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit step details' }).click();
    const dialog = page.getByRole('dialog', { name: 'Step 1' });

    // A link, in the ChatGPT path.
    const chatgpt = dialog.getByRole('group', { name: 'ChatGPT path' });
    await chatgpt.getByRole('combobox', { name: 'ChatGPT path: kind of block to add' }).selectOption('video');
    await chatgpt.getByRole('button', { name: 'Add block' }).click();
    await chatgpt.getByRole('textbox', { name: /^Block \d+ link$/ }).last().fill('https://www.loom.com/share/abc');
    await chatgpt.getByRole('textbox', { name: /^Block \d+ title$/ }).last().fill('Walkthrough');

    // An uploaded mp4, in the Claude path.
    const claude = dialog.getByRole('group', { name: 'Claude path' });
    await claude.getByRole('combobox', { name: 'Claude path: kind of block to add' }).selectOption('video');
    await claude.getByRole('button', { name: 'Add block' }).click();
    await claude.getByRole('radio', { name: 'Upload an mp4' }).last().check();
    await expect(claude.getByText('No file yet.')).toBeVisible();
    await claude.locator('input[type=file]').last().setInputFiles({ name: 'Build.mp4', mimeType: 'video/mp4', buffer: MP4 });
    await expect(claude.getByText(`Build.mp4 · ${Math.round(MP4.length / 1000)} KB`)).toBeVisible();
    await claude.getByRole('textbox', { name: /^Block \d+ title$/ }).last().fill('Watch the build');
    await expectAccessible(page);
    // Fixture mode: recorded, nothing sent anywhere.
    expect(uploads).toEqual([]);

    await dialog.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

    // The live preview shows both: the upload in a <video> from this origin (this tab's own copy, until a
    // reload, then the API's address), the link as Watch.
    await page.getByRole('button', { name: /Preview/ }).first().click();
    const frame = page.getByTestId('course-preview');
    await frame.getByRole('link', { name: /^Step 1,/ }).first().click();
    const video = frame.locator('video[data-video-block]');
    await expect(video).toHaveCount(1);
    const src = (await video.getAttribute('src'))!;
    expect(new URL(src.replace(/^blob:/, '')).origin).toBe(new URL(APP_BASE).origin);
    await frame.getByRole('radio', { name: 'ChatGPT' }).click();
    await expect(frame.getByRole('link', { name: 'Watch Walkthrough' })).toHaveAttribute('target', '_blank');
    await page.context().close();
  });

  test('the learner’s step page plays an uploaded video from its same-origin address, seeks, and opens a link in a new tab', async ({ browser }) => {
    const { page, asked } = await open(browser, '/learn/week/1/step/1', 1440);
    const video = page.locator('video[data-video-block]');
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute('src', `/api/files/course/${KEY}`);
    await expect(video).toHaveAttribute('controls', '');
    await expect(page.getByText('Watch the build')).toBeVisible();

    // It plays, from this origin, asked for with a Range.
    await video.evaluate((v: HTMLVideoElement) => {
      v.muted = true;
      return v.play();
    });
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
    expect(await video.evaluate((v: HTMLVideoElement) => new URL(v.currentSrc).origin)).toBe(new URL(APP_BASE).origin);
    expect(asked.length).toBeGreaterThan(0);
    expect(new URL(asked[0]!.url).pathname).toBe(`/api/files/course/${KEY}`);
    expect(asked.some((a) => a.range?.startsWith('bytes='))).toBe(true);

    // It seeks.
    await video.evaluate((v: HTMLVideoElement) => v.pause());
    await video.evaluate(
      (v: HTMLVideoElement) =>
        new Promise<void>((resolve) => {
          v.addEventListener('seeked', () => resolve(), { once: true });
          v.currentTime = 1.5;
        }),
    );
    expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeCloseTo(1.5, 0);

    // It takes the keyboard focus (the browser's own controls take the play and seek keys from there).
    await video.focus();
    expect(await video.evaluate((v) => document.activeElement === v)).toBe(true);

    // The ChatGPT path's Loom link opens in a new tab, never inline.
    await page.getByRole('radio', { name: 'ChatGPT' }).click();
    const watch = page.getByRole('link', { name: 'Watch Walkthrough' });
    await expect(watch).toHaveAttribute('href', 'https://www.loom.com/share/abc');
    await expect(watch).toHaveAttribute('target', '_blank');
    await expect(page.locator('video[data-video-block]')).toHaveCount(0);
    await page.context().close();
  });

  test('the week’s Media plays its video too', async ({ browser }) => {
    const { page } = await open(browser, '/learn/week/1', 1440);
    const media = page.getByRole('region', { name: 'Media' });
    await expect(media.locator('video[data-video-block]')).toHaveAttribute('src', `/api/files/course/${MEDIA_KEY}`);
    await expect(media.getByText('Week 1 recap')).toBeVisible();
    await page.context().close();
  });

  for (const width of [1440, 390])
    for (const path of ['/learn/week/1/step/1', '/learn/week/1'])
      test(`${path} with a video at ${width}: accessible, no sideways scroll`, async ({ browser }) => {
        const { page } = await open(browser, path, width);
        await expect(page.locator('video[data-video-block]').first()).toBeVisible();
        await expectAccessible(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
        await page.context().close();
      });
});
