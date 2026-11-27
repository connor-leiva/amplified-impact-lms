// SEED, NOT RUNTIME (D-262, R-5 Phase 5). The one-time data step that copies December's real selling values onto its
// record (PLAN.md § 10.10: "December's current values become its stored settings, so every December output stays
// byte-identical"). It runs after Phase 3's `2026-11-26-december-run`.
//
// WHAT IT WRITES, on `dec26` only: `founding` (true); `founding_closes_at`, production's `FOUNDING_CLOSES_AT` as the
// deploy reads it, else `DEFAULT_FOUNDING_CLOSES_AT`; the three lookup keys (`cohort_founding_full`,
// `membership_monthly_team_leader`, `cohort_founding_two_pay`); `two_pay` (true); the two Payment Link addresses,
// production's `PAYMENT_LINK_COHORT_FULL` and `PAYMENT_LINK_COHORT_TWO_PAY` as `readOfferConfig` reads them;
// `included_until` 2027-05-04; and GoHighLevel's value, "dec26". The API hands it the environment
// (`apps/api/src/db/data-migrations.ts`); this file reads none.
//
// D-175'S RULE. A field is written only when it is unset and the value written reads back exactly as the code reads it
// today (`cohortSelling` before and after must be equal; the included-time day's instant is `INSIDERS_FIRST_CHARGE_AT`).
// A field already set, a link variable that is unset or not an https address, a seat cap that is not 15, and a first
// live build that is not D-153's instant are left alone and named in the step's summary, for the PM. So is a status
// other than `enrolling`, for the record only: December's sale does not read its status (hotfix D-266; production's
// December is not `enrolling`, and #281 had closed its carts).
//
// ROLLBACK. `undoDecemberSellingV1` clears what the step wrote (each field still holding the value it wrote), so every
// read falls back to the constants and the environment, which hold the same values: nothing moves either way. In SQL:
//
//   update cohorts set founding = null, founding_closes_at = null, lookup_key_full = null, lookup_key_rollover = null,
//     lookup_key_two_pay = null, two_pay = null, link_full = null, link_two_pay = null, ghl_value = null,
//     included_until = null where id = 'dec26';
//   delete from data_migrations where id = '2026-11-27-december-selling';   -- only to let it run again
//
// `audit_log` keeps the step's rows: it is append-only.
//
// Pure: no clock, no random source, no environment.

import { COURSE_OPENS_AT, DEFAULT_COHORT_ID, cohortOpensAt } from '../src/accelerator';
import { DECEMBER_INCLUDED_UNTIL, cohortSelling, decemberBuiltIn, includedEndAt } from '../src/cohort-selling';
import type { SellingEnv } from '../src/cohort-selling';
import { COHORT_SEATS, INSIDERS_FIRST_CHARGE_AT } from '../src/offer';
import type { Cohort, Db } from '../src/types';
import type { DataChange, DataSkip, DataStepOutcome } from './data-step';

/** The step's id, recorded in `data_migrations` once it has run. */
export const DECEMBER_SELLING_V1 = '2026-11-27-december-selling';

/** The fields the step may write, in the order it writes them. */
export const DECEMBER_SELLING_FIELDS = [
  'founding',
  'foundingClosesAt',
  'lookupKeyFull',
  'lookupKeyRollover',
  'lookupKeyTwoPay',
  'twoPay',
  'linkFull',
  'linkTwoPay',
  'includedUntil',
  'ghlValue',
] as const satisfies readonly (keyof Cohort)[];
export type DecemberSellingField = (typeof DECEMBER_SELLING_FIELDS)[number];

/** What December's record should hold, field by field, from the code and the environment the deploy runs with. */
export function decemberSellingValues(env: SellingEnv): Record<DecemberSellingField, Cohort[DecemberSellingField] | null> {
  const built = decemberBuiltIn(env);
  return {
    founding: built.founding,
    foundingClosesAt: built.foundingClosesAt,
    lookupKeyFull: built.keys.full,
    lookupKeyRollover: built.keys.rollover,
    lookupKeyTwoPay: built.keys.twoPay,
    twoPay: built.twoPay,
    linkFull: built.links.full,
    linkTwoPay: built.links.twoPay,
    includedUntil: built.includedUntil,
    ghlValue: DEFAULT_COHORT_ID,
  };
}

const VARIABLE: Partial<Record<DecemberSellingField, string>> = {
  foundingClosesAt: 'FOUNDING_CLOSES_AT',
  linkFull: 'PAYMENT_LINK_COHORT_FULL',
  linkTwoPay: 'PAYMENT_LINK_COHORT_TWO_PAY',
};

/** December's selling values, written once, only where each reads back exactly as the code reads it today. */
export function planDecemberSellingV1(db: Db, env: SellingEnv): DataStepOutcome {
  const changes: DataChange[] = [];
  const skipped: DataSkip[] = [];
  const co = db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID);
  if (!co) {
    skipped.push({ id: DEFAULT_COHORT_ID, reason: 'not in this database' });
    return { db, changes, skipped };
  }
  // Checks the step names and never writes: the seat cap is already stored, and the course's opening is its sessions'.
  if (co.capacity !== COHORT_SEATS) skipped.push({ id: `${co.id}.capacity`, reason: `left as it is: its seat cap is ${co.capacity}, not ${COHORT_SEATS}` });
  const opens = cohortOpensAt(co.id, db.sessions);
  if (opens !== COURSE_OPENS_AT)
    skipped.push({
      id: `${co.id}.opensAt`,
      reason: `its first live build starts at ${Number.isFinite(opens) ? new Date(opens).toISOString() : 'no session'}, not D-153's ${new Date(COURSE_OPENS_AT).toISOString()}: its course opens then`,
    });
  if (co.status !== 'enrolling')
    skipped.push({
      id: `${co.id}.status`,
      reason: `left as it is: its status is ${co.status}, not enrolling; December still sells, as its sale does not read its status (D-266)`,
    });
  if (includedEndAt(DECEMBER_INCLUDED_UNTIL) !== INSIDERS_FIRST_CHARGE_AT)
    skipped.push({ id: `${co.id}.includedUntil`, reason: 'left as it is: 2027-05-04 does not start at INSIDERS_FIRST_CHARGE_AT' });

  const want = decemberSellingValues(env);
  const reads = cohortSelling(db, co.id, env);
  const before: Partial<Record<DecemberSellingField, unknown>> = {};
  const after: Partial<Record<DecemberSellingField, unknown>> = {};
  let next: Cohort = { ...co };
  for (const field of DECEMBER_SELLING_FIELDS) {
    const value = want[field];
    if (co[field] !== undefined) {
      skipped.push({ id: `${co.id}.${field}`, reason: `left as it is: already set (${JSON.stringify(co[field])})` });
      continue;
    }
    if (value === null || value === undefined) {
      skipped.push({ id: `${co.id}.${field}`, reason: `left unset: ${VARIABLE[field] ?? field} is unset or not an https address, so December reads the environment` });
      continue;
    }
    if (field === 'includedUntil' && includedEndAt(value as string) !== INSIDERS_FIRST_CHARGE_AT) continue;
    const trial = { ...next, [field]: value } as Cohort;
    const read = cohortSelling({ cohorts: [trial] }, co.id, env);
    if (JSON.stringify(read) !== JSON.stringify(reads)) {
      skipped.push({ id: `${co.id}.${field}`, reason: `left unset: ${JSON.stringify(value)} would not read back as the code reads it today` });
      continue;
    }
    next = trial;
    before[field] = null;
    after[field] = value;
  }
  if (!Object.keys(after).length) return { db, changes, skipped };
  changes.push({ target: { type: 'cohort', id: co.id, label: co.name }, before, after });
  return { db: { ...db, cohorts: db.cohorts.map((c) => (c.id === co.id ? next : c)) }, changes, skipped };
}

/**
 * The rollback: each field the step wrote (`wrote`, its change's `after`, kept in its audit row and in
 * `data_migrations.summary`), cleared where it still holds that value, so December reads the constants and the
 * environment again. A field staff have changed since is left alone and named.
 */
export function undoDecemberSellingV1(db: Db, wrote: Partial<Record<DecemberSellingField, unknown>>): DataStepOutcome {
  const co = db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID);
  if (!co) return { db, changes: [], skipped: [{ id: DEFAULT_COHORT_ID, reason: 'not in this database' }] };
  const skipped: DataSkip[] = [];
  const before: Partial<Record<DecemberSellingField, unknown>> = {};
  const after: Partial<Record<DecemberSellingField, unknown>> = {};
  const next: Cohort = { ...co };
  for (const field of DECEMBER_SELLING_FIELDS) {
    if (!(field in wrote)) continue;
    if (JSON.stringify(co[field]) !== JSON.stringify(wrote[field])) {
      skipped.push({ id: `${co.id}.${field}`, reason: 'changed since the step wrote it: left as it is' });
      continue;
    }
    before[field] = co[field];
    after[field] = null;
    delete next[field];
  }
  if (!Object.keys(after).length) return { db, changes: [], skipped };
  return {
    db: { ...db, cohorts: db.cohorts.map((c) => (c.id === co.id ? next : c)) },
    changes: [{ target: { type: 'cohort', id: co.id, label: co.name }, before, after }],
    skipped,
  };
}
