// /admin/search and the ⌘K command palette (D-158, spec § 7.5): the words, the groups and the
// keyboard's rule. Pure; Search.tsx and CommandPalette.tsx only render it.
//
// The API answers four groups (users, workspaces, orders, skills; 2 to 100 characters, five each).
// The fifth, Admin Pages, is built here from the sidebar the viewer already has (`consoleNav`, which
// filters each Console row by the role's capability), so a page the role can't open is never offered.
// A skill opens nowhere in the Console until Build (PR 10): the Search page lists it as text, and the
// palette, whose every row must go somewhere, leaves it out.

import { SEARCH_MAX, SEARCH_MIN } from '@ai/core';
import type { SearchResults } from '@ai/core';
import type { NavGroup } from '../../shell/navModel';

export const SEARCH_COPY = {
  title: 'Search',
  description: 'Find a user, workspace, order, skill, or Console page.',
  openPalette: 'Open Command Palette',
  shortcut: '⌘K',
  input: 'Search everything',
  hint: 'Type 2 or more characters to search users, workspaces, orders, and skills.',
  none: (q: string) => `Nothing matches “${q}”. Try a name, an email, or an order ID.`,
  keyboard: 'Keyboard',
  keys: [
    ['⌘K or Ctrl+K', 'Open the command palette from anywhere in Console'],
    ['↑ ↓ then Enter', 'Move through results and open one'],
    ['Esc', 'Close the palette'],
    ['Tab', 'Move focus. Every control shows a focus ring.'],
  ] as [string, string][],
  results: 'Results',
} as const;

export const PALETTE_COPY = {
  label: 'Command palette',
  input: 'Command palette search',
  placeholder: 'Jump to a user, workspace, order, or page',
  close: 'Close',
  results: 'Palette results',
} as const;

export const GROUP_LABELS = { users: 'Users', workspaces: 'Workspaces', orders: 'Orders', skills: 'Skills', pages: 'Admin Pages' } as const;
export type ResultGroup = keyof typeof GROUP_LABELS;

export interface ResultItem {
  key: string;
  label: string;
  detail: string;
  /** Where it opens, or null (a skill, until Build exists). */
  to: string | null;
  /** Ids and order numbers are set in Geist Mono. */
  mono: boolean;
}

export interface ResultSection {
  group: ResultGroup;
  label: string;
  items: ResultItem[];
}

/** The query as the API takes it, or null while it is too short or too long to send. */
export const searchable = (q: string): string | null => {
  const t = q.trim();
  return t.length >= SEARCH_MIN && t.length <= SEARCH_MAX ? t : null;
};

/** Every Console page in the viewer's sidebar, once each, in sidebar order. */
export function consolePages(groups: readonly NavGroup[]): ResultItem[] {
  const seen = new Set<string>();
  const out: ResultItem[] = [];
  for (const g of groups) {
    for (const i of g.items) {
      if (!('to' in i.action) || seen.has(i.action.to)) continue;
      seen.add(i.action.to);
      out.push({ key: `page:${i.key}`, label: i.label, detail: g.label ?? '', to: i.action.to, mono: false });
    }
  }
  return out;
}

/**
 * The sections to show: the API's four (when there is a query), then the pages whose name holds the
 * words. `navigable` leaves out what opens nowhere (the palette's rule). Empty groups are left out.
 */
export function resultSections(results: SearchResults | null, pages: readonly ResultItem[], q: string, opts: { navigable: boolean }): ResultSection[] {
  const words = q.trim().toLowerCase();
  const out: ResultSection[] = [];
  if (results) {
    for (const group of ['users', 'workspaces', 'orders', 'skills'] as const) {
      const items = results[group]
        .map((h): ResultItem => ({ key: `${group}:${h.id}`, label: h.label, detail: h.detail, to: h.href, mono: group === 'orders' }))
        .filter((i) => !opts.navigable || i.to !== null);
      if (items.length) out.push({ group, label: GROUP_LABELS[group], items });
    }
  }
  const matching = words ? pages.filter((p) => p.label.toLowerCase().includes(words)) : [...pages];
  if (matching.length) out.push({ group: 'pages', label: GROUP_LABELS.pages, items: matching });
  return out;
}

/** The items the arrow keys walk, in order. */
export const flatItems = (sections: readonly ResultSection[]): ResultItem[] => sections.flatMap((s) => s.items);

/** The next highlighted row: Down and Up move one, and stop at the ends. */
export function moveCursor(current: number, key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End', count: number): number {
  if (count === 0) return 0;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return key === 'ArrowDown' ? Math.min(count - 1, current + 1) : Math.max(0, current - 1);
}

/** Whether a key press opens the palette: ⌘K on a Mac, Ctrl+K elsewhere. */
export const isPaletteShortcut = (e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>): boolean =>
  (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k';

/** The window event the Search page's button sends to open the palette. */
export const OPEN_PALETTE_EVENT = 'ai-console-palette';
