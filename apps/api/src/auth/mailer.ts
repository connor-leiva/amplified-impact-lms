// Getting mail out WITHOUT letting the work's duration be observable — phase 07 § 7.5.
//
//   "`POST /api/auth/request {email}`. Always returns `200 {ok:true}`, so it does not reveal
//    whether an account exists."
//
// Status and body are the easy half. The hard half is time. If the handler does the work before it
// answers, then a known address costs a `users` lookup, an `auth_tokens` insert and a Resend round
// trip — tens to hundreds of milliseconds — and an unknown one costs a lookup and nothing else.
// That gap is large enough to read with a stopwatch from the other side of the internet, and
// `apps/web/src/routes/auth/SignIn.test.tsx` already asserts the UI cannot tell the two apart; an
// endpoint whose latency can is the same leak with extra steps.
//
// The fix is not to balance the two branches — a decoy token row for every address somebody types
// is junk in a table nothing prunes, and "the two branches cost the same" is a property that
// decays the first time either one grows a line. The fix is to take ALL of it off the request
// path: `/api/auth/request` rate-limits, answers `200 {ok:true}`, and only then hands the lookup,
// the mint, the insert and the send to this module. There is nothing left for the response time to
// be a function of.
//
// -----------------------------------------------------------------------------------------------
// WHY THE PROMISES ARE TRACKED RATHER THAN DROPPED
// -----------------------------------------------------------------------------------------------
// A bare `void doTheWork()` would be a floating promise, with three consequences that are not
// theoretical:
//
//   1. The Gate 7 sign-in test is "request a link for `jamie@ortizhomes.com`: the test mailbox
//      (`/api/test/outbox`) receives one message". With the work in flight and nothing to wait on,
//      that assertion races it and fails intermittently — the worst possible result for a security
//      test, because the fix people reach for is a `setTimeout`.
//   2. `shutdown()` (§ 9.4's SIGTERM drain) would close the process mid-send, so a redeploy in the
//      second after a sign-in request silently eats that learner's link.
//   3. An unhandled rejection terminates Node by default, so one malformed address would become
//      "the API restarts whenever somebody signs in".
//
// `settleEmails()` is the join point the first two need. It is awaited by `/api/test/outbox` and by
// `shutdown()`, and by nothing on the request path — so it does not reintroduce the channel.
//
// `send()` never throws by contract (`email/transport.ts`, decision 1): a bad address, a template
// that throws and a 500 from Resend are all logged and reported in the return value. The `catch`
// below is for the case that contract is ever broken, and for the database work queued alongside
// it, which has no such contract.

import { send } from '../email/transport';
import type { SendRequest, TemplateName } from '../email/transport';

const inFlight = new Set<Promise<void>>();

/**
 * Run `task` in the background, tracked by `settleEmails`.
 *
 * `label` is only ever used in the failure log; it names the thing the viewer did not receive,
 * which is the one fact that is not recoverable from the error itself.
 */
export function queueMailTask(label: string, task: () => Promise<void>): void {
  // `task()` is invoked inside the promise chain rather than before it, so a synchronous throw from
  // the function itself is caught by the same handler as a rejection.
  const tracked = (async () => task())()
    .catch((err: unknown) => {
      console.error(`[auth] ${label} failed`, err);
    })
    .finally(() => {
      inFlight.delete(tracked);
    });
  inFlight.add(tracked);
}

/**
 * Start a send and return immediately.
 *
 * Deliberately returns `void`, not the promise: a caller that could await it is a caller that
 * will, and the whole point is that the request does not.
 */
export function queueEmail<K extends TemplateName>(request: SendRequest<K>): void {
  queueMailTask(`${request.template} to ${request.to}`, async () => {
    const result = await send(request);
    // `send` reports a failure rather than throwing, and nothing on the request path reads the
    // result, so this is the only place a dropped sign-in link becomes visible.
    if (!result.ok) console.error(`[auth] ${request.template} for ${request.to} was not delivered`);
  });
}

/** How many background tasks are outstanding. For a test that wants to assert the queue drained. */
export const pendingEmails = (): number => inFlight.size;

/**
 * Wait for every queued task to finish.
 *
 * Loops rather than awaiting one `Promise.all` over a snapshot of the set, because a task can
 * queue another one — `issueSignInLink` does exactly that, enqueuing the send once it has minted
 * the token — and a single pass would return while the second generation was still running.
 */
export async function settleEmails(): Promise<void> {
  while (inFlight.size > 0) await Promise.all([...inFlight]);
}
