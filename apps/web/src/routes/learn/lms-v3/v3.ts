// LMS v3 (D-225): the shell, the week overview, the locked week, the Schedule, the form drawer, the Community and
// Turn in, ported from `handoff/lms-v3/` (its mockup is the design; its React is converted to TSX and nothing else).
// The step page's precedent (`step-page/v6.ts`, D-210): a build flag, the seeded test learner always, and a gap rule
// per surface (`IMPLEMENTATION-SPEC.md` §4.D) so a surface that needs something the mockup doesn't draw keeps
// today's page whole, never a hybrid.
import type { Learner } from '@ai/core';

export interface LmsV3FlagEnv {
  VITE_LMS_V3?: string;
}

/** The build flag: off unless the build sets `VITE_LMS_V3=true` (nothing reaches a learner before Phase 11). */
export function lmsV3Enabled(env: LmsV3FlagEnv = import.meta.env as LmsV3FlagEnv): boolean {
  return env.VITE_LMS_V3 === 'true';
}

export const LMS_V3 = lmsV3Enabled();

/** Who sees v3: everyone once the build turns it on, and the seeded test learner (D-200, D-202) always. */
export function v3On(me: Pick<Learner, 'test'> | null, flag: boolean = LMS_V3): boolean {
  return flag || me?.test === true;
}
