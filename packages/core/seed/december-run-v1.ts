// SEED, NOT RUNTIME (D-255, R-5 Phase 3). The one December rewrite the admin restructure names
// (handoff/admin-mockup/ADMIN-RESTRUCTURE-SPEC.md, Phase 3): a one-time data step writes December's run from its own
// week modules, so its dates can be edited on the cohort (Cohort › Settings › Dates and Release) like any other's.
//
// WHAT IT WRITES. `cohorts.run` on `dec26`, one entry per course week module, in week order: its module id, its week
// number (`course.week`), when it opens (the module's own `opens`, for a scheduled week, or a draft's; null for a
// published week, which is open with the course) and when it is due (the module's own `due_at`). Nothing else: the
// modules keep their own `opens`, `due_at` and status (PLAN.md, phase notes), and stay what an absent run reads.
//
// EQUAL BY CONSTRUCTION, AND CHECKED. With the run written, `cohortView` hands December's weeks out seen through it. The
// step writes the run only when that view is every one of December's week modules exactly as it was, field for field;
// otherwise it writes nothing and names the week that would have moved, for the PM (D-175's rule: a row staff changed
// is left alone and named). `apps/api/test/december.test.ts` runs every data step, this one included, and is its
// before-and-after equality test: every December output is byte-identical with the run written.
//
// ROLLBACK. `undoDecemberRunV1` clears the run (`run = null`), which `cohortView` already reads as "the curriculum's
// weeks", so every read is today's again. In SQL: `update cohorts set run = null where id = 'dec26'`.
//
// Pure: no clock, no random source.

import { DEFAULT_COHORT_ID, isCourseWeek } from '../src/accelerator';
import { cohortView } from '../src/cohort-run';
import type { AIEmployee, CohortWeek, Db } from '../src/types';
import type { DataChange, DataSkip, DataStepOutcome } from './data-step';

/** The step's id, recorded in `data_migrations` once it has run. */
export const DECEMBER_RUN_V1 = '2026-11-26-december-run';

const isWeekModule = (m: AIEmployee): boolean => m.kind === 'week' && m.course !== undefined && isCourseWeek(m.id);

/** December's run, read from its week modules as they are: what `cohortRun` reads for it today, drafts included. */
export function decemberRunOf(db: Pick<Db, 'modules'>): CohortWeek[] {
  return db.modules
    .filter(isWeekModule)
    .slice()
    .sort((a, b) => a.course!.week - b.course!.week || a.id.localeCompare(b.id))
    .map((m) => ({
      moduleId: m.id,
      n: m.course!.week,
      opensAt: m.status === 'published' ? null : m.opens,
      dueAt: m.dueAt ?? null,
    }));
}

/** The first of December's weeks the run would change, and how, or null when the view is every module exactly. */
export function decemberRunDrift(db: Db, run: readonly CohortWeek[]): string | null {
  const withRun: Db = { ...db, cohorts: db.cohorts.map((c) => (c.id === DEFAULT_COHORT_ID ? { ...c, run: [...run] } : c)) };
  const view = cohortView(withRun, DEFAULT_COHORT_ID);
  if (new Set(run.map((w) => w.n)).size !== run.length) return 'two weeks have the same number';
  for (const m of db.modules.filter(isWeekModule)) {
    const seen = view.modules.find((x) => x.id === m.id);
    if (!seen) return `${m.id} would leave the course`;
    if (JSON.stringify(seen) !== JSON.stringify(m)) {
      const keys = new Set([...Object.keys(m), ...Object.keys(seen)]);
      const moved = [...keys].filter(
        (k) => JSON.stringify((m as unknown as Record<string, unknown>)[k]) !== JSON.stringify((seen as unknown as Record<string, unknown>)[k]),
      );
      return `${m.id} would read differently through the run (${moved.join(', ')})`;
    }
  }
  return null;
}

/** December's run, written once, only where it reads exactly as the modules do. */
export function planDecemberRunV1(db: Db): DataStepOutcome {
  const changes: DataChange[] = [];
  const skipped: DataSkip[] = [];
  const co = db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID);
  if (!co) {
    skipped.push({ id: DEFAULT_COHORT_ID, reason: 'not in this database' });
    return { db, changes, skipped };
  }
  if (co.run) {
    skipped.push({ id: co.id, reason: 'its run is already written' });
    return { db, changes, skipped };
  }
  const run = decemberRunOf(db);
  if (!run.length) {
    skipped.push({ id: co.id, reason: 'the database holds no course weeks' });
    return { db, changes, skipped };
  }
  const drift = decemberRunDrift(db, run);
  if (drift) {
    skipped.push({ id: co.id, reason: `left as it is: ${drift}` });
    return { db, changes, skipped };
  }
  changes.push({ target: { type: 'cohort', id: co.id, label: co.name }, before: { run: null }, after: { run } });
  return { db: { ...db, cohorts: db.cohorts.map((c) => (c.id === co.id ? { ...c, run } : c)) }, changes, skipped };
}

/** The rollback: December's run cleared, so every read is the curriculum's weeks again, as before the step. */
export function undoDecemberRunV1(db: Db): DataStepOutcome {
  const co = db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID);
  if (!co?.run) return { db, changes: [], skipped: [{ id: DEFAULT_COHORT_ID, reason: 'it has no run to clear' }] };
  const { run, ...rest } = co;
  return {
    db: { ...db, cohorts: db.cohorts.map((c) => (c.id === co.id ? rest : c)) },
    changes: [{ target: { type: 'cohort', id: co.id, label: co.name }, before: { run }, after: { run: null } }],
    skipped: [],
  };
}
