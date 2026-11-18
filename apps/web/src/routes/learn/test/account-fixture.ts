// Test data for the learner Account page (D-178): the deployed seed's course and a team owner's snapshot
// (prelaunchState), with the team the snapshot would carry (two seats, the operator still invited) and
// what `GET /api/skills` and `GET /api/auth/password` would answer. Tests only, under `test/`.

import { COHORT_ONE_LIVE_UNTIL } from '@ai/core/offer';
import type { Learner } from '@ai/core';
import type { AccountRead, BillingSkill } from '../Account.vm';
import { LEARNER_ID, prelaunchState } from './fixture';
import type { LearnState } from './fixture';

export const TEAM_ID = 't-dana';
/** Nov 16, 2026, 10:00 AM MT: when the operator was invited. */
export const INVITED_AT = Date.parse('2026-11-16T17:00:00Z');
/** Nov 12, 2026, 9:00 AM MT: when the owner last set their password. */
export const PASSWORD_AT = Date.parse('2026-11-12T16:00:00Z');

export const operator = (status: Learner['status'] = 'invited'): Learner => ({
  id: 'u-sam',
  name: 'Sam Lee',
  email: 'sam@example.com',
  tier: 'team',
  role: 'Operations Lead',
  teamId: TEAM_ID,
  cohortId: 'dec26',
  joined: INVITED_AT,
  last: null,
  status,
  progress: {},
});

/** The owner's snapshot with their team of two and the operator's seat. */
export function accountState(opts: { role?: Learner['role']; operatorStatus?: Learner['status']; seats?: number } = {}): LearnState {
  const st = prelaunchState();
  const me = st.db.users.find((u) => u.id === LEARNER_ID)!;
  me.teamId = TEAM_ID;
  if (opts.role) me.role = opts.role;
  st.db.teams.push({ id: TEAM_ID, name: 'Ross Team', ownerId: LEARNER_ID, seats: opts.seats ?? 2 });
  st.db.users.push(operator(opts.operatorStatus));
  return st;
}

/** 53 published skills: 30 owner-and-ops, 20 agent, 3 for everyone. */
export const skills = (state: BillingSkill['state'] = 'open'): BillingSkill[] => [
  ...Array.from({ length: 30 }, (): BillingSkill => ({ sets: 'owner_ops', state })),
  ...Array.from({ length: 20 }, (): BillingSkill => ({ sets: 'agent', state })),
  ...Array.from({ length: 3 }, (): BillingSkill => ({ sets: 'both', state })),
];

/** What the two reads answer for an AI Accelerator owner. */
export const accountRead = (): AccountRead => ({
  billing: { plans: [{ kind: 'cohort', status: 'active', paidThrough: COHORT_ONE_LIVE_UNTIL }], accessGroups: [], skills: skills() },
  password: { hasPassword: true, changedAt: PASSWORD_AT },
});
