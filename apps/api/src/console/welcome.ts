// A test of the cohort welcome, to an allowlisted address only. It does not mark an enrollment sent,
// so it cannot be the welcome a learner receives, and it does not queue the GoHighLevel tag.
//
// The allowlist is `accelerator-test@amplifiedimpact.io`, plus any addresses in
// `WELCOME_TEST_ALLOWLIST` (comma-separated). Anything else is refused and audited as denied.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { INFRA_PATHS, firstNameOf, welcomeSchedule, welcomeTestAllowed, welcomeWeek0 } from '@ai/core';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { expiryFor, hashToken, mintToken } from '../auth/tokens';
import { getDb } from '../db/client';
import { authTokens, cohorts, googleIdentities, sessions, userPasswords, users } from '../db/schema';
import { absolute, setPasswordPath } from '../email/templates/links';
import { send } from '../email/transport';
import { readWeeks, sessionOf, welcomeEmailData } from '../jobs/enrollments';
import { clock } from '../lib/clock';
import { audit } from './audit';
import { consoleError, requireConsole, staffActor } from './guard';

export const extraAllowlist = (env: NodeJS.ProcessEnv): string[] =>
  (env.WELCOME_TEST_ALLOWLIST ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export function registerWelcomeTestRoute(scope: FastifyInstance, limits: { write: number }, env: () => NodeJS.ProcessEnv): void {
  scope.post(
    INFRA_PATHS.welcomeTest,
    { preHandler: [requireSession, requireJsonSameOrigin, requireConsole('flags.write')], config: { rateLimit: { max: limits.write, timeWindow: '1 minute' } } },
    async (req, reply): Promise<FastifyReply> => {
      const viewer = viewerOrThrow(req);
      const actor = staffActor(viewer)!;
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
      const to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : '';
      const cohortId = typeof body.cohortId === 'string' ? body.cohortId.trim() : '';
      if (!to || !cohortId) return consoleError(reply, 'invalid_body', 'Say who and which cohort: { "to", "cohortId" }.');
      if (!welcomeTestAllowed(to, extraAllowlist(env()))) {
        await audit(req, { action: 'welcome.test_send', outcome: 'denied', actor, target: { type: 'cohort', id: cohortId, label: cohortId }, reason: 'not_allowlisted' });
        return consoleError(reply, 'console_forbidden', 'That address is not on the welcome test list.');
      }
      const db = getDb();
      const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1);
      if (!cohort) return consoleError(reply, 'not_found', 'No cohort with that id.');
      const sessionRows = await db.select().from(sessions).where(eq(sessions.cohortId, cohortId));
      const weeks = await readWeeks(db, cohortId);
      const built = welcomeSchedule(cohort, weeks, sessionRows.map(sessionOf));
      if (!built.ok) return consoleError(reply, 'invalid_body', 'This cohort has no live build and office hours yet, so the welcome cannot be filled in.');
      const week0 = welcomeWeek0(weeks);
      if (!week0.ok) return consoleError(reply, 'invalid_body', 'Week 0 has no due date or baseline table yet, so the welcome cannot be filled in.');
      const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, to)).limit(1);
      let setPasswordUrl: string | null = null;
      if (user) {
        const [pw] = await db.select({ userId: userPasswords.userId }).from(userPasswords).where(eq(userPasswords.userId, user.id)).limit(1);
        const [google] = await db.select({ userId: googleIdentities.userId }).from(googleIdentities).where(eq(googleIdentities.userId, user.id)).limit(1);
        if (!pw && !google) {
          const token = mintToken();
          await db.insert(authTokens).values({ tokenHash: hashToken(token), email: to, purpose: 'set_password', expiresAt: expiryFor('set_password', clock.now()) });
          setPasswordUrl = absolute(setPasswordPath(token));
        }
      }
      const result = await send({
        template: 'cohort-welcome',
        to,
        data: welcomeEmailData(built.schedule.cohortName, built.schedule, week0.week0, firstNameOf(user?.name ?? ''), setPasswordUrl),
      });
      await audit(req, {
        action: 'welcome.test_send',
        outcome: result.ok ? 'ok' : 'failed',
        actor,
        target: { type: 'cohort', id: cohortId, label: cohort.name },
        after: { to, subject: result.subject, ok: result.ok },
      });
      if (!result.ok) return consoleError(reply, 'ops_unavailable', 'The welcome was not sent.');
      return reply.send({ ok: true, subject: result.subject });
    },
  );
}
