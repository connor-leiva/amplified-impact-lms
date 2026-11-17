// /admin/search (D-160 R2-1c; spec § 7.5, D-158's API). The mockup has no frame for this page, so it
// is built from the R2 pieces: the page head, the filter box, and one card per group of results. Pure.
//
// Groups: Pages (the viewer's own sidebar rows, filtered here), then the API's Users, Workspaces,
// Orders and Skills, five each. A hit that opens nowhere yet (a skill, until Build) is listed, not
// linked.

import { cleanSearch } from '@ai/core';
import type { SearchResults } from '@ai/core';

export const SEARCH_COPY = {
  title: 'Search',
  description: 'Find a user, a workspace, an order or a skill by name, email or ID.',
  field: 'Search users, workspaces, orders, skills, pages',
  start: { title: 'Search the admin', body: 'Type at least two characters.' },
  none: (q: string) => `No results for "${q}"`,
  noneBody: 'Try a name, an email, or an invoice ID.',
} as const;

export interface SearchHitVM {
  key: string;
  label: string;
  detail: string;
  to: string | null;
  mono: boolean;
}

export interface SearchSection {
  title: string;
  hits: SearchHitVM[];
}

const GROUPS = [
  ['users', 'Users'],
  ['workspaces', 'Workspaces'],
  ['orders', 'Orders'],
  ['skills', 'Skills'],
] as const;

/** The page's sections for `q`: none until it is a search (2 to 100 characters). */
export function searchSections(
  q: string,
  pages: readonly { id: string; label: string; to: string }[],
  api: SearchResults | null,
): SearchSection[] | null {
  const words = cleanSearch(q);
  if (!words) return null;
  const s = words.toLowerCase();
  const out: SearchSection[] = [];
  const p = pages.filter((x) => x.label.toLowerCase().includes(s));
  if (p.length)
    out.push({
      title: 'Pages',
      hits: p.map((x) => ({ key: `p:${x.id}`, label: x.label, detail: '', to: x.to, mono: false })),
    });
  for (const [g, title] of GROUPS) {
    const hits = api?.[g] ?? [];
    if (hits.length)
      out.push({
        title,
        hits: hits.map((h) => ({
          key: `${g}:${h.id}`,
          label: h.label,
          detail: h.detail,
          to: h.href,
          mono: g === 'orders',
        })),
      });
  }
  return out;
}
