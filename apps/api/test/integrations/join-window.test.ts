// Gate 8's fourth automated line — phase 08 § 8.4's server-enforced join window.
//
//   "`GET /api/sessions/dec26-s3/join` returns 409 at 12:44 CT and 200 with the URL at 12:46 CT.
//    Jamie gets 403 for `dec26-s4` (Team tier)."
//
// ================================================================================================
// WHICH DAY 12:44 AND 12:46 ARE ON, WHICH THE CHECKLIST DOES NOT SAY
// ================================================================================================
// `dec26-s3` was moved to Wednesday December 9 (the seed's own announcement `a1` says so, and
// `seed.ts` writes the new instant into `start` with the old one in `movedFrom`). Its window opens
// at `start - 15 min` = **12:45 CT on December 9**, so the checklist's two times bracket that
// boundary by a minute either side. The first assertion derives both instants from the row rather
// than trusting this paragraph.
//
// ================================================================================================
// WHAT MAKES THIS AN INTEGRATION TEST RATHER THAN A SECOND COPY OF `test/join.test.ts`
// ================================================================================================
// `test/join.test.ts` is the route's own suite: every status code, the cohort 404, the unaccepted
// invite, the `accessibleSessions` sweep. What it cannot assert from inside itself is the thing
// § 8.4 is FOR, which spans two routes:
//
//   `scopeSnapshot` blanks `session.zoom` for every learner (`scope.ts` › `redactSession`), and
//   this route is the ONLY place a learner can obtain it.
//
// If the blanking regressed, `/api/snapshot` would hand every learner every Zoom URL for every
// session in their cohort and the join route would still pass its own suite perfectly — the window
// would simply have stopped being a window. So the test below asks BOTH routes the same question at
// the same instant with the same cookie, and asserts that the snapshot withholds exactly the string
// the join route reveals. That pair is the contract; neither half states it alone.
//
// The Team-tier case is the same rule as `session-reminder.test.ts`'s audience, read from the other
// side: Session 4 teaches the `meetings` AI Employee (`tier: 'team'`), so Jamie — Agent tier — is
// neither reminded of it nor let into it, and Alex is both. Asserting Jamie's 403 AT SESSION 4's OWN
// OPEN INSTANT, beside Alex's 200 at that same instant, is what makes it a tier refusal rather than
// a window refusal: a 403 inside an open window cannot be the clock.
//
// ================================================================================================
// TIME ZONES
// ================================================================================================
// Every instant here is written with an explicit `-06:00` (December in the program zone is CST) and
// compared as epoch ms. `joinMode` is arithmetic on `session.start`, and the route's body is the
// stored URL — no `fmt.*` call anywhere on the path, so nothing can fall back to the host's zone.
// Run both ways regardless; see the report.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { canAccess, joinMode, moduleForSession, seedForDatabase } from '@ai/core';
import type { Db } from '@ai/core';
import { build } from '../../src/app';
import type { App } from '../../src/app';
import { loadDb, resetDatabase, testDatabase } from '../helpers';

/** Gate 8's "12:44 CT": one minute before `dec26-s3`'s window opens. */
const SHUT_ISO = '2026-12-09T12:44:00-06:00';
/** Gate 8's "12:46 CT": one minute after it opens. */
const OPEN_ISO = '2026-12-09T12:46:00-06:00';
/** `dec26-s4`'s own open instant, a day later — so Jamie's 403 cannot be the clock. */
const S4_OPEN_ISO = '2026-12-10T12:46:00-06:00';

const MINUTE = 60e3;

/** § 8.4's two exact bodies. Literals, not imports from the route: see `join.ts`'s own note. */
const SHUT_BODY = { error: 'Join opens 15 min before' };
const TIER_BODY = { error: 'Team tier required' };

let app: App;

beforeAll(async () => {
  await testDatabase();
});

beforeEach(async () => {
  // Reseeded per test because `app.signInAs` writes an `auth_sessions` row and `resetDatabase`
  // truncates it, so the cookie has to be minted after the load — and the clock has to be pinned
  // before the cookie, since `createSession` dates the row from `clock.now()`.
  await resetDatabase(seedForDatabase('live'));
  app = await build({ logger: false });
});

afterEach(async () => {
  await app?.close();
});

afterAll(() => {
  delete process.env.FIXED_NOW;
});

// --- helpers --------------------------------------------------------------------------------------

/** Pin § 7.7's clock, then hand back the instant so a test can do arithmetic on it. */
function at(iso: string): number {
  process.env.FIXED_NOW = iso;
  return Date.parse(iso);
}

/** Exactly the URL `apps/web/src/data/join.ts` fetches, with `credentials: 'include'`. */
const joinUrl = (id: string): string => `/api/sessions/${encodeURIComponent(id)}/join`;

const join = (id: string, cookie: string) =>
  app.inject({ method: 'GET', url: joinUrl(id), headers: { cookie } });

/** This viewer's snapshot, which is where § 7.4's `scopeSnapshot` has already run. */
async function snapshotFor(cookie: string): Promise<Db> {
  const res = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie } });
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as Db;
}

// --------------------------------------------------------------------------------------------------

describe('Gate 8 · the Zoom URL exists only inside the join window, and only for the right tier @g8', () => {
  it('12:44 and 12:46 CT bracket `dec26-s3.start - 15 min`, on December 9 @g8', async () => {
    at(OPEN_ISO);
    const db = await loadDb();
    const s3 = db.sessions.find((s) => s.id === 'dec26-s3')!;
    const opens = s3.start - 15 * MINUTE;
    expect(opens).toBe(Date.parse('2026-12-09T12:45:00-06:00'));
    expect(Date.parse(SHUT_ISO)).toBe(opens - MINUTE);
    expect(Date.parse(OPEN_ISO)).toBe(opens + MINUTE);
    // `joinMode` is the function the route calls and the one the portal's Join button renders from,
    // so the checklist's two instants are a window state before they are a status code.
    expect(joinMode(s3, Date.parse(SHUT_ISO))).toBe('disabled');
    expect(joinMode(s3, Date.parse(OPEN_ISO))).toBe('ready');
  });

  it('409 with § 8.4’s exact sentence at 12:44 CT @g8', async () => {
    at(SHUT_ISO);
    const cookie = await app.signInAs('u_jamie');

    const res = await join('dec26-s3', cookie);
    expect(res.statusCode, res.body).toBe(409);
    expect(res.json()).toEqual(SHUT_BODY);
    // `apps/web/src/data/http.ts` resolves a 409 as `{ kind: 'shut' }` WITHOUT reading the body —
    // so the status code is the whole contract for the client, and the sentence is the contract for
    // anything that does read it (a curl, a staging smoke test). Both are pinned.
  });

  it('200 with the stored URL at 12:46 CT — and the snapshot still withholds it @g8', async () => {
    const now = at(OPEN_ISO);
    const cookie = await app.signInAs('u_jamie');

    const db = await loadDb();
    const s3 = db.sessions.find((s) => s.id === 'dec26-s3')!;
    // Derived from the row, not from the literal in the seed: the route's job is to hand over what
    // is stored, and pinning the string here would pass even if it stopped doing that.
    expect(s3.zoom).toMatch(/^https:\/\/zoom\.us\/j\/\d+$/);

    const res = await join('dec26-s3', cookie);
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({ url: s3.zoom });
    // A presigned-credential rule applied to a URL that is one: the window CLOSES, and a cacheable
    // 200 would let the browser re-serve this after `endSession` from a response the server cannot
    // recall.
    expect(res.headers['cache-control']).toBe('no-store');

    // THE OTHER HALF OF § 8.4, and the reason this test exists beside `test/join.test.ts`. The same
    // learner, the same cookie, the same instant: the snapshot has the session and not the URL.
    const scoped = await snapshotFor(cookie);
    const scopedS3 = scoped.sessions.find((s) => s.id === 'dec26-s3');
    expect(scopedS3, 'the session is in the learner’s snapshot; only its URL is withheld').toBeDefined();
    expect(scopedS3!.zoom).toBe('');
    // Every session, not just this one — a blanking that regressed for the sessions whose window is
    // shut would be the leak that matters most.
    for (const s of scoped.sessions) expect(s.zoom).toBe('');
    // And the window the route just opened is the one the portal would draw a Join button over.
    expect(joinMode(scopedS3!, now)).toBe('ready');
  });

  it('Jamie gets 403 for dec26-s4 even inside its own window, while Alex gets 200 @g8', async () => {
    const now = at(S4_OPEN_ISO);
    const jamie = await app.signInAs('u_jamie');
    const alex = await app.signInAs('u_alex');

    const db = await loadDb();
    const s4 = db.sessions.find((s) => s.id === 'dec26-s4')!;
    const employee = moduleForSession(db, s4);
    // Session 4 teaches the Meetings AI Employee, which is Team tier. That — not the clock — is
    // what refuses Jamie, and the window is demonstrably open: `joinMode` says `ready` and Alex is
    // served at this very instant.
    expect(employee?.id).toBe('meetings');
    expect(employee?.tier).toBe('team');
    expect(joinMode(s4, now)).toBe('ready');

    const jamieRow = db.users.find((u) => u.id === 'u_jamie')!;
    const alexRow = db.users.find((u) => u.id === 'u_alex')!;
    expect(jamieRow.tier).toBe('agent');
    expect(alexRow.tier).toBe('team');
    expect(canAccess(jamieRow, employee!)).toBe(false);
    expect(canAccess(alexRow, employee!)).toBe(true);

    const refused = await join('dec26-s4', jamie);
    expect(refused.statusCode, refused.body).toBe(403);
    expect(refused.json()).toEqual(TIER_BODY);

    const served = await join('dec26-s4', alex);
    expect(served.statusCode, served.body).toBe(200);
    expect(served.json()).toEqual({ url: s4.zoom });

    // Session 3 is Agent tier, so the refusal is per AI Employee and not per learner: Jamie is let
    // into the session he is enrolled for at ITS open instant. Without this, a route that refused
    // Jamie everything would pass the line above.
    at(OPEN_ISO);
    const jamieAgain = await app.signInAs('u_jamie');
    const s3 = (await loadDb()).sessions.find((s) => s.id === 'dec26-s3')!;
    const allowed = await join('dec26-s3', jamieAgain);
    expect(allowed.statusCode, allowed.body).toBe(200);
    expect(allowed.json()).toEqual({ url: s3.zoom });
  });
});
