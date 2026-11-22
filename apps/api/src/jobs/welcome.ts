// The cohort welcome. Runs on the billing loop, once a minute, and is not tied to the set-password
// email or to INVITES_FROM.
//
// THE SWITCH. `cohort_welcome_email` is off until a Console flip. While it is off this function
// returns without writing a row and without an email_log line. Turning it on does not backfill:
// an enrollment that was already due when the switch came on (the person was already enrolled, and
// the cohort was already live) is marked `skipped` once. There is no bulk send.
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
// email. Everyone else is told to use the password from the other email. The button is always
// Open The Academy.

import { and, eq, sql } from 'drizzle-orm';
import { COHORT_WELCOME_FLAG, buildWelcomeCopy, firstNameOf, welcomeDecision, welcomeSchedule } from '@ai/core';
import type { WelcomeSchedule, WelcomeSession, WelcomeWeek } from '@ai/core';
import { expiryFor, hashToken, mintToken } from '../auth/tokens';
import type { Database } from '../db/client';
import { getDb } from '../db/client';
import { authTokens, cohortEnrollments, cohorts, consoleFlags, emailLog, googleIdentities, modules, sessions, userPasswords, users } from '../db/schema';
import { absolute, setPasswordPath } from '../email/templates/links';
import { send } from '../email/transport';
import type { BillingLog } from '../billing/provision';

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

  const [flag] = await db.select({ on: consoleFlags.on, updatedAt: consoleFlags.updatedAt }).from(consoleFlags).where(eq(consoleFlags.key, COHORT_WELCOME_FLAG));
  // Off, or never flipped: do nothing. No row, no email_log line.
  if (!flag?.on) return { ...run, held: true };
  // A row that is on with no time (it should not happen; a flip always stamps one) treats "now" as
  // the enable time, so nothing already due is backfilled.
  const enabledAt = flag.updatedAt ?? now;

  await db.execute(sql`
    update ${cohortEnrollments}
       set welcome_status = 'failed', welcome_error = 'lost', welcome_sent_at = welcome_claimed_at
     where welcome_status = 'claimed'
       and welcome_claimed_at is not null
       and welcome_claimed_at <= ${now - CLAIM_LEASE_MS}
  `);

  await db.execute(sql`
    insert into ${cohortEnrollments} (user_id, cohort_id, account_id, enrolled_at)
    select distinct on (a.owner_user_id, p.cohort_id) a.owner_user_id, p.cohort_id, a.id, p.created_at
      from plans p
      join accounts a on a.id = p.account_id
     where p.kind = 'cohort' and p.cohort_id is not null and p.status <> 'ended'
     order by a.owner_user_id, p.cohort_id, p.created_at
    on conflict (user_id, cohort_id) do nothing
  `);

  const pending = (await db.execute(sql`
    select e.user_id, e.cohort_id, e.enrolled_at, u.email, u.name,
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
  const moduleRows = await db.select({ id: modules.id, status: modules.status, opens: modules.opens, course: modules.course }).from(modules);

  for (const row of pending) {
    const cohort = cohortRows.find((c) => c.id === row.cohort_id);
    if (!cohort) {
      log.warn({ cohort: row.cohort_id }, 'cohort welcome has no cohort; left pending');
      run.waiting += 1;
      continue;
    }
    const weeks = weeksOf(moduleRows);
    const sess = sessionRows.filter((s) => s.cohortId === cohort.id).map(sessionOf);
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
    const decision = welcomeDecision({ enabledAt, now, enrolledAt: num(row.enrolled_at), sendsAt: built.schedule.sendsAt });
    if (decision === 'wait' || decision === 'hold') {
      run.waiting += 1;
      continue;
    }
    if (decision === 'skip') {
      await markSkipped(db, row, built.schedule, now);
      run.skipped += 1;
      continue;
    }
    const claimed = (await db.execute(sql`
      update ${cohortEnrollments}
         set welcome_status = 'claimed', welcome_claimed_at = ${now}
       where user_id = ${row.user_id} and cohort_id = ${row.cohort_id} and welcome_status is null
      returning user_id
    `)) as unknown as { user_id: string }[];
    if (claimed.length === 0) continue;

    let setPasswordUrl: string | null = null;
    if (!row.has_password && !row.has_google) {
      const token = mintToken();
      await db.insert(authTokens).values({ tokenHash: hashToken(token), email: row.email, purpose: 'set_password', expiresAt: expiryFor('set_password', now) });
      setPasswordUrl = absolute(setPasswordPath(token));
    }
    const copy = buildWelcomeCopy(built.schedule, firstNameOf(row.name), setPasswordUrl);
    const result = await send({ template: 'cohort-welcome', to: row.email, data: { cohortName: copy.cohortName, copy } });
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

async function markSkipped(db: Database, row: PendingRow, schedule: WelcomeSchedule, now: number): Promise<void> {
  const subject = `Your Access To The ${schedule.cohortName} Is Live`;
  await db
    .update(cohortEnrollments)
    .set({ welcomeStatus: 'skipped', welcomeError: 'already_live' })
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

interface ModuleRow {
  status: string;
  opens: number | null;
  course: unknown;
}

function weeksOf(rows: readonly ModuleRow[]): WelcomeWeek[] {
  return rows.map((m) => {
    const course = m.course && typeof m.course === 'object' ? (m.course as { week?: number; liveBuild?: { sessionId?: string } | null; officeHours?: { sessionId?: string } | null }) : null;
    return {
      week: typeof course?.week === 'number' ? course.week : null,
      opens: m.opens,
      status: m.status,
      liveSessionId: course?.liveBuild?.sessionId ?? null,
      officeSessionId: course?.officeHours?.sessionId ?? null,
    };
  });
}

function sessionOf(s: { id: string; n: number; start: number; mins: number; kind: string | null }): WelcomeSession {
  return { id: s.id, n: s.n, start: s.start, mins: s.mins, kind: s.kind };
}
