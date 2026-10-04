import type { Db, MutationArgs, MutationName, Outcome } from '@ai/core';
import type { Actor } from '@ai/core/mutations';
import * as M from '@ai/core/mutations';

/**
 * The one seam between the screens and where the data lives.
 *
 * `FixtureRepository` reproduces the prototype in the browser and powers both the compliance suite
 * and the sales demo; `HttpRepository` (phase 07) talks to the API. Screens never know which.
 */

// The catalog types live in `@ai/core/catalog` so that these screens and the API's request schemas
// derive them from the same `mutations.ts`; re-exported here because this is where the screens
// import the rest of the seam from.
export type { MutationArgs, MutationName };

/** What a mutation hands back to the UI. The new Db is applied by the repository, not the caller. */
export type MutationResult = Omit<Outcome, 'db'>;

export type ViewerRole = 'agent' | 'owner' | 'admin' | 'learner';

export interface Viewer {
  actor: Actor;
  role: ViewerRole;
}

// ---------------------------------------------------------------------------------------------
// Phase 08 § 8.2 · stored files
// ---------------------------------------------------------------------------------------------

/**
 * A file that exists as an OBJECT IN THE BUCKET, named the way § 8.2's two routes name it.
 *
 * The union is deliberately narrow, because most of what this app downloads is not in the bucket
 * at all. Every `.ics` (the Dashboard's Add to Calendar and its office-hours quick link, every
 * Sessions row, the replay screen's Add to Calendar), both CSV exports (Team Hub, Learners), the
 * admin Export Report and the build kit's System Prompt are all GENERATED in the browser from the
 * snapshot — the calendar file is serialised by `ics()`, the prompt is a column on the AI Employee.
 * Asking `/api/files/...` for one of those would request an object nobody ever stored, so a working
 * calendar button would answer 404. Only the two kinds § 8.2 really stores are expressible here.
 */
export type StoredFileRef =
  /** A Resource & Compliance Vault row → `GET /api/files/resource/:id`. */
  | { kind: 'resource'; id: string }
  /**
   * A build-kit skill file or per-employee resource → `GET /api/files/module/:moduleId/:fileName`.
   * `fileName` is the file's own name — the same name the browser saves it under.
   */
  | { kind: 'moduleFile'; moduleId: string; fileName: string };

// ---------------------------------------------------------------------------------------------
// Phase 08 § 8.4 · the Zoom join window
// ---------------------------------------------------------------------------------------------

/**
 * The answer to "may this viewer join, and where?".
 *
 * In http mode the URL is never in a snapshot — `scopeSnapshot` blanks `session.zoom` for learners
 * — so it is resolved at click time and only inside the join window.
 */
export type JoinTicket =
  /** Fixture mode: no server to ask, so the screen keeps the prototype's `Opening Zoom · …` toast. */
  | { kind: 'simulated' }
  /** `200 { url }`: the window is open. */
  | { kind: 'open'; url: string }
  /** `409 { error: 'Join opens 15 min before' }`: the window is not open yet. */
  | { kind: 'shut' };

export interface LmsRepository {
  readonly source: 'fixture' | 'http';
  viewer(): Promise<Viewer>;
  /** Role-scoped in http mode; the whole demo database in fixture mode. */
  snapshot(): Promise<Db>;
  run<K extends MutationName>(name: K, args: MutationArgs<K>): Promise<MutationResult>;
  /** Cross-tab storage events in fixture mode, Server-Sent Events in http mode. */
  subscribe(onChange: () => void): () => void;
  /**
   * Where a stored file lives, or `null` when the caller must produce the bytes itself (§ 8.2).
   *
   * http mode answers with one of the two `/api/files/...` routes, which 302-redirect to a
   * presigned GET. Fixture mode answers `null`, because the prototype has no bucket, and the
   * screens then write the Blob they always wrote. Synchronous on purpose: a download has to leave
   * the click that asked for it or a popup blocker eats it.
   */
  fileUrl(ref: StoredFileRef): string | null;
  /** The session's Zoom URL, resolved at click time (§ 8.4). */
  joinTicket(sessionId: string): Promise<JoinTicket>;
}

export const isMutationName = (name: string): name is MutationName =>
  Object.prototype.hasOwnProperty.call(M, name) && typeof (M as Record<string, unknown>)[name] === 'function';
