// Phase 08 § 8.2's three file routes, through `app.inject` with a real session.
//
// Gate 8 names two of these outright:
//
//   "Downloading a Team-tier resource as Jamie returns 403. As Alex it returns 302 to a presigned
//    URL whose `X-Amz-Expires` is ≤ 300."
//   "`upload-url` rejects 26 MB and `text/html` with 422."
//
// ------------------------------------------------------------------------------------------------
// WHAT THIS SUITE IS FOR, BEYOND THOSE TWO LINES
// ------------------------------------------------------------------------------------------------
// Access control is the whole point of these routes, and a download route has a property that makes
// a failure in it unusually quiet: the viewer never sees the status code. The browser follows the
// 302, so a route that answered 302 for an object the viewer may not have would look, from the
// portal, exactly like a route that worked. Nothing in the UI, the parity run or the e2e suite
// would go red. These assertions are the only thing standing there.
//
// So the suite is organised by what a failure would mean, not by route:
//
//   1. THE TIER RULE IS `@ai/core`'s, not a second copy. The 2×2 matrix sweep asserts the route's
//      status code and `downloadResource`'s own `forbidden` agree on all four combinations of
//      viewer tier × object tier. A route that drifted from the mutation fails it.
//   2. THE ROUTE DOES NOT COUNT THE DOWNLOAD. `Vault.tsx` posts `downloadResource` on the same
//      click, and § 8.2 says the route "runs `downloadResource`" too; doing both would double
//      `resources.dl`, which is rendered in three places. `dl` is read before and after a 302.
//   3. A NAME FROM OUTSIDE CANNOT NAME AN OBJECT THAT IS NOT ITS OWN. Encoded traversal, an
//      undeclared `:fileName`, a hidden resource, a draft AI Employee, and a row whose stored key
//      is blank — each would be a read of somebody else's object or of the bucket ROOT.
//   4. A NAME FROM OUTSIDE CANNOT LEAVE THE `Content-Disposition` HEADER. `:fileName` is the one
//      string on these routes that reaches the header as itself, and admins type it.
//
// ------------------------------------------------------------------------------------------------
// WHY THE PRESIGNED URLS IN HERE ARE REAL
// ------------------------------------------------------------------------------------------------
// `src/storage.test.ts`'s header carries the argument in full: SigV4 presigning is local
// cryptography, so dummy credentials over a fake endpoint produce a genuine signature over a
// genuine canonical request and no socket is opened. Nothing below stubs `@aws-sdk/*`. The
// credentials are arbitrary HMAC key material with no account behind them.
//
// `resetS3()` runs around every test because `storage.ts` caches its client on first presign, and a
// test that changes `S3_*` (the 500-on-misconfiguration one) would otherwise be invisible to it and
// would poison the next test instead.
//
// ------------------------------------------------------------------------------------------------
// TIME ZONES
// ------------------------------------------------------------------------------------------------
// Nothing in this suite renders a time, so there is no `fmt.*` call for the host zone to leak into.
// The one date-shaped assertion is `uploads/2026/12/…`, and `uploadKey` shards on **UTC** by
// construction (`getUTCFullYear`/`getUTCMonth`) precisely so the prefix cannot depend on the
// service's `TZ`. `FIXED_NOW` is an instant with an explicit offset, so the expected `2026/12` is
// the same on America/Chicago and on a UTC runner. Run both ways regardless; see the report.

import { describe, it, expect, afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { MutationError, canAccess, seedForDatabase } from '@ai/core';
import type { Db, Learner, Resource } from '@ai/core';
import * as M from '@ai/core/mutations';
import { build } from '../src/app';
import type { App } from '../src/app';
import { resources as resourceTable } from '../src/db/schema';
import { declaresFile, moduleResourceFileName, vaultFileName } from '../src/routes/files';
import { GET_EXPIRES_IN, PUT_EXPIRES_IN, resetS3 } from '../src/storage';
import { loadDb, resetDatabase, testDatabase } from './helpers';

/**
 * Gate 8's own instant, `2026-12-08T13:00 CT`, written with an explicit offset so the suite does
 * not inherit the runner's zone. Every seeded AI Employee except `operations` is `published` at it.
 */
const NOW = '2026-12-08T13:00:00-06:00';

/** A Railway-shaped environment. Dotted bucket name, as `storage.test.ts` uses — see its header. */
const S3_ENV = {
  S3_REGION: 'auto',
  S3_ENDPOINT: 'https://bucket-production-a1b2.up.railway.app',
  S3_ACCESS_KEY_ID: 'AKIAEXAMPLEONLY00000',
  S3_SECRET_ACCESS_KEY: 'test-only-hmac-key-material-0000000000',
  S3_BUCKET: 'ai-lms.production',
} as const;

const S3_KEYS = ['S3_REGION', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET'] as const;

let app: App;
let savedEnv: Record<string, string | undefined> = {};

beforeAll(async () => {
  await testDatabase();
});

beforeEach(async () => {
  process.env.FIXED_NOW = NOW;
  savedEnv = {};
  for (const k of S3_KEYS) {
    savedEnv[k] = process.env[k];
    process.env[k] = S3_ENV[k];
  }
  resetS3();
  // Rebuilt per test, as `routes.test.ts` does: @fastify/rate-limit's store belongs to the plugin
  // instance, so a shared app would carry § 9.4's 100/minute budget across the file.
  app = await build({ logger: false });
});

afterEach(async () => {
  await app?.close();
  for (const k of S3_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  resetS3();
});

afterAll(() => {
  delete process.env.FIXED_NOW;
});

// --- helpers -------------------------------------------------------------------------------------

/** The seed, loaded fresh. Only the describes that read or write rows pay for it. */
const seeded = (mutate?: (db: Db) => void): Promise<void> => {
  const db = seedForDatabase('live');
  mutate?.(db);
  return resetDatabase(db);
};

const resourceUrl = (id: string): string => `/api/files/resource/${encodeURIComponent(id)}`;

/** Exactly what `apps/web/src/data/http.ts` builds — every segment percent-encoded. */
const moduleUrl = (moduleId: string, fileName: string): string =>
  `/api/files/module/${encodeURIComponent(moduleId)}/${encodeURIComponent(fileName)}`;

const getAs = (url: string, cookie?: string) =>
  app.inject({ method: 'GET', url, ...(cookie ? { headers: { cookie } } : {}) });

const uploadAs = (cookie: string | undefined, payload: unknown, contentType = 'application/json') =>
  app.inject({
    method: 'POST',
    url: '/api/files/upload-url',
    payload: payload as object,
    headers: { 'content-type': contentType, ...(cookie ? { cookie } : {}) },
  });

/** One query parameter of a presigned URL. */
const q = (url: string, name: string): string | null => new URL(url).searchParams.get(name);

/** What `app.inject` resolves to. Named so the two helpers below do not each re-derive it. */
type Injected = Awaited<ReturnType<typeof getAs>>;

/** The `Location` of a 302, with the status asserted first so a failure names the status not the URL. */
function locationOf(res: Injected): string {
  expect(res.statusCode).toBe(302);
  const location = res.headers.location;
  expect(typeof location).toBe('string');
  return location as string;
}

/** The object key a presigned URL addresses, read back out of its path. */
function keyOf(url: string): string {
  const path = new URL(url).pathname;
  // Path-style addressing (`storage.ts`'s `forcePathStyle`), so the first segment is the bucket.
  const prefix = `/${S3_ENV.S3_BUCKET}/`;
  expect(path.startsWith(prefix)).toBe(true);
  return decodeURIComponent(path.slice(prefix.length));
}

const learner = (db: Db, id: string): Learner => {
  const u = db.users.find((x) => x.id === id);
  if (!u) throw new Error(`no learner ${id} in the snapshot`);
  return u;
};

const resource = (db: Db, id: string): Resource => {
  const r = db.resources.find((x) => x.id === id);
  if (!r) throw new Error(`no resource ${id} in the snapshot`);
  return r;
};

// ================================================================================================
// Gate 8 · "Downloading a Team-tier resource as Jamie returns 403. As Alex it returns 302 to a
//           presigned URL whose X-Amz-Expires is <= 300."
// ================================================================================================

describe("GET /api/files/resource/:id · Gate 8's two lines @g8", () => {
  beforeEach(() => seeded());

  it("refuses a Team-tier resource to an Agent-tier learner, with core's own copy", async () => {
    // r9, `Sisu Closed-Deal Export to Claude`, is `tier: 'team'`; Jamie is `tier: 'agent'`. The
    // message is the one `downloadResource` throws, so the route and the vault's inline error say
    // the same sentence — a learner must not get two different accounts of one rule.
    const res = await getAs(resourceUrl('r9'), await app.signInAs('u_jamie'));

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'Team tier required' });
    // And nothing was signed: a 403 that still leaked a URL in a header would be the whole bug.
    expect(res.headers.location).toBeUndefined();
  });

  it('redirects a Team-tier learner to a presigned URL that expires in at most 300 s', async () => {
    const url = locationOf(await getAs(resourceUrl('r9'), await app.signInAs('u_alex')));

    expect(Number(q(url, 'X-Amz-Expires'))).toBeLessThanOrEqual(300);
    // Pinned exactly as well as bounded: `<= 300` also passes for a 1-second URL, which would be a
    // download that fails on a slow connection and would look like a bucket problem.
    expect(q(url, 'X-Amz-Expires')).toBe(String(GET_EXPIRES_IN));
    expect(new URL(url).origin).toBe(S3_ENV.S3_ENDPOINT);
    expect(keyOf(url)).toBe('resources/r9');
    expect(q(url, 'X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('redirects an Agent-tier learner to an Agent-tier resource', async () => {
    // The positive control for the test above: a 403 for everything would also satisfy it.
    const url = locationOf(await getAs(resourceUrl('r4'), await app.signInAs('u_jamie')));

    expect(keyOf(url)).toBe('resources/r4');
  });

  it('makes the redirect uncacheable, because the URL is a bearer credential', async () => {
    // Anyone holding the Location can fetch the object for 300 s with no cookie. A cacheable 302
    // puts that in the back/forward cache and in any intermediary that caches redirects, which is
    // how the next person on a shared machine gets it.
    const res = await getAs(resourceUrl('r4'), await app.signInAs('u_jamie'));

    expect(res.statusCode).toBe(302);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

// ================================================================================================
// The tier rule is @ai/core's, not a second copy
// ================================================================================================

describe('the 403 comes from the same source of truth the portal uses @g8', () => {
  beforeEach(() => seeded());

  // The defect this is built to catch: the route growing its own tier logic that agrees with
  // `canAccess` on the seeded pair Gate 8 names and disagrees somewhere else. Both axes are swept,
  // and each case is checked against TWO independent oracles — `canAccess` itself, and what
  // `downloadResource` does when the portal posts it on the same click.
  const matrix = [
    { user: 'u_jamie', resourceId: 'r4', allowed: true },
    { user: 'u_jamie', resourceId: 'r9', allowed: false },
    { user: 'u_alex', resourceId: 'r4', allowed: true },
    { user: 'u_alex', resourceId: 'r9', allowed: true },
  ] as const;

  for (const { user, resourceId, allowed } of matrix) {
    it(`${user} + ${resourceId}: route, canAccess and downloadResource all say ${allowed ? 'yes' : 'no'}`, async () => {
      const db = await loadDb();
      const u = learner(db, user);
      const r = resource(db, resourceId);

      // Oracle 1: the rule itself.
      expect(canAccess(u, r)).toBe(allowed);

      // Oracle 2: the mutation the client posts. `downloadResource` throws
      // `MutationError('forbidden')` on exactly the refusal this route must answer 403 to.
      let mutationRefused = false;
      try {
        M.downloadResource(db, { kind: 'learner', userId: user }, { id: resourceId }, { now: Date.parse(NOW), id: () => 'x' });
      } catch (err) {
        mutationRefused = err instanceof MutationError && err.code === 'forbidden';
      }
      expect(mutationRefused).toBe(!allowed);

      // The route.
      const res = await getAs(resourceUrl(resourceId), await app.signInAs(user));
      expect(res.statusCode).toBe(allowed ? 302 : 403);
    });
  }

  it('refuses a staff viewer on both download routes, but the vault’s editors on its own (D-172)', async () => {
    // Tier is a learner concept and `downloadResource` itself refuses staff (`learnerOf` throws).
    // D-172: the admin Resource Vault's hover Download is the one admin screen that downloads a vault
    // row, so staff who may edit the vault (`curriculum`) get it, hidden rows included, uncounted.
    // Everyone else on staff is still refused: a Support-role account (`curriculum: 0`) would
    // otherwise get every Team-tier object in the bucket. Skill files stay learners' only.
    const support = await app.signInAs('st4');
    for (const url of [resourceUrl('r4'), moduleUrl('marketing', 'listing-launch-packet.skill.json')]) {
      const res = await getAs(url, support);
      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({ error: 'That action is for learners.' });
    }
    const owner = await app.signInAs('st1');
    const skill = await getAs(moduleUrl('marketing', 'listing-launch-packet.skill.json'), owner);
    expect(skill.statusCode).toBe(403);
    expect(skill.json()).toEqual({ error: 'That action is for learners.' });

    const before = resource(await loadDb(), 'r4').dl;
    const ok = await getAs(resourceUrl('r4'), owner);
    expect(ok.statusCode).toBe(302);
    expect(ok.headers['cache-control']).toBe('no-store');
    expect(resource(await loadDb(), 'r4').dl).toBe(before);
    // A hidden row: 404 for a learner, there for the vault's editor.
    await (await testDatabase()).update(resourceTable).set({ status: 'hidden' }).where(eq(resourceTable.id, 'r1'));
    expect((await getAs(resourceUrl('r1'), await app.signInAs('u_jamie'))).statusCode).toBe(404);
    expect((await getAs(resourceUrl('r1'), owner)).statusCode).toBe(302);
    expect((await getAs(resourceUrl('nope'), owner)).statusCode).toBe(404);
  });
});

// ================================================================================================
// § 8.2's "runs downloadResource", and why this route does not
// ================================================================================================

describe('the download route does not count the download @g8', () => {
  beforeEach(() => seeded());

  it('leaves resources.dl untouched, because Vault.tsx already posted the mutation', async () => {
    // § 8.2 says this route "runs `downloadResource`" — and `apps/web/src/routes/portal/Vault.tsx`
    // posts that same mutation on the same click, before it navigates here. `mutations.ts` does
    // `x.dl++`, so doing both counts every download TWICE, and `dl` is rendered in three places:
    // the vault row's `412 downloads`, the admin resource leaderboard and the Learners CSV. The
    // client keeps the write (it is also what raises the toast and the inline 403, neither of which
    // a followed 302 can produce) and this route presigns and checks access.
    const before = resource(await loadDb(), 'r4').dl;

    expect((await getAs(resourceUrl('r4'), await app.signInAs('u_jamie'))).statusCode).toBe(302);

    expect(resource(await loadDb(), 'r4').dl).toBe(before);
  });

  it('counts exactly once over the whole click, mutation included', async () => {
    // The other half of the same requirement: the count must still happen. This is the client's
    // call, run through the real mutate route, followed by the real download route — which is the
    // sequence `Vault.tsx` performs. One increment, not zero and not two.
    const cookie = await app.signInAs('u_jamie');
    const before = resource(await loadDb(), 'r4').dl;

    const mutated = await app.inject({
      method: 'POST',
      url: '/api/mutate/downloadResource',
      payload: { id: 'r4' },
      headers: { cookie, 'content-type': 'application/json' },
    });
    expect(mutated.statusCode).toBe(200);
    expect((await getAs(resourceUrl('r4'), cookie)).statusCode).toBe(302);

    expect(resource(await loadDb(), 'r4').dl).toBe(before + 1);
  });
});

// ================================================================================================
// Which object an ask names
// ================================================================================================

describe('GET /api/files/resource/:id · naming the object @g8', () => {
  it("prefers the row's stored storage_key over resources/<id>", async () => {
    // The key the server wrote beats the id the caller typed — `storage.ts` › `resourceKey`. Once
    // `uploadResource` carries a `storageKey` (D-022) every uploaded row has one, and a route that
    // ignored it would presign `resources/<id>`, an object that was never written: every uploaded
    // file would 404 from the bucket while the row looked perfectly healthy.
    //
    // The column is not in any snapshot — `toRows` never produces it, `fromRows` ignores it, § 7.4
    // strips it — so it is written here with the raw handle, which is also the only way the upload
    // route will be able to write it.
    await seeded();
    const db = await testDatabase();
    const stored = 'uploads/2026/12/0f9c1e42-aaaa-4bbb-8ccc-1234567890ab.pdf';
    await db.update(resourceTable).set({ storageKey: stored }).where(eq(resourceTable.id, 'r4'));

    const url = locationOf(await getAs(resourceUrl('r4'), await app.signInAs('u_jamie')));

    expect(keyOf(url)).toBe(stored);
  });

  it('404s a row whose stored key is blank, rather than signing the bucket root', async () => {
    // THE failure this guards against, and it is the worst one in the file. `''` is what a
    // half-finished upload or a hand-edited row leaves behind, and `GetObjectCommand({ Key: '' })`
    // signs `https://endpoint/bucket/` — a URL addressing the BUCKET rather than an object, which
    // on a bucket that permits listing is an index of every object in the store, handed to whoever
    // clicked Download. `presignGet`'s `requireKey` refuses it; this asserts the route maps that
    // refusal to 404 instead of letting it become a 500 or, worse, never raising it at all.
    await seeded();
    const db = await testDatabase();
    await db.update(resourceTable).set({ storageKey: '' }).where(eq(resourceTable.id, 'r4'));

    const res = await getAs(resourceUrl('r4'), await app.signInAs('u_jamie'));

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'No such file' });
    expect(res.headers.location).toBeUndefined();
  });

  it('404s a resource id that no key builder would accept', async () => {
    // `r/4` percent-encoded. `isSafeKeySegment` refuses the delimiter rather than stripping it, so
    // this cannot land on `resources/r4` by sanitisation — and it is not a row either. Both reasons
    // give the same answer, which is the point: a caller learns nothing from the difference.
    await seeded();

    const res = await getAs(resourceUrl('r/4'), await app.signInAs('u_jamie'));

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'No such file' });
  });

  it('404s an id that names no row', async () => {
    await seeded();

    expect((await getAs(resourceUrl('r999'), await app.signInAs('u_jamie'))).statusCode).toBe(404);
  });

  it('404s a hidden resource — 404 and not 403, even for a viewer whose tier would pass', async () => {
    // Every learner snapshot filters to `status === 'published'` (`scopeSnapshot`, and
    // `Vault.vm.ts` again on top), so a hidden row is one this viewer has never been shown.
    // Answering 403 would confirm it exists AND tell them its tier, which is strictly more than
    // they had. Alex's tier would pass, so the 404 is the status check doing the work.
    await seeded((db) => {
      resource(db, 'r9').status = 'hidden';
    });

    const res = await getAs(resourceUrl('r9'), await app.signInAs('u_alex'));

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'No such file' });
  });

  it('names the downloaded file exactly as fixture mode does', async () => {
    // `Vault.vm.ts` › `fileOf` slugs the title and picks the extension from `r.type`; fixture mode
    // saves a Blob under that name. http mode must put the SAME name in the presigned URL's
    // `Content-Disposition`, or a viewer's downloads are renamed by which data source they are on —
    // and "the backend is invisible to the user" is the premise Gate 7 rides on. `vaultFileName` is
    // a second copy of a web derivation (reported as such); these three are what keeps it honest.
    await seeded();
    const cookie = await app.signInAs('u_alex');

    const expected: [string, string][] = [
      // 'Claude Project' → .json
      ['r1', 'fair-housing-language-checker.json'],
      // 'PDF guide' → .pdf
      ['r2', 'mls-public-remarks-rules.pdf'],
      // 'Prompt pack' → .md, and the title's `&` collapses with the spaces around it
      ['r4', 'expired-fsbo-outreach-scripts.md'],
    ];

    for (const [id, name] of expected) {
      const url = locationOf(await getAs(resourceUrl(id), cookie));
      expect(q(url, 'response-content-disposition')).toBe(
        `attachment; filename="${name}"; filename*=UTF-8''${name}`,
      );
    }
  });
});

// ================================================================================================
// GET /api/files/module/:moduleId/:fileName
// ================================================================================================

describe('GET /api/files/module/:moduleId/:fileName @g8', () => {
  it('redirects a declared skill file', async () => {
    await seeded();

    const url = locationOf(
      await getAs(moduleUrl('marketing', 'listing-launch-packet.skill.json'), await app.signInAs('u_jamie')),
    );

    expect(keyOf(url)).toBe('modules/marketing/listing-launch-packet.skill.json');
    expect(q(url, 'X-Amz-Expires')).toBe(String(GET_EXPIRES_IN));
    expect(q(url, 'response-content-disposition')).toBe(
      'attachment; filename="listing-launch-packet.skill.json"; ' +
        "filename*=UTF-8''listing-launch-packet.skill.json",
    );
  });

  it('redirects a per-employee resource, under the name EmployeeDetail.vm.ts derives', async () => {
    // `EmployeeDetail.vm.ts` turns the admin-typed title `Session 1 Slides` into
    // `session-1-slides.pdf` and sends that as `:fileName`. The server has to reproduce the
    // derivation or every per-employee download 404s — a feature that silently does not work.
    await seeded();

    const url = locationOf(await getAs(moduleUrl('marketing', 'session-1-slides.pdf'), await app.signInAs('u_jamie')));

    expect(keyOf(url)).toBe('modules/marketing/session-1-slides.pdf');
  });

  it('applies the same tier rule as the vault route', async () => {
    // `meetings` is `tier: 'team'`. Gate 8's sibling line for § 8.4 is the same shape: "Jamie gets
    // 403 for `dec26-s4` (Team tier)". 403 rather than 404 because the module IS in Jamie's
    // snapshot — redacted, drawn with a lock — so the status code adds nothing he did not have.
    await seeded();
    const file = 'transcript-atomizer.skill.json';

    const refused = await getAs(moduleUrl('meetings', file), await app.signInAs('u_jamie'));
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toEqual({ error: 'Team tier required' });

    const allowed = await getAs(moduleUrl('meetings', file), await app.signInAs('u_alex'));
    expect(allowed.statusCode).toBe(302);
  });

  it('404s a file the AI Employee does not declare', async () => {
    // `isSafeKeySegment` stops a name from ESCAPING `modules/marketing/`; only the declared-name
    // check stops a traversal WITHIN it. Without this, `:fileName` is an arbitrary read of the
    // whole prefix — including an object belonging to a module the caller can reach but a file
    // nobody published, and including the other AI Employees' files once a key is guessed.
    await seeded();

    const res = await getAs(moduleUrl('marketing', 'transcript-atomizer.skill.json'), await app.signInAs('u_jamie'));

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'No such file' });
  });

  it('404s encoded traversal out of the module prefix', async () => {
    // Exactly what `apps/web/src/data/files.test.ts` sends: `'../secrets/key.json'`, percent-encoded
    // by `http.ts`'s `encodeURIComponent`. Whether Fastify hands the handler the decoded `/` or the
    // literal `%`, `isSafeKeySegment` refuses both — and the declared-name check refuses it first.
    await seeded();
    const cookie = await app.signInAs('u_jamie');

    for (const name of ['../secrets/key.json', '../../etc/passwd', 'a/b.json', 'x%2Fy.json']) {
      const res = await getAs(moduleUrl('marketing', name), cookie);
      expect(res.statusCode).toBe(404);
      expect(res.headers.location).toBeUndefined();
    }
  });

  it('404s a draft AI Employee, which is in no snapshot at all', async () => {
    // `visibleModules` excludes drafts, exactly as `scopeSnapshot` does. A draft's skill files are
    // unpublished work; a 403 would at least confirm the module id exists.
    await seeded((db) => {
      const m = db.modules.find((x) => x.id === 'marketing')!;
      m.status = 'draft';
    });

    const res = await getAs(moduleUrl('marketing', 'listing-launch-packet.skill.json'), await app.signInAs('u_jamie'));

    expect(res.statusCode).toBe(404);
  });

  it('serves a scheduled AI Employee that has not opened yet', async () => {
    // Deliberately NOT gated on `isOpen`. `scopeSnapshot` gates the build kit on `canAccess` and
    // never on `isOpen`, so a scheduled AI Employee's skill files are already in the learner's
    // snapshot; refusing them here would be a rule no other half of the product has, and it would
    // break the build kit of `operations` for anyone who opened its page before 14 December.
    // `operations` is the one seeded AI Employee with `status: 'scheduled'`, and it opens
    // 2026-12-14, six days after this suite's FIXED_NOW — so `isOpen(m, now)` is false here.
    await seeded();

    const url = locationOf(
      await getAs(moduleUrl('operations', 'c2c-timeline.skill.json'), await app.signInAs('u_alex')),
    );

    expect(keyOf(url)).toBe('modules/operations/c2c-timeline.skill.json');
  });
});

// ================================================================================================
// A name from outside cannot leave the Content-Disposition header
// ================================================================================================

describe('a file name cannot break out of Content-Disposition @g8', () => {
  /** Put `name` on `marketing`'s first skill file, so `:fileName` carries it verbatim. */
  const withSkillFileNamed = (name: string) =>
    seeded((db) => {
      const m = db.modules.find((x) => x.id === 'marketing')!;
      m.files[0]!.name = name;
    });

  it('strips a quote from the fallback and percent-encodes it in filename*', async () => {
    // `:fileName` is the one string on these routes that reaches the header as itself, and admins
    // name these files. § 8.2's snippet interpolates it straight into `filename="…"`, where one `"`
    // closes the quoted string early and everything after it is read as further parameters — and S3
    // ECHOES this header into the download response, so what is injected lands in the learner's
    // browser. `contentDisposition` emits two parameters instead; this asserts both.
    await withSkillFileNamed('say-"hi".skill.json');

    const url = locationOf(await getAs(moduleUrl('marketing', 'say-"hi".skill.json'), await app.signInAs('u_jamie')));
    const disposition = q(url, 'response-content-disposition')!;

    expect(disposition).toBe('attachment; filename="say-hi.skill.json"; filename*=UTF-8\'\'say-%22hi%22.skill.json');
    // The structural property, stated independently of the exact string above: exactly two quote
    // characters in the whole header value, and they are the fallback's own delimiters.
    expect(disposition.split('"')).toHaveLength(3);
    // The key still carries the real name, encoded once by the SDK — the quote is a legal S3 key
    // character, so this is a download that works rather than one that was sanitised into a
    // different object.
    expect(keyOf(url)).toBe('modules/marketing/say-"hi".skill.json');
  });

  it('404s a name carrying a newline instead of signing anything', async () => {
    // Header and log injection, and `isSafeKeySegment` refuses every C0 character rather than
    // stripping it — a stripped name would land on the key of a DIFFERENT file. A bare LF, a CRLF
    // pair (what an actual header-splitting attempt looks like) and a vertical tab.
    //
    // The 404 is defended TWICE and the test holds while either layer stands, which was measured
    // rather than assumed: replacing `moduleFileKey` with string concatenation still answers 404,
    // because `presignGet` runs `requireKey` over the whole key (`storage.ts` decision 6), and
    // removing only `presignOr404`'s mapping still answers 404 because `moduleFileKey` throws
    // first. It takes removing both to produce the 500 this asserts against.
    //
    // A NUL is NOT in this list, and the reason is worth writing down: Postgres refuses it in a
    // `jsonb` value (`22P05 unsupported Unicode escape sequence`, `\u0000 cannot be converted to
    // text`), so a skill-file name carrying one cannot be stored and therefore cannot reach this
    // route at all. Measured by trying it — the insert in `insertSnapshot` is what failed, not the
    // route. `isSafeKeySegment` refuses it anyway, and `src/storage.test.ts` is where that is
    // asserted, which is the right level for a case the database makes unreachable.
    for (const name of ['bad\nname.skill.json', 'bad\r\nX-Injected: 1.skill.json', 'bad\u000bname.json']) {
      await withSkillFileNamed(name);
      const res = await getAs(moduleUrl('marketing', name), await app.signInAs('u_jamie'));

      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ error: 'No such file' });
      expect(res.headers.location).toBeUndefined();
    }
  });
});

// ================================================================================================
// D-022's open question, recorded
// ================================================================================================

describe('the per-employee resource key is not injective — D-022 @g8', () => {
  it('two titles that slug alike share one object key', async () => {
    // D-022, verbatim: "`EmployeeDetail.vm.ts` derives `:fileName` from the admin-typed title, and
    // that derivation is not injective — `Session 1 Slides` and `Session 1: Slides` both give
    // `session-1-slides.pdf`". `ModuleResource` has no key field, so the route cannot tell the two
    // apart and both downloads fetch ONE object; whichever was uploaded second is the one everybody
    // gets. This test exists so that is recorded rather than discovered, and so it fails the day
    // `ModuleResource` gains a key and the mapping becomes injective.
    await seeded((db) => {
      const m = db.modules.find((x) => x.id === 'marketing')!;
      m.resources = [
        { name: 'Session 1 Slides', type: 'PDF', size: '4.2 MB' },
        { name: 'Session 1: Slides', type: 'PDF', size: '1.1 MB' },
      ];
    });

    expect(moduleResourceFileName({ name: 'Session 1 Slides', type: 'PDF' })).toBe('session-1-slides.pdf');
    expect(moduleResourceFileName({ name: 'Session 1: Slides', type: 'PDF' })).toBe('session-1-slides.pdf');

    const url = locationOf(await getAs(moduleUrl('marketing', 'session-1-slides.pdf'), await app.signInAs('u_jamie')));
    expect(keyOf(url)).toBe('modules/marketing/session-1-slides.pdf');
  });
});

// ================================================================================================
// POST /api/files/upload-url
// ================================================================================================

describe('POST /api/files/upload-url @g8', () => {
  beforeEach(() => seeded());

  it('mints a key and a presigned PUT for staff with curriculum', async () => {
    const res = await uploadAs(await app.signInAs('st1'), { contentType: 'application/pdf', size: 1024 });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { key: string; url: string };
    // `uploads/YYYY/MM/<uuid>.<ext>`, sharded on UTC so the prefix cannot depend on the service's
    // TZ. FIXED_NOW is 2026-12-08T13:00-06:00, i.e. 19:00Z — December either way.
    expect(body.key).toMatch(/^uploads\/2026\/12\/[0-9a-f-]{36}\.pdf$/);
    expect(keyOf(body.url)).toBe(body.key);
    expect(q(body.url, 'X-Amz-Expires')).toBe(String(PUT_EXPIRES_IN));
    // `storage.ts` decision 3: the content type is SIGNED, so the allow-list binds. Without this
    // the URL would accept an upload of any type at all, including `text/html` into a bucket the
    // vault serves — stored XSS behind a 422 that said no.
    expect(q(body.url, 'X-Amz-SignedHeaders')).toContain('content-type');
  });

  it('rejects 26 MB with 422, under either reading of "MB"', async () => {
    // Gate 8: "`upload-url` rejects 26 MB … with 422". `storage.ts`'s `MAX_UPLOAD_BYTES` comment is
    // why the cap is decimal: a 1024-based cap would ACCEPT 26 × 1000² with a 200, which is the
    // exact size this line names as a refusal. Both readings are sent.
    const cookie = await app.signInAs('st1');

    for (const size of [26 * 1000 * 1000, 26 * 1024 * 1024]) {
      const res = await uploadAs(cookie, { contentType: 'application/pdf', size });
      expect(res.statusCode).toBe(422);
      // The message carries the byte count and the limit, because the caller is an admin holding a
      // file and a bare 422 in the drop zone is a dead end.
      expect((res.json() as { error: string }).error).toContain(String(size));
    }
  });

  it('rejects text/html with 422', async () => {
    const res = await uploadAs(await app.signInAs('st1'), { contentType: 'text/html', size: 1024 });

    expect(res.statusCode).toBe(422);
    expect((res.json() as { error: string }).error).toContain('application/pdf');
  });

  it('refuses staff without curriculum, and refuses a learner', async () => {
    // st4 is Support: `curriculum: 0`. The copy is `requirePerm`'s, so a refusal here reads the
    // same as a refusal from any admin mutation.
    const support = await uploadAs(await app.signInAs('st4'), { contentType: 'application/pdf', size: 1024 });
    expect(support.statusCode).toBe(403);
    expect(support.json()).toEqual({ error: 'You don’t have permission to do that.' });

    // A learner is not staff at all, so `can()` is false before any permission is consulted.
    const jamie = await uploadAs(await app.signInAs('u_jamie'), { contentType: 'application/pdf', size: 1024 });
    expect(jamie.statusCode).toBe(403);
  });

  it('mints the key and never takes one from the body', async () => {
    // § 8.2's body is `{contentType, size}` and that is all it may be. A `key` an uploader chose
    // would let any staff member with `curriculum` presign a PUT over ANY object in the store —
    // another AI Employee's skill file, a published vault resource — because the signature binds
    // the key the server signs, whatever the server was told.
    const res = await uploadAs(await app.signInAs('st1'), {
      contentType: 'application/pdf',
      size: 1024,
      key: 'modules/marketing/listing-launch-packet.skill.json',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { key: string; url: string };
    expect(body.key).toMatch(/^uploads\//);
    expect(keyOf(body.url)).toBe(body.key);
  });

  it('422s a body that is not an object at all', async () => {
    // `null` and a bare string both arrive as `req.body`. Destructuring `null` throws a TypeError,
    // which would surface as a 500 on a route whose entire job is to validate one body.
    const cookie = await app.signInAs('st1');

    for (const payload of ['"nope"', 'null', '[]', '{}']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/files/upload-url',
        payload,
        headers: { cookie, 'content-type': 'application/json' },
      });
      expect(res.statusCode).toBe(422);
    }
  });
});

// ================================================================================================
// Gate 7's rule, which these three routes inherit
// ================================================================================================

describe('an unauthenticated call to any of the three is 401 @g8', () => {
  it('401s both download routes', async () => {
    // Gate 7: "An unauthenticated call to any `/api/*` route except `/api/health`, `/api/auth/*`
    // and `/api/events` returns 401." A download route is the easy one to forget, because the
    // browser navigates to it rather than fetching it and there is no `catch` to notice.
    for (const url of [resourceUrl('r4'), moduleUrl('marketing', 'listing-launch-packet.skill.json')]) {
      const res = await getAs(url);
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'Not signed in' });
      expect(res.headers.location).toBeUndefined();
    }
  });

  it('401s upload-url before it looks at the content type', async () => {
    // The preHandler order is `[requireSession, requireJsonSameOrigin]`, which is what makes an
    // unauthenticated mutation 401 rather than 415 — Gate 7's authorization matrix asserts exactly
    // that for `/api/mutate/:name` and this route follows the same rule.
    const res = await uploadAs(undefined, '{}', 'text/plain');

    expect(res.statusCode).toBe(401);
  });

  it("415s a signed-in upload that is not JSON — § 9.4's CSRF rule", async () => {
    await seeded();

    const res = await uploadAs(await app.signInAs('st1'), 'contentType=application/pdf&size=1', 'text/plain');

    expect(res.statusCode).toBe(415);
  });

  it('403s an upload posted from another origin', async () => {
    await seeded();

    const res = await app.inject({
      method: 'POST',
      url: '/api/files/upload-url',
      payload: { contentType: 'application/pdf', size: 1024 },
      headers: {
        cookie: await app.signInAs('st1'),
        'content-type': 'application/json',
        origin: 'https://evil.example',
      },
    });

    expect(res.statusCode).toBe(403);
  });
});

// ================================================================================================
// Misconfiguration is the operator's problem, not "no such file"
// ================================================================================================

describe('an unconfigured bucket is a 500, not a 404 @g8', () => {
  it('does not disguise a missing S3_BUCKET as a missing file', async () => {
    // `StorageConfigError` is deliberately NOT caught alongside `StorageKeyError`. A 404 here would
    // send whoever is debugging a broken deploy looking for a missing row, while the real cause —
    // an unfilled Railway variable — sits in the environment. `app.ts`'s error handler logs the
    // error in full and answers one fixed sentence.
    await seeded();
    const cookie = await app.signInAs('u_jamie');
    delete process.env.S3_BUCKET;
    resetS3();

    const res = await getAs(resourceUrl('r4'), cookie);

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'Something went wrong.' });
  });
});

// ================================================================================================
// The two name derivations, as pure functions
// ================================================================================================

describe('the file-name derivations @g8', () => {
  it('declaresFile accepts a skill file by name and a resource by its slug, and nothing else', async () => {
    // Read back through the real codec rather than from `seedForDatabase` in memory: `files` and
    // `resources` are jsonb columns, and the route reads whatever came out of `loadDb`.
    await seeded();
    const db = await loadDb();
    const m = db.modules.find((x) => x.id === 'marketing')!;

    expect(declaresFile(m, 'listing-launch-packet.skill.json')).toBe(true);
    expect(declaresFile(m, 'fair-housing-check.skill.yaml')).toBe(true);
    expect(declaresFile(m, 'session-1-slides.pdf')).toBe(true);
    // The title, not the derived name: `EmployeeDetail.vm.ts` never sends this.
    expect(declaresFile(m, 'Session 1 Slides')).toBe(false);
    // Another AI Employee's file, which is the traversal-within-the-prefix case.
    expect(declaresFile(m, 'transcript-atomizer.skill.json')).toBe(false);
    expect(declaresFile(m, '')).toBe(false);
  });

  it("vaultFileName covers all three extension branches of Vault.vm.ts's fileOf", () => {
    expect(vaultFileName({ title: 'Sisu Scorecard Webhook', type: 'Workflow JSON' })).toBe(
      'sisu-scorecard-webhook.json',
    );
    expect(vaultFileName({ title: 'Commission Split Calculator', type: 'Claude Project' })).toBe(
      'commission-split-calculator.json',
    );
    expect(vaultFileName({ title: 'Quarterly Planning Agenda', type: 'PDF guide' })).toBe(
      'quarterly-planning-agenda.pdf',
    );
    // Everything else is markdown — `Prompt pack` and `Notion template`.
    expect(vaultFileName({ title: 'Team Operating System SOP', type: 'Notion template' })).toBe(
      'team-operating-system-sop.md',
    );
  });
});
