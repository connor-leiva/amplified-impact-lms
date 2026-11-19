// Phase 08 § 8.2, the half of it that exists without a bucket: presigning and the upload guard.
//
// WHY THESE ARE REAL ASSERTIONS AND NOT MOCK THEATRE. SigV4 presigning is local cryptography —
// HMAC-SHA256 over a canonical request string, no handshake, no round trip. So dummy credentials
// and a fake endpoint produce a genuine signature over a genuine canonical request, and every
// expectation below reads the actual URL the SDK produced: its host, its path, its query
// parameters, its signed-header list, its signature bytes. Nothing here stubs `@aws-sdk/*`. One
// test proves the no-network claim rather than assuming it, by failing the whole suite if anything
// opens a socket while a presign is in flight.
//
// The credentials are arbitrary strings used as local HMAC key material. There is no account
// behind them and no request is made with them.
//
// `signingDate` is pinned to 2026-12-08T19:00:00Z — Gate 8's `2026-12-08T13:00 CT` — so two URLs
// can be compared for something other than their timestamp.
//
// WHAT IS NOT COVERED, because it does not exist yet: the three routes of § 8.2. Their policy is
// `checkUpload` and the key functions, which is what this file tests; their authorization
// (`canAccess` tiers, staff `curriculum`) and their status codes land with the Fastify app.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import net from 'node:net';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { seedForDatabase } from '@ai/core';
import {
  ALLOWED_UPLOAD_TYPES,
  GET_EXPIRES_IN,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  bucketOrigin,
  singleByteRange,
  PUT_EXPIRES_IN,
  StorageConfigError,
  StorageKeyError,
  checkUpload,
  contentDisposition,
  isSafeKeySegment,
  moduleFileKey,
  presignGet,
  presignPut,
  readS3Config,
  resetS3,
  resourceKey,
  uploadKey,
} from './storage';
import type { AllowedContentType } from './storage';

/** A Railway-shaped environment. The bucket name carries a dot on purpose — see the path-style tests. */
const ENV = {
  S3_REGION: 'auto',
  S3_ENDPOINT: 'https://bucket-production-a1b2.up.railway.app',
  S3_ACCESS_KEY_ID: 'AKIAEXAMPLEONLY00000',
  S3_SECRET_ACCESS_KEY: 'test-only-hmac-key-material-0000000000',
  S3_BUCKET: 'ai-lms.production',
} as const;

const KEYS = ['S3_REGION', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET'] as const;

/** Gate 8's own instant, as a signing date. */
const AT = new Date('2026-12-08T19:00:00Z');

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    process.env[k] = ENV[k];
  }
  // The module caches its client and config on first use, so every test starts from the
  // environment it just set rather than from whatever the previous test left behind.
  resetS3();
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetS3();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const q = (url: string, name: string): string | null => new URL(url).searchParams.get(name);

/**
 * A bucket name with NO dot, which is the only kind on which `forcePathStyle` is observable.
 *
 * The SDK picks path style by itself for any dotted bucket name, so `ENV.S3_BUCKET` — deliberately
 * Railway-shaped, dot included — produces a path-style URL with the flag set or cleared. Measured
 * in `measures why a dotted bucket name cannot pin forcePathStyle at all`.
 */
const DOTLESS_BUCKET = 'ailms-production';

/** Re-points the module at another bucket. `resetS3` is what makes the next presign read it; `afterEach` restores the variable. */
const withBucket = (bucket: string): void => {
  process.env.S3_BUCKET = bucket;
  resetS3();
};

/** `filename*=UTF-8''` — the starred parameter's prefix, including the two apostrophes it spends on its own syntax. */
const STARRED = "filename*=UTF-8''";

// =================================================================================================
// Configuration: fail loudly at the point of use
// =================================================================================================

describe('§ 8.2 S3 configuration @g8', () => {
  it('reads § 8.2’s five variables, trimming each one', () => {
    const config = readS3Config({
      S3_REGION: ' us-east-2 ',
      S3_ENDPOINT: ' https://ep.example ',
      S3_ACCESS_KEY_ID: ' AKIA ',
      S3_SECRET_ACCESS_KEY: ' shhh ',
      S3_BUCKET: ' ai-lms.production ',
    });
    expect(config).toEqual({
      region: 'us-east-2',
      endpoint: 'https://ep.example',
      bucket: 'ai-lms.production',
      accessKeyId: 'AKIA',
      secretAccessKey: 'shhh',
      urlStyle: 'path',
    });
  });

  it('reads S3_URL_STYLE: path by default, virtual when a bucket needs it, and nothing else', () => {
    expect(readS3Config({ ...ENV, S3_URL_STYLE: undefined }).urlStyle).toBe('path');
    expect(readS3Config({ ...ENV, S3_URL_STYLE: ' Virtual ' }).urlStyle).toBe('virtual');
    expect(() => readS3Config({ ...ENV, S3_URL_STYLE: 'hosted' })).toThrow(StorageConfigError);
    expect(() => readS3Config({ ...ENV, S3_URL_STYLE: 'hosted' })).toThrow(/S3_URL_STYLE.*'path' or 'virtual'/);
  });

  it('defaults the region to ‘auto’, as § 8.2’s snippet does', () => {
    expect(readS3Config({ ...ENV, S3_REGION: undefined }).region).toBe('auto');
  });

  it('refuses a missing S3_BUCKET and names it', () => {
    const run = () => readS3Config({ ...ENV, S3_BUCKET: undefined });
    expect(run).toThrow(StorageConfigError);
    expect(run).toThrow(/S3_BUCKET is not set/);
  });

  // This is the failure the Gate 8 line is about: "a missing S3_BUCKET or credential fails loudly
  // at the point of use rather than producing a URL that 403s in the browser hours later". A blank
  // string, not an absent variable, is the dangerous shape — see the measured test below.
  it('refuses a BLANK credential, which is what an unfilled Railway variable gives you', () => {
    for (const k of ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET'] as const) {
      const run = () => readS3Config({ ...ENV, [k]: '   ' });
      expect(run, k).toThrow(StorageConfigError);
      expect(run, k).toThrow(new RegExp(`${k} is not set`));
    }
  });

  it('names every missing variable at once, so one restart finds them all', () => {
    const run = () =>
      readS3Config({ S3_REGION: 'auto', S3_ENDPOINT: ENV.S3_ENDPOINT });
    expect(run).toThrow(/S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY are not set/);
  });

  it('refuses no endpoint together with the region ‘auto’, which can only sign URLs that 403', () => {
    // 'auto' is a placeholder S3-compatible stores accept and AWS S3 rejects. With no endpoint the
    // request goes to AWS, so this pair is a misconfiguration that signs perfectly well.
    const run = () => readS3Config({ ...ENV, S3_ENDPOINT: undefined });
    expect(run).toThrow(StorageConfigError);
    expect(run).toThrow(/rejects the region 'auto'/);
    // A real region with no endpoint is AWS S3 proper, which is fine.
    expect(readS3Config({ ...ENV, S3_ENDPOINT: undefined, S3_REGION: 'us-east-2' })).toMatchObject({
      endpoint: undefined,
      region: 'us-east-2',
    });
  });

  it('fails at the point of use, not at import: the pure half of the module works unconfigured', async () => {
    for (const k of KEYS) delete process.env[k];
    resetS3();
    // Importing this file already proved the module loads with no S3 variables set. These prove it
    // stays *useful*: the guard and the key layout are reachable with no bucket in sight, which is
    // the whole reason config resolution is lazy.
    expect(checkUpload({ contentType: 'application/pdf', size: 1024 }).ok).toBe(true);
    expect(resourceKey('r2')).toBe('resources/r2');
    // And the presign itself fails with a message that names the variable.
    await expect(presignGet('resources/r2', 'x.pdf')).rejects.toThrow(StorageConfigError);
    await expect(presignGet('resources/r2', 'x.pdf')).rejects.toThrow(/S3_BUCKET/);
  });

  it('measures the SDK behaviour the blank-credential check exists to prevent', async () => {
    // Not a test of our code — a pin on the upstream behaviour that motivates `readS3Config`. With
    // empty-string credentials, exactly what § 8.2's `process.env.S3_ACCESS_KEY_ID!` yields for a
    // variable that exists but was never filled in, the SDK does NOT complain. It signs, and hands
    // back a well-formed URL with an empty access key id in X-Amz-Credential. That URL 403s in a
    // learner's browser long after the deploy that broke it.
    const naive = new S3Client({
      region: 'auto',
      endpoint: ENV.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: '', secretAccessKey: '' },
    });
    const url = await getSignedUrl(naive, new GetObjectCommand({ Bucket: 'b', Key: 'k' }), {
      expiresIn: 300,
      signingDate: AT,
    });
    naive.destroy();
    expect(url).toMatch(/^https:\/\//);
    expect(q(url, 'X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    // The empty key id, which is the whole tell: `/20261208/auto/s3/aws4_request`.
    expect(q(url, 'X-Amz-Credential')).toBe('/20261208/auto/s3/aws4_request');
    // Our own path refuses the same input instead of signing it.
    expect(() => readS3Config({ ...ENV, S3_ACCESS_KEY_ID: '' })).toThrow(StorageConfigError);
  });
});

// =================================================================================================
// presignGet
// =================================================================================================

describe('§ 8.2 presignGet @g8', () => {
  it('expires in at most 300 s and carries the attachment disposition with the filename', async () => {
    const url = await presignGet('resources/r2', 'MLS Public Remarks Rules.pdf', { signingDate: AT });

    // Gate 8: "a presigned URL whose X-Amz-Expires is <= 300".
    expect(Number(q(url, 'X-Amz-Expires'))).toBeLessThanOrEqual(300);
    expect(q(url, 'X-Amz-Expires')).toBe(String(GET_EXPIRES_IN));

    // § 8.2's ResponseContentDisposition, which S3 echoes into the download response. `attachment`
    // is load-bearing: without it the browser renders the object inline, and an inline render of a
    // file one learner uploaded is served from our own origin.
    const disposition = q(url, 'response-content-disposition');
    expect(disposition).toBe(
      'attachment; filename="MLS Public Remarks Rules.pdf"; ' +
        "filename*=UTF-8''MLS%20Public%20Remarks%20Rules.pdf",
    );
    // Signed, so whoever holds the URL cannot turn the attachment into an inline render.
    expect(q(url, 'X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(q(url, 'X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
  });

  it('uses path-style addressing, so a bucket name with a dot still works', async () => {
    const url = await presignGet('resources/r2', 'x.pdf', { signingDate: AT });
    const parsed = new URL(url);
    // The dot stays in the PATH. Virtual-hosted addressing would make the host
    // `ai-lms.production.bucket-production-a1b2.up.railway.app`, where a one-level wildcard
    // certificate does not match and TLS fails before a byte is sent.
    expect(parsed.host).toBe(new URL(ENV.S3_ENDPOINT).host);
    expect(parsed.host).not.toContain(ENV.S3_BUCKET);
    expect(parsed.pathname).toBe('/ai-lms.production/resources/r2');
    // READ THE NEXT TWO TESTS BEFORE TRUSTING THIS ONE. Every assertion above also holds with
    // `forcePathStyle` deleted, because the SDK falls back to path style on its own for any dotted
    // bucket name. This test states § 8.2's requirement; it does not pin the setting.
  });

  // THE TEST THAT ACTUALLY PINS `forcePathStyle: true`, which is the single most
  // costly-and-invisible line in `storage.ts`: delete it and every download and upload fails at
  // the TLS handshake, before a byte moves, with no code path in this repo reporting anything.
  //
  // It needs a DOTLESS bucket name. With a dot in the name the SDK chooses path style regardless
  // of the flag (measured in the test below), so the flag is unobservable and the obvious test —
  // the one above, on the Railway-shaped `ai-lms.production` — is a false green.
  it('addresses a DOTLESS bucket in the path too, which only forcePathStyle can decide', async () => {
    withBucket(DOTLESS_BUCKET);
    const parsed = new URL(await presignGet('resources/r2', 'x.pdf', { signingDate: AT }));
    // Virtual-hosted addressing would give host `ailms-production.bucket-production-a1b2.up.
    // railway.app` and path `/resources/r2`. Both halves are asserted: the bucket is IN the path
    // and is NOT in the host, so neither a host rewrite nor a path rewrite can satisfy this by
    // accident.
    expect(parsed.host).toBe(new URL(ENV.S3_ENDPOINT).host);
    expect(parsed.host.startsWith(`${DOTLESS_BUCKET}.`)).toBe(false);
    expect(parsed.pathname).toBe(`/${DOTLESS_BUCKET}/resources/r2`);
    // And the URL is still a real signed URL rather than something that failed differently.
    expect(q(parsed.href, 'X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  // S3_URL_STYLE=virtual (Railway's newer buckets): the bucket moves into the host for a dotless name.
  it('addresses a dotless bucket in the HOST with S3_URL_STYLE=virtual, and still signs the link', async () => {
    process.env.S3_URL_STYLE = 'virtual';
    withBucket(DOTLESS_BUCKET);
    const parsed = new URL(await presignGet('resources/r2', 'x.pdf', { signingDate: AT }));
    expect(parsed.host).toBe(`${DOTLESS_BUCKET}.${new URL(ENV.S3_ENDPOINT).host}`);
    expect(parsed.pathname).toBe('/resources/r2');
    expect(q(parsed.href, 'X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    delete process.env.S3_URL_STYLE;
  });

  it('measures why a dotted bucket name cannot pin forcePathStyle at all', async () => {
    // Not a test of our code — an upstream pin, in the same spirit as the blank-credential
    // measurement above, and the justification for the dotless name the previous test uses. If a
    // later SDK ever stops special-casing dotted names, this test fails and says so, instead of
    // the previous test quietly becoming the only one that matters.
    const shape = async (bucket: string, forcePathStyle: boolean): Promise<string> => {
      const client = new S3Client({
        region: 'auto',
        endpoint: ENV.S3_ENDPOINT,
        forcePathStyle,
        credentials: {
          accessKeyId: ENV.S3_ACCESS_KEY_ID,
          secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
        },
      });
      const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: 'k' }), {
        expiresIn: 300,
        signingDate: AT,
      });
      client.destroy();
      const parsed = new URL(url);
      return `${parsed.host}${parsed.pathname}`;
    };

    const endpointHost = new URL(ENV.S3_ENDPOINT).host;
    // A dotted name: identical either way. This is the false green, as an assertion.
    expect(await shape(ENV.S3_BUCKET, true)).toBe(await shape(ENV.S3_BUCKET, false));
    expect(await shape(ENV.S3_BUCKET, false)).toBe(`${endpointHost}/${ENV.S3_BUCKET}/k`);
    // A dotless name: the flag is the whole difference, which is why the test above uses one.
    expect(await shape(DOTLESS_BUCKET, true)).toBe(`${endpointHost}/${DOTLESS_BUCKET}/k`);
    expect(await shape(DOTLESS_BUCKET, false)).toBe(`${DOTLESS_BUCKET}.${endpointHost}/k`);
  });

  it('passes the key through untouched, including a name with spaces and a colon', async () => {
    const key = moduleFileKey('marketing', 'Test Listing: 1418 Alder Ct');
    const url = await presignGet(key, 'Test Listing: 1418 Alder Ct.pdf', { signingDate: AT });
    // The SDK percent-encodes the key into the path; decoding gets the key back verbatim, which is
    // what proves nothing mangled it on the way through.
    expect(decodeURIComponent(new URL(url).pathname)).toBe(`/${ENV.S3_BUCKET}/${key}`);
  });

  it('adds no checksum-mode parameter, which a compatible store need not implement', async () => {
    // `responseChecksumValidation` defaults to 'WHEN_SUPPORTED' and appends a SIGNED
    // `x-amz-checksum-mode=ENABLED`. Signed means mandatory: the browser must send it, and the
    // Railway bucket is S3-compatible rather than S3. A dependency bump re-enabling this is what
    // this test is for.
    const url = await presignGet('resources/r2', 'x.pdf', { signingDate: AT });
    expect(q(url, 'x-amz-checksum-mode')).toBeNull();
  });
});

// =================================================================================================
// presignPut
// =================================================================================================

describe('§ 8.2 presignPut @g8', () => {
  it('expires in at most 600 s and binds the content type into the signature', async () => {
    const url = await presignPut('uploads/2026/12/abcd1234-ef56.pdf', 'application/pdf', {
      signingDate: AT,
    });

    expect(Number(q(url, 'X-Amz-Expires'))).toBeLessThanOrEqual(600);
    expect(q(url, 'X-Amz-Expires')).toBe(String(PUT_EXPIRES_IN));

    // The content type is carried as a SIGNED HEADER, not a query parameter — the presigner cannot
    // hoist `content-type` into the query string. So `X-Amz-SignedHeaders` is where it shows up,
    // and the uploader must send the value or the store rejects the request.
    expect(q(url, 'X-Amz-SignedHeaders')).toBe('content-type;host');
  });

  // THE CENTRAL CLAIM of decision 3: it is the content-type VALUE that is bound, not merely the
  // header's name. Same key, same date, same everything — only the type differs, and the signature
  // changes. Without `signableHeaders` both URLs sign `host` alone and these two are identical,
  // which would mean a URL issued for a PDF happily accepts `text/html`.
  it('binds the content-type VALUE, so a PDF URL cannot be used to upload HTML', async () => {
    const forPdf = await presignPut('uploads/2026/12/same-key-0001.pdf', 'application/pdf', {
      signingDate: AT,
    });
    const forZip = await presignPut('uploads/2026/12/same-key-0001.pdf', 'application/zip', {
      signingDate: AT,
    });
    expect(new URL(forPdf).pathname).toBe(new URL(forZip).pathname);
    expect(q(forPdf, 'X-Amz-Date')).toBe(q(forZip, 'X-Amz-Date'));
    expect(q(forPdf, 'X-Amz-Signature')).not.toBe(q(forZip, 'X-Amz-Signature'));
  });

  it('carries no empty-body checksum, which would make every real upload fail', async () => {
    // `requestChecksumCalculation` defaults to 'WHEN_SUPPORTED' since SDK v3.729, which signs
    // `x-amz-sdk-checksum-algorithm=CRC32` and `x-amz-checksum-crc32=AAAAAA==` into the URL.
    // `AAAAAA==` is the CRC32 of an EMPTY body — the body the presigner had. A browser PUTting
    // real bytes to that URL asserts a checksum of nothing and is rejected.
    const url = await presignPut('uploads/2026/12/abcd1234-ef56.pdf', 'application/pdf', {
      signingDate: AT,
    });
    expect(q(url, 'x-amz-checksum-crc32')).toBeNull();
    expect(q(url, 'x-amz-sdk-checksum-algorithm')).toBeNull();
  });

  it('refuses a content type that could not be a header value', async () => {
    await expect(presignPut('uploads/k.pdf', 'application/pdf\r\nX-Injected: 1')).rejects.toThrow(
      TypeError,
    );
    await expect(presignPut('uploads/k.pdf', '  ')).rejects.toThrow(/Not a usable content type/);
  });

  it('composes with the guard: check, mint a key, presign', async () => {
    // The whole § 8.2 upload path minus the route. The type that gets signed is the one the guard
    // returned, which is the only ordering that makes the allow-list mean anything.
    const check = checkUpload({ contentType: 'application/zip', size: 4_000_000 });
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    const key = uploadKey(check.contentType, { now: AT.getTime(), token: 'e3f1a2b4-5c6d-7e8f' });
    expect(key).toBe('uploads/2026/12/e3f1a2b4-5c6d-7e8f.zip');
    const url = await presignPut(key, check.contentType, { signingDate: AT });
    expect(new URL(url).pathname).toBe(`/${ENV.S3_BUCKET}/${key}`);
    expect(q(url, 'X-Amz-SignedHeaders')).toBe('content-type;host');
  });
});

// =================================================================================================
// The two bounds that used to rest on key order in an object literal
// =================================================================================================

describe('§ 8.2 presign bounds are structural, not positional @g8', () => {
  // Both presigners used to build their signer config as `{ expiresIn: GET_EXPIRES_IN, ...options }`
  // — the caller's spread AFTER the default, so the caller silently won. Gate 8's one assertion on
  // a download URL is `X-Amz-Expires` <= 300, and the only other thing in the way was TypeScript's
  // excess-property check.
  //
  // These options are NOT a cast. `PresignOptions` does not declare `expiresIn`, but the
  // excess-property check only fires on a FRESH object literal: a variable, or an `Object.assign`,
  // type-checks clean — and the compiled JS that the deferred Fastify route hands us has no check
  // at all. So the compiler was never the guard, which is why `boundedExpiresIn` exists.
  const KEY = 'uploads/2026/12/abcd1234-ef56.pdf';
  const aDay = { signingDate: AT, expiresIn: 86_400 };
  const viaAssign = Object.assign({ signingDate: AT }, { expiresIn: 86_400 });

  /**
   * Options carrying an `expiresIn`, in a shape the compiler passes.
   *
   * A FRESH literal at the call site — `presignGet(k, f, { signingDate: AT, expiresIn: 30 })` — is
   * the ONE shape TypeScript rejects, which is precisely why the old positional default looked
   * safe: every other way of getting there (a variable, `Object.assign`, a spread, a cast, or any
   * call from the compiled JS a Fastify plugin hands us) type-checks clean. So these tests use one
   * of the ways that work, because that is the way the defect is reachable.
   */
  const asking = (expiresIn: number) => Object.assign({ signingDate: AT }, { expiresIn });

  it('clamps a GET to 300 s however the caller asks for longer', async () => {
    for (const [label, options] of [
      ['a variable', aDay],
      ['Object.assign', viaAssign],
    ] as const) {
      const url = await presignGet('resources/r2', 'x.pdf', options);
      // Gate 8, verbatim: "a presigned URL whose X-Amz-Expires is <= 300".
      expect(Number(q(url, 'X-Amz-Expires')), label).toBeLessThanOrEqual(300);
      expect(q(url, 'X-Amz-Expires'), label).toBe(String(GET_EXPIRES_IN));
    }
    // What the caller asked for, as a reminder of the size of the hole: a day-long download URL is
    // a day in which a forwarded link or a browser-history entry still reads a vault object. The
    // expiry IS the revocation story for a presigned URL — there is nothing else to revoke.
    expect(aDay.expiresIn).toBe(86_400);
  });

  it('clamps a PUT to 600 s however the caller asks for longer', async () => {
    const url = await presignPut(KEY, 'application/pdf', aDay);
    expect(Number(q(url, 'X-Amz-Expires'))).toBeLessThanOrEqual(600);
    expect(q(url, 'X-Amz-Expires')).toBe(String(PUT_EXPIRES_IN));
  });

  it('honours a SHORTER expiry, because nothing about the bound argues for longer URLs', async () => {
    const url = await presignGet('resources/r2', 'x.pdf', asking(30));
    expect(q(url, 'X-Amz-Expires')).toBe('30');
    const put = await presignPut(KEY, 'application/pdf', asking(45));
    expect(q(put, 'X-Amz-Expires')).toBe('45');
  });

  it('falls back to the § 8.2 default for an expiry that is not a usable number', async () => {
    // A nonsense `expiresIn` is a bug in our own calling code, and failing a learner's download
    // over it would be worse than ignoring it. It must not reach the signer, though: `expiresIn: 0`
    // forwarded raw produces `X-Amz-Expires=0`, a URL that is expired on arrival.
    for (const expiresIn of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      const url = await presignGet('resources/r2', 'x.pdf', asking(expiresIn));
      const expected = expiresIn === 1.5 ? '1' : String(GET_EXPIRES_IN);
      expect(q(url, 'X-Amz-Expires'), String(expiresIn)).toBe(expected);
    }
  });

  it('does not let a caller unbind the content type either', async () => {
    // The same positional defect, second victim: `signableHeaders` also sat before `...options`, so
    // a caller passing an empty set through a spread or a cast unbound the content type and turned
    // an upload URL into one that accepts `text/html` — decision 3, undone from the outside.
    const unbind = Object.assign({ signingDate: AT }, { signableHeaders: new Set<string>() });
    const url = await presignPut(KEY, 'application/pdf', unbind);
    expect(q(url, 'X-Amz-SignedHeaders')).toBe('content-type;host');
  });
});

// =================================================================================================
// The key the presigners are handed is not always one of ours
// =================================================================================================

describe('§ 8.2 presigning validates the key it was handed @g8', () => {
  // `storage.ts`'s own header tells the deferred `GET /api/files/resource/:id` route to presign the
  // row's STORED `storage_key` in preference to `resourceKey(:id)`. A stored key is a database
  // column, not a value any builder re-derives at request time, so the presigners cannot assume
  // their key came from `resourceKey`/`moduleFileKey`/`uploadKey` at all.
  const BACKSLASH = String.fromCharCode(92);
  const NUL = String.fromCharCode(0);

  it('measures what an unvalidated stored key actually signs, which is why this check exists', async () => {
    // An upstream pin, not a test of our code. The SDK's endpoint resolution NORMALISES the path
    // before signing, so dot segments in a key are not inert the way they are inside S3's flat
    // namespace — they collapse, and the signed URL addresses a different object than the key
    // names. Measured on this SDK version, path style, bucket `ai-lms.production`:
    //
    //   ''                               -> /ai-lms.production/          the BUCKET ROOT
    //   'resources/../secret'            -> /ai-lms.production/secret    out of its prefix
    //   'resources/../../other-bucket/x' -> /other-bucket/x              out of the BUCKET
    //
    // The last one is the reason this is a security fix and not hygiene: one malformed
    // `storage_key` and the Download button hands out a signed URL for a different bucket in the
    // same account.
    const client = new S3Client({
      region: 'auto',
      endpoint: ENV.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: ENV.S3_ACCESS_KEY_ID,
        secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
      },
    });
    const pathFor = async (Key: string): Promise<string> => {
      const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: ENV.S3_BUCKET, Key }), {
        expiresIn: 300,
        signingDate: AT,
      });
      return new URL(url).pathname;
    };
    expect(await pathFor('')).toBe(`/${ENV.S3_BUCKET}/`);
    expect(await pathFor('resources/../secret')).toBe(`/${ENV.S3_BUCKET}/secret`);
    expect(await pathFor('resources/../../other-bucket/x')).toBe('/other-bucket/x');
    client.destroy();
  });

  it('refuses a key no builder could have produced, with the documented error type', async () => {
    const unusable: unknown[] = [
      // The empty and near-empty shapes a half-written `storage_key` column gives you. Each one
      // signs a URL at or near the bucket root rather than failing.
      '',
      '/',
      '//',
      'resources/',
      '/resources/r2',
      'resources//r2',
      // Dot segments, which the measurement above shows the SDK collapses before signing.
      'resources/../secret',
      'resources/../../other-bucket/x',
      'resources/./r2',
      // The characters `isSafeKeySegment` refuses, reaching the presigner through a column instead
      // of through a builder: a `%` a compatible store may decode once more than we expect, a
      // backslash a filesystem-backed gateway treats as a delimiter, a `?` that would start a
      // query string next to the signature's own parameters, and a NUL that truncates the key in
      // any C implementation downstream.
      'resources/pct-%2fr2',
      `modules/m/a${BACKSLASH}b`,
      'resources/r2?x=1',
      'resources/r2#frag',
      `resources/r${NUL}2`,
      'resources/ leading',
      'resources/trailing ',
      // Over S3's own 1024-byte whole-key limit while every segment is individually legal, which
      // is why the key length is checked as well as each segment.
      Array.from({ length: 20 }, () => 'x'.repeat(100)).join('/'),
      // Not a string at all — `storage_key` is nullable, and `row.storage_key ?? undefined` in the
      // deferred route is one keystroke from `row.storage_key`.
      undefined,
      null,
      42,
    ];
    for (const key of unusable) {
      const label = JSON.stringify(key) ?? String(key);
      // `StorageKeyError`, which is what this file documents for an unusable key and what the
      // deferred routes map to a 404. Before this check the answer was a raw SDK error (an unmapped
      // 500 on a Download click) or, for every shape above except the non-strings, no error at all.
      await expect(presignGet(key as string, 'x.pdf', { signingDate: AT }), label).rejects.toThrow(
        StorageKeyError,
      );
      await expect(
        presignPut(key as string, 'application/pdf', { signingDate: AT }),
        label,
      ).rejects.toThrow(StorageKeyError);
      // Not merely "some error": a `StorageConfigError` here would be a 500 and a `TypeError` an
      // unmapped one, and the point of the fix is which answer the learner gets.
      await expect(presignGet(key as string, 'x.pdf', { signingDate: AT }), label).rejects.toThrow(
        /Unusable storage key/,
      );
    }
  });

  it('accepts every key the three builders produce, so the check cannot be the thing that breaks', async () => {
    // The reason `requireKey` reuses `isSafeKeySegment` rather than writing a second rule: a
    // stricter check here would refuse keys the download routes legitimately derive, and the
    // seeded names include `Test Listing: 1418 Alder Ct` and `Session 1 Slides`.
    const keys = [
      resourceKey('r2'),
      moduleFileKey('marketing', 'Test Listing: 1418 Alder Ct'),
      moduleFileKey('marketing', 'fair-housing-check.skill.yaml'),
      uploadKey('application/pdf', { now: AT.getTime(), token: 'e3f1a2b4-5c6d-7e8f' }),
    ];
    for (const key of keys) {
      const url = await presignGet(key, 'x.pdf', { signingDate: AT });
      expect(decodeURIComponent(new URL(url).pathname), key).toBe(`/${ENV.S3_BUCKET}/${key}`);
    }
  });
});

// =================================================================================================
// No network
// =================================================================================================

describe('§ 8.2 presigning is local cryptography @g8', () => {
  it('opens no socket and makes no fetch while signing either kind of URL', async () => {
    // Two guards, because "the network" has two doors in Node: `fetch`, and every TCP connection
    // whatever built it — `net.Socket.prototype.connect` is underneath http, https and undici
    // alike, so there is no handler the SDK could swap in that would slip past this.
    const reached = vi.fn(() => {
      throw new Error('presigning must not reach the network');
    });
    vi.stubGlobal('fetch', reached);
    const connect = vi
      .spyOn(net.Socket.prototype, 'connect')
      .mockImplementation(() => {
        throw new Error('presigning must not open a socket');
      });

    // Reset inside the guards so client CONSTRUCTION is covered too: an implicit credential
    // provider would reach for instance metadata here, which is why the credentials are explicit.
    resetS3();
    const get = await presignGet('resources/r2', 'x.pdf', { signingDate: AT });
    const put = await presignPut('uploads/2026/12/abcd1234-ef56.pdf', 'application/pdf', {
      signingDate: AT,
    });

    expect(get).toContain('X-Amz-Signature=');
    expect(put).toContain('X-Amz-Signature=');
    expect(reached).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });
});

// =================================================================================================
// The upload guard
// =================================================================================================

describe('§ 8.2 upload guard @g8', () => {
  it('caps the size at 25 decimal MB, the only reading that refuses Gate 8’s 26 MB', () => {
    // § 8.2 says "caps size at 25 MB" without saying which megabyte, and the two readings disagree
    // about the one case the gate names. 26 MB read as 26,000,000 is BELOW 25 × 1024²
    // (26,214,400), so a 1024-based cap would answer 200 to the exact size Gate 8 lists as a 422.
    expect(MAX_UPLOAD_BYTES).toBe(25_000_000);
    expect(26 * 1024 * 1024).toBeGreaterThan(MAX_UPLOAD_BYTES);
    expect(26_000_000).toBeGreaterThan(MAX_UPLOAD_BYTES);
    // Which is the whole argument, written as an assertion so nobody "fixes" the constant to MiB
    // without noticing what it costs.
    expect(26_000_000).toBeLessThan(25 * 1024 * 1024);
  });

  // Gate 8: "`upload-url` rejects 26 MB and `text/html` with 422."
  it('rejects 26 MB with 422, under either reading of a megabyte', () => {
    for (const size of [26 * 1024 * 1024, 26_000_000]) {
      const result = checkUpload({ contentType: 'application/pdf', size });
      expect(result.ok, String(size)).toBe(false);
      if (result.ok) continue;
      expect(result.status, String(size)).toBe(422);
      // The message carries the byte count and the limit, so a refusal is legible to the admin who
      // just dragged a file in rather than a bare "too large".
      expect(result.error, String(size)).toContain(String(size));
      expect(result.error, String(size)).toContain('25 MB');
    }
  });

  it('rejects text/html with 422', () => {
    const result = checkUpload({ contentType: 'text/html', size: 1024 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
    expect(result.error).toContain('text/html');
    // The message names the four, because the drop zone's own copy says "JSON, PDF, Markdown or
    // Notion export" and an admin reading a 422 should not have to guess the media types.
    for (const t of ALLOWED_UPLOAD_TYPES) expect(result.error).toContain(t);
  });

  it('accepts each allowed type at exactly 25 MB', () => {
    for (const type of ALLOWED_UPLOAD_TYPES) {
      const result = checkUpload({ contentType: type, size: MAX_UPLOAD_BYTES });
      expect(result.ok, type).toBe(true);
      if (!result.ok) continue;
      expect(result.contentType, type).toBe(type);
      expect(result.size, type).toBe(MAX_UPLOAD_BYTES);
    }
    // § 8.2's four, then D-188's three, not six and a typo.
    expect(ALLOWED_UPLOAD_TYPES).toEqual([
      'application/json',
      'application/pdf',
      'text/markdown',
      'application/zip',
      'video/mp4',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/jpeg',
      'text/vtt',
    ]);
  });

  // D-188: video/mp4, .xlsx and .csv; 500 MB for video only.
  it('caps video/mp4 at 500 decimal MB, and only video', () => {
    expect(MAX_VIDEO_UPLOAD_BYTES).toBe(500_000_000);
    const at = checkUpload({ contentType: 'video/mp4', size: MAX_VIDEO_UPLOAD_BYTES });
    expect(at.ok).toBe(true);
    const over = checkUpload({ contentType: 'video/mp4', size: MAX_VIDEO_UPLOAD_BYTES + 1 });
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.status).toBe(422);
      expect(over.error).toContain('500 MB');
    }
    // Every other type keeps 25 MB: one byte over is refused, however far under the video cap.
    for (const type of ALLOWED_UPLOAD_TYPES.filter((t) => t !== 'video/mp4')) {
      expect(checkUpload({ contentType: type, size: MAX_UPLOAD_BYTES }).ok, type).toBe(true);
      const big = checkUpload({ contentType: type, size: MAX_UPLOAD_BYTES + 1 });
      expect(big.ok, type).toBe(false);
      if (!big.ok) expect(big.error, type).toContain('25 MB');
    }
    // Over every cap: refused before the type is read.
    expect(checkUpload({ contentType: 'video/mp4', size: 2_000_000_000 }).ok).toBe(false);
  });

  it('accepts a spreadsheet and a CSV by their exact types', () => {
    for (const [type, name] of [
      ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Pipeline.xlsx'],
      ['text/csv', 'leads.csv'],
      ['video/mp4', 'Week 1 walkthrough.mp4'],
    ] as const) {
      const result = checkUpload({ contentType: type, size: 2048, name });
      expect(result.ok, type).toBe(true);
    }
    // Windows calls a CSV this, and it is not what the URL is signed for.
    expect(checkUpload({ contentType: 'application/vnd.ms-excel', size: 2048 }).ok).toBe(false);
  });

  it('refuses a name whose extension does not name the declared type', () => {
    for (const [contentType, name] of [
      ['text/csv', 'page.html'],
      ['video/mp4', 'clip.mov'],
      ['application/pdf', 'guide.pdf.exe'],
      ['text/markdown', 'notes'],
      ['text/csv', ''],
      ['text/csv', 42],
    ] as const) {
      const result = checkUpload({ contentType, size: 2048, name });
      expect(result.ok, `${contentType} ${String(name)}`).toBe(false);
      if (!result.ok) expect(result.status).toBe(422);
    }
    expect(checkUpload({ contentType: 'text/markdown', size: 10, name: 'Notes.MARKDOWN' }).ok).toBe(true);
    // No name at all: § 8.2's body, accepted as before.
    expect(checkUpload({ contentType: 'text/csv', size: 10 }).ok).toBe(true);
  });

  it('refuses a size that is not a whole positive number of bytes', () => {
    const bad: Array<[unknown, RegExp]> = [
      [0, /at least 1 byte/],
      [-1, /at least 1 byte/],
      [1.5, /whole number/],
      [Number.NaN, /must be a number/],
      [Number.POSITIVE_INFINITY, /must be a number/],
      ['1024', /must be a number/],
      [null, /must be a number/],
      [undefined, /must be a number/],
    ];
    for (const [size, message] of bad) {
      const result = checkUpload({ contentType: 'application/pdf', size });
      expect(result.ok, String(size)).toBe(false);
      if (result.ok) continue;
      expect(result.status, String(size)).toBe(422);
      expect(result.error, String(size)).toMatch(message);
    }
    // A 0-byte PUT succeeds against S3 and leaves an empty object that `uploadResource` would
    // publish as a downloadable file, which is why 0 is a 422 rather than a shrug.
    expect(checkUpload({ contentType: 'application/pdf', size: 1 }).ok).toBe(true);
  });

  it('demands the exact media type: no case folding, no parameters', () => {
    // Decision 4. The guard's answer becomes a SIGNED header value, and S3 compares that value
    // byte for byte against what the uploader sends. Accepting `Application/PDF` and signing
    // `application/pdf` would hand the client a URL our own guard called valid and the store then
    // rejects with SignatureDoesNotMatch. A 422 now beats an opaque signature error later.
    for (const sent of [
      'Application/PDF',
      'APPLICATION/JSON',
      'application/pdf; charset=utf-8',
      'text/markdown;charset=UTF-8',
      'application/pdf ; q=1',
    ]) {
      const result = checkUpload({ contentType: sent, size: 1024 });
      expect(result.ok, sent).toBe(false);
      if (result.ok) continue;
      expect(result.status, sent).toBe(422);
    }
    // Surrounding whitespace IS forgiven, because SigV4 trims header values on both sides.
    const padded = checkUpload({ contentType: '  application/pdf  ', size: 1024 });
    expect(padded.ok).toBe(true);
    if (padded.ok) expect(padded.contentType).toBe('application/pdf');
  });

  it('refuses a contentType that is not a string', () => {
    for (const contentType of [undefined, null, 42, {}, ['application/pdf']]) {
      const result = checkUpload({ contentType, size: 1024 });
      expect(result.ok, String(contentType)).toBe(false);
      if (!result.ok) expect(result.status).toBe(422);
    }
  });
});

// =================================================================================================
// Content-Disposition cannot be broken out of
// =================================================================================================

describe('§ 8.2 Content-Disposition @g8', () => {
  /** The parameters of a disposition header, by name, as a lenient parser would read them. */
  const paramsOf = (header: string): string[] =>
    header
      .split(';')
      .slice(1)
      .map((p) => p.trim().split('=')[0] ?? '');

  it('cannot be broken out of with a quote', () => {
    // § 8.2's snippet is `attachment; filename="${filename}"`. A `"` in the name closes the quoted
    // string early and everything after it is read as more header parameters — so the test is
    // about STRUCTURE: one disposition type, exactly two parameters, whatever the name says.
    const header = contentDisposition('q4".pdf"; attachment; filename="owned.html');
    expect(header.split(';')[0]?.trim()).toBe('attachment');
    expect(paramsOf(header)).toEqual(['filename', 'filename*']);
    const quoted = /^attachment; filename="([^"]*)"; /.exec(header);
    expect(quoted).not.toBeNull();
    // The injected text survives as TEXT inside one quoted string, which is harmless and is the
    // point: `"` and `;` are gone, so it can no longer be read as syntax.
    expect(quoted?.[1]).toBe('q4.pdf attachment filename=owned.html');
    expect(quoted?.[1]).not.toContain('"');
    expect(quoted?.[1]).not.toContain(';');
  });

  it('cannot inject a header with a newline', () => {
    const header = contentDisposition('report\r\nX-Injected: yes\n.pdf');
    // No CR and no LF anywhere, which is what would end this header and start another. The words
    // remain, flattened into the one quoted string, where they are a silly file name and nothing
    // more.
    expect(header).not.toMatch(/[\r\n]/);
    expect(header.split(';')[0]?.trim()).toBe('attachment');
    expect(paramsOf(header)).toEqual(['filename', 'filename*']);
  });

  it('carries neither a raw nor an encoded line break through the presigned URL', async () => {
    const url = await presignGet('resources/r2', 'report\r\nX-Injected: yes.pdf', {
      signingDate: AT,
    });
    expect(url).not.toMatch(/[\r\n]/);
    // Not merely absent from the URL text — absent after decoding, so it cannot reappear as a
    // header value when S3 echoes the disposition back.
    expect(url.toLowerCase()).not.toContain('%0a');
    expect(url.toLowerCase()).not.toContain('%0d');
    const disposition = q(url, 'response-content-disposition') ?? '';
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition.match(/attachment/g)).toHaveLength(1);
  });

  it('keeps a non-ASCII name readable in filename* and transliterates the fallback', () => {
    const header = contentDisposition('Résumé 2026.pdf');
    // RFC 6266: the quoted fallback is ASCII-only for clients that do not read `filename*`; every
    // current browser prefers the starred form, which carries the real name percent-encoded.
    expect(header).toBe(
      'attachment; filename="R_sum_ 2026.pdf"; filename*=UTF-8\'\'R%C3%A9sum%C3%A9%202026.pdf',
    );
    expect(decodeURIComponent('R%C3%A9sum%C3%A9%202026.pdf')).toBe('Résumé 2026.pdf');
  });

  it('percent-encodes the apostrophe, which is filename*’s own delimiter', () => {
    // `filename*=UTF-8''value` spends two apostrophes on its own syntax, so a third one inside the
    // value is ambiguous. `encodeURIComponent` leaves `'` alone, which is why `rfc8187` exists.
    const header = contentDisposition("Bob's Listing.pdf");
    const starred = header.split("filename*=UTF-8''")[1] ?? '';
    expect(starred).toBe('Bob%27s%20Listing.pdf');
    expect(starred).not.toContain("'");
  });

  // Built at runtime, never written as a literal: a lone surrogate in the source makes git treat
  // this file as binary, which an earlier pass of it learned the hard way with a NUL byte.
  const LONE_HIGH = String.fromCharCode(0xd800);
  const LONE_LOW = String.fromCharCode(0xdfff);
  const EMOJI = String.fromCodePoint(0x1f600);

  it('degrades an unpaired surrogate instead of throwing URIError at the caller', () => {
    // `rfc8187` calls `encodeURIComponent`, which THROWS on a UTF-16 code unit that is not half of
    // a valid pair — it has no UTF-8 encoding. So `contentDisposition` threw rather than degrading
    // to `download` the way its own doc comment promises. This line is the hazard, pinned:
    expect(() => encodeURIComponent(LONE_HIGH)).toThrow(URIError);
    expect(() => encodeURIComponent(LONE_LOW)).toThrow(URIError);

    // Reachable without malice, which is why this is worth a guard: a lone surrogate is what you
    // get by truncating a name containing an emoji at a UTF-16 boundary — `slice`, and most length
    // caps, cut by code unit.
    const truncated = `q4 ${EMOJI}.pdf`.slice(0, 4);
    expect(truncated).toHaveLength(4);
    expect(() => encodeURIComponent(truncated)).toThrow(URIError);
    expect(contentDisposition(truncated)).toBe(`attachment; filename="q4"; ${STARRED}q4`);

    // The unit is dropped, both forms still agree, and the rest of the name survives.
    expect(contentDisposition(`report${LONE_HIGH}.pdf`)).toBe(
      `attachment; filename="report.pdf"; ${STARRED}report.pdf`,
    );
    // Nothing usable left over: `download`, as documented, not a throw.
    for (const name of [LONE_HIGH, LONE_LOW, `${LONE_LOW}   `, LONE_HIGH + LONE_HIGH]) {
      const header = contentDisposition(name);
      expect(header).toBe(`attachment; filename="download"; ${STARRED}download`);
    }
  });

  it('leaves a WELL-FORMED surrogate pair alone, so an emoji name is not collateral', () => {
    // The `u` flag is what buys this: under `u` the pattern matches code POINTS, so a valid pair is
    // one non-surrogate code point and does not match. A blunter strip over code units would eat
    // every astral character and silently rename the file.
    const header = contentDisposition(`q4 ${EMOJI}.pdf`);
    const starred = header.split(STARRED)[1] ?? '';
    expect(starred).toBe('q4%20%F0%9F%98%80.pdf');
    expect(decodeURIComponent(starred)).toBe(`q4 ${EMOJI}.pdf`);
    // The ASCII fallback cannot carry it, which is exactly what `filename*` is for.
    expect(header).toContain('filename="q4 __.pdf"');
  });

  it('still signs a download for a lone-surrogate filename, instead of an unmapped 500', async () => {
    // The end of the story the throw caused: `presignGet` rejected with a `URIError`, which is
    // neither `StorageConfigError` nor `StorageKeyError` — so it is nothing the deferred route has
    // a mapping for, and a learner clicking Download on a file whose title lost half an emoji got
    // a 500. Now it resolves, and the URL is a real signed URL carrying a real disposition.
    const url = await presignGet('resources/r2', `report${LONE_HIGH}.pdf`, { signingDate: AT });
    expect(q(url, 'X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(q(url, 'response-content-disposition')).toBe(
      `attachment; filename="report.pdf"; ${STARRED}report.pdf`,
    );
  });

  it('falls back to ‘download’ when nothing usable is left', () => {
    for (const name of ['', '   ', '"""', '\r\n', undefined, null, 42]) {
      expect(contentDisposition(name), String(name)).toContain('filename="download"');
    }
  });
});

// =================================================================================================
// Storage keys
// =================================================================================================

describe('§ 8.2 storage keys @g8', () => {
  const seeded = seedForDatabase();

  /** Every file name the deferred `/api/files/module/:moduleId/:fileName` route can legitimately be asked for. */
  const realNames = [
    ...new Set(seeded.modules.flatMap((m) => [...m.files.map((f) => f.name), ...m.resources.map((r) => r.name)])),
  ];

  it('lays out a resource key and a module file key as § 8.2’s two download routes need them', () => {
    expect(resourceKey('r2')).toBe('resources/r2');
    expect(moduleFileKey('marketing', 'fair-housing-check.skill.yaml')).toBe(
      'modules/marketing/fair-housing-check.skill.yaml',
    );
    expect(uploadKey('application/pdf', { now: AT.getTime(), token: 'e3f1a2b4-5c6d-7e8f' })).toBe(
      'uploads/2026/12/e3f1a2b4-5c6d-7e8f.pdf',
    );
    // Disjoint at the first segment, so an object written through the upload path can never be
    // addressed through a download path's derivation and vice versa.
    const prefixes = new Set(
      [
        resourceKey('r2'),
        moduleFileKey('marketing', 'x.json'),
        uploadKey('application/pdf', { now: 0, token: 'aaaaaaaa-bbbb' }),
      ].map((k) => k.split('/')[0]),
    );
    expect(prefixes).toEqual(new Set(['resources', 'modules', 'uploads']));
  });

  it('accepts every file name the real seed actually contains', () => {
    // The point of the deny-list. A tight `[A-Za-z0-9._-]` allow-list looks safer and would refuse
    // `Test Listing: 1418 Alder Ct` and `Session 1 Slides`, breaking the download of files the
    // admin console lists. Spaces, colons and ampersands are real names in this product.
    expect(realNames.length).toBeGreaterThan(20);
    expect(realNames).toContain('Test Listing: 1418 Alder Ct');
    for (const m of seeded.modules) {
      for (const name of [...m.files.map((f) => f.name), ...m.resources.map((r) => r.name)]) {
        expect(isSafeKeySegment(name), name).toBe(true);
        expect(moduleFileKey(m.id, name), name).toBe(`modules/${m.id}/${name}`);
      }
    }
  });

  it('derives by rejection, so two different names can never become one key', () => {
    // A sanitiser is a many-to-one map: `a/b`, `a_b` and `a%2Fb` would all land on `a_b`, so two
    // uploads silently become one object and whoever writes second owns what the first person
    // downloads. Refusing keeps the map injective.
    const keys = realNames.map((n) => moduleFileKey('marketing', n));
    expect(new Set(keys).size).toBe(realNames.length);
  });

  // THE SECURITY CLAIM: an S3 key namespace is flat and `/` is its only delimiter, so a key cannot
  // leave its prefix unless an outside string contributes a delimiter — or something a store or
  // proxy might decode into one.
  it('refuses every segment that could leave its prefix', () => {
    const hostile = [
      '..',
      '.',
      '../',
      '../../etc/passwd',
      '..%2f..%2fsecret',
      '%2e%2e%2f',
      'a/b',
      'a\\b',
      '\\\\server\\share',
      '/absolute',
      'trailing/',
      'pct-%41',
      'query?x=1',
      'frag#x',
      `nul${String.fromCharCode(0)}byte`,
      'crlf\r\nX: 1',
      'tab\tname',
      '',
      '   ',
      ' leading.pdf',
      'trailing.pdf ',
      'x'.repeat(200),
    ];
    for (const segment of hostile) {
      expect(isSafeKeySegment(segment), JSON.stringify(segment)).toBe(false);
      expect(() => resourceKey(segment), JSON.stringify(segment)).toThrow(StorageKeyError);
      expect(() => moduleFileKey('marketing', segment), JSON.stringify(segment)).toThrow(
        StorageKeyError,
      );
      expect(() => moduleFileKey(segment, 'ok.json'), JSON.stringify(segment)).toThrow(
        StorageKeyError,
      );
    }
    for (const segment of [undefined, null, 42, {}, ['a']]) {
      expect(isSafeKeySegment(segment), String(segment)).toBe(false);
      expect(() => resourceKey(segment as unknown as string)).toThrow(StorageKeyError);
    }
  });

  it('keeps the prefix and the segment count fixed for every name it accepts', () => {
    // The invariant that the refusals above buy: whatever is accepted, the key has exactly the
    // shape the route expects, so `modules/<id>/<name>` is always three segments.
    for (const name of realNames) {
      const key = moduleFileKey('marketing', name);
      expect(key.startsWith('modules/marketing/'), name).toBe(true);
      expect(key.split('/'), name).toHaveLength(3);
    }
    for (const id of seeded.resources.map((r) => r.id)) {
      expect(resourceKey(id).split('/')).toHaveLength(2);
    }
  });
});

// =================================================================================================
// uploadKey
// =================================================================================================

describe('§ 8.2 uploadKey @g8', () => {
  it('takes nothing from the request but the content type', () => {
    // § 8.2's body is `{contentType, size}` and that is all `upload-url` needs. No title, no file
    // name: there is no outside string in the key at all, so there is nothing to escape. The
    // human-readable title lives in the `resources` row, where renaming it cannot move an object.
    const extensions: { [K in AllowedContentType]: string } = {
      'application/json': 'json',
      'application/pdf': 'pdf',
      'text/markdown': 'md',
      'application/zip': 'zip',
      'video/mp4': 'mp4',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/csv': 'csv',
      'image/jpeg': 'jpg',
      'text/vtt': 'vtt',
    };
    for (const type of ALLOWED_UPLOAD_TYPES) {
      expect(uploadKey(type, { now: AT.getTime(), token: 'aaaaaaaa-bbbb-cccc' })).toBe(
        `uploads/2026/12/aaaaaaaa-bbbb-cccc.${extensions[type]}`,
      );
    }
  });

  it('shards by UTC, so the service’s TZ cannot give one month two homes', () => {
    // 2027-01-01T00:30Z is still 2026-12-31 in Central time. The key must not depend on which.
    expect(uploadKey('application/pdf', { now: Date.parse('2027-01-01T00:30:00Z'), token: 'aaaaaaaa-bbbb' })).toBe(
      'uploads/2027/01/aaaaaaaa-bbbb.pdf',
    );
    expect(uploadKey('application/pdf', { now: Date.parse('2026-12-31T23:30:00Z'), token: 'aaaaaaaa-bbbb' })).toBe(
      'uploads/2026/12/aaaaaaaa-bbbb.pdf',
    );
  });

  it('mints a fresh unique token by default, so two uploads cannot collide', () => {
    const a = uploadKey('application/pdf');
    const b = uploadKey('application/pdf');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^uploads\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f-]+\.pdf$/);
  });

  it('holds a caller-supplied token to a narrower rule than a file name', () => {
    // The one string from outside that reaches a key here, so it is UUID-shaped or nothing.
    for (const token of ['../escape', 'a/b', 'short', '', 'has space', 'a'.repeat(100), 'bad_underscore']) {
      expect(() => uploadKey('application/pdf', { token }), JSON.stringify(token)).toThrow(
        StorageKeyError,
      );
    }
    expect(() => uploadKey('application/pdf', { now: Number.NaN, token: 'aaaaaaaa-bbbb' })).toThrow(
      StorageKeyError,
    );
    expect(() => uploadKey('text/html' as AllowedContentType)).toThrow(StorageKeyError);
  });
});

// =================================================================================================
// D-188: reading back, and the bucket's origin for the CSP
// =================================================================================================

describe('D-188 a Range the routes pass on', () => {
  it('keeps one bytes range and drops anything else', () => {
    expect(singleByteRange('bytes=0-')).toBe('bytes=0-');
    expect(singleByteRange('bytes=100-199')).toBe('bytes=100-199');
    expect(singleByteRange('bytes=-500')).toBe('bytes=-500');
    expect(singleByteRange(' bytes=5-9 ')).toBe('bytes=5-9');
    for (const h of [undefined, '', 'bytes=-', 'bytes=9-5', 'bytes=0-1,5-9', 'items=0-1', 'bytes=a-b', ['bytes=0-1']]) {
      expect(singleByteRange(h), JSON.stringify(h)).toBeUndefined();
    }
  });
});

describe('D-188 the bucket origin connect-src allows', () => {
  const base = { S3_ACCESS_KEY_ID: 'AKIAEXAMPLEONLY00000', S3_SECRET_ACCESS_KEY: 'x', S3_BUCKET: 'ailms-production' };
  it('is the endpoint’s origin in path style, with no path, query or credential', () => {
    expect(bucketOrigin({ ...base, S3_ENDPOINT: 'https://storage.railway.app/some/path' })).toBe('https://storage.railway.app');
  });
  it('puts a dotless bucket in the host in virtual style, and keeps a dotted one in the path', () => {
    expect(bucketOrigin({ ...base, S3_ENDPOINT: 'https://storage.railway.app', S3_URL_STYLE: 'virtual' })).toBe('https://ailms-production.storage.railway.app');
    expect(bucketOrigin({ ...base, S3_BUCKET: 'ai-lms.production', S3_ENDPOINT: 'https://storage.railway.app', S3_URL_STYLE: 'virtual' })).toBe('https://storage.railway.app');
  });
  it('is AWS S3’s regional host with no endpoint', () => {
    expect(bucketOrigin({ ...base, S3_REGION: 'us-east-2' })).toBe('https://s3.us-east-2.amazonaws.com');
  });
  it('is null when storage is not configured, so no origin is guessed', () => {
    expect(bucketOrigin({})).toBeNull();
    expect(bucketOrigin({ ...base, S3_ENDPOINT: 'not a url' })).toBeNull();
    expect(bucketOrigin({ ...base, S3_ENDPOINT: 'ftp://storage.example' })).toBeNull();
  });
});

describe('D-188 an inline Content-Disposition', () => {
  it('says inline for a video, with the same escaping as an attachment', () => {
    expect(contentDisposition('Week 1 "walkthrough".mp4', 'inline')).toBe(
      `inline; filename="Week 1 walkthrough.mp4"; filename*=UTF-8''Week%201%20%22walkthrough%22.mp4`,
    );
    expect(contentDisposition('a.pdf')).toMatch(/^attachment; /);
  });
});
