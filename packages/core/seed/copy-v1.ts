// SEED, NOT RUNTIME (D-175). The copy strings D-175 adds, as a one-time data step for a database that
// already has its copy strings (ensure only fills an empty table, so production's would never gain
// them). It inserts each missing key, as the seed writes it, and never changes or brings back a key
// that is there. Runtime code may not import this file.
//
// Pure: no clock, no random source.

import type { CopyString, Db } from '../src/types';
import { SEED_COPY } from './curriculum';
import type { DataChange, DataStepOutcome } from './data-step';

/** The step's id, recorded in `data_migrations` once it has run. */
export const COPY_V1 = '2026-11-17-copy-strings';

/** The keys this step adds when they are missing. */
export const COPY_V1_KEYS: readonly string[] = ['locked.opens', 'course.prelaunch'];

export function planCopyV1(db: Db): DataStepOutcome {
  const have = new Set((db.copy ?? []).map((c) => c.key));
  const add: CopyString[] = SEED_COPY.filter((c) => COPY_V1_KEYS.includes(c.key) && !have.has(c.key)).map((c) => ({ ...c }));
  const changes: DataChange[] = add.map((c) => ({ target: { type: 'copy', id: c.key, label: c.key }, before: null, after: { audience: c.audience, length: c.value.length } }));
  return { db: add.length ? { ...db, copy: [...(db.copy ?? []), ...add] } : db, changes, skipped: [] };
}
