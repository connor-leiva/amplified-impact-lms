// GET /api/course: the Amplified AI Accelerator's pages, for a plan that opens them (D-110).
//
//   200 { open: true, prelaunch, course, sessions }  an AI Accelerator buyer or their teammate, in the
//                                          course or its pre-launch preview, or staff (preview: true)
//   403 { open: false, paused, error }     a two-pay buyer whose second payment failed, until it's paid (D-143)
//   403 { open: false, upcoming, opensAt, error }  a buyer before the preview (or, with none, the first
//                                          live build, D-153): the screen shows the pre-launch welcome
//   403 { open: false, error }             any other learner: no plan, or a plan that is not the course
//   401                                    not signed in (`requireSession`)
//
// The course's words live in the database (D-173: the cohort's `course` and each week module's) and
// reach the browser only through this route, so the course is not readable in the public JavaScript
// bundle. D-175: each week opens on its own date, from data (Published, or Scheduled with its Opens,
// in the Module Builder): an open week comes whole, with its kit; a locked one comes as the outline
// shows it (title, question, outcome, when it opens) and nothing else. Staff see every week whole. The
// live sessions keep their own date-gated join window.
//
//   503 { open: false, error }             the database holds no course yet (the seed hasn't run)
//
// `sessions` are the cohort's sessions as the database holds them, so a session staff move shows its
// new time on the course page too. Never the Zoom URL: that comes only from the join route, inside its
// window, exactly as for the portal.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { NOT_IN_PLAN, acceleratorPaused } from '@ai/core/accelerator';
import { courseFor, courseSessions } from '@ai/core/course';
import { courseUpcoming } from '@ai/core/release';
import type { CourseEntry } from '@ai/core/release';
import { requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { courseEntryFor, plansForLearner, releaseOf } from '../lib/course-access';
import { clock } from '../lib/clock';

export const COURSE_PATH = '/api/course';
// D-186: core's, so a course week's step a plan without the course asks for is refused in the same words.
export { NOT_IN_PLAN };
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
    const now = clock.now();
    let entry: CourseEntry | 'staff' = 'staff';
    if (actor.kind === 'learner') {
      // D-175: a learner enters the course when it opens for their plan (D-153), or before that once the
      // cohort's pre-launch preview opens. Each week then opens on its own date.
      const plans = await plansForLearner(db, actor.userId);
      const release = await releaseOf(db);
      // D-202: a test account's early access is part of this entry, so weeks open before their dates.
      entry = await courseEntryFor(db, actor.userId, now);
      if (!entry.open) {
        if (acceleratorPaused(plans, now)) return reply.code(403).send({ open: false, paused: true, error: PAUSED });
        const opensAt = courseUpcoming(plans, now, release);
        if (opensAt !== null) return reply.code(403).send({ open: false, upcoming: true, opensAt, error: NOT_YET });
        return reply.code(403).send({ open: false, error: NOT_IN_PLAN });
      }
    }
    const snapshot = await loadDb(db);
    const course = courseFor(snapshot, now, entry);
    if (!course) return reply.code(503).send({ open: false, error: NOT_LOADED });
    return reply.code(200).send({
      open: true,
      preview: entry === 'staff',
      // D-175: the learner is in the pre-launch preview (Week 0 open, the rest locked with their dates).
      prelaunch: entry !== 'staff' && entry.preview,
      course,
      sessions: courseSessions(snapshot),
      // D-175: the learner-facing copy strings the page needs (what a locked week says, the preview line).
      copy: Object.fromEntries((snapshot.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
    });
  });
}
