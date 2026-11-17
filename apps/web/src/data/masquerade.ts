// Masquerade in the browser (D-162 3b, spec § 6 Web): the client for Start, current, Extend and Exit,
// and the one store every page reads, so the banner, the Console's pause and the palette agree.
//
// THE SESSION IS THE SERVER'S. `GET …/current` answers this request's session or null, for any
// signed-in viewer (D-162), so the root asks once on load, on focus and every 30 seconds while one
// runs. A visitor who is not signed in gets a 401 here, which is quietly "no session": the app's
// sign-in redirect is for the portal's own reads, not this one. Start and Exit end in a full page
// load, so no cached snapshot of the other person survives either way.
//
// The fixture build answers from `masquerade-fixture.ts` instead (a simulated session for e2e and
// screenshots), loaded behind `VITE_DATA_SOURCE`, so the http build cannot simulate one.

import { useSyncExternalStore } from 'react';
import { MASQUERADE_PATHS } from '@ai/core';
import type { MasqueradeCurrent, MasqueradeView } from '@ai/core';
import { masqueradeRefusal, navigation, sitePath } from './http';

/** A refusal: the status, the API's code and its sentence, which the reason dialog shows. */
export class MasqueradeError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'MasqueradeError';
  }
}

/** Who a session is started as: the dialog names them, the API takes the id. */
export interface MasqueradeTarget {
  id: string;
  name: string;
  workspace: string | null;
}

export interface MasqueradeClient {
  /** This viewer's session, or null when there is none (or nobody is signed in). */
  current(): Promise<MasqueradeCurrent | null>;
  start(target: MasqueradeTarget, reason: string, startedFrom: string | null): Promise<{ redirect: string }>;
  extend(reason: string): Promise<MasqueradeCurrent>;
  exit(): Promise<{ redirect: string }>;
}

const UNREACHED = 'The request didn’t reach the server.';

async function send(fetchImpl: typeof fetch, url: string, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      credentials: 'include',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new MasqueradeError(0, null, UNREACHED);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: unknown; code?: unknown };
  if (res.ok) return data;
  if (res.status === 401) {
    navigation.toSignIn();
    throw new MasqueradeError(401, null, 'Not signed in');
  }
  masqueradeRefusal(res.status, data);
  throw new MasqueradeError(
    res.status,
    typeof data.code === 'string' ? data.code : null,
    typeof data.error === 'string' ? data.error : `HTTP ${res.status}`,
  );
}

export function createMasqueradeHttp(fetchImpl: typeof fetch = (...a) => fetch(...a)): MasqueradeClient {
  return {
    async current() {
      let res: Response;
      try {
        res = await fetchImpl(MASQUERADE_PATHS.current, {
          credentials: 'include',
          headers: { accept: 'application/json' },
        });
      } catch {
        return null;
      }
      if (res.status === 401) return null;
      const data = (await res.json().catch(() => null)) as MasqueradeCurrent | null;
      if (!res.ok) {
        // An ended session is on its way back to the staff page; nothing here should move first.
        if (masqueradeRefusal(res.status, data) === 'ended')
          throw new MasqueradeError(409, 'masquerade_ended', 'This masquerade session has ended.');
        return null;
      }
      return data;
    },
    start: async (target, reason, startedFrom) =>
      (await send(fetchImpl, MASQUERADE_PATHS.start, {
        targetUserId: target.id,
        reason,
        ...(startedFrom ? { startedFrom } : {}),
      })) as { redirect: string },
    extend: async (reason) => (await send(fetchImpl, MASQUERADE_PATHS.extend, { reason })) as MasqueradeCurrent,
    exit: async () => (await send(fetchImpl, MASQUERADE_PATHS.exit, {})) as { redirect: string },
  };
}

let client: Promise<MasqueradeClient> | null = null;

/** The client for this build: the API, or in the fixture build its simulation. */
export function masqueradeClient(): Promise<MasqueradeClient> {
  client ??=
    import.meta.env.VITE_DATA_SOURCE === 'fixture'
      ? import('./masquerade-fixture').then((m) => m.createMasqueradeFixture())
      : Promise.resolve(createMasqueradeHttp());
  return client;
}

// ---- the store -----------------------------------------------------------------------------------

export type MasqueradeState =
  | { status: 'unknown' }
  | { status: 'none' }
  /** `skew`: the server's clock minus this browser's, so the countdown is the server's. */
  | { status: 'active'; session: MasqueradeView; skew: number };

let state: MasqueradeState = { status: 'unknown' };
const subscribers = new Set<() => void>();

function set(next: MasqueradeState): void {
  const was = state.status;
  state = next;
  subscribers.forEach((f) => f());
  // A session began or ended in another tab: this page holds the other person's data, so reload it.
  if ((was === 'none' && next.status === 'active') || (was === 'active' && next.status === 'none'))
    navigation.assign(`${location.pathname}${location.search}`);
}

const apply = (cur: MasqueradeCurrent | null, at = Date.now()): void =>
  set(cur?.session ? { status: 'active', session: cur.session, skew: cur.serverNow - at } : { status: 'none' });

export const masquerade = {
  get: (): MasqueradeState => state,
  subscribe(f: () => void): () => void {
    subscribers.add(f);
    return () => subscribers.delete(f);
  },
  /** Ask the server again. A failed read leaves a known state alone, and makes an unknown one "none". */
  async refresh(): Promise<void> {
    try {
      apply(await (await masqueradeClient()).current());
    } catch {
      if (state.status === 'unknown') set({ status: 'none' });
    }
  },
  /** Start, then the learner's landing page. A refusal throws for the dialog to show. */
  async start(target: MasqueradeTarget, reason: string, startedFrom: string | null): Promise<void> {
    const { redirect } = await (await masqueradeClient()).start(target, reason, startedFrom);
    navigation.assign(sitePath(redirect));
  },
  /** Extend by 15 minutes with a new reason. A refusal throws for the dialog to show. */
  async extend(reason: string): Promise<void> {
    apply(await (await masqueradeClient()).extend(reason));
  },
  /** Exit, then where the API sends staff back (the page the session started from). */
  async exit(): Promise<void> {
    const { redirect } = await (await masqueradeClient()).exit();
    navigation.assign(sitePath(redirect));
  },
};

/** Whether a session is running (the palette's seam, R2-1c part 2). */
export const masqueradeActive = (): boolean => state.status === 'active';

export function useMasquerade(): MasqueradeState {
  return useSyncExternalStore(masquerade.subscribe, masquerade.get, masquerade.get);
}

/** Tests only: forget the session and the client. */
export function resetMasquerade(
  next: MasqueradeState = { status: 'unknown' },
  c: MasqueradeClient | null = null,
): void {
  state = next;
  client = c ? Promise.resolve(c) : null;
  subscribers.forEach((f) => f());
}
