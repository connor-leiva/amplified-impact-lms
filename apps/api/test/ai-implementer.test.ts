// D-243: the operator is the AI Implementer, on the server. The deploy's preview reads what the pending steps would
// change and writes nothing; the step itself runs once and audits each record; and a team's intake answer saved in
// the old words reads, prints and re-saves as today's option without its stored row being rewritten.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { seedProduction } from '@ai/core/seed/curriculum';
import { AI_IMPLEMENTER_V1, PERSON_NOT_SOFTWARE, planAiImplementerV1 } from '@ai/core/seed/ai-implementer-v1';
import { WEEK0_INTAKE } from '@ai/core/seed/intake-v1';
import { WEEK0_MODULE_ID } from '@ai/core/seed/start-here-v1';
import { build } from '../src/app';
import type { App } from '../src/app';
import { applyDataMigrations, DATA_MIGRATIONS, previewDataMigrations } from '../src/db/data-migrations';
import { previewText } from '../src/db/data-steps-preview';
import { auditLog, dataMigrations, teamIntake, teams, users } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const NOW = '2026-11-24T16:00:00Z';
const OLD_ACCOUNT = "The operator's account (our default)";
const NEW_ACCOUNT = "The AI Implementer's account (our default)";

let handle: Database;
let app: App;

beforeAll(async () => {
  process.env.FIXED_NOW = NOW;
  handle = await testDatabase();
  app = await build({ logger: false });
});

afterAll(async () => {
  delete process.env.FIXED_NOW;
  await app?.close();
});

describe('the deploy’s preview and the step (D-243)', () => {
  it('previews every field the step would change, writes nothing, then the deploy runs it once with an audit row per record', { timeout: 180_000 }, async () => {
    await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
    // Production as it is before this deploy: every earlier step has run.
    await applyDataMigrations(handle, Date.parse(NOW), DATA_MIGRATIONS.slice(0, -1));
    const before = await loadDb();
    const ran = (await handle.select().from(dataMigrations)).length;

    const preview = await previewDataMigrations(handle);
    expect(preview.map((p) => p.id)).toEqual([AI_IMPLEMENTER_V1]);
    expect(preview[0]!.changes).toHaveLength(10);
    expect(preview[0]!.skipped.map((s) => s.id)).toEqual(['accelerator-week-0.step-1.line']);
    expect(await loadDb()).toEqual(before);
    expect((await handle.select().from(dataMigrations)).length).toBe(ran);
    const text = previewText(preview);
    expect(text).toContain('-- module accelerator-week-0 (Week 0 · Foundations)');
    expect(text).toContain('     before: "Fill In Your Intake and Name Your Operator"');
    expect(text).toContain('     after:  "Fill In Your Intake and Name Your AI Implementer"');
    expect(text).toContain(PERSON_NOT_SOFTWARE);
    expect(text).toContain('!! accelerator-week-0.step-1.line: ');

    const [report] = await applyDataMigrations(handle, Date.parse(NOW));
    expect([report!.id, report!.changed, report!.skipped.length]).toEqual([AI_IMPLEMENTER_V1, 10, 1]);
    expect(await loadDb()).toEqual(planAiImplementerV1(before).db);
    const rows = await handle.select().from(auditLog).where(eq(auditLog.reason, DATA_MIGRATIONS.at(-1)!.describe));
    expect(rows).toHaveLength(10);
    expect(new Set(rows.map((r) => r.targetType))).toEqual(new Set(['module', 'cohort']));
    expect(await applyDataMigrations(handle, Date.parse(NOW))).toEqual([]);
    expect(await previewDataMigrations(handle)).toEqual([]);
    expect(previewText([])).toBe('Every data step has already run. Nothing would change.\n');
  });

  it('refuses a write inside the preview’s transaction, which the same write without it makes', async () => {
    const attempt = (readOnly: boolean) =>
      handle
        .transaction(async (tx) => {
          if (readOnly) await tx.execute(sql`set transaction read only`);
          await tx.insert(dataMigrations).values({ id: 'x-preview-probe', ranAt: Date.parse(NOW), summary: {} });
          throw new Error('rolled back on purpose');
        })
        .then(
          () => 'committed',
          (e: unknown) => {
            const err = e as Error & { cause?: { message?: string; code?: string } };
            return [err.message, err.cause?.message, err.cause?.code].join(' ');
          },
        );
    expect(await attempt(false)).toBe('rolled back on purpose  ');
    expect(await attempt(true)).toMatch(/read-only transaction|25006/);
    expect((await handle.select().from(dataMigrations)).some((r) => r.id === 'x-preview-probe')).toBe(false);
  });
});

describe('an intake answer saved in the old words (D-243)', () => {
  it('reads, prints and re-saves as today’s option, and its stored row is not rewritten', { timeout: 60_000 }, async () => {
    const db = planAiImplementerV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db;
    const week = db.modules.find((m) => m.id === WEEK0_MODULE_ID)!;
    week.course = { ...week.course!, intake: planAiImplementerV1({ ...db, modules: [{ ...week, course: { ...week.course!, intake: WEEK0_INTAKE } }] }).db.modules[0]!.course!.intake! };
    await resetDatabase(db);
    await handle.insert(teams).values([{ id: 'team-a', name: 'Team A', ownerId: 'own-a', seats: 2, seq: 90 }]);
    await handle.insert(users).values([
      { id: 'own-a', email: 'a@example.test', name: 'Owner A', kind: 'learner', tier: 'team', role: 'Team Owner', teamId: 'team-a', status: 'active', joined: Date.parse(NOW), seq: 90 },
    ]);
    await handle.insert(teamIntake).values({ teamId: 'team-a', answers: { account: OLD_ACCOUNT, name: 'Dana' }, updatedAt: Date.parse(NOW), updatedBy: 'own-a', submittedAt: null });
    const a = await app.signInAs('own-a');

    const got = await app.inject({ method: 'GET', url: '/api/intake', headers: { cookie: a } });
    expect(got.statusCode).toBe(200);
    expect(got.json().answers).toEqual({ account: NEW_ACCOUNT, name: 'Dana' });
    const [stored] = await handle.select().from(teamIntake).where(eq(teamIntake.teamId, 'team-a'));
    expect(stored!.answers).toEqual({ account: OLD_ACCOUNT, name: 'Dana' });

    const staff = await app.signInAs('st_owner');
    const read = await app.inject({ method: 'GET', url: '/api/console/workspaces/team-a/intake', headers: { cookie: staff } });
    expect(read.json().answers).toMatchObject({ account: NEW_ACCOUNT });

    // A save sends only what changed, each with the answer it was (H-10, D-248). Another question's edit keeps the
    // account answer, as today's option.
    const json = { cookie: a, 'content-type': 'application/json' };
    const put = await app.inject({ method: 'PUT', url: '/api/intake', headers: json, payload: { changes: { name: 'Dana Lee' }, base: { name: 'Dana' } } });
    expect(put.statusCode).toBe(200);
    expect(put.json().answers).toEqual({ account: NEW_ACCOUNT, name: 'Dana Lee' });
    // A browser that held the old words, as the answer it read or the one it sends, is no clash: the answer is kept.
    const held = await app.inject({ method: 'PUT', url: '/api/intake', headers: json, payload: { changes: { account: OLD_ACCOUNT }, base: { account: OLD_ACCOUNT } } });
    expect(held.statusCode).toBe(200);
    expect(held.json().answers).toEqual({ account: NEW_ACCOUNT, name: 'Dana Lee' });
  });
});
