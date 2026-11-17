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

import { EXEC_CATEGORIES, adminMonthDay, fmt } from '@ai/core';
import type { Db, IconName, Resource, Tier } from '@ai/core';

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

// ================================================================================================
// R2 (D-160 R2-2b): the Resource Vault of the signed-off Admin redesign (AdminRedesign.jsx `Vault`).
// The same snapshot; the rows in its own order (the vault's, as the mockup's), dates in MST.
// ================================================================================================

export interface VaultR2Row {
  id: string;
  title: string;
  /** A replay or walkthrough: the play glyph instead of the file glyph. */
  video: boolean;
  type: string;
  /** The AI Employee it is attached to, or "—". */
  attached: string;
  tier: Tier;
  tierLabel: string;
  size: string;
  /** How many times learners opened it. */
  opens: number;
  /** `Dec 8`, MST. */
  updated: string;
  updatedAt: number;
  hidden: boolean;
  exec: boolean;
}

export interface VaultR2VM {
  rows: VaultR2Row[];
  /** The Type filter: "All types", then each type in the order the vault first lists it. */
  types: string[];
}

export function vaultR2VM(db: Db): VaultR2VM {
  const name = (id?: string) => (id ? db.modules.find((m) => m.id === id)?.name : undefined) ?? '—';
  const rows = db.resources.map((r): VaultR2Row => ({
    id: r.id,
    title: r.title,
    video: r.type === 'Video',
    type: r.type,
    attached: name(r.module),
    tier: r.tier,
    tierLabel: r.tier === 'team' ? 'Team only' : 'Agent + Team',
    size: r.size,
    opens: r.dl,
    updated: adminMonthDay(r.updated),
    updatedAt: r.updated,
    hidden: r.status === 'hidden',
    exec: r.exec,
  }));
  return { rows, types: ['All types', ...new Set(rows.map((r) => r.type))] };
}

// ================================================================================================
// D-172 R2-gaps: the hover Download and Edit details (the mockup's `Vault` quick action and "…").
// ================================================================================================

/**
 * The file the fixture build saves on Download, where there is no bucket: the reference's `ext` /
 * `fname` / `body` stand-in, as the learner Vault saves it. In http mode the browser goes to
 * `/api/files/resource/:id` instead, which serves the vault's editors the stored object.
 */
export function vaultFileOf(r: Pick<Resource, 'title' | 'type' | 'desc' | 'cat'>): { name: string; body: string; mime: string } {
  const ext = r.type === 'Workflow JSON' || r.type === 'Claude Project' ? '.json' : r.type === 'PDF guide' ? '.pdf' : '.md';
  return {
    name: r.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + ext,
    body:
      ext === '.json'
        ? JSON.stringify({ name: r.title, type: r.type, category: r.cat, version: '1.0.0', source: 'Amplified Impact Resource Vault' }, null, 2)
        : `# ${r.title}\n\n${r.desc}\n\nCategory: ${r.cat}\n`,
    mime: ext === '.json' ? 'application/json' : 'text/plain',
  };
}

/** Edit details' fields, from a resource; `module` is '' for none (the select's value). */
export interface VaultEditForm {
  id: string;
  title: string;
  desc: string;
  cat: string;
  tier: Tier;
  module: string;
}

export const vaultEditForm = (r: Resource): VaultEditForm => ({
  id: r.id,
  title: r.title,
  desc: r.desc,
  cat: r.cat,
  tier: r.tier,
  module: r.module ?? '',
});

/** The form as `editResource` takes it. */
export const vaultEditArgs = (f: VaultEditForm) => ({
  id: f.id,
  title: f.title,
  desc: f.desc,
  cat: f.cat,
  tier: f.tier,
  module: f.module === '' ? null : f.module,
});

/** Edit details' "Attached to" choices: None, then every AI Employee in the curriculum's order. */
export function attachOptions(db: Db): { value: string; label: string }[] {
  return [{ value: '', label: 'None' }, ...[...db.modules].sort((a, b) => a.order - b.order).map((m) => ({ value: m.id, label: m.name }))];
}

/** Whether a category forces Team only (the executive vault), as `editResource` and `uploadResource` decide. */
export const forcesTeam = (cat: string): boolean => EXEC_CATEGORIES.includes(cat);
