import { describe, expect, it } from 'vitest';
import { canAccess, statusOf } from '@ai/core';
import { parityDb } from './parity-r2-db';
import { BUILDER_STEPS, MODS0, USERS } from './parity-r2';

// D-160 R2-2 and R2-3: the parity snapshot is the mockup's data in the app's own shapes.

describe('the R2 parity snapshot (D-160 R2-2)', () => {
  const db = parityDb();

  it('has MODS0 as its curriculum, in order', () => {
    expect(db.modules.map((m) => m.name)).toEqual(MODS0.map((m) => m.n));
    expect(db.modules.map((m) => m.order)).toEqual(MODS0.map((_, i) => i + 1));
    expect(db.modules.filter((m) => m.status === 'draft')).toHaveLength(6);
    expect(db.modules.filter((m) => m.tier === 'agent').map((m) => m.id)).toEqual(['m1', 'm4', 'm6']);
    expect(db.modules.map((m) => m.checklist.length)).toEqual(MODS0.map((m) => m.steps));
    expect(db.modules.map((m) => m.files.length)).toEqual(MODS0.map((m) => m.files));
    expect(db.modules[0]!.checklist.map((s) => s.kind)).toEqual(BUILDER_STEPS.map((s) => s[0]));
  });

  it('has one cohort, started Wed, Dec 2 at 12:00 PM MST, with six Wednesday sessions', () => {
    expect(db.cohorts.map((c) => [c.name, c.enrolled, c.cadence])).toEqual([
      ['December 2026', 148, 'Wednesdays, weekly'],
    ]);
    expect(db.cohorts[0]!.start).toBe(Date.parse('2026-12-02T12:00:00-07:00'));
    expect(db.sessions.map((s) => new Date(s.start).toISOString())).toEqual([
      '2026-12-02T19:00:00.000Z',
      '2026-12-09T19:00:00.000Z',
      '2026-12-16T19:00:00.000Z',
      '2026-12-23T19:00:00.000Z',
      '2026-12-30T19:00:00.000Z',
      '2027-01-06T19:00:00.000Z',
    ]);
    expect(db.sessions.map((s) => s.replay)).toEqual(['ready', 'ready', null, null, null, null]);
  });

  it('models the mockup’s seven learners; with them, Curriculum’s Deployed is the mockup’s dep', () => {
    expect(db.users.map((u) => u.name)).toEqual(USERS.map((u) => u.n));
    const users = db.users.filter((u) => u.status !== 'invited');
    const dep = (id: string) => {
      const m = db.modules.find((x) => x.id === id)!;
      const pool = users.filter((u) => canAccess(u, m));
      const b = db.base.mod[id]!;
      return Math.round(((b[0] + pool.filter((u) => statusOf(u, m) === 'deployed').length) / (b[0] + b[1] + b[2] + pool.length)) * 100);
    };
    expect(['m1', 'm2', 'm3', 'm4', 'm5'].map(dep)).toEqual(MODS0.filter((m) => 'dep' in m).map((m) => ('dep' in m ? m.dep : 0)));
    // 148 enrolled: 104 on Agent Tier, 44 Team seats.
    expect(db.base.learners + users.length).toBe(148);
    expect(db.base.agent + users.filter((u) => u.tier === 'agent').length).toBe(104);
    expect(db.base.teamSeats + users.filter((u) => u.tier === 'team').length).toBe(44);
  });

  it('has the mockup’s teams, tiers, upgrade requests and staff (R2-3)', () => {
    expect(db.teams.map((t) => t.seats).sort((a, b) => a - b)).toEqual([16, 16, 16, 16, 16, 41, 41]);
    expect(db.tiers.map((t) => [t.id, t.seats, t.price])).toEqual([
      ['agent', 1, 995],
      ['team', 16, 4995],
      ['team', 41, 9995],
    ]);
    expect(db.requests.map((q) => [q.name, q.status, q.ask])).toEqual([
      ['Kenji Watanabe', 'new', 'Agent → Team · 16 seats'],
      ['Jordan Hale', 'new', 'Team · 16 seats → 41 seats'],
      ['Rosa Delgado', 'converted', 'Agent → Team · 16 seats'],
    ]);
    expect(db.staff.map((s) => [s.id, s.name, s.role])).toEqual([
      ['st1', 'Connor Leiva', 'Owner'],
      ['st2', 'Avery Stone', 'Admin'],
      ['st3', 'Imani Brooks', 'Support'],
    ]);
  });

  it('gives the Overview its own world: the program as its pages have it, January as a draft, and a roster', () => {
    const o = parityDb('/admin');
    expect(o.cohorts.map((c) => [c.id, c.status])).toEqual([
      ['dec26', 'enrolling'],
      ['jan27', 'draft'],
    ]);
    expect(o.roster).toEqual({ dec26: { teams: ['ws_copperbasin'], learners: ['u_1090'] }, jan27: { teams: [], learners: [] } });
    expect(o.modules.filter((m) => m.kind === 'week')).toHaveLength(9);
    // Everywhere else, the shared snapshot.
    expect(parityDb('/admin/learners')).toEqual(db);
  });

  it('is a fresh copy every time', () => {
    expect(parityDb()).not.toBe(db);
    expect(parityDb()).toEqual(db);
  });
});
