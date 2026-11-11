// File storage against the Railway Storage Bucket, phase 08 § 8.2.
//
// § 8.2 gives this module as a six-line snippet: an `S3Client` built from five environment
// variables, `presignGet(key, filename)` at 300 s and `presignPut(key, contentType)` at 600 s.
// Everything below is that snippet plus the three things it leaves implicit — a config check, a
// key layout, and the upload guard — each one a pure, exported, separately tested function.
//
// WHAT IS NOT HERE. The three routes of § 8.2 (`GET /api/files/resource/:id`,
// `GET /api/files/module/:moduleId/:fileName`, `POST /api/files/upload-url`) are deferred with the
// rest of the Fastify app: there is no server yet. The POLICY each route enforces is here, as a
// function the route will call. Nothing in this file touches a database, a request or a response.
//
// WHY THIS IS TESTABLE WITH NO BUCKET AND NO ACCOUNT. AWS SigV4 presigning is local
// cryptography: HMAC-SHA256 over a canonical request string, with no handshake and no network
// round trip. Dummy credentials and a fake endpoint produce a *real* signature over a *real*
// canonical request, so `storage.test.ts` asserts the actual bytes of the actual URL — expiry,
// addressing style, signed-header set, query parameters — rather than mocking the SDK and
// asserting that the mock was called. `does not reach the network` is itself one of the tests.
//
// ---------------------------------------------------------------------------------------------
// Decisions this file makes, and the two places it deliberately departs from § 8.2's snippet
// ---------------------------------------------------------------------------------------------
//
// 1. CONFIG IS READ AT FIRST USE AND VALIDATED, not read at import with `!`.
//
//    § 8.2's snippet is `process.env.S3_ACCESS_KEY_ID!` and `process.env.S3_BUCKET!` at module
//    scope. Measured against this exact SDK version, that gives three different failures:
//
//      - credentials `undefined`  → throws `Resolved credential object is not valid`, which names
//                                   neither variable nor file
//      - `Bucket: undefined`      → throws `No value provided for input HTTP label: Bucket.`
//      - credentials `''`         → **signs successfully** and returns
//                                   `…&X-Amz-Credential=%2F20261004%2Fauto%2Fs3%2Faws4_request&…`
//
//    The third is the dangerous one, and an empty string is exactly what a Railway variable that
//    exists but was never filled in hands you. A well-formed URL over empty credentials 403s in
//    the learner's browser, minutes or hours after the deploy that broke it, with the deploy log
//    clean and the health check green. So `readS3Config` requires each variable to be present and
//    non-blank and throws `StorageConfigError` naming **every** missing one at once, and it is
//    called from `presignGet`/`presignPut` rather than at import — an API that cannot boot without
//    S3 credentials cannot serve the 95% of itself that does not need them, and `vitest` could not
//    import this file at all.
//
// 2. CHECKSUM CALCULATION IS OFF, which § 8.2's snippet does not say and which breaks real
//    uploads if you leave it alone.
//
//    Since v3.729 the SDK defaults `requestChecksumCalculation` to `WHEN_SUPPORTED`, so a
//    presigned `PutObject` comes back carrying `x-amz-sdk-checksum-algorithm=CRC32` and
//    `x-amz-checksum-crc32=AAAAAA%3D%3D` in its signed query string. `AAAAAA==` is the CRC32 of an
//    EMPTY body — the body the presigner had. A browser that PUTs actual bytes to that URL is
//    asserting a checksum of nothing, and the store rejects it. `WHEN_REQUIRED` removes both
//    parameters. `responseChecksumValidation` is turned down for the same reason: it adds
//    `x-amz-checksum-mode=ENABLED` to every GET, which is signed and therefore mandatory, and the
//    Railway bucket is S3-*compatible* rather than S3, so a parameter it does not implement is a
//    needless way for a download to fail. Both are pinned by tests, because a dependency bump is
//    how this silently comes back.
//
// 3. THE PUT PRESIGN SIGNS `content-type`, so the allow-list is binding rather than advisory.
//
//    By default the presigner hoists what it can into the query string and drops the rest:
//    `PutObjectCommand({ ContentType })` presigns to `X-Amz-SignedHeaders=host` and the content
//    type simply vanishes. The URL would then accept an upload of any type at all, and § 8.2's
//    four-type allow-list would be a suggestion the client is free to ignore — a presigned PUT
//    that accepts `text/html` into a bucket the vault serves is stored XSS. Passing
//    `signableHeaders: new Set(['content-type'])` puts it in the signature:
//    `X-Amz-SignedHeaders=content-type%3Bhost`, and the uploader must send that exact value or the
//    store rejects the request. Two presigns differing only in content type produce different
//    signatures, which is the test that proves the value — not just the header name — is bound.
//
//    The honest limit of this: SigV4 does **not** sign `Content-Length`, so the 25 MB cap is
//    enforced on the request to `upload-url` and not on the PUT itself. A client that asks for a
//    URL for 1 MB can push 2 GB through it. Binding the size needs either a POST policy with
//    `content-length-range` or a `HeadObject` size check inside `uploadResource` before it accepts
//    a `storageKey`. `uploadResource`'s signature change is deferred this sprint, so this is
//    written down rather than built: whoever lands § 8.2's routes owns it.
//
// 4. `checkUpload` DEMANDS AN EXACT MEDIA TYPE — no case folding, no parameters.
//
//    Tempting to normalise `Application/PDF; charset=utf-8` down to `application/pdf` and accept
//    it. That would be a bug, because of decision 3: S3 compares the signed header value byte for
//    byte against what the uploader sends. Sign the normalised value and the client that sent the
//    unnormalised one gets `SignatureDoesNotMatch` at upload time, from a URL our own guard said
//    was fine. A 422 that says "use exactly `application/pdf`" at request time is strictly better
//    than an opaque signature error one round trip later. Surrounding whitespace IS trimmed,
//    because SigV4 trims header values on both sides of the comparison.
//
// 5. KEYS ARE DERIVED BY REJECTION, NEVER BY SANITISATION. See `isSafeKeySegment`.
//
// 6. THE PRESIGNERS RE-CHECK THE KEY AND CLAMP THE EXPIRY, rather than trusting their caller or
//    the shape of an object literal.
//
//    Both are the same lesson. `presignGet`'s key does NOT always come from a builder in this
//    file: decision note on `resourceKey` tells the deferred route to prefer the row's stored
//    `storage_key`, a database column, so `requireKey` runs the builders' own predicate at the
//    point of signing — an empty one would otherwise sign a URL pointing at the bucket root. And
//    the 300 s / 600 s bounds used to be enforced only by `expiresIn` appearing BEFORE
//    `...options` in a literal, which a spread, a cast or a JS caller walks straight past;
//    `boundedExpiresIn` makes the bound structural. Both failures are invisible in a green suite,
//    which is why each has a test that names the mechanism it is guarding.

import { S3Client, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

// --- constants ---------------------------------------------------------------------------------

/** § 8.2: `presignGet` expires in 300 s. Gate 8 asserts `X-Amz-Expires` ≤ 300 on a download. */
export const GET_EXPIRES_IN = 300;

/** § 8.2: `presignPut` expires in 600 s. Long enough for 25 MB on a bad connection, short enough that a leaked URL is stale by the time it is pasted anywhere. */
export const PUT_EXPIRES_IN = 600;

/**
 * § 8.2's cap: "It caps `size` at 25 MB". 25 × 1000², the DECIMAL megabyte, and the choice matters.
 *
 * The spec does not say which megabyte it means and the reference has no byte formatter to infer
 * it from — every `size` in the seed is a hand-written string. But Gate 8's one hard assertion is
 * that "`upload-url` rejects 26 MB", and the two readings disagree about that:
 *
 *   26 MB as 26 × 1024² = 27,262,976  — over both candidate caps
 *   26 MB as 26 × 1000² = 26,000,000  — over 25,000,000, but UNDER 25 × 1024² = 26,214,400
 *
 * So a 1024-based cap would accept, with a 200 response, the exact size the gate names as a
 * refusal. The decimal cap refuses 26 MB under either reading, which is the only way to satisfy
 * the requirement without knowing which one the gate's author had in mind.
 *
 * The cost, stated because it will be a support question: Windows and Linux file managers label
 * sizes in powers of two while calling them MB, so a file they show as "25.0 MB" is 26,214,400
 * bytes and this refuses it. The 422 carries the byte count and this limit, so the answer is
 * legible rather than mysterious — and the drop zone's `up to 25 MB` copy (SCREENS § vault) is
 * unchanged either way, since the copy is the reference's and not ours to edit.
 */
export const MAX_UPLOAD_BYTES = 25 * 1000 * 1000;

/**
 * § 8.2's allow-list, verbatim and in its order. `as const` so `AllowedContentType` is the union
 * of these four literals rather than `string`.
 */
export const ALLOWED_UPLOAD_TYPES = [
  'application/json',
  'application/pdf',
  'text/markdown',
  'application/zip',
] as const;

export type AllowedContentType = (typeof ALLOWED_UPLOAD_TYPES)[number];

/**
 * The extension `uploadKey` gives each allowed type.
 *
 * The key does not need an extension — S3 keys are opaque and the content type travels in the
 * object's metadata — but an operator looking at the bucket does, and a CDN or a store that sniffs
 * by suffix will otherwise guess. Declared as a total map over the allow-list so adding a fifth
 * allowed type fails the typecheck here instead of producing an extensionless key.
 */
const UPLOAD_EXTENSIONS: { readonly [K in AllowedContentType]: string } = {
  'application/json': 'json',
  'application/pdf': 'pdf',
  'text/markdown': 'md',
  'application/zip': 'zip',
};

// --- errors ------------------------------------------------------------------------------------

/** S3 is not usably configured. A 500 for the deferred routes: the operator broke it, not the caller. */
export class StorageConfigError extends Error {
  readonly name = 'StorageConfigError';
}

/** A key segment was refused. A 404 for the deferred routes — see `isSafeKeySegment` on why not 400. */
export class StorageKeyError extends Error {
  readonly name = 'StorageKeyError';
}

// --- configuration -----------------------------------------------------------------------------

/** Just enough of `process.env` to resolve a config, so the resolution is testable as a pure function. */
export interface EnvLike {
  readonly S3_REGION?: string | undefined;
  readonly S3_ENDPOINT?: string | undefined;
  readonly S3_ACCESS_KEY_ID?: string | undefined;
  readonly S3_SECRET_ACCESS_KEY?: string | undefined;
  readonly S3_BUCKET?: string | undefined;
  readonly S3_URL_STYLE?: string | undefined;
}

/** How the bucket is addressed: in the path (`<endpoint>/<bucket>/<key>`) or in the host (`<bucket>.<endpoint>/<key>`). */
export type S3UrlStyle = 'path' | 'virtual';

export interface S3Config {
  region: string;
  /** Absent means the SDK addresses AWS S3 itself. Railway always sets it. */
  endpoint: string | undefined;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /**
   * `S3_URL_STYLE`: `path` (the default) or `virtual`. Railway's buckets created since its move to
   * virtual-hosted URLs are addressed in the host; older ones in the path. The bucket's Credentials
   * tab says which. Production's `skills` bucket takes path-style uploads (the 2026-11-11 pre-deploy
   * uploaded through it), so path stays the default and `virtual` is the switch for a bucket that
   * needs it. With a dot in the bucket name the SDK addresses it in the path either way.
   */
  urlStyle: S3UrlStyle;
}

/** Present and not whitespace. `''` is what an unfilled Railway variable gives you, and decision 1 is about what that costs. */
const blank = (v: string | undefined): boolean => v === undefined || v.trim() === '';

/**
 * § 8.2's five variables, validated. Throws `StorageConfigError` listing every problem at once, so
 * one restart is enough to find out that two variables are missing rather than two.
 *
 * `S3_REGION` defaults to `'auto'` as the snippet does, and `S3_ENDPOINT` stays optional because
 * the snippet passes it through undefined. But `'auto'` is a placeholder that S3-compatible stores
 * accept and AWS S3 does not, so the two of them together — no endpoint, no explicit region — can
 * only produce URLs that 403, and that combination is refused here rather than signed.
 */
export function readS3Config(env: EnvLike = process.env): S3Config {
  const missing: string[] = [];
  if (blank(env.S3_BUCKET)) missing.push('S3_BUCKET');
  if (blank(env.S3_ACCESS_KEY_ID)) missing.push('S3_ACCESS_KEY_ID');
  if (blank(env.S3_SECRET_ACCESS_KEY)) missing.push('S3_SECRET_ACCESS_KEY');
  if (missing.length > 0) {
    throw new StorageConfigError(
      `File storage is not configured: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not set. ` +
        'Set it on the API service (Railway: the Storage Bucket exposes these as variables).',
    );
  }

  const region = blank(env.S3_REGION) ? 'auto' : env.S3_REGION!.trim();
  const endpoint = blank(env.S3_ENDPOINT) ? undefined : env.S3_ENDPOINT!.trim();
  const style = blank(env.S3_URL_STYLE) ? 'path' : env.S3_URL_STYLE!.trim().toLowerCase();
  if (style !== 'path' && style !== 'virtual') {
    throw new StorageConfigError(`File storage is not configured: S3_URL_STYLE is ${JSON.stringify(env.S3_URL_STYLE)}; use 'path' or 'virtual'.`);
  }
  if (endpoint === undefined && region === 'auto') {
    throw new StorageConfigError(
      'File storage is not configured: with no S3_ENDPOINT the bucket is addressed on AWS S3, ' +
        "which rejects the region 'auto'. Set S3_ENDPOINT (an S3-compatible store) or S3_REGION (a real AWS region).",
    );
  }

  return {
    region,
    endpoint,
    bucket: env.S3_BUCKET!.trim(),
    accessKeyId: env.S3_ACCESS_KEY_ID!.trim(),
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!.trim(),
    urlStyle: style,
  };
}

let cached: { config: S3Config; client: S3Client } | null = null;

/**
 * The client and the bucket name, built on first presign and kept.
 *
 * `forcePathStyle` is § 8.2's default, and it is not a style preference: a Railway bucket name contains
 * dots (`bucket-production-ab12.up.railway.app`-style names are common, and the gate calls this
 * out), and virtual-hosted addressing would put those dots in the HOST — `my.bucket.endpoint` —
 * where a one-level wildcard certificate does not match and TLS fails before any request is made.
 * Path style keeps the bucket in the path, where a dot is just a character.
 *
 * HOW THIS LINE IS ACTUALLY GUARDED, because the obvious test does not guard it. The SDK falls
 * back to path style on its own for any bucket name containing a dot — measured on this version:
 *
 *   forcePathStyle   bucket               host                              path
 *   true             ai-lms.production    <endpoint>                        /ai-lms.production/…
 *   false            ai-lms.production    <endpoint>                        /ai-lms.production/…
 *   true             ailms-production     <endpoint>                        /ailms-production/…
 *   false            ailms-production     ailms-production.<endpoint>       /…
 *
 * So a test whose bucket name has a dot passes with the flag deleted, and deleting it breaks every
 * download and upload at the TLS handshake with the suite green. Only a DOTLESS bucket name makes
 * this flag the one thing deciding the URL shape, which is what `storage.test.ts` pins.
 *
 * Railway's newer buckets are documented as virtual-hosted (the bucket in the host). For one of
 * those, `S3_URL_STYLE=virtual` clears the flag; the default stays path, which production's bucket
 * accepts.
 */
function s3(): { config: S3Config; client: S3Client } {
  if (cached) return cached;
  const config = readS3Config();
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    // `S3_URL_STYLE` (default `path`): see `S3Config.urlStyle` and the note above.
    forcePathStyle: config.urlStyle === 'path',
    // Decision 2. Both default to 'WHEN_SUPPORTED' and both add signed query parameters that a
    // presigned URL cannot satisfy or a compatible store may not implement.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    // Explicit credentials, which is also why presigning never touches the network: with no
    // credentials the SDK would walk its provider chain and reach for instance metadata.
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  cached = { config, client };
  return cached;
}

/** Forgets the cached client and config. A `beforeEach` in the tests; also the hook if a key is ever rotated in place. */
export function resetS3(): void {
  cached?.client.destroy();
  cached = null;
}

// --- storage keys ------------------------------------------------------------------------------
//
// Three prefixes, one per way an object can get into the bucket:
//
//   resources/<resourceId>                  a vault resource, when its row has no stored key
//   modules/<moduleId>/<fileName>           a skill file or a per-employee resource
//   uploads/<YYYY>/<MM>/<token>.<ext>       minted by POST /api/files/upload-url
//
// They are disjoint at the first segment, so an object written through one path can never be
// addressed through another, whatever its caller passes.
//
// WHAT MAKES THIS SAFE, stated plainly because the question is "can a learner read another team's
// object": an S3 key namespace is FLAT, and `/` is its only delimiter. A key therefore cannot
// escape its prefix unless a segment contains a `/` — there is no `..` resolution to exploit,
// because there is no path resolution at all. So the whole guarantee reduces to: no outside string
// may contribute a delimiter, or anything an intermediary might turn into one.
//
// `isSafeKeySegment` enforces that by REJECTING, never by stripping. That distinction is the
// security property. A sanitiser is a many-to-one map: `a/b` and `a_b` and `a%2Fb` would all land
// on one key, so two different files silently become one object and whoever writes second owns
// what the first person downloads. Rejection keeps the map injective — a name either produces its
// own key or produces an error, never somebody else's key.
//
// The routes see a 404 rather than a 400 from this, deliberately: `:fileName` is only ever
// legitimate if it is one of the module's own declared `files[].name` / `resources[].name`, which
// the route must still check against the database. A refused segment and an unknown file are the
// same answer to the caller and neither should confirm that anything exists.
//
// And the thing this does NOT do: deciding WHICH object is not deciding WHO may have it. Tier
// access is `canAccess` inside the deferred route. A perfect key layout only stops a caller from
// naming an object that is not theirs to name.

/** Longest single segment. Comfortably over the longest seeded name (`transcript-atomizer.skill.json`, 30) and far under S3's 1024-byte whole-key limit. */
const MAX_SEGMENT_BYTES = 128;

/** S3's own hard limit on a whole key. Per-segment limits do not imply it: enough legal segments add up past it. */
const MAX_KEY_BYTES = 1024;

/**
 * Whether a string may be one segment of a key.
 *
 * Refused, and why each one:
 *   - empty, or whitespace at either end — an invisible difference between two keys
 *   - `/` — the delimiter itself, the only way to leave a prefix
 *   - `\` — a delimiter to a store with a Windows filesystem backend, and to some gateways
 *   - `%` — a store or proxy that decodes once more than we expect turns `%2F` into `/`. The SDK
 *     already encodes the key once, so a literal `%` is safe against S3 proper; it is not safe
 *     against every S3-*compatible* implementation, and no legitimate file name needs one.
 *   - `?` and `#` — the key lands in a URL path. The SDK encodes it, but a `?` that ever reached
 *     a URL unencoded would start a query string, which is where the signature's own parameters
 *     live; `#` would truncate the key at a fragment.
 *   - C0/C7F control characters, including CR and LF — header and log injection, and a NUL
 *     truncates the key in any C implementation downstream
 *   - exactly `.` or `..` — harmless to S3, not harmless to a filesystem-backed gateway. Belt and
 *     braces: reaching one requires a `/`, which is already refused.
 *   - over `MAX_SEGMENT_BYTES` UTF-8 bytes
 *
 * Everything else is allowed, and that is on purpose rather than by omission: the seeded module
 * resources include `Test Listing: 1418 Alder Ct` and `Session 1 Slides`, so spaces and colons are
 * real file names in this product. A tight `[A-Za-z0-9._-]` allow-list would have refused them and
 * broken the download of a file the admin console lists.
 */
export function isSafeKeySegment(segment: unknown): segment is string {
  if (typeof segment !== 'string') return false;
  if (segment === '' || segment !== segment.trim()) return false;
  if (segment === '.' || segment === '..') return false;
  if (/[/\\%?#]/.test(segment)) return false;
  // eslint-disable-next-line no-control-regex -- refusing control characters is the point
  if (/[\u0000-\u001f\u007f]/.test(segment)) return false;
  if (Buffer.byteLength(segment, 'utf8') > MAX_SEGMENT_BYTES) return false;
  return true;
}

function requireSafe(label: string, segment: unknown): string {
  if (!isSafeKeySegment(segment)) {
    throw new StorageKeyError(`Unusable ${label} for a storage key: ${JSON.stringify(segment)}`);
  }
  return segment;
}

/**
 * The canonical key for a vault resource, for `GET /api/files/resource/:id`.
 *
 * Only for a resource row whose `storage_key` is null — every seeded resource, which has a size
 * and a download count but no object behind it yet. A resource uploaded through
 * `POST /api/files/upload-url` has a key already, minted by `uploadKey` BEFORE the row existed
 * (the PUT happens first and `uploadResource` mints the id), and that stored key is what the route
 * must presign. Preferring the stored key over this derivation is not an optimisation: the stored
 * key is a value the server wrote, while `:id` is a value the caller typed.
 */
export function resourceKey(resourceId: string): string {
  return `resources/${requireSafe('resource id', resourceId)}`;
}

/**
 * The key for a skill file or a per-employee resource, for
 * `GET /api/files/module/:moduleId/:fileName`.
 *
 * Both segments come straight off the URL, which makes this the one derivation an attacker can
 * reach directly, and the reason `isSafeKeySegment` refuses rather than repairs. The route must
 * still confirm that `fileName` is one of that module's declared `files[].name` or
 * `resources[].name` before it presigns: a safe segment is one that cannot escape
 * `modules/<moduleId>/`, not one that names a file this module has.
 */
/** A skill library file (D-079): `skills/<slug>/<file>`. Never public; served by a presigned GET. */
export function skillFileKey(slug: string, fileName: string): string {
  return `skills/${requireSafe('skill id', slug)}/${requireSafe('file name', fileName)}`;
}

/**
 * Put one object, server side. Used only by the staff command that moves the paid skills' ZIPs into the
 * bucket (`pnpm --filter @ai/api skills --upload`); browsers upload through `presignPut`.
 */
export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const { client, config } = s3();
  await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: requireKey(key), Body: body, ContentType: contentType }));
}

/**
 * Every key under `prefix`, paging through ListObjectsV2. For the read-only Library check (D-122):
 * it reads names only, never an object.
 */
export async function listKeys(prefix: string): Promise<string[]> {
  const { client, config } = s3();
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const out = await client.send(new ListObjectsV2Command({ Bucket: config.bucket, Prefix: prefix, ContinuationToken: token }));
    for (const o of out.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

/** The configured `S3_URL_STYLE`, for the Library check to report. Throws `StorageConfigError` like any other use. */
export const storageUrlStyle = (): S3UrlStyle => s3().config.urlStyle;

export function moduleFileKey(moduleId: string, fileName: string): string {
  return `modules/${requireSafe('module id', moduleId)}/${requireSafe('file name', fileName)}`;
}

/**
 * A whole key, checked by the same rules the three builders enforce on each segment.
 *
 * The presigners cannot assume their key came from `resourceKey`/`moduleFileKey`/`uploadKey`. This
 * file's own header tells the deferred `GET /api/files/resource/:id` route to presign a row's
 * STORED `storage_key` in preference to `resourceKey(:id)` — see `resourceKey`'s doc comment — and
 * a stored key is a database column, not a value any builder is re-running at request time. A row
 * whose `storage_key` is `''` (a migration default, a half-finished `uploadResource`, a hand-edited
 * row) would otherwise sign cleanly and produce `https://endpoint/bucket/` — a URL addressing the
 * BUCKET ROOT rather than an object, which on a bucket that allows it is a listing of every key in
 * the store, handed to whoever clicked Download. A `storage_key` carrying a `/`-prefixed or
 * `..`-bearing value is the same mistake with a worse ending.
 *
 * So: validate at the point of signing, with the same predicate, and raise `StorageKeyError` —
 * which is the error type this file documents for an unusable key and which the deferred routes
 * map to a 404 (see the `isSafeKeySegment` block on why 404 and not 400). Before this check the
 * rejection was a raw SDK error or no error at all: a 500 on a Download click, or worse, a 200.
 *
 * Every key the builders produce passes, by construction — that is the point of reusing the
 * predicate rather than writing a second, looser one here that could drift from it.
 *
 * Deliberately NOT checked: that the key starts with `resources/`, `modules/` or `uploads/`.
 * § 8.3's deferred Zoom import writes under its own prefix, and a prefix allow-list here would
 * have to be edited every time a new writer lands — an invariant that is cheap to assert and easy
 * to forget, which is the kind that rots into a false green.
 */
function requireKey(key: unknown): string {
  if (typeof key !== 'string' || key === '' || Buffer.byteLength(key, 'utf8') > MAX_KEY_BYTES) {
    throw new StorageKeyError(`Unusable storage key: ${JSON.stringify(key)}`);
  }
  // `''.split('/')` is `['']` and `'a//b'.split('/')` has an empty middle, so the empty-segment
  // refusal inside `isSafeKeySegment` covers a leading, trailing or doubled delimiter too.
  for (const segment of key.split('/')) {
    if (!isSafeKeySegment(segment)) {
      throw new StorageKeyError(
        `Unusable storage key: ${JSON.stringify(key)} (segment ${JSON.stringify(segment)})`,
      );
    }
  }
  return key;
}

export interface UploadKeyOptions {
  /** Epoch ms for the `YYYY/MM` shard. Defaults to now; the deferred route should pass `clock.now()`. */
  now?: number;
  /** The unique part. Defaults to a v4 UUID; the tests pass a literal so the key is assertable. */
  token?: string;
}

/**
 * A fresh key for `POST /api/files/upload-url`, which is the only writing path.
 *
 * It takes no name, no title and nothing else from the request — § 8.2's body is `{contentType,
 * size}` and that is all it needs to be. The uniqueness comes from a v4 UUID, so two admins
 * uploading `Q4 Report.pdf` at the same moment cannot collide and neither can overwrite the
 * other's object; the human-readable title lives in the `resources` row, where renaming it costs
 * nothing and cannot move an object.
 *
 * The `YYYY/MM` shard is UTC, not local: the same instant must land in the same prefix whatever
 * `TZ` the API service happens to have, or a bucket listing grows two homes for one month.
 *
 * `token`, when a caller passes one, is the single string from outside that reaches a key here, so
 * it is held to a narrower rule than `isSafeKeySegment` — UUID shape only.
 */
export function uploadKey(contentType: AllowedContentType, options: UploadKeyOptions = {}): string {
  const ext = UPLOAD_EXTENSIONS[contentType];
  if (ext === undefined) {
    throw new StorageKeyError(`Not an allowed upload content type: ${JSON.stringify(contentType)}`);
  }
  const token = options.token ?? randomUUID();
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/.test(token)) {
    throw new StorageKeyError(`Unusable upload token: ${JSON.stringify(token)}`);
  }
  const at = new Date(options.now ?? Date.now());
  if (Number.isNaN(at.getTime())) {
    throw new StorageKeyError(`Unusable upload timestamp: ${JSON.stringify(options.now)}`);
  }
  const yyyy = String(at.getUTCFullYear()).padStart(4, '0');
  const mm = String(at.getUTCMonth() + 1).padStart(2, '0');
  return `uploads/${yyyy}/${mm}/${token}.${ext}`;
}

// --- Content-Disposition -----------------------------------------------------------------------

/** Everything C0, plus DEL. Stripped before the name is used twice, so both forms agree. */
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CONTROL = /[\u0000-\u001f\u007f]/g;

/** Longest filename the `filename=` fallback carries. Generous; a name longer than this is a title, not a file name. */
const MAX_FILENAME_CHARS = 128;

/**
 * Unpaired surrogates — a UTF-16 code unit that is not half of a valid pair, so not a character at
 * all and not representable in UTF-8.
 *
 * Stripped alongside the control characters, and for a harder reason than tidiness:
 * `encodeURIComponent` THROWS `URIError: URI malformed` on one. So `rfc8187` threw, so
 * `contentDisposition` threw instead of degrading to `download` the way its own doc comment
 * promises, and `presignGet` then rejected with a `URIError` — which is neither
 * `StorageConfigError` nor `StorageKeyError`, so it is nothing the deferred route has a mapping
 * for. An unmapped 500 on a Download click, caused by a file name. Reachable without malice: a
 * lone surrogate is what you get by truncating a name containing an emoji at a UTF-16 boundary,
 * which is what `String.prototype.slice` and most length caps do.
 *
 * The `u` flag is what makes this precise rather than blunt: under `u` the pattern matches code
 * POINTS, so a well-formed pair is a single non-surrogate code point and does not match, while a
 * lone half remains a `General_Category=Cs` code point and does. `Résumé.pdf` and a name with an
 * emoji go through untouched; a name carrying a bare U+D800 loses exactly that unit.
 */
const LONE_SURROGATE = /\p{Cs}/gu;

/**
 * RFC 8187 `ext-value`: percent-encode, then also encode the four characters
 * `encodeURIComponent` leaves behind that are not `attr-char` — `'`, `(`, `)`, `*`. The apostrophe
 * matters most: `filename*=UTF-8''name` already uses two of them as delimiters.
 *
 * Total, by precondition: its one caller strips `LONE_SURROGATE` first, which is the only input
 * `encodeURIComponent` throws on. The strip is in `contentDisposition` rather than here because
 * both emitted forms have to be built from the SAME cleaned string, or the quoted fallback and the
 * starred parameter would disagree about the name.
 */
const rfc8187 = (s: string): string =>
  encodeURIComponent(s).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`,
  );

/**
 * § 8.2's `attachment; filename="…"`, built so a filename cannot leave the header.
 *
 * The snippet interpolates the name straight into a quoted string. A name containing `"` closes it
 * early and everything after is read as more header parameters; a name containing CR LF is header
 * injection into whatever writes the header — and that header is echoed by S3 into the download
 * response, so what is injected lands in the learner's browser. Admins name these files, so this
 * is not the top of the threat model, but it is one `"` in a title away from being a bug and the
 * fix is six lines.
 *
 * Two parameters are emitted, which is RFC 6266's own recommendation:
 *   - `filename="…"` — control characters removed, `"` and `\` and the delimiters removed,
 *     non-ASCII replaced, whitespace collapsed. The fallback every client understands.
 *   - `filename*=UTF-8''…` — the same name percent-encoded, so `Résumé.pdf` survives. Preferred by
 *     every current browser, and percent-encoding means no byte of the original can be structural.
 *
 * A name that sanitises away to nothing becomes `download`, because `filename=""` makes a browser
 * invent a name from the URL, and the URL path here is a UUID.
 */
export function contentDisposition(filename: unknown): string {
  // `LONE_SURROGATE` before anything else: it is the one class of input that makes `rfc8187`
  // THROW rather than produce a bad value, and a throw here is an unmapped 500 on a Download.
  const raw =
    typeof filename === 'string' ? filename.replace(CONTROL, '').replace(LONE_SURROGATE, '') : '';
  const ascii = raw
    // Quote and backslash end or escape the quoted-string; the rest are what a parser would read
    // as the boundary between parameters.
    .replace(/["\\;,]/g, '')
    // Non-ASCII has no meaning in a quoted-string; `filename*` carries it instead.
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FILENAME_CHARS);
  const safe = ascii === '' ? 'download' : ascii;
  const starred = raw.trim() === '' ? 'download' : raw.trim();
  return `attachment; filename="${safe}"; filename*=UTF-8''${rfc8187(starred)}`;
}

// --- the upload guard --------------------------------------------------------------------------

/** § 8.2's request body. `unknown` because the guard is the thing that decides, not the caller. */
export interface UploadRequest {
  contentType: unknown;
  size: unknown;
}

/**
 * Accepted, with the content type narrowed to the allow-list so `uploadKey` and `presignPut` can
 * only be reached with a value that passed.
 */
export interface UploadAllowed {
  ok: true;
  contentType: AllowedContentType;
  size: number;
}

/** Refused. `status` is a literal so a route cannot answer a refusal with a 200. */
export interface UploadRefused {
  ok: false;
  status: 422;
  error: string;
}

export type UploadCheck = UploadAllowed | UploadRefused;

const refuse = (error: string): UploadRefused => ({ ok: false, status: 422, error });

/**
 * § 8.2's upload policy for `POST /api/files/upload-url`, as a function: "It caps `size` at 25 MB,
 * allows `application/json`, `application/pdf`, `text/markdown` and `application/zip`", answering
 * 422 otherwise.
 *
 * Not in here, because they are not this function's to know: whether the caller is staff with
 * `curriculum` (that is `requirePerm` in the route) and whether the bytes actually match the type
 * they claim (nothing short of reading the uploaded object can tell, and decision 3 explains where
 * that check would have to live).
 *
 * Non-integer and non-positive sizes are refused too, which § 8.2 does not ask for. A fractional
 * size is a client that computed it rather than read it, and a 0-byte PUT succeeds and leaves an
 * empty object that `uploadResource` would then publish as a downloadable file.
 */
export function checkUpload({ contentType, size }: UploadRequest): UploadCheck {
  if (typeof size !== 'number' || !Number.isFinite(size)) {
    return refuse(`"size" must be a number of bytes, got ${JSON.stringify(size)}`);
  }
  if (!Number.isInteger(size)) return refuse(`"size" must be a whole number of bytes, got ${size}`);
  if (size <= 0) return refuse(`"size" must be at least 1 byte, got ${size}`);
  if (size > MAX_UPLOAD_BYTES) {
    return refuse(`"size" is ${size} bytes; the limit is ${MAX_UPLOAD_BYTES} bytes (25 MB)`);
  }

  if (typeof contentType !== 'string') {
    return refuse(`"contentType" must be a string, got ${JSON.stringify(contentType)}`);
  }
  // Trimmed, and only trimmed — decision 4. SigV4 trims header values before hashing them, so
  // surrounding whitespace cannot cause a signature mismatch; a case difference or a `;charset=…`
  // parameter can, which is why neither is forgiven.
  const trimmed = contentType.trim();
  const allowed = ALLOWED_UPLOAD_TYPES.find((t) => t === trimmed);
  if (allowed === undefined) {
    return refuse(
      `"contentType" ${JSON.stringify(contentType)} is not allowed. ` +
        `Send exactly one of: ${ALLOWED_UPLOAD_TYPES.join(', ')}`,
    );
  }

  return { ok: true, contentType: allowed, size };
}

// --- presigning --------------------------------------------------------------------------------

export interface PresignOptions {
  /**
   * The instant the signature is dated from. Defaults to now.
   *
   * Only the tests pass it, and only so that two URLs can be compared for anything other than
   * their timestamp. Production must not: a signature dated in the past is already expiring.
   */
  signingDate?: Date;
}

/**
 * The `expiresIn` a presign will actually use: `limit`, or less if the caller asked for less, and
 * never more however the caller asked.
 *
 * WHY A FUNCTION AND NOT KEY ORDER. Both presigners used to build their config as
 * `{ expiresIn: GET_EXPIRES_IN, ...options }`, which bounds the expiry only by POSITION — the
 * caller's spread lands after the default and silently wins. The one thing Gate 8 asserts on a
 * download URL is `X-Amz-Expires` ≤ 300, and the only other thing standing in the way was
 * TypeScript's excess-property check on an object literal, which does not survive a spread
 * (`presignGet(k, f, { ...opts })`), a cast, or a call from the plain JS the SDK and Fastify
 * plugins are full of. A 24-hour download URL is a 24-hour window in which a forwarded link, a
 * chat log or a browser history entry still reads someone else's vault object: the expiry IS the
 * revocation story for a presigned URL, because there is nothing else to revoke.
 *
 * Structural, so the bound holds no matter how the value arrived or where in the literal it sits.
 * `options` is typed without `expiresIn`, so reading it needs a widening — that widening is the
 * admission that the type alone was never the guard.
 *
 * A SHORTER request is honoured: the deferred routes may well want a 30 s URL for a thumbnail, and
 * nothing about this bound argues for making URLs live longer than asked. Anything that is not a
 * usable positive finite number falls back to `limit` rather than throwing — a nonsense `expiresIn`
 * is our own calling bug, and failing a download over it would be the worse outcome.
 */
function boundedExpiresIn(limit: number, options: PresignOptions): number {
  const requested = (options as { expiresIn?: unknown }).expiresIn;
  if (typeof requested !== 'number' || !Number.isFinite(requested) || requested < 1) return limit;
  return Math.min(Math.floor(requested), limit);
}

/**
 * Rejects a content type that could not be a header value at all — empty, or carrying a byte
 * outside printable ASCII (which includes CR and LF).
 *
 * `presignPut` is also reachable from § 8.3's deferred Zoom import, which uploads an MP4 and so
 * passes a type the upload guard never saw. A `TypeError` rather than one of this module's errors
 * because it can only be a mistake in our own calling code, never something a request caused.
 */
function requireHeaderValue(contentType: string): string {
  const trimmed = contentType.trim();
  if (trimmed === '' || /[^\x20-\x7e]/.test(trimmed)) {
    throw new TypeError(`Not a usable content type: ${JSON.stringify(contentType)}`);
  }
  return trimmed;
}

/**
 * § 8.2's download URL: a presigned GET, good for `GET_EXPIRES_IN` seconds, that makes the browser
 * save the file under `filename` instead of rendering it.
 *
 * `ResponseContentDisposition` is a signed query parameter, so the disposition cannot be changed
 * by whoever holds the URL — a learner cannot turn the attachment into an inline render of someone
 * else's HTML. `attachment` is doing security work, not ergonomics.
 *
 * No network call: the signature is an HMAC over the canonical request, computed here.
 */
export async function presignGet(
  key: string,
  filename: string,
  options: PresignOptions = {},
): Promise<string> {
  // `async` on purpose: `s3()`, `requireKey` and `contentDisposition` can all throw, and a caller
  // that wrote `await presignGet(...)` inside a try/catch should not have to also guard the call
  // expression itself. Every failure of either presign arrives as a rejected promise.
  const { client, config } = s3();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.bucket,
      // Checked here and not only in the builders: the route presigns a row's stored
      // `storage_key`, which no builder re-derives. See `requireKey`.
      Key: requireKey(key),
      ResponseContentDisposition: contentDisposition(filename),
    }),
    // `signingDate` named rather than `...options` spread, and `expiresIn` CLAMPED rather than
    // merely defaulted: see `boundedExpiresIn`. Naming the one option we accept means a future
    // field on `PresignOptions` has to be wired in deliberately instead of reaching the signer by
    // accident, and it is why no caller can reach past this to the signer's own knobs.
    {
      signingDate: options.signingDate,
      expiresIn: boundedExpiresIn(GET_EXPIRES_IN, options),
    },
  );
}

/**
 * § 8.2's upload URL: a presigned PUT, good for `PUT_EXPIRES_IN` seconds, that accepts exactly one
 * content type.
 *
 * `contentType` must be a value `checkUpload` returned — decision 3 and decision 4 together are
 * why: the type is signed as a header, so this value and the one the browser sends have to be the
 * same bytes, and the allow-list only binds because it is the signed one.
 */
export async function presignPut(
  key: string,
  contentType: string,
  options: PresignOptions = {},
): Promise<string> {
  const { client, config } = s3();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      // § 8.3's deferred Zoom import calls this with a key it built itself, not one of ours.
      Key: requireKey(key),
      ContentType: requireHeaderValue(contentType),
    }),
    {
      signingDate: options.signingDate,
      expiresIn: boundedExpiresIn(PUT_EXPIRES_IN, options),
      // Decision 3. Without this the content type is dropped from the URL entirely and the
      // allow-list stops meaning anything. Measured: remove this line and the presign for
      // `application/pdf` and the presign for `application/zip` on the same key become the same
      // URL, signature included.
      //
      // It sits AFTER nothing now, which is the second half of the same fix as the expiry: while
      // the config ended with `...options`, a caller passing `signableHeaders: new Set()` through a
      // spread or a cast silently unbound the content type and turned every upload URL into one
      // that accepts `text/html`. Not reachable by key order any more — the only options this
      // function forwards are the two named above it.
      signableHeaders: new Set(['content-type']),
    },
  );
}
