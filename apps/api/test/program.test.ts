// R-5 Phase 6 (D-265): the program record, against a real database. The data step runs once through the deploy's own
// runner, writes the program row and one audit row, and touches no cohort row; `GET /api/course` answers every viewer
// exactly as it did from December's row; Course Settings' save writes the program, audited, and learners read it; the
// rollback brings December's row back as the source; and a module save keeps a course week's dates.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Db } from '@ai/core';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { moduleVersion } from '@ai/core/module-version';
import { seedProduction } from '@ai/core/seed/curriculum';
import { PROGRAM_V1, planProgramV1, undoProgramV1 } from '@ai/core/seed/program-v1';
import { build } from '../src/app';
import type { App } from '../src/app';
import { DATA_MIGRATIONS, applyDataMigrations } from '../src/db/data-migrations';
import { persistDiff } from '../src/db/io';
import { auditLog, cohorts, dataMigrations, programs } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const NOW = MT('2026-11-28T12:00:00');

let handle: Database;
let app: App;

const get = async (who: string, url: string) =>
  app.inject({ method: 'GET', url, headers: { cookie: await app.signInAs(who) } });
const act = async (who: string, name: string, payload: unknown) =>
  app.inject({
    method: 'POST',
    url: `/api/admin/actions/${name}`,
    headers: { cookie: await app.signInAs(who), 'content-type': 'application/json' },
    payload: JSON.stringify(payload),
  });

/** Every step but this phase's: the database as production has it before this deploy. */
const BEFORE = DATA_MIGRATIONS.filter((s) => s.id !== PROGRAM_V1);

beforeAll(async () => {
  handle = await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  const db: Db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  db.staff.push({ id: 'st_support', name: 'Sam Support', email: 'sam@example.test', role: 'Support', last: null });
  await resetDatabase(db);
  await applyDataMigrations(handle, NOW, BEFORE);
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

describe(`the data step ${PROGRAM_V1}`, () => {
  it('runs once, writes the program row and one audit row, and no cohort row', async () => {
    const before = await handle.select().from(cohorts);
    const staffCourse = (await get('st_owner', '/api/course')).body;
    expect(await handle.select().from(programs)).toEqual([]);

    const reports = await applyDataMigrations(handle, NOW);
    expect(reports).toEqual([{ id: PROGRAM_V1, describe: expect.stringContaining('D-265'), changed: 1, skipped: [] }]);
    const rows = await handle.select().from(programs);
    expect(rows.map((r) => [r.id, r.name])).toEqual([['accelerator', 'Amplified AI Accelerator']]);
    const dec = before.find((c) => c.id === DEFAULT_COHORT_ID)!;
    expect(rows[0]!.course).toEqual(dec.course);
    expect(await handle.select().from(cohorts)).toEqual(before);
    const audits = (await handle.select().from(auditLog).where(eq(auditLog.targetType, 'program'))).map((r) => [
      r.action,
      r.targetId,
      r.outcome,
    ]);
    expect(audits).toEqual([['curriculum.migrate', 'accelerator', 'ok']]);
    expect((await handle.select().from(dataMigrations).where(eq(dataMigrations.id, PROGRAM_V1))).length).toBe(1);
    expect(await applyDataMigrations(handle, NOW)).toEqual([]);

    // What staff are handed is the same, byte for byte.
    expect((await get('st_owner', '/api/course')).body).toBe(staffCourse);
  });

  it('Course Settings saves the program, audited; learners and staff read it; December’s row is untouched', async () => {
    await applyDataMigrations(handle, NOW);
    const before = await handle.select().from(cohorts);
    const db = await loadDb();
    const course = structuredClone(db.programs![0]!.course!);
    course.intro.support = 'Ask in the Community first. For anything private, email the team.';
    const res = await act('st_owner', 'saveProgramCourse', { programId: 'accelerator', course });
    expect(res.statusCode, res.body).toBe(200);
    expect((await loadDb()).programs![0]!.course!.intro.support).toBe(
      'Ask in the Community first. For anything private, email the team.',
    );
    expect(await handle.select().from(cohorts)).toEqual(before);
    const got = await get('st_owner', '/api/course');
    expect(got.statusCode, got.body.slice(0, 300)).toBe(200);
    const staff = got.json() as { course: { intro: { support: string } } };
    expect(staff.course.intro.support).toBe('Ask in the Community first. For anything private, email the team.');
    const audits = (await handle.select().from(auditLog).where(eq(auditLog.action, 'program.course_save'))).map((r) => [
      r.targetType,
      r.targetId,
    ]);
    expect(audits).toEqual([['program', 'accelerator']]);
    // Support has no `curriculum`.
    expect((await act('st_support', 'saveProgramCourse', { programId: 'accelerator', course })).statusCode).toBe(403);
    // The draft schema is strict.
    expect(
      (await act('st_owner', 'saveProgramCourse', { programId: 'accelerator', course, cohortId: 'dec26' })).statusCode,
    ).toBe(400);
  });

  it('rolls back: with the row deleted, every read is December’s row’s again', async () => {
    const staffCourse = (await get('st_owner', '/api/course')).body;
    await applyDataMigrations(handle, NOW);
    const before = await loadDb();
    const undone = undoProgramV1(before);
    expect(undone.changes).toHaveLength(1);
    await persistDiff(handle, before, undone.db);
    expect(await handle.select().from(programs)).toEqual([]);
    expect((await get('st_owner', '/api/course')).body).toBe(staffCourse);
    // And the step could run again (its row in data_migrations deleted by hand, as its rollback says).
    expect(planProgramV1(await loadDb()).changes).toHaveLength(1);
  });

  it('a module save keeps a course week’s stored Due (#278’s open item)', async () => {
    const db = await loadDb();
    const w0 = db.modules.find((m) => m.id === 'accelerator-week-0')!;
    const res = await act('st_owner', 'saveBuilderModule', {
      draft: { ...w0, dueAt: MT('2027-03-01T12:00:00') },
      base: moduleVersion(w0),
    });
    expect(res.statusCode, res.body).toBe(200);
    expect((await loadDb()).modules.find((m) => m.id === 'accelerator-week-0')!.dueAt).toBe(w0.dueAt);
  });
});
