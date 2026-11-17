// Masquerade in the fixture build (D-162 3b): a simulated session, so e2e and the review screenshots
// can show the banner, the Console's pause, Extend, Exit and the blocked dialog with no API. FIXTURE
// ONLY: `masquerade.ts` loads it behind `VITE_DATA_SOURCE === 'fixture'`, and `console-build.test.ts`
// proves the http build has none of it, so a real session can never be faked.
//
// The session lives in this tab's sessionStorage. Start writes it and makes the tab the fixture's
// learner (`ai-lms-role`, the persona `boot.ts` reads); Exit clears it and makes the tab staff again.
// One fixture-only query parameter, read here and nowhere else:
//   ?masquerade=demo   the mockup's own demo session (its toolbar's "Masquerade" button): Elena Vargas
//                      of Northshore Group, "Customer reports Week 2 steps are out of order.", 15:00 left
//   ?masquerade=max    the same session at its 60-minute cap (Extend reads "Max 60 min")
// During a session every portal write is refused, as the server's write block would refuse it.

import {
  CONSOLE_ERRORS,
  MASQUERADE_DURATION_MS,
  MASQUERADE_MAX_MS,
  cleanMasqueradeReason,
  extendedExpiry,
} from '@ai/core';
import type { MasqueradeCurrent, MasqueradeView } from '@ai/core';
import { repo } from './boot';
import { BLOCKED_MESSAGE, masqueradeBlocked } from './http';
import { MasqueradeError } from './masquerade';
import type { MasqueradeClient, MasqueradeTarget } from './masquerade';

const KEY = 'ai-lms-masquerade';
const ROLE = 'ai-lms-role';

/** The mockup's demo session (`USERS[0]` and its toolbar's reason). */
export const DEMO = {
  id: 'u_1042',
  name: 'Elena Vargas',
  workspace: 'Northshore Group',
  reason: 'Customer reports Week 2 steps are out of order.',
} as const;

const store = {
  read(): MasqueradeView | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as MasqueradeView) : null;
    } catch {
      return null;
    }
  },
  write(v: MasqueradeView | null, role: 'agent' | 'admin' | null): void {
    try {
      if (v) sessionStorage.setItem(KEY, JSON.stringify(v));
      else sessionStorage.removeItem(KEY);
      if (role) sessionStorage.setItem(ROLE, role);
    } catch {
      /* session storage unavailable: the simulation lasts this page */
    }
  },
};

export function fixtureSession(
  target: MasqueradeTarget,
  reason: string,
  startedFrom: string | null,
  now: number,
  atCap = false,
): MasqueradeView {
  return {
    id: 'mq_fixture',
    target: { id: target.id, name: target.name, teamName: target.workspace },
    staff: { id: 'st1', name: 'Connor Leiva' },
    reason,
    startedAt: atCap ? now - MASQUERADE_MAX_MS + MASQUERADE_DURATION_MS : now,
    expiresAt: now + MASQUERADE_DURATION_MS,
    hardExpiresAt: atCap ? now + MASQUERADE_DURATION_MS : now + MASQUERADE_MAX_MS,
    extendCount: atCap ? 3 : 0,
    canExtend: !atCap,
    startedFrom,
  };
}

const refuse = (code: keyof typeof CONSOLE_ERRORS): MasqueradeError =>
  new MasqueradeError(CONSOLE_ERRORS[code].status, code, CONSOLE_ERRORS[code].message ?? code);

let blocking = false;
/** The write block: every portal write during a session is refused and opens the blocked dialog. */
function blockWrites(): void {
  if (blocking) return;
  blocking = true;
  repo.run = (name) => {
    masqueradeBlocked(`POST /api/mutate/${name}`);
    return Promise.resolve({ error: BLOCKED_MESSAGE });
  };
}

export function createMasqueradeFixture(
  search: string = location.search,
  now: () => number = () => Date.now(),
): MasqueradeClient {
  const seed = new URLSearchParams(search).get('masquerade');
  if (seed === 'demo' || seed === 'max')
    store.write(fixtureSession(DEMO, DEMO.reason, null, now(), seed === 'max'), null);

  const current = (): MasqueradeCurrent => ({ session: store.read(), serverNow: now() });
  return {
    async current() {
      const cur = current();
      if (cur.session && cur.session.expiresAt <= cur.serverNow) {
        store.write(null, 'admin');
        return { session: null, serverNow: cur.serverNow };
      }
      if (cur.session) blockWrites();
      return cur;
    },
    async start(target, reason, startedFrom) {
      const why = cleanMasqueradeReason(reason);
      if (why === null) throw refuse('reason_required');
      if (store.read()) throw refuse('masquerade_active');
      store.write(fixtureSession(target, why, startedFrom, now()), 'agent');
      return { redirect: '/' };
    },
    async extend(reason) {
      const s = store.read();
      if (!s) throw refuse('masquerade_ended');
      const why = cleanMasqueradeReason(reason);
      if (why === null) throw refuse('reason_required');
      const expiresAt = extendedExpiry(s.expiresAt, s.hardExpiresAt);
      if (expiresAt === null) throw refuse('masquerade_max_reached');
      const next = {
        ...s,
        reason: why,
        expiresAt,
        extendCount: s.extendCount + 1,
        canExtend: extendedExpiry(expiresAt, s.hardExpiresAt) !== null,
      };
      store.write(next, null);
      return { session: next, serverNow: now() };
    },
    async exit() {
      const s = store.read();
      store.write(null, 'admin');
      return { redirect: s?.startedFrom ?? '/admin' };
    },
  };
}
