// The Console's own flags, PR 9 (D-168, spec § 7.13, D8, D10): `console_flags`, read through a short
// cache, and the flip.
//
//   POST /api/console/flags/:key   { on, typed? } → { flag }. `flags.write`, and for a sensitive flag
//                                  `flags.write_sensitive` (the Owner) with the key typed exactly.
//                                  One audit row (`flag.flip`): before, after, the actor. A flip to the
//                                  state the flag already has writes nothing.
//
// The keys are `CONSOLE_FLAGS` (@ai/core), a closed list the table's CHECK repeats; v1 has one,
// `masquerade_enabled`. A key with no row reads as its default. Env switches are not flags here: the
// Console only reads them (D10, `infra-env.ts`).
//
// THE CACHE. Masquerade's Start and Extend ask `consoleFlagOn('masquerade_enabled')` (3a's
// `masqueradeEnabled()` seam), so the answer is kept for 30 seconds and dropped at once by a flip in
// this process; another replica sees a flip within those 30 seconds. A read that fails is never
// cached, and answers OFF: a masquerade can't start while the Console can't tell whether the Owner
// turned it off.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { CONSOLE_FLAGS, INFRA_PATHS, consoleFlagDef, flagTypedOk, flagWriteCap, isConsoleFlagKey } from '@ai/core';
import type { ConsoleFlagKey, ConsoleFlagView, FlagFlipResult } from '@ai/core';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { consoleFlags, users } from '../db/schema';
import { clock } from '../lib/clock';
import { audit } from './audit';
import { consoleAllows, consoleError, requireConsole, staffActor } from './guard';

/** How long a flag's state is reused before it is read again (a flip here drops it at once). */
export const FLAG_CACHE_MS = 30_000;

let cache: { at: number; on: ReadonlyMap<string, boolean> } | null = null;

/** Forget the cached states: after a flip, and between tests. */
export function invalidateConsoleFlags(): void {
  cache = null;
}

/** Every Console flag's state, default where no row says otherwise. Uncached. */
async function readStates(db: Database): Promise<Map<string, boolean>> {
  const rows = await db.select({ key: consoleFlags.key, on: consoleFlags.on }).from(consoleFlags);
  const on = new Map<string, boolean>(CONSOLE_FLAGS.map((f) => [f.key, f.defaultOn]));
  for (const r of rows) if (on.has(r.key)) on.set(r.key, r.on);
  return on;
}

/**
 * Whether a Console flag is on, through the 30-second cache. A failed read answers false and is not
 * cached (see the header).
 */
export async function consoleFlagOn(key: ConsoleFlagKey, db: Database = getDb()): Promise<boolean> {
  const now = clock.now();
  if (cache && now - cache.at < FLAG_CACHE_MS && now >= cache.at) return cache.on.get(key) ?? false;
  try {
    const on = await readStates(db);
    cache = { at: now, on };
    return on.get(key) ?? false;
  } catch {
    return false;
  }
}

/** Every Console flag as the Environment Flags page lists it, with who last flipped it. Uncached. */
export async function readConsoleFlags(db: Database = getDb()): Promise<ConsoleFlagView[]> {
  const rows = await db
    .select({ key: consoleFlags.key, on: consoleFlags.on, updatedAt: consoleFlags.updatedAt, updatedBy: users.name })
    .from(consoleFlags)
    .leftJoin(users, eq(users.id, consoleFlags.updatedBy));
  return CONSOLE_FLAGS.map((f) => {
    const r = rows.find((x) => x.key === f.key);
    return {
      key: f.key,
      label: f.label,
      on: r ? r.on : f.defaultOn,
      source: 'console',
      sensitive: f.sensitive,
      updatedAt: r?.updatedAt ?? null,
      updatedBy: r?.updatedBy ?? null,
    };
  });
}

const bodyOf = (b: unknown): Record<string, unknown> => (b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : {});

export function registerFlagRoutes(scope: FastifyInstance, rate: { write: number }): void {
  scope.post(
    INFRA_PATHS.flagFlip,
    { preHandler: [requireSession, requireJsonSameOrigin, requireConsole('flags.write')], config: { rateLimit: { max: rate.write, timeWindow: '1 minute' } } },
    async (req, reply): Promise<FastifyReply> => {
      const viewer = viewerOrThrow(req);
      const key = (req.params as { key?: unknown }).key;
      if (!isConsoleFlagKey(key)) return consoleError(reply, 'not_found', 'That flag isn’t one the Console owns.');
      const def = consoleFlagDef(key);
      // D8: a sensitive flag is the Owner's alone. A refusal here is audited like any other.
      if (!(await consoleAllows(req, reply, viewer, flagWriteCap(def)))) return reply;
      const actor = staffActor(viewer)!;
      const b = bodyOf(req.body);
      if (typeof b.on !== 'boolean') return consoleError(reply, 'invalid_body', 'Say whether the flag is on: { "on": true } or false.');
      if (!flagTypedOk(def, b.typed)) return consoleError(reply, 'invalid_body', `Type ${def.key} to confirm.`);
      const on = b.on;
      const db = getDb();
      const now = clock.now();
      const changed = await db.transaction(async (tx) => {
        const [row] = await tx.select({ on: consoleFlags.on }).from(consoleFlags).where(eq(consoleFlags.key, def.key)).for('update');
        const before = row ? row.on : def.defaultOn;
        if (before === on) return false;
        // The switch-on time: stamped by an off-to-on flip, cleared by an on-to-off one. The cohort
        // welcome mails only enrollments made after it (`enrolledBeforeSwitch`).
        const turnedOnAt = on ? now : null;
        await tx
          .insert(consoleFlags)
          .values({ key: def.key, on, sensitive: def.sensitive, updatedAt: now, updatedBy: actor.userId, turnedOnAt })
          .onConflictDoUpdate({ target: consoleFlags.key, set: { on, sensitive: def.sensitive, updatedAt: now, updatedBy: actor.userId, turnedOnAt } });
        await audit(
          req,
          { action: 'flag.flip', outcome: 'ok', actor, target: { type: 'flag', id: def.key, label: def.label }, before: { on: before }, after: { on, sensitive: def.sensitive } },
          tx,
        );
        return true;
      });
      if (changed) invalidateConsoleFlags();
      const flag = (await readConsoleFlags(db)).find((f) => f.key === def.key)!;
      const out: FlagFlipResult = { flag };
      return reply.send(out);
    },
  );
}
