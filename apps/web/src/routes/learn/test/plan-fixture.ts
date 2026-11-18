// Test data for the Team Plan window (D-187): an Agent tier learner in the course, a Team-only AI employee
// outside the course (as the first portal's catalog has them) and a Team-only vault item, and the library's
// answer with the builder's `plan.team.*` words. Tests only: under a `test/` folder.

import type { AIEmployee, Db } from '@ai/core';
import { TEAM_PLAN_COPY } from '@ai/core/seed/copy-v2';
import { buyerSkills, utahSkills } from './library-fixture';
import type { SkillsPayload } from '../Library.vm';
import { LEARNER_ID, PRELAUNCH_NOW, learnState } from './fixture';
import type { LearnState } from './fixture';

export const TEAM_MODULE = 'ops-ai-employee';
export const TEAM_RESOURCE = 'r-team-playbook';
export const PLAN_COPY: Record<string, string> = Object.fromEntries(TEAM_PLAN_COPY.map((c) => [c.key, c.value]));

/** The course before launch, for a learner of `tier`, with a Team-only AI employee and vault item in the database. */
export function planState(tier: 'agent' | 'team' = 'agent', edit?: (d: Db) => void): LearnState {
  return learnState(PRELAUNCH_NOW, true, { 0: ['c1', 'c2'] }, 15, (d) => {
    d.users.find((u) => u.id === LEARNER_ID)!.tier = tier;
    const like = d.modules[0]!;
    const { course: _course, kind: _kind, dueAt: _due, ...rest } = like;
    const m: AIEmployee = {
      ...rest,
      id: TEAM_MODULE,
      name: 'Operations AI Employee',
      short: 'Operations',
      tier: 'team',
      status: 'published',
      order: 99,
      session: null,
      headline: 'Upload an executed contract and get every deadline on a calendar.',
      outcome: 'Every deadline tracked.',
      outputs: ['A deadline calendar', 'A task list for the file', 'A weekly status note'],
      prompt: 'SECRET PROMPT',
    };
    d.modules.push(m);
    d.resources.push({ id: TEAM_RESOURCE, title: 'Team Playbook Template', desc: 'The playbook a team fills in.', cat: 'Templates', type: 'DOCX', tier: 'team', size: '20 KB', dl: 0, updated: 0, exec: false, status: 'published' });
    edit?.(d);
  });
}

export const offerSkills = (copy: Record<string, string> = PLAN_COPY): SkillsPayload => ({ ...buyerSkills(), planCopy: copy });
export const groupSkills = (copy: Record<string, string> = PLAN_COPY): SkillsPayload => ({ ...utahSkills(), planCopy: copy });
