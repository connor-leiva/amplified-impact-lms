// D-252: the LMS tour through the real API. The video lives in Week 0's Media, so the course file route that already
// serves Week 0's Media serves its mp4, poster and transcript to an Accelerator learner (in the pre-launch preview and
// once the course is open), and answers its one 404 to a learner whose plan isn't the course. The seen flag is
// `setPref`'s `lms-tour-seen`, refused to that learner too, and it reaches the learner's own snapshot.
//
// Through `app.inject` with real sessions, the suite's Postgres and the in-memory bucket (`fake-bucket.ts`), with
// buyers made by `provisionOrder`, as `files-stream.test.ts` does.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import type { Db, Learner } from '@ai/core';
import { ACCELERATOR_MODULE_IDS, COURSE_OPENS_AT } from '@ai/core/accelerator';
import type { VideoBlock } from '@ai/core/course-types';
import { LMS_TOUR_PREF, tourVideoOf } from '@ai/core/lms-tour';
import { seedProduction } from '@ai/core/seed/curriculum';
import { planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionOrder } from '../src/billing/provision';
import type { Database } from '../src/db/client';
import { auditLog, learnerPrefs, orders, users } from '../src/db/schema';
import { resetS3 } from '../src/storage';
import { startFakeBucket } from './fake-bucket';
import type { FakeBucket } from './fake-bucket';
import { resetDatabase, testDatabase } from './helpers';

const MT = (iso: string): number => Date.parse(`${iso}-07:00`);
const BOUGHT = MT('2026-11-14T14:00:00');
const PREVIEW = MT('2026-11-18T12:00:00');
const IN_PREVIEW = MT('2026-11-20T09:00:00');
const IN_COURSE = COURSE_OPENS_AT + 7 * 86_400_000;
const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };

/** An AI Accelerator buyer, and an Amplified Insiders member (a plan that isn't the course). */
const BUYERS = {
  full: { plan: 'cohort', option: 'full', email: 'tour-full@example.test' },
  insiders: { plan: 'membership', option: 'year_upfront', email: 'tour-insider@example.test' },
} as const;
type Buyer = keyof typeof BUYERS;

/** A learner with no plan at all (a $37 skill buyer's shape: no plan, no access group). */
const NO_PLAN: Learner = { id: 'u_tour_noplan', name: 'No Plan', email: 'tour-noplan@example.test', tier: 'team', role: 'Team Owner', teamId: null, cohortId: 'dec26', joined: BOUGHT, last: null, status: 'active', progress: {} };

const KEY = {
  mp4: 'uploads/2026/11/bbbbbbbb-0000-4000-8000-000000000001.mp4',
  poster: 'uploads/2026/11/bbbbbbbb-0000-4000-8000-000000000002.jpg',
  vtt: 'uploads/2026/11/bbbbbbbb-0000-4000-8000-000000000003.vtt',
} as const;
const VIDEO = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));
const POSTER = Buffer.from('poster');
const VTT = Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nWelcome in.\n');

const TOUR: VideoBlock = {
  type: 'video',
  id: 'lms-tour',
  title: 'How the LMS Works',
  source: { upload: KEY.mp4, name: 'tour.mp4', size: VIDEO.length, type: 'video/mp4' },
  poster: { upload: KEY.poster, name: 'tour.jpg', size: POSTER.length, type: 'image/jpeg' },
  transcript: { upload: KEY.vtt, name: 'tour.vtt', size: VTT.length, type: 'text/vtt' },
  chapters: [{ t: 0, label: 'Welcome to the Accelerator' }],
  durationS: 2,
  tour: true,
};

let handle: Database;
let bucket: FakeBucket;
let app: App;
const cookies = new Map<string, string>();
const ids = new Map<string, string>();

const at = (t: number): void => {
  process.env.FIXED_NOW = new Date(t).toISOString();
};
const get = (url: string, who: string) => app.inject({ method: 'GET', url, headers: { cookie: cookies.get(who)! } });
const post = (url: string, who: string, payload: unknown) =>
  app.inject({ method: 'POST', url, payload: payload as object, headers: { cookie: cookies.get(who)!, 'content-type': 'application/json' } });
const courseFile = (key: string) => `/api/files/course/${key}`;

async function setUp(): Promise<void> {
  const db: Db = planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db;
  db.cohorts[0]!.previewOpensAt = PREVIEW;
  const w0 = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!;
  w0.course!.media = [...w0.course!.media, TOUR];
  db.users.push(NO_PLAN);
  await resetDatabase(db);
  for (const buyer of Object.keys(BUYERS) as Buyer[]) {
    const b = BUYERS[buyer];
    const id = `ord_tour_${buyer}`;
    await handle.insert(orders).values({ id, plan: b.plan, option: b.option, origin: 'payment_link', status: 'paid', name: buyer, email: b.email, company: `${buyer} group`, crm: 'follow_up_boss', createdAt: BOUGHT });
    const out = await provisionOrder(id, { db: handle, log: silent, now: BOUGHT, invitesFrom: BOUGHT, invitesEnabled: false });
    if (!out.ok) throw new Error(`provisioning ${buyer} failed: ${out.reason}`);
    const [u] = await handle.select({ id: users.id }).from(users).where(eq(users.email, b.email));
    ids.set(buyer, u!.id);
    const minter = await build({ logger: false });
    cookies.set(buyer, await minter.signInAs(u!.id));
    await minter.close();
  }
  await handle.update(users).set({ status: 'active' }).where(eq(users.kind, 'learner'));
  const minter = await build({ logger: false });
  cookies.set('noPlan', await minter.signInAs(NO_PLAN.id));
  ids.set('noPlan', NO_PLAN.id);
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
  bucket.objects.clear();
  bucket.put(KEY.mp4, VIDEO, 'video/mp4');
  bucket.put(KEY.poster, POSTER, 'image/jpeg');
  bucket.put(KEY.vtt, VTT, 'text/vtt');
  Object.assign(process.env, bucket.env);
  resetS3();
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});

describe('the course file route serves the flagged tour (no new route)', () => {
  it('hands an Accelerator learner the tour in their course, and its mp4, poster and transcript, in the preview and once the course opens', async () => {
    for (const t of [IN_PREVIEW, IN_COURSE]) {
      at(t);
      const course = await get('/api/course', 'full');
      expect(course.statusCode, new Date(t).toISOString()).toBe(200);
      expect(tourVideoOf((course.json() as { course: { weeks: [] } }).course)).toEqual(TOUR);
      for (const [key, type, body] of [
        [KEY.mp4, 'video/mp4', VIDEO],
        [KEY.poster, 'image/jpeg', POSTER],
        [KEY.vtt, 'text/vtt', VTT],
      ] as const) {
        const res = await get(courseFile(key), 'full');
        expect(res.statusCode, `${key} at ${new Date(t).toISOString()}`).toBe(200);
        expect(res.headers['content-type']).toBe(type);
        expect(res.rawPayload.equals(body)).toBe(true);
      }
    }
  });

  it('answers its one 404 for each of the three to a learner whose plan isn’t the course, and to one with no plan', async () => {
    for (const t of [IN_PREVIEW, IN_COURSE]) {
      at(t);
      for (const who of ['insiders', 'noPlan']) {
        expect((await get('/api/course', who)).statusCode, who).toBe(403);
        for (const key of Object.values(KEY)) expect((await get(courseFile(key), who)).statusCode, `${who} ${key}`).toBe(404);
      }
    }
  });
});

describe('the seen flag, lms-tour-seen in learner_prefs', () => {
  const prefRows = (who: string) =>
    handle.select().from(learnerPrefs).where(and(eq(learnerPrefs.userId, ids.get(who)!), eq(learnerPrefs.key, LMS_TOUR_PREF)));

  it('is stored for an Accelerator learner, writes no audit row, and reaches their own snapshot', async () => {
    const auditBefore = (await handle.select().from(auditLog)).length;
    const res = await post('/api/mutate/setPref', 'full', { key: LMS_TOUR_PREF, value: '1' });
    expect(res.statusCode, res.body).toBe(200);
    const rows = await prefRows('full');
    expect(rows.map((r) => r.value)).toEqual(['1']);
    expect((await handle.select().from(auditLog)).length).toBe(auditBefore);
    const snap = (await get('/api/snapshot', 'full')).json() as Db;
    const me = snap.users.find((u) => u.id === ids.get('full'))!;
    expect(me.coursePrefs?.find((p) => p.key === LMS_TOUR_PREF)?.value).toBe('1');
  });

  it('accepts only 1', async () => {
    for (const value of ['0', 'yes']) {
      const res = await post('/api/mutate/setPref', 'full', { key: LMS_TOUR_PREF, value });
      expect(res.statusCode, value).toBe(422);
    }
  });

  it('is refused to a learner whose plan doesn’t open the course, and nothing is stored', async () => {
    for (const who of ['insiders', 'noPlan']) {
      const res = await post('/api/mutate/setPref', who, { key: LMS_TOUR_PREF, value: '1' });
      expect(res.statusCode, who).toBe(403);
      expect(await prefRows(who)).toEqual([]);
    }
  });
});
