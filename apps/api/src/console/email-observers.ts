// D-264: the cohort observer addresses, on Environment Flags. Registered by `registerInfraRoutes`, inside the Console's
// scope, so every answer is `private, no-store` and a masquerade is refused like every Console route.
//
//   GET  /api/console/email-observers   the list in force, where it came from (saved here, the env var, or none),
//                                       the env var's own list, and who saved it last. `ops.read` (Owner, Admin).
//   POST /api/console/email-observers   { addresses: string[] } saves the list; [] saves "nobody", which wins over
//                                       the env var; { addresses: null } forgets the saved list, so
//                                       `COHORT_OBSERVER_EMAILS` applies again. `flags.write` (Owner, Admin).
//                                       One audit row (`email_observers.save`) with the list before and after, in
//                                       the same transaction. A save that changes nothing writes nothing.
//
// The addresses are staff's own mailboxes and not secrets, so they are shown; nothing here reads or returns a key.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { COHORT_OBSERVER_ENV, COHORT_OBSERVER_SETTING, EMAIL_OBSERVERS_COPY, INFRA_PATHS, observerAddressesFromEnv, parseObserverAddresses } from '@ai/core';
import type { EmailObserversView } from '@ai/core';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { consoleSettings, users } from '../db/schema';
import { readObserverList } from '../email/observers';
import { clock } from '../lib/clock';
import { audit } from './audit';
import { consoleError, requireConsole, staffActor } from './guard';

/** The Environment Flags card's view of the list, with the saver's name rather than their id. */
export async function readEmailObservers(env: NodeJS.ProcessEnv): Promise<EmailObserversView> {
  const db = getDb();
  const list = await readObserverList(db, env);
  let updatedBy: string | null = null;
  if (list.saved?.updatedBy) {
    const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, list.saved.updatedBy)).limit(1);
    updatedBy = u?.name ?? null;
  }
  return {
    addresses: list.addresses,
    source: list.source,
    envAddresses: observerAddressesFromEnv(env[COHORT_OBSERVER_ENV]).addresses,
    updatedAt: list.saved?.updatedAt ?? null,
    updatedBy,
  };
}

const sameList = (a: readonly string[] | null, b: readonly string[] | null): boolean =>
  a === null || b === null ? a === b : a.length === b.length && a.every((x, i) => x === b[i]);

export function registerEmailObserverRoutes(scope: FastifyInstance, limits: { read: number; write: number }, env: () => NodeJS.ProcessEnv): void {
  const rate = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });

  scope.get(
    INFRA_PATHS.emailObservers,
    { preHandler: [requireSession, requireConsole('ops.read')], config: rate(limits.read) },
    async (_req, reply): Promise<FastifyReply> => reply.send({ observers: await readEmailObservers(env()) }),
  );

  scope.post(
    INFRA_PATHS.emailObservers,
    { preHandler: [requireSession, requireJsonSameOrigin, requireConsole('flags.write')], config: rate(limits.write) },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
      if (!('addresses' in body)) return consoleError(reply, 'invalid_body', 'Send the addresses as a list: { "addresses": ["name@example.com"] }.');
      let next: string[] | null = null;
      if (body.addresses !== null) {
        const parsed = parseObserverAddresses(body.addresses);
        if (!parsed.ok) return consoleError(reply, 'invalid_body', parsed.error);
        next = parsed.addresses;
      }
      const now = clock.now();
      await getDb().transaction(async (tx) => {
        const [row] = await tx.select().from(consoleSettings).where(eq(consoleSettings.key, COHORT_OBSERVER_SETTING)).for('update');
        const before = row ? (await readObserverList(tx, env())).saved?.addresses ?? [] : null;
        if (sameList(before, next)) return;
        if (next === null) await tx.delete(consoleSettings).where(eq(consoleSettings.key, COHORT_OBSERVER_SETTING));
        else
          await tx
            .insert(consoleSettings)
            .values({ key: COHORT_OBSERVER_SETTING, value: { addresses: next }, updatedAt: now, updatedBy: actor.userId })
            .onConflictDoUpdate({ target: consoleSettings.key, set: { value: { addresses: next }, updatedAt: now, updatedBy: actor.userId } });
        await audit(
          req,
          {
            action: 'email_observers.save',
            outcome: 'ok',
            actor,
            target: { type: 'setting', id: COHORT_OBSERVER_SETTING, label: EMAIL_OBSERVERS_COPY.title },
            before: { addresses: before },
            after: { addresses: next },
          },
          tx,
        );
      });
      return reply.send({ observers: await readEmailObservers(env()) });
    },
  );
}
