import { describe, expect, it } from 'vitest';
import type { RevenueSummary } from '@ai/core';
import { fixtureRevenueSummary, fixtureRevenueUnreadable } from '../../../data/console-fixture-billing';
import { parityDb } from '../../../data/parity-r2-db';
import { PAYMENTS, SECTION, comingFor, revenueVM, shortUsd } from './revenue.vm';

// R-5 Phase 8 (D-269): Revenue › Summary's view-model. On the parity snapshot and the reference's figures it prints the
// reference's words (`Revenue` in AdminRedesign.jsx; its pixels are `pnpm parity:admin-r2`'s `billing` cells); with
// Stripe unreadable every Stripe figure reads "Unavailable", never a zero.

const NOW = Date.parse('2026-12-10T16:30:00.000Z');
const db = parityDb('/admin/revenue');
const caps = db.cohorts.map((c) => ({ id: c.id, capacity: c.capacity }));
const all = fixtureRevenueSummary(NOW, 'all', caps);

describe('revenueVM (D-269)', () => {
  it('the five figures, each opening the list it counts', () => {
    const vm = revenueVM(all, db, NOW);
    expect(vm.stats.map((s) => [s.label, s.value, s.sub, s.tone ?? null])).toEqual([
      ['Cash collected', '$82,694', 'Since Aug 2026', null],
      ['Still to collect', '$7,500', '2 payments · Wed, Dec 30', 'info'],
      ['Total revenue', '$90,194', 'Collected + still to collect', null],
      ['MRR', '$12,429', '59 subscriptions', 'ok'],
      ['Failed payments', '3', 'Needs review', 'bad'],
    ]);
    expect(vm.stats[1]!.subPhone).toBe('2 payments · Dec 30');
    expect(vm.stats.map((s) => s.to)).toEqual([
      { href: PAYMENTS.invoices },
      { section: SECTION.coming },
      { section: SECTION.products },
      { href: PAYMENTS.subscriptions },
      { href: PAYMENTS.failed },
    ]);
    const month = revenueVM(fixtureRevenueSummary(NOW, 'month', caps), db, NOW);
    expect(month.stats.slice(0, 3).map((s) => [s.value, s.sub])).toEqual([
      ['$8,160', 'Dec 1 to Dec 10'],
      ['$7,500', '2 payments · Wed, Dec 30'],
      ['$15,660', 'Collected + still to collect'],
    ]);
  });

  it('Cash By Month: six months, this one collected under its calendar, and what a month ahead counts', () => {
    const { chart } = revenueVM(all, db, NOW);
    expect(chart!.months.map((m) => [m.label, m.total, m.short, m.now, m.calendar !== null, m.collected !== null])).toEqual([
      ['Sep', '$9,917', '$9.9K', false, false, true],
      ['Oct', '$12,137', '$12K', false, false, true],
      ['Nov', '$45,000', '$45K', false, false, true],
      ['Dec', '$17,805', '$18K', true, true, true],
      ['Jan', '$1,495', '$1.5K', false, true, false],
      ['Feb', '$1,997', '$2K', false, true, false],
    ]);
    expect(chart!.months[2]!.collected).toBe(100);
    expect(chart!.aria).toBe('Cash collected by month from September to December, and what is scheduled for December to February.');
    expect(chart!.note).toBe('December counts two second payments ($7,500) and this month’s renewals. It is not a forecast of new sales.');
    expect(shortUsd(69_500)).toBe('$695');
  });

  it('a card per cohort that is selling or running: December, not January (a draft)', () => {
    const { cards, refunds } = revenueVM(all, db, NOW);
    expect(cards).toEqual([
      {
        cohortId: 'dec26',
        title: 'AI Accelerator',
        sub: 'December 2026 Cohort',
        seats: { pct: (7 / 200) * 100, bar: 'ok', text: '7 of 200' },
        paid: '5 teams · $37,500',
        twoPay: '2 teams · $7,500 in, $7,500 to come',
        refunds: 'None',
        people: '/admin/cohort/dec26/people',
        enrollment: '/admin/cohort/dec26/settings#enrollment',
      },
    ]);
    expect(refunds).toEqual({ value: '$0', line: 'None' });
  });

  it('By Product: a row per cohort, per billing line, and Skills', () => {
    const { products } = revenueVM(all, db, NOW);
    expect(products.map((p) => [p.product, p.line, p.collected, p.still, p.total, p.mrr, p.to])).toEqual([
      ['AI Accelerator', 'December 2026 · 7 of 200 seats', '$45,000', '$7,500', '$52,500', 'One-time', '/admin/cohort/dec26/people'],
      ['AI Accelerator', 'January 2027 · 0 of 200 seats', '$0', '$0', '$0', 'One-time', '/admin/cohort/jan27/people'],
      ['Team Plan · 16 seats', '5 teams · 27 people', '$10,425', '$0', '$10,425', '$3,475', PAYMENTS.subscriptions],
      ['Team Plan · 41 seats', '2 teams · 12 people', '$8,970', '$0', '$8,970', '$2,990', PAYMENTS.subscriptions],
      ['Agent Plan', '46 agents', '$16,146', '$0', '$16,146', '$5,382', PAYMENTS.subscriptions],
      ['Insiders', '6 members', '$1,746', '$0', '$1,746', '$582', PAYMENTS.subscriptions],
      ['Insiders for Agents', '0 members', '$0', '$0', '$0', '$0', PAYMENTS.subscriptions],
      ['Skills', '11 bought', '$407', '$0', '$407', 'One-time', PAYMENTS.invoices],
    ]);
  });

  it('Coming In: the next 60 days, payment by payment', () => {
    const { coming } = revenueVM(all, db, NOW);
    expect(coming!.right).toBe('Next 60 days · $11,237');
    expect(coming!.rows.map((r) => [r.when, r.from, r.for, r.amount, r.status.label, r.to])).toEqual([
      ['Fri, Dec 11', 'Tidewater Property Co.', 'Insiders, second try', '$97', 'Retrying', '/admin/people/teams/ws_tidewater'],
      ['Tue, Dec 15', 'Hale & Marlowe Realty', 'Team Plan renewal', '$695', 'Scheduled', '/admin/people/teams/ws_halemarlowe'],
      ['Sun, Dec 20', 'Red Cliff Collective', 'Agent Plan renewal', '$1,450', 'Scheduled', '/admin/people/teams/ws_redcliff'],
      ['Wed, Dec 30', 'Copper Basin Realty', 'Accelerator, payment 2 of 2', '$3,750', 'Scheduled', '/admin/people/teams/ws_copperbasin'],
      ['Wed, Dec 30', 'Lantern Street Partners', 'Accelerator, payment 2 of 2', '$3,750', 'Scheduled', '/admin/people/teams/ws_lantern'],
      ['Mon, Jan 4', 'Northshore Group', 'Team Plan renewal', '$1,495', 'Scheduled', '/admin/people/teams/ws_northshore'],
    ]);
    expect(comingFor('first', 'membership', 0)).toBe('Insiders, first payment');
    expect(comingFor('retry', 'agents41', 3)).toBe('Team Plan, third try');
  });

  it('Stripe unreadable: "Unavailable", never a zero; the seats are still drawn', () => {
    const s: RevenueSummary = fixtureRevenueUnreadable(all, { reason: 'permission', scope: 'Invoices' });
    const vm = revenueVM(s, db, NOW);
    expect(vm.stats.map((x) => [x.value, x.sub ?? null])).toEqual([
      ['Unavailable', null],
      ['$7,500', '2 payments'],
      ['Unavailable', null],
      ['Unavailable', null],
      ['Unavailable', null],
    ]);
    expect(vm.chart).toBeNull();
    expect(vm.coming).toBeNull();
    expect(vm.refunds.value).toBe('Unavailable');
    expect(vm.cards[0]!.seats.text).toBe('7 of 200');
    expect(vm.products[0]).toMatchObject({ collected: 'Unavailable', still: '$7,500', total: 'Unavailable' });
    expect(vm.products[2]).toMatchObject({ line: 'Unavailable', collected: 'Unavailable', mrr: 'Unavailable' });
  });
});
