import { describe, expect, it } from 'vitest';
import { searchSections } from './search.vm';

// D-160 R2-1c (spec § 7.5): the Search page's sections.

const PAGES = [
  { id: 'workspaces', label: 'Workspaces', to: '/admin/workspaces' },
  { id: 'users', label: 'Users', to: '/admin/users' },
];
const API = {
  users: [
    { id: 'u_1042', label: 'Elena Vargas', detail: 'elena@northshoregroup.example', href: '/admin/users/u_1042' },
  ],
  workspaces: [],
  orders: [{ id: 'in_1', label: 'in_1', detail: 'Team Plan, Paid', href: '/admin/workspaces/ws_northshore' }],
  skills: [{ id: 'perfect-week', label: 'Perfect Week', detail: 'Agent Skills', href: null }],
};

describe('the Search page (spec § 7.5)', () => {
  it('waits for two characters', () => {
    expect(searchSections('w', PAGES, API)).toBeNull();
    expect(searchSections('  ', PAGES, API)).toBeNull();
  });

  it('lists the viewer’s matching pages, then the API’s groups in order; a skill opens nowhere yet', () => {
    const s = searchSections('work', PAGES, API)!;
    expect(s.map((x) => x.title)).toEqual(['Pages', 'Users', 'Orders', 'Skills']);
    expect(s[0]!.hits).toEqual([
      { key: 'p:workspaces', label: 'Workspaces', detail: '', to: '/admin/workspaces', mono: false },
    ]);
    expect(s[2]!.hits[0]!.mono).toBe(true);
    expect(s[3]!.hits[0]!.to).toBeNull();
  });

  it('is empty when nothing matches', () => {
    expect(searchSections('zz', PAGES, { users: [], workspaces: [], orders: [], skills: [] })).toEqual([]);
  });
});
