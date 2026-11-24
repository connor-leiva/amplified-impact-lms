// The stack card (D-197). One row per team. Send Back stays in the portal: it sets sent_at and
// checks the step 1 item. It does not send email.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { mayEditIntake } from '@ai/core/intake';
import { cleanStackRows, prefillStack, stackCheckTarget } from '@ai/core/stack';
import type { StackRow } from '@ai/core/stack';
import { requireSession, viewerOrThrow } from '../auth';
import { audit } from '../console/audit';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { checklistState, teamIntake, teamStackCard, teams, users } from '../db/schema';
import { clock } from '../lib/clock';

export const STACK_PATH = '/api/stack';

async function memberOf(userId: string) {
  const [row] = await getDb().select({ id: users.id, teamId: users.teamId, role: users.role }).from(users).where(and(eq(users.id, userId), eq(users.kind, 'learner')));
  if (!row?.teamId) return null;
  return { id: row.id, teamId: row.teamId, role: row.role };
}

async function cardOf() {
  const db = await loadDb(getDb());
  return db.modules.find((m) => m.id === 'accelerator-week-0')?.course?.stackCard;
}

export function registerStackRoute(app: FastifyInstance): void {
  app.get(STACK_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    if (actor.kind !== 'learner') return reply.code(200).send({ rows: [], sentAt: null, preview: true });
    const me = await memberOf(actor.userId);
    if (!me || !mayEditIntake(me.role)) return reply.code(403).send({ error: 'That card is for the owner and the AI Implementer.' });
    const [saved] = await getDb().select().from(teamStackCard).where(eq(teamStackCard.teamId, me.teamId));
    if (saved) return reply.code(200).send({ rows: saved.rows, sentAt: saved.sentAt, preview: false });
    const card = await cardOf();
    const [intake] = await getDb().select().from(teamIntake).where(eq(teamIntake.teamId, me.teamId));
    const rows = card ? prefillStack(card, intake?.answers ?? {}) : [];
    return reply.code(200).send({ rows, sentAt: null, preview: false });
  });

  app.put(STACK_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    if (actor.kind !== 'learner') return reply.code(403).send({ error: 'Preview only' });
    const me = await memberOf(actor.userId);
    if (!me || !mayEditIntake(me.role)) return reply.code(403).send({ error: 'That card is for the owner and the AI Implementer.' });
    const card = await cardOf();
    if (!card) return reply.code(404).send({ error: 'This week has no stack card.' });
    const body = (req.body ?? {}) as { rows?: unknown; send?: boolean };
    const cleaned = cleanStackRows(card, body.rows);
    if (cleaned.secret) return reply.code(422).send({ error: 'Never a password.' });
    const now = clock.now();
    const [prev] = await getDb().select().from(teamStackCard).where(eq(teamStackCard.teamId, me.teamId));
    const sentAt = body.send ? now : (prev?.sentAt ?? null);
    await getDb()
      .insert(teamStackCard)
      .values({ teamId: me.teamId, rows: cleaned.rows, sentAt, updatedAt: now, updatedBy: me.id })
      .onConflictDoUpdate({ target: teamStackCard.teamId, set: { rows: cleaned.rows, sentAt, updatedAt: now, updatedBy: me.id } });
    if (body.send) {
      const db = await loadDb(getDb());
      const target = stackCheckTarget(db.modules.find((m) => m.id === 'accelerator-week-0'));
      if (target) {
        const mates = await getDb().select({ id: users.id }).from(users).where(and(eq(users.teamId, me.teamId), eq(users.kind, 'learner')));
        for (const mate of mates) {
          await getDb()
            .insert(checklistState)
            .values({ userId: mate.id, moduleId: target.moduleId, stepId: target.stepId, itemId: target.itemId, checked: true, checkedAt: now, auto: true })
            .onConflictDoUpdate({
              target: [checklistState.userId, checklistState.moduleId, checklistState.stepId, checklistState.itemId],
              set: { checked: true, checkedAt: now, auto: true },
            });
        }
      }
    }
    return reply.code(200).send({ rows: cleaned.rows, sentAt });
  });
}

export async function readTeamStack(
  req: Parameters<typeof audit>[0],
  teamId: string,
  actor: { source: 'staff'; userId: string; role: string | null },
): Promise<{ rows: StackRow[]; sentAt: number | null } | null> {
  const [team] = await getDb().select({ id: teams.id }).from(teams).where(eq(teams.id, teamId));
  const [row] = await getDb().select().from(teamStackCard).where(eq(teamStackCard.teamId, teamId));
  if (!team && !row) return null;
  await audit(req, { action: 'stack.read', outcome: 'ok', actor, target: { type: 'team', id: teamId, label: 'Stack card' } });
  return { rows: row?.rows ?? [], sentAt: row?.sentAt ?? null };
}
