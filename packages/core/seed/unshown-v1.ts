// SEED, NOT RUNTIME (D-221). The first content seed wrote two course fields that no learner page draws and the
// builder never showed: the old course page's Setup Order (`course.setup`, replaced by the week's steps, parity
// K-5) and a kit skill's one-line use (`course.skills[].use`; learners read the skill's own Library page).
// That page no longer reaches learners, so this step clears both from every stored module. No other word
// changes, and no row is skipped: neither field could be edited in the builder, so each is as the seed left it.

import { courseWithoutRetired } from '../src/course-retired';
import type { Db } from '../src/types';
import type { DataChange, DataStepOutcome } from './data-step';

export const UNSHOWN_V1 = '2026-11-20-unshown-course-fields';

export function planUnshownV1(db: Db): DataStepOutcome {
  const changes: DataChange[] = [];
  const modules = db.modules.map((m) => {
    const c = m.course;
    if (!c) return m;
    const uses = c.skills.filter((k) => k.use !== undefined).length;
    if (c.setup === undefined && uses === 0) return m;
    changes.push({ target: { type: 'module', id: m.id, label: m.name }, before: { setup: c.setup?.length ?? 0, skillUses: uses }, after: { setup: null, skillUses: 0 } });
    // The promise went in its own step (D-220); this one leaves whatever else the course holds as it is.
    const { promise, ...rest } = c;
    const cleared = courseWithoutRetired(rest);
    return { ...m, course: promise === undefined ? cleared : { ...cleared, promise } };
  });
  return { db: changes.length ? { ...db, modules } : db, changes, skipped: [] };
}
