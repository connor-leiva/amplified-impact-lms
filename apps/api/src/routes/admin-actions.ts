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
//   200  it happened, with its toast; one audit row was written with it
//
// Signed in, same-origin JSON (§ 9.4's CSRF rule), 20 a minute per session (the Console's write rate,
// spec § 7). It sends nothing: no action here has an email effect. A masquerade refuses it with every
// other write (D-162's global block refuses every POST but Extend, Exit and Sign Out).

import { ADMIN_ACTIONS, MutationError, isAdminActionName } from '@ai/core';
import type { Actor, AdminActionArgs, AdminActionName, AdminOutcome, Ctx, Db } from '@ai/core';
import { sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { audit } from '../console/audit';
import { staffActor } from '../console/guard';
import { getDb } from '../db/client';
import { loadDb, persistDiff } from '../db/io';
import { clock, newIds } from '../lib/clock';
import { builderDraft } from './schemas';
import { statusForMutationError } from './mutate';

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

/** One strict schema per action; `tsc` proves each one's output is that action's argument type. */
export const ADMIN_ACTION_SCHEMAS: { [K in AdminActionName]: z.ZodType<AdminActionArgs<K>> } = {
  duplicateModule: z.strictObject({ id }),
  saveBuilderModule: z.strictObject({ draft: builderDraft, status: moduleStatus.optional() }),
  editResource: z.strictObject({ id, title: text(200), desc: text(1000), cat: text(100), tier, module: id.nullable() }),
  addSession: z.strictObject({ cohortId: id, title: text(200), date: text(10), time: text(5), mins: z.union([z.number(), text(6)]), zoom: text(2048) }),
  attachReplay: z.strictObject({ sessionId: id, url: text(4096) }),
  saveAnnouncementDraft: z.strictObject(announcement),
  updateAnnouncement: z.strictObject({ ...announcement, id, when: z.enum(['draft', 'now', 'later']) }),
  duplicateAnnouncement: z.strictObject({ id }),
};

type ActionFn = (db: Db, actor: Actor, args: never, ctx: Ctx) => AdminOutcome;
const ACTIONS = ADMIN_ACTIONS as unknown as Record<AdminActionName, ActionFn>;

type Committed = { ok: true; body: { toast?: AdminOutcome['toast'] } } | { ok: false; status: number; body: { error: string } };

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
          const actor = staffActor(viewer);
          if (out.audit && actor) {
            await audit(req, { action: out.audit.action, outcome: 'ok', actor, target: out.audit.target, before: out.audit.before, after: out.audit.after }, tx);
          }
          return { ok: true, body: out.toast ? { toast: out.toast } : {} };
        });
      } catch (err) {
        if (err instanceof MutationError) return reply.code(statusForMutationError(err.code)).send({ error: err.message });
        throw err;
      }
      if (!committed.ok) return reply.code(committed.status).send(committed.body);
      broadcast();
      return reply.code(200).send(committed.body);
    },
  );
}
