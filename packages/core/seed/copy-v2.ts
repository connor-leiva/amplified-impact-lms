// SEED, NOT RUNTIME (D-187). The Team Plan window's words, as copy strings the builder edits (Course
// settings, Copy strings), put in by a one-time data step, as `skill.coming` was (D-176). The step inserts
// each missing key and never changes or brings back one that is there, so a word staff changed stays
// changed and a key staff removed stays removed. Runtime code may not import this file.
//
// The window opens when a learner on the Agent Plan opens something that comes with the Team Plan (a
// locked AI employee, a Team-only vault item, the Team Hub, or `/learn?plan=team`). Connor, Nov 18, 2026:
// "It should say this comes with the Team Plan, that their team lead can add the team, and that solo
// agents can ask us. One button sends the request." An access group's member (Utah Life) never reads
// these: the window shows their group's own locked line, with no button.
//
// Pure: no clock, no random source.

import type { CopyString, Db } from '../src/types';
import type { DataChange, DataStepOutcome } from './data-step';

/** The step's id, recorded in `data_migrations` once it has run. */
export const COPY_V2 = '2026-11-18-team-plan-copy';

/** The window's strings, in the order it draws them. Every key starts `plan.team.` (the library's answer sends those). */
export const TEAM_PLAN_COPY: readonly CopyString[] = [
  { key: 'plan.team.title', value: 'This comes with the Team Plan', audience: 'learner' },
  { key: 'plan.team.lead', value: 'Your team lead can add your team to the Team Plan.', audience: 'learner' },
  { key: 'plan.team.solo', value: 'Solo agent? Ask us and we’ll help you get it.', audience: 'learner' },
  { key: 'plan.team.ask', value: 'Ask About the Team Plan', audience: 'learner' },
  { key: 'plan.team.asked', value: 'We have your request and will be in touch within 1 business day.', audience: 'learner' },
];

export function planCopyV2(db: Db): DataStepOutcome {
  const have = new Set((db.copy ?? []).map((c) => c.key));
  const add: CopyString[] = TEAM_PLAN_COPY.filter((c) => !have.has(c.key)).map((c) => ({ ...c }));
  const changes: DataChange[] = add.map((c) => ({ target: { type: 'copy', id: c.key, label: c.key }, before: null, after: { audience: c.audience, length: c.value.length } }));
  return { db: add.length ? { ...db, copy: [...(db.copy ?? []), ...add] } : db, changes, skipped: [] };
}
