// D-199: the team's intake applied to the course. Reading the operator's count writes nothing.
// Applying checks writes only checklist rows for that team. Nothing is sent.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { mayEditIntake } from '@ai/core/intake';
import { autoCheckItems, operatorItems } from '@ai/core/personalize';
import type { PersonalStep } from '@ai/core/personalize';
import { requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { checklistState, teamIntake, users } from '../db/schema';
import { clock } from '../lib/clock';

export const PERSONALIZE_PATH = '/api/personalize';

interface Member {
  id: string;
  teamId: string;
  role: string | null;
  name: string;
}

async function memberOf(userId: string): Promise<Member | null> {
  const [row] = await getDb().select({ id: users.id, teamId: users.teamId, role: users.role, name: users.name }).from(users).where(and(eq(users.id, userId), eq(users.kind, 'learner')));
  if (!row?.teamId) return null;
  return { id: row.id, teamId: row.teamId, role: row.role, name: row.name };
}

async function courseSteps(): Promise<PersonalStep[]> {
  const db = await loadDb(getDb());
  return db.modules.flatMap((mod) => mod.checklist.map((step) => ({ moduleId: mod.id, id: step.id, paths: step.paths })));
}

const empty = { name: null, steps: [] as { moduleId: string; stepId: string; done: number; total: number }[] };

export function registerPersonalizeRoute(app: FastifyInstance): void {
  app.get(PERSONALIZE_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    if (actor.kind !== 'learner') return reply.code(200).send(empty);
    const me = await memberOf(actor.userId);
    if (!me || me.role !== 'Team Owner') return reply.code(200).send(empty);
    const mates = await getDb().select({ id: users.id, name: users.name, role: users.role }).from(users).where(and(eq(users.teamId, me.teamId), eq(users.kind, 'learner')));
    const operator = mates.find((mate) => mate.role === 'Operations Lead');
    if (!operator) return reply.code(200).send(empty);
    const items = operatorItems(await courseSteps());
    const checks = await getDb().select({ stepId: checklistState.stepId, itemId: checklistState.itemId, moduleId: checklistState.moduleId, checked: checklistState.checked }).from(checklistState).where(eq(checklistState.userId, operator.id));
    const on = new Set(checks.filter((row) => row.checked).map((row) => `${row.moduleId}:${row.stepId}:${row.itemId}`));
    const grouped = new Map<string, { moduleId: string; stepId: string; done: number; total: number }>();
    for (const item of items) {
      const key = `${item.moduleId}:${item.stepId}`;
      const row = grouped.get(key) ?? { moduleId: item.moduleId, stepId: item.stepId, done: 0, total: 0 };
      row.total += 1;
      if (on.has(`${item.moduleId}:${item.stepId}:${item.itemId}`)) row.done += 1;
      grouped.set(key, row);
    }
    return reply.code(200).send({ name: operator.name, steps: [...grouped.values()] });
  });

  app.post(PERSONALIZE_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    reply.header('cache-control', 'no-store');
    if (actor.kind !== 'learner') return reply.code(403).send({ error: 'Preview: Checks Aren’t Saved' });
    const me = await memberOf(actor.userId);
    if (!me || !mayEditIntake(me.role)) return reply.code(403).send({ error: 'That page is for the owner and the operator.' });
    const mates = await getDb().select({ id: users.id, role: users.role }).from(users).where(and(eq(users.teamId, me.teamId), eq(users.kind, 'learner')));
    const [intake] = await getDb().select({ answers: teamIntake.answers }).from(teamIntake).where(eq(teamIntake.teamId, me.teamId));
    const joined = mates.some((mate) => mate.role === 'Operations Lead');
    const items = autoCheckItems(await courseSteps(), intake?.answers, joined);
    const now = clock.now();
    for (const item of items) {
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
    return reply.code(200).send({ ok: true });
  });
}
