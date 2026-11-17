// D-166's instrumentation tests share these: the `usage_daily` rows once every background write has
// landed, a clean table, and a run with the table gone, so a route can be shown to answer exactly as
// it did before when its usage count cannot be written at all.
import { sql } from 'drizzle-orm';
import { settleObserved } from '../src/lib/observe';
import { testDatabase } from './helpers';

export interface UsageRow {
  day: string;
  user_id: string;
  team_id: string | null;
  kind: string;
  count: number;
}

export async function usageRows(): Promise<UsageRow[]> {
  await settleObserved();
  const db = await testDatabase();
  return (await db.execute(sql`select day, user_id, team_id, kind, count from usage_daily order by user_id, kind, day`)) as unknown as UsageRow[];
}

export async function clearUsage(): Promise<void> {
  await settleObserved();
  await (await testDatabase()).execute(sql`delete from usage_daily`);
}

/** Runs `fn` with `usage_daily` renamed away, so every count it tries fails; puts the table back after. */
export async function withoutUsageTable<T>(fn: () => Promise<T>): Promise<T> {
  const db = await testDatabase();
  await settleObserved();
  await db.execute(sql`alter table usage_daily rename to usage_daily_gone`);
  try {
    const out = await fn();
    await settleObserved();
    return out;
  } finally {
    await db.execute(sql`alter table usage_daily_gone rename to usage_daily`);
  }
}
