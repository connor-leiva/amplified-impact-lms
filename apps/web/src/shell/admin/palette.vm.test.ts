import { describe, expect, it } from 'vitest';
import { PALETTE_COPY, paletteGroups } from './palette.vm';
import type { PalettePage } from './palette.vm';

// D-160 R2-1c (spec § 7.5): the ⌘K palette's groups, the mockup's `searchAll` over the Console.

const PAGES: PalettePage[] = [
  'Overview',
  'System Health',
  'Curriculum',
  'Module Builder',
  'Resource Vault',
  'Cohorts & Sessions',
].map((label, i) => ({ id: `p${i}`, label, icon: 'r2Overview', to: `/admin/p${i}` }));
const MODS = [
  { id: 'marketing', name: 'Marketing AI Employee', status: 'published' },
  { id: 'sales', name: 'Sales AI Employee', status: 'draft' },
  { id: 'database', name: 'Database AI Employee', status: 'scheduled' },
];

describe('the ⌘K palette (spec § 7.5)', () => {
  it('empty, shows five pages and two AI Employees, as the mockup does', () => {
    const g = paletteGroups('', PAGES, MODS, null);
    expect(g.map(([name, items]) => [name, items.length])).toEqual([
      ['Pages', 5],
      ['AI Employees', 2],
    ]);
    expect(g[1]![1][0]).toMatchObject({
      label: 'Marketing AI Employee',
      detail: 'Published',
      to: '/admin/curriculum/marketing',
    });
  });

  it('with words, filters pages and AI Employees and adds the API’s people, workspaces and orders', () => {
    const api = {
      users: [{ id: 'u_1', label: 'Elena Vargas', detail: 'elena@x.example', href: '/admin/users/u_1' }],
      workspaces: [{ id: 'ws_1', label: 'Northshore Group', detail: '', href: '/admin/workspaces/ws_1' }],
      orders: [
        { id: 'o_1', label: 'o_1', detail: 'Team Plan, Paid', href: '/admin/workspaces/ws_1' },
        { id: 'o_2', label: 'o_2', detail: 'Insiders, Paid', href: null },
      ],
      skills: [{ id: 's', label: 'Sales Skill', detail: '', href: null }],
    };
    const g = paletteGroups('sa', PAGES, MODS, api);
    expect(g.map(([name]) => name)).toEqual(['Users', 'Workspaces', 'AI Employees', 'Orders']);
    expect(g.find(([n]) => n === 'Orders')![1]).toEqual([
      {
        key: 'o:o_1',
        icon: 'r2Billing',
        label: 'o_1',
        detail: 'Team Plan, Paid',
        to: '/admin/workspaces/ws_1',
        mono: true,
      },
    ]);
  });

  it('has the mockup’s words', () => {
    expect(PALETTE_COPY.placeholder).toBe('Search users, workspaces, AI Employees, invoices, pages');
    expect(PALETTE_COPY.none('zz')).toBe('No results for "zz"');
  });
});
