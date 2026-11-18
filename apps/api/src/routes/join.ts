// GET /api/sessions/:id/join — phase 08 § 8.4's server-enforced Zoom join window.
//
// § 8.4, in full:
//
//   "`scopeSnapshot` blanks `session.zoom` for learners.
//    `GET /api/sessions/:id/join` returns `{ url }` only if the learner can access the session's AI
//    Employee and `joinMode(session, now) !== 'disabled'`. Otherwise it returns
//    `409 { error: 'Join opens 15 min before' }`.
//    The web `JoinButton.onJoin` fetches this endpoint, then calls
//    `window.open(url, '_blank', 'noopener')`."
//
// ================================================================================================
// WHY THIS ROUTE IS THE WHOLE POINT OF THE BLANKING
// ================================================================================================
// `packages/core/src/scope.ts` strips `zoom` from every session in every learner's snapshot
// (`redactSession`, scope.ts:41, applied at :123). That is a withholding, not a deletion: the
// learner still has to be able to join. This route is the ONLY place a learner can obtain the URL,
// which means two things at once —
//
//   - the blanking is meaningful, because there is no second path to the same string; and
//   - this file is a security boundary. Anything it fails to check is a Zoom URL handed to somebody
//     the program did not sell a seat to, for a meeting that is live right now.
//
// So the checks below are ordered, and each one states what it is keeping out.
//
// ================================================================================================
// THE FIVE ANSWERS, AND WHY EACH ONE IS THE STATUS IT IS
// ================================================================================================
//   401  not signed in                      `requireSession` (Gate 7: "any /api/* route except
//                                            /api/health, /api/auth/* and /api/events")
//   404  no such session, for this viewer    an unknown id AND a session in another cohort
//   403  this viewer may not reach it        staff, an unaccepted invite, a tier that cannot
//                                            access the session's AI Employee
//   409  the window is shut                  `joinMode(session, now) === 'disabled'`
//   200  `{ url }`                           the session's Zoom URL
//
// 404 FOR ANOTHER COHORT'S SESSION, AND IT IS THE SAME 404 BYTE FOR BYTE. `scopeForLearner` filters
// `sessions` to the viewer's own cohort, so a February learner's sessions do not exist as far as a
// December learner is concerned — and the answer has to say exactly that. A 409 ("the window is
// shut") would confirm the id names a real meeting, which is how an outsider with one valid cookie
// enumerates the program's whole schedule; a distinct 403 would do the same. `test/join.test.ts`
// asserts the two responses — a session in another cohort, and an id that does not exist — are
// identical in status and body.
//
// 403 WHERE THE TIER CANNOT REACH THE AI EMPLOYEE, AND IT COMES BEFORE THE WINDOW CHECK. This is
// Gate 8's own case: "Jamie gets 403 for `dec26-s4` (Team tier)". `dec26-s4` starts a day after
// `dec26-s3`, so at Gate 8's instant its window is shut as well — if the window were checked first
// Jamie would get a 409 and the gate line would be unprovable. The order is also the honest one:
// "you cannot reach this AI Employee" is true at every instant, while "the window is shut" is true
// only now, and telling a learner to come back in 15 minutes for a session they can never join is
// the worse answer. Unlike the cohort case this discloses nothing: `dec26-s4` is already in Jamie's
// snapshot (scope filters sessions by cohort, not by tier) and the Team-tier badge on the AI
// Employee is what SCREENS § 2.2 renders at him.
//
// 403 FOR STAFF. The admin console has no Join button — `apps/web/src/data/join.ts`'s `useJoin` is
// imported by exactly three portal screens (Dashboard, Sessions, EmployeeDetail) — and staff
// already receive every `zoom` URL in their own snapshot (`scopeForStaff` withholds only the auth
// tables), so refusing them here takes nothing away from them. What it buys is that this handler
// has exactly one kind of caller, and the checks below do not have to be written twice. The message
// is `@ai/core`'s own: `mutations.ts`'s `asLearner` says "That action is for learners."
//
// 403 FOR AN UNACCEPTED INVITE. `POST /api/auth/request` does not look at `users.status`, so a
// learner who was invited and never followed the invite link can still ask for an ordinary sign-in
// link and get a session cookie (`routes/auth.ts`: only `purpose: 'invite'` flips the row to
// `status: 'active'`). Without this check that person joins live sessions while the Team Hub still
// shows their seat as Invited. `@ai/core` already draws this line the same way — `learnerCount`
// and `nudgeLearners` both filter on `u.status !== 'invited'` — so this is that rule applied to the
// one asset an un-onboarded seat must not reach. Flagged for DECISIONS.md: § 8.4 does not name it.
//
// ================================================================================================
// WHY `joinMode` IS CALLED AND NOT REIMPLEMENTED
// ================================================================================================
// `packages/core/src/sessions.ts` is the file the prototype's own join button reads, and
// `sessionVM` derives the `join: 'disabled' | 'ready' | 'live'` state the button renders from the
// same function. Calling it is what keeps the server's answer and the button's appearance from
// disagreeing — a button that says Join and a route that says 409 is a bug report; a button that
// says "Opens 15 Min Before" over a route that hands out the URL is a leak. In particular
// `joinMode` returns `'live'` for a session whose `live` flag an admin set with `goLive`, BEFORE
// its start time, which is a real admin workflow (§ 8.4: "`goLive` and `endSession` stay manual
// admin actions") and not something a `start - now <= 15 * 60000` of my own would have covered.
//
// The same argument covers `moduleForSession` + `canAccess`: that pair is precisely what
// `accessibleSessions` applies, so the set of sessions this route will open is the set the portal
// lists. `test/join.test.ts` asserts that equality over every session in the database rather than
// trusting this sentence.
//
// ================================================================================================
// WHY IT LOADS THE WHOLE DATABASE FOR THREE ROWS
// ================================================================================================
// `loadDb` is fourteen `select`s and this handler reads three tables. A targeted read would be
// cheaper — but it would also be a second decoder: `db/codec.ts`'s `fromRows` is what turns
// `sessions.start` into a number (`num(r.start)`), and `joinMode` does arithmetic on it. A
// hand-rolled projection that returned the column as postgres-js hands it over would compare a
// string against a number and fail silently in the direction of opening the window. One decoder,
// which `test/io.test.ts` already covers, is worth fourteen round trips on a button a learner
// clicks twice a week — and it is the same cost `GET /api/snapshot` pays on every refetch. If join
// traffic ever concentrates (134 learners clicking inside the same minute), the fix is a
// `sessions`+`modules`+`users` read through the same codec, not a second decoder.

import { canOpenModule, joinMode, moduleForSession } from '@ai/core';
import { isAcceleratorModule } from '@ai/core/accelerator';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { clock } from '../lib/clock';
import { acceleratorAccess } from '../lib/course-access';
import { recordUsage } from '../lib/usage';

/**
 * § 8.4's 409 body, verbatim and exact.
 *
 * `apps/web/src/data/http.ts` turns a 409 into `{ kind: 'shut' }` without reading the body, and
 * `apps/web/src/data/join.ts` toasts its OWN copy of this sentence (`JOIN_SHUT`) so that the UI's
 * strings stay the UI's. Both files' tests pin the string on their side; this is the server's, and
 * `test/join.test.ts` asserts the literal rather than this constant so the two cannot drift
 * together.
 */
export const JOIN_WINDOW_SHUT = 'Join opens 15 min before';

/** The 403 for a tier that cannot reach the session's AI Employee. `@ai/core`'s own wording. */
export const TIER_REQUIRED = 'Team tier required';

export function registerJoinRoute(app: FastifyInstance): void {
  app.get<{ Params: { id: string } }>(
    '/api/sessions/:id/join',
    // `requireSession` only. § 9.4's `requireJsonSameOrigin` is for mutations: this is a GET with
    // no body, and a cross-site `fetch` of it is blocked by the same thing that blocks reading
    // `/api/snapshot` — no CORS plugin is registered, so the browser never hands the response to
    // the page that asked for it.
    { preHandler: requireSession },
    async (req, reply): Promise<FastifyReply> => {
      const { id } = req.params;
      const { actor } = viewerOrThrow(req);

      // Staff first, because everything below reads a LEARNER row and a staff actor has none.
      if (actor.kind !== 'learner') {
        return reply.code(403).send({ error: 'That action is for learners.' });
      }

      const db = await loadDb(getDb());
      const me = db.users.find((u) => u.id === actor.userId);
      const session = db.sessions.find((s) => s.id === id);

      // ONE answer for three states: the id names nothing, the id names a session in a cohort this
      // learner is not in, and (unreachably, but `scopeSnapshot`'s `denyAll` is total for the same
      // reason) a session cookie whose learner row has since been deleted. See the header on why
      // they must be indistinguishable.
      if (!me || !session || session.cohortId !== me.cohortId) {
        return reply.code(404).send({ error: `No session ${id}` });
      }

      // An AI Accelerator session for a plan that does not open the course (D-110). Every paid buyer
      // is in this cohort, so the cohort check above cannot catch it. The same 404 as another
      // cohort's session, because the snapshot leaves these sessions out for this viewer entirely.
      const owner = moduleForSession(db, session);
      const course = owner && isAcceleratorModule(owner.id) ? await acceleratorAccess(getDb(), me.id, clock.now()) : undefined;
      if (course === false) {
        return reply.code(404).send({ error: `No session ${id}` });
      }

      // An invited seat that never accepted. See the header: reachable through an ordinary sign-in
      // link, because `/api/auth/request` does not read `status`.
      if (me.status !== 'active') {
        return reply.code(403).send({ error: 'Accept your invite before joining a session.' });
      }

      // `null` module — a session with no published AI Employee behind it — is OPEN to everyone in
      // the cohort, which is `accessibleSessions`'s own `!m || canAccess(u, m)`. Diverging here
      // would make the portal list a session this route then refuses.
      // D-186: a course week's build follows course access (checked just above), not the tier, so an Agent
      // tier learner who bought the course joins it; every other session's module follows the tier.
      const employee = moduleForSession(db, session);
      if (employee && !canOpenModule(me, employee, course)) {
        return reply.code(403).send({ error: TIER_REQUIRED });
      }

      // The window. `clock.now()` so § 7.7's FIXED_NOW drives it, which is how Gate 8's "409 at
      // 12:44 CT and 200 at 12:46 CT" is a test rather than a stopwatch.
      if (joinMode(session, clock.now()) === 'disabled') {
        return reply.code(409).send({ error: JOIN_WINDOW_SHUT });
      }

      // `no-store`, and it is not decoration. This body is the one thing § 7.4 withholds from the
      // snapshot, and the window CLOSES: a cached 200 would let the browser (or any proxy that
      // ever sits in front of this API) re-serve the URL after `endSession`, from a response the
      // server has no way to recall. It also keeps the URL out of the back/forward cache.
      reply.header('cache-control', 'no-store');
      recordUsage(req, me.id, 'session_join'); // D-166: a usage count, once the join is handed out; it changes nothing here.
      // `session.zoom` as stored, not as scoped — this handler read the UNSCOPED `db` on purpose.
      // An empty string here would mean a session row with no meeting behind it; the client reads
      // that as shut (`http.ts`: "a 200 with no URL is shut, not an open tab on this origin"),
      // which is the right outcome and the reason it is not special-cased into a 409.
      return reply.code(200).send({ url: session.zoom });
    },
  );
}
