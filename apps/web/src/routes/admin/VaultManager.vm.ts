// The admin Resource Vault's view-model — SCREENS § 4.6, phase 06 § 6.1.
//
// Ported from `renderVals()` in design-reference/Admin Vault.dc.html. Pure: no React, no hooks, no
// clock read. The snapshot and the screen's local state come in; strings and flags come out. The
// component renders what this returns and computes nothing of its own.
//
// On phase 06 § 6.2: this screen has no `db.base` figure. Every number it shows — the published
// count, the Executive Build Vault count, the download total and each row's downloads — is a
// property of `db.resources`, which the seed models individually; the reference's `renderVals()`
// never touches `db.base` here. `VaultManager.vm.test.ts` pins that by asserting the identical
// summary against a `ZERO_BASE` snapshot, which is what the API returns in http mode.

import { EXEC_CATEGORIES, fmt } from '@ai/core';
import type { Db, IconName, Tier } from '@ai/core';

export type VaultTabId = 'all' | 'library' | 'exec';

/** The upload drawer's draft. The reference's `blank()`. */
export interface VaultUploadForm {
  title: string;
  desc: string;
  cat: string;
  type: string;
  tier: Tier;
  /** The attached file's name, or `null` before one is attached. */
  file: string | null;
}

/** The reference's `blank()`, verbatim: Lead Generation Scripts · Prompt pack · Agent, no file. */
export const blankUploadForm = (): VaultUploadForm => ({
  title: '',
  desc: '',
  cat: 'Lead Generation Scripts',
  type: 'Prompt pack',
  tier: 'agent',
  file: null,
});

/** Everything the screen holds locally. */
export interface VaultManagerUi {
  tab: VaultTabId;
  form: VaultUploadForm;
  /** The drawer's inline validation message, which `uploadResource` returns. */
  err: string;
}

export interface VaultManagerTab {
  id: VaultTabId;
  label: string;
  active: boolean;
}

export interface VaultManagerRow {
  id: string;
  title: string;
  desc: string;
  cat: string;
  type: string;
  /** `412`, through `fmt.num`. */
  dl: string;
  /** `Dec 6`, through `fmt.date`. */
  updated: string;
  /** `Agent + Team` or `Team only` — lowercase `only`, as the reference renders the pill. */
  access: string;
  teamOnly: boolean;
  /** Executive items cannot change tier; the pill only toasts. */
  exec: boolean;
  /** `Published` or `Hidden`. */
  status: string;
  /** Hidden rows render at 55% opacity. */
  published: boolean;
}

export interface VaultManagerDrop {
  label: string;
  sub: string;
  icon: IconName;
  ready: boolean;
  /** What clicking the zone attaches: the slugged title plus the chosen type's extension. */
  nextFile: string;
}

export interface VaultManagerForm extends VaultUploadForm {
  /** The tier actually in force: an executive category is always Team. */
  tierEff: Tier;
  /** True for the three `Exec · …` categories, which force Team and show the note. */
  exec: boolean;
  err: string;
}

export interface VaultManagerVM {
  /** `{n} published · {n} in the Executive Build Vault · {n} downloads`. */
  summary: string;
  tabs: VaultManagerTab[];
  rows: VaultManagerRow[];
  drop: VaultManagerDrop;
  form: VaultManagerForm;
}

const TABS: readonly [VaultTabId, string][] = [
  ['all', 'All'],
  ['library', 'Library'],
  ['exec', 'Executive Vault'],
];

/** The reference's `exts` map: the extension the drop zone gives the attachment, by Type. */
const EXT: Record<string, string> = {
  'Claude Project': 'json',
  'Workflow JSON': 'json',
  'Prompt pack': 'md',
  'PDF guide': 'pdf',
  'Notion template': 'zip',
};

export function vaultManagerVM(db: Db, ui: VaultManagerUi): VaultManagerVM {
  const { tab, form } = ui;

  // Both counts and the download total are the whole pool: the tab filter touches only the rows.
  const published = db.resources.filter((r) => r.status === 'published').length;
  const execCount = db.resources.filter((r) => r.exec).length;
  const downloads = db.resources.reduce((a, r) => a + r.dl, 0);

  // `filter` already returns a copy, and `sort` is stable, so resources updated on the same day
  // keep seed order — which is the order the reference's table shows them in.
  const rows: VaultManagerRow[] = db.resources
    .filter((r) => tab === 'all' || (tab === 'exec' ? r.exec : !r.exec))
    .sort((a, b) => b.updated - a.updated)
    .map((r) => {
      const isPublished = r.status === 'published';
      const teamOnly = r.tier === 'team';
      return {
        id: r.id,
        title: r.title,
        desc: r.desc,
        cat: r.cat,
        type: r.type,
        dl: fmt.num(r.dl),
        updated: fmt.date(r.updated),
        access: teamOnly ? 'Team only' : 'Agent + Team',
        teamOnly,
        exec: r.exec,
        status: isPublished ? 'Published' : 'Hidden',
        published: isPublished,
      };
    });

  const exec = EXEC_CATEGORIES.includes(form.cat);
  const slug = (form.title || 'new-resource').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  // The five `Type` options are this map's five keys, so the fallback is unreachable; it exists
  // only because `noUncheckedIndexedAccess` types the lookup as `string | undefined`.
  const nextFile = `${slug}.${EXT[form.type] ?? 'json'}`;

  return {
    summary: `${published} published · ${execCount} in the Executive Build Vault · ${fmt.num(downloads)} downloads`,
    tabs: TABS.map(([id, label]) => ({ id, label, active: tab === id })),
    rows,
    drop: form.file
      ? {
          label: form.file,
          sub: 'Ready to publish · click to replace',
          icon: 'checkCircle',
          ready: true,
          nextFile,
        }
      : {
          // The reference's `fz.label` is Title Case here while SCREENS § 4.6 quotes it in
          // sentence case. The reference is the oracle and the goldens were captured from it
          // (CLAUDE.md › Sources of truth), so its spelling is what ships.
          label: 'Drop a File or Click to Browse',
          sub: 'JSON, PDF, Markdown or Notion export · up to 25 MB',
          icon: 'upload',
          ready: false,
          nextFile,
        },
    form: { ...form, tierEff: exec ? 'team' : form.tier, exec, err: ui.err },
  };
}
