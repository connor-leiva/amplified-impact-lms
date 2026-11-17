import { ADMIN_ACTIONS, DB_KEY, DB_V, seed, type Db, type Phase } from '@ai/core';
import type { Outcome } from '@ai/core';
import * as M from '@ai/core/mutations';
import { MutationError } from '@ai/core';
import { clock } from '../lib/clock';
import type { AdminActionArgs, AdminActionName, LmsRepository, MutationArgs, MutationName, MutationResult, Viewer } from './repository';

/**
 * The prototype, in the browser.
 *
 * It uses the SAME localStorage keys and shapes as `design-reference/lms-data.js`, so a fixture tab
 * and a prototype tab stay in sync — which is how side-by-side QA works. It is also what the
 * compliance suite runs against and what the public demo environment serves.
 */

const PERSONA = {
  agent: { kind: 'learner', userId: 'u_jamie' },
  owner: { kind: 'learner', userId: 'u_alex' },
  admin: { kind: 'staff', staffId: 'st1' },
} as const;

export type FixtureRole = keyof typeof PERSONA;

/** Identical to the prototype's `dbKey`. */
export const dbKey = (phase: Phase) => DB_KEY + (phase !== 'live' ? ':' + phase : '');

/**
 * `parity` (D-160 R2-2): the R2 parity snapshot, when the address asks for it (`boot.ts`). It replaces
 * the stored database for this tab only: it is never written to localStorage and another tab's write
 * never replaces it, so the ordinary fixture and the parity one never mix.
 */
export function createFixtureRepository(role: FixtureRole, phase: Phase, parity: Promise<Db> | null = null): LmsRepository {
  const load = (): Db => {
    try {
      const stored = JSON.parse(localStorage.getItem(dbKey(phase)) || 'null') as Db | null;
      if (stored && stored.v === DB_V) return stored;
    } catch {
      /* corrupt or unavailable storage falls back to a fresh seed */
    }
    return seed(phase);
  };

  let db = load();
  let n = 0;
  const listeners = new Set<() => void>();
  const ready = parity?.then((p) => {
    db = p;
  });

  type Ctx = { now: number; id: (p: string) => string };
  /** Run one mutation or action on the current db: keep its db, tell the listeners, answer the rest. */
  const apply = async (exec: (c: Ctx) => Outcome): Promise<MutationResult> => {
    await ready;
    const ctx: Ctx = { now: clock.now(), id: (p: string) => `${p}${clock.now().toString(36)}${(n++).toString(36)}` };
    let out: Outcome;
    try {
      out = exec(ctx);
    } catch (e) {
      // A thrown MutationError is an authorization or programming failure. The UI surfaces it the
      // same way the API will (phase 07), rather than letting it escape as an unhandled rejection.
      if (e instanceof MutationError) return { error: e.message };
      throw e;
    }
    if (!out.error) {
      db = out.db;
      try {
        if (!parity) localStorage.setItem(dbKey(phase), JSON.stringify(db));
      } catch {
        /* over quota: the change still applies in memory for this tab */
      }
      listeners.forEach((f) => f());
    }
    const { db: _next, ...rest } = out;
    // An action's audit row is the server's to write; the screens get the toast and the error.
    delete (rest as { audit?: unknown }).audit;
    return rest;
  };

  // Another tab (the admin console, or the prototype itself) wrote the database.
  window.addEventListener('storage', (e) => {
    if (e.key === dbKey(phase) && !parity) {
      db = load();
      listeners.forEach((f) => f());
    }
  });

  return {
    source: 'fixture',
    async viewer(): Promise<Viewer> {
      return { actor: PERSONA[role], role };
    },
    async snapshot() {
      await ready;
      return db;
    },
    async run<K extends MutationName>(name: K, args: MutationArgs<K>): Promise<MutationResult> {
      const fn = M[name] as (db: Db, a: typeof PERSONA[FixtureRole], args: MutationArgs<K>, c: Ctx) => Outcome;
      return apply((c) => fn(db, PERSONA[role], args, c));
    },
    // D-172: the audited Build actions run here as the mutations do. There is no audit log in the
    // browser (the Console's fixture keeps its own); the server writes the row in http mode.
    async act<K extends AdminActionName>(name: K, args: AdminActionArgs<K>): Promise<MutationResult> {
      const fn = ADMIN_ACTIONS[name] as (db: Db, a: typeof PERSONA[FixtureRole], args: AdminActionArgs<K>, c: Ctx) => Outcome;
      return apply((c) => fn(db, PERSONA[role], args, c));
    },
    // Phase 08 § 8.2. The prototype has no bucket and never did: its Download buttons serialise a
    // Blob in the browser. Answering `null` is what keeps that true — every parity scenario and
    // every e2e behaviour runs here, so a stored-file path appearing in fixture mode would be a
    // regression against the captured golden, not a feature.
    fileUrl() {
      return null;
    },
    // Phase 08 § 8.4. There is no `/api/sessions/:id/join` to ask, and the prototype's Zoom URL is
    // already in the snapshot, so the screen keeps the `Opening Zoom · …` toast the reference
    // shows. Async only because the interface is; it settles on the next microtask.
    async joinTicket() {
      return { kind: 'simulated' };
    },
    subscribe(f) {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
  };
}

export const resetFixture = (phase: Phase) => {
  try {
    localStorage.removeItem(dbKey(phase));
  } catch {
    /* nothing to reset if storage is unavailable */
  }
};
