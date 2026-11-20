// SEED, NOT RUNTIME (D-220). The first content seed kept each week's spec promise in `course.promise`, a
// second copy of the outcome line that learners read from `outcome`. Nothing has read it since, and the
// builder never showed it, so this step clears it from every stored module. The outcome is not touched:
// Week 0's promise differed from its outcome, and Week 0 keeps the outcome learners already see. A week
// staff edited in the builder had its promise rewritten to match its outcome (D-214), so clearing it loses
// nothing there either, and no row is skipped.

import { withoutPromise } from '../src/admin-actions';
import type { Db } from '../src/types';
import type { DataChange, DataStepOutcome } from './data-step';

export const PROMISE_V1 = '2026-11-20-promise-retired';

export function planPromiseV1(db: Db): DataStepOutcome {
  const changes: DataChange[] = [];
  const modules = db.modules.map((m) => {
    if (m.course?.promise === undefined) return m;
    changes.push({ target: { type: 'module', id: m.id, label: m.name }, before: { promise: m.course.promise }, after: { promise: null } });
    return withoutPromise(m);
  });
  return { db: changes.length ? { ...db, modules } : db, changes, skipped: [] };
}
