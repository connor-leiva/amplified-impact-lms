// The three file routes — phase 08 § 8.2.
//
//   GET  /api/files/resource/:id              "checks access with `canAccess`-style tier rules,
//                                              runs `downloadResource`, then 302-redirects to
//                                              `presignGet`"
//   GET  /api/files/module/:moduleId/:fileName "the same check, for skill files and per-employee
//                                              resources"
//   POST /api/files/upload-url {contentType, size}  "staff with `curriculum` only … returns
//                                                    `{ key, url }`"
//
// D-188 CHANGES HOW THE TWO DOWNLOAD ROUTES ANSWER, NOT WHO THEY ANSWER. They no longer 302 to a
// presigned GET on the bucket's origin: they read the object and stream it on this origin
// (`sendObject`: Range, `Content-Type`, `Content-Length`, `Content-Disposition`, a private
// `Cache-Control`), so the CSP's `media-src 'self'` holds for a video and nothing a viewer is sent
// points at the bucket. Every access rule below is as it was. D-188 adds a third download route,
// `GET /api/files/course/<key>`, for a course week's uploaded video (its rules are on the handler).
// Where this header still says "302" or "presign" of a download, read "stream".
//
// `storage.ts` is the policy half and it is already built and tested: the presigners, the 25 MB /
// four-type upload guard, the three key builders, and `contentDisposition`. Nothing here restates a
// limit or re-derives a key. This file is the HTTP half — who may ask, which object their ask names,
// and what status code a refusal is.
//
// ================================================================================================
// THE ONE PLACE THIS DEPARTS FROM § 8.2's SENTENCE: THE ROUTE DOES NOT RUN `downloadResource`
// ================================================================================================
// § 8.2 says the download route "runs `downloadResource`". It must not, because the client already
// does, on the same click:
//
//   apps/web/src/routes/portal/Vault.tsx, onRow:
//     const out = await mutate('downloadResource', { id: r.id });
//     if (out.error) { setError(out.error); return; }
//     if (!saveStoredFile({ kind: 'resource', id: r.id })) saveFile(…);
//
// and `packages/core/src/mutations.ts`'s `downloadResource` does `x.dl++`. Running it here as well
// counts every download TWICE, and `dl` is rendered: the vault row's `412 downloads`, the admin
// Overview's resource leaderboard, and the Learners export all read it. A silently doubled counter
// is the worst kind of wrong number — it looks plausible.
//
// The write stays with the CLIENT, and the route presigns and does its own access check. The
// alternative — move the write to the route and drop it from `Vault.tsx` — was rejected because the
// web side cannot change:
//
//   - `saveStoredFile` returns FALSE in fixture mode (there is no bucket), and the Blob path the
//     55 parity scenarios and 25 e2e behaviours measure hangs off the same `mutate` call. Dropping
//     the mutation would drop the fixture download with it.
//   - The mutation is what raises the `Downloaded {title}` toast and what renders the inline
//     `Team tier required` error under the list. Neither has anywhere else to come from: a 302 is
//     followed by the browser, so the SPA never sees the route's status code at all. A 403 from
//     this route is, for the viewer, a browser error page — which is precisely why the CLIENT's
//     copy of the check has to stay and raise the inline message first.
//
// So on a real click the tier rule runs twice, once in each half, and that is deliberate
// defence-in-depth rather than duplication: the mutation's copy writes the inline error, and this
// one is the only thing standing between a hand-typed URL and the object. They cannot disagree,
// because both are `@ai/core`'s rule over the same two `tier` fields — see `accessFor` below, and
// the test that sweeps the 2×2 tier matrix through BOTH.
//
// Flagged for DECISIONS.md: § 8.2's "runs `downloadResource`" is not implemented as written.
//
// ================================================================================================
// WHAT THE ACCESS CHECK IS, AND WHY IT IS NOT A SECOND COPY OF ANYTHING
// ================================================================================================
// `canAccess(u, m)` from `@ai/core/status.ts` — `m.tier === 'agent' || (!!u && u.tier === 'team')`
// — is the rule the portal locks a vault row with, the rule `scopeSnapshot` redacts a module with,
// and the rule `downloadResource` throws `forbidden` on. Both `Resource` and `AIEmployee` carry a
// `tier`, so the one function answers for both routes with no per-route logic.
//
// It is applied to objects that came out of `loadDb`, not to hand-built shapes — see
// `WHY loadDb` below — and the 403 carries core's own copy, `Team tier required`, so a learner who
// somehow reaches the route reads the same sentence the vault shows them inline.
//
// A STAFF VIEWER IS REFUSED on both download routes, with core's `That action is for learners.`
// Tier is a learner concept; `downloadResource` itself refuses staff (`learnerOf` throws), no admin
// screen downloads a vault row or a skill file (grep: `saveStoredFile` has exactly two callers, both
// under `routes/portal/`), and the alternative — a staff bypass — would hand a Support-role account
// (`curriculum: 0`) every Team-tier object in the bucket for a convenience nothing asks for.
// Flagged for DECISIONS.md, because it is a rule § 8.2 does not state either way.
//
// D-172 opens ONE door in it: the admin Resource Vault's hover Download (the R2 mockup's). Staff who
// may edit the vault (`curriculum`) get a vault row from `/api/files/resource/:id`, hidden rows too,
// with no tier rule and no count. Support (`curriculum: 0`) and every skill file stay refused.
//
// ================================================================================================
// WHICH OBJECT AN ASK NAMES, WHICH IS A SEPARATE QUESTION FROM WHO MAY HAVE IT
// ================================================================================================
// `storage.ts`'s key block is the argument in full; the two rules it leaves to this file are:
//
//   1. A VAULT RESOURCE prefers the row's STORED `storage_key` over `resourceKey(:id)`. The stored
//      key is a value the server wrote; `:id` is a value the caller typed. `loadDb` cannot supply
//      it — `fromRows` does not produce `storageKey` and § 7.4 strips it from every snapshot — so
//      `storedKeyOf` reads the column directly. A row whose column is present but BLANK is not
//      quietly re-derived: `presignGet` runs `requireKey`, which refuses it, and a blank key would
//      otherwise sign `https://endpoint/bucket/` — the bucket ROOT, i.e. a listing of every object
//      in the store handed to whoever clicked Download. That path is a 404 and it has a test.
//
//   2. A MODULE FILE's `:fileName` must be one of that module's own declared names. A safe segment
//      is one that cannot escape `modules/<moduleId>/`; it is not one that names a file this module
//      has. `declaresFile` is the second half, and without it `:fileName` is an oracle for the
//      whole prefix.
//
// D-022's OPEN QUESTION IS LIVE HERE, and this route cannot close it. A per-employee resource has
// no key field: `EmployeeDetail.vm.ts` derives `:fileName` from the admin-typed title by slugging
// it, and that derivation is NOT injective — `Session 1 Slides` and `Session 1: Slides` both give
// `session-1-slides.pdf`. `resourceFileName` below reproduces the client's derivation character for
// character so the two halves agree, which is the most that can be done without a `ModuleResource`
// key field; the collision is pinned by a test so it is recorded rather than discovered. Until
// `ModuleResource` gains a key (D-022 names the three files that change), two resources on one AI
// Employee whose titles slug alike share ONE object, and the second upload overwrites the first.
//
// ================================================================================================
// WHY `loadDb`, FOURTEEN SELECTS, ON A DOWNLOAD CLICK
// ================================================================================================
// Because the click already pays for one. `Vault.tsx` posts `downloadResource` before it navigates
// here, and `routes/mutate.ts` runs `loadDb` for every mutation INSIDE the
// `pg_advisory_xact_lock(42)` transaction that serializes every write in the system. This route's
// read is the cheaper of the two: no lock, no transaction, no write.
//
// What that buys is the thing § 8.2 asks for — "use `@ai/core`'s tier rules rather than
// reimplementing them". `canAccess` is handed a real `Learner` and a real `Resource`, decoded by the
// one codec; `visibleModules` excludes a draft for free, exactly as `scopeSnapshot` does; `can`
// answers the `curriculum` question from the real `staff` and `perms` rows. The narrow alternative
// — three targeted selects and `canAccess({ tier: row.tier }, { tier: other.tier })` — is a second
// decoding path for the security boundary, which is the failure `routes/snapshot.ts`'s header
// argues against at length.
//
// ================================================================================================
// THE STATUS CODES
// ================================================================================================
//   401  not signed in                     `requireSession`; Gate 7's rule for every /api/* route
//   403  this viewer may not have it       staff on a download, a tier refusal, no `curriculum`
//   404  no such file, and no hint why     unknown id, a draft module, a hidden resource, an
//                                          undeclared `:fileName`, a segment `isSafeKeySegment`
//                                          refuses, a blank stored key
//   415  a non-JSON upload-url POST        § 9.4's CSRF rule, via `requireJsonSameOrigin`
//   422  the upload policy refused         `checkUpload`, which carries the message
//   500  S3 is not configured              `StorageConfigError`, the operator's fault, not the
//                                          caller's — rethrown so `app.ts` logs it and answers
//                                          `{ error: 'Something went wrong.' }`
//   200  here is the file                  D-188: streamed from the bucket on this origin
//   206  here is the range you asked for   D-188: a `<video>` seeking, with `Content-Range`
//   416  that range is past the end        D-188: `Content-Range: bytes */<size>`
//
// 403 WHERE THE OBJECT IS VISIBLE, 404 WHERE IT IS NOT. Gate 8 requires the tier refusal to be a
// 403 ("Downloading a Team-tier resource as Jamie returns 403"), and that leaks nothing: Jamie's
// snapshot already contains that row and the vault already draws it with a lock. A HIDDEN resource
// and a DRAFT module are in no learner snapshot at all, so they are 404 — telling Jamie that a
// resource he cannot see exists, and what tier it is, would be strictly more than he had.
//
// WHY THE 302 IS `no-store`. A presigned URL is a bearer credential for the object: anyone holding
// it can fetch the bytes for 300 seconds without a cookie. A cacheable redirect would put that
// credential in the browser's back/forward cache and in any intermediary that caches redirects, and
// hand it to the next viewer on a shared machine. `app.ts`'s `scrubUrl` is the other half of the
// same rule, for the log.

import { can, canAccess, cohortView, kitVisible, visibleModules, weekOpenFor } from '@ai/core';
import { isCourseWeek } from '@ai/core/accelerator';
import type { AIEmployee, Db, Learner, Resource } from '@ai/core';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { resources as resourceTable } from '../db/schema';
import { clock } from '../lib/clock';
import { courseEntryFor, viewerCohortId } from '../lib/course-access';
import {
  ObjectMissingError,
  RangeNotSatisfiableError,
  StorageKeyError,
  checkUpload,
  contentDisposition,
  getObject,
  headObject,
  moduleFileKey,
  presignPut,
  resourceKey,
  singleByteRange,
  uploadKey,
} from '../storage';
import type { UploadRequest } from '../storage';
import { courseFor, isWeekModule } from '@ai/core/course';
import { isVideoUpload } from '@ai/core/course-types';
import type { MediaItem, PathBlock } from '@ai/core/course-types';
import { isUploadKey } from '@ai/core/uploads';

// --- the copy, which is core's own ---------------------------------------------------------------
//
// Each of these three strings is the message `@ai/core` raises for the same refusal, quoted rather
// than invented, so the route and the portal cannot tell a learner two different things about one
// rule. `mutations.ts` › `downloadResource` throws the first, `mutations.ts` › `learnerOf` the
// second, `can.ts` › `requirePerm` the third — curly apostrophe included, which is CLAUDE.md's
// "copy is exact" applied to an error body.

/** `downloadResource` / `toggleStep`: `new MutationError('forbidden', 'Team tier required')`. */
const TIER_REFUSED = 'Team tier required';

/** `learnerOf`: `new MutationError('forbidden', 'That action is for learners.')`. */
const LEARNERS_ONLY = 'That action is for learners.';

/** `requirePerm`: `new MutationError('forbidden', 'You don’t have permission to do that.')`. */
const NO_PERMISSION = 'You don’t have permission to do that.';

/**
 * Every 404 on these routes, word for word.
 *
 * One string for six different causes, deliberately. `storage.ts`'s key block states the rule —
 * "A refused segment and an unknown file are the same answer to the caller and neither should
 * confirm that anything exists" — and a distinct message per cause is exactly the oracle that lets
 * a caller enumerate resource ids, module ids and file names by reading the difference.
 */
const NOT_FOUND = 'No such file';

// --- naming the object ---------------------------------------------------------------------------

/**
 * The file name a vault download saves under, reproducing `Vault.vm.ts`'s `fileOf` exactly.
 *
 * It has to be reproduced rather than imported: `fileOf` is private to a web view-model and
 * `packages/core` has no vault file helper, and the name must MATCH, because fixture mode saves
 * `fair-housing-language-checker.json` from a Blob and http mode must put the same name in the
 * presigned URL's `Content-Disposition`. A viewer who switches data sources must not see their
 * downloads change name — that is the whole premise Gate 7 rides on, that the backend is invisible.
 *
 * SO THIS IS A SECOND COPY AND IT CAN DRIFT. It is pinned to literal expected strings for seeded
 * rows of all three extension branches in `files.test.ts`, which fails if either side moves;
 * reported as a candidate for a single `@ai/core` helper, which is the real fix and which is not
 * this sprint's file to add.
 *
 * The title is slugged, so no character of an admin-typed title survives into the header as itself.
 * That is not where the `Content-Disposition` escaping is tested — see `moduleFileKey`'s route,
 * where `:fileName` is the file's own name and a quote in it is reachable.
 */
export function vaultFileName(r: Pick<Resource, 'title' | 'type'>): string {
  // `Vault.vm.ts` › `fileOf`, verbatim: the two JSON-ish types, then the PDF guide, then markdown
  // for everything else (`Prompt pack`, `Notion template`).
  const ext =
    r.type === 'Workflow JSON' || r.type === 'Claude Project' ? '.json' : r.type === 'PDF guide' ? '.pdf' : '.md';
  return r.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + ext;
}

/**
 * The `:fileName` a per-employee resource is addressed by, reproducing `EmployeeDetail.vm.ts`'s
 * derivation exactly (`${slug(r.name)}.${r.type.toLowerCase()}`).
 *
 * NOT INJECTIVE. See D-022 and this file's header: the slug collapses punctuation, so two titles
 * can produce one name and therefore one object key. Reproduced anyway, because an agreeing
 * non-injective mapping is strictly better than two disagreeing ones — a disagreement would 404
 * every per-employee resource download, which is a feature that silently does not work.
 */
export function moduleResourceFileName(r: { name: string; type: string }): string {
  return `${r.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${r.type.toLowerCase()}`;
}

/**
 * Whether `fileName` is one of this AI Employee's own declared files.
 *
 * Two namespaces share the `modules/<moduleId>/` prefix, and both are checked here:
 *   - `files[].name`, used as-is. `EmployeeDetail.vm.ts` › `getFile` sends `f.name + ext(f)`, and
 *     `ext(f)` is `''` on every branch that reaches a download (a Notion template returns a toast
 *     before it), so the stored name and the URL segment are the same string.
 *   - `resources[].name`, slugged by `resourceFileNameOf` — the client has no other handle on it.
 *
 * Without this check `:fileName` is an arbitrary read of anything under the prefix, including an
 * object belonging to a module the caller can reach but a file nobody published. `isSafeKeySegment`
 * stops an escape from the prefix; only this stops a traversal WITHIN it.
 */
export function declaresFile(m: Pick<AIEmployee, 'files' | 'resources'>, fileName: string): boolean {
  if (m.files.some((f) => f.name === fileName)) return true;
  return m.resources.some((r) => moduleResourceFileName(r) === fileName);
}

// --- the viewer ----------------------------------------------------------------------------------

/**
 * The signed-in LEARNER behind the session, or `null` for a staff viewer.
 *
 * `requireSession` has already proved there is a live `users` row, so the only `null` this returns
 * in practice is the staff case — `loadDb` splits the shared `users` table by `kind`, so a staff id
 * is simply not in `db.users`. Returning `null` for both keeps the two answers one 403 with one
 * message, which is what the header's "a staff viewer is refused" paragraph decides.
 */
function learnerFor(db: Db, req: FastifyRequest): Learner | null {
  const { actor } = viewerOrThrow(req);
  if (actor.kind !== 'learner') return null;
  return db.users.find((u) => u.id === actor.userId) ?? null;
}

/**
 * `@ai/core`'s tier rule, for a learner who must exist and a thing that carries a tier.
 *
 * One function so that neither route can grow its own variant, and so the test that sweeps the 2×2
 * tier matrix has one thing to sweep. `canAccess` is called with the real objects; nothing is
 * rebuilt or widened on the way in.
 */
const accessFor = (u: Learner, thing: Pick<Resource, 'tier'>): boolean => canAccess(u, thing);

// --- the stored key ------------------------------------------------------------------------------

/**
 * `resources.storage_key` for one row, or `null` when the column is NULL.
 *
 * A separate query because no snapshot carries this column: `codec.ts` deliberately leaves
 * `storageKey` out of `toRows`, `fromRows` ignores it on the way back, and § 7.4 strips it from
 * `scopeSnapshot`. One `select` of one column on a primary-key lookup.
 *
 * `'' ` is returned AS `''`, not folded into `null`. A present-but-blank key is a broken row (a
 * half-finished `uploadResource`, a hand edit), and re-deriving `resources/<id>` for it would
 * silently hand the caller a DIFFERENT object from the one the row names. It goes to `presignGet`,
 * whose `requireKey` refuses it, and the route answers 404. See the header, rule 1.
 */
async function storedKeyOf(id: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ storageKey: resourceTable.storageKey })
    .from(resourceTable)
    .where(eq(resourceTable.id, id))
    .limit(1);
  return row?.storageKey ?? null;
}

/** D-188: `resources.file_name` for one row, the stored file's name as uploaded, or null. Never in a snapshot, like the key. */
async function storedFileNameOf(id: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ fileName: resourceTable.fileName })
    .from(resourceTable)
    .where(eq(resourceTable.id, id))
    .limit(1);
  return row?.fileName ?? null;
}

/** D-188: a course video, addressed by its upload key: `/api/files/course/uploads/<YYYY>/<MM>/<token>.mp4`. */
export const COURSE_VIDEO_ROUTE = '/api/files/course/uploads/:yyyy/:mm/:file';

// --- the routes ----------------------------------------------------------------------------------

/**
 * D-188: how long a browser may keep what these routes send. `private` because every answer here was
 * decided for one signed-in viewer (no shared cache may keep it); five minutes so a `<video>` that seeks
 * back over what it already fetched, or a second click on Download, needn't ask again, while an access
 * change (a week closed, a row hidden) reaches the same browser soon after.
 */
export const FILE_CACHE_CONTROL = 'private, max-age=300';

/**
 * D-188: the object, streamed on this origin (no longer a 302 to a presigned GET on the bucket's), so the
 * CSP's `media-src 'self'` holds for a video and a download never leaves the app's origin.
 *
 *   - A single `Range: bytes=…` is passed to the bucket: 206 with `Content-Range`; past the end, 416
 *     with `Content-Range: bytes *\/<size>`. `Accept-Ranges: bytes` on every answer, so `<video>` seeks.
 *   - `Content-Type` and `Content-Length` are the object's own; `ETag` and `Last-Modified` too.
 *   - `Content-Disposition`: `attachment` with the file's name for a download, `inline` for a video.
 *   - A key no builder would make, or one the bucket doesn't hold, is this file's one 404.
 *
 * `StorageConfigError` is NOT caught: a missing `S3_BUCKET` is the operator's problem and must surface
 * as a logged 500 rather than as "no such file", which would send whoever is debugging it looking for a
 * missing row. `app.ts`'s error handler does the logging and the fixed body.
 */
async function sendObject(
  req: FastifyRequest,
  reply: FastifyReply,
  key: string,
  filename: string,
  disposition: 'attachment' | 'inline' = 'attachment',
): Promise<FastifyReply> {
  // A HEAD asks the bucket for the headers only: a GET piped into a HEAD response would read the whole
  // object (500 MB for a video) to throw it away.
  if (req.method === 'HEAD') {
    let head;
    try {
      head = await headObject(key);
    } catch (err) {
      if (err instanceof StorageKeyError || err instanceof ObjectMissingError)
        return reply.code(404).send({ error: NOT_FOUND });
      throw err;
    }
    return reply
      .code(200)
      .header('content-type', head.contentType ?? 'application/octet-stream')
      .header('content-length', String(head.size))
      .header('content-disposition', contentDisposition(filename, disposition))
      .header('accept-ranges', 'bytes')
      .header('cache-control', FILE_CACHE_CONTROL)
      .send();
  }
  let obj;
  try {
    obj = await getObject(key, singleByteRange(req.headers.range));
  } catch (err) {
    if (err instanceof StorageKeyError || err instanceof ObjectMissingError)
      return reply.code(404).send({ error: NOT_FOUND });
    if (err instanceof RangeNotSatisfiableError) {
      reply.header('accept-ranges', 'bytes').header('cache-control', 'no-store');
      if (err.size !== null) reply.header('content-range', `bytes */${err.size}`);
      return reply.code(416).send({ error: 'Range not satisfiable' });
    }
    throw err;
  }
  reply
    .code(obj.status)
    .header('content-type', obj.contentType ?? 'application/octet-stream')
    .header('content-disposition', contentDisposition(filename, disposition))
    .header('accept-ranges', 'bytes')
    .header('cache-control', FILE_CACHE_CONTROL);
  if (obj.contentLength !== undefined) reply.header('content-length', String(obj.contentLength));
  if (obj.contentRange) reply.header('content-range', obj.contentRange);
  if (obj.etag) reply.header('etag', obj.etag);
  if (obj.lastModified) reply.header('last-modified', obj.lastModified.toUTCString());
  return reply.send(obj.body);
}

// --- D-188: a course video's key, found in what the viewer may open ------------------------------

/**
 * A file a video block names: the mp4 itself, or (D-191) its poster or its transcript.
 * The same viewer rules serve all three. The name is what `Content-Disposition` quotes.
 */
function uploadIn(items: readonly (PathBlock | MediaItem)[] | undefined, key: string): { name: string } | null {
  for (const b of items ?? []) {
    if (typeof b === 'string' || b.type !== 'video') continue;
    if (isVideoUpload(b.source) && b.source.upload === key) return { name: b.source.name };
    if (b.poster?.upload === key) return { name: b.poster.name };
    if (b.transcript?.upload === key) return { name: b.transcript.name };
  }
  return null;
}

/** The uploaded file `key` names in one week's steps (Claude and ChatGPT paths) or its Media. */
function uploadInWeek(
  week: {
    media: readonly MediaItem[];
    checklist: readonly { paths?: { claude?: { blocks: PathBlock[] }; chatgpt?: { blocks: PathBlock[] } } }[];
  },
  key: string,
): { name: string } | null {
  for (const st of week.checklist) {
    const hit = uploadIn(st.paths?.claude?.blocks, key) ?? uploadIn(st.paths?.chatgpt?.blocks, key);
    if (hit) return hit;
  }
  return uploadIn(week.media, key);
}

export function registerFilesRoutes(app: FastifyInstance): void {
  /**
   * § 8.2: `GET /api/files/resource/:id`.
   *
   * The order of the three refusals is the whole security content of this handler:
   *   1. no such row            → 404
   *   2. `status !== 'published'` → 404. Every learner snapshot filters to published
   *      (`scopeSnapshot`, and `Vault.vm.ts` again on top), so a hidden row is one this viewer has
   *      never been shown. Answering 403 would confirm it exists AND tell them its tier.
   *   3. `canAccess` false      → 403, which Gate 8 names: "Downloading a Team-tier resource as
   *      Jamie returns 403." Safe to be specific here: the row is in Jamie's snapshot and the vault
   *      draws it with a lock, so the status code adds nothing he did not have.
   */
  // D-188: GET and an explicit HEAD (`exposeHeadRoute`'s HEAD would drain the stream to throw it away).
  app.route<{ Params: { id: string } }>({
    method: ['GET', 'HEAD'],
    url: '/api/files/resource/:id',
    preHandler: requireSession,
    handler: async (req, reply): Promise<FastifyReply> => {
      const db = await loadDb(getDb());
      const me = learnerFor(db, req);
      // D-172: the admin Resource Vault's hover Download. Staff who may edit the vault (the `curriculum`
      // PermKey, as every vault write needs) get any row, hidden ones included, with no tier rule and
      // no count: `dl` is learners' opens, and `downloadResource` refuses staff. Every other staff
      // member is still refused (a Support account has `curriculum: 0`).
      const staff = !me && can(db, viewerOrThrow(req).actor, 'curriculum');
      if (!me && !staff) return reply.code(403).send({ error: LEARNERS_ONLY });

      const resource = db.resources.find((r) => r.id === req.params.id);
      if (!resource || (!staff && resource.status !== 'published')) {
        return reply.code(404).send({ error: NOT_FOUND });
      }
      // D-175: a kit item (a vault row attached to a course week) follows its week, by its visibility,
      // exactly as the learner's snapshot does: one they can't see yet is a 404, as a hidden row is.
      // R-5 Phase 4 (D-261): the week as the viewer's cohort has it (its opening there). A week their cohort doesn't
      // take never opens for them, so its kit is theirs only as the vault's own (`published`), as their snapshot says.
      if (me && resource.module && isCourseWeek(resource.module)) {
        const now = clock.now();
        const entry = await courseEntryFor(getDb(), me.id, now);
        const week = cohortView(db, await viewerCohortId(getDb(), me.id)).modules.find((m) => m.id === resource.module);
        if (!(week ? kitVisible(resource, weekOpenFor(week, now, entry), entry.preview) : kitVisible(resource, false, false)))
          return reply.code(404).send({ error: NOT_FOUND });
      }
      if (me && !accessFor(me, resource)) return reply.code(403).send({ error: TIER_REFUSED });

      // The stored key first, `resources/<id>` only when the column is NULL — header rule 1.
      const stored = await storedKeyOf(resource.id);
      // `resourceKey` throws `StorageKeyError` on an id no builder would accept (one carrying a
      // `/`, say). It cannot fire on an id that matched a row, because every id in the table came
      // from the seed or from `ctx.id('r')` — but a 500 on a Download click is not the way to find
      // out that stopped being true, so it is inside the mapped branch.
      let key: string;
      try {
        key = stored ?? resourceKey(resource.id);
      } catch (err) {
        if (err instanceof StorageKeyError) return reply.code(404).send({ error: NOT_FOUND });
        throw err;
      }
      // D-188: the file's own name as uploaded, when the row has one; else the name fixture mode saves.
      return sendObject(req, reply, key, (await storedFileNameOf(resource.id)) ?? vaultFileName(resource));
    },
  });

  /**
   * § 8.2: `GET /api/files/module/:moduleId/:fileName` — "the same check, for skill files and
   * per-employee resources".
   *
   *   1. not in `visibleModules`  → 404. A draft AI Employee is in no snapshot, learner or not.
   *   2. `canAccess` false        → 403, the same answer and the same copy as the vault route.
   *      Checked BEFORE the file name, because an inaccessible module's `files` are redacted out of
   *      the viewer's snapshot: deciding on the name first would answer from data they cannot see.
   *   3. not declared by the module → 404 (header rule 2).
   *   4. a segment `isSafeKeySegment` refuses → 404, from `moduleFileKey`.
   *
   * There is deliberately NO `isOpen` check. A scheduled-but-unopened AI Employee's skill files are
   * in the learner's snapshot today (`scopeSnapshot` gates on `canAccess`, never on `isOpen`), so
   * refusing them here would be a rule no other half of the product has — and it would break the
   * build kit of the `operations` AI Employee for anyone who opened its page early.
   */
  app.route<{ Params: { moduleId: string; fileName: string } }>({
    method: ['GET', 'HEAD'],
    url: '/api/files/module/:moduleId/:fileName',
    preHandler: requireSession,
    handler: async (req, reply): Promise<FastifyReply> => {
      const { moduleId, fileName } = req.params;
      const db = await loadDb(getDb());
      const me = learnerFor(db, req);
      if (!me) return reply.code(403).send({ error: LEARNERS_ONLY });

      // R-5 Phase 4 (D-261): a course week as the viewer's cohort has it; a week their cohort doesn't take is a 404, as
      // their snapshot doesn't carry it.
      const mine = isCourseWeek(moduleId) ? cohortView(db, await viewerCohortId(getDb(), me.id)) : db;
      const employee = visibleModules(mine).find((m) => m.id === moduleId);
      if (!employee) return reply.code(404).send({ error: NOT_FOUND });
      // D-175: a course week's files open with the week, for a learner who may enter the course (the
      // snapshot carries a locked week with no files at all). Every other AI Employee is as before.
      const week = isCourseWeek(employee.id);
      if (week && !weekOpenFor(employee, clock.now(), await courseEntryFor(getDb(), me.id, clock.now()))) {
        return reply.code(404).send({ error: NOT_FOUND });
      }
      // D-186: an open course week's files follow course access (the check above), not the tier; every
      // other AI Employee's follow the tier, as before.
      if (!week && !accessFor(me, employee)) return reply.code(403).send({ error: TIER_REFUSED });
      if (!declaresFile(employee, fileName)) return reply.code(404).send({ error: NOT_FOUND });

      let key: string;
      try {
        key = moduleFileKey(moduleId, fileName);
      } catch (err) {
        if (err instanceof StorageKeyError) return reply.code(404).send({ error: NOT_FOUND });
        throw err;
      }
      // `:fileName` IS the name the browser saves under, and it is the one string on these routes
      // that reaches `Content-Disposition` as itself. `contentDisposition` inside `presignGet` is
      // what keeps a `"` in an admin-typed skill-file name from closing the quoted parameter.
      return sendObject(req, reply, key, fileName);
    },
  });

  /**
   * D-188: `GET /api/files/course/<key>` (`COURSE_VIDEO_ROUTE`), an uploaded video of a course week (a step's Claude or ChatGPT
   * path, or the week's Media), played inline by the learner portal's `<video>`.
   *
   *   - The key must be one the upload route mints (`uploads/…`), and it must be in a video block of a
   *     week this viewer may open. Never an arbitrary key: anything else is this file's one 404.
   *   - A learner: the weeks `GET /api/course` would hand them whole (`courseFor` with their entry,
   *     the same call, so the two can't disagree): their plan opens the course or its preview
   *     (`courseEntryFor`), and the week is open to them (`weekOpenFor`, its release). A locked week's
   *     video is a 404, as its content is absent from their course.
   *   - Staff: every course week, drafts too, as the builder's live preview shows them (staff see every
   *     week whole on `GET /api/course`).
   */
  app.route<{ Params: { yyyy: string; mm: string; file: string } }>({
    method: ['GET', 'HEAD'],
    url: COURSE_VIDEO_ROUTE,
    preHandler: requireSession,
    handler: async (req, reply): Promise<FastifyReply> => {
      // The route's own shape is the upload key's (`uploads/<YYYY>/<MM>/<token>.<ext>`), so no other
      // prefix can even be named here; the full key is then held to `isUploadKey`.
      const key = `uploads/${req.params.yyyy}/${req.params.mm}/${req.params.file}`;
      if (!isUploadKey(key)) return reply.code(404).send({ error: NOT_FOUND });
      const { actor } = viewerOrThrow(req);
      const db = await loadDb(getDb());
      let found: { name: string } | null = null;
      if (actor.kind === 'learner') {
        const now = clock.now();
        const entry = await courseEntryFor(getDb(), actor.userId, now);
        if (entry.open) {
          // R-5 Phase 4 (D-261): the viewer's own cohort's course, as `GET /api/course` hands it to them.
          for (const w of courseFor(db, now, entry, await viewerCohortId(getDb(), actor.userId))?.weeks ?? []) {
            if ('locked' in w) continue;
            found = uploadInWeek({ media: w.media, checklist: w.module.checklist }, key);
            if (found) break;
          }
        }
      } else {
        for (const m of db.modules.filter((x) => isWeekModule(x) && isCourseWeek(x.id))) {
          found = uploadInWeek({ media: m.course?.media ?? [], checklist: m.checklist }, key);
          if (found) break;
        }
      }
      if (!found) return reply.code(404).send({ error: NOT_FOUND });
      return sendObject(req, reply, key, found.name, 'inline');
    },
  });

  /**
   * § 8.2: `POST /api/files/upload-url {contentType, size}` — "staff with `curriculum` only".
   *
   * `requireJsonSameOrigin` after `requireSession`, as every mutation does: an unauthenticated POST
   * answers 401 rather than 415, which is Gate 7's authorization matrix. The CSRF rule applies
   * because the response IS a credential — a presigned PUT into the bucket — even though this route
   * writes no row of its own.
   *
   * `checkUpload` is the whole policy and this handler restates none of it. The 422 body is the
   * refusal's own message, which names the byte count or the four allowed types, because § 8.2's
   * caller is the vault drop zone and a bare "422" there is a dead end for the admin holding a
   * 30 MB file.
   *
   * THE KEY IS MINTED, NEVER READ FROM THE BODY. § 8.2's body is `{contentType, size}` and that is
   * all it may be: a `key` an uploader chose would let staff with `curriculum` write over any
   * object in the store, including another AI Employee's skill files. `uploadKey` takes the content
   * type and the clock and nothing else, and a test posts a `key` to prove it is ignored.
   */
  app.post('/api/files/upload-url', { preHandler: [requireSession, requireJsonSameOrigin] }, async (req, reply) => {
    const { actor } = viewerOrThrow(req);
    const db = await loadDb(getDb());
    // `can`, not `requirePerm`: the predicate rather than its throwing wrapper, so this route sends
    // its own 403 with `requirePerm`'s exact copy instead of catching a `MutationError` to re-derive
    // the same status. Same source of truth — `requirePerm` is one line over `can`.
    if (!can(db, actor, 'curriculum')) return reply.code(403).send({ error: NO_PERMISSION });

    // `req.body` is whatever JSON arrived. `null`, a bare string and an array all reach here, and
    // destructuring `null` throws a TypeError that would surface as a 500; `checkUpload` answers
    // 422 for the `undefined`s this produces instead, which is the right code for a malformed body
    // on a route whose entire job is to validate one.
    const body: UploadRequest =
      typeof req.body === 'object' && req.body !== null
        ? (req.body as UploadRequest)
        : { contentType: undefined, size: undefined };

    const check = checkUpload(body);
    if (!check.ok) return reply.code(check.status).send({ error: check.error });

    // `clock.now()` rather than `Date.now()`: § 7.7's test clock has to reach the `YYYY/MM` shard
    // or a FIXED_NOW suite would mint keys under the real current month and the assertions would
    // expire at midnight on the 1st.
    const key = uploadKey(check.contentType, { now: clock.now() });
    return reply.code(200).send({ key, url: await presignPut(key, check.contentType) });
  });
}
