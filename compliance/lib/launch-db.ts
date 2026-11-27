// D-255 (R-5 Phase 3): production's shape, for a browser test of the admin in the fixture build. § 9.5's launch seed
// (`seedProduction`), then every one-time data step the deploy runs, in `apps/api/src/db/data-migrations.ts`'s order
// (December's run among them), with its Owner as the fixture's admin persona (`st1`), so the fixture build's admin
// writes as that Owner. The fixture repository reads it from the tab's stored database (`dbKey`), which a test puts
// there before the page loads (`launchInit`). Test-only: `compliance/` may import the seed; the app may not (D-173).
//
// `compliance/` can't resolve `@ai/core`, so these are relative, as the learner portal's e2e specs do.
import { DB_KEY } from '../../packages/core/src/constants';
import type { Db } from '../../packages/core/src/types';
import { planAiImplementerV1 } from '../../packages/core/seed/ai-implementer-v1';
import { planContentV2 } from '../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../packages/core/seed/copy-v1';
import { planCopyV2 } from '../../packages/core/seed/copy-v2';
import { planCopyV3 } from '../../packages/core/seed/copy-v3';
import { seedProduction } from '../../packages/core/seed/curriculum';
import { planDecemberRunV1 } from '../../packages/core/seed/december-run-v1';
import { planProgramV1 } from '../../packages/core/seed/program-v1';
import { planDecemberSellingV1 } from '../../packages/core/seed/december-selling-v1';
import { DEFAULT_FOUNDING_CLOSES_AT } from '../../packages/core/src/offer';
import type { SellingEnv } from '../../packages/core/src/cohort-selling';
import { planFiveWordsV1 } from '../../packages/core/seed/five-words-v1';
import { planGlossaryV1 } from '../../packages/core/seed/glossary-v1';
import { planIntakeV1 } from '../../packages/core/seed/intake-v1';
import { planPromiseV1 } from '../../packages/core/seed/promise-v1';
import { planReleaseV1 } from '../../packages/core/seed/release-plan-v1';
import { planIntakeRequiredV1 } from '../../packages/core/seed/required-v1';
import { planSeatCardOneCopyV1 } from '../../packages/core/seed/seat-card-one-copy-v1';
import { planStackV1 } from '../../packages/core/seed/stack-v1';
import { planStartHereV1 } from '../../packages/core/seed/start-here-v1';
import { planUnshownV1 } from '../../packages/core/seed/unshown-v1';
import { planWeeks12V1 } from '../../packages/core/seed/weeks-1-2-steps-v1';

/**
 * R-5 Phase 5 (D-262): the environment Phase 5's step reads as production has it, its two cohort Payment Link variables
 * set (test addresses here: the fixture has no Stripe).
 */
export const LAUNCH_SELLING_ENV: SellingEnv = {
  foundingClosesAt: Date.parse(DEFAULT_FOUNDING_CLOSES_AT),
  links: { full: 'https://buy.stripe.com/test_dec26_full', twoPay: 'https://buy.stripe.com/test_dec26_two' },
};

/** The deploy's data steps, in order (`DATA_MIGRATIONS`). */
const STEPS: readonly ((db: Db) => { db: Db })[] = [
  planReleaseV1,
  planCopyV1,
  planContentV2,
  planCopyV2,
  planCopyV3,
  planGlossaryV1,
  planStartHereV1,
  planIntakeV1,
  planStackV1,
  planPromiseV1,
  planUnshownV1,
  planFiveWordsV1,
  planIntakeRequiredV1,
  (db) => planWeeks12V1(db),
  planSeatCardOneCopyV1,
  planAiImplementerV1,
  planDecemberRunV1,
  (db) => planDecemberSellingV1(db, LAUNCH_SELLING_ENV),
  // D-265 (R-5 Phase 6): December's shared course words copied onto the program record.
  planProgramV1,
];

/** The launch database: December as production has it, before anyone bought, with the fixture's admin as its Owner. */
export function launchDb(): Db {
  let db = seedProduction({ owner: { id: 'st1', name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  for (const step of STEPS) db = step(db).db;
  // The test's own fixture choice, as December's test makes it: the preview opens Mon, Nov 23 at 9:00 AM MT.
  db.cohorts = db.cohorts.map((c) => (c.id === 'dec26' ? { ...c, previewOpensAt: Date.parse('2026-11-23T09:00:00-07:00') } : c));
  return db;
}

/** An init script that stores `db` as the fixture's live database before the app boots. */
export const launchInit = (db: Db): { content: string } => ({
  content: `try { localStorage.setItem(${JSON.stringify(DB_KEY)}, ${JSON.stringify(JSON.stringify(db))}); } catch {}`,
});
