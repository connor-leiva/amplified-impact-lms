import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canAccess, isOpen, seed, visibleModules } from '@ai/core';
import type { Db } from '@ai/core';
import { createFixtureRepository } from './fixture';
import {
  PREVIEW_ONLY,
  PREVIEW_TEAM_ID,
  PREVIEW_USER_ID,
  previewDb,
  previewLearner,
  readPreviewAs,
  withPreview,
} from './preview';

// The Admin Console's "Preview as learner" tab (D-138): read-only, staff only, every AI Employee.

const DRAFT_ID = 'listing';
/** The seed plus one draft, the case an admin most wants to preview before publishing. */
const withDraft = (): Db => {
  const db = seed('live');
  const base = db.modules[0]!;
  return { ...db, modules: [...db.modules, { ...base, id: DRAFT_ID, name: 'Listing AI Employee', status: 'draft', order: 99 }] };
};

describe('readPreviewAs', () => {
  it('reads agent and owner, and nothing else', () => {
    expect(readPreviewAs('?preview=agent')).toBe('agent');
    expect(readPreviewAs('?preview=owner&x=1')).toBe('owner');
    for (const q of ['', '?preview=1', '?preview=admin', '?as=owner', '?preview=Owner']) expect(readPreviewAs(q), q).toBeNull();
  });
});

describe('previewDb', () => {
  it('shows every AI Employee: drafts and scheduled ones as published, open dates ignored', () => {
    const db = withDraft();
    const scheduled = db.modules.find((m) => m.status === 'scheduled')!;
    expect(scheduled.opens).not.toBeNull();
    expect(visibleModules(db).map((m) => m.id)).not.toContain(DRAFT_ID);

    const p = previewDb(db, 'agent');
    expect(visibleModules(p).map((m) => m.id)).toContain(DRAFT_ID);
    expect(p.modules.every((m) => m.status === 'published')).toBe(true);
    // Open before its date, at any moment.
    expect(isOpen(p.modules.find((m) => m.id === scheduled.id)!, 0)).toBe(true);
  });

  it('adds the learner, and a team of one for an Owner, without touching the staff snapshot', () => {
    const db = withDraft();
    const before = JSON.stringify(db);

    const agent = previewDb(db, 'agent');
    expect(agent.users.filter((u) => u.id === PREVIEW_USER_ID)).toHaveLength(1);
    expect(agent.teams).toBe(db.teams);

    const owner = previewDb(db, 'owner');
    const team = owner.teams.find((t) => t.id === PREVIEW_TEAM_ID);
    expect(team).toMatchObject({ ownerId: PREVIEW_USER_ID, seats: db.tiers.find((t) => t.id === 'team')!.seats });
    expect(owner.users.find((u) => u.id === PREVIEW_USER_ID)).toMatchObject({ teamId: PREVIEW_TEAM_ID });

    expect(JSON.stringify(db)).toBe(before);
  });

  it('builds an Agent and a Team Owner that the tier lock tells apart', () => {
    const db = seed('live');
    const agent = previewLearner(db, 'agent');
    const owner = previewLearner(db, 'owner');
    expect(agent).toMatchObject({ tier: 'agent', role: 'Agent', teamId: null, status: 'active', email: '', progress: {} });
    expect(owner).toMatchObject({ tier: 'team', role: 'Team Owner', teamId: PREVIEW_TEAM_ID });
    // The live cohort, so sessions and replays line up.
    expect(agent.cohortId).toBe(db.cohorts.find((c) => c.status === 'live')!.id);

    const teamOnly = db.modules.filter((m) => m.tier === 'team');
    expect(teamOnly.length).toBeGreaterThan(0);
    for (const m of teamOnly) {
      expect(canAccess(agent, m), m.id).toBe(false);
      expect(canAccess(owner, m), m.id).toBe(true);
    }
    for (const m of db.modules.filter((x) => x.tier === 'agent')) expect(canAccess(agent, m), m.id).toBe(true);
  });
});

describe('withPreview', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows staff the portal as a read-only learner', async () => {
    const inner = createFixtureRepository('admin', 'live');
    const repo = withPreview(inner, 'owner');

    expect(await repo.viewer()).toEqual({ actor: { kind: 'learner', userId: PREVIEW_USER_ID }, role: 'owner', preview: 'owner' });
    const db = await repo.snapshot();
    expect(db.users.find((u) => u.id === PREVIEW_USER_ID)).toMatchObject({ tier: 'team', role: 'Team Owner' });
    // The staff member is not enrolled anywhere: the learner exists only in this snapshot.
    expect((await inner.snapshot()).users.some((u) => u.id === PREVIEW_USER_ID)).toBe(false);
  });

  it('refuses every mutation before it reaches the repository, and opens no Zoom', async () => {
    const inner = createFixtureRepository('admin', 'live');
    const run = vi.spyOn(inner, 'run');
    const join = vi.spyOn(inner, 'joinTicket');
    const repo = withPreview(inner, 'agent');
    const before = JSON.stringify(await inner.snapshot());

    const db = await repo.snapshot();
    const m = visibleModules(db)[0]!;
    expect(await repo.run('toggleStep', { moduleId: m.id, stepId: m.checklist[0]!.id })).toEqual({ error: PREVIEW_ONLY });
    expect(await repo.run('requestUpgrade', { source: 'Vault' })).toEqual({ error: PREVIEW_ONLY });
    expect(await repo.joinTicket(db.sessions[0]!.id)).toEqual({ kind: 'preview' });

    expect(run).not.toHaveBeenCalled();
    expect(join).not.toHaveBeenCalled();
    expect(JSON.stringify(await inner.snapshot())).toBe(before);
  });

  it('refuses the audited Build actions too (D-172), and the fixture runs them for staff', async () => {
    const inner = createFixtureRepository('admin', 'live');
    const act = vi.spyOn(inner, 'act');
    const repo = withPreview(inner, 'owner');
    expect(await repo.act('duplicateModule', { id: 'sales' })).toEqual({ error: PREVIEW_ONLY });
    expect(act).not.toHaveBeenCalled();

    // Outside a preview, the fixture runs the same function the API runs, without its audit row.
    const out = await inner.act('duplicateModule', { id: 'sales' });
    expect(out).toEqual({ toast: { msg: 'Duplicated as a draft', tone: 'success' } });
    expect((await inner.snapshot()).modules.some((m) => m.name === 'Sales AI Employee (copy)')).toBe(true);
    // A refusal is the inline error, as a mutation's is.
    expect(await createFixtureRepository('agent', 'live').act('duplicateModule', { id: 'sales' })).toEqual({
      error: 'You don’t have permission to do that.',
    });
  });

  it('does nothing for a learner who adds the flag', async () => {
    const inner = createFixtureRepository('agent', 'live');
    const repo = withPreview(inner, 'owner');

    const viewer = await repo.viewer();
    expect(viewer).toEqual(await inner.viewer());
    expect(viewer.preview).toBeUndefined();
    const db = await repo.snapshot();
    expect(db.users.some((u) => u.id === PREVIEW_USER_ID)).toBe(false);
    expect(db.modules).toEqual((await inner.snapshot()).modules);

    // Their own mutations still go through.
    const { actor } = viewer;
    const me = actor.kind === 'learner' ? db.users.find((u) => u.id === actor.userId) : undefined;
    const run = vi.spyOn(inner, 'run');
    const m = visibleModules(db).find((x) => canAccess(me, x))!;
    const r = await repo.run('toggleStep', { moduleId: m.id, stepId: m.checklist[0]!.id });
    expect(run).toHaveBeenCalledOnce();
    expect(r.error).toBeUndefined();
  });
});

// D-188: a preview tab puts nothing in the bucket; fixture mode records a file without sending it.
describe('uploads in a preview tab and in fixture mode (D-188)', () => {
  const file = () => new File([new Uint8Array(10)], 'Week 1.mp4', { type: 'video/mp4' });

  it('refuses an upload in a staff preview tab, as it refuses every write', async () => {
    const inner = createFixtureRepository('admin', 'live');
    const upload = vi.spyOn(inner, 'upload');
    expect(await withPreview(inner, 'owner').upload(file())).toEqual({ ok: false, error: PREVIEW_ONLY });
    expect(upload).not.toHaveBeenCalled();
  });

  it('records the file in fixture mode with a key of the upload route’s shape, and sends nothing', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    try {
      const progress: number[] = [];
      const out = await createFixtureRepository('admin', 'live').upload(file(), (p) => progress.push(p));
      expect(out).toMatchObject({ ok: true, file: { name: 'Week 1.mp4', size: 10, type: 'video/mp4' } });
      if (out.ok) expect(out.file.key).toMatch(/^uploads\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.mp4$/);
      expect(progress).toEqual([1]);
      expect(fetchSpy).not.toHaveBeenCalled();
      // A file the API would refuse is refused here too.
      expect(await createFixtureRepository('admin', 'live').upload(new File(['x'], 'page.html'))).toEqual({ ok: false, error: 'Choose a JSON, PDF, Markdown, ZIP, MP4, Excel, CSV, JPG or VTT file.' });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('runs the Vault’s upload actions in the browser, with no stored key in what the screen gets', async () => {
    const repo = createFixtureRepository('admin', 'live');
    const up = await repo.upload(new File([new Uint8Array(2048)], 'leads.csv'));
    if (!up.ok) throw new Error(up.error);
    const out = await repo.act('publishVaultFile', { title: 'Lead list', desc: '', cat: 'Lead Generation Scripts', type: 'Prompt pack', tier: 'agent', file: up.file });
    expect(out).toEqual({ toast: { msg: 'Lead list published to the vault', tone: 'success' } });
    expect((await repo.snapshot()).resources[0]).toMatchObject({ title: 'Lead list', size: '2 KB' });
  });
});
