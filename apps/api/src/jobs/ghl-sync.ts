// Copy /ai101 waitlist sign-ups into GoHighLevel. DECISIONS.md D-033.
//
// A loop of its own, not a job inside scheduler.ts, for the reason server.ts gives about that
// scheduler: it follows `fixtureOnly` because arming it "is a decision about the program's emails".
// This is a decision about the WAITLIST, which exists whenever a database does. So this loop is
// armed by the database and the GHL configuration, and a GHL outage can never delay a reminder email
// (or the reverse).
//
// THE ROW IS THE SYSTEM OF RECORD. The route stores the sign-up and answers the visitor; this file
// runs later and makes a copy. Nothing here can refuse a sign-up, and a sign-up made while GHL is
// down, or before the variables are set, is synced once it is back. That is also the backfill: the
// sign-ups that predate this file have `ghl_synced_at` null, so the first tick picks them up.
//
// ONE TICK
//   1. CLAIM, in one statement: up to BATCH due rows, `FOR UPDATE SKIP LOCKED`, each given an
//      attempt and a lease (`ghl_next_attempt_at = now + LEASE`), then committed. Nothing is held
//      while GHL is called. A process that dies mid-sync leaves the lease to expire and the row is
//      tried again; a second replica skips rows another one has locked.
//   2. SYNC each row, one at a time, outside any transaction. The calls are idempotent (see
//      integrations/ghl.ts), so a row synced twice — a lease that expired under a slow call — lands
//      on the same contact with the same tags.
//   3. RECORD each outcome on its row.
//
// TWO KINDS OF FAILURE, kept apart so an outage cannot use up the list's retries:
//   - ROW failures (GHL rejected THIS contact, or answered something unreadable): the attempt counts,
//     and the row backs off on its own schedule. After MAX_ATTEMPTS it stops and `ghl_error` says
//     why; resetting `ghl_attempts` to 0 retries it.
//   - SYSTEMIC failures (a rejected token, a rate limit, a 5xx, a timeout, no network): nothing about
//     the row is wrong. The tick stops there, the attempt is handed back to that row and every row
//     not yet tried, and all of them wait out a short pause. A revoked token therefore never exhausts
//     anyone's retries; fixing it in Railway resumes the sync within UNAUTHORIZED_PAUSE.
//
// PRIVACY. Log lines carry row ids, counts, status codes and tag names — never a first name or an
// email address, and never a GHL response body. The CRM contact id is logged; it is an opaque key.

import { sql, eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { ai101Waitlist } from '../db/schema';
import { clock } from '../lib/clock';
import { readGhlConfig, syncWaitlistContact } from '../integrations/ghl';
import type { Fetch, GhlConfig, GhlFailureKind } from '../integrations/ghl';

/** Rows claimed per tick. Sequential calls at a few hundred ms each: a room's sign-ups in minutes. */
export const BATCH = 25;

/** The claim lease. Longer than a full batch can take even if every call runs to its timeout. */
export const LEASE_MS = 15 * 60_000;

/** One tick a minute, as the scheduler. */
export const GHL_TICK_MS = 60_000;

/** Delay after the Nth ROW failure (1-based). The last entry is the give-up point. */
export const BACKOFF_MS = [1, 5, 15, 60, 180, 360, 720, 1440].map((m) => m * 60_000);
export const MAX_ATTEMPTS = BACKOFF_MS.length;

/** How long every remaining row waits after a systemic failure. */
export const UNAUTHORIZED_PAUSE_MS = 15 * 60_000;
export const SYSTEMIC_PAUSE_MS = 2 * 60_000;

const SYSTEMIC: ReadonlySet<GhlFailureKind> = new Set(['unauthorized', 'rate-limited', 'server', 'timeout', 'network']);

export interface GhlSyncLog {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

const CONSOLE_LOG: GhlSyncLog = {
  info: (o, m) => console.log(m, o),
  warn: (o, m) => console.warn(m, o),
  error: (o, m) => console.error(m, o),
};

export interface GhlSyncOptions {
  db?: Database;
  log?: GhlSyncLog;
  /** Defaults to `readGhlConfig()`; null means switched off. */
  config?: GhlConfig | null;
  fetch?: Fetch;
}

export interface GhlSyncRun {
  /** False when the integration is not configured. */
  ran: boolean;
  claimed: number;
  synced: number;
  /** Of `synced`, how many GHL said it CREATED rather than matched. */
  created: number;
  /** Row failures this tick. */
  failed: number;
  /** Row failures that used the last attempt. */
  gaveUp: number;
  /** Set when the tick stopped early on a systemic failure. */
  paused?: { kind: GhlFailureKind; status?: number; rowsDeferred: number };
}

interface ClaimedRow {
  id: string;
  first_name: string;
  email: string;
  brokerage: string | null;
  src: string | null;
  ghl_attempts: number;
  phone: string | null;
  sms_consent: boolean;
  /** Which form (D-038): it picks the contact's tags. */
  source: string;
  /** bigint: postgres-js hands raw int8 back as a string. */
  created_at: string | number;
}

/** Step 1: claim due rows, atomically, and commit. Exported for the test of the claim itself. */
export async function claimDueRows(db: Database, now: number, batch: number = BATCH): Promise<ClaimedRow[]> {
  const rows = (await db.execute(sql`
    update ${ai101Waitlist}
       set ghl_attempts = ghl_attempts + 1,
           ghl_next_attempt_at = ${now + LEASE_MS}
     where id in (
       select id from ${ai101Waitlist}
        where ghl_synced_at is null
          and ghl_attempts < ${MAX_ATTEMPTS}
          and (ghl_next_attempt_at is null or ghl_next_attempt_at <= ${now})
        order by created_at, id
        limit ${batch}
        for update skip locked)
    returning id, first_name, email, brokerage, src, ghl_attempts, phone, sms_consent, source, created_at`)) as unknown as ClaimedRow[];
  // `returning` does not keep the subquery's order, and ids are random, so sort on the sign-up time:
  // the backfill goes oldest first.
  return [...rows].sort((a, b) => Number(a.created_at) - Number(b.created_at) || (a.id < b.id ? -1 : 1));
}

const errorCode = (r: { kind: GhlFailureKind; status?: number; step: string }): string =>
  `${r.step}:${r.kind}${r.status === undefined ? '' : `:${r.status}`}`;

/** One tick. Exported so the test can drive it without an interval. */
export async function runGhlSync(options: GhlSyncOptions = {}): Promise<GhlSyncRun> {
  const config = options.config === undefined ? readGhlConfig() : options.config;
  const run: GhlSyncRun = { ran: false, claimed: 0, synced: 0, created: 0, failed: 0, gaveUp: 0 };
  if (!config) return run;
  run.ran = true;

  const db = options.db ?? getDb();
  const log = options.log ?? CONSOLE_LOG;
  const rows = await claimDueRows(db, clock.now());
  run.claimed = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const result = await syncWaitlistContact(
      {
        firstName: row.first_name,
        email: row.email,
        brokerage: row.brokerage,
        src: row.src,
        phone: row.phone,
        smsConsent: row.sms_consent,
        source: row.source,
      },
      { config, ...(options.fetch ? { fetch: options.fetch } : {}) },
    );
    const now = clock.now();

    if (result.ok) {
      await db
        .update(ai101Waitlist)
        .set({ ghlContactId: result.contactId, ghlSyncedAt: now, ghlNextAttemptAt: null, ghlError: null })
        .where(eq(ai101Waitlist.id, row.id));
      run.synced += 1;
      if (result.created) run.created += 1;
      if (result.tagsDropped.length) {
        // Should never happen: the tags call is sent the union of the contact's tags and ours. If it
        // does, GHL replaced tags anyway and marketing needs to know which ones went.
        log.error(
          { row: row.id, contact: result.contactId, dropped: result.tagsDropped },
          'GHL dropped tags this contact already had; restore them in GHL',
        );
      }
      continue;
    }

    if (SYSTEMIC.has(result.kind)) {
      // Nothing is wrong with this row or the ones after it. Hand their attempts back and pause them.
      const pause = result.kind === 'unauthorized' ? UNAUTHORIZED_PAUSE_MS : SYSTEMIC_PAUSE_MS;
      const deferred = rows.slice(i).map((r) => r.id);
      for (const id of deferred) {
        await db
          .update(ai101Waitlist)
          .set({
            ghlAttempts: sql`greatest(${ai101Waitlist.ghlAttempts} - 1, 0)`,
            ghlNextAttemptAt: now + pause,
            ghlError: errorCode(result),
          })
          .where(eq(ai101Waitlist.id, id));
      }
      run.paused = {
        kind: result.kind,
        ...(result.status === undefined ? {} : { status: result.status }),
        rowsDeferred: deferred.length,
      };
      log[result.kind === 'unauthorized' ? 'error' : 'warn'](
        { kind: result.kind, status: result.status, step: result.step, deferred: deferred.length, pauseMs: pause },
        result.kind === 'unauthorized'
          ? 'GHL rejected the token (check GHL_TOKEN and its contacts.write scope); the sync is paused, nothing was lost'
          : 'GHL is unavailable; the sync is paused and will retry, nothing was lost',
      );
      break;
    }

    // A row failure: this contact was refused or the answer was unreadable.
    const attempts = row.ghl_attempts;
    const gaveUp = attempts >= MAX_ATTEMPTS;
    await db
      .update(ai101Waitlist)
      .set({ ghlError: errorCode(result), ghlNextAttemptAt: gaveUp ? null : now + BACKOFF_MS[attempts - 1]! })
      .where(eq(ai101Waitlist.id, row.id));
    run.failed += 1;
    if (gaveUp) run.gaveUp += 1;
    log[gaveUp ? 'error' : 'warn'](
      { row: row.id, step: result.step, kind: result.kind, status: result.status, attempts },
      gaveUp
        ? 'GHL refused a waitlist contact on its last attempt; it stays in the waitlist table, unsynced'
        : 'GHL refused a waitlist contact; it will be retried',
    );
  }

  return run;
}

export interface GhlSync {
  readonly running: boolean;
  stop(): Promise<void>;
}

export interface StartGhlSyncOptions extends GhlSyncOptions {
  /** Whether a database is configured, as server.ts already computes it for the waitlist. */
  waitlist: boolean;
  intervalMs?: number;
  signals?: readonly NodeJS.Signals[];
}

const OFF: GhlSync = { running: false, stop: async () => {} };

/**
 * Arm the loop, or don't.
 *
 * Off without a database (there is no waitlist to copy) and off without BOTH GHL variables. It says
 * which, once, so a deploy that expected the sync to run can see in its log why it is not.
 */
export function startGhlSync(options: StartGhlSyncOptions): GhlSync {
  const log = options.log ?? CONSOLE_LOG;
  if (!options.waitlist) return OFF;
  const config = options.config === undefined ? readGhlConfig() : options.config;
  if (!config) {
    log.info({}, 'GHL sync not started: GHL_TOKEN and GHL_LOCATION_ID are not both set');
    return OFF;
  }

  const intervalMs = options.intervalMs ?? GHL_TICK_MS;
  let inFlight: Promise<void> | null = null;
  let timer: NodeJS.Timeout | null = null;

  const fire = (): void => {
    if (inFlight) return; // a tick that outlasts the interval is a slow GHL, not news
    inFlight = runGhlSync({ ...options, config, log })
      .then(
        (run) => {
          if (run.claimed === 0) return;
          log.info({ ...run, paused: run.paused?.kind }, 'GHL sync tick');
        },
        (err: unknown) => log.error({ err }, 'GHL sync tick failed; the loop continues and the next tick retries'),
      )
      .finally(() => {
        inFlight = null;
      });
  };

  timer = setInterval(fire, intervalMs);
  timer.unref();
  log.info({ intervalMs }, 'GHL sync started');

  const signals = options.signals ?? (['SIGTERM', 'SIGINT'] as const);
  const handler = (): void => void stop();
  for (const s of signals) process.once(s, handler);

  // A tick cut off by a redeploy needs no drain: its rows' leases expire and the calls are idempotent.
  async function stop(): Promise<void> {
    if (timer) clearInterval(timer);
    timer = null;
    for (const s of signals) process.off(s, handler);
    if (inFlight) await inFlight;
  }

  return {
    get running() {
      return timer !== null;
    },
    stop,
  };
}
