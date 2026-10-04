// The key format is the whole idempotence mechanism (§ 8.5), so it is tested directly rather than
// only through `dueWork`: a key that changes shape sends every reminder a second time, and a key
// that collides drops one — and `dueWork`'s own tests would still pass in both cases, because they
// compare keys to keys.
import { describe, it, expect } from 'vitest';
import { JOB_NAMES, jobKey, jobOf } from './keys';

describe('§8.5 job keys @g8', () => {
  it('builds the key § 8.5 gives by example @g8', () => {
    // docs/phases/08-integrations.md § 8.5: "the key `session-24h:dec26-s3:u_jamie` is sent once".
    // This is the one assertion in the file that is copied from the spec rather than derived.
    expect(jobKey('session-24h', 'dec26-s3', 'u_jamie')).toBe('session-24h:dec26-s3:u_jamie');
  });

  it('separates the three parts for every job @g8', () => {
    expect(JOB_NAMES.map((j) => jobKey(j, 'scope', 'u_1'))).toEqual([
      'session-24h:scope:u_1',
      'session-1h:scope:u_1',
      'replay-ready:scope:u_1',
      'build-48h:scope:u_1',
      'weekly-digest:scope:u_1',
      'announcement:scope:u_1',
    ]);
  });

  it('gives two recipients of one send two keys @g8', () => {
    // The property that makes a half-finished run resumable: fourteen learners are fourteen rows.
    expect(jobKey('session-24h', 'dec26-s3', 'u_jamie')).not.toBe(jobKey('session-24h', 'dec26-s3', 'u_alex'));
  });

  it('gives two jobs about one session two keys @g8', () => {
    // 24 h and 1 h are two emails about the same session to the same person. Sharing a key would
    // mean the 1 h reminder is suppressed by the 24 h one having been sent.
    expect(jobKey('session-24h', 'dec26-s3', 'u_jamie')).not.toBe(jobKey('session-1h', 'dec26-s3', 'u_jamie'));
  });

  it('refuses a part that would collide with another send @g8', () => {
    // A colon inside a part makes two different triples produce one string: `weekly-digest` scoped
    // to `2026-12-07T08:00` for `u_alex` would be indistinguishable from the same job scoped to
    // `2026-12-07T08` for `00:u_alex`. Both sends then share one row and one is never sent.
    expect(() => jobKey('weekly-digest', '2026-12-07T08:00', 'u_alex')).toThrow(/contains ":"/);
    expect(() => jobKey('announcement', 'a3', 'u:alex')).toThrow(/contains ":"/);
  });

  it('refuses an empty part @g8', () => {
    // `session-24h::u_jamie` would be the key for every session at once.
    expect(() => jobKey('session-24h', '', 'u_jamie')).toThrow(/scope is empty/);
    expect(() => jobKey('session-24h', 'dec26-s3', '')).toThrow(/recipient is empty/);
  });

  it('reads the job column back out of the key @g8', () => {
    // `job_runs` stores both columns and its unique constraint is over the pair, so a row whose
    // `job` disagreed with its `key` would admit a second row for the same send.
    for (const job of JOB_NAMES) expect(jobOf(jobKey(job, 'dec26-s3', 'u_jamie'))).toBe(job);
  });

  it('refuses to name a job for a key it did not build @g8', () => {
    expect(() => jobOf('session-48h:dec26-s3:u_jamie')).toThrow(/does not start with a known job/);
    expect(() => jobOf('')).toThrow(/does not start with a known job/);
  });
});
