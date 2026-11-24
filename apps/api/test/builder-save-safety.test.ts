// D-246: the Module Builder's save through `POST /api/admin/actions/saveBuilderModule` and a real
// Postgres, on an open week with learners' checks, remembered accordions and kit files on its steps (the
// launch audit's H-5, H-6 and H-8). The rules are unit-tested in packages/core/test/builder-save-safety.test.ts.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { addStep, moduleVersion, removeStep } from '@ai/core';
import type { AIEmployee, Db, Learner, Resource } from '@ai/core';
import { ACCELERATOR_MODULE_IDS } from '@ai/core/accelerator';
import { seedProduction } from '@ai/core/seed/curriculum';
import { build } from '../src/app';
import type { App } from '../src/app';
import { auditLog, checklistState, learnerPrefs, resources } from '../src/db/schema';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-11-25T10:00:00-07:00');
const W0 = ACCELERATOR_MODULE_IDS[0]!;
let app: App;

const learner = (db: Db, id: string, over: Partial<Learner> = {}): Learner => ({
  id,
  name: `${id} Learner`,
  email: `${id}@example.test`,
  tier: 'team',
  role: 'Sales Agent',
  teamId: null,
  cohortId: db.cohorts[0]!.id,
  joined: NOW - 86_400_000,
  last: null,
  status: 'active',
  progress: {},
  ...over,
});

const kit = (id: string, stepId: string): Resource => ({
  id,
  title: `Kit ${id}`,
  desc: 'A kit file.',
  cat: 'Lead Generation Scripts',
  type: 'PDF guide',
  tier: 'agent',
  size: '1 KB',
  dl: 0,
  updated: NOW,
  exec: false,
  status: 'published',
  module: W0,
  kind: 'file',
  stepId,
});

/** Production's course, Week 0 at eight steps, a Content Editor, and a learner with checks on steps 2, 3 and 5. */
function world(): Db {
  const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  db.staff.push({ id: 'st_editor', name: 'Erin Editor', email: 'erin@example.test', role: 'Content Editor', last: null });
  const w0 = db.modules.find((m) => m.id === W0)!;
  w0.checklist.push({ ...w0.checklist[5]!, id: 'c7', ch: 'Step Seven' }, { ...w0.checklist[5]!, id: 'c8', ch: 'Step Eight' });
  db.users.push(
    learner(db, 'u_ana', {
      progress: { [W0]: { steps: ['c2', 'c3'], builtAt: null, deployedAt: null, runtime: null } },
      checks: [
        { moduleId: W0, stepId: 'c2', itemId: 'watch', checked: true, checkedAt: NOW, auto: false },
        { moduleId: W0, stepId: 'c3', itemId: 'brain', checked: true, checkedAt: NOW, auto: false },
        { moduleId: W0, stepId: 'c5', itemId: 'pack', checked: true, checkedAt: NOW, auto: false },
      ],
      coursePrefs: [{ key: `acc:${W0}:c3:0`, value: '1', updatedAt: NOW }],
    }),
  );
  db.resources.push(kit('k2', 'c2'), kit('k3', 'c3'));
  return db;
}

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(world());
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const sessions = new Map<string, string>();
const save = async (who: string, payload: unknown) => {
  const cookie = sessions.get(who) ?? (await app.signInAs(who));
  sessions.set(who, cookie);
  return app.inject({
    method: 'POST',
    url: '/api/admin/actions/saveBuilderModule',
    headers: { cookie, 'content-type': 'application/json' },
    payload: JSON.stringify(payload),
  });
};
afterEach(() => sessions.clear());

const week = async (): Promise<AIEmployee> => (await loadDb()).modules.find((m) => m.id === W0)!;
const checks = async () =>
  (await (await testDatabase()).select().from(checklistState).orderBy(asc(checklistState.stepId))).map((r) => `${r.stepId}:${r.itemId}`);
const prefs = async () => (await (await testDatabase()).select().from(learnerPrefs)).map((r) => r.key);
const kitStep = async (id: string) => (await (await testDatabase()).select().from(resources).where(eq(resources.id, id)))[0]!.stepId;
const auditRows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));

describe('H-5: reorder, remove and insert keep learners’ checks, prefs and kit files on their steps @builder-safety', () => {
  it('reorder: the ids move with the steps; no check, pref or kit row changes', async () => {
    const stored = await week();
    const draft = structuredClone(stored);
    [draft.checklist[1], draft.checklist[2]] = [draft.checklist[2]!, draft.checklist[1]!];
    const res = await save('st_owner', { draft, base: moduleVersion(stored) });
    expect(res.statusCode, res.body).toBe(200);
    expect((await week()).checklist.map((s) => s.id)).toEqual(['c1', 'c3', 'c2', 'c4', 'c5', 'c6', 'c7', 'c8']);
    expect((await week()).checklist[1]!.ch).toBe(stored.checklist[2]!.ch);
    expect(await checks()).toEqual(['c2:watch', 'c3:brain', 'c5:pack']);
    expect(await prefs()).toEqual([`acc:${W0}:c3:0`]);
    expect([await kitStep('k2'), await kitStep('k3')]).toEqual(['c2', 'c3']);
  });

  it('remove: the removed step leaves progress and its kit file; the rest stay where they were', async () => {
    const stored = await week();
    const res = await save('st_owner', { draft: { ...structuredClone(stored), checklist: removeStep(stored.checklist, 1) }, base: moduleVersion(stored) });
    expect(res.statusCode, res.body).toBe(200);
    expect((await week()).checklist.map((s) => s.id)).toEqual(['c1', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
    // Step 3's and step 5's checks are untouched; step 2's stays stored but has no step to show on.
    expect(await checks()).toEqual(['c2:watch', 'c3:brain', 'c5:pack']);
    expect(await prefs()).toEqual([`acc:${W0}:c3:0`]);
    expect((await loadDb()).users.find((u) => u.id === 'u_ana')!.progress[W0]!.steps).toEqual(['c3']);
    expect([await kitStep('k2'), await kitStep('k3')]).toEqual([null, 'c3']);
  });

  it('insert: the new step’s id is past every id in use, and nothing attaches to it', async () => {
    const stored = await week();
    const added = addStep(stored.checklist);
    const fresh = added.pop()!;
    const res = await save('st_owner', { draft: { ...structuredClone(stored), checklist: [added[0]!, fresh, ...added.slice(1)] }, base: moduleVersion(stored) });
    expect(res.statusCode, res.body).toBe(200);
    expect((await week()).checklist.map((s) => s.id)).toEqual(['c1', 'c9', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
    expect(res.json().saved.stepIds).toEqual(['c1', 'c9', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
    expect(await checks()).toEqual(['c2:watch', 'c3:brain', 'c5:pack']);
    expect([await kitStep('k2'), await kitStep('k3')]).toEqual(['c2', 'c3']);
  });
});

describe('H-6: the base version, and a 409 when it is stale @builder-safety', () => {
  it('requires a base', async () => {
    const stored = await week();
    expect((await save('st_owner', { draft: stored })).statusCode).toBe(400);
  });

  it('a repeated identical request is a 409 and re-applies nothing', async () => {
    const stored = await week();
    const payload = { draft: { ...structuredClone(stored), checklist: removeStep(stored.checklist, 1) }, base: moduleVersion(stored) };
    expect((await save('st_owner', payload)).statusCode).toBe(200);
    const after = await loadDb();
    const again = await save('st_owner', payload);
    expect(again.statusCode).toBe(409);
    expect(again.json()).toEqual({ error: 'Someone changed this week since you opened it. Copy your changes, reload the page, and save again.' });
    expect(await loadDb()).toEqual(after);
    expect(await checks()).toEqual(['c2:watch', 'c3:brain', 'c5:pack']);
    expect((await auditRows()).map((r) => r.action)).toEqual(['module.save']);
  });

  it('two editors: the second save from the same version is refused, and the first one stands', async () => {
    const stored = await week();
    const base = moduleVersion(stored);
    expect((await save('st_owner', { draft: { ...structuredClone(stored), name: 'Week 0 by the Owner' }, base })).statusCode).toBe(200);
    const second = await save('st_owner', { draft: { ...structuredClone(stored), name: 'Week 0 by a second tab' }, base });
    expect(second.statusCode).toBe(409);
    expect((await week()).name).toBe('Week 0 by the Owner');
  });

  it('the version it answers is the stored module’s, read back through Postgres, so the next save goes through', async () => {
    const stored = await week();
    const first = await save('st_owner', { draft: { ...structuredClone(stored), short: 'Edited' }, base: moduleVersion(stored) });
    expect(first.statusCode, first.body).toBe(200);
    const version = first.json().saved.version as string;
    expect(version).toBe(moduleVersion(await week()));
    const snapshot = (await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie: sessions.get('st_owner')! } })).json() as Db;
    expect(moduleVersion(snapshot.modules.find((m) => m.id === W0)!)).toBe(version);
    const next = await save('st_owner', { draft: { ...structuredClone(await week()), short: 'Edited again' }, base: version });
    expect(next.statusCode, next.body).toBe(200);
  });
});

describe('H-8: a Content Editor saving a published week is told which permission it needs @builder-safety', () => {
  it('403 with the Publish modules sentence; nothing written; the role keeps its permissions', async () => {
    const stored = await week();
    const before = await loadDb();
    const res = await save('st_editor', { draft: { ...structuredClone(stored), name: 'Edited by Erin' }, base: moduleVersion(stored) });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'Saving a published or scheduled week needs the “Publish modules” permission. Ask an Owner or Admin.' });
    expect(await loadDb()).toEqual(before);
    expect((await loadDb()).perms['Content Editor']).toEqual(before.perms['Content Editor']);
    expect(await auditRows()).toEqual([]);
  });
});
