// The cohort welcome. Runs on the billing loop, once a minute, and is not tied to the set-password
// email or to INVITES_FROM.
//
// THE SWITCH. `cohort_welcome_email` is off until a Console flip. While it is off this function
// returns without writing a row and without an email_log line. The flip records the switch-on time
// (`console_flags.turned_on_at`). THE RULE: an enrollment that existed at that time never gets the
// welcome, whatever the cohort's send time and whether the cohort is live yet; it is marked
// `skipped` (`enrolled_before_switch`) once. Only an enrollment made after the switch-on time
// qualifies. An enrollment's time is the owner's earliest cohort plan for that cohort, ended ones
// included, so buying again after the switch does not make an earlier enrollment new. There is no
// bulk send.
//
// ONCE. A row is claimed (`welcome_status = 'claimed'`) before the send. A second tick, a second
// replica, or a retry finds the claim and does not send again. A claim still open after the lease
// is marked `failed` with `lost` and is not retried: a crash between the claim and the send must
// not produce a second email. A transport failure is `failed` as well, and is logged by the email
// observer. `welcome_sent_at` is set on both, so neither is picked again.
//
// WHO. The team owner of a cohort plan that has not ended. One row per (owner, cohort). A seeded
// test user (`is_test`) is left pending and is never selected, the same exclusion the order sync
// uses, so a test learner is never mailed as a customer and never tagged.
//
// THE LINK. An owner with no password and no Google account gets a set-password link in the same
// email. Everyone else is told how to get a sign-in link. The button is always Start Week 0. The words
// are the template's (`cohort-welcome-html.ts`, the Week 0 Is Open email's design).
//
// NEVER BOTH. The Week 0 Is Open email (`week0-open.ts`) also says Week 0 starts now. A row that email
// already reached (`week0_status = 'sent'`, or a lost claim) is skipped here (`welcome_error =
// 'week0_sent'`), and a row it has claimed is not claimed here, so no owner gets both, in either order.
//
// WEEK 0 FROM DATA. The copy's Week 0 due date, name, step count and baseline count come from the
// Week 0 module (`welcomeWeek0`). While Week 0 has no Due, the welcome waits on the builder.

import { and, eq, sql } from 'drizzle-orm';
import { COHORT_WELCOME_FLAG, enrolledBeforeSwitch, firstNameOf, otherEmailReached, welcomeDecision, welcomeSchedule, welcomeWeek0 } from '@ai/core';
import type { WelcomeWeek } from '@ai/core';
import { expiryFor, hashToken, mintToken } from '../auth/tokens';
import type { Database } from '../db/client';
import { getDb } from '../db/client';
import { authTokens, cohortEnrollments, cohorts, consoleFlags, emailLog, googleIdentities, sessions, userPasswords, users } from '../db/schema';
import { absolute, setPasswordPath } from '../email/templates/links';
import { SUBJECTS } from '../email/subjects';
import { send } from '../email/transport';
import type { BillingLog } from '../billing/provision';
import { readWeeks, recordSwitchOn, sessionOf, upsertCohortEnrollments, welcomeEmailData } from './enrollments';

/** A claim still open after this is treated as lost, and not sent again. */
const CLAIM_LEASE_MS = 15 * 60_000;

/** How many enrollments one tick sends. The next tick takes the rest. */
const BATCH = 50;

interface PendingRow {
  user_id: string;
  cohort_id: string;
  enrolled_at: string | number;
  email: string;
  name: string;
  has_password: boolean;
  has_google: boolean;
  week0_status: string | null;
  week0_error: string | null;
}

const num = (v: string | number): number => Number(v);

export interface WelcomeRun {
  held: boolean;
  sent: number;
  skipped: number;
  failed: number;
  waiting: number;
}

/**
 * Send welcomes that are due. Safe to run every minute: a row already claimed, sent, failed or
 * skipped is left alone.
 */
export async function sendDueWelcomes(options: { db?: Database; log: BillingLog; now: number }): Promise<WelcomeRun> {
  const db = options.db ?? getDb();
  const { log, now } = options;
  const run: WelcomeRun = { held: false, sent: 0, skipped: 0, failed: 0, waiting: 0 };

  const [flag] = await db
    .select({ on: consoleFlags.on, turnedOnAt: consoleFlags.turnedOnAt, updatedAt: consoleFlags.updatedAt })
    .from(consoleFlags)
    .where(eq(consoleFlags.key, COHORT_WELCOME_FLAG));
  // Off, or never flipped: do nothing. No row, no email_log line.
  if (!flag?.on) return { ...run, held: true };
  // The switch-on time. A flip always stamps it. A row that is on without one (written by hand) takes
  // its last flip's time, or else now, and records it, so the time stays fixed from then on and no
  // enrollment already there is ever mailed.
  const enabledAt = flag.turnedOnAt ?? (await recordSwitchOn(db, COHORT_WELCOME_FLAG, flag.updatedAt ?? now));

  await db.execute(sql`
    update ${cohortEnrollments}
       set welcome_status = 'failed', welcome_error = 'lost', welcome_sent_at = welcome_claimed_at
     where welcome_status = 'claimed'
       and welcome_claimed_at is not null
       and welcome_claimed_at <= ${now - CLAIM_LEASE_MS}
  `);

  // One row per (owner, cohort) with a plan that has not ended, shared with the Week 0 job.
  await upsertCohortEnrollments(db);

  const pending = (await db.execute(sql`
    select e.user_id, e.cohort_id, e.enrolled_at, u.email, u.name, e.week0_status, e.week0_error,
           exists (select 1 from ${userPasswords} pw where pw.user_id = u.id) as has_password,
           exists (select 1 from ${googleIdentities} g where g.user_id = u.id) as has_google
      from ${cohortEnrollments} e
      join ${users} u on u.id = e.user_id
     where e.welcome_status is null
       and u.is_test = false
     order by e.enrolled_at, e.user_id
     limit ${BATCH}
  `)) as unknown as PendingRow[];

  const cohortRows = await db.select().from(cohorts);
  const sessionRows = await db.select().from(sessions);
  // R-5 Phase 4 (D-261): each cohort's own weeks, through its run (`readWeeks`), read once a tick per cohort.
  const weeksByCohort = new Map<string, Promise<WelcomeWeek[]>>();
  const cohortWeeks = (cohortId: string): Promise<WelcomeWeek[]> => {
    let w = weeksByCohort.get(cohortId);
    if (!w) weeksByCohort.set(cohortId, (w = readWeeks(db, cohortId)));
    return w;
  };

  for (const row of pending) {
    const cohort = cohortRows.find((c) => c.id === row.cohort_id);
    // THE RULE, first: an enrollment that existed when the switch came on is never mailed. Its
    // cohort's send time, whether the cohort is live, and whether the builder is ready don't matter.
    if (enrolledBeforeSwitch(num(row.enrolled_at), enabledAt)) {
      await markSkipped(db, row, cohort?.name ?? row.cohort_id, now, 'enrolled_before_switch');
      run.skipped += 1;
      continue;
    }
    // Never both: the Week 0 Is Open email already reached this owner.
    if (otherEmailReached(row.week0_status, row.week0_error)) {
      await markSkipped(db, row, cohort?.name ?? row.cohort_id, now, 'week0_sent');
      run.skipped += 1;
      continue;
    }
    if (row.week0_status === 'claimed') {
      run.waiting += 1;
      continue;
    }
    if (!cohort) {
      log.warn({ cohort: row.cohort_id }, 'cohort welcome has no cohort; left pending');
      run.waiting += 1;
      continue;
    }
    const sess = sessionRows.filter((s) => s.cohortId === cohort.id).map(sessionOf);
    const weeks = await cohortWeeks(cohort.id);
    const built = welcomeSchedule(
      { name: cohort.name, start: cohort.start, previewOpensAt: cohort.previewOpensAt, welcomeSendsAt: cohort.welcomeSendsAt, defaultOpenTime: cohort.defaultOpenTime },
      weeks,
      sess,
    );
    if (!built.ok) {
      log.warn({ cohort: cohort.id, reason: built.reason }, 'cohort welcome is waiting on the builder');
      run.waiting += 1;
      continue;
    }
    const week0 = welcomeWeek0(weeks);
    if (!week0.ok) {
      log.warn({ cohort: cohort.id, reason: week0.reason }, 'cohort welcome is waiting on the builder');
      run.waiting += 1;
      continue;
    }
    const decision = welcomeDecision({ enabledAt, now, enrolledAt: num(row.enrolled_at), sendsAt: built.schedule.sendsAt });
    if (decision === 'wait' || decision === 'hold') {
      run.waiting += 1;
      continue;
    }
    if (decision === 'skip') {
      await markSkipped(db, row, built.schedule.cohortName, now, 'enrolled_before_switch');
      run.skipped += 1;
      continue;
    }
    // The claim also refuses a row the Week 0 email holds or may have sent, so the two jobs on two replicas can't both
    // mail one owner.
    const claimed = (await db.execute(sql`
      update ${cohortEnrollments}
         set welcome_status = 'claimed', welcome_claimed_at = ${now}
       where user_id = ${row.user_id} and cohort_id = ${row.cohort_id} and welcome_status is null
         and coalesce(week0_status, '') not in ('claimed', 'sent')
         and not (coalesce(week0_status, '') = 'failed' and coalesce(week0_error, '') = 'lost')
      returning user_id
    `)) as unknown as { user_id: string }[];
    if (claimed.length === 0) continue;

    let setPasswordUrl: string | null = null;
    if (!row.has_password && !row.has_google) {
      const token = mintToken();
      await db.insert(authTokens).values({ tokenHash: hashToken(token), email: row.email, purpose: 'set_password', expiresAt: expiryFor('set_password', now) });
      setPasswordUrl = absolute(setPasswordPath(token));
    }
    const result = await send({
      template: 'cohort-welcome',
      to: row.email,
      data: welcomeEmailData(built.schedule.cohortName, built.schedule, week0.week0, firstNameOf(row.name), setPasswordUrl),
    });
    if (result.ok) {
      await db
        .update(cohortEnrollments)
        .set({ welcomeStatus: 'sent', welcomeSentAt: now, welcomeError: null })
        .where(and(eq(cohortEnrollments.userId, row.user_id), eq(cohortEnrollments.cohortId, row.cohort_id)));
      run.sent += 1;
    } else {
      await db
        .update(cohortEnrollments)
        .set({ welcomeStatus: 'failed', welcomeSentAt: now, welcomeError: 'send' })
        .where(and(eq(cohortEnrollments.userId, row.user_id), eq(cohortEnrollments.cohortId, row.cohort_id)));
      log.error({ user: row.user_id, cohort: row.cohort_id }, 'cohort welcome was not delivered');
      run.failed += 1;
    }
  }

  if (run.sent || run.skipped || run.failed) log.info({ sent: run.sent, skipped: run.skipped, failed: run.failed }, 'cohort welcome tick');
  return run;
}

async function markSkipped(db: Database, row: PendingRow, cohortName: string, now: number, reason: 'enrolled_before_switch' | 'week0_sent'): Promise<void> {
  const subject = SUBJECTS['cohort-welcome']({ cohortName });
  await db
    .update(cohortEnrollments)
    .set({ welcomeStatus: 'skipped', welcomeError: reason })
    .where(and(eq(cohortEnrollments.userId, row.user_id), eq(cohortEnrollments.cohortId, row.cohort_id), sql`${cohortEnrollments.welcomeStatus} is null`));
  await db.insert(emailLog).values({
    at: now,
    to: row.email,
    userId: row.user_id,
    template: 'cohort-welcome',
    subject: subject.slice(0, 200),
    provider: 'log',
    providerId: null,
    status: 'skipped',
    errorKind: null,
  });
}
