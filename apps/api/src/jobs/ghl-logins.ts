// A learner's first LMS sign-in, copied into GoHighLevel (D-134): the contact gets `lms-logged-in`, and
// the LMS Login field says `signed-in` once its id is set. Same claim, lease, backoff and failure rules
// as the waitlist's and the buyers' loops (ghl-sync.ts, ghl-orders.ts), on the same tick.
//
// NOTHING ON THE SIGN-IN PATH. The queue is filled by this loop, not by the sign-in route: each tick
// adds a row for every learner who has a session, or whose status is `active` (an accepted invite),
// and has none yet. Not `joined`: core sets that when someone is INVITED. A sign-in by
// email link, by invite, or by password (once that ships) therefore reaches GHL within a tick, and a
// GHL outage, a bad token or a slow database here can never fail or delay one. It is also the
// backfill: every learner who signed in before this shipped is queued on the first tick.
//
// LEARNERS ONLY. Staff (the console's Owner and team) are not contacts to market to.
//
// PRIVACY: user ids, counts and status codes in the log; never a name or an email address.

import { eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { authSessions, ghlLogins, users } from '../db/schema';
import { clock } from '../lib/clock';
import { syncLoginContact, syncStamp } from '../integrations/ghl';
import type { Fetch, GhlConfig, GhlFailureKind } from '../integrations/ghl';
import { BACKOFF_MS, BATCH, MAX_ATTEMPTS, SYSTEMIC_PAUSE_MS, UNAUTHORIZED_PAUSE_MS, claimSet, dueWhere, noteExtras } from './ghl-sync';
import type { GhlSyncLog, GhlSyncRun } from './ghl-sync';
import { afterContact, extrasError, syncExtras } from './ghl-extras';
import type { ExtrasTick } from './ghl-extras';

const SYSTEMIC: ReadonlySet<GhlFailureKind> = new Set(['unauthorized', 'rate-limited', 'server', 'timeout', 'network']);

/**
 * Queue every learner who has signed in and is not queued yet: a session of their own (D-162: never a
 * masquerade's, which staff hold, so it is not the learner signing in), or `status = 'active'`
 * (which only accepting an invite or signing in sets; provisioning and invites create `invited`). One
 * statement, idempotent: a learner already in `ghl_logins` is left as they are. Rows for a learner
 * since removed are dropped, since there is no one left to copy. `first_login_at` is when the loop
 * first saw the sign-in. Returns how many it queued.
 */
export async function enqueueLogins(db: Database, now: number): Promise<number> {
  await db.execute(sql`delete from ${ghlLogins} l where not exists (select 1 from ${users} u where u.id = l.user_id)`);
  const added = (await db.execute(sql`
    insert into ${ghlLogins} (user_id, first_login_at)
    select u.id, ${now}
      from ${users} u
     where u.kind = 'learner'
       and (u.status = 'active' or exists (select 1 from ${authSessions} s where s.user_id = u.id and s.impersonating is null))
    on conflict (user_id) do nothing
    returning user_id`)) as unknown as { user_id: string }[];
  return added.length;
}

interface ClaimedLogin {
  user_id: string;
  email: string;
  name: string | null;
  ghl_attempts: number;
  first_login_at: string | number;
}

export async function claimDueLogins(db: Database, now: number, batch: number = BATCH, stamp: string | null = null): Promise<ClaimedLogin[]> {
  const rows = (await db.execute(sql`
    update ${ghlLogins} l
       set ${claimSet(now)}
      from ${users} u
     where u.id = l.user_id
       and l.user_id in (
         select user_id from ${ghlLogins}
          where ${dueWhere(stamp)}
            and (ghl_next_attempt_at is null or ghl_next_attempt_at <= ${now})
          order by first_login_at, user_id
          limit ${batch}
          for update skip locked)
    returning l.user_id, u.email, u.name, l.ghl_attempts, l.first_login_at`)) as unknown as ClaimedLogin[];
  return [...rows].sort((a, b) => Number(a.first_login_at) - Number(b.first_login_at) || (a.user_id < b.user_id ? -1 : 1));
}

const errorCode = (r: { kind: GhlFailureKind; status?: number; step: string }): string =>
  `${r.step}:${r.kind}${r.status === undefined ? '' : `:${r.status}`}`;

/** One pass over the queued sign-ins. Same shape of result as the other two loops. */
export async function runGhlLoginSync(options: { db: Database; log: GhlSyncLog; config: GhlConfig; fetch?: Fetch }): Promise<GhlSyncRun> {
  const { db, log, config } = options;
  const run: GhlSyncRun = { ran: true, claimed: 0, synced: 0, created: 0, failed: 0, gaveUp: 0 };
  const stamp = syncStamp(config);
  const rows = await claimDueLogins(db, clock.now(), BATCH, stamp);
  run.claimed = rows.length;
  const tick: ExtrasTick = { scopeBlocked: null };
  const fetchOption = options.fetch ? { fetch: options.fetch } : {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const result = await syncLoginContact({ email: row.email, name: row.name }, { config, ...fetchOption });
    const now = clock.now();

    if (result.ok) {
      const extras = await syncExtras(db, result.contactId, row.email, 'login', { config, ...fetchOption }, tick);
      const after = afterContact(extras, {
        now: clock.now(),
        contactId: result.contactId,
        stamp,
        attempts: row.ghl_attempts,
        backoffMs: BACKOFF_MS,
        maxAttempts: MAX_ATTEMPTS,
        pauseMs: { unauthorized: UNAUTHORIZED_PAUSE_MS, systemic: SYSTEMIC_PAUSE_MS },
      });
      await db
        .update(ghlLogins)
        .set({ ...after.set, ...(after.handBack ? { ghlAttempts: sql`greatest(${ghlLogins.ghlAttempts} - 1, 0)` } : {}) })
        .where(eq(ghlLogins.userId, row.user_id));
      run.synced += 1;
      if (result.created) run.created += 1;
      if (result.tagsDropped.length) log.error({ user: row.user_id, contact: result.contactId, dropped: result.tagsDropped }, 'GHL dropped tags this learner already had; restore them in GHL');
      if (extras.kind !== 'done') noteExtras(run, log, extras, { user: row.user_id, attempts: row.ghl_attempts }, after.gaveUp);
      if (extras.kind === 'systemic') {
        const deferred = rows.slice(i + 1).map((r) => r.user_id);
        await deferLogins(db, deferred, now + SYSTEMIC_PAUSE_MS, extrasError(extras.failure));
        run.paused = { kind: extras.failure.kind, ...(extras.failure.status === undefined ? {} : { status: extras.failure.status }), rowsDeferred: deferred.length };
        break;
      }
      continue;
    }

    if (SYSTEMIC.has(result.kind)) {
      const pause = result.kind === 'unauthorized' ? UNAUTHORIZED_PAUSE_MS : SYSTEMIC_PAUSE_MS;
      const deferred = rows.slice(i).map((r) => r.user_id);
      await deferLogins(db, deferred, now + pause, errorCode(result));
      run.paused = { kind: result.kind, ...(result.status === undefined ? {} : { status: result.status }), rowsDeferred: deferred.length };
      log.warn({ kind: result.kind, status: result.status, deferred: deferred.length }, 'GHL unavailable for sign-ins; paused, nothing lost');
      break;
    }

    const attempts = row.ghl_attempts;
    const gaveUp = attempts >= MAX_ATTEMPTS;
    await db
      .update(ghlLogins)
      .set({ ghlError: errorCode(result), ghlNextAttemptAt: gaveUp ? null : now + BACKOFF_MS[attempts - 1]! })
      .where(eq(ghlLogins.userId, row.user_id));
    run.failed += 1;
    if (gaveUp) run.gaveUp += 1;
    log[gaveUp ? 'error' : 'warn']({ user: row.user_id, kind: result.kind, status: result.status, attempts }, 'GHL refused a learner contact');
  }
  return run;
}

async function deferLogins(db: Database, ids: readonly string[], until: number, error: string): Promise<void> {
  for (const id of ids) {
    await db
      .update(ghlLogins)
      .set({ ghlAttempts: sql`greatest(${ghlLogins.ghlAttempts} - 1, 0)`, ghlNextAttemptAt: until, ghlError: error })
      .where(eq(ghlLogins.userId, id));
  }
}
