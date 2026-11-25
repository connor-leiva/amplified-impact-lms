// The ⌘K palette's results (D-160 R2-1c, spec § 7.5): the mockup's `searchAll`, over what the Console
// can answer. Pure.
//
//   Pages         the viewer's own sidebar rows, so a page the role can't open is never offered
//                 (spec § 7.5: built client-side and filtered by capability). D-253: Overview, Program,
//                 Cohort, People and Revenue first, then the system pages; once something is typed, the four
//                 pages' tabs too ("Program › Curriculum", the mockup's third pass), each a tab the role may open.
//   Users         the API's users group
//   Teams         the API's workspaces group (D-253: the mockup's name for it now that Workspaces is People › Teams)
//   Weeks         the snapshot's modules (the week page, today's Module Builder, opens each)
//   Orders        the API's orders group, where the mockup has "Invoices": an order opens its
//                 workspace or its buyer until Billing exists; one that opens nowhere is left out
//
// Empty, it shows five pages and two weeks (the mockup's `slice(0, g === 'Pages' ? 5 : 2)`);
// the API's groups need two characters (spec § 7.5), and each group then shows six at most. The API still
// writes the old addresses in its `href`s; each is opened at its new one (`currentAdminHref`, D-253).

import type { IconName, SearchResults } from '@ai/core';
import { currentAdminHref } from './addresses';

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
  /** One of the four pages' tabs: listed once something is typed. */
  tab?: true;
}

export interface PaletteModule {
  id: string;
  name: string;
  status: string;
}

export const PALETTE_COPY = {
  label: 'Command palette',
  search: 'Command palette search',
  placeholder: 'Search people, teams, weeks, invoices, pages',
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
  cohortId = '',
): PaletteGroup[] {
  const s = q.trim().toLowerCase();
  const m = (t: string) => !s || t.toLowerCase().includes(s);
  const href = (h: string) => currentAdminHref(h, cohortId);
  const groups: PaletteGroup[] = [
    [
      'Pages',
      pages.filter((p) => m(p.label) && (!p.tab || s)).map((p) => ({ key: `p:${p.id}`, icon: p.icon, label: p.label, to: p.to })),
    ],
    [
      'Users',
      (api?.users ?? [])
        .filter((h) => h.href)
        .map((h) => ({ key: `u:${h.id}`, icon: 'r2Users' as const, label: h.label, detail: h.detail, to: href(h.href!) })),
    ],
    [
      'Teams',
      (api?.workspaces ?? [])
        .filter((h) => h.href)
        .map((h) => ({
          key: `w:${h.id}`,
          icon: 'r2Workspaces' as const,
          label: h.label,
          detail: h.detail,
          to: href(h.href!),
        })),
    ],
    [
      'Weeks',
      modules
        .filter((k) => m(k.name))
        .map((k) => ({
          key: `m:${k.id}`,
          icon: 'r2Curriculum' as const,
          label: k.name,
          detail: cap(k.status),
          to: `/admin/program/weeks/${encodeURIComponent(k.id)}`,
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
          to: href(h.href!),
          mono: true,
        })),
    ],
  ];
  return groups
    .map(([g, items]) => [g, s ? items.slice(0, 6) : items.slice(0, g === 'Pages' ? 5 : 2)] as const)
    .filter(([, items]) => items.length > 0);
}
