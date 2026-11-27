// GET /api/health/curriculum: is the AI Accelerator's curriculum in this database? (D-121, D-173)
//
// The deploy's pre-deploy command makes sure of it (`db:curriculum:ensure`, D-110, docs/LAUNCH.md § 6),
// and Railway's logs do not always show that step's output. This answers the question from outside,
// with no session and no secret: counts only. It reads three tables and only the course's own rows:
// the cohorts that are not archived, the course's modules of kind `week` and the sessions. It never reads
// users, teams, progress, staff, orders or plans, and it returns no names, dates, links or text.
//
// THE EXPECTED COUNTS ARE THE COHORTS' OWN DATA (D-173), never constants: a week module for Week 0 and
// for each of a cohort's `weeks` (the longest cohort's), each published, and every session a week's live-build
// or office-hours page names, in whichever cohort it is. The weeks counted are the program's course weeks
// (`isCourseWeek`). R-5 Phase 6 (D-265): the program's, read across every cohort that runs it, no longer
// December's by id; with December alone, as production has it, every count is the one it was.
//
// Not `/api/health` itself: that is Railway's healthcheck and deliberately touches nothing, so a slow
// database can never fail a deploy through it.
//
// D-221: two more counts, so a deploy's one-time data steps can be confirmed from outside too: how many have
// run (rows of `data_migrations`, ids only, never their reports), and how many course weeks still hold a
// field those steps retire (the promise, the old setup order, a kit skill's use line). Still counts only.

import type { FastifyInstance } from 'fastify';
import { eq, isNull } from 'drizzle-orm';
import { isCourseWeek } from '@ai/core/accelerator';
import { hasRetired } from '@ai/core/course-retired';
import type { ModuleCourse } from '@ai/core/course-types';
import { getDb } from '../db/client';
import { cohorts, dataMigrations, modules, sessions } from '../db/schema';

export const CURRICULUM_STATUS_PATH = '/api/health/curriculum';

export interface CurriculumStatus {
  /** All of the below are what the cohorts' data says should be in place. */
  ok: boolean;
  /** A cohort runs the program (one that is not archived). */
  cohort: boolean;
  /** The cohort's week modules: how many exist, and how many of those are published. */
  modules: number;
  published: number;
  /** Of the sessions the weeks' pages name, how many exist. */
  sessions: number;
  expected: { modules: number; sessions: number };
  /** D-221: how many one-time data steps have run on this database. */
  steps: number;
  /** D-221: how many of the course's weeks still hold a retired field. 0 once the steps have run. */
  retired: number;
}

/** The session ids a week's live-build and office-hours pages name. */
const namedSessions = (course: ModuleCourse | null): string[] =>
  course ? [course.liveBuild?.sessionId, course.officeHours?.sessionId].filter((id): id is string => !!id) : [];

export async function curriculumStatus(): Promise<CurriculumStatus> {
  const db = getDb();
  const [cohortRows, weekRows, sessionRows, stepRows] = await Promise.all([
    db.select({ id: cohorts.id, weeks: cohorts.weeks }).from(cohorts).where(isNull(cohorts.archivedAt)),
    db.select({ id: modules.id, status: modules.status, course: modules.course }).from(modules).where(eq(modules.kind, 'week')),
    db.select({ id: sessions.id }).from(sessions),
    db.select({ id: dataMigrations.id }).from(dataMigrations),
  ]);
  // The weeks the course page shows (`courseWeekModules`): the course's own modules. A copy made with
  // the builder's Duplicate carries `kind: 'week'` too, but it is not in the course, so it is not counted.
  const moduleRows = weekRows.filter((m) => isCourseWeek(m.id));
  const cohort = cohortRows.length > 0;
  const named = new Set(moduleRows.flatMap((m) => namedSessions(m.course as ModuleCourse | null)));
  const have = new Set(sessionRows.map((s) => s.id));
  const expected = { modules: cohort ? Math.max(...cohortRows.map((c) => (c.weeks ?? 0) + 1)) : 0, sessions: named.size };
  const published = moduleRows.filter((m) => m.status === 'published').length;
  const sessionsFound = [...named].filter((id) => have.has(id)).length;
  return {
    ok: cohort && expected.modules > 0 && moduleRows.length === expected.modules && published === expected.modules && sessionsFound === expected.sessions,
    cohort,
    modules: moduleRows.length,
    published,
    sessions: sessionsFound,
    expected,
    steps: stepRows.length,
    retired: moduleRows.filter((m) => m.course && hasRetired(m.course as ModuleCourse)).length,
  };
}

export function registerCurriculumStatusRoute(app: FastifyInstance): void {
  app.get(CURRICULUM_STATUS_PATH, async (_req, reply) => reply.header('cache-control', 'no-store').send(await curriculumStatus()));
}
