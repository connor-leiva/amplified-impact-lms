// The demo seed with the Accelerator course as a deploy stores it: the curriculum seed (`ensureCurriculum`), then
// every one-time data step the deploy runs after it (`DATA_MIGRATIONS`), in order. So Week 0 is the stored Week 0:
// its Due (Mon, Nov 30, 12:00 PM MT, the release plan's), its title, its eight steps and its baseline table.
import { seedForDatabase } from '@ai/core';
import type { Db } from '@ai/core';
import { acceleratorModuleId } from '@ai/core/accelerator';
import { ensureCurriculum } from '@ai/core/seed/curriculum';
import { DATA_MIGRATIONS } from '../src/db/data-migrations';

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
