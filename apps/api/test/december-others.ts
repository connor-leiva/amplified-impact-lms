// The other cohorts in December's database (R-5 § 1): the one place `december.test.ts` lets a phase add to its world.
//
// The spec's Phase 3 is done when "section 1's test passes with both cohorts in the database". This hook is how that
// is proved without editing the test or its golden: a phase that brings a new cohort adds it here (created by the
// same core action staff use, never by hand-written rows), and December's test then runs with it present.
//
// THE RULES FOR THIS FILE. It adds; it never changes or deletes a row it did not add. It uses addresses at
// `@january.example.test` (or another cohort's own domain), never one of December's (`EMAIL` in december.test.ts),
// so the test can tell December's people from everyone else's. It runs after December's buyers are provisioned and
// before anyone signs in, at FIXED_NOW = Nov 14, 2026.
//
// Today (Phase 0, `main` @ babceae): there is no other cohort, so it adds nothing.
import type { Database } from '../src/db/client';

/** The domain every person this hook adds is at. Mail and reminders to it are not December's. */
export const OTHER_COHORT_DOMAINS: readonly string[] = ['january.example.test'];

export async function addOtherCohorts(_db: Database, _now: number): Promise<void> {
  // Nothing yet. Phase 3 creates January here; Phase 4 puts a test team in it.
}
