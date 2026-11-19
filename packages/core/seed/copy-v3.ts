// SEED, NOT RUNTIME (D-189). The label a Week kit uses when a step in that week links a Library skill
// whose page is not built yet ("In Step {n}"). Course settings, Copy strings, edits it. The step
// inserts the key when it is missing and never changes one that is there, so a word staff changed
// stays changed. It runs once (its id is recorded in `data_migrations`), so a key staff remove after
// that stays removed. Runtime code may not import this file. `{n}` is the step's number.
//
// Pure: no clock, no random source.

import type { CopyString, Db } from '../src/types';
import type { DataChange, DataStepOutcome } from './data-step';

/** The step's id, recorded in `data_migrations` once it has run. */
export const COPY_V3 = '2026-11-19-skill-in-step-copy';

/** What a linked skill says, and links, while its Library page is not built. `{n}` is the step number. */
export const SKILL_IN_STEP: CopyString = { key: 'skill.in_step', value: 'In Step {n}', audience: 'learner' };

export function planCopyV3(db: Db): DataStepOutcome {
  const have = new Set((db.copy ?? []).map((c) => c.key));
  if (have.has(SKILL_IN_STEP.key)) return { db, changes: [], skipped: [] };
  const add: CopyString = { ...SKILL_IN_STEP };
  const changes: DataChange[] = [{ target: { type: 'copy', id: add.key, label: add.key }, before: null, after: { audience: add.audience, length: add.value.length } }];
  return { db: { ...db, copy: [...(db.copy ?? []), add] }, changes, skipped: [] };
}
