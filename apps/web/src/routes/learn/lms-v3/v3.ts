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

/**
 * Who v3 draws for on this visit: `v3On`, except a staff member's preview, which keeps today's shell (its "Previewing
 * as" line has no place in the mockup, C-04). The shell and every v3 page ask this, so chrome and page always agree.
 */
export function v3For(
  viewer: { preview?: unknown },
  me: Pick<Learner, 'test'> | null,
  flag: boolean = LMS_V3,
): boolean {
  return !viewer.preview && v3On(me, flag);
}

/** The Community's addresses: the list and one thread. */
export const isCommunityPath = (pathname: string): boolean => /^\/learn\/community(?:\/[^/]+)?\/?$/.test(pathname);

/**
 * D-231: who opens the Community. A learner v3 draws for (`v3For`), and staff, flag or not: it is where they pin,
 * hide and answer, and it has no page outside v3. A staff member previewing a learner (C-04) doesn't.
 */
export function communityFor(
  viewer: { preview?: unknown; actor: { kind: string } },
  me: Pick<Learner, 'test'> | null,
  flag: boolean = LMS_V3,
): boolean {
  return v3For(viewer, me, flag) || (viewer.actor.kind === 'staff' && !viewer.preview);
}

/** Whether this visit draws the v3 frame at this address: `v3For`, or the Community's for staff (`communityFor`). */
export function v3FrameAt(
  pathname: string,
  viewer: { preview?: unknown; actor: { kind: string } },
  me: Pick<Learner, 'test'> | null,
  flag: boolean = LMS_V3,
): boolean {
  return v3For(viewer, me, flag) || (isCommunityPath(pathname) && communityFor(viewer, me, flag));
}
