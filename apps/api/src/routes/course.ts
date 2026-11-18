// GET /api/course: the Amplified AI Accelerator's pages, for a plan that opens them (D-110).
//
//   200 { open: true, course, sessions }   an AI Accelerator buyer or their teammate, or staff (preview)
//   403 { open: false, paused, error }     a two-pay buyer whose second payment failed, until it's paid (D-143)
//   403 { open: false, upcoming, opensAt, error }  a buyer before the first live build (D-153): the screen
//                                          shows the pre-launch welcome, and the course opens at `opensAt`
//   403 { open: false, error }             any other learner: no plan, or a plan that is not the course
//   401                                    not signed in (`requireSession`)
//
// The course's words live in the database (D-173: the cohort's `course` and each week module's) and
// reach the browser only through this route, so the course is not readable in the public JavaScript
// bundle. Week 0 and all eight weeks open together (no drip); the live sessions keep their own
// date-gated join window.
//
//   503 { open: false, error }             the database holds no course yet (the seed hasn't run)
//
// `sessions` are the cohort's sessions as the database holds them, so a session staff move shows its
// new time on the course page too. Never the Zoom URL: that comes only from the join route, inside its
// window, exactly as for the portal.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { courseFromSnapshot, courseSessions } from '@ai/core/course';
import { requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { acceleratorAccess, acceleratorPausedFor, acceleratorUpcomingFor } from '../lib/course-access';
import { clock } from '../lib/clock';

export const COURSE_PATH = '/api/course';
export const NOT_IN_PLAN = 'The AI Accelerator isn’t in your plan.';
/** D-143: closed only until the second of two payments goes through. */
export const PAUSED = 'Your AI Accelerator is paused until your payment goes through.';
/** D-153: bought, and opening at the first live build. */
export const NOT_YET = 'Your AI Accelerator opens at the first live build.';
/** D-173: the course is data, and this database holds none yet. */
export const NOT_LOADED = 'The AI Accelerator’s course isn’t loaded yet.';

export function registerCourseRoute(app: FastifyInstance): void {
  app.get(COURSE_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    const db = getDb();
    reply.header('cache-control', 'no-store');
    if (actor.kind === 'learner' && !(await acceleratorAccess(db, actor.userId, clock.now()))) {
      if (await acceleratorPausedFor(db, actor.userId, clock.now())) return reply.code(403).send({ open: false, paused: true, error: PAUSED });
      const opensAt = await acceleratorUpcomingFor(db, actor.userId, clock.now());
      if (opensAt !== null) return reply.code(403).send({ open: false, upcoming: true, opensAt, error: NOT_YET });
      return reply.code(403).send({ open: false, error: NOT_IN_PLAN });
    }
    const snapshot = await loadDb(db);
    const course = courseFromSnapshot(snapshot);
    if (!course) return reply.code(503).send({ open: false, error: NOT_LOADED });
    return reply.code(200).send({ open: true, preview: actor.kind === 'staff', course, sessions: courseSessions(snapshot) });
  });
}
