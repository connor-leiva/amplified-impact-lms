// GET /api/admin/cohorts/:cohortId/facts (R-5 Phase 3, D-255): what the Cohort page needs about one cohort beyond the
// snapshot: its two test sends (audit rows) and the cohort plans placed in it (`lib/cohort-facts.ts`). "Before it
// opens" reads them beside the snapshot (`beforeItOpens`), as Open enrollment's refusal does.
//
//   401  not signed in
//   403  not staff with the `cohorts` permission (the Cohort page's own)
//   404  no such cohort
//   200  `CohortFacts`
//
// Read-only. No names or addresses: booleans and counts, and (R-5 Phase 5, D-262) Stripe's price under each of the
// cohort's lookup keys and whether each of its Payment Links names it, which the Enrollment card shows.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { can } from '@ai/core';
import { requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { cohorts } from '../db/schema';
import { cohortFactsOf } from '../lib/cohort-facts';
import type { StripeFactsReader } from '../lib/cohort-facts';

export const COHORT_FACTS_PATH = '/api/admin/cohorts/:cohortId/facts';
export const cohortFactsPath = (cohortId: string): string => `/api/admin/cohorts/${encodeURIComponent(cohortId)}/facts`;

/** R-5 Phase 5 (D-262): with a Stripe reader, the facts also say what Stripe has under the cohort's keys and links. */
export function registerCohortFactsRoute(app: FastifyInstance, stripe?: StripeFactsReader): void {
  app.get<{ Params: { cohortId: string } }>(COHORT_FACTS_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    const db = getDb();
    if (actor.kind !== 'staff' || !can(await loadDb(db), actor, 'cohorts'))
      return reply.code(403).send({ error: 'You don’t have permission to do that.' });
    const [row] = await db.select({ id: cohorts.id }).from(cohorts).where(eq(cohorts.id, req.params.cohortId)).limit(1);
    if (!row) return reply.code(404).send({ error: 'No such cohort.' });
    return reply.code(200).send(await cohortFactsOf(db, row.id, stripe));
  });
}
