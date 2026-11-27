// Retention for the email log and usage counts (D-166, D6): email rows older than 180 days and usage
// days older than 400 are deleted, once per scheduler tick, in its own try/catch (`scheduler.ts`), so
// it can never cost a reminder its tick. Both deletes are bounded by an index (`email_log_at_idx`, the
// usage table's primary key, which starts with the day). The audit log is never pruned (D6).
// D-263: Resend's webhook events go with the email log, by when they arrived (`resend_events_received_idx`):
// an event arrives after its send, so a row past 180 days has no event that isn't too.

import { lt } from 'drizzle-orm';
import { DAY_MS, EMAIL_LOG_RETENTION_DAYS, USAGE_RETENTION_DAYS, addDays, programDay } from '@ai/core';
import type { Database } from '../db/client';
import { emailLog, resendEvents, usageDaily } from '../db/schema';

/** Deletes what is past retention at `now`; how many rows of each went. */
export async function pruneEmailAndUsage(db: Pick<Database, 'transaction'>, now: number): Promise<{ emails: number; usage: number; events: number }> {
  return db.transaction(async (tx) => {
    const cutoff = now - EMAIL_LOG_RETENTION_DAYS * DAY_MS;
    const emails = await tx.delete(emailLog).where(lt(emailLog.at, cutoff)).returning({ id: emailLog.id });
    const events = await tx.delete(resendEvents).where(lt(resendEvents.receivedAt, cutoff)).returning({ id: resendEvents.id });
    const usage = await tx.delete(usageDaily).where(lt(usageDaily.day, addDays(programDay(now), -USAGE_RETENTION_DAYS))).returning({ day: usageDaily.day });
    return { emails: emails.length, usage: usage.length, events: events.length };
  });
}
