// SEED, NOT RUNTIME (D-197). Week 0's stack card words, from the step 1 table in weeks-0-3-v2.
// Set only when accelerator-week-0 has no stack card yet.

import type { StackCardContent } from '../src/course-types';
import type { Db } from '../src/types';
import type { DataStepOutcome } from './data-step';
import { STACK_CARD } from './weeks-0-3-v2';
import { WEEK0_MODULE_ID } from './start-here-v1';

export const STACK_V1 = '2026-11-19-stack-card';

const IDS = ['books', 'closings', 'leads', 'email'] as const;

export const WEEK0_STACK: StackCardContent = {
  sources: STACK_CARD.map((row, i) => ({ id: IDS[i]!, name: row.source, green: row.green, yellow: row.yellow })),
  exampleLabel: 'Made up',
  exampleTeam: 'Northline Realty',
  example: [
    { source: 'Books', tool: 'QuickBooks Online', plan: 'green', who: 'The bookkeeper' },
    { source: 'Closings and production', tool: 'Sisu', plan: 'green', who: 'The operations lead' },
    { source: 'Leads and follow-up', tool: 'Follow Up Boss', plan: 'yellow', who: 'The lead desk' },
    { source: 'Email, calendar, files', tool: 'Google Workspace', plan: 'green', who: 'The operator' },
  ],
};

export function planStackV1(db: Db): DataStepOutcome {
  const m = db.modules.find((x) => x.id === WEEK0_MODULE_ID);
  if (!m?.course) return { db, changes: [], skipped: [{ id: WEEK0_MODULE_ID, reason: 'the week has no course page in this database' }] };
  if (m.course.stackCard !== undefined) return { db, changes: [], skipped: [{ id: `${WEEK0_MODULE_ID}.course.stackCard`, reason: 'the stack card was already set in the builder' }] };
  const course = { ...m.course, stackCard: structuredClone(WEEK0_STACK) };
  return {
    db: { ...db, modules: db.modules.map((x) => (x.id === m.id ? { ...x, course } : x)) },
    changes: [{ target: { type: 'module', id: m.id, label: m.name }, before: { stackCard: false }, after: { stackCard: true } }],
    skipped: [],
  };
}
