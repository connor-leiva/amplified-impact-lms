// The ⌘K palette's results (D-160 R2-1c, spec § 7.5): the mockup's `searchAll`, over what the Console
// can answer. Pure.
//
//   Pages         the viewer's own sidebar rows, so a page the role can't open is never offered
//                 (spec § 7.5: built client-side and filtered by capability)
//   Users         the API's users group
//   Workspaces    the API's workspaces group
//   AI Employees  the snapshot's modules (Module Builder opens each)
//   Orders        the API's orders group, where the mockup has "Invoices": an order opens its
//                 workspace or its buyer until Billing exists; one that opens nowhere is left out
//
// Empty, it shows five pages and two AI Employees (the mockup's `slice(0, g === 'Pages' ? 5 : 2)`);
// the API's groups need two characters (spec § 7.5), and each group then shows six at most.

import type { IconName, SearchResults } from '@ai/core';

export interface PaletteItem {
  key: string;
  icon: IconName;
  label: string;
  detail?: string;
  to: string;
  mono?: boolean;
}

export type PaletteGroup = readonly [string, PaletteItem[]];

export interface PalettePage {
  id: string;
  label: string;
  icon: IconName;
  to: string;
}

export interface PaletteModule {
  id: string;
  name: string;
  status: string;
}

export const PALETTE_COPY = {
  label: 'Command palette',
  search: 'Command palette search',
  placeholder: 'Search users, workspaces, AI Employees, invoices, pages',
  none: (q: string) => `No results for "${q}"`,
  noneBody: 'Try a name, an email, or an invoice ID.',
  navigate: 'Navigate',
  open: 'Open',
  toggle: 'Toggle',
  close: 'Close',
} as const;

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

export function paletteGroups(
  q: string,
  pages: readonly PalettePage[],
  modules: readonly PaletteModule[],
  api: SearchResults | null,
): PaletteGroup[] {
  const s = q.trim().toLowerCase();
  const m = (t: string) => !s || t.toLowerCase().includes(s);
  const groups: PaletteGroup[] = [
    [
      'Pages',
      pages.filter((p) => m(p.label)).map((p) => ({ key: `p:${p.id}`, icon: p.icon, label: p.label, to: p.to })),
    ],
    [
      'Users',
      (api?.users ?? [])
        .filter((h) => h.href)
        .map((h) => ({ key: `u:${h.id}`, icon: 'r2Users' as const, label: h.label, detail: h.detail, to: h.href! })),
    ],
    [
      'Workspaces',
      (api?.workspaces ?? [])
        .filter((h) => h.href)
        .map((h) => ({
          key: `w:${h.id}`,
          icon: 'r2Workspaces' as const,
          label: h.label,
          detail: h.detail,
          to: h.href!,
        })),
    ],
    [
      'AI Employees',
      modules
        .filter((k) => m(k.name))
        .map((k) => ({
          key: `m:${k.id}`,
          icon: 'r2Curriculum' as const,
          label: k.name,
          detail: cap(k.status),
          to: `/admin/curriculum/${encodeURIComponent(k.id)}`,
        })),
    ],
    [
      'Orders',
      (api?.orders ?? [])
        .filter((h) => h.href)
        .map((h) => ({
          key: `o:${h.id}`,
          icon: 'r2Billing' as const,
          label: h.label,
          detail: h.detail,
          to: h.href!,
          mono: true,
        })),
    ],
  ];
  return groups
    .map(([g, items]) => [g, s ? items.slice(0, 6) : items.slice(0, g === 'Pages' ? 5 : 2)] as const)
    .filter(([, items]) => items.length > 0);
}
