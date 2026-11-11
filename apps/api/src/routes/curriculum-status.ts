// GET /api/health/curriculum: is the AI Accelerator's curriculum in this database? (D-121)
//
// The deploy's pre-deploy command applies it once (`db:curriculum:ensure`, D-110, docs/LAUNCH.md § 6),
// and Railway's logs do not always show that step's output. This answers the question from outside,
// with no session and no secret: counts only. It reads three tables and only the course's own rows:
// cohort `dec26`, the nine course modules and that cohort's sessions. It never reads users, teams,
// progress, staff, orders or plans, and it returns no names, dates, links or text. The same facts
// (one cohort, nine weeks, sixteen sessions) are already public on /team-build.
//
// Not `/api/health` itself: that is Railway's healthcheck and deliberately touches nothing, so a slow
// database can never fail a deploy through it.

import type { FastifyInstance } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
import { ACCELERATOR_COHORT_ID, ACCELERATOR_MODULE_IDS, acceleratorSessions } from '@ai/core/accelerator';
import { getDb } from '../db/client';
import { cohorts, modules, sessions } from '../db/schema';

export const CURRICULUM_STATUS_PATH = '/api/health/curriculum';

export interface CurriculumStatus {
  /** All of the below are what the curriculum puts in place. */
  ok: boolean;
  cohort: boolean;
  /** Of the nine course modules: how many exist, and how many of those are published. */
  modules: number;
  published: number;
  /** Cohort `dec26`'s sessions: the eight builds and the eight office hours. */
  sessions: number;
  expected: { modules: number; sessions: number };
}

export async function curriculumStatus(): Promise<CurriculumStatus> {
  const db = getDb();
  const ids = [...ACCELERATOR_MODULE_IDS];
  const [cohortRows, moduleRows, sessionRows] = await Promise.all([
    db.select({ id: cohorts.id }).from(cohorts).where(eq(cohorts.id, ACCELERATOR_COHORT_ID)),
    db.select({ id: modules.id, status: modules.status }).from(modules).where(inArray(modules.id, ids)),
    db.select({ id: sessions.id }).from(sessions).where(eq(sessions.cohortId, ACCELERATOR_COHORT_ID)),
  ]);
  const expected = { modules: ids.length, sessions: acceleratorSessions().length };
  const published = moduleRows.filter((m) => m.status === 'published').length;
  return {
    ok: cohortRows.length === 1 && moduleRows.length === expected.modules && published === expected.modules && sessionRows.length === expected.sessions,
    cohort: cohortRows.length === 1,
    modules: moduleRows.length,
    published,
    sessions: sessionRows.length,
    expected,
  };
}

export function registerCurriculumStatusRoute(app: FastifyInstance): void {
  app.get(CURRICULUM_STATUS_PATH, async (_req, reply) => reply.header('cache-control', 'no-store').send(await curriculumStatus()));
}
