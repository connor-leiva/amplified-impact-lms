// POST /api/admin/actions/:name — the R2 mockup's remaining Build controls, made real and audited
// (D-172). `/api/mutate/:name`'s shape, for the actions in `@ai/core`'s `ADMIN_ACTIONS` (beside the
// reference-ported mutations, which stay on `/api/mutate` unchanged), plus ONE `audit_log` row per
// write in the same transaction:
//
//   404  the name is not an action                      `isAdminActionName` (own properties only)
//   400  the body is not that action's arguments        the strict zod schema below refused it
//   422  core refused the request                       `out.error`, or `MutationError('invalid')`
//   403  this actor may not                             `MutationError('forbidden')`: the action's own
//                                                       `requirePerm` (the existing `PermKey` rule)
//   404  the thing it names is gone                     `MutationError('not_found')`
//   409  the Module Builder's draft is stale            `MutationError('conflict')` (D-247, H-6): the
//                                                       module is no longer the `base` version it sent
//   200  it happened, with its toast; one audit row was written with it. `saveBuilderModule` also
//        answers `saved` (D-247): the module's new version and its step ids, for the builder.
//
// Signed in, same-origin JSON (§ 9.4's CSRF rule), 20 a minute per session (the Console's write rate,
// spec § 7). No action has an email effect; D-247 (H-9): an edited announcement's Send now with Email
// sends its email as `/api/mutate/sendAnnouncement` does (`email/announce-now.ts`). A masquerade refuses
// it with every other write (D-162's global block refuses every POST but Extend, Exit and Sign Out).

import { ADMIN_ACTIONS, MutationError, VAULT_FILE_ERROR, isAdminActionName } from '@ai/core';
import type { Actor, AdminActionArgs, AdminActionName, AdminOutcome, Ctx, Db, VaultFile } from '@ai/core';
import { UPLOAD_KEY } from '@ai/core/uploads';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { audit } from '../console/audit';
import { staffActor } from '../console/guard';
import { getDb } from '../db/client';
import { loadDb, persistDiff } from '../db/io';
import { resources as resourceTable } from '../db/schema';
import { ObjectMissingError, headObject } from '../storage';
import { clock, newIds } from '../lib/clock';
import { builderDraft, cohortCourse } from './schemas';
import { statusForMutationError } from './mutate';
import { claimSendNowEmails, sendClaimed, withSendNowToast } from '../email/announce-now';
import type { SendNowClaim } from '../email/announce-now';

export const ADMIN_ACTIONS_PATH = '/api/admin/actions/:name';

/** Spec § 7's write rate, per session. */
export const ADMIN_ACTION_RATE = 20;

const id = z.string().min(1);
const moduleStatus = z.enum(['draft', 'scheduled', 'published']);
const tier = z.enum(['agent', 'team']);
/** A form's free text: bounded, so no field can carry a megabyte into a row or an audit payload. */
const text = (max: number) => z.string().max(max);
const announcement = {
  title: text(200),
  body: text(5000),
  audience: z.enum(['all', 'agent', 'team', 'owners']),
  inapp: z.boolean(),
  email: z.boolean(),
  severity: z.enum(['info', 'warning']).optional(),
  action: z.enum(['calendar', 'sessions', '']).nullable().optional(),
  at: text(16).optional(),
};

/** D-188: the file a browser put in the bucket, as the Vault sends it. Its key is one the upload route mints. */
const vaultFile = z.strictObject({ key: z.string().regex(UPLOAD_KEY), name: text(200).min(1), size: z.number().int().positive(), type: text(120) });

/** One strict schema per action; `tsc` proves each one's output is that action's argument type. */
export const ADMIN_ACTION_SCHEMAS: { [K in AdminActionName]: z.ZodType<AdminActionArgs<K>> } = {
  duplicateModule: z.strictObject({ id }),
  // D-247 (H-6): `base` is the version of the module the draft was opened from (`moduleVersion`), null for
  // a new one. Required: a save that can't say what it started from could overwrite a newer one.
  saveBuilderModule: z.strictObject({ draft: builderDraft, status: moduleStatus.optional(), base: z.string().max(64).nullable() }),
  editResource: z.strictObject({
    id,
    title: text(200),
    desc: text(1000),
    cat: text(100),
    tier,
    module: id.nullable(),
    // D-174: a kit item's place in its week; absent from D-172's Edit details, which leaves it alone.
    kit: z
      .strictObject({
        kind: z.enum(['file', 'prompt', 'guide', 'replay', 'vault']).nullable(),
        stepId: id.nullable(),
        visibility: z.enum(['hidden_until_open', 'open_in_preview', 'published', 'hidden']).nullable(),
        platform: z.enum(['claude', 'chatgpt', 'both']).nullable(),
      })
      .optional(),
  }),
  // D-188: Publish to Vault and Replace file, with a real upload.
  publishVaultFile: z.strictObject({ title: text(200), desc: text(1000), cat: text(100), type: text(100), tier, file: vaultFile }),
  replaceVaultFile: z.strictObject({ id, file: vaultFile }),
  addSession: z.strictObject({ cohortId: id, title: text(200), date: text(10), time: text(5), mins: z.union([z.number(), text(6)]), zoom: text(2048) }),
  attachReplay: z.strictObject({ sessionId: id, url: text(4096) }),
  saveAnnouncementDraft: z.strictObject(announcement),
  updateAnnouncement: z.strictObject({ ...announcement, id, when: z.enum(['draft', 'now', 'later']) }),
  duplicateAnnouncement: z.strictObject({ id }),
  // D-174: the curriculum builder.
  saveSession: z.strictObject({
    id: id.optional(),
    cohortId: id,
    moduleId: id.nullable(),
    kind: z.enum(['live_build', 'office_hours', 'goal_planning', 'setup', 'other']),
    title: text(200),
    date: text(10),
    time: text(5),
    mins: z.union([z.number(), text(6)]),
    zoom: text(2048),
    replayVisibility: z.enum(['hidden', 'after_open', 'published']).nullable(),
  }),
  deleteSession: z.strictObject({ id }),
  saveCohortPlan: z.strictObject({
    cohortId: id,
    name: text(200),
    cadence: text(300),
    previewOpens: z.strictObject({ date: text(10), time: text(5) }).nullable(),
    defaultOpenTime: text(5),
    welcomeSends: z.strictObject({ date: text(10), time: text(5) }).nullable().optional(),
  }),
  saveCohortCourse: z.strictObject({ cohortId: id, course: cohortCourse }),
  saveCopyString: z.strictObject({ key: text(120), value: text(2000), audience: z.enum(['learner', 'staff']) }),
};

type ActionFn = (db: Db, actor: Actor, args: never, ctx: Ctx) => AdminOutcome;
const ACTIONS = ADMIN_ACTIONS as unknown as Record<AdminActionName, ActionFn>;

type Committed =
  | { ok: true; body: { toast?: AdminOutcome['toast']; saved?: AdminOutcome['saved'] }; announced: SendNowClaim[] }
  | { ok: false; status: number; body: { error: string } };

export interface AdminActionsRouteOptions {
  /** § 7.6: called after each commit, so every connected client refetches. */
  broadcast: () => void;
}

export function registerAdminActionsRoute(app: FastifyInstance, { broadcast }: AdminActionsRouteOptions): void {
  app.post<{ Params: { name: string } }>(
    ADMIN_ACTIONS_PATH,
    { preHandler: [requireSession, requireJsonSameOrigin], config: { rateLimit: { max: ADMIN_ACTION_RATE, timeWindow: '1 minute' } } },
    async (req, reply): Promise<FastifyReply> => {
      const { name } = req.params;
      if (!isAdminActionName(name)) return reply.code(404).send({ error: 'Unknown action' });
      const parsed = ADMIN_ACTION_SCHEMAS[name].safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(body)'}: ${i.message}`);
        req.log.warn({ action: name, issues }, 'rejected an admin action body');
        return reply.code(400).send({ error: 'Invalid request body', issues });
      }

      const viewer = viewerOrThrow(req);
      // D-188: a vault row takes a stored file only once the bucket holds it, at the size and type the
      // browser declared: the presigned PUT can't bind its size (storage.ts, decision 3), so this does.
      // Read before the lock; the action itself still checks who may (a refusal below writes nothing).
      const file = (parsed.data as { file?: VaultFile }).file;
      if (file && !(await storedAsDeclared(file))) return reply.code(422).send({ error: VAULT_FILE_ERROR });
      const now = clock.now();
      const ids = newIds();
      let committed: Committed;
      try {
        committed = await getDb().transaction(async (tx) => {
          // `/api/mutate`'s lock: every write in the system is serialized behind it.
          await tx.execute(sql`select pg_advisory_xact_lock(42)`);
          const before = await loadDb(tx);
          const out = ACTIONS[name](before, viewer.actor, parsed.data as never, { now, id: ids });
          if (out.error) return { ok: false, status: 422, body: { error: out.error } };
          await persistDiff(tx, before, out.db);
          // D-188: the stored file goes on the row here, beside the snapshot's columns (which never hold
          // it), and the key it replaces goes in the audit row. The old object stays in the bucket.
          let auditBefore = out.audit?.before;
          if (out.storage) {
            const [prev] = await tx
              .select({ storageKey: resourceTable.storageKey, fileName: resourceTable.fileName })
              .from(resourceTable)
              .where(eq(resourceTable.id, out.storage.resourceId))
              .limit(1);
            await tx
              .update(resourceTable)
              .set({ storageKey: out.storage.key, fileName: out.storage.fileName })
              .where(eq(resourceTable.id, out.storage.resourceId));
            if (auditBefore !== undefined && auditBefore !== null && typeof auditBefore === 'object') {
              auditBefore = { ...(auditBefore as Record<string, unknown>), file: { object: prev?.storageKey ?? null, name: prev?.fileName ?? null } };
            }
          }
          const actor = staffActor(viewer);
          if (out.audit && actor) {
            await audit(req, { action: out.audit.action, outcome: 'ok', actor, target: out.audit.target, before: auditBefore, after: out.audit.after }, tx);
          }
          // D-247 (H-9): an edited announcement's Send now with Email claims its emails here.
          const announced = await claimSendNowEmails(tx, before, out.db, now, req.log);
          return { ok: true, body: { ...(out.toast ? { toast: out.toast } : {}), ...(out.saved ? { saved: out.saved } : {}) }, announced };
        });
      } catch (err) {
        if (err instanceof MutationError) return reply.code(statusForMutationError(err.code)).send({ error: err.message });
        throw err;
      }
      if (!committed.ok) return reply.code(committed.status).send(committed.body);
      broadcast();
      const emailed = await sendClaimed(committed.announced, req.log);
      const toast = withSendNowToast(committed.body.toast, committed.announced, emailed);
      return reply.code(200).send({ ...committed.body, ...(toast ? { toast } : {}) });
    },
  );
}

/**
 * D-188: whether the bucket holds `file.key` at the size and type the browser declared. A missing object
 * (the PUT never finished) or a mismatch is a refusal; an unconfigured bucket is the operator's 500.
 */
async function storedAsDeclared(file: VaultFile): Promise<boolean> {
  try {
    const head = await headObject(file.key);
    return head.size === file.size && (head.contentType === undefined || head.contentType === file.type);
  } catch (err) {
    if (err instanceof ObjectMissingError) return false;
    throw err;
  }
}
