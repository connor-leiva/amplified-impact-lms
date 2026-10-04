import type { Db, Outcome } from '@ai/core';
import type { Actor } from '@ai/core/mutations';
import * as M from '@ai/core/mutations';

/**
 * The one seam between the screens and where the data lives.
 *
 * `FixtureRepository` reproduces the prototype in the browser and powers both the compliance suite
 * and the sales demo; `HttpRepository` (phase 07) talks to the API. Screens never know which.
 */

/** Every exported mutation name. `MutationError` is a class, not a mutation, so it is excluded. */
export type MutationName = {
  [K in keyof typeof M]: (typeof M)[K] extends (...args: never[]) => unknown ? K : never;
}[keyof typeof M];

export type MutationArgs<K extends MutationName> = Parameters<(typeof M)[K]>[2];

/** What a mutation hands back to the UI. The new Db is applied by the repository, not the caller. */
export type MutationResult = Omit<Outcome, 'db'>;

export type ViewerRole = 'agent' | 'owner' | 'admin' | 'learner';

export interface Viewer {
  actor: Actor;
  role: ViewerRole;
}

export interface LmsRepository {
  readonly source: 'fixture' | 'http';
  viewer(): Promise<Viewer>;
  /** Role-scoped in http mode; the whole demo database in fixture mode. */
  snapshot(): Promise<Db>;
  run<K extends MutationName>(name: K, args: MutationArgs<K>): Promise<MutationResult>;
  /** Cross-tab storage events in fixture mode, Server-Sent Events in http mode. */
  subscribe(onChange: () => void): () => void;
}

export const isMutationName = (name: string): name is MutationName =>
  Object.prototype.hasOwnProperty.call(M, name) && typeof (M as Record<string, unknown>)[name] === 'function';
