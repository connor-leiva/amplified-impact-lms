// Gate 8's join-window line, over HTTP — phase 08 § 8.4.
//
//   "`GET /api/sessions/dec26-s3/join` returns 409 at 12:44 CT and 200 with the URL at 12:46 CT.
//    Jamie gets 403 for `dec26-s4` (Team tier)."
//
// ================================================================================================
// WHICH INSTANT, AND WHY IT IS DECEMBER 9 AND NOT DECEMBER 8
// ================================================================================================
// `dec26-s3` was MOVED. The seed's announcement `a1` says so in as many words — "Session 3 moved to
// Wed Dec 9 · 1:00 PM CT" — and `seed.ts` encodes the move in two places that are easy to read
// backwards:
//
//   mkSessions('dec26', 0, [… '2026-12-09' …])    →  s3.start     = 2026-12-09T13:00-06:00
//   sessions[2].movedFrom = T('2026-12-08T13:00') →  s3.movedFrom = 2026-12-08T13:00-06:00
//
// So `start` is already the NEW time and `movedFrom` is the old one — the `'live'` seed this suite
// loads needs no adjustment, and only `seed('week0')` (which rolls the cohort back before the move)
// puts Session 3 on December 8. Gate 8's "12:44 CT" and "12:46 CT" are therefore December 9, either
// side of the window that opens at 12:45 CT, and the first test below asserts exactly that rather
// than leaving it to this comment.
//
// Every instant in this file is written with an explicit `-06:00` (December in the program zone is
// CST) and handed to the API as `new Date(ms).toISOString()`, i.e. as UTC. Nothing here reads a
// host zone, so the suite gives the same result on this machine (America/Chicago, which IS the
// program zone) and on a CI runner in UTC. That is not a given in this repository — `fmt.*` falls
// back to the host zone when no viewer zone is set — so it is stated as a property and measured by
// running the suite both ways.
//
// ================================================================================================
// WHAT THESE TESTS ARE GUARDING AGAINST, CASE BY CASE
// ================================================================================================
// The route is the ONLY way a learner can obtain a Zoom URL: `scopeSnapshot` blanks `session.zoom`
// for every learner (`packages/core/src/scope.ts:41`, applied at `:123`, three @g7 tests). So each
// case below is a way of handing a live meeting to the wrong person, and one of them is asserted
// against the snapshot directly so the two halves are proved to fit:
//
//   the window           a URL revealed before 12:45, or still served after the session ended
//   the tier             an Agent-tier learner joining a Team-tier AI Employee's session
//   the cohort           a February learner joining a December session that is LIVE RIGHT NOW
//   an unknown id        a 409 or a 403 that confirms a session exists to somebody outside it
//   an unaccepted invite a seat that never onboarded joining anyway (reachable: see join.ts)
//   staff                a route with two kinds of caller and one set of checks
//   no cookie            Gate 7's 401 rule reaching a route that did not exist when it was written
//   caching              a 200 the browser re-serves after the window shut
//
// ================================================================================================
// HOW IT IS SET UP, AND WHY THE DATABASE IS SEEDED ONCE
// ================================================================================================
// Nothing here writes through the API: every case is a GET. So the fixture is loaded once in
// `beforeAll` and the cookies are minted once against it — which also means the comparisons are
// real comparisons ("Jamie is refused this while Alex is served it, from the same rows, at the same
// instant") instead of two observations of two databases. The one case that needs a different row
// (`goLive`'s `live` flag) UPDATEs that single column and puts it back, rather than reseeding and
// invalidating every cookie in the file.
//
// A fresh `build()` per test, like `test/authz.test.ts`: `@fastify/rate-limit`'s store is
// per-instance, and the sweep makes 36 requests — 18 per session cookie, against § 9.4's 100 per
// minute.
//
// TWO LEARNERS ARE PLANTED, because the seed cannot express either case. Every seeded learner is
// `status: 'active'` and in cohort `dec26`:
//
//   u_invitee  Team tier, `status: 'invited'`  — Team tier ON PURPOSE, so `status` is the ONLY
//              thing between them and the URL. If the status check went away this learner would
//              get a 200, not a different 403.
//   u_feb      Team tier, cohort `feb27`      — so "another cohort" can be tested in the direction
//              that matters: a learner outside December asking for the December session that is
//              live at this very instant.

import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { accessibleSessions, canAccess, joinMode, moduleForSession, seedForDatabase } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { JOIN_WINDOW_SHUT, TIER_REQUIRED } from '../src/routes/join';
import { sessions } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { loadDb, resetDatabase, testDatabase } from './helpers';

// --- the instants -------------------------------------------------------------------------------

/** Gate 8's "12:44 CT": one minute before the window opens. 2026-12-09T18:44Z. */
const SHUT = Date.parse('2026-12-09T12:44:00-06:00');
/** Gate 8's "12:46 CT": one minute after it opens. 2026-12-09T18:46Z. */
const OPEN = Date.parse('2026-12-09T12:46:00-06:00');
/** `dec26-s3`'s start, as the `'live'` seed has it after the move. */
const S3_START = Date.parse('2026-12-09T13:00:00-06:00');
/** `dec26-s4`'s own window, a day later — for the Jamie-is-refused-at-every-instant case. */
const S4_OPEN = Date.parse('2026-12-10T12:46:00-06:00');

const MINUTE = 60_000;

// --- the planted learners -----------------------------------------------------------------------

const INVITEE: Learner = {
  id: 'u_invitee',
  name: 'Tess Okafor',
  email: 'tess@northlinerealty.com',
  tier: 'team',
  role: 'Sales Agent',
  teamId: 'northline',
  cohortId: 'dec26',
  joined: Date.parse('2026-12-07T09:00:00-06:00'),
  last: null,
  status: 'invited',
  progress: {},
};

const FEBRUARY: Learner = {
  id: 'u_feb',
  name: 'Noor Haddad',
  email: 'noor@februaryrealty.com',
  tier: 'team',
  role: 'Team Owner',
  teamId: null,
  cohortId: 'feb27',
  joined: Date.parse('2027-01-20T09:00:00-06:00'),
  last: null,
  status: 'active',
  progress: {},
};

/** The `'live'` seed plus the two learners it cannot express. See the header. */
function fixture(): Db {
  const db = seedForDatabase('live');
  db.users = [...db.users, INVITEE, FEBRUARY];
  return db;
}

// --- harness ------------------------------------------------------------------------------------

let app: App;
let handle: Database;
/** The loaded database, for deriving expectations from the rows the route actually reads. */
let whole: Db;
const cookies = new Map<string, string>();

const join = (sessionId: string, cookie?: string) =>
  app.inject({
    method: 'GET',
    // Encoded exactly as `apps/web/src/data/http.ts` encodes it, so the id this route parses is the
    // id the client sent.
    url: `/api/sessions/${encodeURIComponent(sessionId)}/join`,
    ...(cookie === undefined ? {} : { headers: { cookie } }),
  });

/** Move § 7.7's test clock. `lib/clock.ts` reads the variable per call, so this takes effect at once. */
const at = (instant: number): void => {
  process.env.FIXED_NOW = new Date(instant).toISOString();
};

const cookieFor = (id: string): string => {
  const header = cookies.get(id);
  if (!header) throw new Error(`no session was minted for ${id}`);
  return header;
};

beforeAll(async () => {
  at(OPEN);
  handle = await testDatabase();
  await resetDatabase(fixture());
  whole = await loadDb();

  // One app just for the sign-ins: `signInAs` writes `auth_sessions` rows, which survive every test
  // in this file because nothing truncates after `beforeAll`.
  const minter = await build({ logger: false });
  for (const id of ['u_jamie', 'u_alex', 'u_invitee', 'u_feb', 'st1']) {
    cookies.set(id, await minter.signInAs(id));
  }
  await minter.close();
});

afterAll(() => {
  // Vitest isolates each test FILE in its own worker, so nothing in this repository reads this
  // after the run — but `isolate: false` or a change to `fileParallelism` would pin the next
  // file's clock to this suite's instant, and that failure would point at the wrong suite.
  delete process.env.FIXED_NOW;
});

beforeEach(async () => {
  at(OPEN);
  app = await build({ logger: false });
});

afterEach(async () => {
  // `app.close()`, never `shutdown(app)`: `shutdown` releases the pool `test/helpers.ts` owns, and
  // every later read in the file would then fail with CONNECTION_ENDED.
  await app?.close();
});

// ================================================================================================
// The suite
// ================================================================================================

describe('Gate 8 · the join window is enforced by the server (§ 8.4) @g8', () => {
  it('the seed pins the instant this suite uses: Session 3 was moved to December 9', () => {
    const s3 = whole.sessions.find((s) => s.id === 'dec26-s3');
    expect(s3, 'dec26-s3 must be in the database').toBeDefined();

    // `start` is the time AFTER the move and `movedFrom` is the old one. Asserted against the
    // loaded ROWS, so a seed edit that moved Session 3 again fails here — naming the instant — and
    // not in the four window cases below with an off-by-a-day that reads as a timezone bug.
    expect(s3?.start).toBe(S3_START);
    expect(s3?.start).toBe(Date.parse('2026-12-09T19:00:00Z'));
    expect(s3?.movedFrom).toBe(Date.parse('2026-12-08T13:00:00-06:00'));
    // Gate 8's two instants, relative to the 15-minute window `joinMode` opens.
    expect(S3_START - SHUT).toBe(16 * MINUTE);
    expect(S3_START - OPEN).toBe(14 * MINUTE);
  });

  it('returns 409 at 12:44 CT, with § 8.4’s exact body', async () => {
    at(SHUT);

    const res = await join('dec26-s3', cookieFor('u_jamie'));

    expect(res.statusCode).toBe(409);
    // The literal, not the imported constant: the constant and the client's own copy of this
    // sentence must not be able to drift together. `apps/web/src/data/http.ts` keys on the 409 and
    // `apps/web/src/data/join.ts` renders its own `JOIN_SHUT`, and all three are pinned to this
    // string.
    expect(res.json()).toEqual({ error: 'Join opens 15 min before' });
    expect(JOIN_WINDOW_SHUT).toBe('Join opens 15 min before');
  });

  it('returns 200 with the URL at 12:46 CT', async () => {
    at(OPEN);

    const res = await join('dec26-s3', cookieFor('u_jamie'));

    expect(res.statusCode).toBe(200);
    // Derived from the row rather than typed in, so the assertion is "the route serves the stored
    // meeting" and not "the route serves a string I copied". Measured in the current seed:
    // https://zoom.us/j/8841203352.
    const stored = whole.sessions.find((s) => s.id === 'dec26-s3')?.zoom;
    expect(stored).toMatch(/^https:\/\/zoom\.us\/j\/\d+$/);
    expect(res.json()).toEqual({ url: stored });
  });

  it('the window opens at exactly 15 minutes and not a millisecond earlier', async () => {
    // `joinMode`'s test is `s.start - now <= 15 * 60000`, so the boundary is INCLUSIVE. Pinned
    // because it is the one line a future "about 15 minutes" refactor would move, and a strict `<`
    // would make Gate 8's 12:46 pass while the button that says "Opens 15 Min Before" lies by a
    // millisecond at 12:45:00.000.
    at(S3_START - 15 * MINUTE);
    expect((await join('dec26-s3', cookieFor('u_jamie'))).statusCode).toBe(200);

    at(S3_START - 15 * MINUTE - 1);
    expect((await join('dec26-s3', cookieFor('u_jamie'))).statusCode).toBe(409);
  });

  it('stays open while the session runs and shuts when it has ended', async () => {
    // `sessionState` → 'live' for the 75 minutes after `start`, then 'replay'/'processing', which
    // `joinMode` maps to 'disabled'. A route that only compared `start - now` to 15 minutes would
    // have shut the door on everybody who was in the meeting.
    at(S3_START + 30 * MINUTE);
    expect((await join('dec26-s3', cookieFor('u_jamie'))).statusCode).toBe(200);

    at(S3_START + 75 * MINUTE + 1);
    const ended = await join('dec26-s3', cookieFor('u_jamie'));
    expect(ended.statusCode).toBe(409);
    expect(ended.json()).toEqual({ error: JOIN_WINDOW_SHUT });
  });

  it('opens for a session an admin took live before its start time', async () => {
    // § 8.4: "`goLive` and `endSession` stay manual admin actions." `goLive` sets `live: true`, and
    // `joinMode` honours it at any instant — so this is the case that proves the route asks
    // `joinMode` rather than doing its own clock arithmetic. `dec26-s2` ran on December 3 and its
    // replay is up, so without the flag this instant is a 409 (asserted first).
    at(SHUT);
    expect((await join('dec26-s2', cookieFor('u_jamie'))).statusCode).toBe(409);

    await handle.update(sessions).set({ live: true }).where(eq(sessions.id, 'dec26-s2'));
    try {
      const res = await join('dec26-s2', cookieFor('u_jamie'));
      expect(res.statusCode).toBe(200);
      expect((res.json() as { url: string }).url).toBe(whole.sessions.find((s) => s.id === 'dec26-s2')?.zoom);
    } finally {
      // One column back to where it was, rather than a reseed: a `resetDatabase` here would
      // truncate `auth_sessions` and every cookie in this file would 401 from the next test on.
      await handle.update(sessions).set({ live: false }).where(eq(sessions.id, 'dec26-s2'));
    }
  });

  it('does not let a 200 be cached and replayed after the window shuts', async () => {
    at(OPEN);

    const res = await join('dec26-s3', cookieFor('u_jamie'));

    // The body is the one field § 7.4 withholds from every learner's snapshot, and the window
    // closes. Without `no-store` the browser's own back/forward cache — or any proxy that ever
    // sits in front of this API — can re-serve it after `endSession`, from a response the server
    // cannot recall.
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('Gate 8 · Jamie gets 403 for dec26-s4 (§ 8.4, tier) @g8', () => {
  it('refuses the Team-tier session at Gate 8’s own instant', async () => {
    at(OPEN);

    const res = await join('dec26-s4', cookieFor('u_jamie'));

    // 403 and NOT 409, which is the whole content of this case: `dec26-s4` starts a day later, so
    // its window is shut at this instant too. If the window were checked before the tier, this
    // would be a 409 and Gate 8's line would be unprovable.
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'Team tier required' });
    expect(TIER_REQUIRED).toBe('Team tier required');
  });

  it('refuses it inside its own window too, so the 403 is about the tier and not the clock', async () => {
    at(S4_OPEN);

    expect((await join('dec26-s4', cookieFor('u_jamie'))).statusCode).toBe(403);
  });

  it('serves the same session to a Team-tier learner at that instant', async () => {
    // The positive control. Without it, "Jamie gets 403" is also satisfied by a route that refuses
    // everybody — and `dec26-s4`'s AI Employee (`meetings`) is exactly what Alex pays for.
    at(S4_OPEN);

    const res = await join('dec26-s4', cookieFor('u_alex'));

    expect(res.statusCode).toBe(200);
    expect((res.json() as { url: string }).url).toBe(whole.sessions.find((s) => s.id === 'dec26-s4')?.zoom);
  });

  // The per-test timeout is a measurement, not a guess. Every request runs `loadDb`'s fourteen
  // `select`s over Railway's TCP proxy, which costs ~2 s from this machine (measured: the
  // single-request cases above each take 2.0 s wall clock), so 36 requests is ~72 s — far past
  // `vitest.config.ts`'s 30 s default with nothing wrong. Raising the global default instead would
  // hide a genuinely hung test in every other suite.
  //
  // TWO viewers, not three, for the same reason: 54 requests measured 108 s, and the February
  // learner's cross-cohort arm is covered by two dedicated cases below — in both directions, and
  // at the instant when the December session is actually open, which is the leak that matters.
  // Jamie and Alex still sweep all three cohorts' sessions, so the cohort arm is in the sweep.
  it(
    'is the tier rule @ai/core already applies, over every session and every learner',
    async () => {
      // A sweep, not a spot check: two learners × all 18 sessions, with the expected status
      // DERIVED from the same rows (`moduleForSession` + `canAccess` + `joinMode` + the cohort), so
      // a session or module added to the seed widens the sweep for free. What this catches that the
      // single cases cannot is a check applied in the wrong ORDER for some other combination, and a
      // session whose AI Employee is a draft (`moduleForSession` → null) being refused when
      // `accessibleSessions` lists it.
      at(OPEN);
      const viewers = ['u_jamie', 'u_alex'];
      const seen: Record<string, number> = {};
      const want: Record<string, number> = {};

      for (const id of viewers) {
        const me = whole.users.find((u) => u.id === id)!;
        for (const s of whole.sessions) {
          const employee = moduleForSession(whole, s);
          const expected =
            s.cohortId !== me.cohortId
              ? 404
              : employee && !canAccess(me, employee)
                ? 403
                : joinMode(s, OPEN) === 'disabled'
                  ? 409
                  : 200;
          const key = `${id} ${s.id}`;
          want[key] = expected;
          seen[key] = (await join(s.id, cookieFor(id))).statusCode;
        }

        // And the set the route will even consider — anything that is not a 404 or a 403 — is
        // exactly the set `accessibleSessions` lists for this learner. That function is what the
        // portal's Sessions screen renders, so this is the assertion that a Join button can never
        // appear over a route that refuses it outright.
        const reachable = whole.sessions
          .filter((s) => want[`${id} ${s.id}`] === 200 || want[`${id} ${s.id}`] === 409)
          .map((s) => s.id);
        expect(reachable).toEqual(accessibleSessions(whole, me).map((s) => s.id));
      }

      expect(seen).toEqual(want);
      expect(Object.keys(seen)).toHaveLength(viewers.length * whole.sessions.length);
    },
    180_000,
  );
});

describe('Gate 8 · what the join route must not leak (§ 8.4) @g8', () => {
  it('is the only place a learner can get the URL at all', async () => {
    // The two halves of § 8.4, in one test. `scopeSnapshot` blanks `session.zoom` for learners
    // (scope.ts:41) — which is only meaningful because of this route, and this route is only
    // defensible because of that blanking.
    at(OPEN);
    const header = cookieFor('u_jamie');

    const snapshot = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie: header } });
    const scoped = snapshot.json() as Db;
    expect(scoped.sessions.every((s) => s.zoom === '')).toBe(true);
    // The positive control: the URL really is in the database, so the blank above is a withholding
    // and not an empty column.
    const stored = whole.sessions.find((s) => s.id === 'dec26-s3')!.zoom;
    expect(stored).not.toBe('');
    expect(snapshot.body).not.toContain(stored);

    const res = await join('dec26-s3', header);
    expect(res.statusCode).toBe(200);
    expect((res.json() as { url: string }).url).toBe(stored);
  });

  it('answers 404 — not 409 — for a session in another cohort, identically to one that does not exist', async () => {
    at(OPEN);
    const header = cookieFor('u_jamie');
    // The positive control again: `feb27-s1` is a real row with a real meeting on it, so the 404
    // below is the route withholding its existence rather than agreeing there is nothing there.
    const february = whole.sessions.find((s) => s.id === 'feb27-s1');
    expect(february?.zoom).toMatch(/^https:\/\/zoom\.us\/j\//);

    const other = await join('feb27-s1', header);
    const missing = await join('feb27-s1-does-not-exist', header);

    expect(other.statusCode).toBe(404);
    // The same answer as an id that names nothing, modulo the id the caller sent back to itself. A
    // 409 here ("the window is shut") or a distinct 403 would confirm that `feb27-s1` names a real
    // meeting, which is how one valid cookie enumerates the whole program's schedule.
    expect(other.statusCode).toBe(missing.statusCode);
    expect(other.json()).toEqual({ error: 'No session feb27-s1' });
    expect(missing.json()).toEqual({ error: 'No session feb27-s1-does-not-exist' });
    expect(other.body).not.toContain('zoom.us');
  });

  it('refuses a December session that is live right now to a February learner', async () => {
    // The direction that matters. At this instant `dec26-s3`'s window is OPEN and Jamie is being
    // served the URL (asserted above), so a cohort check that was missing or inverted hands a
    // meeting that is about to start to somebody who is not in it.
    at(OPEN);

    const res = await join('dec26-s3', cookieFor('u_feb'));

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'No session dec26-s3' });
    expect(res.body).not.toContain('zoom.us');
  });

  it('refuses a learner who has not accepted their invite', async () => {
    // `u_invitee` is TEAM tier and in the December cohort, so the tier and cohort checks both pass
    // and `status` is the only thing left. Reachable without the invite link: `/api/auth/request`
    // does not read `users.status`, so an invited seat can ask for an ordinary sign-in link and get
    // a session (`routes/auth.ts` flips the row to active only for `purpose: 'invite'`).
    at(OPEN);

    const res = await join('dec26-s3', cookieFor('u_invitee'));

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'Accept your invite before joining a session.' });
    expect(res.body).not.toContain('zoom.us');

    // The control: an ACTIVE Team-tier learner is served the same session at the same instant, so
    // the difference is `status` and nothing else.
    expect((await join('dec26-s3', cookieFor('u_alex'))).statusCode).toBe(200);
  });

  it('refuses staff, who have no Join button and already have every URL', async () => {
    // `useJoin` is imported by three portal screens and nothing in the admin console, and
    // `scopeForStaff` hands staff every `zoom` URL already — so this takes nothing away from them
    // and leaves the handler with exactly one kind of caller to check.
    at(OPEN);

    const res = await join('dec26-s3', cookieFor('st1'));

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'That action is for learners.' });
    expect(res.body).not.toContain('zoom.us');
  });

  it('answers 401 without a session cookie', async () => {
    // Gate 7: "An unauthenticated call to any `/api/*` route except `/api/health`, `/api/auth/*`
    // and `/api/events` returns 401." That rule was written before this route existed, so it is
    // asserted here rather than assumed — and it is the first check, so an anonymous caller cannot
    // even learn which ids are real.
    at(OPEN);

    const res = await join('dec26-s3');

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Not signed in' });
  });

  it('treats a slash in the id as part of the id, not as another route', async () => {
    // `http.ts` percent-encodes the segment and `http.test.ts` pins that
    // (`/api/sessions/dec26%2Fs3/join`). The decoded id must reach the handler whole, or an admin
    // who names something with a slash addresses a different route entirely.
    at(OPEN);

    const res = await join('dec26/s3', cookieFor('u_jamie'));

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'No session dec26/s3' });
  });
});
