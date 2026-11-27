// Usage counts (D-166, spec § 7.7): one fire-and-forget upsert per event into `usage_daily`, by the
// program-zone day, the learner and the kind. Each instrumented route calls `recordUsage` once, on its
// success path, after its answer is decided; it changes nothing the route does or says.
//
// Learners only: a staff member signing in is not usage of the product (the statement's `kind`
// filter). SKIPPED DURING A MASQUERADE (spec § 6 rule 10): what staff do while seeing the LMS as a
// learner is not that learner's usage, so a request `requireSession` marked with `req.masquerade`
// counts nothing. The sign-in routes run before any session, and a masquerade's browser cannot reach
// them (the write block refuses their POSTs; Google's callback is a blocked GET).

import type { FastifyRequest } from 'fastify';
import { sql } from 'drizzle-orm';
import { programDay } from '@ai/core';
import type { UsageKind } from '@ai/core';
import { getDb } from '../db/client';
import { clock } from './clock';
import { observe } from './observe';

/** Counts one `kind` for `userId` today (program zone), unless this request is a masquerade's. */
export function recordUsage(req: FastifyRequest, userId: string, kind: UsageKind): void {
  if (req.masquerade) return;
  const day = programDay(clock.now());
  observe('usage', () =>
    getDb().execute(sql`
      insert into usage_daily (day, user_id, team_id, kind, count)
      select ${day}, u.id, u.team_id, ${kind}, 1 from users u where u.id = ${userId} and u.kind = 'learner'
      on conflict (day, user_id, kind) do update set count = usage_daily.count + 1, team_id = excluded.team_id
    `),
  );
}

/**
 * R-5 Phase 7 (D-268): counts one open of `skillId`'s guide for `userId` today (program zone), beside `recordUsage`'s
 * `guide_view`, unless this request is a masquerade's. People › Utah Life's "Most opened" reads it. Learners only.
 */
export function recordSkillOpen(req: FastifyRequest, userId: string, skillId: string): void {
  if (req.masquerade) return;
  const day = programDay(clock.now());
  observe('usage', () =>
    getDb().execute(sql`
      insert into skill_opens_daily (day, user_id, skill_id, count)
      select ${day}, u.id, ${skillId}, 1 from users u where u.id = ${userId} and u.kind = 'learner'
      on conflict (day, user_id, skill_id) do update set count = skill_opens_daily.count + 1
    `),
  );
}
