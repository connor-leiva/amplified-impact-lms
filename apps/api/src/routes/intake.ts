// Week 0 intake (D-196). One row per team. The owner and the operator read and edit it. Staff read
// it on the workspace page, and that read is audited. Saving and submitting stay in the portal:
// nothing is sent to GHL, Stripe or anywhere else.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { cleanIntakeAnswers, currentIntakeAnswers, intakeCheckTarget, intakeMissing, mayEditIntake } from '@ai/core/intake';
import type { IntakeAnswers } from '@ai/core/intake';
import { requireSession, viewerOrThrow } from '../auth';
import { audit } from '../console/audit';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { checklistState, cohorts, teamIntake, teams, users } from '../db/schema';
import { intakePdfHtml, intakePdfName, renderPdf } from '../pdf/render';
import { clock } from '../lib/clock';

export const INTAKE_PATH = '/api/intake';

/** D-229: a row is due for GHL one minute after its last edit, so a burst of edits is one sync. */
export const INTAKE_QUIET_MS = 60_000;

interface Member {
  id: string;
  teamId: string;
  role: string | null;
}

async function memberOf(userId: string): Promise<Member | null> {
  const [row] = await getDb().select({ id: users.id, teamId: users.teamId, role: users.role }).from(users).where(and(eq(users.id, userId), eq(users.kind, 'learner')));
  if (!row?.teamId) return null;
  return { id: row.id, teamId: row.teamId, role: row.role };
}

async function formOf() {
  const db = await loadDb(getDb());
  return db.modules.find((m) => m.id === 'accelerator-week-0')?.course?.intake;
}

/** Checks a checklist item for every learner on a team (a submitted intake's, D-229; a turn-in's, D-230). */
export async function checkTeam(teamId: string, item: { moduleId: string; stepId: string; itemId: string }, now: number): Promise<void> {
  const mates = await getDb().select({ id: users.id }).from(users).where(and(eq(users.teamId, teamId), eq(users.kind, 'learner')));
  for (const mate of mates) {
    await getDb()
      .insert(checklistState)
      .values({ userId: mate.id, moduleId: item.moduleId, stepId: item.stepId, itemId: item.itemId, checked: true, checkedAt: now, auto: true })
      .onConflictDoUpdate({
        target: [checklistState.userId, checklistState.moduleId, checklistState.stepId, checklistState.itemId],
        set: { checked: true, checkedAt: now, auto: true },
      });
  }
}

export const INTAKE_PDF_PATH = '/api/intake/pdf';

/**
 * D-229 (B-18): a team's intake as a PDF, draft or submitted (the package's placeholder look until the template
 * arrives, Q-14). Null when the course has no intake. The file is made on each request and never stored.
 */
export async function teamIntakePdf(teamId: string): Promise<{ pdf: Buffer; name: string } | null> {
  const form = await formOf();
  if (!form) return null;
  const db = getDb();
  const [row] = await db.select().from(teamIntake).where(eq(teamIntake.teamId, teamId));
  const [team] = await db.select({ name: teams.name, ownerId: teams.ownerId }).from(teams).where(eq(teams.id, teamId));
  const [owner] = team ? await db.select({ name: users.name, cohortId: users.cohortId }).from(users).where(eq(users.id, team.ownerId)) : [];
  const [cohort] = owner?.cohortId ? await db.select({ name: cohorts.name }).from(cohorts).where(eq(cohorts.id, owner.cohortId)) : [];
  const html = intakePdfHtml({
    intake: form,
    answers: currentIntakeAnswers(form, row?.answers ?? {}),
    team: team?.name ?? '',
    owner: owner?.name ?? '',
    // "Amplified AI Accelerator · December 2026 Cohort": the stored name, and the word core's `cohortLine` appends.
    cohort: cohort ? `${cohort.name} Cohort` : '',
    submittedAt: row?.submittedAt ?? null,
    savedAt: row?.updatedAt ?? clock.now(),
  });
  return { pdf: await renderPdf(html), name: intakePdfName(team?.name ?? owner?.name ?? '') };
}

/** The PDF's response: a download, named for the team, never cached. */
export const sendPdf = (reply: FastifyReply, file: { pdf: Buffer; name: string }): FastifyReply =>
  reply
    .header('content-type', 'application/pdf')
    .header('content-disposition', `attachment; filename="${file.name.replace(/"/g, '')}"`)
    .header('cache-control', 'no-store')
    .send(file.pdf);

export function registerIntakeRoute(app: FastifyInstance): void {
  // D-229 (B-18): the learner's own team's intake as a PDF, for the owner and the operator (as the intake itself).
  app.get(INTAKE_PDF_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    // A staff preview has no team, so nothing to print: the same refusal as an agent's.
    const me = actor.kind === 'learner' ? await memberOf(actor.userId) : null;
    if (!me || !mayEditIntake(me.role)) return reply.code(403).send({ error: 'That intake is for the owner and the AI Implementer.' });
    const file = await teamIntakePdf(me.teamId);
    if (!file) return reply.code(404).send({ error: 'This week has no intake.' });
    return sendPdf(reply, file);
  });

  app.get(INTAKE_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    if (actor.kind !== 'learner') return reply.code(200).send({ answers: {}, updatedAt: null, submittedAt: null, preview: true });
    const me = await memberOf(actor.userId);
    if (!me || !mayEditIntake(me.role)) return reply.code(403).send({ error: 'That intake is for the owner and the AI Implementer.' });
    const [row] = await getDb().select().from(teamIntake).where(eq(teamIntake.teamId, me.teamId));
    // D-243: a choice saved in the operator's words comes back as the option it picks now.
    const form = row ? await formOf() : undefined;
    return reply.code(200).send({
      answers: currentIntakeAnswers(form, row?.answers ?? {}),
      updatedAt: row?.updatedAt ?? null,
      submittedAt: row?.submittedAt ?? null,
      preview: false,
    });
  });

  app.put(INTAKE_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    if (actor.kind !== 'learner') return reply.code(403).send({ error: 'Preview: Answers Aren’t Saved' });
    const me = await memberOf(actor.userId);
    if (!me || !mayEditIntake(me.role)) return reply.code(403).send({ error: 'That intake is for the owner and the AI Implementer.' });
    const form = await formOf();
    if (!form) return reply.code(404).send({ error: 'This week has no intake.' });
    const body = (req.body ?? {}) as { answers?: unknown; submit?: boolean };
    const answers: IntakeAnswers = cleanIntakeAnswers(form, body.answers);
    // B-16 (D-229): a submit with a required answer missing is refused, whatever the browser checked; a save isn't.
    if (body.submit) {
      const missing = intakeMissing(form, answers);
      if (missing.length) return reply.code(422).send({ error: 'Some required answers are missing.', missing });
    }
    const now = clock.now();
    const [prev] = await getDb().select().from(teamIntake).where(eq(teamIntake.teamId, me.teamId));
    const submittedAt = body.submit ? now : (prev?.submittedAt ?? null);
    // D-229 (B-20): a submit, and any save after one, queues the answers for GHL after a minute's quiet
    // (jobs/ghl-intake.ts). A draft never leaves the portal.
    const sync = submittedAt !== null ? { ghlSyncStatus: 'pending', ghlNextAt: now + INTAKE_QUIET_MS, ghlAttempts: 0, ghlError: null } : {};
    await getDb()
      .insert(teamIntake)
      .values({ teamId: me.teamId, answers, updatedAt: now, updatedBy: me.id, submittedAt, ...sync })
      .onConflictDoUpdate({
        target: teamIntake.teamId,
        set: { answers, updatedAt: now, updatedBy: me.id, submittedAt, ...sync },
      });
    if (body.submit) {
      const db = await loadDb(getDb());
      const target = intakeCheckTarget(db.modules.find((m) => m.id === 'accelerator-week-0'));
      if (target) await checkTeam(me.teamId, target, now);
    }
    return reply.code(200).send({ answers, updatedAt: now, submittedAt });
  });
}

/** Staff read of a team's intake. The caller has already passed workspaces.read. Writes one audit row. */
export async function readTeamIntake(
  req: Parameters<typeof audit>[0],
  teamId: string,
  actor: { source: 'staff'; userId: string; role: string | null },
): Promise<{ answers: IntakeAnswers; updatedAt: number | null; submittedAt: number | null; ghl: IntakeSyncState } | null> {
  const [team] = await getDb().select({ id: teams.id }).from(teams).where(eq(teams.id, teamId));
  const [row] = await getDb().select().from(teamIntake).where(eq(teamIntake.teamId, teamId));
  if (!team && !row) return null;
  await audit(req, { action: 'intake.read', outcome: 'ok', actor, target: { type: 'team', id: teamId, label: 'Intake' } });
  const form = row ? await formOf() : undefined;
  return { answers: currentIntakeAnswers(form, row?.answers ?? {}), updatedAt: row?.updatedAt ?? null, submittedAt: row?.submittedAt ?? null, ghl: syncStateOf(row) };
}

/** D-229 (B-19, B-20): a team intake's sync to GHL, as the console reads it. */
export interface IntakeSyncState {
  status: string;
  syncedAt: number | null;
  attempts: number;
  error: string | null;
  nextAt: number | null;
}
const syncStateOf = (row: typeof teamIntake.$inferSelect | undefined): IntakeSyncState => ({
  status: row?.ghlSyncStatus ?? 'none',
  syncedAt: row?.ghlSyncedAt ?? null,
  attempts: row?.ghlAttempts ?? 0,
  error: row?.ghlError ?? null,
  nextAt: row?.ghlNextAt ?? null,
});

/**
 * D-229: staff re-queue a submitted intake for GHL (due now, attempts reset). The caller has passed the console's
 * permissions. Audited as `intake.sync`. Null when there is no submitted intake to send.
 */
export async function requeueTeamIntake(
  req: Parameters<typeof audit>[0],
  teamId: string,
  actor: { source: 'staff'; userId: string; role: string | null },
  now: number,
): Promise<IntakeSyncState | null> {
  const [row] = await getDb().select().from(teamIntake).where(eq(teamIntake.teamId, teamId));
  if (!row?.submittedAt) return null;
  const [next] = await getDb()
    .update(teamIntake)
    .set({ ghlSyncStatus: 'pending', ghlNextAt: now, ghlAttempts: 0, ghlError: null })
    .where(eq(teamIntake.teamId, teamId))
    .returning();
  await audit(req, { action: 'intake.sync', outcome: 'ok', actor, target: { type: 'team', id: teamId, label: 'Intake' }, after: { ghl: 'pending' } });
  return syncStateOf(next);
}
