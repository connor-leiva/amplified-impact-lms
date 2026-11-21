// Week 0 intake (D-196). One row per team. The owner and the operator read and edit it. Staff read
// it on the workspace page, and that read is audited. Saving and submitting stay in the portal:
// nothing is sent to GHL, Stripe or anywhere else.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { cleanIntakeAnswers, intakeCheckTarget, intakeMissing, mayEditIntake } from '@ai/core/intake';
import type { IntakeAnswers } from '@ai/core/intake';
import { requireSession, viewerOrThrow } from '../auth';
import { audit } from '../console/audit';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { checklistState, teamIntake, teams, users } from '../db/schema';
import { clock } from '../lib/clock';

export const INTAKE_PATH = '/api/intake';

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

async function checkTeam(teamId: string, item: { moduleId: string; stepId: string; itemId: string }, now: number): Promise<void> {
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

export function registerIntakeRoute(app: FastifyInstance): void {
  app.get(INTAKE_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    if (actor.kind !== 'learner') return reply.code(200).send({ answers: {}, updatedAt: null, submittedAt: null, preview: true });
    const me = await memberOf(actor.userId);
    if (!me || !mayEditIntake(me.role)) return reply.code(403).send({ error: 'That intake is for the owner and the operator.' });
    const [row] = await getDb().select().from(teamIntake).where(eq(teamIntake.teamId, me.teamId));
    return reply.code(200).send({
      answers: row?.answers ?? {},
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
    if (!me || !mayEditIntake(me.role)) return reply.code(403).send({ error: 'That intake is for the owner and the operator.' });
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
    await getDb()
      .insert(teamIntake)
      .values({ teamId: me.teamId, answers, updatedAt: now, updatedBy: me.id, submittedAt })
      .onConflictDoUpdate({
        target: teamIntake.teamId,
        set: { answers, updatedAt: now, updatedBy: me.id, submittedAt },
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
): Promise<{ answers: IntakeAnswers; updatedAt: number | null; submittedAt: number | null } | null> {
  const [team] = await getDb().select({ id: teams.id }).from(teams).where(eq(teams.id, teamId));
  const [row] = await getDb().select().from(teamIntake).where(eq(teamIntake.teamId, teamId));
  if (!team && !row) return null;
  await audit(req, { action: 'intake.read', outcome: 'ok', actor, target: { type: 'team', id: teamId, label: 'Intake' } });
  return { answers: row?.answers ?? {}, updatedAt: row?.updatedAt ?? null, submittedAt: row?.submittedAt ?? null };
}
