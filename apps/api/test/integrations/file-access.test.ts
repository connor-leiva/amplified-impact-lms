// Gate 8's fifth and sixth automated lines — phase 08 § 8.2's file routes against the Railway
// Storage Bucket's presigner.
//
//   "Downloading a Team-tier resource as Jamie returns 403. As Alex it returns 302 to a presigned
//    URL whose `X-Amz-Expires` is ≤ 300."
//   "`upload-url` rejects 26 MB and `text/html` with 422."
//
// ================================================================================================
// WHAT MAKES THIS AN INTEGRATION TEST RATHER THAN A SECOND COPY OF `test/files.test.ts`
// ================================================================================================
// `test/files.test.ts` is the routes' own suite and it is thorough: the 2×2 tier matrix, encoded
// traversal, a blank stored key, the `Content-Disposition` escaping. What it does not do — and what
// no suite in the repository does — is follow ONE CLICK through both halves of the product.
//
// A vault Download is TWO requests, and `apps/web/src/routes/portal/Vault.tsx` makes both:
//
//   const out = await mutate('downloadResource', { id: r.id });   // the counter and the inline error
//   if (out.error) { setError(out.error); return; }
//   if (!saveStoredFile({ kind: 'resource', id: r.id })) saveFile(…);   // → GET /api/files/resource/:id
//
// so the tier rule runs TWICE on every real click, once in `@ai/core`'s `downloadResource` and once
// in the route. `files.ts`'s header calls that deliberate defence in depth and says the two "cannot
// disagree, because both are `@ai/core`'s rule over the same two `tier` fields". This file is the
// only place that claim is tested as a sequence rather than as two independent observations:
//
//   1. THEY MUST AGREE. Jamie's click is refused by the mutation with the inline sentence the vault
//      renders, AND refused by the route with the same sentence. Either one passing alone is a bug:
//      a mutation that allowed it would show a success toast over a browser error page, and a route
//      that allowed it would hand the object to a learner who was told they could not have it.
//   2. THE ROUTE MUST NOT COUNT THE DOWNLOAD. § 8.2 says the download route "runs
//      `downloadResource`"; `files.ts` deliberately does not, because the client already did.
//      `resources.dl` is rendered in three places (the vault row's "412 downloads", the admin
//      Overview leaderboard, the Learners export), so a double count is a plausible-looking wrong
//      number. `dl` is read before the mutation, after the mutation, and after the 302 — the only
//      way to see that exactly one of the two halves writes it.
//   3. A REFUSED CLICK MUST COUNT NOTHING. `downloadResource` throws before `produce`, so Jamie's
//      403 leaves `dl` where it was.
//
// ================================================================================================
// WHY THE PRESIGNED URLS ARE REAL, AND WHY NOTHING HERE OPENS A SOCKET
// ================================================================================================
// `src/storage.test.ts`'s header carries this in full: SigV4 presigning is local cryptography — an
// HMAC-SHA256 over a canonical request string, no handshake, no round trip. Dummy credentials over
// a fake endpoint therefore produce a GENUINE signature over a GENUINE canonical request, so the
// assertions below are about the actual bytes of the actual URL the browser would be redirected to.
// Nothing stubs `@aws-sdk/*`. The credentials are arbitrary HMAC key material with no account.
//
// `resetS3()` runs around every test because `storage.ts` caches its client on first presign.
//
// ================================================================================================
// TIME ZONES
// ================================================================================================
// One date-shaped assertion: `uploads/2026/12/…`. `uploadKey` shards on **UTC**
// (`getUTCFullYear`/`getUTCMonth`) by construction, precisely so the prefix cannot depend on the
// service's `TZ`, and `FIXED_NOW` carries an explicit offset — so `2026/12` is the same string on
// America/Chicago and on a UTC runner. The signature's own `X-Amz-Date` is UTC for the same reason
// (SigV4 requires it). No `fmt.*` call is on either route's path. Run both ways regardless.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedForDatabase } from '@ai/core';
import type { Db, Resource } from '@ai/core';
import { build } from '../../src/app';
import type { App } from '../../src/app';
import { vaultFileName } from '../../src/routes/files';
import {
  ALLOWED_UPLOAD_TYPES,
  GET_EXPIRES_IN,
  MAX_UPLOAD_BYTES,
  PUT_EXPIRES_IN,
  resetS3,
} from '../../src/storage';
import { loadDb, resetDatabase, testDatabase } from '../helpers';

/** Gate 8's instant. Every seeded AI Employee except `operations` is published at it. */
const NOW_ISO = '2026-12-08T13:00:00-06:00';

/** A Railway-shaped environment, with the dotted bucket name `storage.test.ts` uses. */
const S3_ENV = {
  S3_REGION: 'auto',
  S3_ENDPOINT: 'https://bucket-production-a1b2.up.railway.app',
  S3_ACCESS_KEY_ID: 'AKIAEXAMPLEONLY00000',
  S3_SECRET_ACCESS_KEY: 'test-only-hmac-key-material-0000000000',
  S3_BUCKET: 'ai-lms.production',
} as const;

const S3_KEYS = ['S3_REGION', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET'] as const;

/** § 8.2's 25 MB cap, exceeded the way the checklist words it. */
const TWENTY_SIX_MB = 26 * 1000 * 1000;

/** `st1` Casey Lin, role Owner — the seed's `perms` give Owner `curriculum: 1`. */
const CURATOR = 'st1';

let app: App;
let savedEnv: Record<string, string | undefined> = {};

beforeAll(async () => {
  await testDatabase();
});

beforeEach(async () => {
  process.env.FIXED_NOW = NOW_ISO;
  savedEnv = {};
  for (const k of S3_KEYS) {
    savedEnv[k] = process.env[k];
    process.env[k] = S3_ENV[k];
  }
  resetS3();
  await resetDatabase(seedForDatabase('live'));
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

// --- helpers --------------------------------------------------------------------------------------

const mutate = (cookie: string, name: string, args: unknown) =>
  app.inject({
    method: 'POST',
    url: `/api/mutate/${name}`,
    headers: { cookie, 'content-type': 'application/json' },
    payload: args as object,
  });

const download = (id: string, cookie: string) =>
  app.inject({ method: 'GET', url: `/api/files/resource/${encodeURIComponent(id)}`, headers: { cookie } });

const uploadUrl = (cookie: string, body: unknown) =>
  app.inject({
    method: 'POST',
    url: '/api/files/upload-url',
    headers: { cookie, 'content-type': 'application/json' },
    payload: body as object,
  });

/**
 * A Team-tier row from the main vault, chosen by its tier rather than named.
 *
 * `exec: false` keeps it in the Resource & Compliance Vault that both learners can see, so the only
 * difference between Jamie's answer and Alex's is the tier — which is what the checklist line is
 * about. Measured on the `'live'` seed, this is `r9`, "Sisu Closed-Deal Export to Claude".
 */
function teamResource(db: Db): Resource {
  const row = db.resources.find((r) => r.tier === 'team' && r.status === 'published' && !r.exec);
  expect(row, 'the live seed must contain a published, non-exec Team-tier resource').toBeDefined();
  return row!;
}

const downloadsOf = async (id: string): Promise<number> => {
  const db = await loadDb();
  return db.resources.find((r) => r.id === id)!.dl;
};

// --------------------------------------------------------------------------------------------------

describe('Gate 8 · a Team-tier download is refused for Jamie and presigned for Alex @g8', () => {
  it('both halves of Jamie’s click refuse it, with the same sentence, and nothing is counted @g8', async () => {
    const jamie = await app.signInAs('u_jamie');
    const db = await loadDb();
    const resource = teamResource(db);
    expect(db.users.find((u) => u.id === 'u_jamie')!.tier).toBe('agent');
    const before = resource.dl;

    // Half one: the mutation the vault posts first. `downloadResource` throws
    // `MutationError('forbidden', 'Team tier required')`, which `routes/mutate.ts` maps to 403 and
    // `apps/web` renders as the inline error under the list.
    const refusedMutation = await mutate(jamie, 'downloadResource', { id: resource.id });
    expect(refusedMutation.statusCode, refusedMutation.body).toBe(403);
    expect(refusedMutation.json()).toEqual({ error: 'Team tier required' });

    // Half two: the route the browser would navigate to. A learner who skipped the SPA and typed
    // the URL gets the same answer — this is the only thing standing between a hand-typed URL and
    // the object, because a 302 is followed by the browser and the SPA never sees its status.
    const refusedRoute = await download(resource.id, jamie);
    expect(refusedRoute.statusCode, refusedRoute.body).toBe(403);
    expect(refusedRoute.json()).toEqual({ error: 'Team tier required' });
    expect(refusedRoute.headers.location).toBeUndefined();

    // Failure 3 in the header: a refusal counts nothing. `downloadResource` throws before
    // `produce`, and the route writes no row at all.
    expect(await downloadsOf(resource.id)).toBe(before);

    // Both bodies are the string `@ai/core` raises, quoted rather than invented (`files.ts` says
    // so and names the throw site), so the two assertions above being EQUAL is the contract — not
    // each of them being 403.
    expect(refusedRoute.json()).toEqual(refusedMutation.json());
  });

  it('Alex gets a 302 to a presigned GET whose X-Amz-Expires is ≤ 300, and the route counts nothing @g8', async () => {
    const alex = await app.signInAs('u_alex');
    const db = await loadDb();
    const resource = teamResource(db);
    expect(db.users.find((u) => u.id === 'u_alex')!.tier).toBe('team');
    const before = resource.dl;

    // The click's first request. This is the half that writes `dl` and raises the toast.
    const counted = await mutate(alex, 'downloadResource', { id: resource.id });
    expect(counted.statusCode, counted.body).toBe(200);
    expect(counted.json()).toMatchObject({ toast: { msg: `Downloaded ${resource.title}`, tone: 'success' } });
    expect(await downloadsOf(resource.id)).toBe(before + 1);

    // The click's second request.
    const res = await download(resource.id, alex);
    expect(res.statusCode, res.body).toBe(302);
    // Failure 2 in the header: EXACTLY ONE of the two halves writes the counter. § 8.2's sentence
    // would have made this `before + 2`, and the number is rendered in three screens.
    expect(await downloadsOf(resource.id)).toBe(before + 1);

    // A presigned URL is a bearer credential for the object for the next 300 seconds; a cacheable
    // redirect would put it in the back/forward cache and in any intermediary that caches one.
    expect(res.headers['cache-control']).toBe('no-store');

    const location = res.headers.location;
    expect(typeof location).toBe('string');
    const url = new URL(String(location));

    // Gate 8's own clause, read as the inequality it is written as — and then pinned to the exact
    // value, because `storage.ts` clamps rather than defaults (`boundedExpiresIn`) and "≤ 300"
    // would also be satisfied by a URL that expired instantly.
    const expires = Number(url.searchParams.get('X-Amz-Expires'));
    expect(expires).toBeLessThanOrEqual(300);
    expect(expires).toBe(GET_EXPIRES_IN);

    // A real signature over a real canonical request: 64 lower-case hex, i.e. HMAC-SHA256.
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');

    // Path-style addressing (`forcePathStyle: true` in § 8.2's snippet), against the configured
    // endpoint: `<endpoint>/<bucket>/<key>`. A dotted bucket name is the case that would otherwise
    // be hoisted into the host and break TLS.
    expect(url.origin).toBe(new URL(S3_ENV.S3_ENDPOINT).origin);
    expect(url.pathname).toBe(`/${S3_ENV.S3_BUCKET}/resources/${resource.id}`);

    // The name the browser saves under. `vaultFileName` reproduces `Vault.vm.ts`'s own derivation
    // so a viewer who switches data sources does not see their downloads change name — the whole
    // premise Gate 7 rides on, that the backend is invisible. Signed, so the holder of the URL
    // cannot turn the attachment into an inline render.
    const disposition = url.searchParams.get('response-content-disposition');
    expect(disposition).toContain('attachment;');
    expect(disposition).toContain(`filename="${vaultFileName(resource)}"`);
    // `host` is signed, so the URL cannot be replayed against another endpoint. The disposition is
    // a signed QUERY parameter rather than a signed header, which is why it is not in this list and
    // why the holder of the URL still cannot change it.
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('host');
  });
});

describe('Gate 8 · upload-url refuses 26 MB and text/html with 422 @g8', () => {
  it('refuses 26 MB, naming the byte count and the limit @g8', async () => {
    const cookie = await app.signInAs(CURATOR);
    const res = await uploadUrl(cookie, { contentType: 'application/pdf', size: TWENTY_SIX_MB });

    // 422, not 400 and not 413: § 8.2's policy refusal is the same code `routes/mutate.ts` uses for
    // "core refused the request", which is what `apps/web/src/data/http.ts` resolves as a form
    // error rather than throwing. The drop zone shows this message to the admin holding the file.
    expect(res.statusCode, res.body).toBe(422);
    const { error } = res.json() as { error: string };
    expect(error).toContain(String(TWENTY_SIX_MB));
    expect(error).toContain(String(MAX_UPLOAD_BYTES));
    expect(error).toContain('25 MB');
    // Nothing was minted. A 422 that still returned a key would leave the admin with a usable PUT
    // URL for an object the policy just refused.
    expect(res.json()).not.toHaveProperty('url');
    expect(res.json()).not.toHaveProperty('key');
  });

  it('refuses text/html, naming the four types § 8.2 allows @g8', async () => {
    const cookie = await app.signInAs(CURATOR);
    const res = await uploadUrl(cookie, { contentType: 'text/html', size: 1024 });

    expect(res.statusCode, res.body).toBe(422);
    const { error } = res.json() as { error: string };
    expect(error).toContain('text/html');
    for (const allowed of ALLOWED_UPLOAD_TYPES) expect(error).toContain(allowed);
    expect(res.json()).not.toHaveProperty('url');
    // `text/html` is the type that matters most of the four refusals: an HTML object in the bucket,
    // served from the endpoint's own origin, is stored XSS waiting for a presigned GET — which is
    // also why `presignGet` signs `attachment` rather than leaving the disposition to the caller.
  });

  it('the positive control: an allowed pair returns `{ key, url }` with a 600-second PUT @g8', async () => {
    // Without this, both 422s above are satisfied by a route that refuses everything — including a
    // `can()` check that had started answering false for an Owner, which would be a product outage
    // reported as "uploads are broken" rather than as a failing test.
    const cookie = await app.signInAs(CURATOR);
    const res = await uploadUrl(cookie, { contentType: 'application/json', size: 18 * 1024 });
    expect(res.statusCode, res.body).toBe(200);

    const body = res.json() as { key: string; url: string };
    // § 8.2's key layout, with the UTC month shard `uploadKey` builds from `clock.now()`.
    expect(body.key).toMatch(/^uploads\/2026\/12\/[0-9a-f-]{36}\.json$/);

    const url = new URL(body.url);
    expect(Number(url.searchParams.get('X-Amz-Expires'))).toBe(PUT_EXPIRES_IN);
    expect(url.pathname).toBe(`/${S3_ENV.S3_BUCKET}/${body.key}`);
    // The allow-list only binds because the content type is SIGNED: unsigned, the presign for
    // `application/pdf` and the presign for `application/zip` on one key are the same URL, and the
    // 422s above would protect nothing.
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');
  });

  it('a `key` in the body is never honoured, so the 422s cannot be sidestepped @g8', async () => {
    // The refusals above are a policy over `{contentType, size}`. If the route read a `key` from
    // the body, an admin with `curriculum` could request a PUT over any object in the store — a
    // published AI Employee's skill file, another team's upload — and no size or type check would
    // be in the way of overwriting it with whatever they liked.
    const cookie = await app.signInAs(CURATOR);
    const res = await uploadUrl(cookie, {
      contentType: 'application/json',
      size: 1024,
      key: 'modules/meetings/transcript-atomizer.skill.json',
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { key: string; url: string };
    expect(body.key).toMatch(/^uploads\/2026\/12\//);
    expect(body.key).not.toContain('modules/');
    expect(new URL(body.url).pathname).toBe(`/${S3_ENV.S3_BUCKET}/${body.key}`);
  });
});
