// The two test-only routes — phase 07 § 7.7 and the Gate 7 checklist.
//
//   "Enable a test-only route `POST /api/test/session {userId}` **only** when
//    `NODE_ENV === 'test'`, so tests can sign in as a persona."
//   "the test mailbox (`/api/test/outbox`) receives one message"
//
// ================================================================================================
// THIS IS THE MOST DANGEROUS FILE IN THE API
// ================================================================================================
// `POST /api/test/session { userId: 'st1' }` is an unauthenticated route that hands the caller an
// Operations Lead's session cookie. Reachable in production it is not a bug, it is a total
// compromise of every account in the system, and it would be invisible: the API comes up healthy,
// every screen works, every test passes.
//
// So the guard is not "probably test mode". `isTestEnv` compares `NODE_ENV` to the EXACT string
// `'test'`:
//
//   - not truthiness   — `'production'` is truthy
//   - not a prefix     — `'testing'`, `'test-staging'`
//   - not case-folded  — `'TEST'`
//   - not a default    — an UNSET `NODE_ENV` is not test mode
//
// which is the same asymmetry `email/transport.ts`'s `resolveMode` is built on, pointed the other
// way: resolving wrongly toward test mode is unrecoverable, so only the one exact string does it.
//
// `test/routes.test.ts` asserts both halves: that the routes answer under `NODE_ENV=test`, and that
// an app built with every near-miss value answers 404 on both of them.
//
// WHY THE CHECK IS IN THIS FILE AS WELL AS IN `app.ts`. `app.ts` decides whether to call
// `registerTestRoutes` at all. This function re-checks and throws if it is called anyway, because
// the failure mode being defended against is a future edit to `app.ts` — a refactor that moves the
// registration, an `if` that grows an `||`. A function that cannot register itself in the wrong
// environment is a guard that survives its caller being rewritten.

import type { FastifyInstance } from 'fastify';
import { createSession, SESSION_COOKIE, sessionCookieOptions, settleEmails, userById } from '../auth';
import { getDb } from '../db/client';
import { outbox } from '../email/transport';
import { clock } from '../lib/clock';

/** § 7.7's guard. The exact string, nothing else. See the header. */
export const isTestEnv = (env: NodeJS.ProcessEnv = process.env): boolean => env.NODE_ENV === 'test';

export function registerTestRoutes(app: FastifyInstance): void {
  if (!isTestEnv()) {
    throw new Error(
      'registerTestRoutes was called with NODE_ENV=' +
        JSON.stringify(process.env.NODE_ENV) +
        ". These routes mint a session for any user id, so they exist only when NODE_ENV is exactly 'test'.",
    );
  }

  /**
   * § 7.7: sign in as a persona, by id.
   *
   * The same `createSession` and the same cookie options the real `/api/auth/verify` uses, on
   * purpose: a test signed in through this route is indistinguishable from one that followed a
   * magic link, so Gate 7's http-mode parity run exercises the real session path rather than a
   * second one that could diverge.
   *
   * The id must name a real `users` row. An unknown id answering 200 would hand a test a cookie
   * that 401s on the next request, and the failure would point at `requireSession`.
   */
  app.post<{ Body: { userId?: unknown } }>('/api/test/session', async (req, reply) => {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId : '';
    if (!userId) return reply.code(400).send({ error: 'Expected a JSON body of { userId }.' });

    const db = getDb();
    const user = await userById(db, userId);
    if (!user) return reply.code(404).send({ error: `No user ${userId}` });

    const sessionId = await createSession(db, user.id, clock.now());
    reply.setCookie(SESSION_COOKIE, sessionId, sessionCookieOptions());
    return reply.code(200).send({ ok: true, userId: user.id });
  });

  /**
   * Gate 7's test mailbox, and Gate 8's.
   *
   * `settleEmails()` first: `/api/auth/request` answers before it does any work (see
   * `auth/mailer.ts` on why), so without this join the "receives one message" assertion races the
   * send it is asserting about. Awaiting here rather than in the test keeps the race impossible
   * for every future reader of this route instead of for the ones who remember.
   */
  app.get('/api/test/outbox', async () => {
    await settleEmails();
    return { messages: outbox() };
  });
}
