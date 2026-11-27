// R-5 Phase 9 (D-270): the Overview's view-model (`homeVM`), the mockup's `Home`. On the parity world (`parityDb('/admin')`,
// the fixture's audiences and Revenue's figures) it prints the R2 reference's Overview, word for word (its pixels are
// `pnpm parity:admin-r2`'s); elsewhere it prints only what the rows say, and "Unavailable", never a zero, for what it
// could not read.
import { describe, expect, it } from 'vitest';
import { ZERO_BASE, seed } from '@ai/core';
import type { CohortFacts, Db } from '@ai/core';
import { parityDb } from '../../data/parity-r2-db';
import { fixtureCohortFacts } from '../../data/fixture-cohort-facts';
import { fixtureAudiences, fixtureRecords } from '../../data/console-fixture-records';
import { fixtureRevenueSummary } from '../../data/console-fixture-billing';
import { homeVM } from './Overview.vm';
import type { HomeInput } from './Overview.vm';

const NOW = Date.parse('2026-12-10T16:30:00.000Z');
const COUNTS = { drafts: 6, requests: 2, incidents: 1, waiting: 0, failed: 3 };
const OPEN = { program: true, cohort: true, people: true, revenue: true };

function parity(over: Partial<HomeInput> = {}): HomeInput {
  const db = parityDb('/admin');
  const facts: Record<string, CohortFacts> = Object.fromEntries(db.cohorts.map((c) => [c.id, fixtureCohortFacts(db, c.id)]));
  return {
    db,
    now: NOW,
    cohortId: 'dec26',
    open: OPEN,
    facts,
    waiting: { dec26: 0 },
    audiences: fixtureAudiences(fixtureRecords()),
    revenue: fixtureRevenueSummary(NOW, 'all', db.cohorts.map((c) => ({ id: c.id, capacity: c.capacity }))),
    counts: COUNTS,
    canBilling: true,
    canPlans: true,
    ...over,
  };
}

describe('homeVM on the parity world: the R2 reference’s Overview (D-270)', () => {
  const vm = homeVM(parity());

  it('draws four tiles, each opening its page', () => {
    expect(vm.tiles.map((t) => [t.label, t.value, t.line, t.to])).toEqual([
      ['Program', 'AI Accelerator', '9 weeks · 3 published, 6 in draft', '/admin/program'],
      ['Cohort', 'December 2026', 'Week 2 of 2 · 1 of 200 seats', '/admin/cohort/dec26'],
      ['People', '16 with a sign-in', '1 in the cohort · 8 Utah Life, kept apart', '/admin/people'],
      ['Revenue', '$82,694 collected', '$7,500 still to collect · $12,429 a month', '/admin/revenue'],
    ]);
  });

  it('groups Needs You by cohort, in start order, then payments and the system, each row opening its place', () => {
    expect(vm.needs.groups.map((g) => [g.label, g.rows.map((r) => r.title)])).toEqual([
      ['December 2026 Cohort', ['5 sessions have no Zoom link']],
      [
        'January 2027 Cohort · Draft',
        ['Sessions', 'Zoom links', 'Week 0 due date', 'Stripe price found for each lookup key', 'Payment Links entered', 'Words learners see', 'Test emails sent', 'Open enrollment'],
      ],
      ['Payments and system', ['3 payments failed', '2 teams asked to move up a plan', '1 incident is open']],
    ]);
    expect(vm.needs.total).toBe(12);
    const system = vm.needs.groups[2]!.rows;
    expect(system.map((r) => [r.detail, r.to])).toEqual([
      ['Stripe is retrying one. Two need a new card.', '/admin/revenue/payments/failed'],
      ['From Kenji Watanabe and Jordan Hale.', '/admin/revenue/plans'],
      ['Open it in Operations.', '/admin/incidents'],
    ]);
    expect(vm.needs.groups[0]!.rows[0]).toMatchObject({ detail: 'The next one without a link is Thu, Dec 10.', to: '/admin/cohort/dec26/schedule' });
    expect(vm.needs.groups[1]!.rows[0]).toMatchObject({ detail: '12 on the calendar. 1 are at the same time as December’s office hours.', to: '/admin/cohort/jan27/schedule' });
  });

  it('draws who has a sign-in, each segment opening People filtered', () => {
    expect(vm.audience!.line).toBe('16 people, each counted once. Utah Life agents are kept out of the learner count and out of revenue.');
    expect(vm.audience!.segments.map((s) => [s.label, s.count, s.to])).toEqual([
      ['AI Accelerator', 1, '/admin/people?gotIn=plan%3Acohort'],
      ['Team Plan', 5, '/admin/people?gotIn=plan%3Aagents'],
      ['Agent Plan', 1, '/admin/people?gotIn=plan%3Aagent_plan'],
      ['Insiders', 1, '/admin/people?gotIn=plan%3Amembership'],
      ['Utah Life', 8, '/admin/people?gotIn=group%3Autah-life'],
    ]);
  });

  it('lists the cohorts and what is coming up across them, every time in MT and CT', () => {
    expect(vm.cohorts.map((c) => [c.name, c.line, c.status])).toEqual([
      ['December 2026 Cohort', '2 weeks · twice a week · opens Sun, Nov 29', 'Active'],
      ['January 2027 Cohort', '6 weeks · twice a week · opens Sun, Dec 27', 'Draft'],
    ]);
    expect(vm.coming.map((c) => [c.day, c.mon, c.line, c.flag])).toEqual([
      ['10', 'Dec', 'Thu · 12:00 PM MT / 1:00 PM CT · December 2026', 'No link'],
      ['16', 'Dec', 'Wed · 12:00 PM MT / 1:00 PM CT · December 2026', 'No link'],
      ['5', 'Jan', 'Tue · 12:00 PM MT / 1:00 PM CT · January 2027', 'No link'],
      ['7', 'Jan', 'Thu · 12:00 PM MT / 1:00 PM CT · January 2027', 'No link'],
    ]);
    expect(vm.schedule).toBe('/admin/cohort/dec26/schedule');
  });
});

describe('homeVM: what it could not read, who may see what, and archived cohorts (D-270)', () => {
  it('says "Unavailable", never a zero, when Stripe or People can’t be read', () => {
    const vm = homeVM(parity({ revenue: null, audiences: null }));
    expect(vm.tiles.find((t) => t.key === 'revenue')).toMatchObject({ value: 'Unavailable', line: '' });
    expect(vm.tiles.find((t) => t.key === 'people')).toMatchObject({ value: 'Unavailable', line: '1 in the cohort' });
    expect(vm.audience).toBeNull();
    // Failed payments then read the sidebar's count, from what Billing holds in memory.
    expect(vm.needs.groups.at(-1)!.rows[0]).toMatchObject({ title: '3 payments failed', detail: 'They need a new card.' });
  });

  it('draws only the tiles and rows the role may open', () => {
    const vm = homeVM(parity({ open: { program: true, cohort: false, people: false, revenue: false }, canBilling: false, canPlans: false }));
    expect(vm.tiles.map((t) => t.key)).toEqual(['program']);
    expect(vm.needs.groups.map((g) => g.label)).toEqual(['Payments and system']);
    expect(vm.needs.groups[0]!.rows.map((r) => r.key)).toEqual(['incidents']);
    expect(vm.audience).toBeNull();
  });

  it('a draft cohort the admin is on reads how much is left before it opens', () => {
    const vm = homeVM(parity({ cohortId: 'jan27' }));
    expect(vm.tiles.find((t) => t.key === 'cohort')).toMatchObject({ value: 'January 2027', line: 'Draft · 8 left before it opens', to: '/admin/cohort/jan27' });
  });

  it('an archived cohort is in no group, list or line', () => {
    const p = parity();
    const db: Db = { ...p.db, cohorts: p.db.cohorts.map((c) => (c.id === 'jan27' ? { ...c, archivedAt: NOW - 1 } : c)) };
    const vm = homeVM({ ...p, db });
    expect(vm.cohorts.map((c) => c.id)).toEqual(['dec26']);
    expect(vm.needs.groups.map((g) => g.label)).toEqual(['December 2026 Cohort', 'Payments and system']);
    expect(vm.coming.every((c) => !c.line.includes('January'))).toBe(true);
  });

  it('on the API’s snapshot (ZERO_BASE, no roster) prints only what the rows say', () => {
    const db: Db = { ...seed('live'), base: { ...ZERO_BASE }, roster: {} };
    const vm = homeVM({ ...parity(), db, cohortId: db.cohorts[0]!.id, facts: null, audiences: null, revenue: null, counts: { ...COUNTS, failed: 0, incidents: 0 } });
    expect(vm.tiles.find((t) => t.key === 'cohort')!.line).toContain(`0 of ${db.cohorts[0]!.capacity} seats`);
    expect(vm.tiles.find((t) => t.key === 'people')!.line).toBe('0 in the cohort');
  });

  it('a Stripe line whose keys are entered says where Stripe’s answer is, as the Overview reads no Stripe', () => {
    const p = parity();
    const db: Db = { ...p.db, cohorts: p.db.cohorts.map((c) => (c.id === 'jan27' ? { ...c, lookupKeyFull: 'jan_full', lookupKeyRollover: 'jan_roll', twoPay: false } : c)) };
    const facts = { ...p.facts!, jan27: { ...p.facts!.jan27!, stripe: undefined } };
    const row = homeVM({ ...p, db, facts }).needs.groups[1]!.rows.find((r) => r.key === 'jan27:stripe')!;
    expect(row.detail).toBe('Entered. What Stripe says is on the cohort’s Settings.');
  });
});
