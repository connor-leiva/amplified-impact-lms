// D-172 R2-gaps: the audited Build actions beside the reference-ported mutations. Each one is checked
// for who may run it (the existing `PermKey` rule), what it writes, what it leaves alone, its toast and
// its ONE audit row. Typed out by hand, so a changed rule or word is a red test.
import { describe, expect, it } from 'vitest';
import {
  ADMIN_ACTIONS,
  AUDIT_ACTIONS,
  MutationError,
  NEW_STEP,
  addStep,
  copyName,
  duplicateModule,
  duplicateStep,
  freshStepId,
  isAdminActionName,
  removeStep,
  saveBuilderModule,
  seed,
  stepChanges,
  stepIdMap,
} from '../src';
import type { Actor, Ctx, Db, Step } from '../src';

const NOW = Date.parse('2026-12-07T10:42:00-06:00');
const mkCtx = (): Ctx => {
  let n = 1;
  return { now: NOW, id: (p: string) => `${p}_test_${n++}` };
};
const staff = (staffId: string): Actor => ({ kind: 'staff', staffId });
const OWNER = staff('st1');
const SUPPORT = staff('st4'); // curriculum: 0
const JAMIE: Actor = { kind: 'learner', userId: 'u_jamie' };
const fresh = (): Db => seed('live');

const step = (id: string, text = id): Step => ({ id, text, ch: '', mins: 3, t: 0, hint: '' });

describe('the catalog (D-172)', () => {
  it('names each action and audits it with an action from the closed list', () => {
    expect(Object.keys(ADMIN_ACTIONS)).toEqual(expect.arrayContaining(['duplicateModule', 'saveBuilderModule']));
    expect(isAdminActionName('duplicateModule')).toBe(true);
    expect(isAdminActionName('toString')).toBe(false);
    expect(isAdminActionName('publishModule')).toBe(false);
    expect(AUDIT_ACTIONS).toEqual(expect.arrayContaining(['module.duplicate', 'module.save']));
  });
});

describe('Curriculum › Duplicate (duplicateModule)', () => {
  it('copies the AI Employee as a draft, last, with every step and setting, and one audit row', () => {
    const db = fresh();
    const m = db.modules.find((x) => x.id === 'sales')!;
    const out = duplicateModule(db, OWNER, { id: 'sales' }, mkCtx());
    expect(out.error).toBeUndefined();
    expect(out.db.modules).toHaveLength(db.modules.length + 1);
    const copy = out.db.modules.at(-1)!;
    expect(copy.id).toBe('m_test_1');
    expect(copy.name).toBe('Sales AI Employee (copy)');
    expect(copy.status).toBe('draft');
    expect(copy.opens).toBeNull();
    expect(copy.order).toBe(Math.max(...db.modules.map((x) => x.order)) + 1);
    // Everything else is the original's, and shares nothing with it.
    const { id: _a, name: _b, status: _c, opens: _d, order: _e, ...rest } = copy;
    const { id: _f, name: _g, status: _h, opens: _i, order: _j, ...orig } = m;
    expect(rest).toEqual(orig);
    expect(copy.checklist).not.toBe(m.checklist);
    // The original is untouched, and so is everything else.
    expect(out.db.modules.find((x) => x.id === 'sales')).toEqual(m);
    expect(out.db.users).toBe(db.users);
    expect(out.toast).toEqual({ msg: 'Duplicated as a draft', tone: 'success' });
    expect(out.audit).toEqual({
      action: 'module.duplicate',
      target: { type: 'module', id: 'm_test_1', label: 'Sales AI Employee (copy)' },
      before: { from: 'sales', name: 'Sales AI Employee', status: m.status },
      after: { id: 'm_test_1', name: 'Sales AI Employee (copy)', status: 'draft', tier: m.tier, steps: 6, files: m.files.length },
    });
    expect(copyName('X')).toBe('X (copy)');
  });

  it('needs the curriculum permission, and an AI Employee that exists', () => {
    const db = fresh();
    expect(() => duplicateModule(db, SUPPORT, { id: 'sales' }, mkCtx())).toThrow(MutationError);
    expect(() => duplicateModule(db, JAMIE, { id: 'sales' }, mkCtx())).toThrow('You don’t have permission to do that.');
    expect(() => duplicateModule(db, OWNER, { id: 'nope' }, mkCtx())).toThrow('No AI Employee nope');
  });
});

describe('Module Builder: the draft’s step helpers', () => {
  const list = [step('c1'), step('c2'), step('c3')];

  it('Add step appends the mockup’s new step with an id no step has', () => {
    const next = addStep(list);
    expect(next).toHaveLength(4);
    expect(next[3]).toEqual({ id: 'new-1', ...NEW_STEP });
    expect(NEW_STEP).toEqual({ text: 'New step', ch: '', mins: 5, t: 0, hint: '', kind: 'Build' });
    expect(addStep(next)[4]!.id).toBe('new-2');
    expect(freshStepId([step('new-1'), step('new-3')])).toBe('new-2');
    expect(list).toHaveLength(3);
  });

  it('Duplicate step appends a copy of that step, last, with its own id', () => {
    const next = duplicateStep(list, 1);
    expect(next.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'new-1']);
    expect(next[3]).toEqual({ ...list[1], id: 'new-1' });
    expect(duplicateStep(list, 9)).toEqual(list);
  });

  it('Remove step takes that step out and keeps the order', () => {
    expect(removeStep(list, 1).map((s) => s.id)).toEqual(['c1', 'c3']);
    expect(removeStep(list, 9)).toEqual(list);
  });

  it('a save maps each kept step to its new place, and counts the changes', () => {
    const draft = [step('c3'), step('c1'), step('new-1'), step('c1')];
    expect([...stepIdMap(list, draft)]).toEqual([
      ['c3', 'c1'],
      ['c1', 'c2'],
    ]);
    expect(stepChanges(list, draft)).toEqual({ added: 2, removed: 1, reordered: true });
    expect(stepChanges(list, list)).toEqual({ added: 0, removed: 0, reordered: false });
    expect(stepChanges([], [step('new-1')])).toEqual({ added: 1, removed: 0, reordered: false });
  });
});

describe('Module Builder › Save (saveBuilderModule)', () => {
  it('saves through saveModule, keeps learners’ checks on the same steps, and writes one audit row', () => {
    const db = fresh();
    const sales = db.modules.find((x) => x.id === 'sales')!;
    // Jamie has Sales at 3 of 6: c1, c2, c3.
    expect(db.users.find((u) => u.id === 'u_jamie')!.progress.sales!.steps).toEqual(['c1', 'c2', 'c3']);
    // Remove step 2, duplicate step 3, add a new step.
    let checklist = removeStep(sales.checklist, 1);
    checklist = duplicateStep(checklist, 1);
    checklist = addStep(checklist);
    const draft = { ...structuredClone(sales), checklist };
    const out = saveBuilderModule(db, OWNER, { draft }, mkCtx());
    expect(out.error).toBeUndefined();
    const saved = out.db.modules.find((x) => x.id === 'sales')!;
    expect(saved.checklist.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']);
    expect(saved.checklist.map((s) => s.text)).toEqual([
      sales.checklist[0]!.text,
      sales.checklist[2]!.text,
      sales.checklist[3]!.text,
      sales.checklist[4]!.text,
      sales.checklist[5]!.text,
      sales.checklist[2]!.text,
      'New step',
    ]);
    // c1 stays c1, c2 (removed) goes, c3 is now c2.
    expect(out.db.users.find((u) => u.id === 'u_jamie')!.progress.sales!.steps).toEqual(['c1', 'c2']);
    expect(out.toast).toEqual({ msg: 'Sales AI Employee saved', tone: 'success' });
    expect(out.audit).toEqual({
      action: 'module.save',
      target: { type: 'module', id: 'sales', label: 'Sales AI Employee' },
      before: { name: 'Sales AI Employee', status: sales.status, tier: sales.tier, steps: 6, files: sales.files.length },
      after: {
        name: 'Sales AI Employee',
        status: sales.status,
        tier: sales.tier,
        steps: 7,
        files: sales.files.length,
        stepChanges: { added: 2, removed: 1, reordered: false },
      },
    });
  });

  it('leaves learners’ progress alone when no step moved', () => {
    const db = fresh();
    const sales = db.modules.find((x) => x.id === 'sales')!;
    const out = saveBuilderModule(db, OWNER, { draft: { ...structuredClone(sales), name: 'Sales' } }, mkCtx());
    expect(out.db.users).toBe(db.users);
    expect(out.audit!.after).toMatchObject({ name: 'Sales', stepChanges: { added: 0, removed: 0, reordered: false } });
  });

  it('a new AI Employee is saved with no before and nothing to map', () => {
    const db = fresh();
    const sales = db.modules.find((x) => x.id === 'sales')!;
    const draft = { ...structuredClone(sales), id: 'brand-new', name: 'Brand New', status: 'draft' as const, checklist: addStep([]) };
    const out = saveBuilderModule(db, OWNER, { draft }, mkCtx());
    expect(out.error).toBeUndefined();
    expect(out.db.users).toBe(db.users);
    expect(out.audit).toMatchObject({ target: { id: 'brand-new', label: 'Brand New' }, before: null, after: { steps: 1, stepChanges: { added: 1, removed: 0, reordered: false } } });
  });

  it('refuses as saveModule refuses: a publish check is an inline error, with no write and no audit', () => {
    const db = fresh();
    const sales = db.modules.find((x) => x.id === 'sales')!;
    const draft = { ...structuredClone(sales), checklist: removeStep(sales.checklist, 0) };
    const out = saveBuilderModule(db, OWNER, { draft, status: 'published' }, mkCtx());
    expect(out.error).toBe('Give all six build steps a title.');
    expect(out.db).toBe(db);
    expect(out.audit).toBeUndefined();
    expect(() => saveBuilderModule(db, SUPPORT, { draft }, mkCtx())).toThrow(MutationError);
  });
});
