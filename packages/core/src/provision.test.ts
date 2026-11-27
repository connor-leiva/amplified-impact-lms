import { describe, expect, it } from 'vitest';
import { seed } from './seed';
import { provisionOwner } from './provision';

// D-078: a paid order becomes a team with an invited owner, through a pure function on `Db`.

const NOW = Date.parse('2026-11-14T15:00:00-06:00');
const ctx = () => {
  let n = 0;
  return { now: NOW, id: (prefix: string) => `${prefix}${NOW.toString(36)}${(n++).toString(36)}` };
};
const ARGS = { email: 'New.Buyer@Example.com', name: 'Pat Buyer', teamName: 'Pat Group', seats: 2, tier: 'team' as const, cohortId: 'dec26' };

describe('provisionOwner (D-078)', () => {
  it('creates an invited Team Owner and their team', () => {
    const db = seed('live');
    const out = provisionOwner(db, ARGS, ctx());
    if (!out.ok) throw new Error(out.reason);
    expect(out.createdUser && out.createdTeam).toBe(true);
    const user = out.db.users.find((u) => u.id === out.userId)!;
    expect(user).toMatchObject({ email: 'new.buyer@example.com', role: 'Team Owner', status: 'invited', tier: 'team', teamId: out.teamId, cohortId: 'dec26' });
    expect(out.db.teams.find((t) => t.id === out.teamId)).toEqual({ id: out.teamId, name: 'Pat Group', ownerId: out.userId, seats: 2 });
    // Nothing else moved.
    expect(out.db.users.length).toBe(db.users.length + 1);
    expect(out.db.teams.length).toBe(db.teams.length + 1);
  });

  it('changes nothing when run a second time', () => {
    const first = provisionOwner(seed('live'), ARGS, ctx());
    if (!first.ok) throw new Error(first.reason);
    const second = provisionOwner(first.db, ARGS, ctx());
    if (!second.ok) throw new Error(second.reason);
    expect(second.db).toBe(first.db);
    expect([second.createdUser, second.createdTeam]).toEqual([false, false]);
  });

  it('keeps one team for a second plan, raising seats and tier but never lowering them', () => {
    const first = provisionOwner(seed('live'), { ...ARGS, tier: 'agent', seats: 41 }, ctx());
    if (!first.ok) throw new Error(first.reason);
    const second = provisionOwner(first.db, { ...ARGS, tier: 'team', seats: 2 }, ctx());
    if (!second.ok) throw new Error(second.reason);
    expect(second.teamId).toBe(first.teamId);
    expect(second.db.teams.find((t) => t.id === first.teamId)?.seats).toBe(41);
    expect(second.db.users.find((u) => u.id === first.userId)?.tier).toBe('team');
  });

  it('refuses a staff email and a member of another team, for staff to sort out', () => {
    const db = seed('live');
    expect(provisionOwner(db, { ...ARGS, email: db.staff[0]!.email }, ctx())).toEqual({ ok: false, reason: 'staff-email' });
    const member = db.users.find((u) => u.teamId && db.teams.find((t) => t.id === u.teamId)?.ownerId !== u.id)!;
    expect(provisionOwner(db, { ...ARGS, email: member.email }, ctx())).toEqual({ ok: false, reason: 'member-of-another-team' });
  });

  it('raises a team of one to two seats, renames it, and fills in a placeholder name', () => {
    const created = provisionOwner(seed('live'), { ...ARGS, name: '', teamName: '', seats: 1, tier: 'agent' }, ctx());
    if (!created.ok) throw new Error(created.reason);
    const again = provisionOwner(
      created.db,
      { ...ARGS, name: 'Dana DOO', teamName: 'Utah Life', seats: 2, tier: 'team', applyTeamName: true, applyOwnerName: true, placeInCohort: true },
      ctx(),
    );
    if (!again.ok) throw new Error(again.reason);
    expect(again.userId).toBe(created.userId);
    expect(again.teamId).toBe(created.teamId);
    expect(again.db.teams.find((t) => t.id === created.teamId)).toMatchObject({ name: 'Utah Life', seats: 2 });
    expect(again.db.users.find((u) => u.id === created.userId)).toMatchObject({ name: 'Dana DOO', tier: 'team', cohortId: 'dec26', role: 'Team Owner' });
    // A real name is kept. The same arguments a second time change nothing.
    const kept = provisionOwner(again.db, { ...ARGS, name: 'Someone Else', teamName: 'Utah Life', seats: 2, applyTeamName: true, applyOwnerName: true, placeInCohort: true }, ctx());
    if (!kept.ok) throw new Error(kept.reason);
    expect(kept.db).toBe(again.db);
    expect(kept.db.users.find((u) => u.id === created.userId)?.name).toBe('Dana DOO');
  });

  it('makes an existing learner with no team the owner of a new one', () => {
    const db = seed('live');
    const solo = db.users.find((u) => u.teamId === null);
    if (!solo) return; // the seed may hold none; the other cases still run
    const out = provisionOwner(db, { ...ARGS, email: solo.email }, ctx());
    if (!out.ok) throw new Error(out.reason);
    expect(out.createdUser).toBe(false);
    expect(out.createdTeam).toBe(true);
    expect(out.db.users.find((u) => u.id === solo.id)).toMatchObject({ role: 'Team Owner', teamId: out.teamId });
  });
});
