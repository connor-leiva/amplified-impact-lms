// A test of the Week 0 Is Open email, to an allowlisted address only: the cohort welcome's test route
// (`welcome.ts`), for this email. It never reads or writes `cohort_enrollments`, so it cannot be the email a learner
// receives and cannot mark anyone sent.
//
// The allowlist is the welcome's: `accelerator-test@amplifiedimpact.io`, plus any addresses in `WELCOME_TEST_ALLOWLIST`
// (comma-separated). No new variable. Anything else is refused and audited as denied.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { INFRA_PATHS, firstNameOf, week0DueAt, welcomeSchedule, welcomeTestAllowed } from '@ai/core';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { cohorts, sessions, users } from '../db/schema';
import { send } from '../email/transport';
import { readWeeks, sessionOf } from '../jobs/enrollments';
import { week0Subject } from '../jobs/week0-open';
import { audit } from './audit';
import { consoleError, requireConsole, staffActor } from './guard';
import { extraAllowlist } from './welcome';

export function registerWeek0TestRoute(scope: FastifyInstance, limits: { write: number }, env: () => NodeJS.ProcessEnv): void {
  scope.post(
    INFRA_PATHS.week0Test,
    { preHandler: [requireSession, requireJsonSameOrigin, requireConsole('flags.write')], config: { rateLimit: { max: limits.write, timeWindow: '1 minute' } } },
    async (req, reply): Promise<FastifyReply> => {
      const viewer = viewerOrThrow(req);
      const actor = staffActor(viewer)!;
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
      const to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : '';
      const cohortId = typeof body.cohortId === 'string' ? body.cohortId.trim() : '';
      if (!to || !cohortId) return consoleError(reply, 'invalid_body', 'Say who and which cohort: { "to", "cohortId" }.');
      if (!welcomeTestAllowed(to, extraAllowlist(env()))) {
        await audit(req, { action: 'week0.test_send', outcome: 'denied', actor, target: { type: 'cohort', id: cohortId, label: cohortId }, reason: 'not_allowlisted' });
        return consoleError(reply, 'console_forbidden', 'That address is not on the welcome test list.');
      }
      const db = getDb();
      const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1);
      if (!cohort) return consoleError(reply, 'not_found', 'No cohort with that id.');
      const sessionRows = await db.select().from(sessions).where(eq(sessions.cohortId, cohortId));
      const weeks = await readWeeks(db, cohortId);
      const built = welcomeSchedule(cohort, weeks, sessionRows.map(sessionOf));
      if (!built.ok) return consoleError(reply, 'invalid_body', 'This cohort has no live build yet, so the Week 0 email cannot be filled in.');
      const due = week0DueAt(weeks);
      if (due === null) return consoleError(reply, 'invalid_body', 'Week 0 has no due date yet, so the Week 0 email cannot be filled in.');
      const [user] = await db.select({ name: users.name }).from(users).where(eq(users.email, to)).limit(1);
      const result = await send({
        template: 'week0-open',
        to,
        data: { firstName: firstNameOf(user?.name ?? ''), week0DueAt: due, liveBuildAt: built.schedule.session1At, liveBuildMins: built.schedule.session1Mins, ...week0Subject(cohort) },
      });
      await audit(req, {
        action: 'week0.test_send',
        outcome: result.ok ? 'ok' : 'failed',
        actor,
        target: { type: 'cohort', id: cohortId, label: cohort.name },
        after: { to, subject: result.subject, ok: result.ok },
      });
      if (!result.ok) return consoleError(reply, 'ops_unavailable', 'The Week 0 email was not sent.');
      return reply.send({ ok: true, subject: result.subject });
    },
  );
}
