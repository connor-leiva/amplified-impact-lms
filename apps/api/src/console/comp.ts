// Comp an Accelerator team from the Admin Console. Owner and Admin (`billing.comp`).
//
//   GET  /api/console/comp/cohorts   the cohorts the form can offer
//   POST /api/console/comp           { email, name, teamName, cohortId? }
//
// One audit row on a comp that is made or refused (`billing.comp`). A body that isn't valid is
// `invalid_body` and is not audited. The email is not stored in the audit row: the target is the
// order, labeled with the team name.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { compAcceleratorTeam, listCompCohorts } from '../billing/comp';
import type { CompResult } from '../billing/comp';
import { readOfferConfig } from '../billing/config';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { clock } from '../lib/clock';
import { audit } from './audit';
import { consoleError, requireConsole, staffActor } from './guard';
import { CONSOLE_RATE, limit } from './routes';

export const COMP_PATHS = {
  compCohorts: '/api/console/comp/cohorts',
  compTeam: '/api/console/comp',
} as const;

const log = {
  info: () => {},
  warn: (obj: Record<string, unknown>, msg: string) => console.warn(msg, obj.reason ?? obj.order ?? ''),
  error: (obj: Record<string, unknown>, msg: string) => console.error(msg, obj.reason ?? obj.order ?? ''),
};

const REFUSAL: Record<string, string> = {
  'already-enrolled': 'This owner already has an AI Accelerator seat.',
  'staff-email': 'That email belongs to a staff member.',
  'member-of-another-team': 'That person is already on someone else’s team.',
  'no-cohort': 'Choose a cohort that exists.',
  invalid: 'Enter an owner email, an owner name, and a team name.',
};

function bodyOf(raw: unknown): { email: string; name: string; teamName: string; cohortId: string | null } | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.email !== 'string' || typeof b.name !== 'string' || typeof b.teamName !== 'string') return null;
  if (b.cohortId !== undefined && b.cohortId !== null && typeof b.cohortId !== 'string') return null;
  return { email: b.email, name: b.name, teamName: b.teamName, cohortId: typeof b.cohortId === 'string' ? b.cohortId : null };
}

export function registerCompRoutes(scope: FastifyInstance): void {
  scope.get(COMP_PATHS.compCohorts, { preHandler: [requireSession, requireConsole('billing.comp')], config: limit(CONSOLE_RATE.read) }, async (_req, reply) => {
    return reply.send(await listCompCohorts(getDb()));
  });

  scope.post(
    COMP_PATHS.compTeam,
    { preHandler: [requireSession, requireJsonSameOrigin, requireConsole('billing.comp')], config: limit(CONSOLE_RATE.write) },
    async (req, reply): Promise<FastifyReply> => {
      const body = bodyOf(req.body);
      if (!body) return consoleError(reply, 'invalid_body', REFUSAL.invalid);
      const actor = staffActor(viewerOrThrow(req));
      if (!actor) return consoleError(reply, 'console_forbidden');
      const config = readOfferConfig();
      const result = await compAcceleratorTeam(body, {
        log,
        now: clock.now(),
        invitesFrom: config.invitesFrom,
        invitesEnabled: config.invitesEnabled,
      });
      if (!result.ok && result.reason === 'invalid') return consoleError(reply, 'invalid_body', REFUSAL.invalid);
      if (!result.ok && result.reason === 'no-cohort') return consoleError(reply, 'not_found', REFUSAL['no-cohort']);
      if (!result.ok) {
        await writeAudit(req, actor, body.teamName, result);
        return consoleError(reply, 'comp_refused', REFUSAL[result.reason] ?? REFUSAL.invalid);
      }
      await writeAudit(req, actor, body.teamName, result);
      return reply.send(result);
    },
  );
}

async function writeAudit(req: FastifyRequest, actor: { source: 'staff'; userId: string; role: string | null }, teamName: string, result: CompResult): Promise<void> {
  await audit(req, {
    action: 'billing.comp',
    outcome: result.ok ? 'ok' : 'blocked',
    actor,
    target: { type: 'order', id: result.ok ? result.orderId : null, label: teamName.trim().slice(0, 200) },
    after: result.ok
      ? { cohortId: result.cohortId, teamId: result.teamId, invite: result.invite, already: result.already, seats: 2, origin: 'comp' }
      : { reason: result.reason },
  });
}
