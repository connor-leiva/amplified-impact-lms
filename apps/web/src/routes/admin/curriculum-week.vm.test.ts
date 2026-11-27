// The admin's week labels and Opens text, on the December 2026 course. Week 1 opens at 8:00 AM MT.
// Day-counting from Session 1 would still say Week 6 on Jan 6; these strings must not.
import { describe, expect, it } from 'vitest';
import type { Db } from '@ai/core';
import { planContentV2 } from '@ai/core/seed/content-v2';
import { seedProduction } from '@ai/core/seed/curriculum';
import { planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import { buildHubVM } from '../console/build.vm';
import { cohortsR2VM } from './Cohorts.vm';
import { overviewR2VM } from './Overview.vm';

const at = (day: string, time = '12:00'): number => Date.parse(`${day}T${time}:00-07:00`);
const mstDay = (t: number): string => new Date(t - 7 * 3600_000).toISOString().slice(0, 10);

function courseDb(): Db {
  const db = planContentV2(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db;
  db.modules.find((m) => m.id === 'accelerator-week-0')!.opens = at('2026-11-01', '08:00');
  db.modules.find((m) => m.id === 'accelerator-week-1')!.opens = at('2026-12-02', '08:00');
  // A session the builder added: its number matches no week, and its id names none. Jan 6 is Week 4.
  db.sessions.push({
    id: 's-added',
    cohortId: 'dec26',
    n: 300,
    title: 'Added office hour',
    start: at('2027-01-06', '15:00'),
    mins: 60,
    zoom: '',
    live: false,
    attended: null,
    replay: null,
    views: 0,
  });
  return db;
}

const EXPECTED: Record<string, string> = {
  '2026-12-02': 'Week 1',
  '2026-12-03': 'Week 1',
  '2026-12-09': 'Week 2',
  '2026-12-10': 'Week 2',
  '2026-12-11': 'Week 2',
  '2026-12-16': 'Week 3',
  '2026-12-17': 'Week 3',
  '2026-12-18': 'Week 3',
  '2027-01-06': 'Week 4',
  '2027-01-07': 'Week 4',
  '2027-01-13': 'Week 5',
  '2027-01-14': 'Week 5',
  '2027-01-20': 'Week 6',
  '2027-01-21': 'Week 6',
  '2027-01-27': 'Week 7',
  '2027-01-28': 'Week 7',
  '2027-02-03': 'Week 8',
  '2027-02-04': 'Week 8',
};

describe('admin week labels and Opens text', () => {
  const db = courseDb();
  const before = at('2026-11-22', '09:00');

  it('labels every session by its curriculum week, including one added on Jan 6', () => {
    const vm = cohortsR2VM(db, before, 'dec26')!;
    const labels = Object.fromEntries(db.sessions.map((s) => [s.id, vm.rows.find((r) => r.id === s.id)!.week]));
    for (const s of db.sessions) {
      if (s.id === 's-added') expect(labels[s.id]).toBe('Week 4');
      else expect(labels[s.id], mstDay(s.start)).toBe(EXPECTED[mstDay(s.start)]);
    }
  });

  it('reads Opens from Week 1 at 8:00 AM, and the week counter skips the holiday', () => {
    const early = cohortsR2VM(db, before, 'dec26')!;
    expect(early.facts.opens).toBe('Wed, Dec 2 · 8:00 AM MT / 9:00 AM CT');
    expect(early.facts.week).toBe('Not started');
    expect(cohortsR2VM(db, at('2026-12-23', '09:00'), 'dec26')!.facts.week).toBe('3 of 8');
    expect(cohortsR2VM(db, at('2027-01-06', '11:00'), 'dec26')!.facts.week).toBe('4 of 8');
  });

  it('puts that Opens time in the Overview header and leaves the deploy note on Session 1', () => {
    const vm = overviewR2VM(db, before);
    // R-5 audit (D-267, Connor): the cohort by its own name, then Week 1's opening from its run, in MT and CT.
    expect(vm.subline).toBe('December 2026 Cohort · Week 1 opens Wed, Dec 2 · 8:00 AM MT / 9:00 AM CT · 0 learners enrolled');
    expect(vm.notStarted).toBe('Deploys are counted from the first live build on Wed, Dec 2 at 12:00 PM MT / 1:00 PM CT.');
    expect(vm.started).toBe(false);
  });

  it('uses the same Opens time and week on the Build hub', () => {
    const rows = Object.fromEntries(buildHubVM(db, at('2027-01-06', '11:00'), 'dec26').cohort!.rows.map((r) => [r.label, r.value]));
    expect(rows.Opens).toBe('Wed, Dec 2 · 8:00 AM MT / 9:00 AM CT');
    expect(rows.Week).toBe('4 of 8');
  });
});
