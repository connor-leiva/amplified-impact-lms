// Where a signed-in viewer starts (D-119, D-150).
//
// A learner whose plan opens no AI Employee (Amplified Insiders, the Team Plan, the Agent Plan, an
// access group's member such as Utah Life) has no cohort portal: their page is the Skill Library.
// The portal already sends them there from any cohort screen (`noPortalRedirect` in the web's
// `shell/navModel.ts`); this is the same rule, `visibleModules` of their scoped snapshot, worked out
// by the server at sign-in so every sign-in path lands them on the Skill Library straight away
// instead of on `/` first. Staff, and a learner with a portal, start at `/` as before.

import { scopeSnapshot } from './scope';
import type { ViewerAccess } from './scope';
import { isGuidedPage } from './skill-guides';
import { visibleModules } from './status';
import type { Actor } from './mutations';
import type { Db } from './types';

/** The Skill Library (D-079): outside the portal's shell. */
export const SKILL_LIBRARY_PATH = '/skill-library';
const SKILL_GUIDE_PREFIX = `${SKILL_LIBRARY_PATH}/`;

/** Every path a sign-in may land on. Anything else a client is handed is read as `/`. */
export const LANDING_PATHS = ['/', SKILL_LIBRARY_PATH] as const;
export type LandingPath = (typeof LANDING_PATHS)[number];

/**
 * Where this actor starts after signing in: the Skill Library for a learner whose scoped snapshot
 * holds no AI Employee, `/` for everyone else. `access` is the snapshot route's (D-110).
 */
export function landingPath(db: Db, actor: Actor, access?: ViewerAccess): LandingPath {
  if (actor.kind !== 'learner') return '/';
  return visibleModules(scopeSnapshot(db, actor, access)).length > 0 ? '/' : SKILL_LIBRARY_PATH;
}

/** A landing a client was handed, checked: one of `LANDING_PATHS`, or `/`. Never an open redirect. */
export const safeLanding = (value: unknown): LandingPath =>
  (LANDING_PATHS as readonly unknown[]).includes(value) ? (value as LandingPath) : '/';

/**
 * Where to go after signing in, when a page asked (D-151): a skill's guided setup in learn,
 * `/skill-library/<page>`, for a page that has one. Anything else is null, and the sign-in lands where
 * `landingPath` says. Checked on the server (the emailed link, Google) and in the browser alike.
 */
export function safeNext(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith(SKILL_GUIDE_PREFIX)) return null;
  const page = value.slice(SKILL_GUIDE_PREFIX.length);
  return isGuidedPage(page) ? `${SKILL_GUIDE_PREFIX}${page}` : null;
}
