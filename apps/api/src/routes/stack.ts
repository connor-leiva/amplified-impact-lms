// The stack card (D-197). One row per team. Send Back stays in the portal: it sets sent_at and
// checks the step 1 item. It does not send email.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { and, eq, sql } from 'drizzle-orm';
import { INTAKE_OUT_OF_DATE, mayEditIntake } from '@ai/core/intake';
import { STACK_CONFLICT, mergeStackEdit, prefillStack, stackCheckTarget } from '@ai/core/stack';
import type { StackRow } from '@ai/core/stack';
import type { StackCardContent } from '@ai/core/course-types';
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

type Reader = Pick<ReturnType<typeof getDb>, 'select'>;

/** The team's card as stored, or, before its first save, as the intake prefills it (what `GET` shows). */
async function storedRows(db: Reader, teamId: string, card: StackCardContent | undefined): Promise<{ rows: StackRow[]; sentAt: number | null }> {
  const [saved] = await db.select().from(teamStackCard).where(eq(teamStackCard.teamId, teamId));
  if (saved) return { rows: saved.rows, sentAt: saved.sentAt };
  const [intake] = await db.select().from(teamIntake).where(eq(teamIntake.teamId, teamId));
  return { rows: card ? prefillStack(card, intake?.answers ?? {}) : [], sentAt: null };
}

export function registerStackRoute(app: FastifyInstance): void {
  app.get(STACK_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    if (actor.kind !== 'learner') return reply.code(200).send({ rows: [], sentAt: null, preview: true });
    const me = await memberOf(actor.userId);
    if (!me || !mayEditIntake(me.role)) return reply.code(403).send({ error: 'That card is for the owner and the AI Implementer.' });
    const card = await cardOf();
    const saved = await storedRows(getDb(), me.teamId, card);
    return reply.code(200).send({ rows: saved.rows, sentAt: saved.sentAt, preview: false });
  });

  app.put(STACK_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    if (actor.kind !== 'learner') return reply.code(403).send({ error: 'Preview only' });
    const me = await memberOf(actor.userId);
    if (!me || !mayEditIntake(me.role)) return reply.code(403).send({ error: 'That card is for the owner and the AI Implementer.' });
    const card = await cardOf();
    if (!card) return reply.code(404).send({ error: 'This week has no stack card.' });
    const body = (req.body ?? {}) as { changes?: unknown; base?: unknown; send?: boolean };
    // H-10 (D-248): only the rows this browser changed, each as it last read it. A page from before this change sends
    // every row, which would erase a teammate's: it is refused, and asked to reload.
    if (!body.changes || typeof body.changes !== 'object' || Array.isArray(body.changes)) {
      return reply.code(409).send({ error: INTAKE_OUT_OF_DATE, conflicts: [] });
    }
    const now = clock.now();
    // Read, merge and write under the team's own lock, as the intake does.
    const out = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('team_stack_card'), hashtext(${me.teamId}))`);
      const prev = await storedRows(tx, me.teamId, card);
      const merged = mergeStackEdit(card, prev.rows, body.changes, body.base);
      if (merged.secret) return { code: 422 as const, body: { error: 'Never a password.' } };
      if (merged.conflicts.length) return { code: 409 as const, body: { error: STACK_CONFLICT, conflicts: merged.conflicts } };
      const sentAt = body.send ? now : prev.sentAt;
      await tx
        .insert(teamStackCard)
        .values({ teamId: me.teamId, rows: merged.rows, sentAt, updatedAt: now, updatedBy: me.id })
        .onConflictDoUpdate({ target: teamStackCard.teamId, set: { rows: merged.rows, sentAt, updatedAt: now, updatedBy: me.id } });
      return { code: 200 as const, body: { rows: merged.rows, sentAt } };
    });
    if (out.code !== 200) return reply.code(out.code).send(out.body);
    const { rows, sentAt } = out.body;
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
    return reply.code(200).send({ rows, sentAt });
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
