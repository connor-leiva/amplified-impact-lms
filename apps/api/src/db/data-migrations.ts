// One-time data steps (D-175): the deploy's curriculum ensure (`db:curriculum:ensure`) runs each step
// here once, by id, after ensure itself. A step changes only rows still as the seed left them; a row
// staff changed in the builder is left alone and named in the step's summary, for the PM to finish in
// the builder. Each change writes one audit row (the system, `curriculum.migrate`); the step's row in
// `data_migrations` records that it ran, what it changed and what it skipped, so it never runs twice.
//
// Under the same advisory lock every mutation takes, in one transaction with its audit rows: a step
// that fails writes nothing and runs again on the next deploy.
//
// The steps are seed data (`packages/core/seed/`), which this file, like the seed CLI, may import.

import { sql } from 'drizzle-orm';
import type { Db } from '@ai/core';
import { CONTENT_V2, planContentV2 } from '@ai/core/seed/content-v2';
import { COPY_V1, planCopyV1 } from '@ai/core/seed/copy-v1';
import { COPY_V2, planCopyV2 } from '@ai/core/seed/copy-v2';
import { COPY_V3, planCopyV3 } from '@ai/core/seed/copy-v3';
import { GLOSSARY_V1, planGlossaryV1 } from '@ai/core/seed/glossary-v1';
import { INTAKE_V1, planIntakeV1 } from '@ai/core/seed/intake-v1';
import { INTAKE_REQUIRED_V1, planIntakeRequiredV1 } from '@ai/core/seed/required-v1';
import { STACK_V1, planStackV1 } from '@ai/core/seed/stack-v1';
import { PROMISE_V1, planPromiseV1 } from '@ai/core/seed/promise-v1';
import { UNSHOWN_V1, planUnshownV1 } from '@ai/core/seed/unshown-v1';
import { FIVE_WORDS_V1, planFiveWordsV1 } from '@ai/core/seed/five-words-v1';
import { START_HERE_V1, planStartHereV1 } from '@ai/core/seed/start-here-v1';
import type { DataSkip, DataStepOutcome } from '@ai/core/seed/data-step';
import { RELEASE_PLAN_V1, planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import { WEEKS_1_2_V1, planWeeks12V1 } from '@ai/core/seed/weeks-1-2-steps-v1';
import { SEAT_CARD_ONE_COPY_V1, planSeatCardOneCopyV1 } from '@ai/core/seed/seat-card-one-copy-v1';
import { audit } from '../console/audit';
import type { Database } from './client';
import { loadDb, persistDiff } from './io';
import { dataMigrations } from './schema';

export interface DataMigration {
  id: string;
  /** What it does, in one line, for the deploy log and the audit rows' reason. */
  describe: string;
  plan(db: Db): DataStepOutcome;
}

/** Every step, in the order they run. A step's id never changes once it has shipped. */
export const DATA_MIGRATIONS: readonly DataMigration[] = [
  {
    id: RELEASE_PLAN_V1,
    describe: 'Connor’s Nov 17 release plan: each week opens at its live build, Week 0 due Nov 30 (D-175)',
    plan: planReleaseV1,
  },
  {
    id: COPY_V1,
    describe: 'The copy strings D-175 adds: what a locked week says, and the pre-launch preview line',
    plan: planCopyV1,
  },
  {
    id: CONTENT_V2,
    describe: 'Connor’s Nov 17 Build Spec: the new Weeks 0 to 3, their sessions, and the data pack and practice set retired (D-176)',
    plan: planContentV2,
  },
  {
    id: COPY_V2,
    describe: 'Connor’s Nov 18 Team Plan window: its words as copy strings the builder edits (D-187)',
    plan: planCopyV2,
  },
  {
    id: COPY_V3,
    describe: 'The Week kit label for a skill a step links before its Library page exists (D-189)',
    plan: planCopyV3,
  },
  {
    id: GLOSSARY_V1,
    describe: 'The Accelerator glossary, set only when the course has none (D-193)',
    plan: planGlossaryV1,
  },
  {
    id: START_HERE_V1,
    describe: 'Week 0 Start Here, set only when that week has none (D-195)',
    plan: planStartHereV1,
  },
  {
    id: INTAKE_V1,
    describe: 'Week 0 intake, set only when that week has none (D-196)',
    plan: planIntakeV1,
  },
  {
    id: STACK_V1,
    describe: 'Week 0 stack card, set only when that week has none (D-197)',
    plan: planStackV1,
  },
  {
    id: PROMISE_V1,
    describe: 'The retired promise, a second copy of each week’s outcome that nothing showed, cleared (D-220)',
    plan: planPromiseV1,
  },
  {
    id: UNSHOWN_V1,
    describe: 'The old setup order and each kit skill’s use line, which no learner page draws, cleared (D-221)',
    plan: planUnshownV1,
  },
  {
    id: FIVE_WORDS_V1,
    describe: 'Week 0 step 2: Know these five words opens its definitions in the task, not in a table under it (D-223)',
    plan: planFiveWordsV1,
  },
  {
    id: INTAKE_REQUIRED_V1,
    describe: 'Week 0 intake: the six required questions, set only when none is marked (D-229)',
    plan: planIntakeRequiredV1,
  },
  {
    id: WEEKS_1_2_V1,
    describe: 'Weeks 1 and 2: Connor’s approved step bodies on both paths and the week-level changes, once, only where the seed is untouched (D-235)',
    plan: (db) => planWeeks12V1(db),
  },
  {
    id: SEAT_CARD_ONE_COPY_V1,
    describe: 'Weeks 1 and 2: the Seat Card’s rows to Connor’s approved words where untouched, and step 6’s Seat Card table drawn from the card, once (D-240)',
    plan: planSeatCardOneCopyV1,
  },
];

export interface DataMigrationReport {
  id: string;
  describe: string;
  changed: number;
  skipped: DataSkip[];
}

/**
 * Run every step that hasn't run yet, in order, and report each. Returns nothing to report when every
 * step has run before. `now` stamps the step's row; `steps` is for tests.
 */
export async function applyDataMigrations(db: Database, now: number, steps: readonly DataMigration[] = DATA_MIGRATIONS): Promise<DataMigrationReport[]> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(42)`);
    const done = new Set((await tx.select({ id: dataMigrations.id }).from(dataMigrations)).map((r) => r.id));
    const pending = steps.filter((s) => !done.has(s.id));
    if (!pending.length) return [];
    const before = await loadDb(tx);
    let after = before;
    const reports: DataMigrationReport[] = [];
    for (const step of pending) {
      const out = step.plan(after);
      after = out.db;
      for (const c of out.changes) {
        await audit(
          null,
          {
            action: 'curriculum.migrate',
            outcome: 'ok',
            actor: { source: 'system' },
            target: c.target,
            before: c.before,
            after: c.after,
            reason: step.describe,
          },
          tx,
        );
      }
      await tx.insert(dataMigrations).values({ id: step.id, ranAt: now, summary: { changes: out.changes.map((c) => c.target.id), skipped: out.skipped } });
      reports.push({ id: step.id, describe: step.describe, changed: out.changes.length, skipped: out.skipped });
    }
    await persistDiff(tx, before, after);
    return reports;
  });
}
