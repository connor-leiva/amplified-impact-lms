// GET /api/snapshot — phase 07 § 7.4.
//
// Three lines, and the shortest file in the API on purpose. § 7.4 ends with:
//
//   "Implement this as `scopeSnapshot(db, actor): Db`, a pure function in `@ai/core/scope.ts`, so
//    it can be unit-tested."
//
// It is, and it has 40 tests. Everything this route could add — "also hide X", "but staff need Y",
// "strip the zoom URL here too" — would be a second, untested copy of the security boundary, and
// the two would drift the first time one of them was edited. So the route loads every row, calls
// the one function, and returns what it gets. If a field reaches the wrong viewer, there is exactly
// one file to fix and its tests are the ones that failed.
//
// WHY THE HANDLE AND NOT A TRANSACTION. `loadDb` issues fourteen `select`s, and a snapshot read
// wants them consistent with each other — which a transaction would guarantee and a bare handle
// does not. The handle is correct here anyway, because § 7.3 serializes every write behind
// `pg_advisory_xact_lock(42)` inside a single transaction: a writer's rows become visible all at
// once, at its commit, so the only way these fourteen queries can straddle a change is if a
// mutation commits between two of them. The result is then a snapshot that is one commit newer in
// some tables than others — and the client is about to refetch anyway, because the same commit
// broadcast `changed` on `/api/events`. Paying for a transaction (a held connection out of a pool
// of five, for every screen's every refetch) to avoid a state the next event already corrects is
// the wrong trade.
//
// `http.test.ts` pins the rest of the contract: the URL is `/api/snapshot`, the request carries
// `credentials: 'include'`, a 401 sends the viewer to `/sign-in`, and the repository returns the
// body unchanged — "the repository adds nothing and removes nothing, so the screens render exactly
// what the server scoped".

//
// THE ONE THING THE ROUTE ADDS: the viewer's plan (D-110). The AI Accelerator's modules and sessions
// are for a plan that opens the course, and every paid buyer sits in cohort `dec26` as Team tier, so
// the `Db` alone cannot tell who bought it. The route reads the learner's plans (lib/course-access.ts)
// and hands `scopeSnapshot` a yes or no; the filtering itself stays in the one tested function.

import { scopeSnapshot } from '@ai/core';
import type { Db } from '@ai/core';
import type { FastifyInstance } from 'fastify';
import { requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { clock } from '../lib/clock';
import { acceleratorAccess } from '../lib/course-access';

export function registerSnapshotRoute(app: FastifyInstance): void {
  app.get('/api/snapshot', { preHandler: requireSession }, async (req): Promise<Db> => {
    const { actor } = viewerOrThrow(req);
    const db = getDb();
    const access = actor.kind === 'learner' ? { accelerator: await acceleratorAccess(db, actor.userId, clock.now()) } : undefined;
    return scopeSnapshot(await loadDb(db), actor, access);
  });
}
