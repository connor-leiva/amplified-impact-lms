// The other cohorts in December's database, and December's checks beyond the golden (R-5 § 1).
//
// TWO JOBS, ONE FILE. `december.test.ts` and its golden (`fixtures/december/golden.json`) never change during R-5; this
// is the file a phase may add to.
//
//   1. `addOtherCohorts`: the spec's Phase 3 is done when "section 1's test passes with both cohorts in the database".
//      A phase that brings a new cohort adds it here (made by the same core action staff use, never by hand-written
//      rows), so December's test runs with it present. Today there is no other cohort, so it adds nothing.
//   2. December's checks beyond the golden, added before Phase 2 (Connor, Nov 25): the LMS tour (D-252) still resolves
//      from Week 0's Media video ticked "Show as the LMS Tour on Sign-In", and a masquerading staff viewer sees what
//      the learner sees. Their own golden is `fixtures/december/others.json`, captured on `main` @ 038cd39, before
//      Phase 2 changed anything; `golden.json` is untouched.
//
// WHY AN `afterAll`. Ticking the tour is a staff save of Week 0, which changes Week 0's stored row, so it must not run
// before December's sections read that row. Every test of a file runs before its `afterAll` hooks, so these checks
// run after the last December section, on the world that test built (this module is handed its database by
// `addOtherCohorts`). Each check is named, and every failure is reported, by name, in one error.
//
// THE RULES FOR THIS FILE. It adds; it never changes a row it did not add, except the one staff save above, made
// after every December section. People it adds are at `@january.example.test` (or another cohort's own domain), never
// one of December's addresses, so the test can tell December's people from everyone else's.
import { afterAll, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { MASQUERADE_PATHS, moduleVersion } from '@ai/core';
import type { Db } from '@ai/core';
import type { VideoBlock } from '@ai/core/course-types';
import { LMS_TOUR_PREF, tourSeen, tourVideoOf } from '@ai/core/lms-tour';
import { build } from '../src/app';
import type { App } from '../src/app';
import type { Database } from '../src/db/client';
import { accounts, learnerPrefs, sessions, teams, users } from '../src/db/schema';
import { resetS3 } from '../src/storage';
import { startFakeBucket } from './fake-bucket';
import { loadDb } from './helpers';

/** The domain every person this hook adds is at. Mail and reminders to it are not December's. */
export const OTHER_COHORT_DOMAINS: readonly string[] = ['january.example.test'];

let world: Database | null = null;

export async function addOtherCohorts(db: Database, now: number): Promise<void> {
  world = db;
  // R-5 Phase 2 (D-254): Connor's January, made the way staff make it: `createCohortFromShape` through the audited
  // admin action, from December as its source. Six weeks of building after a setup week, a Tuesday live build and a
  // Thursday office hours at 12:00 PM MT (five of them at the same instant as December's), Week 1 opening Sun, Jan 3.
  // A draft: no people, no plans, no words. Phase 4 puts a test team in it.
  process.env.FIXED_NOW = iso(now);
  const app = await build({ logger: false });
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/actions/createCohortFromShape',
      headers: { cookie: await app.signInAs(STAFF), 'content-type': 'application/json' },
      payload: JSON.stringify(JANUARY),
    });
    if (res.statusCode !== 200) throw new Error(`January was not created: ${res.statusCode} ${res.body}`);
  } finally {
    await app.close();
  }
}

/** Connor's January, as the New cohort page sends it. */
const JANUARY = {
  name: 'January 2027 Cohort',
  start: '2027-01-03',
  sourceCohortId: 'dec26',
  picks: [
    'accelerator-week-1',
    'accelerator-week-2',
    'accelerator-week-3',
    'accelerator-week-4',
    'accelerator-week-5',
    'accelerator-week-6',
  ],
  shape: {
    setupWeek: true,
    slots: [
      { day: 2, time: '12:00', kind: 'live_build', mins: 90 },
      { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
    ],
    hosts: 'Connor Leiva and Spring',
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// December beyond the golden
// ---------------------------------------------------------------------------------------------------------------------

const GOLDEN = fileURLToPath(new URL('./fixtures/december/others.json', import.meta.url));
const CAPTURE = process.env.DECEMBER_OTHERS_CAPTURE === '1';
if (CAPTURE && process.env.CI)
  throw new Error('DECEMBER_OTHERS_CAPTURE=1 never runs in CI: its golden is captured once, on main, before Phase 2.');

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const iso = (t: number): string => new Date(t).toISOString();

/** December's people, by the addresses `december.test.ts` gives them. */
const EMAIL = {
  owner: 'owner@example.test',
  twoPayOwner: 'twopay@example.test',
  implementer: 'implementer@example.test',
  insiders: 'insider@example.test',
  teamPlanOwner: 'teamplan@example.test',
  teamPlanAgent: 'agent@example.test',
  utahLife: 'jane.doe@liveutah.com',
  skillBuyer: 'skill@example.test',
  testEarly: 'early@example.test',
} as const;
type Learner = keyof typeof EMAIL;
const LEARNERS = Object.keys(EMAIL) as Learner[];
const STAFF = 'st_owner';

/** The instants these checks look at: in the preview, the first build, the holiday gap, after the last session. */
const INSTANTS: Record<string, number> = {
  'in-preview': MT('2026-11-24T10:00:00'),
  'dec2-build': MT('2026-12-02T12:30:00'),
  'holiday-gap': MT('2026-12-27T10:00:00'),
  'after-last-session': MT('2027-02-10T12:00:00'),
};

/** The tour as staff tick it in the Week Builder: an uploaded mp4 with its poster and transcript, in Week 0's Media. */
const KEY = {
  mp4: 'uploads/2026/11/dddddddd-0000-4000-8000-000000000001.mp4',
  poster: 'uploads/2026/11/dddddddd-0000-4000-8000-000000000002.jpg',
  vtt: 'uploads/2026/11/dddddddd-0000-4000-8000-000000000003.vtt',
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
const REASON = 'December test: what the learner sees.';

function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = canon((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}
const sha = (v: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(canon(v)))
    .digest('hex');

/** One browser: a cookie jar that keeps what each response sets and drops what it clears. */
class Browser {
  private readonly jar = new Map<string, string>();
  constructor(
    private readonly app: App,
    pair: string,
  ) {
    const i = pair.indexOf('=');
    this.jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  async send(method: 'GET' | 'POST', url: string, payload?: unknown) {
    const headers: Record<string, string> = { cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ') };
    if (method === 'POST') headers['content-type'] = 'application/json';
    const res = await this.app.inject({
      method,
      url,
      headers,
      ...(method === 'POST' ? { payload: (payload ?? {}) as object } : {}),
    });
    const set = res.headers['set-cookie'];
    for (const line of (Array.isArray(set) ? set : set ? [set] : []).flatMap((l) => l.split('\n'))) {
      const [pair, ...attrs] = line.split(';').map((x) => x.trim());
      const i = pair!.indexOf('=');
      const name = pair!.slice(0, i);
      const value = pair!.slice(i + 1);
      if (value === '' || attrs.some((a) => /^max-age=0$/i.test(a))) this.jar.delete(name);
      else this.jar.set(name, value);
    }
    return res;
  }
}

async function beyondTheGolden(db: Database): Promise<void> {
  const golden: Record<string, unknown> =
    !CAPTURE && existsSync(GOLDEN) ? (JSON.parse(readFileSync(GOLDEN, 'utf8')) as Record<string, unknown>) : {};
  const captured: Record<string, unknown> = {};
  const failures: string[] = [];
  const same = (section: string, actual: unknown): void => {
    const value = canon(JSON.parse(JSON.stringify(actual)));
    if (CAPTURE) captured[section] = value;
    else expect(value, `December moved: ${section}`).toEqual(golden[section]);
  };
  const check = async (name: string, fn: () => Promise<void>): Promise<void> => {
    try {
      await fn();
    } catch (err) {
      failures.push(`${name}: ${(err as Error).message}`);
    }
  };

  // Who is who: December's people by address, and a label for every id drawn at random.
  const ids = new Map<Learner, string>();
  const labels = new Map<string, string>();
  const byEmail = new Map<string, string>();
  for (const u of await db.select({ id: users.id, email: users.email }).from(users)) {
    const who = LEARNERS.find((l) => EMAIL[l] === u.email);
    if (who) ids.set(who, u.id);
    // Every learner gets a label, December's viewers by name and the rest by address (late and seat buyers).
    if (!u.id.startsWith('st_')) labels.set(u.id, `<${who ?? u.email}>`);
    byEmail.set(u.id, who ?? u.email);
  }
  for (const t of await db.select({ id: teams.id, ownerId: teams.ownerId }).from(teams))
    labels.set(t.id, `<team:${byEmail.get(t.ownerId ?? '') ?? '?'}>`);
  for (const a of await db.select({ id: accounts.id, ownerUserId: accounts.ownerUserId }).from(accounts))
    labels.set(a.id, `<acct:${byEmail.get(a.ownerUserId ?? '') ?? '?'}>`);
  const norm = <T>(v: T): T => {
    let s = JSON.stringify(v);
    for (const [id, label] of [...labels].sort((a, b) => b[0].length - a[0].length)) s = s.split(id).join(label);
    return JSON.parse(s.replace(/\b(ms|as)_[A-Za-z0-9_-]{8,}\b/g, '<$1>')) as T;
  };
  const decSessions = (await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.cohortId, 'dec26')))
    .map((s) => s.id)
    .sort();

  /** An app at an instant, with staff and the learners signed in at that instant. */
  const appAt = async (t: number): Promise<{ app: App; cookie: Map<string, string> }> => {
    process.env.FIXED_NOW = iso(t);
    const app = await build({ logger: false });
    const cookie = new Map<string, string>();
    cookie.set(STAFF, await app.signInAs(STAFF));
    for (const l of LEARNERS) cookie.set(l, await app.signInAs(ids.get(l)!));
    return { app, cookie };
  };
  const getAs = (app: App, cookie: string, url: string) => app.inject({ method: 'GET', url, headers: { cookie } });

  // ---- 1. The masquerading staff viewer: staff see what the learner sees, and can join nothing ----------------------
  await check('a masquerading staff viewer', async () => {
    const out: Record<string, Record<string, unknown>> = {};
    for (const [name, t] of Object.entries(INSTANTS)) {
      const { app, cookie } = await appAt(t);
      out[name] = {};
      for (const target of LEARNERS) {
        const own = await getAs(app, cookie.get(target)!, '/api/course');
        const ownSnap = await getAs(app, cookie.get(target)!, '/api/snapshot');
        const staff = new Browser(app, cookie.get(STAFF)!);
        const start = await staff.send('POST', MASQUERADE_PATHS.start, {
          targetUserId: ids.get(target),
          reason: REASON,
        });
        const course = await staff.send('GET', '/api/course');
        const snap = await staff.send('GET', '/api/snapshot');
        const me = await staff.send('GET', '/api/me');
        const join: Record<string, string> = {};
        for (const id of decSessions) {
          const res = await staff.send('GET', `/api/sessions/${id}/join`);
          const body = res.json() as { url?: string; error?: string };
          join[id] = `${res.statusCode} ${body.url !== undefined ? 'url' : (body.error ?? '').split(id).join('<id>')}`;
        }
        const exit = await staff.send('POST', MASQUERADE_PATHS.exit);
        // What a masquerade must be: the learner's own answers, exactly.
        expect(course.statusCode, `${name} ${target}: /api/course as the learner and as staff in a masquerade`).toBe(
          own.statusCode,
        );
        expect(norm(course.json()), `${name} ${target}: /api/course`).toEqual(norm(own.json()));
        expect(snap.statusCode, `${name} ${target}: /api/snapshot status`).toBe(ownSnap.statusCode);
        const masqSnap = norm(snap.json() as Partial<Db>);
        const ownSnapN = norm(ownSnap.json() as Partial<Db>);
        out[name][target] = {
          start: start.statusCode,
          exit: exit.statusCode,
          actor: (me.json() as { viewer?: { actor?: { kind?: string } } }).viewer?.actor?.kind ?? null,
          course: { status: course.statusCode, sha: sha(norm(course.json())) },
          snapshot: {
            status: snap.statusCode,
            sha: sha(masqSnap),
            // Which parts differ from the learner's own snapshot, if any (a masquerade's own markers).
            differs: Object.keys({ ...masqSnap, ...ownSnapN })
              .filter(
                (k) =>
                  sha((masqSnap as Record<string, unknown>)[k] ?? null) !==
                  sha((ownSnapN as Record<string, unknown>)[k] ?? null),
              )
              .sort(),
          },
          join,
        };
      }
      await app.close();
    }
    same('masquerade', out);
  });

  // ---- 2. The LMS tour: ticked in the Week Builder, it resolves from Week 0's Media for whoever opens Week 0 --------
  const bucket = await startFakeBucket();
  Object.assign(process.env, bucket.env);
  resetS3();
  bucket.put(KEY.mp4, VIDEO, 'video/mp4');
  bucket.put(KEY.poster, POSTER, 'image/jpeg');
  bucket.put(KEY.vtt, VTT, 'text/vtt');
  try {
    await check('the LMS tour, ticked on Week 0’s Media', async () => {
      // Staff tick it the way the Week Builder does: Week 0's Media gains the video, saved through the audited save.
      const { app, cookie } = await appAt(INSTANTS['in-preview']!);
      const stored = (await loadDb()).modules.find((m) => m.id === 'accelerator-week-0')!;
      const draft = structuredClone(stored);
      draft.course!.media = [...draft.course!.media, TOUR];
      const save = await app.inject({
        method: 'POST',
        url: '/api/admin/actions/saveBuilderModule',
        headers: { cookie: cookie.get(STAFF)!, 'content-type': 'application/json' },
        payload: JSON.stringify({ draft, base: moduleVersion(stored) }),
      });
      await app.close();
      expect(save.statusCode, save.body).toBe(200);

      const out: Record<string, Record<string, unknown>> = {};
      for (const [name, t] of Object.entries(INSTANTS)) {
        const { app: a, cookie: c } = await appAt(t);
        out[name] = {};
        for (const who of [...LEARNERS, 'staff' as const]) {
          const res = await getAs(a, c.get(who === 'staff' ? STAFF : who)!, '/api/course');
          const tour = res.statusCode === 200 ? tourVideoOf((res.json() as { course: { weeks: [] } }).course) : null;
          if (tour) expect(tour, `${name} ${who}: the tour is the ticked video, whole`).toEqual(TOUR);
          const files: Record<string, number> = {};
          if (who !== 'staff')
            for (const [k, key] of Object.entries(KEY))
              files[k] = (await getAs(a, c.get(who)!, `/api/files/course/${key}`)).statusCode;
          out[name][who] = { course: res.statusCode, tour: tour ? (tour.id ?? 'unnamed') : null, files };
        }
        // And staff masquerading as the owner get the same tour the owner does.
        const staff = new Browser(a, c.get(STAFF)!);
        expect(
          (await staff.send('POST', MASQUERADE_PATHS.start, { targetUserId: ids.get('owner'), reason: REASON }))
            .statusCode,
        ).toBe(201);
        const masq = await staff.send('GET', '/api/course');
        const masqTour =
          masq.statusCode === 200 ? tourVideoOf((masq.json() as { course: { weeks: [] } }).course) : null;
        out[name]['staff-as-owner'] = { course: masq.statusCode, tour: masqTour ? (masqTour.id ?? 'unnamed') : null };
        expect(masqTour, `${name}: staff in a masquerade as the owner`).toEqual(
          out[name].owner && (out[name].owner as { tour: string | null }).tour ? TOUR : null,
        );
        // Look-only: the seen flag cannot be written from a masquerade.
        const blocked = await staff.send('POST', '/api/mutate/setPref', { key: LMS_TOUR_PREF, value: '1' });
        out[name]['staff-as-owner-sets-seen'] = blocked.statusCode;
        expect(blocked.statusCode, `${name}: a masquerade writes no seen flag`).not.toBe(200);
        await staff.send('POST', MASQUERADE_PATHS.exit);
        await a.close();
      }
      const ownerSeen = await db
        .select()
        .from(learnerPrefs)
        .where(and(eq(learnerPrefs.userId, ids.get('owner')!), eq(learnerPrefs.key, LMS_TOUR_PREF)));
      expect(ownerSeen, 'no masquerade stored a seen flag').toEqual([]);

      // The owner, as themselves, marks it seen: stored, and on their own snapshot.
      const { app: a, cookie: c } = await appAt(INSTANTS['dec2-build']!);
      const seen = await a.inject({
        method: 'POST',
        url: '/api/mutate/setPref',
        headers: { cookie: c.get('owner')!, 'content-type': 'application/json' },
        payload: JSON.stringify({ key: LMS_TOUR_PREF, value: '1' }),
      });
      const snap = (await getAs(a, c.get('owner')!, '/api/snapshot')).json() as Db;
      await a.close();
      const me = snap.users.find((u) => u.id === ids.get('owner'));
      same('tour', {
        save: save.statusCode,
        out,
        ownerSetsSeen: seen.statusCode,
        ownerSeen: tourSeen(me?.coursePrefs),
      });
    });
  } finally {
    for (const k of Object.keys(bucket.env)) delete process.env[k];
    resetS3();
    await bucket.close();
    delete process.env.FIXED_NOW;
  }

  if (CAPTURE) {
    mkdirSync(dirname(GOLDEN), { recursive: true });
    writeFileSync(GOLDEN, `${JSON.stringify(canon(captured), null, 1)}\n`);
  } else if (!existsSync(GOLDEN))
    failures.push(`${GOLDEN} is missing: it is captured once, on main, with DECEMBER_OTHERS_CAPTURE=1`);
  if (failures.length)
    throw new Error(
      `December beyond the golden (december-others.ts), ${failures.length} failed:\n- ${failures.join('\n- ')}`,
    );
}

afterAll(async () => {
  if (world) await beyondTheGolden(world);
}, 600_000);
