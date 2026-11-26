import { describe, expect, it } from 'vitest';
import { navPages } from './adminNav';
import { PALETTE_COPY, paletteGroups } from './palette.vm';
import type { PalettePage } from './palette.vm';

// D-160 R2-1c (spec § 7.5): the ⌘K palette's groups, the mockup's `searchAll` over the Console. D-253: the four pages
// and their tabs, and the mockup's names for its groups.

const PAGES: PalettePage[] = navPages('Owner', false, 'dec26');
const MODS = [
  { id: 'marketing', name: 'Marketing AI Employee', status: 'published' },
  { id: 'sales', name: 'Sales AI Employee', status: 'draft' },
  { id: 'database', name: 'Database AI Employee', status: 'scheduled' },
];

describe('the ⌘K palette (spec § 7.5)', () => {
  it('empty, shows five pages (the single rows) and two weeks, as the mockup does', () => {
    const g = paletteGroups('', PAGES, MODS, null, 'dec26');
    expect(g.map(([name, items]) => [name, items.length])).toEqual([
      ['Pages', 5],
      ['Weeks', 2],
    ]);
    expect(g[0]![1].map((p) => p.label)).toEqual(['Overview', 'Program', 'Cohort', 'People', 'Revenue']);
    expect(g[1]![1][0]).toMatchObject({
      label: 'Marketing AI Employee',
      detail: 'Published',
      to: '/admin/program/weeks/marketing',
    });
  });

  it('lists the four pages’ tabs once something is typed (the mockup’s third pass)', () => {
    const g = paletteGroups('people', PAGES, MODS, null, 'dec26');
    expect(g[0]).toEqual([
      'Pages',
      [
        { key: 'p:people', icon: 'r2Users', label: 'People', to: '/admin/people' },
        { key: 'p:cohort:people', icon: 'r2Cohorts', label: 'Cohort › People', to: '/admin/cohort/dec26/people' },
        { key: 'p:people:everyone', icon: 'r2Users', label: 'People › Everyone', to: '/admin/people' },
        { key: 'p:people:teams', icon: 'r2Users', label: 'People › Teams', to: '/admin/people/teams' },
        { key: 'p:people:masquerade', icon: 'r2Users', label: 'People › Masquerade', to: '/admin/people/masquerade' },
      ],
    ]);
    expect(paletteGroups('course set', PAGES, MODS, null)[0]![1].map((p) => [p.label, p.to])).toEqual([['Program › Course Settings', '/admin/program/course']]);
  });

  it('with words, filters pages and weeks and adds the API’s people, teams and orders, at their new addresses', () => {
    const api = {
      users: [{ id: 'u_1', label: 'Elena Vargas', detail: 'elena@x.example', href: '/admin/users/u_1' }],
      workspaces: [{ id: 'ws_1', label: 'Northshore Group', detail: '', href: '/admin/workspaces/ws_1' }],
      orders: [
        { id: 'o_1', label: 'o_1', detail: 'Team Plan, Paid', href: '/admin/workspaces/ws_1' },
        { id: 'o_2', label: 'o_2', detail: 'Insiders, Paid', href: null },
      ],
      skills: [{ id: 's', label: 'Sales Skill', detail: '', href: null }],
    };
    const g = paletteGroups('sa', PAGES, MODS, api, 'dec26');
    expect(g.map(([name]) => name)).toEqual(['Pages', 'Users', 'Teams', 'Weeks', 'Orders']);
    expect(g[0]![1].map((p) => p.label)).toEqual(['Revenue › Usage']);
    expect(g.find(([n]) => n === 'Users')![1][0]!.to).toBe('/admin/people/u_1');
    expect(g.find(([n]) => n === 'Teams')![1][0]!.to).toBe('/admin/people/teams/ws_1');
    expect(g.find(([n]) => n === 'Orders')![1]).toEqual([
      {
        key: 'o:o_1',
        icon: 'r2Billing',
        label: 'o_1',
        detail: 'Team Plan, Paid',
        to: '/admin/people/teams/ws_1',
        mono: true,
      },
    ]);
  });

  it('has the mockup’s words', () => {
    expect(PALETTE_COPY.placeholder).toBe('Search people, teams, weeks, invoices, pages');
    expect(PALETTE_COPY.none('zz')).toBe('No results for "zz"');
  });
});
