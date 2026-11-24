// SEED, NOT RUNTIME (D-195). Week 0's Start Here card, Design Nov 18, 2026. A one-time data step sets
// it on accelerator-week-0 only when that week has no Start Here yet. It never overwrites one staff
// saved, and it never runs twice. The step list is not stored here: the card reads the week's steps.
// A change here reaches a new database only; a live one changes in the Week Builder (D-173, D-249).
// Runtime code may not import this file.
//
// Pure: no clock, no random source.

import type { StartHere } from '../src/course-types';
import type { Db } from '../src/types';
import type { DataStepOutcome } from './data-step';

/** The step's id, recorded in `data_migrations` once it has run. */
export const START_HERE_V1 = '2026-11-18-start-here';

export const WEEK0_MODULE_ID = 'accelerator-week-0';

/** The design's card. Title, subtitle, line, hint and the two totals. Not the steps. */
export const START_HERE: StartHere = {
  title: 'Start Here: Week 0',
  sub: 'Foundations: Set Up the Office',
  // D-249: Week 1 opens Sun, Nov 29 (the release plan), and the line names it. Was "before our first live
  // build on Wed, Dec 2, 2026"; the build stays on Dec 2.
  line: 'Eight steps get every team to the same starting line for Week 1, which opens Sun, Nov 29, 2026, 12:00 PM MT. Everything is due Mon, Nov 30, 2026, 12:00 PM MT.',
  hint: 'Start with Step 1. Steps 3 and 5 can run alongside the others.',
  totals: { owner: 'About 1 hr 30 min', operator: 'About 2 hr 15 min' },
};

/** Set Start Here on Week 0 when it has none. Every other week is left alone. */
export function planStartHereV1(db: Db): DataStepOutcome {
  const m = db.modules.find((x) => x.id === WEEK0_MODULE_ID);
  if (!m) return { db, changes: [], skipped: [{ id: WEEK0_MODULE_ID, reason: 'the week is not in this database' }] };
  if (!m.course) return { db, changes: [], skipped: [{ id: WEEK0_MODULE_ID, reason: 'the week has no course page in this database' }] };
  if (m.course.startHere !== undefined) return { db, changes: [], skipped: [{ id: `${WEEK0_MODULE_ID}.course.startHere`, reason: 'Start Here was already set in the builder' }] };
  const startHere: StartHere = { ...START_HERE, totals: { ...START_HERE.totals } };
  const course = { ...m.course, startHere };
  return {
    db: { ...db, modules: db.modules.map((x) => (x.id === m.id ? { ...x, course } : x)) },
    changes: [{ target: { type: 'module', id: m.id, label: m.name }, before: { startHere: false }, after: { startHere: true } }],
    skipped: [],
  };
}
