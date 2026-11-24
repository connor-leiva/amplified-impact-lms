// The Week 0 Is Open email. Runs on the billing loop, once a minute, beside the cohort welcome (`welcome.ts`).
//
// THE SWITCH. `week0_open_email` is off until a Console flip. While it is off this function returns without writing a
// row and without an email_log line. The flip records the switch-on time (`console_flags.turned_on_at`). THE RULE: only
// an enrollment that existed at that time gets this email (`enrolledAtSwitch`), once; one made after it is marked
// `skipped` (`enrolled_after_switch`), because it belongs to the cohort welcome.
//
// WHEN. Due once the preview opens (`cohorts.preview_opens_at`, Course settings, what `courseEntry` reads): the switch
// is on, the cohort has a preview date and it has passed, its first live build is known (`welcomeSchedule`) and Week 0
// has a Due (the Week 0 module's `due_at`). A preview that opened before the switch came on sends on the first tick
// after. While the schedule or Week 0's Due is missing the job waits ("waiting on the builder"); it never names a day of
// its own.
//
// WHO. The Accelerator course roster's team owners (`week0RosterOf`: `courseRoster`'s lookup and plan rule, without the
// course's own opening date), on the same `cohort_enrollments` rows the welcome uses (`upsertCohortEnrollments`). An
// invited owner who has never signed in is on it. Utah Life, Insiders, the Agent Plan, the Team Plan and a $37 skill
// buyer are not, and a test user (`is_test`) is never selected. Not Admin > Announcements, which mails every account.
//
// ONCE. The welcome's claim pattern, on the `week0_*` columns: a row is claimed (`week0_status = 'claimed'`) before the
// send, so a second tick or a second replica finds the claim and does not send again. A claim still open after the
// lease is `failed` / `lost` and is not retried. A transport failure is `failed` as well. `week0_sent_at` is set on
// both, so neither is picked again. Fifty a tick.
//
// NEVER BOTH. A row the welcome already reached (`welcome_status = 'sent'`, or a lost claim) is skipped
// (`week0_error = 'welcome_sent'`), and the claim refuses a row the welcome holds.

import { and, eq, inArray, sql } from 'drizzle-orm';
import { WEEK0_OPEN_FLAG, WEEK0_OPEN_TEMPLATE, enrolledAtSwitch, firstNameOf, otherEmailReached, week0DueAt, week0OpenDecision, welcomeSchedule } from '@ai/core';
import type { Database } from '../db/client';
import { getDb } from '../db/client';
import { cohortEnrollments, cohorts, consoleFlags, emailLog, sessions, users } from '../db/schema';
import { SUBJECTS } from '../email/subjects';
import { send } from '../email/transport';
import type { BillingLog } from '../billing/provision';
import { week0RosterOf } from '../lib/course-access';
import { readWeeks, recordSwitchOn, sessionOf, upsertCohortEnrollments } from './enrollments';

/** A claim still open after this is treated as lost, and not sent again. */
const CLAIM_LEASE_MS = 15 * 60_000;

/** How many enrollments one tick takes. The next tick takes the rest. */
const BATCH = 50;

interface PendingRow {
  user_id: string;
  cohort_id: string;
  enrolled_at: string | number;
  email: string;
  name: string;
  welcome_status: string | null;
  welcome_error: string | null;
}

const num = (v: string | number): number => Number(v);

export interface Week0Run {
  held: boolean;
  sent: number;
  skipped: number;
  failed: number;
  waiting: number;
}

type SkipReason = 'enrolled_after_switch' | 'welcome_sent';

/** Send the Week 0 Is Open emails that are due. Safe to run every minute: a row already claimed or final is left alone. */
export async function sendWeek0Open(options: { db?: Database; log: BillingLog; now: number }): Promise<Week0Run> {
  const db = options.db ?? getDb();
  const { log, now } = options;
  const run: Week0Run = { held: false, sent: 0, skipped: 0, failed: 0, waiting: 0 };

  const [flag] = await db
    .select({ on: consoleFlags.on, turnedOnAt: consoleFlags.turnedOnAt, updatedAt: consoleFlags.updatedAt })
    .from(consoleFlags)
    .where(eq(consoleFlags.key, WEEK0_OPEN_FLAG));
  // Off, or never flipped: do nothing. No row, no email_log line.
  if (!flag?.on) return { ...run, held: true };
  const enabledAt = flag.turnedOnAt ?? (await recordSwitchOn(db, WEEK0_OPEN_FLAG, flag.updatedAt ?? now));

  await db.execute(sql`
    update ${cohortEnrollments}
       set week0_status = 'failed', week0_error = 'lost', week0_sent_at = week0_claimed_at
     where week0_status = 'claimed'
       and week0_claimed_at is not null
       and week0_claimed_at <= ${now - CLAIM_LEASE_MS}
  `);

  await upsertCohortEnrollments(db);

  // The course roster's owners, in cohorts whose preview has opened. A row whose owner is not on the roster (no live
  // Accelerator plan) stays pending and is not read, so it never holds a place in the batch.
  const roster = await week0RosterOf(db);
  const open = (await db.select({ userId: cohortEnrollments.userId }).from(cohortEnrollments).where(sql`${cohortEnrollments.week0Status} is null`))
    .map((r) => r.userId)
    .filter((id) => roster.has(id));
  if (open.length === 0) return run;

  const pending = (await db.execute(sql`
    select e.user_id, e.cohort_id, e.enrolled_at, u.email, u.name, e.welcome_status, e.welcome_error
      from ${cohortEnrollments} e
      join ${users} u on u.id = e.user_id
      join ${cohorts} c on c.id = e.cohort_id
     where e.week0_status is null
       and u.is_test = false
       and c.preview_opens_at is not null
       and c.preview_opens_at <= ${now}
       and e.user_id in (${sql.join(
         [...new Set(open)].map((id) => sql`${id}`),
         sql`, `,
       )})
     order by e.enrolled_at, e.user_id
     limit ${BATCH}
  `)) as unknown as PendingRow[];
  if (pending.length === 0) return run;

  const cohortIds = [...new Set(pending.map((r) => r.cohort_id))];
  const cohortRows = await db.select().from(cohorts).where(inArray(cohorts.id, cohortIds));
  const sessionRows = await db.select().from(sessions).where(inArray(sessions.cohortId, cohortIds));
  const weeks = await readWeeks(db);
  const dueAt = week0DueAt(weeks);

  for (const row of pending) {
    // THE RULE, first: an enrollment made after the switch-on time is the welcome's, never this email's.
    if (!enrolledAtSwitch(num(row.enrolled_at), enabledAt)) {
      await markSkipped(db, row, now, 'enrolled_after_switch');
      run.skipped += 1;
      continue;
    }
    // Never both: the cohort welcome already reached this owner.
    if (otherEmailReached(row.welcome_status, row.welcome_error)) {
      await markSkipped(db, row, now, 'welcome_sent');
      run.skipped += 1;
      continue;
    }
    if (row.welcome_status === 'claimed') {
      run.waiting += 1;
      continue;
    }
    const cohort = cohortRows.find((c) => c.id === row.cohort_id);
    if (!cohort) {
      log.warn({ cohort: row.cohort_id }, 'week 0 email has no cohort; left pending');
      run.waiting += 1;
      continue;
    }
    const decision = week0OpenDecision({ enabledAt, now, enrolledAt: num(row.enrolled_at), previewOpensAt: cohort.previewOpensAt ?? null });
    if (decision !== 'send') {
      run.waiting += 1;
      continue;
    }
    const built = welcomeSchedule(
      { name: cohort.name, start: cohort.start, previewOpensAt: cohort.previewOpensAt, welcomeSendsAt: cohort.welcomeSendsAt, defaultOpenTime: cohort.defaultOpenTime },
      weeks,
      sessionRows.filter((s) => s.cohortId === cohort.id).map(sessionOf),
    );
    if (!built.ok || dueAt === null) {
      log.warn({ cohort: cohort.id, reason: built.ok ? 'no-week0-due' : built.reason }, 'week 0 email is waiting on the builder');
      run.waiting += 1;
      continue;
    }
    // The claim also refuses a row the welcome holds or may have sent, so the two jobs on two replicas can't both mail
    // one owner.
    const claimed = (await db.execute(sql`
      update ${cohortEnrollments}
         set week0_status = 'claimed', week0_claimed_at = ${now}
       where user_id = ${row.user_id} and cohort_id = ${row.cohort_id} and week0_status is null
         and coalesce(welcome_status, '') not in ('claimed', 'sent')
         and not (coalesce(welcome_status, '') = 'failed' and coalesce(welcome_error, '') = 'lost')
      returning user_id
    `)) as unknown as { user_id: string }[];
    if (claimed.length === 0) continue;

    const result = await send({
      template: 'week0-open',
      to: row.email,
      data: { firstName: firstNameOf(row.name), week0DueAt: dueAt, liveBuildAt: built.schedule.session1At, liveBuildMins: built.schedule.session1Mins },
    });
    const where = and(eq(cohortEnrollments.userId, row.user_id), eq(cohortEnrollments.cohortId, row.cohort_id));
    if (result.ok) {
      await db.update(cohortEnrollments).set({ week0Status: 'sent', week0SentAt: now, week0Error: null }).where(where);
      run.sent += 1;
    } else {
      await db.update(cohortEnrollments).set({ week0Status: 'failed', week0SentAt: now, week0Error: 'send' }).where(where);
      log.error({ user: row.user_id, cohort: row.cohort_id }, 'week 0 email was not delivered');
      run.failed += 1;
    }
  }

  if (run.sent || run.skipped || run.failed) log.info({ sent: run.sent, skipped: run.skipped, failed: run.failed }, 'week 0 email tick');
  return run;
}

/** Mark a row skipped, once, and write its `email_log` line. A send's line is the email observer's. */
async function markSkipped(db: Database, row: PendingRow, now: number, reason: SkipReason): Promise<void> {
  const marked = await db
    .update(cohortEnrollments)
    .set({ week0Status: 'skipped', week0Error: reason })
    .where(and(eq(cohortEnrollments.userId, row.user_id), eq(cohortEnrollments.cohortId, row.cohort_id), sql`${cohortEnrollments.week0Status} is null`))
    .returning({ userId: cohortEnrollments.userId });
  if (marked.length === 0) return;
  await db.insert(emailLog).values({
    at: now,
    to: row.email,
    userId: row.user_id,
    template: WEEK0_OPEN_TEMPLATE,
    subject: SUBJECTS['week0-open']({}).slice(0, 200),
    provider: 'log',
    providerId: null,
    status: 'skipped',
    errorKind: null,
  });
}
