// D-172: the Build writes an R2 Confirm asks about ("This action is audit-logged.") write ONE audit row
// on `POST /api/mutate/:name`, in the mutation's transaction, with core's mutations unchanged.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { auditLog } from '../src/db/schema';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');
let app: App;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const mutate = async (who: string, name: string, payload: unknown) =>
  app.inject({ method: 'POST', url: `/api/mutate/${name}`, headers: { cookie: await app.signInAs(who), 'content-type': 'application/json' }, payload: JSON.stringify(payload) });
const auditRows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));

describe('the confirmed Build writes’ audit rows (D-172) @admin-actions', () => {
  it('Unpublish, Publish and Delete each write one row, with the AI Employee and its statuses', async () => {
    expect((await mutate('st1', 'unpublishModule', { id: 'sales' })).statusCode).toBe(200);
    expect((await mutate('st1', 'publishModule', { id: 'sales' })).statusCode).toBe(200);
    expect((await mutate('st1', 'unpublishModule', { id: 'sales' })).statusCode).toBe(200);
    expect((await mutate('st1', 'deleteModule', { id: 'sales' })).statusCode).toBe(200);
    const rows = await auditRows();
    expect(rows.map((r) => r.action)).toEqual(['module.unpublish', 'module.publish', 'module.unpublish', 'module.delete']);
    expect(rows[1]).toMatchObject({
      outcome: 'ok',
      actorSource: 'staff',
      actorUserId: 'st1',
      actorRole: 'Owner',
      targetType: 'module',
      targetId: 'sales',
      targetLabel: 'Sales AI Employee',
      before: { status: 'draft' },
      after: { status: 'published', opens: null },
    });
    expect(rows[3]).toMatchObject({ before: { name: 'Sales AI Employee', status: 'draft' }, after: null });
  });

  it('Remove from vault writes one vault.remove row', async () => {
    const r1 = (await loadDb()).resources[0]!;
    expect((await mutate('st1', 'deleteResource', { id: r1.id })).statusCode).toBe(200);
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'vault.remove', targetType: 'resource', targetId: r1.id, targetLabel: r1.title, before: { title: r1.title }, after: null });
  });

  it('writes nothing for a refusal, a write that changed nothing, or any other mutation', async () => {
    expect((await mutate('st4', 'unpublishModule', { id: 'sales' })).statusCode).toBe(403);
    expect((await mutate('st1', 'publishModule', { id: 'sales' })).statusCode).toBe(200); // already published
    expect((await mutate('st1', 'setModuleTier', { id: 'sales', tier: 'team' })).statusCode).toBe(200);
    expect((await mutate('u_jamie', 'markDeployed', { moduleId: 'sales' })).statusCode).not.toBe(500);
    expect(await auditRows()).toHaveLength(0);
  });
});
