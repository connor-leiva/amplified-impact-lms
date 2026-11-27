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
import { asc, eq, inArray, isNull } from 'drizzle-orm';
import { can } from '@ai/core';
import { intakeQuestions } from '@ai/core/intake';
import type { AdminOverviewFacts, CohortFacts, CohortIntakeRow } from '@ai/core';
import { requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { cohorts, teamIntake, teams, users } from '../db/schema';
import { staffActor } from '../console/guard';
import { audit } from '../console/audit';
import { cohortFactsOf } from '../lib/cohort-facts';
import type { StripeFactsReader } from '../lib/cohort-facts';
import { cohortRoster } from '../lib/cohort-roster';

export const COHORT_FACTS_PATH = '/api/admin/cohorts/:cohortId/facts';
export const cohortFactsPath = (cohortId: string): string => `/api/admin/cohorts/${encodeURIComponent(cohortId)}/facts`;
/** R-5 Phase 7 (D-268): Cohort › Submissions' intake, every roster team's (audited once, `intake.read`). */
export const COHORT_INTAKE_PATH = '/api/admin/cohorts/:cohortId/intake';
/**
 * R-5 Phase 9 (D-270): the Overview's one read for every cohort not archived: each one's facts, as the facts route answers
 * them but without Stripe (no Stripe call per page or per cohort: a draft's two Stripe lines are read on its Settings).
 * The roster is read once for all of them (D-267's rule).
 */
export const ADMIN_OVERVIEW_PATH = '/api/admin/overview';

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

  // R-5 Phase 9 (D-270): every cohort's facts for the Overview, without Stripe. The same permission as the facts.
  app.get(ADMIN_OVERVIEW_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    const db = getDb();
    if (actor.kind !== 'staff' || !can(await loadDb(db), actor, 'cohorts'))
      return reply.code(403).send({ error: 'You don’t have permission to do that.' });
    const rows = await db.select({ id: cohorts.id }).from(cohorts).where(isNull(cohorts.archivedAt)).orderBy(asc(cohorts.start), asc(cohorts.id));
    const roster = await cohortRoster(db);
    const out: Record<string, CohortFacts> = {};
    for (const r of rows) {
      // Cohort › People's rows are its own page's; the Overview counts.
      const { teamRows: _rows, ...facts } = await cohortFactsOf(db, r.id, undefined, roster);
      out[r.id] = facts;
    }
    return reply.code(200).send({ cohorts: out } satisfies AdminOverviewFacts);
  });

  // R-5 Phase 7 (D-268): every roster team's Week 0 intake (D-267's rule), for Cohort › Submissions' two intake views.
  // The same permission as the facts; one `intake.read` audit row for the cohort, as opening one team's is audited.
  app.get<{ Params: { cohortId: string } }>(COHORT_INTAKE_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const viewer = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    const db = getDb();
    const snapshot = await loadDb(db);
    if (viewer.actor.kind !== 'staff' || !can(snapshot, viewer.actor, 'cohorts'))
      return reply.code(403).send({ error: 'You don’t have permission to do that.' });
    const [row] = await db.select({ id: cohorts.id, name: cohorts.name }).from(cohorts).where(eq(cohorts.id, req.params.cohortId)).limit(1);
    if (!row) return reply.code(404).send({ error: 'No such cohort.' });
    const ids = (await cohortRoster(db))[row.id]?.teams ?? [];
    const teamRows = ids.length ? await db.select({ id: teams.id, name: teams.name, ownerId: teams.ownerId }).from(teams).where(inArray(teams.id, ids)) : [];
    const owners = teamRows.length
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, teamRows.map((t) => t.ownerId)))
      : [];
    const intake = ids.length ? await db.select().from(teamIntake).where(inArray(teamIntake.teamId, ids)) : [];
    const known = new Set(intakeQuestions(snapshot.modules.find((m) => m.course?.intake)?.course?.intake).map((q) => q.id));
    const actor = staffActor(viewer);
    if (actor) await audit(req, { action: 'intake.read', outcome: 'ok', actor, target: { type: 'cohort', id: row.id, label: 'Intake, every team' } });
    const out: CohortIntakeRow[] = teamRows
      .map((t) => {
        const r = intake.find((x) => x.teamId === t.id);
        const answers = r ? Object.fromEntries(Object.entries(r.answers).filter(([k]) => known.size === 0 || known.has(k))) : {};
        return {
          teamId: t.id,
          name: t.name,
          owner: owners.find((o) => o.id === t.ownerId)?.name ?? '',
          status: !r ? 'not_started' : r.submittedAt !== null ? 'submitted' : 'draft',
          updatedAt: r ? Number(r.updatedAt) : null,
          submittedAt: r?.submittedAt != null ? Number(r.submittedAt) : null,
          ghl: r?.ghlSyncStatus ?? 'none',
          answers,
        } satisfies CohortIntakeRow;
      })
      .sort((a, b) => a.name.localeCompare(b.name) || a.teamId.localeCompare(b.teamId));
    return reply.code(200).send({ teams: out });
  });
}
