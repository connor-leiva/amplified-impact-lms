// apps/api/src/jobs — phase 08 § 8.5's scheduler.
//
// What exists: the decision (`dueWork`) and the idempotence keys (`jobKey`). Both are pure.
//
// What does not exist yet, deliberately: `scheduler.ts` — § 8.5's `setInterval`, the
// `pg_try_advisory_xact_lock(4242)` that keeps one replica in charge, and `runDue(tx, now, …)`.
// Those need a database connection and a Fastify app, neither of which this repository has yet, so
// they are deferred rather than stubbed. `due.ts`'s header carries the wrapper they become.
export { dueWork, NO_KEYS, GRACE } from './due';
export type { DueWork, Send } from './due';
export { JOB_NAMES, jobKey, jobOf } from './keys';
export type { JobName } from './keys';
