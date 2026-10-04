import { DB_KEY, DB_V, seed, type Db, type Phase } from '@ai/core';
import * as M from '@ai/core/mutations';
import { MutationError } from '@ai/core';
import { clock } from '../lib/clock';
import type { LmsRepository, MutationArgs, MutationName, MutationResult, Viewer } from './repository';

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

export function createFixtureRepository(role: FixtureRole, phase: Phase): LmsRepository {
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

  // Another tab (the admin console, or the prototype itself) wrote the database.
  window.addEventListener('storage', (e) => {
    if (e.key === dbKey(phase)) {
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
      return db;
    },
    async run<K extends MutationName>(name: K, args: MutationArgs<K>): Promise<MutationResult> {
      const ctx = { now: clock.now(), id: (p: string) => `${p}${clock.now().toString(36)}${(n++).toString(36)}` };
      const fn = M[name] as (db: Db, a: typeof PERSONA[FixtureRole], args: MutationArgs<K>, c: typeof ctx) => ReturnType<typeof M.markDeployed>;
      let out;
      try {
        out = fn(db, PERSONA[role], args, ctx);
      } catch (e) {
        // A thrown MutationError is an authorization or programming failure. The UI surfaces it the
        // same way the API will (phase 07), rather than letting it escape as an unhandled rejection.
        if (e instanceof MutationError) return { error: e.message };
        throw e;
      }
      if (!out.error) {
        db = out.db;
        try {
          localStorage.setItem(dbKey(phase), JSON.stringify(db));
        } catch {
          /* over quota: the change still applies in memory for this tab */
        }
        listeners.forEach((f) => f());
      }
      const { db: _next, ...rest } = out;
      return rest;
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
