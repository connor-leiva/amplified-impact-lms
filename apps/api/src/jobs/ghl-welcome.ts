// The `welcome-sent` tag, after a cohort welcome has gone out. Same claim, lease and backoff as the
// other GHL loops. A test user is left out here too, even if a row were ever marked sent.
//
// The contact and the tag only. Custom fields and the opportunity stay on the order and login syncs.
// A failure retries; it never sends the email again.

import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { cohortEnrollments, users } from '../db/schema';
import { syncStamp, syncWelcomeContact } from '../integrations/ghl';
import type { Fetch, GhlConfig, GhlFailureKind } from '../integrations/ghl';
import { clock } from '../lib/clock';
import { BACKOFF_MS, BATCH, MAX_ATTEMPTS, SYSTEMIC_PAUSE_MS, UNAUTHORIZED_PAUSE_MS, claimSet, dueWhere } from './ghl-sync';
import type { GhlSyncLog, GhlSyncRun } from './ghl-sync';

const SYSTEMIC: ReadonlySet<GhlFailureKind> = new Set(['unauthorized', 'rate-limited', 'server', 'timeout', 'network']);

interface Claimed {
  user_id: string;
  cohort_id: string;
  email: string;
  name: string | null;
  ghl_attempts: number;
}

const errorCode = (r: { kind: GhlFailureKind; status?: number; step: string }): string =>
  `${r.step}:${r.kind}${r.status === undefined ? '' : `:${r.status}`}`;

export async function claimDueWelcomes(db: Database, now: number, batch: number = BATCH): Promise<Claimed[]> {
  const rows = (await db.execute(sql`
    update ${cohortEnrollments} e
       set ${claimSet(now)}
      from ${users} u
     where u.id = e.user_id
       and (e.user_id, e.cohort_id) in (
         select e2.user_id, e2.cohort_id
           from ${cohortEnrollments} e2
           join ${users} u2 on u2.id = e2.user_id
          where e2.welcome_status = 'sent'
            and u2.is_test = false
            and ${dueWhere(null)}
            and (e2.ghl_next_attempt_at is null or e2.ghl_next_attempt_at <= ${now})
          order by e2.welcome_sent_at nulls last, e2.user_id
          limit ${batch}
          for update of e2 skip locked)
    returning e.user_id, e.cohort_id, u.email, u.name, e.ghl_attempts`)) as unknown as Claimed[];
  return [...rows];
}

export async function runGhlWelcomeSync(options: { db: Database; log: GhlSyncLog; config: GhlConfig; fetch?: Fetch }): Promise<GhlSyncRun> {
  const { db, log, config } = options;
  const run: GhlSyncRun = { ran: true, claimed: 0, synced: 0, created: 0, failed: 0, gaveUp: 0 };
  const stamp = syncStamp(config);
  const rows = await claimDueWelcomes(db, clock.now());
  run.claimed = rows.length;
  const fetchOption = options.fetch ? { fetch: options.fetch } : {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const result = await syncWelcomeContact({ email: row.email, name: row.name }, { config, ...fetchOption });
    const now = clock.now();
    const where = and(eq(cohortEnrollments.userId, row.user_id), eq(cohortEnrollments.cohortId, row.cohort_id));

    if (result.ok) {
      await db
        .update(cohortEnrollments)
        .set({ ghlContactId: result.contactId, ghlSyncedAt: now, ghlSyncStamp: stamp, ghlNextAttemptAt: null, ghlError: null })
        .where(where);
      run.synced += 1;
      if (result.created) run.created += 1;
      if (result.tagsDropped.length) log.error({ user: row.user_id, cohort: row.cohort_id, contact: result.contactId, dropped: result.tagsDropped }, 'GHL dropped tags this learner already had; restore them in GHL');
      continue;
    }

    if (SYSTEMIC.has(result.kind)) {
      const pause = result.kind === 'unauthorized' ? UNAUTHORIZED_PAUSE_MS : SYSTEMIC_PAUSE_MS;
      const deferred = rows.slice(i);
      for (const d of deferred) {
        await db
          .update(cohortEnrollments)
          .set({ ghlAttempts: sql`greatest(${cohortEnrollments.ghlAttempts} - 1, 0)`, ghlNextAttemptAt: now + pause, ghlError: errorCode(result) })
          .where(and(eq(cohortEnrollments.userId, d.user_id), eq(cohortEnrollments.cohortId, d.cohort_id)));
      }
      run.paused = { kind: result.kind, ...(result.status === undefined ? {} : { status: result.status }), rowsDeferred: deferred.length };
      log.warn({ kind: result.kind, status: result.status, deferred: deferred.length }, 'GHL unavailable for welcome tags; paused, nothing lost');
      break;
    }

    const attempts = row.ghl_attempts;
    const gaveUp = attempts >= MAX_ATTEMPTS;
    await db
      .update(cohortEnrollments)
      .set({ ghlError: errorCode(result), ghlNextAttemptAt: gaveUp ? null : now + BACKOFF_MS[attempts - 1]! })
      .where(where);
    run.failed += 1;
    if (gaveUp) run.gaveUp += 1;
    log[gaveUp ? 'error' : 'warn']({ user: row.user_id, cohort: row.cohort_id, kind: result.kind, status: result.status, attempts }, 'GHL refused a welcome tag');
  }
  return run;
}
