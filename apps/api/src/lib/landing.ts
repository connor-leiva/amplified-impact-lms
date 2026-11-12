// Where a sign-in lands (D-150): `landingPath` in `@ai/core/landing`, over the same snapshot and plan
// access `GET /api/snapshot` would answer this viewer with. Every sign-in path asks it, so a learner
// with no cohort portal (an access group's member, an Agent Plan buyer) goes straight to the Skill
// Library and never sees the cohort dashboard at `/` first.

import { landingPath } from '@ai/core/landing';
import type { LandingPath } from '@ai/core/landing';
import type { UserRow } from '../auth';
import type { Database } from '../db/client';
import { loadDb } from '../db/io';
import { acceleratorAccess } from './course-access';

export async function landingFor(db: Database, user: Pick<UserRow, 'id' | 'kind'>, now: number): Promise<LandingPath> {
  if (user.kind !== 'learner') return '/';
  const access = { accelerator: await acceleratorAccess(db, user.id, now) };
  return landingPath(await loadDb(db), { kind: 'learner', userId: user.id }, access);
}
