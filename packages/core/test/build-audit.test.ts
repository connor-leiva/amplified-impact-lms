// D-172: the audit rows for the Build writes an R2 Confirm asks about ("This action is audit-logged."),
// read from what core's unchanged mutation changed.
import { describe, expect, it } from 'vitest';
import { AUDIT_ACTIONS, BUILD_AUDIT_ACTION, BUILD_CONFIRM_WRITES, buildWriteRecordOf, isBuildConfirmWrite, seed } from '../src';
import * as M from '../src/mutations';
import type { Actor, Ctx } from '../src';

const ctx: Ctx = { now: Date.parse('2026-12-07T10:42:00-06:00'), id: (p) => `${p}_t` };
const OWNER: Actor = { kind: 'staff', staffId: 'st1' };

describe('the confirmed Build writes’ audit rows (D-172)', () => {
  it('are the four writes behind a Confirm, each with an action in the closed list', () => {
    expect(BUILD_CONFIRM_WRITES).toEqual(['publishModule', 'unpublishModule', 'deleteModule', 'deleteResource']);
    expect(Object.values(BUILD_AUDIT_ACTION)).toEqual(['module.publish', 'module.unpublish', 'module.delete', 'vault.remove']);
    for (const a of Object.values(BUILD_AUDIT_ACTION)) expect(AUDIT_ACTIONS).toContain(a);
    expect(isBuildConfirmWrite('publishModule')).toBe(true);
    expect(isBuildConfirmWrite('saveModule')).toBe(false);
  });

  it('records a publish and an unpublish by their statuses, and nothing when nothing changed', () => {
    const db = seed('live');
    const draft = db.modules.find((m) => m.status !== 'published')!;
    const pub = M.publishModule(db, OWNER, { id: draft.id }, ctx).db;
    expect(buildWriteRecordOf('publishModule', { id: draft.id }, db, pub)).toEqual({
      action: 'module.publish',
      target: { type: 'module', id: draft.id, label: draft.name },
      before: { status: draft.status, opens: draft.opens },
      after: { status: 'published', opens: null },
    });
    expect(buildWriteRecordOf('publishModule', { id: draft.id }, pub, M.publishModule(pub, OWNER, { id: draft.id }, ctx).db)).toBeNull();
    const un = M.unpublishModule(pub, OWNER, { id: draft.id }, ctx).db;
    expect(buildWriteRecordOf('unpublishModule', { id: draft.id }, pub, un)).toMatchObject({ action: 'module.unpublish', before: { status: 'published' }, after: { status: 'draft' } });
    expect(buildWriteRecordOf('publishModule', { id: 'nope' }, db, db)).toBeNull();
    expect(buildWriteRecordOf('publishModule', null, db, db)).toBeNull();
  });

  it('records a deleted draft and a removed resource by what they were', () => {
    const db = seed('live');
    const draftDb = M.unpublishModule(db, OWNER, { id: 'sales' }, ctx).db;
    const gone = M.deleteModule(draftDb, OWNER, { id: 'sales' }, ctx).db;
    expect(buildWriteRecordOf('deleteModule', { id: 'sales' }, draftDb, gone)).toEqual({
      action: 'module.delete',
      target: { type: 'module', id: 'sales', label: 'Sales AI Employee' },
      before: { name: 'Sales AI Employee', status: 'draft', tier: 'agent', steps: 6 },
      after: null,
    });
    expect(buildWriteRecordOf('deleteModule', { id: 'sales' }, draftDb, draftDb)).toBeNull();
    const r1 = db.resources[0]!;
    const out = M.deleteResource(db, OWNER, { id: r1.id }, ctx).db;
    expect(buildWriteRecordOf('deleteResource', { id: r1.id }, db, out)).toEqual({
      action: 'vault.remove',
      target: { type: 'resource', id: r1.id, label: r1.title },
      before: { title: r1.title, type: r1.type, tier: r1.tier, status: r1.status, module: null },
      after: null,
    });
    expect(buildWriteRecordOf('deleteResource', { id: r1.id }, db, db)).toBeNull();
  });
});
