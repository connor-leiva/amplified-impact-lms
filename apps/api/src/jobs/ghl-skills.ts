// Copy a $37 skill purchase into GoHighLevel: the contact, then the tags `bought-skill-37` and
// `skill-<id>`. The same claim, lease and backoff as the buyers' loop. No custom fields, no
// opportunity, and no workflow. Spring's location is never called.

import { eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { skillPurchases, users } from '../db/schema';
import { clock } from '../lib/clock';
import { syncSkillContact, syncStamp } from '../integrations/ghl';
import type { Fetch, GhlConfig, GhlFailureKind } from '../integrations/ghl';
import { SPRING_GHL_LOCATION } from '../integrations/ghl-location-guard';
import { BACKOFF_MS, BATCH, MAX_ATTEMPTS, SYSTEMIC_PAUSE_MS, UNAUTHORIZED_PAUSE_MS, claimSet, dueWhere } from './ghl-sync';
import type { GhlSyncLog, GhlSyncRun } from './ghl-sync';

const SYSTEMIC: ReadonlySet<GhlFailureKind> = new Set(['unauthorized', 'rate-limited', 'server', 'timeout', 'network']);

interface ClaimedSkill {
  id: string;
  skill_id: string;
  email: string | null;
  user_id: string | null;
  ghl_attempts: number;
  purchased_at: string | number;
}

const errorCode = (r: { kind: GhlFailureKind; status?: number; step: string }): string =>
  `${r.step}:${r.kind}${r.status === undefined ? '' : `:${r.status}`}`;

export async function claimDueSkillPurchases(db: Database, now: number, batch: number = BATCH, stamp: string | null = null): Promise<ClaimedSkill[]> {
  const rows = (await db.execute(sql`
    update ${skillPurchases}
       set ${claimSet(now)}
     where id in (
       select id from ${skillPurchases}
        where ${dueWhere(stamp)}
          and (email is not null or user_id is not null)
          and (ghl_next_attempt_at is null or ghl_next_attempt_at <= ${now})
        order by purchased_at, id
        limit ${batch}
        for update skip locked)
    returning id, skill_id, email, user_id, ghl_attempts, purchased_at`)) as unknown as ClaimedSkill[];
  return [...rows].sort((a, b) => Number(a.purchased_at) - Number(b.purchased_at) || (a.id < b.id ? -1 : 1));
}

/** One pass over skill purchases. Refuses Spring's location before any request. */
export async function runGhlSkillSync(options: { db: Database; log: GhlSyncLog; config: GhlConfig; fetch?: Fetch }): Promise<GhlSyncRun> {
  const { db, log, config } = options;
  if (config.locationId === SPRING_GHL_LOCATION) {
    log.warn({}, 'skill purchases were not copied: the GoHighLevel location is guarded');
    return { ran: false, claimed: 0, synced: 0, created: 0, failed: 0, gaveUp: 0 };
  }
  const run: GhlSyncRun = { ran: true, claimed: 0, synced: 0, created: 0, failed: 0, gaveUp: 0 };
  const stamp = syncStamp(config);
  const rows = await claimDueSkillPurchases(db, clock.now(), BATCH, stamp);
  run.claimed = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    let email = (row.email ?? '').trim().toLowerCase();
    let name: string | null = null;
    if (row.user_id) {
      const [user] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, row.user_id)).limit(1);
      if (!email && user) email = user.email.trim().toLowerCase();
      name = user?.name ?? null;
    }
    const now = clock.now();
    if (!email) {
      await db.update(skillPurchases).set({ ghlSyncedAt: now, ghlSyncStamp: stamp, ghlNextAttemptAt: null, ghlError: 'upsert:malformed' }).where(eq(skillPurchases.id, row.id));
      continue;
    }
    const result = await syncSkillContact({ email, name, skillId: row.skill_id }, { config, ...(options.fetch ? { fetch: options.fetch } : {}) });
    if (result.ok) {
      await db
        .update(skillPurchases)
        .set({ ghlContactId: result.contactId, ghlSyncedAt: clock.now(), ghlSyncStamp: stamp, ghlNextAttemptAt: null, ghlError: null })
        .where(eq(skillPurchases.id, row.id));
      run.synced += 1;
      if (result.created) run.created += 1;
      if (result.tagsDropped.length) log.error({ purchase: row.id, contact: result.contactId, dropped: result.tagsDropped }, 'GHL dropped tags this skill buyer already had; restore them in GHL');
      continue;
    }
    if (SYSTEMIC.has(result.kind)) {
      const pause = result.kind === 'unauthorized' ? UNAUTHORIZED_PAUSE_MS : SYSTEMIC_PAUSE_MS;
      const deferred = rows.slice(i).map((r) => r.id);
      for (const id of deferred) {
        await db
          .update(skillPurchases)
          .set({ ghlAttempts: sql`greatest(${skillPurchases.ghlAttempts} - 1, 0)`, ghlNextAttemptAt: now + pause, ghlError: errorCode(result) })
          .where(eq(skillPurchases.id, id));
      }
      run.paused = { kind: result.kind, ...(result.status === undefined ? {} : { status: result.status }), rowsDeferred: deferred.length };
      log.warn({ kind: result.kind, status: result.status, deferred: deferred.length }, 'GHL unavailable for skill purchases; paused, nothing lost');
      break;
    }
    const attempts = row.ghl_attempts;
    const gaveUp = attempts >= MAX_ATTEMPTS;
    await db
      .update(skillPurchases)
      .set({ ghlError: errorCode(result), ghlNextAttemptAt: gaveUp ? null : now + BACKOFF_MS[attempts - 1]! })
      .where(eq(skillPurchases.id, row.id));
    run.failed += 1;
    if (gaveUp) run.gaveUp += 1;
    log[gaveUp ? 'error' : 'warn']({ purchase: row.id, kind: result.kind, status: result.status, attempts }, 'GHL refused a skill buyer contact');
  }
  return run;
}
