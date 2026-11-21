// SEED, NOT RUNTIME (D-229, B-16). The Week 0 intake's six required questions, as Connor settled them on Nov 20,
// 2026 ("Go with what you made required"): name, team, operator, ai, plan and google. A one-time data step marks
// them only when no question of the intake is marked yet, so a choice made in the builder is never overwritten.
// Runtime code may not import this file.

import type { CourseIntake } from '../src/course-types';
import type { Db } from '../src/types';
import type { DataStepOutcome } from './data-step';
import { WEEK0_MODULE_ID } from './start-here-v1';

export const INTAKE_REQUIRED_V1 = '2026-11-21-intake-required';

/** The six, as `handoff/lms-v3/src/forms/week-0-intake.json` marks them. */
export const WEEK0_REQUIRED: readonly string[] = ['name', 'team', 'operator', 'ai', 'plan', 'google'];

export function planIntakeRequiredV1(db: Db): DataStepOutcome {
  const m = db.modules.find((x) => x.id === WEEK0_MODULE_ID);
  const intake: CourseIntake | undefined = m?.course?.intake;
  if (!m || !m.course || !intake) return { db, changes: [], skipped: [{ id: `${WEEK0_MODULE_ID}.course.intake`, reason: 'the week has no intake in this database' }] };
  const questions = intake.sections.flatMap((s) => s.questions);
  if (questions.some((q) => q.required !== undefined))
    return { db, changes: [], skipped: [{ id: `${WEEK0_MODULE_ID}.course.intake`, reason: 'required questions were already chosen in the builder' }] };
  const absent = WEEK0_REQUIRED.filter((id) => !questions.some((q) => q.id === id));
  const next: CourseIntake = {
    ...intake,
    sections: intake.sections.map((s) => ({ ...s, questions: s.questions.map((q) => (WEEK0_REQUIRED.includes(q.id) ? { ...q, required: true } : q)) })),
  };
  return {
    db: { ...db, modules: db.modules.map((x) => (x.id === m.id ? { ...x, course: { ...m.course!, intake: next } } : x)) },
    changes: [{ target: { type: 'module', id: m.id, label: m.name }, before: { required: [] }, after: { required: WEEK0_REQUIRED.filter((id) => !absent.includes(id)) } }],
    skipped: absent.map((id) => ({ id: `${WEEK0_MODULE_ID}.course.intake.${id}`, reason: 'no question with that id' })),
  };
}
