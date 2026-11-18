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
import { COPY_V1, planCopyV1 } from '@ai/core/seed/copy-v1';
import type { DataSkip, DataStepOutcome } from '@ai/core/seed/data-step';
import { RELEASE_PLAN_V1, planReleaseV1 } from '@ai/core/seed/release-plan-v1';
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
