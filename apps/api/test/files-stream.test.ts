// D-188: files served same-origin, the Vault's real uploads, and a course week's uploaded videos.
//
// Through `app.inject` with real sessions, a real Postgres (the suite's per-run database) and an
// in-memory S3-compatible bucket on 127.0.0.1 (`fake-bucket.ts`), so the real SDK signs and sends the
// HEADs, GETs and Ranges the routes make, and the browser's PUT goes to the URL `upload-url` minted.
//
//   1. upload-url: every allowed type, each cap at its edge, and a name that doesn't match its type.
//   2. The Vault: Publish to Vault and Replace file save the key on the row (and the file's name),
//      audited, the old key in the replace's row; nothing is saved for an object that isn't there.
//   3. A download streamed with the right headers, and a Range: 206, a suffix, 416, and one ignored.
//   4. A course video: a learner in a week they may open gets it inline; a locked week's, a plan
//      without the course and an arbitrary key are each the routes' one 404; staff get every week's.
//
// The production course after the deploy's release plan, in the pre-launch preview (as
// `release.test.ts` has it): Week 0 open to a buyer, Week 1 locked until it opens.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { desc, eq } from 'drizzle-orm';
import type { Db, Learner } from '@ai/core';
import { ACCELERATOR_MODULE_IDS } from '@ai/core/accelerator';
import type { VideoBlock } from '@ai/core/course-types';
import { seedProduction } from '@ai/core/seed/curriculum';
import { planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionOrder } from '../src/billing/provision';
import type { Database } from '../src/db/client';
import { auditLog, modules, orders, resources, users } from '../src/db/schema';
import { MAX_UPLOAD_BYTES, MAX_VIDEO_UPLOAD_BYTES, resetS3 } from '../src/storage';
import { startFakeBucket } from './fake-bucket';
import type { FakeBucket } from './fake-bucket';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const MT = (iso: string): number => Date.parse(`${iso}-07:00`);
const BOUGHT = MT('2026-11-14T14:00:00');
const PREVIEW = MT('2026-11-18T12:00:00');
const IN_PREVIEW = MT('2026-11-20T09:00:00');
const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };

/** A buyer of the course, and one whose plan isn't the course. */
const BUYERS = {
  full: { plan: 'cohort', option: 'full', email: 'full@example.test' },
  insiders: { plan: 'membership', option: 'year_upfront', email: 'insider@example.test' },
} as const;
type Buyer = keyof typeof BUYERS;

const NO_PLAN: Learner = { id: 'u_noplan', name: 'No Plan', email: 'noplan@example.test', tier: 'team', role: 'Team Owner', teamId: null, cohortId: 'dec26', joined: BOUGHT, last: null, status: 'active', progress: {} };

/** Four uploaded videos: Week 0's step path, Week 0's Media, Week 1's step path (locked), and one in no block. */
const KEY = {
  week0Step: 'uploads/2026/11/aaaaaaaa-0000-4000-8000-000000000001.mp4',
  week0Media: 'uploads/2026/11/aaaaaaaa-0000-4000-8000-000000000002.mp4',
  week1Step: 'uploads/2026/11/aaaaaaaa-0000-4000-8000-000000000003.mp4',
  nowhere: 'uploads/2026/11/aaaaaaaa-0000-4000-8000-000000000004.mp4',
  poster: 'uploads/2026/11/aaaaaaaa-0000-4000-8000-000000000005.jpg',
  transcript: 'uploads/2026/11/aaaaaaaa-0000-4000-8000-000000000006.vtt',
  lockedPoster: 'uploads/2026/11/aaaaaaaa-0000-4000-8000-000000000007.jpg',
  stray: 'uploads/2026/11/aaaaaaaa-0000-4000-8000-000000000008.jpg',
} as const;
const VIDEO = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));
const POSTER = Buffer.from('poster');
const VTT = Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello\n');

const video = (key: string, name: string, extra: Pick<VideoBlock, 'poster' | 'transcript'> = {}): VideoBlock => ({
  type: 'video',
  source: { upload: key, name, size: VIDEO.length, type: 'video/mp4' },
  title: 'Watch this first',
  ...extra,
});

let handle: Database;
let bucket: FakeBucket;
let app: App;
const cookies = new Map<string, string>();

const at = (t: number): void => {
  process.env.FIXED_NOW = new Date(t).toISOString();
};
const get = (url: string, who: string, headers: Record<string, string> = {}) => app.inject({ method: 'GET', url, headers: { cookie: cookies.get(who)!, ...headers } });
const post = (url: string, who: string, payload: unknown) =>
  app.inject({ method: 'POST', url, payload: payload as object, headers: { cookie: cookies.get(who)!, 'content-type': 'application/json' } });
const courseVideo = (key: string) => `/api/files/course/${key}`;

/** The production course after the release plan, the preview open, with videos in Weeks 0 and 1. */
async function setUp(): Promise<void> {
  const db: Db = planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db;
  db.cohorts[0]!.previewOpensAt = PREVIEW;
  const w0 = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!;
  const w1 = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[1])!;
  w0.checklist[0]!.paths = {
    ...(w0.checklist[0]!.paths ?? {}),
    claude: {
      blocks: [
        ...(w0.checklist[0]!.paths?.claude?.blocks ?? []),
        video(KEY.week0Step, 'Week 0 setup.mp4', {
          poster: { upload: KEY.poster, name: 'Week 0 poster.jpg', size: POSTER.length, type: 'image/jpeg' },
          transcript: { upload: KEY.transcript, name: 'Week 0.vtt', size: VTT.length, type: 'text/vtt' },
        }),
      ],
    },
  };
  w0.course!.media = [...w0.course!.media, video(KEY.week0Media, 'Orientation.mp4')];
  w1.checklist[0]!.paths = {
    chatgpt: {
      blocks: [
        video(KEY.week1Step, 'Week 1 build.mp4', {
          poster: { upload: KEY.lockedPoster, name: 'Week 1 poster.jpg', size: POSTER.length, type: 'image/jpeg' },
        }),
      ],
    },
  };
  db.users.push(NO_PLAN);
  await resetDatabase(db);
  for (const buyer of Object.keys(BUYERS) as Buyer[]) {
    const b = BUYERS[buyer];
    const id = `ord_${buyer}`;
    await handle.insert(orders).values({ id, plan: b.plan, option: b.option, origin: 'payment_link', status: 'paid', name: buyer, email: b.email, company: `${buyer} group`, crm: 'follow_up_boss', createdAt: BOUGHT });
    const out = await provisionOrder(id, { db: handle, log: silent, now: BOUGHT, invitesFrom: BOUGHT, invitesEnabled: false });
    if (!out.ok) throw new Error(`provisioning ${buyer} failed: ${out.reason}`);
    const [u] = await handle.select({ id: users.id }).from(users).where(eq(users.email, b.email));
    const minter = await build({ logger: false });
    cookies.set(buyer, await minter.signInAs(u!.id));
    await minter.close();
  }
  await handle.update(users).set({ status: 'active' }).where(eq(users.kind, 'learner'));
  const minter = await build({ logger: false });
  cookies.set('noPlan', await minter.signInAs(NO_PLAN.id));
  cookies.set('staff', await minter.signInAs('st_owner'));
  await minter.close();
}

beforeAll(async () => {
  at(IN_PREVIEW);
  bucket = await startFakeBucket();
  Object.assign(process.env, bucket.env);
  resetS3();
  handle = await testDatabase();
  await setUp();
}, 120_000);
afterAll(async () => {
  delete process.env.FIXED_NOW;
  for (const k of Object.keys(bucket.env)) delete process.env[k];
  resetS3();
  await bucket.close();
});
beforeEach(async () => {
  at(IN_PREVIEW);
  bucket.anyKey = false;
  bucket.objects.clear();
  bucket.requests.length = 0;
  for (const k of [KEY.week0Step, KEY.week0Media, KEY.week1Step, KEY.nowhere]) bucket.put(k, VIDEO, 'video/mp4');
  bucket.put(KEY.poster, POSTER, 'image/jpeg');
  bucket.put(KEY.lockedPoster, POSTER, 'image/jpeg');
  bucket.put(KEY.stray, POSTER, 'image/jpeg');
  bucket.put(KEY.transcript, VTT, 'text/vtt');
  Object.assign(process.env, bucket.env);
  resetS3();
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});

// =================================================================================================
// 1 · upload-url, for every type and both caps
// =================================================================================================

describe('POST /api/files/upload-url, D-188’s types and caps', () => {
  const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  it('mints a key for an mp4, a spreadsheet and a CSV, each with its own extension', async () => {
    for (const [contentType, name, ext] of [
      ['video/mp4', 'Week 1.mp4', 'mp4'],
      [XLSX, 'Pipeline.xlsx', 'xlsx'],
      ['text/csv', 'leads.csv', 'csv'],
      ['application/pdf', 'guide.pdf', 'pdf'],
      ['image/jpeg', 'poster.jpg', 'jpg'],
      ['image/jpeg', 'poster.jpeg', 'jpg'],
      ['text/vtt', 'captions.vtt', 'vtt'],
    ] as const) {
      const res = await post('/api/files/upload-url', 'staff', { contentType, size: 2048, name });
      expect(res.statusCode, `${contentType}: ${res.body}`).toBe(200);
      const body = res.json() as { key: string; url: string };
      expect(body.key).toMatch(new RegExp(`^uploads/2026/11/[0-9a-f-]{36}\\.${ext}$`));
      expect(new URL(body.url).searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');
    }
  });

  it('allows a video up to 500 MB and nothing else past 25 MB', async () => {
    expect((await post('/api/files/upload-url', 'staff', { contentType: 'video/mp4', size: MAX_VIDEO_UPLOAD_BYTES })).statusCode).toBe(200);
    const over = await post('/api/files/upload-url', 'staff', { contentType: 'video/mp4', size: MAX_VIDEO_UPLOAD_BYTES + 1 });
    expect(over.statusCode).toBe(422);
    expect((over.json() as { error: string }).error).toContain('500 MB');
    for (const contentType of [XLSX, 'text/csv']) {
      expect((await post('/api/files/upload-url', 'staff', { contentType, size: MAX_UPLOAD_BYTES })).statusCode, contentType).toBe(200);
      const big = await post('/api/files/upload-url', 'staff', { contentType, size: MAX_UPLOAD_BYTES + 1 });
      expect(big.statusCode, contentType).toBe(422);
      expect((big.json() as { error: string }).error).toContain('25 MB');
    }
  });

  it('refuses a name whose extension is not the declared type’s', async () => {
    const res = await post('/api/files/upload-url', 'staff', { contentType: 'text/csv', size: 10, name: 'page.html' });
    expect(res.statusCode).toBe(422);
    expect(res.json()).not.toHaveProperty('url');
    expect((await post('/api/files/upload-url', 'staff', { contentType: 'image/jpeg', size: 10, name: 'poster.png' })).statusCode).toBe(422);
    expect((await post('/api/files/upload-url', 'staff', { contentType: 'text/vtt', size: 10, name: 'notes.txt' })).statusCode).toBe(422);
    expect((await post('/api/files/upload-url', 'staff', { contentType: 'image/jpeg', size: MAX_UPLOAD_BYTES, name: 'poster.jpg' })).statusCode).toBe(200);
    expect((await post('/api/files/upload-url', 'staff', { contentType: 'text/vtt', size: MAX_UPLOAD_BYTES + 1, name: 'captions.vtt' })).statusCode).toBe(422);
  });

  it('still refuses a learner', async () => {
    expect((await post('/api/files/upload-url', 'full', { contentType: 'video/mp4', size: 10, name: 'a.mp4' })).statusCode).toBe(403);
  });
});

// =================================================================================================
// 2 · The Vault: Publish to Vault and Replace file
// =================================================================================================

/** What the browser does: ask for a URL, then PUT the bytes to it with the signed content type. */
async function uploadFile(name: string, contentType: string, body: Buffer): Promise<{ key: string; name: string; size: number; type: string }> {
  const res = await post('/api/files/upload-url', 'staff', { contentType, size: body.length, name });
  expect(res.statusCode, res.body).toBe(200);
  const { key, url } = res.json() as { key: string; url: string };
  const put = await fetch(url, { method: 'PUT', body: new Uint8Array(body), headers: { 'content-type': contentType } });
  expect(put.status).toBe(200);
  return { key, name, size: body.length, type: contentType };
}

const storedRow = async (id: string) => (await handle.select({ storageKey: resources.storageKey, fileName: resources.fileName, size: resources.size }).from(resources).where(eq(resources.id, id)))[0];
const lastAudit = async (action: string) => (await handle.select().from(auditLog).where(eq(auditLog.action, action)).orderBy(desc(auditLog.id)).limit(1))[0];

describe('the Vault’s Publish to Vault and Replace file, with a real upload', () => {
  // Ids are minted from the test clock (`lib/clock.ts`), so each test publishes at its own second.
  let tick = 0;
  beforeEach(() => at(IN_PREVIEW + ++tick * 1000));
  const CSV = Buffer.from('name,email\nAlex,alex@example.test\n');

  it('publishes a row with the stored key and file name, audited, and serves that file', async () => {
    const file = await uploadFile('Leads export.csv', 'text/csv', CSV);
    const res = await post('/api/admin/actions/publishVaultFile', 'staff', { title: 'Lead list template', desc: 'A CSV to start from', cat: 'Lead Generation Scripts', type: 'Prompt pack', tier: 'agent', file });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({ toast: { msg: 'Lead list template published to the vault', tone: 'success' } });

    const db = await loadDb();
    const row = db.resources.find((r) => r.title === 'Lead list template')!;
    expect(row).toMatchObject({ status: 'published', tier: 'agent', size: '1 KB' });
    expect(await storedRow(row.id)).toMatchObject({ storageKey: file.key, fileName: 'Leads export.csv' });
    // The key never reaches a snapshot.
    expect(JSON.stringify(db)).not.toContain(file.key);

    const audit = await lastAudit('vault.upload');
    expect(audit).toMatchObject({ outcome: 'ok', targetType: 'resource', targetId: row.id, targetLabel: 'Lead list template' });
    expect((audit!.after as { file: unknown }).file).toEqual({ name: 'Leads export.csv', size: CSV.length, type: 'text/csv', object: file.key });

    // The vault's editor downloads it: the bytes put, under the name they had.
    const dl = await get(`/api/files/resource/${row.id}`, 'staff');
    expect(dl.statusCode).toBe(200);
    expect(dl.body).toBe(CSV.toString());
    expect(dl.headers['content-type']).toBe('text/csv');
    expect(dl.headers['content-length']).toBe(String(CSV.length));
    expect(dl.headers['content-disposition']).toBe(`attachment; filename="Leads export.csv"; filename*=UTF-8''Leads%20export.csv`);
    expect(dl.headers['cache-control']).toBe('private, max-age=300');
    expect(dl.headers['accept-ranges']).toBe('bytes');
    expect(dl.headers.location).toBeUndefined();
  });

  it('replaces a file: the new key on the row, the old one in the audit row, the old object kept', async () => {
    const first = await uploadFile('v1.csv', 'text/csv', CSV);
    const published = await post('/api/admin/actions/publishVaultFile', 'staff', { title: 'Replace me', desc: '', cat: 'Lead Generation Scripts', type: 'Prompt pack', tier: 'agent', file: first });
    expect(published.statusCode, published.body).toBe(200);
    const row = (await loadDb()).resources.find((r) => r.title === 'Replace me')!;
    const next = Buffer.from('a'.repeat(4000));
    const second = await uploadFile('v2.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', next);

    const res = await post('/api/admin/actions/replaceVaultFile', 'staff', { id: row.id, file: second });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({ toast: { msg: 'File replaced', tone: 'success' } });
    expect(await storedRow(row.id)).toMatchObject({ storageKey: second.key, fileName: 'v2.xlsx', size: '4 KB' });

    const audit = await lastAudit('vault.replace');
    expect(audit).toMatchObject({ outcome: 'ok', targetId: row.id, targetLabel: 'Replace me' });
    expect(audit!.before).toEqual({ size: '1 KB', file: { object: first.key, name: 'v1.csv' } });
    expect((audit!.after as { file: { object: string } }).file.object).toBe(second.key);
    // Nothing deletes the old object.
    expect(bucket.objects.has(first.key)).toBe(true);
    expect(bucket.requests.some((r) => r.method === 'DELETE')).toBe(false);

    const dl = await get(`/api/files/resource/${row.id}`, 'staff');
    expect(dl.body).toBe(next.toString());
    expect(dl.headers['content-disposition']).toContain('filename="v2.xlsx"');
  });

  it('saves nothing for an upload that never reached the bucket, or reached it at another size', async () => {
    const before = (await loadDb()).resources.length;
    const ghost = { key: 'uploads/2026/11/bbbbbbbb-0000-4000-8000-000000000009.csv', name: 'ghost.csv', size: 10, type: 'text/csv' };
    const res = await post('/api/admin/actions/publishVaultFile', 'staff', { title: 'Ghost', desc: '', cat: 'Lead Generation Scripts', type: 'Prompt pack', tier: 'agent', file: ghost });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'Upload the file again, then save.' });

    const real = await uploadFile('real.csv', 'text/csv', CSV);
    const lied = await post('/api/admin/actions/publishVaultFile', 'staff', { title: 'Liar', desc: '', cat: 'Lead Generation Scripts', type: 'Prompt pack', tier: 'agent', file: { ...real, size: real.size + 1 } });
    expect(lied.statusCode).toBe(422);
    expect((await loadDb()).resources.length).toBe(before);
  });

  it('refuses a key the upload route would never mint, before the bucket is asked', async () => {
    const res = await post('/api/admin/actions/replaceVaultFile', 'staff', { id: 'r1', file: { key: 'modules/marketing/x.json', name: 'x.json', size: 10, type: 'application/json' } });
    expect(res.statusCode).toBe(400);
    expect(bucket.requests.filter((r) => r.method === 'HEAD')).toEqual([]);
  });

  it('refuses a learner, and writes no row', async () => {
    const file = await uploadFile('x.csv', 'text/csv', CSV);
    const res = await post('/api/admin/actions/publishVaultFile', 'full', { title: 'Nope', desc: '', cat: 'Lead Generation Scripts', type: 'Prompt pack', tier: 'agent', file });
    expect(res.statusCode).toBe(403);
    expect((await loadDb()).resources.some((r) => r.title === 'Nope')).toBe(false);
  });
});

// =================================================================================================
// 3 · Range
// =================================================================================================

describe('a Range, so a <video> can seek', () => {
  it('answers 206 with Content-Range for a range, and for a suffix', async () => {
    const res = await get(courseVideo(KEY.week0Step), 'full', { range: 'bytes=100-199' });
    expect(res.statusCode).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 100-199/${VIDEO.length}`);
    expect(res.headers['content-length']).toBe('100');
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.rawPayload.equals(VIDEO.subarray(100, 200))).toBe(true);
    expect(bucket.requests.at(-1)).toMatchObject({ method: 'GET', key: KEY.week0Step, range: 'bytes=100-199' });

    const tail = await get(courseVideo(KEY.week0Step), 'full', { range: 'bytes=-10' });
    expect(tail.statusCode).toBe(206);
    expect(tail.headers['content-range']).toBe(`bytes ${VIDEO.length - 10}-${VIDEO.length - 1}/${VIDEO.length}`);

    const open = await get(courseVideo(KEY.week0Step), 'full', { range: 'bytes=0-' });
    expect(open.statusCode).toBe(206);
    expect(open.rawPayload.length).toBe(VIDEO.length);
  });

  it('answers 416 with the size for a range past the end', async () => {
    const res = await get(courseVideo(KEY.week0Step), 'full', { range: `bytes=${VIDEO.length + 5}-` });
    expect(res.statusCode).toBe(416);
    expect(res.headers['content-range']).toBe(`bytes */${VIDEO.length}`);
  });

  it('sends the whole file for a Range it doesn’t take (several ranges)', async () => {
    const res = await get(courseVideo(KEY.week0Step), 'full', { range: 'bytes=0-1,5-9' });
    expect(res.statusCode).toBe(200);
    expect(res.rawPayload.length).toBe(VIDEO.length);
    expect(bucket.requests.at(-1)!.range).toBeUndefined();
  });

  it('answers a HEAD from the bucket’s headers, never reading the object', async () => {
    const res = await app.inject({ method: 'HEAD', url: courseVideo(KEY.week0Step), headers: { cookie: cookies.get('full')! } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-length']).toBe(String(VIDEO.length));
    expect(res.headers['content-type']).toBe('video/mp4');
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.body).toBe('');
    expect(bucket.requests.map((r) => r.method)).toEqual(['HEAD']);
  });

  it('404s an object the bucket doesn’t hold, like any missing file', async () => {
    bucket.objects.delete(KEY.week0Step);
    const res = await get(courseVideo(KEY.week0Step), 'full');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'No such file' });
  });
});

// =================================================================================================
// 4 · A course week's uploaded video
// =================================================================================================

describe('GET /api/files/course/<key>: a course week’s video, by the week’s access', () => {
  it('plays a video in a week the learner may open, inline, from a step path and from Media', async () => {
    for (const [key, name] of [
      [KEY.week0Step, 'Week 0 setup.mp4'],
      [KEY.week0Media, 'Orientation.mp4'],
    ] as const) {
      const res = await get(courseVideo(key), 'full');
      expect(res.statusCode, key).toBe(200);
      expect(res.headers['content-type']).toBe('video/mp4');
      expect(res.headers['content-length']).toBe(String(VIDEO.length));
      expect(res.headers['content-disposition']).toBe(`inline; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`);
      expect(res.headers['cache-control']).toBe('private, max-age=300');
      expect(res.rawPayload.equals(VIDEO)).toBe(true);
    }
  });

  it('refuses a locked week’s video to the same learner, as its content is absent from their course', async () => {
    const res = await get(courseVideo(KEY.week1Step), 'full');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'No such file' });
    // Nothing was read from the bucket for it.
    expect(bucket.requests.filter((r) => r.key === KEY.week1Step)).toEqual([]);
  });

  it('opens the week’s video once the week opens', async () => {
    const db = await loadDb();
    const opens = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[1])!.opens!;
    at(opens + 60_000);
    // The course itself opens before Week 1 does (the first live build), so the buyer is in it.
    expect((await get(courseVideo(KEY.week1Step), 'full')).statusCode).toBe(200);
  });

  it('refuses a plan without the course and a learner with no plan, for an open week too', async () => {
    for (const who of ['insiders', 'noPlan']) {
      expect((await get(courseVideo(KEY.week0Step), who)).statusCode, who).toBe(404);
    }
  });

  it('never serves an arbitrary key: one in no block, another prefix, or traversal', async () => {
    for (const url of [
      courseVideo(KEY.nowhere),
      '/api/files/course/modules/marketing/listing-launch-packet.skill.json',
      '/api/files/course/resources/r1',
      '/api/files/course/uploads/2026/11/..%2F..%2Fresources%2Fr1',
      '/api/files/course/uploads/2026/11/x.mp4',
      '/api/files/course/uploads/26/11/aaaaaaaa-0000-4000-8000-000000000001.mp4',
      '/api/files/course/',
    ]) {
      for (const who of ['full', 'staff']) {
        const res = await get(url, who);
        expect(res.statusCode, `${who} ${url}`).toBe(404);
      }
    }
    expect(bucket.requests.filter((r) => r.method === 'GET')).toEqual([]);
  });

  it('serves staff every week’s video, a locked one and a draft one, as the builder’s preview shows them', async () => {
    expect((await get(courseVideo(KEY.week1Step), 'staff')).statusCode).toBe(200);
    await handle.update(modules).set({ status: 'draft' }).where(eq(modules.id, ACCELERATOR_MODULE_IDS[1]!));
    try {
      expect((await get(courseVideo(KEY.week1Step), 'staff')).statusCode).toBe(200);
    } finally {
      await handle.update(modules).set({ status: 'scheduled' }).where(eq(modules.id, ACCELERATOR_MODULE_IDS[1]!));
    }
  });

  it('serves a block’s poster and transcript to a learner who can open the week, and 404s otherwise', async () => {
    const poster = await get(courseVideo(KEY.poster), 'full');
    expect(poster.statusCode).toBe(200);
    expect(poster.headers['content-type']).toBe('image/jpeg');
    expect(poster.headers['content-disposition']).toContain('inline');
    expect(poster.headers['content-disposition']).toContain('Week 0 poster.jpg');
    const vtt = await get(courseVideo(KEY.transcript), 'full');
    expect(vtt.statusCode).toBe(200);
    expect(vtt.headers['content-type']).toBe('text/vtt');
    expect(vtt.rawPayload.equals(VTT)).toBe(true);
    expect((await get(courseVideo(KEY.lockedPoster), 'full')).statusCode).toBe(404);
    expect((await get(courseVideo(KEY.nowhere), 'full')).statusCode).toBe(404);

    const [src] = await handle.select().from(modules).where(eq(modules.id, ACCELERATOR_MODULE_IDS[0]!));
    await handle.insert(modules).values({
      ...src!,
      id: 'not-a-course',
      kind: 'skill',
      course: null,
      name: 'Not a course',
      checklist: [{ id: 'c1', text: 'x', ch: '', mins: 1, t: 0, hint: '', paths: { claude: { blocks: [video(KEY.stray, 'Nope.jpg')] } } }],
    });
    try {
      expect((await get(courseVideo(KEY.stray), 'full')).statusCode).toBe(404);
      expect((await get(courseVideo(KEY.stray), 'staff')).statusCode).toBe(404);
    } finally {
      await handle.delete(modules).where(eq(modules.id, 'not-a-course'));
    }
  });

  it('401s without a session', async () => {
    const res = await app.inject({ method: 'GET', url: courseVideo(KEY.week0Step) });
    expect(res.statusCode).toBe(401);
  });
});
