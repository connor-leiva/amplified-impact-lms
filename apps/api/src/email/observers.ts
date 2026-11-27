// D-264: cohort observer emails. Connor and Spring see what a cohort receives, once per cohort send, with no learner
// seat and without a copy of every team's email. Core holds the rules (`@ai/core`'s `email-observers.ts`); this file
// reads the list, builds the copies, claims them in their own ledger and sends them.
//
// ONE COPY PER COHORT SEND. A cohort send is the unit the learners' own ledger already names, read off a `job_runs`
// key (`<job>:<scope>:<learner>`): the job and its scope, in the learner's cohort. So Session 3's 24-hour reminder to
// fourteen learners is one copy; a week's digest is one copy per cohort (each cohort's names its own day); an
// announcement is one copy however many cohorts it reaches (every cohort reads the same words); a cohort's Week 0 Is
// Open email and its welcome are one copy each, on the first learner that cohort sends one to.
//
// LEDGER FIRST, MAIL SECOND, as the scheduler does for learners. A copy is claimed in `observer_copies` (unique
// `(kind, unit, address)`, `on conflict do nothing`) and only a claim this process inserted is sent, so a second tick,
// a second replica or Send now and the scheduler both seeing one announcement send it once. A copy the transport
// refuses is not retried, the same trade `scheduler.ts` makes. Kept apart from `job_runs`, so the learners' ledger,
// and everything that reads it, never holds an observer.
//
// NO ONE PERSON IN IT. The copy is the cohort's email with the reader's first name left out (the templates then greet
// no one by name), a build reminder at no steps verified (not one learner's progress), and the welcome's set-password
// link replaced by an inert placeholder (`OBSERVER_PLACEHOLDER_TOKEN`, which no `auth_tokens` row can match: tokens are
// random and stored hashed). A sign-in, password, invite, nudge or receipt email is never copied at all
// (`observer-templates.ts`), and the transport refuses one marked as a copy.
//
// NOTHING ELSE MOVES. An observer is an address: no user, seat, team, enrollment or progress row is written, the
// email log marks the copy (`observer_copy`, no user id), and the counts a learner, a roster or a seat cap reads are
// exactly what they would be with no observers.

import { eq } from 'drizzle-orm';
import { COHORT_OBSERVER_ENV, COHORT_OBSERVER_SETTING, parseObserverAddresses, resolveObservers } from '@ai/core';
import type { EmailObserverSource } from '@ai/core';
import type { Database } from '../db/client';
import type { Queryable } from '../db/io';
import { consoleSettings, observerCopies } from '../db/schema';
// Type only: `jobs/due.ts` is pure and imports nothing that sends.
import type { Send } from '../jobs/due';
import { observerMayReceive } from './observer-templates';
import { absolute, setPasswordPath } from './templates/links';
import { send } from './transport';
import type { EmailData, SendRequest, TemplateName } from './transport';

/** The welcome copy's set-password token: plainly not one, and matched by no row (tokens are stored hashed). */
export const OBSERVER_PLACEHOLDER_TOKEN = 'observer-copy-not-a-live-link';

/** What a list read hands a caller: the addresses in force, where they came from, and the Console's saved list. */
export interface ObserverList {
  addresses: string[];
  source: EmailObserverSource;
  saved: { addresses: string[]; updatedAt: number | null; updatedBy: string | null } | null;
}

/** A saved value's addresses. Anything malformed reads as none: a list nobody can read must send nothing. */
function savedAddresses(value: unknown): string[] {
  const list = value && typeof value === 'object' && !Array.isArray(value) ? (value as { addresses?: unknown }).addresses : undefined;
  const parsed = parseObserverAddresses(list ?? []);
  return parsed.ok ? parsed.addresses : [];
}

/** The observer list in force: the Console's saved list, else `COHORT_OBSERVER_EMAILS`, else nobody (core's rule). */
export async function readObserverList(db: Pick<Queryable, 'select'>, env: NodeJS.ProcessEnv = process.env): Promise<ObserverList> {
  const [row] = await db.select().from(consoleSettings).where(eq(consoleSettings.key, COHORT_OBSERVER_SETTING)).limit(1);
  const saved = row ? { addresses: savedAddresses(row.value), updatedAt: row.updatedAt ?? null, updatedBy: row.updatedBy ?? null } : null;
  return { ...resolveObservers(saved ? saved.addresses : null, env[COHORT_OBSERVER_ENV]), saved };
}

/** One observer copy, ready for the transport: `template` and `data` correlated, as a `Send`'s are. */
export type ObserverCopy = {
  [T in TemplateName]: { kind: string; unit: string; cohortId: string | null; template: T; to: string; data: EmailData<T> };
}[TemplateName];

/**
 * The copy's payload: the cohort's email with no one person in it (see the header). Null for a template an observer
 * never gets, and for a welcome whose placeholder link can't be made (no `APP_URL`), which the learner's own welcome
 * could not have rendered either.
 */
export function observerData<K extends TemplateName>(template: K, data: EmailData<K>): EmailData<K> | null {
  if (!observerMayReceive(template)) return null;
  const out: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  delete out.firstName;
  delete out.token;
  if (template === 'build-reminder') out.steps = 0;
  if (template === 'cohort-welcome') {
    try {
      out.setPasswordUrl = absolute(setPasswordPath(OBSERVER_PLACEHOLDER_TOKEN), out.appUrl as string | null | undefined);
    } catch {
      return null;
    }
  }
  return out as EmailData<K>;
}

const copyOf = <K extends TemplateName>(kind: string, unit: string, cohortId: string | null, to: string, template: K, data: EmailData<K>): ObserverCopy =>
  ({ kind, unit, cohortId, template, to, data }) as ObserverCopy;

/**
 * The cohort send a learner's send belongs to. An announcement is one send whatever cohorts it reaches; every other
 * job's scope is read in the learner's cohort (a session belongs to one; a week's digest is per cohort).
 */
export function cohortSendUnit(job: string, scope: string, cohortId: string | null): string {
  return job === 'announcement' ? scope : `${scope}@${cohortId ?? '-'}`;
}

/**
 * The observer copies a batch of learner sends owes: one per cohort send per address, in the batch's order, from the
 * first learner send of each. `cohortOf` names a learner's cohort (from the snapshot the sends were computed from).
 */
export function observerCopiesFor(sends: readonly Send[], cohortOf: (userId: string) => string | null, addresses: readonly string[]): ObserverCopy[] {
  if (!addresses.length) return [];
  const out: ObserverCopy[] = [];
  const seen = new Set<string>();
  for (const s of sends) {
    if (!observerMayReceive(s.template)) continue;
    const [, scope = '', recipient = ''] = s.key.split(':');
    const cohortId = cohortOf(recipient);
    const unit = cohortSendUnit(s.job, scope, cohortId);
    const id = `${s.job}\u0000${unit}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const data = observerData(s.template, s.data);
    if (!data) continue;
    for (const to of addresses) out.push(copyOf(s.job, unit, s.job === 'announcement' ? null : cohortId, to, s.template, data));
  }
  return out;
}

const copyId = (c: { kind: string; unit: string; to: string }): string => `${c.kind}\u0000${c.unit}\u0000${c.to}`;

/** The batch size of one multi-row insert, as `recordSends` uses. */
const CHUNK = 500;

/**
 * Claim these copies in `observer_copies` and return the ones this call inserted: THE DISPATCH GATE, as `recordSends`'
 * return value is for learners. A copy another tick, replica or path already claimed comes back missing and is never
 * sent again.
 */
export async function claimObserverCopies(tx: Pick<Queryable, 'insert'>, copies: readonly ObserverCopy[], now: number): Promise<ObserverCopy[]> {
  const claimed = new Set<string>();
  for (let i = 0; i < copies.length; i += CHUNK) {
    const rows = await tx
      .insert(observerCopies)
      .values(copies.slice(i, i + CHUNK).map((c) => ({ kind: c.kind, unit: c.unit, address: c.to, cohortId: c.cohortId, template: c.template, sentAt: now })))
      .onConflictDoNothing()
      .returning({ kind: observerCopies.kind, unit: observerCopies.unit, to: observerCopies.address });
    for (const r of rows) claimed.add(copyId(r));
  }
  return copies.filter((c) => claimed.has(copyId(c)));
}

/** A transaction that can open a savepoint: the scheduler's tick, and a write's on `/api/mutate` or the admin actions. */
export type SavepointTx = Pick<Queryable, 'select' | 'insert'> & { transaction: Database['transaction'] };

/**
 * Inside a learners' transaction: read the list, build the copies this batch of learner sends owes, and claim them,
 * all in a SAVEPOINT. Whatever fails here (an unreadable setting, a missing table on a half-migrated deploy) rolls back
 * to the savepoint and is logged, and the learners' transaction goes on to commit their emails as if no observer
 * existed: a copy is never worth a learner's reminder.
 */
export async function claimObserverCopiesFor(
  tx: SavepointTx,
  sends: readonly Send[],
  cohortOf: (userId: string) => string | null,
  now: number,
  log: ObserverLog,
): Promise<ObserverCopy[]> {
  if (!sends.length) return [];
  try {
    return await tx.transaction(async (sp) => {
      const { addresses } = await readObserverList(sp);
      return claimObserverCopies(sp, observerCopiesFor(sends, cohortOf, addresses), now);
    });
  } catch (err) {
    log.error({ err: String(err) }, 'cohort observer copies were not claimed; the learners’ emails go out regardless');
    return [];
  }
}

/** Where a copy's failure is written. Structural, so the scheduler's log and the billing loop's both fit. */
export interface ObserverLog {
  error(obj: Record<string, unknown>, msg: string): void;
}

export interface ObserverSendCount {
  sent: number;
  failed: number;
}

/** Send claimed copies, one at a time, after the commit. Never throws; counted apart from every learner count. */
export async function sendObserverCopies(copies: readonly ObserverCopy[], log: ObserverLog): Promise<ObserverSendCount> {
  const count: ObserverSendCount = { sent: 0, failed: 0 };
  for (const c of copies) {
    try {
      const request = { template: c.template, to: c.to, data: c.data, observer: true } as SendRequest<TemplateName>;
      const result = await send(request);
      if (result.ok) count.sent += 1;
      else {
        count.failed += 1;
        log.error({ kind: c.kind, unit: c.unit, template: c.template, error: result.error }, 'a cohort observer copy was not delivered');
      }
    } catch (err) {
      count.failed += 1;
      log.error({ kind: c.kind, unit: c.unit, template: c.template, err: String(err) }, 'a cohort observer copy threw');
    }
  }
  return count;
}

/**
 * For the two jobs that send one learner at a time (Week 0 Is Open and the welcome, on the billing loop): after a
 * learner's send in a cohort succeeds, copy that cohort's email to each observer, once. The list is read once per run,
 * and a cohort already copied this run is not claimed again.
 */
export function cohortCopier(db: Pick<Queryable, 'select' | 'insert'>, now: number, log: ObserverLog, env: NodeJS.ProcessEnv = process.env) {
  let list: Promise<string[]> | null = null;
  const done = new Set<string>();
  const total: ObserverSendCount = { sent: 0, failed: 0 };
  return {
    total,
    async copy<K extends 'week0-open' | 'cohort-welcome'>(template: K, cohortId: string, data: EmailData<K>): Promise<void> {
      if (done.has(cohortId)) return;
      done.add(cohortId);
      try {
        list ??= readObserverList(db, env).then((l) => l.addresses);
        const addresses = await list;
        if (!addresses.length) return;
        const copyData = observerData(template, data);
        if (!copyData) return;
        const copies = addresses.map((to) => copyOf(template, cohortId, cohortId, to, template, copyData));
        const counted = await sendObserverCopies(await claimObserverCopies(db, copies, now), log);
        total.sent += counted.sent;
        total.failed += counted.failed;
      } catch (err) {
        // A copy is never worth a learner's email: whatever goes wrong here is logged and the job carries on.
        log.error({ template, cohort: cohortId, err: String(err) }, 'cohort observer copy failed');
      }
    },
  };
}
