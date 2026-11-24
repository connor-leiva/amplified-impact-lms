// D-172 R2-gaps: `POST /api/admin/actions/:name` through the real router and a real Postgres. Each
// action writes what core says, refuses as the existing `PermKey` rule says, and writes ONE audit row
// in the same transaction (none when it refuses or fails validation). The rules themselves are
// unit-tested in `packages/core/test/admin-actions.test.ts`.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc } from 'drizzle-orm';
import { addStep, moduleVersion, removeStep, seedForDatabase } from '@ai/core';
import { ACCELERATOR_MODULE_IDS } from '@ai/core/accelerator';
import { seedProduction } from '@ai/core/seed/curriculum';
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
    const res = await act(app, 'st1', 'saveBuilderModule', { draft, base: moduleVersion(sales) });
    expect(res.statusCode).toBe(200);
    const after = await loadDb();
    const saved = after.modules.find((m) => m.id === 'sales')!;
    // D-246: the saved module's version and its step ids come back, for the builder.
    expect(JSON.parse(res.body)).toEqual({
      toast: { msg: 'Sales AI Employee saved', tone: 'success' },
      saved: { id: 'sales', version: moduleVersion(saved), stepIds: ['c1', 'c3', 'c4', 'c5', 'c6', 'c7'] },
    });
    expect(saved.checklist).toHaveLength(6);
    // D-246: kept steps keep their ids; the new step is numbered past them.
    expect(saved.checklist[5]).toMatchObject({ id: 'c7', text: 'New step', mins: 5, kind: 'Build' });
    expect(after.users.find((u) => u.id === 'u_jamie')!.progress.sales!.steps).toEqual(['c1', 'c3']);
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
    const res = await act(app, 'st1', 'saveBuilderModule', { draft: { ...sales, checklist: removeStep(sales.checklist, 0) }, status: 'published', base: moduleVersion(sales) });
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body)).toEqual({ error: 'Give all six build steps a title.' });
    expect((await loadDb()).modules.find((m) => m.id === 'sales')!.checklist).toHaveLength(6);
    expect(await auditRows()).toHaveLength(0);
  });

  it('saves a course week as the builder holds it, its words included, and keeps them (D-173)', async () => {
    // The production seed: the nine weeks carry `kind`, `course` and Week 0's `dueAt`. The builder's
    // draft is the stored row (`seedDraft`), so all of it comes back on Save.
    await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
    for (const id of [ACCELERATOR_MODULE_IDS[0]!, ACCELERATOR_MODULE_IDS[2]!]) {
      const stored = (await loadDb()).modules.find((m) => m.id === id)!;
      expect(stored.course, id).toBeDefined();
      const res = await act(app, 'st_owner', 'saveBuilderModule', { draft: { ...structuredClone(stored), short: `${stored.short} (edited)` }, base: moduleVersion(stored) });
      expect(res.statusCode, `${id}: ${res.body}`).toBe(200);
      const saved = (await loadDb()).modules.find((m) => m.id === id)!;
      expect(saved).toEqual({ ...stored, short: `${stored.short} (edited)` });
    }
    expect((await auditRows()).map((r) => r.action)).toEqual(['module.save', 'module.save']);
  });
});

describe('Resource Vault › Edit details, and Attached to @admin-actions', () => {
  it('stores the edit and the AI Employee it is attached to, with one vault.edit row', async () => {
    const res = await act(app, 'st1', 'editResource', {
      id: 'r1',
      title: 'Fair Housing Checker',
      desc: 'Flags steering language.',
      cat: 'MLS & Fair Housing Compliance',
      tier: 'agent',
      module: 'marketing',
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ toast: { msg: 'Saved', tone: 'success' } });
    const r1 = (await loadDb()).resources.find((r) => r.id === 'r1')!;
    expect(r1).toMatchObject({ title: 'Fair Housing Checker', desc: 'Flags steering language.', module: 'marketing' });
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'vault.edit', targetId: 'r1', after: { module: 'marketing', attachedTo: 'Marketing AI Employee' } });
    // An Instructor may edit the vault (curriculum 1); Support may not.
    expect((await act(app, 'st2', 'editResource', { id: 'r1', title: 'X', desc: '', cat: 'MLS & Fair Housing Compliance', tier: 'agent', module: null })).statusCode).toBe(200);
    expect((await act(app, 'st4', 'editResource', { id: 'r1', title: 'Y', desc: '', cat: 'MLS & Fair Housing Compliance', tier: 'agent', module: null })).statusCode).toBe(403);
    expect('module' in (await loadDb()).resources.find((r) => r.id === 'r1')!).toBe(false);
  });
});

describe('Cohorts & Sessions › Add session and Attach replay @admin-actions', () => {
  it('adds a session at the MST instant typed, with one session.create row', async () => {
    const res = await act(app, 'st1', 'addSession', { cohortId: 'dec26', title: 'Office hours', date: '2026-12-22', time: '12:00', mins: '60', zoom: '' });
    expect(res.statusCode).toBe(200);
    const added = (await loadDb()).sessions.find((s) => s.title === 'Office hours')!;
    expect(added).toMatchObject({ cohortId: 'dec26', n: 7, start: Date.parse('2026-12-22T12:00:00-07:00'), mins: 60, zoom: '' });
    expect((await auditRows())[0]).toMatchObject({ action: 'session.create', targetId: added.id, targetLabel: 'Session 7 · Office hours' });
    const bad = await act(app, 'st1', 'addSession', { cohortId: 'dec26', title: 'X', date: 'soon', time: '12:00', mins: 60, zoom: '' });
    expect(bad.statusCode).toBe(422);
    expect(JSON.parse(bad.body)).toEqual({ error: 'Pick a date and a start time.' });
  });

  it('attaches a replay link to a past session; a learner’s snapshot carries it once published to them (D-183)', async () => {
    const url = 'https://example.com/replays/session-1';
    const res = await act(app, 'st1', 'attachReplay', { sessionId: 'dec26-s1', url });
    expect(res.statusCode).toBe(200);
    expect((await loadDb()).sessions.find((s) => s.id === 'dec26-s1')!.replayUrl).toBe(url);
    expect((await auditRows())[0]).toMatchObject({ action: 'session.replay_attach', targetId: 'dec26-s1', after: { replay: 'ready', replayUrl: url } });
    // D-183: Attach replay publishes it, so a learner who may open its AI Employee receives the link (never
    // the Zoom link); before D-183 nothing learner-facing read it. replay-link.test.ts holds the rest.
    const snap = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie: await app.signInAs('u_jamie') } });
    expect((snap.json() as { sessions: { id: string; replayUrl?: string; zoom: string }[] }).sessions.find((s) => s.id === 'dec26-s1')).toMatchObject({ replayUrl: url, zoom: '' });
    expect((await act(app, 'st1', 'attachReplay', { sessionId: 'dec26-s5', url })).statusCode).toBe(422);
    expect((await act(app, 'st3', 'attachReplay', { sessionId: 'dec26-s1', url })).statusCode).toBe(403);
  });
});

describe('Announcements: Save draft, Edit and Duplicate @admin-actions', () => {
  const fields = { title: 'Office hours move', body: 'Thursday.', audience: 'team', inapp: true, email: true, severity: 'info', action: '' };

  it('saves a draft, edits it, duplicates it; each one row, and nothing is sent', async () => {
    const draft = await act(app, 'st1', 'saveAnnouncementDraft', fields);
    expect(draft.statusCode).toBe(200);
    expect(JSON.parse(draft.body)).toEqual({ toast: { msg: 'Saved as a draft', tone: 'success' } });
    const a = (await loadDb()).announcements.find((x) => x.title === 'Office hours move')!;
    expect(a).toMatchObject({ status: 'draft', channels: ['inapp', 'email'] });

    const edit = await act(app, 'st1', 'updateAnnouncement', { ...fields, id: a.id, title: 'Office hours moved', when: 'later', at: '2026-12-11T09:00' });
    expect(edit.statusCode).toBe(200);
    expect((await loadDb()).announcements.find((x) => x.id === a.id)).toMatchObject({ title: 'Office hours moved', status: 'scheduled', at: Date.parse('2026-12-11T09:00:00-07:00') });

    const dup = await act(app, 'st1', 'duplicateAnnouncement', { id: 'a1' });
    expect(dup.statusCode).toBe(200);
    const sent = await act(app, 'st1', 'updateAnnouncement', { ...fields, id: 'a1', when: 'draft' });
    expect(sent.statusCode).toBe(422);
    expect(JSON.parse(sent.body)).toEqual({ error: 'Sent announcements can’t be edited.' });

    expect((await auditRows()).map((r) => r.action)).toEqual(['announce.create', 'announce.update', 'announce.duplicate']);
    expect((await act(app, 'st3', 'duplicateAnnouncement', { id: 'a1' })).statusCode).toBe(403);
  });
});
