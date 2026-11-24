// The AI Accelerator's outline as `GET /api/course` answers a $37 buyer (D-241: `courseOutline`), from the course the
// deploy loads (the seed's curriculum, then the data steps the deploy runs, as the learner parity suite's world builds
// it). The mockup's data (`make-data.ts`) and the pairs' API (`pairs.ts`) both read it, so they show the same weeks.
// Tools only: runtime code never reads the seed (D-173).
import { courseOutline } from '../../../packages/core/src/course';
import type { LockedCourseWeek } from '../../../packages/core/src/course';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { planCopyV2 } from '../../../packages/core/seed/copy-v2';
import { planCopyV3 } from '../../../packages/core/seed/copy-v3';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

export function deployedOutline(): LockedCourseWeek[] {
  const db = planCopyV3(planCopyV2(planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { id: 'st1', name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db).db).db;
  return courseOutline(db) ?? [];
}
