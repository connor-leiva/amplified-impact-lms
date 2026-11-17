// The Console's Operations pages, PR 9 (D-168, spec §§ 7.11-7.13). Registered by
// `registerConsoleRoutes` inside its scope, so every answer is `private, no-store` and every route but
// these is untouched. Owner and Admin (`ops.read`); Support gets none of these screens (D3).
//
//   GET  /api/console/env                       { flags, env, modes }: the Console's flags and the
//                                               env switches (read-only), each secret's presence, the
//                                               modes. Booleans and modes only (spec § 7.13).
//   POST /api/console/flags/:key                flip a Console flag (`flags.ts`).
//   GET  /api/console/integrations              one card per service (`infra-integrations.ts`).
//   POST /api/console/integrations/:id/check    Check now, Stripe and Resend only, read-only.
//                                               `integrations.probe`; 5 a minute. Audited
//                                               (`integration.probe`) with its outcome.
//   GET  /api/console/deploys                   the live commit and, with a token, the history.
//   GET  /api/console/db                        DB health, read-only, cached 60 seconds; 503
//                                               `ops_unavailable` when the read didn't finish.
//
// No GET here writes anything but the audit row for a staff member it refuses. During a masquerade
// every one of them answers 403 `masquerade_blocked` (D2, `requireSession`).

import type { FastifyInstance, FastifyReply } from 'fastify';
import { DB_CACHE_MS, INFRA_PATHS, isIntegrationId, isProbeIntegration } from '@ai/core';
import type { DbHealthView, OpsEnv } from '@ai/core';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { clock } from '../lib/clock';
import { audit } from './audit';
import { registerFlagRoutes, readConsoleFlags } from './flags';
import { consoleError, requireConsole, staffActor } from './guard';
import { readDbHealth } from './infra-db';
import { readDeploys } from './infra-deploys';
import type { FetchLike } from './infra-deploys';
import { envPresence, envSwitches, opsModes } from './infra-env';
import { checkIntegration, readIntegrations } from './infra-integrations';
import type { IntegrationsDeps } from './infra-integrations';

/** What `app.ts` (or a test) hands the Operations routes. */
export interface InfraDeps {
  /** The environment to read presence and modes from; the process's own by default. */
  env?: NodeJS.ProcessEnv;
  /** The deploy history's and Resend's `fetch`; a test's fake. */
  fetch?: FetchLike;
  /** Billing's Stripe scope probe (D-163), when there is a Stripe key. */
  stripeScopes?: IntegrationsDeps['stripeScopes'];
  /** For a test: the CRM sync report. */
  crm?: IntegrationsDeps['crm'];
}

const rate = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });

let dbCache: { at: number; view: DbHealthView } | null = null;

/** Forget the cached DB health (a test's `beforeEach`). */
export function resetDbHealthCache(): void {
  dbCache = null;
}

export function registerInfraRoutes(scope: FastifyInstance, deps: InfraDeps, limits: { read: number; write: number; probe: number }): void {
  const now = () => clock.now();
  const env = () => deps.env ?? process.env;
  const read = { preHandler: [requireSession, requireConsole('ops.read')], config: rate(limits.read) };

  scope.get(INFRA_PATHS.env, read, async (_req, reply): Promise<FastifyReply> => {
    const e = env();
    const out: OpsEnv = { flags: [...(await readConsoleFlags()), ...envSwitches(e)], env: envPresence(e), modes: opsModes(e) };
    return reply.send(out);
  });

  registerFlagRoutes(scope, { write: limits.write });

  scope.get(INFRA_PATHS.integrations, read, async (_req, reply): Promise<FastifyReply> =>
    reply.send({ integrations: await readIntegrations({ env: env(), fetch: deps.fetch, now, stripeScopes: deps.stripeScopes, crm: deps.crm }) }),
  );

  scope.post(
    INFRA_PATHS.integrationCheck,
    { preHandler: [requireSession, requireJsonSameOrigin, requireConsole('integrations.probe')], config: rate(limits.probe) },
    async (req, reply): Promise<FastifyReply> => {
      const id = (req.params as { id?: unknown }).id;
      if (!isIntegrationId(id) || !isProbeIntegration(id)) return consoleError(reply, 'not_found', 'Check now is for Stripe and Resend only.');
      const actor = staffActor(viewerOrThrow(req))!;
      const result = await checkIntegration(id, { env: env(), fetch: deps.fetch, now, stripeScopes: deps.stripeScopes });
      await audit(req, {
        action: 'integration.probe',
        outcome: result.outcome === 'ok' ? 'ok' : 'failed',
        actor,
        target: { type: 'integration', id, label: id === 'stripe' ? 'Stripe' : 'Resend' },
        after: { outcome: result.outcome, status: result.status, missing: result.missing },
      });
      return reply.send({ result });
    },
  );

  scope.get(INFRA_PATHS.deploys, read, async (_req, reply): Promise<FastifyReply> => reply.send(await readDeploys({ env: env(), fetch: deps.fetch, now })));

  scope.get(INFRA_PATHS.db, read, async (_req, reply): Promise<FastifyReply> => {
    const t = now();
    if (dbCache && t >= dbCache.at && t - dbCache.at < DB_CACHE_MS) return reply.send(dbCache.view);
    try {
      const view = await readDbHealth(getDb(), t);
      dbCache = { at: t, view };
      return reply.send(view);
    } catch {
      // A statement past two seconds, or a connection that dropped: say so, never the error's words.
      return consoleError(reply, 'ops_unavailable');
    }
  });
}
