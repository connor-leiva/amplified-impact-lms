// D-247 (H-9): Resend Invite and Send Nudge, sending a real email (they used to only show a toast).
//
//   POST /api/learners/:userId/resend-invite   a fresh set-password link (72 hours) for a learner who
//                                               hasn't joined. Staff with View learners (Learners & Teams),
//                                               or the invitee's Team Owner or Operations Lead (Team Hub).
//   POST /api/learners/:userId/nudge            a short "pick up where you left off" email to a learner who
//                                               has joined. Staff with View learners. Sets `nudged` (core's
//                                               `nudgeLearners`, the fixture's own write) only once it went.
//
// The path is Console › User › Send password reset's (`console/support-routes.ts`), with its parts reused:
// a `set_password` token minted the way `issuePasswordLink` mints it, `transport.send`, one audit row for
// staff (`user.invite_resend`, `user.nudge`; `ok` when the email went, `failed` with why when it didn't),
// and the limits below. The emails are the $37 skill email's design (`templates/learner-emails-html.ts`).
//
// The send is awaited, so the answer says what happened: `{ toast }` with core's words (`learnerEmailToast`):
// sent, not set up on this server (nothing minted, nothing sent), or failed. Every refusal is core's
// (`resendInviteTarget`, `nudgeTarget`): 403 who may not, 404 no such learner, 422 the wrong state.
//
// Limits: 20 a minute per session (the admin actions' rate), and 5 an hour per recipient (Forgot
// password's per-address rate), so nobody can flood one inbox. Signed in, same-origin JSON. A masquerade
// refuses it with every other write (D-162's global block).

import { MutationError, firstNameOf, learnerEmailToast, nudgeTarget, resendInviteTarget } from '@ai/core';
import { nudgeLearners } from '@ai/core/mutations';
import type { EmailOutcome, Learner } from '@ai/core';
import { sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { expiryFor, hashToken, mintToken, requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import type { SessionViewer } from '../auth';
import { audit } from '../console/audit';
import { staffActor } from '../console/guard';
import { getDb } from '../db/client';
import { loadDb, persistDiff } from '../db/io';
import { authTokens } from '../db/schema';
import { emailReady } from '../email/ready';
import { send } from '../email/transport';
import { clock, newIds } from '../lib/clock';
import { ADMIN_ACTION_RATE } from './admin-actions';
import { AUTH_REQUEST_MAX, AUTH_REQUEST_WINDOW } from './auth';
import { statusForMutationError } from './mutate';

export const LEARNER_EMAIL_PATHS = {
  invite: '/api/learners/:userId/resend-invite',
  nudge: '/api/learners/:userId/nudge',
} as const;

/** The same shape the Console accepts for a user id. */
const ID = /^[A-Za-z0-9_.:@-]{1,128}$/;

/** Forgot password's own words for its per-address limit. */
const TOO_MANY = 'Too many requests. Try again later.';

export interface LearnerEmailRouteOptions {
  broadcast: () => void;
}

type Kind = 'invite' | 'nudge';

/** Who may email whom, by core's rule; a refusal is the answer. */
async function targetOf(kind: Kind, viewer: SessionViewer, userId: string): Promise<{ ok: true; target: Learner } | { ok: false; status: number; error: string }> {
  if (!ID.test(userId)) return { ok: false, status: 404, error: 'No such learner.' };
  const db = await loadDb(getDb());
  try {
    return { ok: true, target: kind === 'invite' ? resendInviteTarget(db, viewer.actor, userId) : nudgeTarget(db, viewer.actor, userId) };
  } catch (err) {
    if (err instanceof MutationError) return { ok: false, status: statusForMutationError(err.code), error: err.message };
    throw err;
  }
}

/** Resend Invite's email: a fresh `set_password` link, as `issuePasswordLink` mints one. */
async function sendInvite(target: Learner, now: number): Promise<EmailOutcome> {
  if (!emailReady()) return 'off';
  const token = mintToken();
  await getDb().insert(authTokens).values({ tokenHash: hashToken(token), email: target.email, purpose: 'set_password', expiresAt: expiryFor('set_password', now) });
  const result = await send({ template: 'learner-invite', to: target.email, data: { firstName: firstNameOf(target.name), email: target.email, token } });
  return result.ok ? 'sent' : 'failed';
}

/** Send Nudge's email. */
async function sendNudge(target: Learner): Promise<EmailOutcome> {
  if (!emailReady()) return 'off';
  const result = await send({ template: 'learner-nudge', to: target.email, data: { firstName: firstNameOf(target.name) } });
  return result.ok ? 'sent' : 'failed';
}

/** Send Nudge's `nudged` stamp (the Overview's "Nudged 2 minutes ago"), under `/api/mutate`'s lock. */
async function stampNudged(viewer: SessionViewer, userId: string, now: number): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(42)`);
    const before = await loadDb(tx);
    const out = nudgeLearners(before, viewer.actor, { userIds: [userId] }, { now, id: newIds() });
    await persistDiff(tx, before, out.db);
  });
}

export function registerLearnerEmailRoutes(app: FastifyInstance, { broadcast }: LearnerEmailRouteOptions): void {
  for (const kind of ['invite', 'nudge'] as const) {
    const perRecipient = app.createRateLimit({
      max: AUTH_REQUEST_MAX,
      timeWindow: AUTH_REQUEST_WINDOW,
      keyGenerator: (req: FastifyRequest) => `learner-email:${kind}:${(req.params as { userId?: string }).userId ?? ''}`,
    });

    app.post<{ Params: { userId: string } }>(
      LEARNER_EMAIL_PATHS[kind],
      { preHandler: [requireSession, requireJsonSameOrigin], config: { rateLimit: { max: ADMIN_ACTION_RATE, timeWindow: '1 minute' } } },
      async (req, reply): Promise<FastifyReply> => {
        const viewer = viewerOrThrow(req);
        const found = await targetOf(kind, viewer, req.params.userId);
        if (!found.ok) return reply.code(found.status).send({ error: found.error });
        const { target } = found;
        const verdict = await perRecipient(req);
        if (!verdict.isAllowed && verdict.isExceeded) {
          reply.header('retry-after', String(verdict.ttlInSeconds));
          return reply.code(429).send({ error: TOO_MANY });
        }

        const now = clock.now();
        const outcome = kind === 'invite' ? await sendInvite(target, now) : await sendNudge(target);
        if (kind === 'nudge' && outcome === 'sent') {
          await stampNudged(viewer, target.id, now);
          broadcast();
        }
        const actor = staffActor(viewer);
        if (actor) {
          await audit(req, {
            action: kind === 'invite' ? 'user.invite_resend' : 'user.nudge',
            outcome: outcome === 'sent' ? 'ok' : 'failed',
            actor,
            target: { type: 'user', id: target.id, label: target.name },
            ...(outcome === 'sent' ? {} : { reason: outcome === 'off' ? 'email_not_configured' : 'send_failed' }),
            after: { sent: outcome === 'sent' },
          });
        }
        return reply.code(200).send({ toast: learnerEmailToast(kind, outcome, target) });
      },
    );
  }
}
