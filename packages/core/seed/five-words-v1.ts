// SEED, NOT RUNTIME (D-223). Connor, Nov 20, 2026: on Week 0 step 2, "Know these five words" opens its
// definitions inside the task, as the v6 mockup draws it (handoff/step-page-v6, "Open the five words"), not in a
// separate table under the checklist. The builder already offers this (a checklist item's Card action, D-193),
// and the five words are glossary terms. This step makes that one edit on the stored week, in each path:
//
//   - the item gets the Card action with the five terms (looked up in the cohort's glossary by name);
//   - its detail loses "They're in the table below.";
//   - the table of the five words goes, with the "Know These 5" line right above it.
//
// Nothing else changes. It applies only when the week still holds that table; otherwise it changes nothing and
// says why (staff may already have made the change in the builder).

import { ACCELERATOR_COHORT_ID } from '../src/accelerator';
import type { CheckBlock, PathBlock } from '../src/course-types';
import type { RichText } from '../src/rich-text';
import type { Db } from '../src/types';
import type { DataSkip, DataStepOutcome } from './data-step';
import { WEEK0_MODULE_ID } from './start-here-v1';

export const FIVE_WORDS_V1 = '2026-11-20-five-words-card';

/** The five words, in the item's order. */
export const FIVE_WORDS = ['Skill', 'AI hire', 'Seat card', 'Guardrails', 'AI Office'] as const;

const key = (s: string) => s.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
const isItem = (b: PathBlock): b is CheckBlock => b.type === 'check' && key(b.title) === 'know these five words';
const isWordsTable = (b: PathBlock): boolean => {
  if (b.type !== 'table' || b.rows.length !== FIVE_WORDS.length) return false;
  const firsts = new Set(b.rows.map((r) => key(r[0] ?? '')));
  return FIVE_WORDS.every((w) => firsts.has(key(w)));
};
const isLabel = (b: PathBlock | undefined): boolean =>
  !!b && b.type === 'text' && /^know these (5|five)( words)?[.:]?$/.test(key(b.text));

const TABLE_LINE = /\s*They['’]re in the table below\.?/g;
const trimRich = (rich: RichText): RichText => ({
  ...rich,
  content: rich.content.map((p) => ({
    ...p,
    ...(p.content
      ? { content: p.content.map((n) => ({ ...n, text: n.text.replace(TABLE_LINE, '') })).filter((n, i, all) => n.text !== '' || all.length === 1) }
      : {}),
  })),
});

/** One path's blocks with the edit made, or null when the path doesn't hold the item and its table. */
function editPath(blocks: readonly PathBlock[], terms: string[]): PathBlock[] | null {
  const item = blocks.findIndex(isItem);
  const table = blocks.findIndex(isWordsTable);
  if (item < 0 || table < 0) return null;
  const check = blocks[item] as CheckBlock;
  if (check.action) return null;
  const drop = new Set([table, ...(isLabel(blocks[table - 1]) ? [table - 1] : [])]);
  return blocks.flatMap((b, i): PathBlock[] => {
    if (drop.has(i)) return [];
    if (i !== item) return [b];
    const next: CheckBlock = { ...check, action: { type: 'card', terms } };
    if (check.detail !== undefined) next.detail = check.detail.replace(TABLE_LINE, '').trim();
    if (check.detailRich) next.detailRich = trimRich(check.detailRich);
    return [next];
  });
}

export function planFiveWordsV1(db: Db): DataStepOutcome {
  const skip = (reason: string): DataStepOutcome => ({ db, changes: [], skipped: [{ id: `${WEEK0_MODULE_ID}.five-words`, reason }] });
  const m = db.modules.find((x) => x.id === WEEK0_MODULE_ID);
  if (!m) return skip('Week 0 is not in this database');
  const glossary = db.cohorts.find((c) => c.id === ACCELERATOR_COHORT_ID)?.course?.glossary ?? [];
  const terms = FIVE_WORDS.map((w) => glossary.find((t) => key(t.term) === key(w))?.id);
  if (terms.some((t) => !t)) return skip('the glossary does not have all five words, so the card would be missing some');
  const ids = terms as string[];
  let touched = '';
  const checklist = m.checklist.map((step) => {
    if (!step.paths) return step;
    let changed = false;
    const paths = Object.fromEntries(
      Object.entries(step.paths).map(([platform, path]) => {
        const next = path ? editPath(path.blocks, ids) : null;
        if (!next) return [platform, path];
        changed = true;
        return [platform, { ...path, blocks: next }];
      }),
    ) as typeof step.paths;
    if (!changed) return step;
    touched = step.text;
    return { ...step, paths };
  });
  if (!touched) {
    const skipped: DataSkip[] = [{ id: `${WEEK0_MODULE_ID}.five-words`, reason: 'no step holds "Know these five words" with its table of the five words and no action, so it was already changed in the builder or never had the table' }];
    return { db, changes: [], skipped };
  }
  return {
    db: { ...db, modules: db.modules.map((x) => (x.id === m.id ? { ...x, checklist } : x)) },
    changes: [{ target: { type: 'module', id: m.id, label: m.name }, before: { step: touched, fiveWords: 'table' }, after: { step: touched, fiveWords: 'card', terms: ids } }],
    skipped: [],
  };
}
