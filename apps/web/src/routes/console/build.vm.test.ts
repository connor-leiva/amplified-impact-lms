// The Build hub's view-model (D-169, spec § 7.2): the five builder screens, the cohort from its own
// data (no "Six weeks"), its seat cap shown locked, and the skill library's rows, read-only.
import { describe, expect, it } from 'vitest';
import { phaseNow, seed } from '@ai/core';
import { buildHubVM, skillVM } from './build.vm';

const WEEK2 = phaseNow('live');

describe('buildHubVM (D-169)', () => {
  it('links the five builder screens, each with what its own page says and the snapshot’s counts', () => {
    const db = seed('live');
    const vm = buildHubVM(db, WEEK2, 'dec26');
    expect(vm.links.map((l) => [l.label, l.to])).toEqual([
      ['Curriculum', '/admin/curriculum'],
      ['Module Builder', '/admin/curriculum/new'],
      ['Resource Vault', '/admin/vault'],
      ['Cohorts & Sessions', '/admin/cohorts'],
      ['Announcements', '/admin/announcements'],
    ]);
    const drafts = db.modules.filter((m) => m.status === 'draft').length;
    expect(vm.links[0]!.meta).toBe(`${db.modules.length} AI Employees · ${drafts} draft`);
    expect(vm.links[1]!.meta).toBeNull();
    expect(vm.links[3]!.meta).toBe(`${db.sessions.filter((s) => s.cohortId === 'dec26').length} sessions`);
  });

  it('draws the cohort from its own row: its weeks, never a typed "six", and the cap locked', () => {
    const db = seed('live');
    const co = db.cohorts.find((c) => c.id === 'dec26')!;
    const vm = buildHubVM(db, WEEK2, 'dec26');
    expect(vm.cohort!.name).toBe(co.name);
    const rows = Object.fromEntries(vm.cohort!.rows.map((r) => [r.label, r.value]));
    expect(rows.Opens).toMatch(/ MT \/ \d{1,2}:\d{2} [AP]M CT$/);
    expect(rows.Enrolled).toBe(`${co.enrolled} learners`);
    expect(vm.cohort!.cap).toBe('15 seats. Product rule, view only.');
    // Its weeks come from the data: change them and the card follows.
    const four = buildHubVM({ ...db, cohorts: db.cohorts.map((c) => (c.id === 'dec26' ? { ...c, weeks: 4 } : c)) }, WEEK2, 'dec26');
    expect(Object.fromEntries(four.cohort!.rows.map((r) => [r.label, r.value])).Weeks).toBe('4 weekly live builds');
    // With no `weeks`, one per live session.
    const none = buildHubVM({ ...db, cohorts: db.cohorts.map((c) => (c.id === 'dec26' ? { ...c, weeks: undefined } : c)) }, WEEK2, 'dec26');
    const n = db.sessions.filter((s) => s.cohortId === 'dec26').length;
    expect(Object.fromEntries(none.cohort!.rows.map((r) => [r.label, r.value])).Weeks).toBe(`${n} weekly live build${n === 1 ? '' : 's'}`);
  });

  it('has no cohort card without a cohort', () => {
    expect(buildHubVM({ ...seed('live'), cohorts: [] }, WEEK2, 'dec26').cohort).toBeNull();
  });

  it('words a skill row: its set, its access, its status and its release day (MT)', () => {
    expect(skillVM({ id: 'perfect-week', title: 'Perfect Week', sets: 'both', free: true, status: 'published', releasedAt: Date.parse('2026-11-01T05:00:00Z') })).toEqual({
      id: 'perfect-week',
      title: 'Perfect Week',
      set: 'Both',
      access: 'Free',
      status: { label: 'Published', tone: 'ok' },
      released: 'Oct 31, 2026',
    });
    expect(skillVM({ id: 'x', title: 'X', sets: 'owner_ops', free: false, status: 'draft', releasedAt: 0 })).toMatchObject({ set: 'Owner-ops', access: 'Plan', status: { label: 'Draft', tone: 'off' } });
  });
});
