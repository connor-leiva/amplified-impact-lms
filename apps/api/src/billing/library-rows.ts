// What the platform's library lists (D-079, D-100): the `skills` table's rows, from two catalogs that
// stay apart. The Claude Skills come from `SKILL_CATALOG` and `FREE_SKILLS`; the Grok Bot templates
// from `GROK_TEMPLATES` and `FREE_GROK_TEMPLATES`, each with one file of the kind `grok`. One table, so
// the access rule (`canOpenSkill`) and the download route treat a paid template as they treat a paid
// skill; two lists, so a template is never counted, packed or freed as a Claude Skill.

import { GROK_TEMPLATES, isFreeGrokTemplate } from '@ai/core/grok-templates';
import type { SkillSet } from './catalog';
import { isFreeSkill, SKILL_CATALOG } from './skills-catalog';

export interface LibraryRow {
  id: string;
  title: string;
  summary: string;
  sets: SkillSet;
  free: boolean;
  /** The ZIPs it ships as, by kind, under `apps/web/public/downloads`. */
  files: { claude?: string; chatgpt?: string; practice?: string; grok?: string };
  /** What rebuilds those ZIPs, for the loader's error when one is missing. */
  build: string;
}

export const LIBRARY_ROWS: readonly LibraryRow[] = [
  ...SKILL_CATALOG.map((s) => ({
    id: s.id,
    title: s.title,
    summary: s.summary,
    sets: s.sets,
    free: isFreeSkill(s.id),
    files: s.files,
    build: 'node scripts/skills.mjs build',
  })),
  ...GROK_TEMPLATES.map((g) => ({
    id: g.id,
    title: g.title,
    summary: g.summary,
    sets: g.sets,
    free: isFreeGrokTemplate(g.id),
    files: { grok: g.file },
    build: 'node scripts/grok-templates.mjs build',
  })),
];
