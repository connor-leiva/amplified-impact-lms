// The demo seed with the Accelerator course as a deploy stores it: the curriculum seed (`ensureCurriculum`), then
// every one-time data step the deploy runs after it (`DATA_MIGRATIONS`), in order. So Week 0 is the stored Week 0:
// its Due (Mon, Nov 30, 12:00 PM MT, the release plan's), its title, its eight steps and its baseline table.
import { eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import type { CohortWeek, Db } from '@ai/core';
import { acceleratorModuleId } from '@ai/core/accelerator';
import { ensureCurriculum } from '@ai/core/seed/curriculum';
import type { Database } from '../src/db/client';
import { DATA_MIGRATIONS } from '../src/db/data-migrations';
import { cohorts, modules } from '../src/db/schema';

export function liveWithCourse(): Db {
  let db = ensureCurriculum(seedForDatabase('live'));
  for (const step of DATA_MIGRATIONS) db = step.plan(db).db;
  return db;
}

/**
 * The demo seed plus Week 0 alone, as the course stores it, but without its intake form: enough for the two test sends
 * to fill in Week 0's Due, title and baseline, and nothing a route that reads the intake would answer differently.
 */
export function liveWithWeek0(): Db {
  const db = seedForDatabase('live');
  const week0 = liveWithCourse().modules.find((m) => m.id === acceleratorModuleId(0))!;
  const { intake: _intake, ...course } = week0.course!;
  db.modules.push({ ...week0, course });
  return db;
}

/**
 * A cohort's Week 0 Due, changed as staff change it since D-255: in Cohort › Settings › Dates and Release
 * (`saveCohortRun`), which writes the cohort's run and, for the default cohort, the same date onto Week 0's module (the
 * week builder no longer edits a course week's Due). The emails read it through the cohort's run (R-5 Phase 4, D-261).
 */
export async function setWeek0Due(d: Database, cohortId: string, dueAt: number | null): Promise<void> {
  const week0 = acceleratorModuleId(0);
  const [co] = await d.select({ run: cohorts.run }).from(cohorts).where(eq(cohorts.id, cohortId));
  const run = co?.run as CohortWeek[] | null | undefined;
  if (run) await d.update(cohorts).set({ run: run.map((w) => (w.moduleId === week0 ? { ...w, dueAt } : w)) }).where(eq(cohorts.id, cohortId));
  await d.update(modules).set({ dueAt }).where(eq(modules.id, week0));
}
