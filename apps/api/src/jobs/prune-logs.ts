// Retention for the email log and usage counts (D-166, D6): email rows older than 180 days and usage
// days older than 400 are deleted, once per scheduler tick, in its own try/catch (`scheduler.ts`), so
// it can never cost a reminder its tick. Both deletes are bounded by an index (`email_log_at_idx`, the
// usage table's primary key, which starts with the day). The audit log is never pruned (D6).

import { lt } from 'drizzle-orm';
import { DAY_MS, EMAIL_LOG_RETENTION_DAYS, USAGE_RETENTION_DAYS, addDays, programDay } from '@ai/core';
import type { Database } from '../db/client';
import { emailLog, usageDaily } from '../db/schema';

/** Deletes what is past retention at `now`; how many rows of each went. */
export async function pruneEmailAndUsage(db: Pick<Database, 'transaction'>, now: number): Promise<{ emails: number; usage: number }> {
  return db.transaction(async (tx) => {
    const emails = await tx.delete(emailLog).where(lt(emailLog.at, now - EMAIL_LOG_RETENTION_DAYS * DAY_MS)).returning({ id: emailLog.id });
    const usage = await tx.delete(usageDaily).where(lt(usageDaily.day, addDays(programDay(now), -USAGE_RETENTION_DAYS))).returning({ day: usageDaily.day });
    return { emails: emails.length, usage: usage.length };
  });
}
