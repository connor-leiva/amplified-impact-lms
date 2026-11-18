// SEED, NOT RUNTIME (D-175). The shape of a one-time data step: a pure plan over a snapshot that
// changes only what is still as the seed left it, and says what it left for the PM. The deploy's
// curriculum ensure runs each step once (`apps/api/src/db/data-migrations.ts`), writing one audit row
// per change. Types only.

import type { Db } from '../src/types';

/** One thing a step changed: what (for the audit row's target), and before and after. */
export interface DataChange {
  target: { type: string; id: string; label: string };
  before: unknown;
  after: unknown;
}

/** One thing a step left as it is, and why: a row staff already changed. */
export interface DataSkip {
  id: string;
  reason: string;
}

export interface DataStepOutcome {
  db: Db;
  changes: DataChange[];
  skipped: DataSkip[];
}
