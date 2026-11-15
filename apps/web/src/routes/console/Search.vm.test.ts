import { describe, expect, it } from 'vitest';
import { seed } from '@ai/core';
import type { SearchResults } from '@ai/core';
import { consoleNav } from '../../shell/navModel';
import { GROUP_LABELS, SEARCH_COPY, consolePages, flatItems, isPaletteShortcut, moveCursor, resultSections, searchable } from './Search.vm';

// Search and the ⌘K palette (D-158, spec § 7.5): what is sent, how the groups are built, the pages a
// role may open, and the keyboard's rule.

const results: SearchResults = {
  users: [{ id: 'u_jamie', label: 'Jamie Ortiz', detail: 'jamie@example.com', href: '/admin/users/u_jamie' }],
  workspaces: [],
  orders: [{ id: 'ord_1', label: 'ord_1', detail: 'Team Plan, Paid', href: '/admin/workspaces/harbor' }],
  skills: [{ id: 'perfect-week', label: 'Perfect Week', detail: 'Agent Skills', href: null }],
};

describe('Search.vm (D-158)', () => {
  it('sends 2 to 100 characters, trimmed', () => {
    expect(searchable(' a ')).toBeNull();
    expect(searchable(' ab ')).toBe('ab');
    expect(searchable('x'.repeat(101))).toBeNull();
  });

  it('offers only the pages the role’s sidebar has', () => {
    const db = seed('live');
    const owner = consolePages(consoleNav(db, { pathname: '/admin' }, false, 'Owner')).map((p) => p.label);
    expect(owner).toContain('Roles & Permissions');
    expect(owner).toContain('Workspaces');
    expect(owner).toHaveLength(14);
    const support = consolePages(consoleNav(db, { pathname: '/admin' }, false, 'Support')).map((p) => p.label);
    expect(support).not.toContain('Roles & Permissions');
    expect(support).toContain('Search');
    const instructor = consolePages(consoleNav(db, { pathname: '/admin' }, false, 'Instructor')).map((p) => p.label);
    expect(instructor).not.toContain('Workspaces');
    expect(instructor).not.toContain('Audit Log');
    // Pages are found whatever the groups' open state: a closed group still lists its rows.
    expect(consolePages(consoleNav(db, { pathname: '/admin' }, false, 'Owner', { Support: false })).map((p) => p.label)).toContain('Users');
  });

  it('groups results in a fixed order, then the pages that match, leaving empty groups out', () => {
    const pages = [
      { key: 'page:users', label: 'Users', detail: 'Support', to: '/admin/users', mono: false },
      { key: 'page:audit', label: 'Audit Log', detail: 'Operations', to: '/admin/audit', mono: false },
    ];
    const page = resultSections(results, pages, 'us', { navigable: false });
    expect(page.map((s) => s.label)).toEqual(['Users', 'Orders', 'Skills', 'Admin Pages']);
    expect(page.find((s) => s.group === 'orders')!.items[0]!.mono).toBe(true);
    expect(page.find((s) => s.group === 'pages')!.items.map((i) => i.label)).toEqual(['Users']);
    // The palette leaves out what opens nowhere.
    const palette = resultSections(results, pages, 'us', { navigable: true });
    expect(palette.map((s) => s.label)).toEqual(['Users', 'Orders', 'Admin Pages']);
    expect(flatItems(palette).map((i) => i.key)).toEqual(['users:u_jamie', 'orders:ord_1', 'page:users']);
    // No query yet: every page, nothing else.
    expect(resultSections(null, pages, '', { navigable: true }).map((s) => s.label)).toEqual([GROUP_LABELS.pages]);
  });

  it('moves the highlight with the arrows and stops at the ends', () => {
    expect(moveCursor(0, 'ArrowUp', 3)).toBe(0);
    expect(moveCursor(0, 'ArrowDown', 3)).toBe(1);
    expect(moveCursor(2, 'ArrowDown', 3)).toBe(2);
    expect(moveCursor(2, 'Home', 3)).toBe(0);
    expect(moveCursor(0, 'End', 3)).toBe(2);
    expect(moveCursor(5, 'ArrowDown', 0)).toBe(0);
  });

  it('opens on ⌘K and Ctrl+K only', () => {
    const k = (over: Partial<KeyboardEvent>) => ({ key: 'k', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...over });
    expect(isPaletteShortcut(k({ metaKey: true }))).toBe(true);
    expect(isPaletteShortcut(k({ ctrlKey: true, key: 'K' }))).toBe(true);
    expect(isPaletteShortcut(k({}))).toBe(false);
    expect(isPaletteShortcut(k({ ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isPaletteShortcut(k({ ctrlKey: true, key: 'j' }))).toBe(false);
  });

  it('says what to try when nothing matches', () => {
    expect(SEARCH_COPY.none('zzz')).toBe('Nothing matches “zzz”. Try a name, an email, or an order ID.');
  });
});
