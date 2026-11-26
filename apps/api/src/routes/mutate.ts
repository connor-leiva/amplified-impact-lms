// POST /api/mutate/:name — phase 07 § 7.3.
//
// § 7.3 gives this route as a code block and prefaces it with the reason it is a code block:
//
//   "**Every mutation endpoint follows this pattern**, so the API cannot drift from core."
//
// There is one endpoint for all 37 mutations, and it runs the SAME function the FixtureRepository
// runs in the browser. Nothing here knows what `toggleStep` or `publishModule` mean. That is the
// whole design: the admin console, the learner portal and the API cannot disagree about what a
// mutation does, because there is only one implementation of each, and Gate 7's oracle proves it
// by running every mutation both ways and comparing the resulting snapshots.
//
// ------------------------------------------------------------------------------------------------
// THE STATUS CODES, AND WHICH ONE IS NOT AN ERROR
// ------------------------------------------------------------------------------------------------
//   404  the name is not a mutation                     `schemaFor(name) === null`
//   400  the body is not that mutation's arguments      the zod schema refused it
//   422  core refused the request                       `out.error`, or `MutationError('invalid')`
//   403  this actor may not                             `MutationError('forbidden')`
//   403  a staff-write guard refused (D-171)            `{ error, code }`, `checkStaffChange`
//   404  the thing it names is gone                     `MutationError('not_found')`
//   200  it happened
//
// 422 is the one that matters most, and `apps/web/src/data/http.test.ts` says why in a test called
// "a 422 is a form error, not a failure": the repository RESOLVES a 422 with `{ error }` and
// throws on everything else, because `{ db, error }` is how `@ai/core` returns validation the UI
// renders inline — "Enter a valid email address." under the invite field, not a crash banner. The
// fixture path behaves identically, which is what lets the screens be unable to tell the two
// sources apart.
//
// ------------------------------------------------------------------------------------------------
// WHY THE EFFECTS ARE DISPATCHED AFTER THE COMMIT, WHICH § 7.3's BLOCK DOES NOT SAY
// ------------------------------------------------------------------------------------------------
// § 7.3's snippet has `await dispatchEffects(out.effects ?? [])` inside `db.transaction`, and this
// file does the mint inside and the SEND outside. Two reasons, and the second is the hard one:
//
//   1. An email must not be able to undo its own cause. `inviteMember`'s invite row belongs in the
//      database whether or not Resend answers — `email/transport.ts`'s decision 1 is exactly this
//      argument, and it is why `send()` never throws. Dispatching after the commit makes that
//      structural instead of contractual: there is no longer a transaction for a failure to roll
//      back.
//   2. The transaction holds `pg_advisory_xact_lock(42)`, which serializes EVERY write in the
//      system. A Resend round trip inside it means one outbound HTTP call blocks every other
//      mutation in the process, and `sendAnnouncement` to `audience: 'all'` would hold the lock for
//      one call per learner.
//
// What does stay inside the transaction is the invite TOKEN: § 7.5's 7-day `purpose:'invite'` row
// is part of the invite, so a rolled-back invite must not leave a working token behind.
//
// ------------------------------------------------------------------------------------------------
// WHY `effects` IS FILTERED TO CONFETTI ON THE WAY OUT
// ------------------------------------------------------------------------------------------------
// § 7.3's own line: `effects: (out.effects ?? []).filter((e) => e.type === 'confetti')`. The email
// effects are the server's to perform, and they carry recipient addresses — `inviteMember`'s
// effect holds `to: [email]`. Returning them would hand the browser a list of mailboxes it has no
// use for, and in the Team Hub's case an address `scopeSnapshot` may have deliberately blanked for
// that viewer. Confetti is the only effect the client performs, and `prefers-reduced-motion`
// decides whether it does.

// ------------------------------------------------------------------------------------------------
// THE CONFIRMED BUILD WRITES' AUDIT ROWS (D-172)
// ------------------------------------------------------------------------------------------------
// `publishModule`, `unpublishModule`, `deleteModule` and `deleteResource` are the Build writes an R2
// `Confirm` asks about, and every R2 Confirm says "This action is audit-logged." (the mockup's line).
// A staff member's one that changed something writes ONE `ok` row (`module.publish`,
// `module.unpublish`, `module.delete`, `vault.remove`: the AI Employee or resource by id and name,
// before and after) in the mutation's own transaction, after its write (`build-audit.ts` reads what
// it changed). Core's mutations are unchanged; a refusal writes no row.
//
// ------------------------------------------------------------------------------------------------
// THE STAFF WRITES' GUARDS AND AUDIT ROWS (D-171)
// ------------------------------------------------------------------------------------------------
// `inviteStaff`, `setStaffRole` and `removeStaff` by a staff member are guarded and audited HERE,
// around core's mutations, which stay the reference's (the oracle still compares them). Inside the
// transaction and under its lock: the guards (`checkStaffChange`: never your own role, never yourself,
// never the last Owner, the Owner role only from an Owner), then the mutation, then a check that the
// result still has an Owner, then the write and its ONE `ok` audit row, together. Each refusal writes
// one `denied` row, and so does core's own 403 for a staff member. `console/staff-writes.ts`.

import { MutationError, buildWriteRecordOf, isBuildConfirmWrite, openEnrollmentRefusal } from '@ai/core';
import type { Actor, Ctx, Db, Effect, Outcome } from '@ai/core';
import * as M from '@ai/core/mutations';
import { sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { expiryFor, hashToken, mintToken, requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import type { TokenPurpose } from '../auth';
import { getDb } from '../db/client';
import { authTokens } from '../db/schema';
import { loadDb, persistDiff } from '../db/io';
import type { Queryable } from '../db/io';
import { TEMPLATE_NAMES } from '../email/subjects';
import { send } from '../email/transport';
import type { SendRequest, TemplateName } from '../email/transport';
import { clock, newIds } from '../lib/clock';
import { recordStaffRefusal, refuseOwnerlessResult, refuseStaffWrite, staffWriteContext, writeStaffChange } from '../console/staff-writes';
import { audit } from '../console/audit';
import { viewerAccessFor } from '../lib/course-access';
import { cohortFactsOf } from '../lib/cohort-facts';
import { claimSendNowEmails, sendClaimed, withSendNowToast } from '../email/announce-now';
import type { SendNowClaim } from '../email/announce-now';
import { staffActor } from '../console/guard';
import { schemaFor } from './schemas';

/**
 * § 7.3's `M[name](before, req.actor, args as never, ctx)`, as one signature.
 *
 * The real `typeof M` is 37 distinct function types with 37 different `args`, and no single call
 * expression satisfies all of them — which is what § 7.3's own `args as never` is working around.
 * Narrowing it to one shape here, once, with the cast next to the comment that explains it, is
 * better than spreading `as never` through the handler. What makes it SAFE is `schemaFor(name)`:
 * the schema registry in `schemas.ts` is typed `{ [K in MutationName]: z.ZodType<MutationArgs<K>> }`
 * so `tsc` has already proved that the schema which validated this body produces exactly the
 * argument type the function under that name declares.
 */
type MutationFn = (db: Db, actor: Actor, args: never, ctx: Ctx) => Outcome;
const MUTATIONS = M as unknown as Record<string, MutationFn | undefined>;

/**
 * The templates whose body needs a single-use token minted for the recipient, and the token's
 * purpose: § 7.5's invites (7 days), and D-132's set-password link (72 hours), which a checkout's
 * new account gets in place of the owner invite.
 */
const TOKEN_TEMPLATES = {
  'team-invite': 'invite',
  'staff-invite': 'invite',
  'set-password': 'set_password',
} as const satisfies Partial<Record<TemplateName, TokenPurpose>>;

const isTemplateName = (value: string): value is TemplateName =>
  (TEMPLATE_NAMES as readonly string[]).includes(value);

const tokenPurposeOf = (value: TemplateName): TokenPurpose | null => (TOKEN_TEMPLATES as Partial<Record<TemplateName, TokenPurpose>>)[value] ?? null;

/** One email, for one recipient, ready to hand to the transport once the transaction has committed. */
export interface PendingSend {
  template: TemplateName;
  to: string;
  data: Record<string, unknown>;
}

/**
 * Core's effects as sends the transport can take, minting an invite token for each recipient.
 *
 * Three mismatches to close, and § 7.3 leaves all three to the route:
 *
 *   - `Effect.template` is a bare `string` (core knows nothing about § 8.1's table), while
 *     `send()` takes a `TemplateName`. An unknown name is DROPPED with a logged warning rather
 *     than thrown: an effect nobody can render must not turn a successful mutation into a 500.
 *   - `Effect.to` is `string[]` and `send()` takes one recipient, so each effect fans out. One
 *     send per address, which is also what `outboxFor({ to })` in Gate 8 asserts against.
 *   - An invite template's body needs a token, and core cannot mint one (it is pure, and it has no
 *     access to `auth_tokens`). § 7.5 says the invite token is good for 7 days; it is inserted on
 *     `tx`, inside the mutation's transaction, so a rolled-back invite leaves no usable token.
 */
export async function pendingSendsFor(
  tx: Queryable,
  effects: readonly Effect[],
  now: number,
  log: FastifyInstance['log'],
): Promise<PendingSend[]> {
  const sends: PendingSend[] = [];

  for (const effect of effects) {
    if (effect.type !== 'email') continue;
    if (!isTemplateName(effect.template)) {
      log.warn({ template: effect.template }, 'mutation asked for an email template that does not exist');
      continue;
    }
    const template = effect.template;
    for (const to of effect.to) {
      const data: Record<string, unknown> = { ...(effect.data ?? {}) };
      const purpose = tokenPurposeOf(template);
      if (purpose) {
        const token = mintToken();
        await tx.insert(authTokens).values({
          tokenHash: hashToken(token),
          email: to,
          purpose,
          expiresAt: expiryFor(purpose, now),
        });
        data.token = token;
      }
      sends.push({ template, to, data });
    }
  }

  return sends;
}

/**
 * § 7.3's `dispatchEffects`, after the commit.
 *
 * Sequential: the transport's test mode pushes onto one array and Gate 8 asserts on its ORDER, and
 * nothing here is latency-sensitive enough to be worth a `Promise.all` that would scramble it.
 *
 * `send()` reports failure in its return value and never throws (`transport.ts`, decision 1), so
 * the `try` is for the case that contract is broken. Either way a failed email cannot reach the
 * caller: the mutation has already committed and already answered.
 */
export async function dispatchEffects(sends: readonly PendingSend[], log: FastifyInstance['log']): Promise<void> {
  for (const pending of sends) {
    try {
      // The one cast in this file that is not provable. `Effect.data` is `Record<string, unknown>`
      // by the time it leaves core, and no generic can narrow it back to `EmailPayload<K>` at
      // runtime — which is precisely why `templates/index.tsx` reads every field through its own
      // `str`/`num` guards and throws with the template and field name, and why `send` turns that
      // into a logged `{ ok: false }` rather than an exception.
      const request = { template: pending.template, to: pending.to, data: pending.data };
      const result = await send(request as unknown as SendRequest<TemplateName>);
      if (!result.ok) log.error({ template: pending.template, to: pending.to }, 'effect email was not delivered');
    } catch (err) {
      log.error({ err, template: pending.template, to: pending.to }, 'effect email threw');
    }
  }
}

/** § 7.3's `MutationError` mapping, verbatim, plus D-247's 409 for the Module Builder's stale save. */
export const statusForMutationError = (code: MutationError['code']): number =>
  code === 'forbidden' ? 403 : code === 'not_found' ? 404 : code === 'conflict' ? 409 : 422;

/** What the transaction hands back: the response to send, and the mail to send after committing. */
type Committed =
  | { ok: true; body: { toast?: Outcome['toast']; effects: Effect[] }; sends: PendingSend[]; announced: SendNowClaim[] }
  | { ok: false; status: number; body: { error: string; code?: string } };

export interface MutateRouteOptions {
  /** § 7.6: called after each commit, so every connected client refetches. */
  broadcast: () => void;
}

export function registerMutateRoute(app: FastifyInstance, { broadcast }: MutateRouteOptions): void {
  app.post<{ Params: { name: string } }>(
    '/api/mutate/:name',
    // § 9.4's CSRF rule, after the session so an unauthenticated call is 401 (Gate 7's
    // authorization matrix) rather than 415. `auth/guard.ts` carries the argument.
    { preHandler: [requireSession, requireJsonSameOrigin] },
    async (req, reply): Promise<FastifyReply> => {
      const { name } = req.params;

      // § 7.3 writes this as `if (!(name in M))`. `schemaFor` is the better gate and it is the
      // same decision: it uses `hasOwnProperty`, so an INHERITED name — `toString`, `constructor`,
      // `valueOf`, all of which pass `name in M` — is a 404 rather than an attempt to call
      // `Object.prototype.toString(db, actor, …)`. `schemas.ts` states this and its tests pin it.
      const schema = schemaFor(name);
      const mutation = MUTATIONS[name];
      if (!schema || typeof mutation !== 'function') {
        return reply.code(404).send({ error: 'Unknown mutation' });
      }

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        // The issues are zod's own messages over OUR OWN client's payload (the view-models), not
        // user text, so echoing them is a debugging aid rather than a reflection risk. Every
        // object in `schemas.ts` is strict, so a drifted client gets told which key drifted.
        const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(body)'}: ${i.message}`);
        req.log.warn({ mutation: name, issues }, 'rejected a mutation body');
        return reply.code(400).send({ error: 'Invalid request body', issues });
      }

      const viewer = viewerOrThrow(req);
      const { actor } = viewer;
      const now = clock.now();
      // One generator per request, per `lib/clock.ts`: the oracle creates a fresh
      // `deterministicIds()` per mutation on the core side, so a process-wide counter would make
      // the first request of a run and the fortieth disagree about the ids they mint.
      const id = newIds();
      // D-171: a staff write by a staff member (`inviteStaff`, `setStaffRole`, `removeStaff`) is
      // guarded and audited around core's mutation, which is unchanged (`console/staff-writes.ts`).
      const staffWrite = staffWriteContext(name, parsed.data, viewer);
      let staffBefore: Db['staff'] | null = null;

      let committed: Committed;
      try {
        committed = await getDb().transaction(async (tx) => {
          // § 7.3: "serialize writes (low volume; revisit at scale)". Taken INSIDE the transaction
          // and released by the commit, so the snapshot a mutation computed from cannot move under
          // the write that follows it.
          await tx.execute(sql`select pg_advisory_xact_lock(42)`);

          const before = await loadDb(tx);
          // D-255 (R-5 Phase 3): Open enrollment is refused, with its reason, until "Before it opens" is done (PLAN.md
          // § 10.3: one function answers both). For a draft cohort that owns its run; the prototype's cohorts without one
          // (the demo seed's, which the oracle pins) open as they always have, and a cohort past its draft (December,
          // whose run the data step writes) keeps the mutation's own answer, word for word.
          if (name === 'openEnrollment') {
            const target = before.cohorts.find((c) => c.id === (parsed.data as { cohortId: string }).cohortId);
            if (target?.run && target.status === 'draft') {
              const refusal = openEnrollmentRefusal(before, target.id, await cohortFactsOf(tx, target.id));
              if (refusal) return { ok: false, status: 422, body: { error: refusal } };
            }
          }
          if (staffWrite) {
            staffBefore = before.staff;
            // Under the lock, so the Owners counted are the Owners there are. A refusal commits its
            // one `denied` row and nothing else.
            const refused = await refuseStaffWrite(req, tx, staffWrite, before);
            if (refused) return { ok: false, ...refused };
          }
          // D-186: a learner's write carries whether their plan opens the course now, the snapshot's own
          // answer (`viewerAccessFor`), so a course week's step follows course access, not the tier.
          const access = actor.kind === 'learner' ? await viewerAccessFor(tx, actor.userId, now) : undefined;
          const out = mutation(before, actor, parsed.data as never, {
            now,
            id,
            ...(access === undefined ? {} : { course: access.accelerator, ...(access.early ? { early: true } : {}) }),
          });
          // `{ db, error }` with the db untouched: validation the UI renders inline. Nothing was
          // written, so there is nothing to roll back and the transaction may commit empty.
          if (out.error) return { ok: false, status: 422, body: { error: out.error } };
          if (staffWrite) {
            const refused = await refuseOwnerlessResult(req, tx, staffWrite, before, out.db);
            if (refused) return { ok: false, ...refused };
          }

          await persistDiff(tx, before, out.db);
          if (staffWrite) await writeStaffChange(req, tx, staffWrite, before, out.db);
          // D-172: a Build write behind an R2 Confirm ("This action is audit-logged.") writes its ONE
          // row here, in this transaction, as the staff writes do; core's mutation is unchanged.
          const buildActor = isBuildConfirmWrite(name) ? staffActor(viewer) : null;
          if (buildActor && isBuildConfirmWrite(name)) {
            const record = buildWriteRecordOf(name, parsed.data, before, out.db);
            if (record) await audit(req, { ...record, outcome: 'ok', actor: buildActor }, tx);
          }
          const sends = await pendingSendsFor(tx, out.effects ?? [], now, req.log);
          // D-247 (H-9): Send now with Email (`sendAnnouncement`) claims its emails' ledger keys here, in
          // the write's transaction, as the scheduled path does. Nothing for any other write.
          const announced = await claimSendNowEmails(tx, before, out.db, now, req.log);

          return {
            ok: true,
            body: {
              ...(out.toast ? { toast: out.toast } : {}),
              effects: (out.effects ?? []).filter((e) => e.type === 'confetti'),
            },
            sends,
            announced,
          };
        });
      } catch (err) {
        // Thrown by the mutation itself, so the transaction has already rolled back — which is
        // what must happen: `requirePerm` throws before anything is written, but a `not_found`
        // deeper in a mutation can throw after it has built a new db, and that db must not persist.
        if (err instanceof MutationError) {
          // D-171: core refused a staff member's staff write (no `staff` permission, or the Owner's
          // role is fixed). The transaction is gone, so its `denied` row is written on its own.
          if (staffWrite && err.code === 'forbidden') await recordStaffRefusal(req, staffWrite, staffBefore, err.message);
          return reply.code(statusForMutationError(err.code)).send({ error: err.message });
        }
        throw err;
      }

      if (!committed.ok) return reply.code(committed.status).send(committed.body);

      // After the commit, in this order: wake the clients first (a refetch is what the viewer is
      // waiting for), then do the mail, which nobody is watching.
      broadcast();
      await dispatchEffects(committed.sends, req.log);
      // D-247 (H-9): Send now's email, then the toast says how many it went to (or that none could).
      const emailed = await sendClaimed(committed.announced, req.log);
      const toast = withSendNowToast(committed.body.toast, committed.announced, emailed);

      return reply.code(200).send({ ...committed.body, ...(toast ? { toast } : {}) });
    },
  );
}
