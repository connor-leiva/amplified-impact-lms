// The Resource & Compliance Vault's view-model — SCREENS § 3.5, phase 05 § 5.1.
//
// Ported from `renderVals()` in design-reference/Portal Vault.dc.html. Pure: no React, no hooks,
// no clock read. `now` and the UI state come in; strings and flags come out. The component renders
// what this returns and computes nothing of its own.

import { CATEGORIES, EXEC_CATEGORIES, fmt } from '@ai/core';
import type { Db, IconName, Learner, Resource } from '@ai/core';

/** The reference's `New` window: updated within three days of `now`. */
const NEW_MS = 3 * 86400000;

/** SCREENS § 3.5: the 38 px tile's glyph, by resource type. The reference's `typeIcon` map. */
const TYPE_ICON: Record<string, IconName> = {
  'Claude Project': 'bot',
  'Workflow JSON': 'fileCode',
  'Prompt pack': 'chat',
  'PDF guide': 'file',
  'Notion template': 'book',
};

export type VaultTabId = 'library' | 'exec';

/** Everything the screen holds locally. `tab` is mirrored in the URL as `?tab=executive`. */
export interface VaultUi {
  tab: VaultTabId;
  q: string;
  cat: string;
  type: string;
}

export interface VaultTab {
  id: VaultTabId;
  label: string;
  count: number;
  /** The executive tab carries a lock for Agent tier. It is still selectable. */
  locked: boolean;
}

export interface VaultChip {
  /** The category, or `''` for `All`. */
  key: string;
  label: string;
  /** Respects the current search and type filter, but not the selected category. */
  count: number;
  active: boolean;
}

/** The file a download hands to the browser. Pure strings; the component does the Blob. */
export interface VaultFile {
  name: string;
  body: string;
  mime: string;
}

export interface VaultRow {
  id: string;
  title: string;
  desc: string;
  cat: string;
  type: string;
  size: string;
  /** `Updated Dec 3`. */
  updated: string;
  /** `18 KB · Updated Dec 3` — the second line of the 130 px column. */
  meta: string;
  isNew: boolean;
  /** Drives the `Team Tier` chip. The reference computes the same predicate twice. */
  teamOnly: boolean;
  /** Team-tier resource seen by an Agent-tier viewer: amber tile, amber `Upgrade` button. */
  locked: boolean;
  icon: IconName;
  actionLabel: string;
  actionIcon: IconName;
  /** A Notion template opens in Notion instead of downloading a file. */
  notion: boolean;
  file: VaultFile;
}

export interface VaultPreviewRow {
  title: string;
  /** `Organizational SOPs · Notion template`. */
  sub: string;
}

export interface VaultUpsell {
  label: string;
  icon: IconName;
  requested: boolean;
}

export interface VaultVM {
  tab: VaultTabId;
  tabs: VaultTab[];
  q: string;
  type: string;
  chips: VaultChip[];
  rows: VaultRow[];
  empty: boolean;
  /**
   * D-150: no published resource at all, in either tab. The screen says "Nothing here yet" in place of
   * an empty list and its filters. Never true for the prototype, whose vault has thirteen.
   */
  nothingYet: boolean;
  /** False only on the executive tab at Agent tier, where the upsell panel replaces the list. */
  showList: boolean;
  execLocked: boolean;
  execPreview: VaultPreviewRow[];
  upsell: VaultUpsell;
}

/** The reference's `ext` / `fname` / `body` trio, verbatim. */
function fileOf(r: Resource): VaultFile {
  const ext =
    r.type === 'Workflow JSON' || r.type === 'Claude Project'
      ? '.json'
      : r.type === 'PDF guide'
        ? '.pdf'
        : '.md';
  return {
    name: r.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + ext,
    body:
      ext === '.json'
        ? JSON.stringify(
            {
              name: r.title,
              type: r.type,
              category: r.cat,
              version: '1.0.0',
              source: 'Amplified Impact Resource Vault',
            },
            null,
            2,
          )
        : `# ${r.title}\n\n${r.desc}\n\nCategory: ${r.cat}\n`,
    mime: ext === '.json' ? 'application/json' : 'text/plain',
  };
}

export function vaultVM(db: Db, user: Learner, now: number, ui: VaultUi): VaultVM {
  const isTeam = user.tier === 'team';
  const published = db.resources.filter((r) => r.status === 'published');
  const library = published.filter((r) => !r.exec);
  const exec = published.filter((r) => r.exec);

  // Tab counts are the whole published pool: they ignore the search, category and type filters.
  const tabs: VaultTab[] = [
    { id: 'library', label: 'Library', count: library.length, locked: false },
    { id: 'exec', label: 'Executive Build Vault', count: exec.length, locked: !isTeam },
  ];

  const pool = ui.tab === 'exec' ? exec : library;
  const cats = ui.tab === 'exec' ? EXEC_CATEGORIES : CATEGORIES;

  const ql = ui.q.trim().toLowerCase();
  const matchQT = (r: Resource): boolean =>
    (!ql || `${r.title} ${r.desc} ${r.cat} ${r.type}`.toLowerCase().includes(ql)) &&
    (!ui.type || r.type === ui.type);

  const chips: VaultChip[] = ['', ...cats].map((key) => ({
    key,
    label: key || 'All',
    count: pool.filter((r) => (!key || r.cat === key) && matchQT(r)).length,
    active: ui.cat === key,
  }));

  // `filter` already returns a copy, and `sort` is stable, so equal `updated` keeps seed order.
  const rows: VaultRow[] = pool
    .filter((r) => (!ui.cat || r.cat === ui.cat) && matchQT(r))
    .sort((a, b) => b.updated - a.updated)
    .map((r) => {
      const locked = r.tier === 'team' && !isTeam;
      const updated = `Updated ${fmt.date(r.updated)}`;
      return {
        id: r.id,
        title: r.title,
        desc: r.desc,
        cat: r.cat,
        type: r.type,
        size: r.size,
        updated,
        meta: `${r.size} · ${updated}`,
        isNew: now - r.updated < NEW_MS,
        teamOnly: locked,
        locked,
        icon: TYPE_ICON[r.type] ?? 'file',
        // The reference's label branch tests `'Notion Template'` (capital T) while the seed, the
        // type `<select>` and the icon branch below all spell it `'Notion template'`. The test
        // therefore never matches, so a Notion row reads `Download` beside the `ext` glyph. The
        // reference is the oracle (CLAUDE.md › Sources of truth) and the goldens were captured
        // from it, so the mismatch is reproduced rather than corrected.
        actionLabel: locked ? 'Upgrade' : r.type === 'Notion Template' ? 'Duplicate' : 'Download',
        actionIcon: locked ? 'lock' : r.type === 'Notion template' ? 'ext' : 'download',
        notion: r.type === 'Notion template',
        file: fileOf(r),
      };
    });

  const requested = db.requests.some(
    (x) => x.userId === user.id && (x.status === 'new' || x.status === 'contacted'),
  );
  const execLocked = ui.tab === 'exec' && !isTeam;

  return {
    tab: ui.tab,
    tabs,
    q: ui.q,
    type: ui.type,
    chips,
    rows,
    empty: !rows.length,
    nothingYet: published.length === 0,
    showList: !execLocked,
    execLocked,
    // The preview list is every executive resource in seed order, unsorted and unfiltered.
    execPreview: exec.map((r) => ({ title: r.title, sub: `${r.cat} · ${r.type}` })),
    upsell: requested
      ? { label: 'Consultation Requested', icon: 'check', requested: true }
      : { label: 'Book Upgrade Consultation', icon: 'calendar', requested: false },
  };
}
