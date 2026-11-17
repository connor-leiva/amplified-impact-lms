// D-172 R2-gaps: `POST /api/admin/actions/:name` through the real router and a real Postgres. Each
// action writes what core says, refuses as the existing `PermKey` rule says, and writes ONE audit row
// in the same transaction (none when it refuses or fails validation). The rules themselves are
// unit-tested in `packages/core/test/admin-actions.test.ts`.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc } from 'drizzle-orm';
import { addStep, removeStep, seedForDatabase } from '@ai/core';
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

const act = async (a: App, who: string | null, name: string, payload: unknown, extra: Record<string, string> = {}) =>
  a.inject({
    method: 'POST',
    url: `/api/admin/actions/${name}`,
    headers: { ...(who ? { cookie: await a.signInAs(who) } : {}), 'content-type': 'application/json', ...extra },
    payload: JSON.stringify(payload),
  });
const auditRows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));

describe('the route (D-172) @admin-actions', () => {
  it('is signed in, same-origin JSON, named, and strict about its body', async () => {
    expect((await act(app, null, 'duplicateModule', { id: 'sales' })).statusCode).toBe(401);
    const form = await app.inject({
      method: 'POST',
      url: '/api/admin/actions/duplicateModule',
      headers: { cookie: await app.signInAs('st1'), 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'id=sales',
    });
    expect(form.statusCode).toBe(415);
    expect((await act(app, 'st1', 'toString', {})).statusCode).toBe(404);
    expect((await act(app, 'st1', 'publishModule', { id: 'sales' })).statusCode).toBe(404);
    const bad = await act(app, 'st1', 'duplicateModule', { id: 'sales', extra: 1 });
    expect(bad.statusCode).toBe(400);
    expect(await auditRows()).toHaveLength(0);
  });

  it('refuses as the PermKey rule says, writing nothing', async () => {
    const before = await loadDb();
    expect((await act(app, 'st4', 'duplicateModule', { id: 'sales' })).statusCode).toBe(403); // Support: curriculum 0
    expect((await act(app, 'u_jamie', 'duplicateModule', { id: 'sales' })).statusCode).toBe(403);
    expect((await act(app, 'st1', 'duplicateModule', { id: 'nope' })).statusCode).toBe(404);
    expect((await loadDb()).modules).toEqual(before.modules);
    expect(await auditRows()).toHaveLength(0);
  });
});

describe('Curriculum › Duplicate @admin-actions', () => {
  it('copies the AI Employee as a draft, answers the toast, and writes one module.duplicate row', async () => {
    const res = await act(app, 'st1', 'duplicateModule', { id: 'sales' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ toast: { msg: 'Duplicated as a draft', tone: 'success' } });
    const db = await loadDb();
    const copy = db.modules.find((m) => m.name === 'Sales AI Employee (copy)')!;
    expect(copy).toMatchObject({ status: 'draft', opens: null });
    expect(copy.checklist).toEqual(db.modules.find((m) => m.id === 'sales')!.checklist);
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'module.duplicate',
      outcome: 'ok',
      actorSource: 'staff',
      actorUserId: 'st1',
      actorRole: 'Owner',
      targetType: 'module',
      targetId: copy.id,
      targetLabel: 'Sales AI Employee (copy)',
      before: { from: 'sales', name: 'Sales AI Employee' },
      after: { id: copy.id, status: 'draft', steps: 6 },
    });
  });
});

describe('Module Builder › Save, with Add step and Remove step @admin-actions', () => {
  it('persists the steps, keeps learners’ checks on them, and writes one module.save row', async () => {
    const db = await loadDb();
    const sales = db.modules.find((m) => m.id === 'sales')!;
    const draft = { ...sales, checklist: addStep(removeStep(sales.checklist, 1)) };
    const res = await act(app, 'st1', 'saveBuilderModule', { draft });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ toast: { msg: 'Sales AI Employee saved', tone: 'success' } });
    const after = await loadDb();
    const saved = after.modules.find((m) => m.id === 'sales')!;
    expect(saved.checklist).toHaveLength(6);
    expect(saved.checklist[5]).toMatchObject({ id: 'c6', text: 'New step', mins: 5, kind: 'Build' });
    expect(after.users.find((u) => u.id === 'u_jamie')!.progress.sales!.steps).toEqual(['c1', 'c2']);
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'module.save',
      targetId: 'sales',
      before: { steps: 6 },
      after: { steps: 6, stepChanges: { added: 1, removed: 1, reordered: false } },
    });
  });

  it('a refused publish is the inline 422, with no write and no row', async () => {
    const db = await loadDb();
    const sales = db.modules.find((m) => m.id === 'sales')!;
    const res = await act(app, 'st1', 'saveBuilderModule', { draft: { ...sales, checklist: removeStep(sales.checklist, 0) }, status: 'published' });
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body)).toEqual({ error: 'Give all six build steps a title.' });
    expect((await loadDb()).modules.find((m) => m.id === 'sales')!.checklist).toHaveLength(6);
    expect(await auditRows()).toHaveLength(0);
  });
});
