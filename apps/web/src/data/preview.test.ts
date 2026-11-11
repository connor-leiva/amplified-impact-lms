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
