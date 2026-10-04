// The scheduler's idempotence keys — phase 08 § 8.5.
//
// § 8.5 gives the whole mechanism in two sentences: "Every job is idempotent. Record sends in a
// `job_runs(job, key, sent_at)` table with a unique `(job, key)`. For example, the key
// `session-24h:dec26-s3:u_jamie` is sent once."
//
// So the key is not a detail of the ledger — it IS the promise that a learner is not emailed
// twice. Two different sends that collide onto one key silently lose one of them; one send whose
// key changes between two ticks is sent twice. Both failures are invisible in the outbox and
// visible only in somebody's inbox, which is why the whole format lives in this one function
// instead of being interpolated at five call sites, and why `keys.test.ts` tests it directly
// rather than through `dueWork`.
//
// The format is § 8.5's example, read literally: `<job>:<scope>:<recipient>`.
//   job        which of § 8.5's jobs sent it. NOT the email template: the 48 h job and a Team
//              Owner's manual "Remind" both send `build-reminder`, and they must not share a key —
//              a learner who was nudged by hand on Tuesday still gets Thursday's automatic one.
//   scope      the thing the send is about: a session id, an announcement id, or the Monday a
//              digest covers. The one field that answers "the same email, but about what?".
//   recipient  the learner id. Per recipient, because § 8.5's example is per recipient: fourteen
//              learners getting Session 3's reminder is fourteen rows, so a crash halfway through
//              a run resumes instead of re-sending to everyone.
//
// `@ai/core`'s own `Effect` type carries `to: string[]` — one effect, many recipients. That shape
// cannot be used here: a single row for a fan-out records only that *something* was sent.

/** § 8.5's five jobs, plus the scheduled-announcement send, in `runDue`'s order. */
export const JOB_NAMES = [
  'session-24h',
  'session-1h',
  'replay-ready',
  // § 8.5 calls the function `buildNotFinished48h`. The job name is short because it is a key
  // prefix, and the key is in a database row and in nothing else.
  'build-48h',
  'weekly-digest',
  // `scheduledAnnouncements` flips status and, when the `email` channel is set, sends. The flip
  // needs no key (the status change is its own record); the send does.
  'announcement',
] as const;

export type JobName = (typeof JOB_NAMES)[number];

/**
 * The separator, stated once. Every id this key is built from — session, announcement, learner —
 * comes from `@ai/core`'s own data, and none of them contains a colon.
 */
const SEP = ':';

/**
 * `<job>:<scope>:<recipient>`.
 *
 * Throws rather than returning a malformed key. A key is a uniqueness constraint, and the two ways
 * to break one are both silent at the call site:
 *   - an empty part (`session-24h::u_jamie`) collides with the next send that is also missing that
 *     part, so the second learner is never emailed at all;
 *   - a part containing a colon (`weekly-digest:2026-12-07T08:00:u_alex`) makes two different
 *     triples parse to the same string, with the same result.
 * The scheduler runs inside a transaction, so a throw abandons that tick and the next one retries —
 * which is the correct outcome for data this malformed, and far better than a lost reminder.
 */
export function jobKey(job: JobName, scope: string, recipient: string): string {
  for (const [label, part] of [
    ['scope', scope],
    ['recipient', recipient],
  ] as const) {
    if (!part) throw new Error(`jobKey(${job}): ${label} is empty`);
    if (part.includes(SEP)) throw new Error(`jobKey(${job}): ${label} "${part}" contains "${SEP}"`);
  }
  return [job, scope, recipient].join(SEP);
}

/**
 * The `job` column for a key, i.e. the key's own first segment.
 *
 * `job_runs` stores both (§ 8.5 specifies both columns), so the two have to agree: a row whose
 * `job` says one thing and whose `key` begins with another would make the unique `(job, key)`
 * admit two rows for the same send. Deriving the column from the key is what makes that
 * impossible, so the ledger write never restates the job by hand.
 */
export function jobOf(key: string): JobName {
  const head = key.split(SEP)[0];
  const job = JOB_NAMES.find((j) => j === head);
  if (!job) throw new Error(`jobOf: "${key}" does not start with a known job name`);
  return job;
}
