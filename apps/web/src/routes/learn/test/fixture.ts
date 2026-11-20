// Test data for the learner portal v2 (D-177): the course and a learner's snapshot as the API would send
// them, built from the deployed seed (the release plan, the copy strings and the new Weeks 0 to 3). Tests
// only: under a `test/` folder, which the copy guard leaves out of runtime.

import { acceleratorModuleId } from '@ai/core/accelerator';
import { courseFor, courseSessions } from '@ai/core/course';
import { withLiveState } from '@ai/core/learner';
import { scopeSnapshot } from '@ai/core/scope';
import type { Db, Learner } from '@ai/core';
import { planContentV2 } from '@ai/core/seed/content-v2';
import { planCopyV1 } from '@ai/core/seed/copy-v1';
import { seedProduction } from '@ai/core/seed/curriculum';
import { planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import type { CoursePayload } from '../../course/Course.vm';
import type { Viewer } from '../../../data/repository';

/** Nov 18, 2026, 2:00 PM MT: the pre-launch preview. Week 0 open, Week 1 opens Dec 2. */
export const PRELAUNCH_NOW = Date.parse('2026-11-18T21:00:00Z');
/** Dec 9, 2026, 12:05 PM MT: five minutes into Week 2's live build. */
export const LIVE_NOW = Date.parse('2026-12-09T19:05:00Z');

export const LEARNER_ID = 'u-dana';

let base: Db | null = null;
export const deployed = (): Db => {
  base ??= planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
  return structuredClone(base);
};

export const learner = (progress: Record<number, string[]>): Learner => ({
  id: LEARNER_ID,
  name: 'Dana Ross',
  email: 'dana@example.com',
  tier: 'team',
  role: 'Team Owner',
  teamId: null,
  cohortId: 'dec26',
  joined: 0,
  last: null,
  status: 'active',
  progress: Object.fromEntries(
    Object.entries(progress).map(([w, steps]) => [acceleratorModuleId(Number(w)), { steps, builtAt: null, deployedAt: null, runtime: null }]),
  ),
});

export interface LearnState {
  now: number;
  payload: CoursePayload;
  db: Db;
  viewer: Viewer;
}

/** The course and the snapshot for a learner at `now`, in the preview or in the course itself. */
export function learnState(now: number, preview: boolean, progress: Record<number, string[]>, enrolled = 15, edit?: (d: Db) => void): LearnState {
  const d = deployed();
  d.users.push(learner(progress));
  d.cohorts[0]!.enrolled = enrolled;
  // D-183: what staff did in the Console (Go Live, End Session, Publish Replay), before the snapshot is cut.
  edit?.(d);
  const course = courseFor(d, now, { open: true, preview })!;
  const payload: CoursePayload = {
    open: true,
    preview: false,
    prelaunch: preview,
    course,
    sessions: courseSessions(d),
    copy: Object.fromEntries((d.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
  };
  const db = scopeSnapshot(d, { kind: 'learner', userId: LEARNER_ID }, { accelerator: true, at: now, preview });
  return { now, payload, db, viewer: { actor: { kind: 'learner', userId: LEARNER_ID }, role: 'learner' } };
}

export const prelaunchState = (): LearnState => learnState(PRELAUNCH_NOW, true, { 0: ['c1', 'c2'] });
export const liveState = (): LearnState =>
  learnState(LIVE_NOW, false, { 0: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'], 1: ['c1', 'c2', 'c3', 'c4', 'c5'] });

/** D-183: the course as the shell hands it to every screen: its sessions carry the snapshot's live state. */
export const asShell = (st: LearnState): LearnState => ({ ...st, payload: { ...st.payload, sessions: withLiveState(st.payload.sessions, st.db) } });

/** D-183: a session of the deployed seed, by id, from a snapshot under construction. */
export const sessionIn = (d: Db, id: string) => d.sessions.find((s) => s.id === id)!;
