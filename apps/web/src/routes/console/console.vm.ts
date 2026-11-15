// What every Console screen shares (D-157): which capability opens each screen, and the words of the
// shared states (spec § 7): loading, empty, error (with "Too many requests" on a 429), Denied and the
// Console 404. Pure; the components only render these.
//
// "Go to Overview": spec § 7 names the Denied state's way out "Go to Health", but `/admin/health` is
// Console PR 10. Until it exists the action goes to the existing `/admin` Overview and says so, as the
// mockup's own Denied and 404 do; PR 10 points it at Health.

import type { ConsoleCap } from '@ai/core';
import type { ConsoleFailure } from '../../data/console';

export type ConsoleScreen = 'audit' | 'roles';

export const CONSOLE_SCREENS: Record<ConsoleScreen, { title: string; cap: ConsoleCap; path: string }> = {
  audit: { title: 'Audit Log', cap: 'audit.read', path: '/admin/audit' },
  roles: { title: 'Roles & Permissions', cap: 'ops.read', path: '/admin/roles' },
};

/** The way out of Denied and the 404. */
export const CONSOLE_HOME = { label: 'Go to Overview', to: '/admin' } as const;

export interface FullStateCopy {
  eyebrow: string;
  title: string;
  body: string;
  action: { label: string; to: string };
}

/** Denied: the viewer's role lacks the screen's capability. */
export function deniedCopy(screen: ConsoleScreen, role: string | null): FullStateCopy {
  return {
    eyebrow: 'Permission Needed',
    title: `Your role can’t open ${CONSOLE_SCREENS[screen].title}.`,
    body: role ? `You’re signed in as ${role}. Staff roles are set in Staff & Roles.` : 'Staff roles are set in Staff & Roles.',
    action: { ...CONSOLE_HOME },
  };
}

/** The Console 404: an `/admin/…` address that is no screen. */
export const NOT_FOUND_COPY: FullStateCopy = {
  eyebrow: '404',
  title: 'That Console page doesn’t exist.',
  body: 'The link may be old, or the record was deleted.',
  action: { ...CONSOLE_HOME },
};

export interface ErrorCopy {
  badge: string;
  title: string;
  body: string;
  retry: string;
}

/** A list that didn't load. A 429 says so, in the words spec § 7 gives it. */
export function errorCopy(kind: ConsoleFailure): ErrorCopy {
  if (kind === 'rate_limited') return { badge: 'Too Many Requests', title: 'Too many requests.', body: 'Wait a minute, then try again.', retry: 'Retry' };
  return { badge: 'Error', title: 'This didn’t load.', body: 'The request failed. Nothing was changed.', retry: 'Retry' };
}

export const LOADING_LABEL = 'Loading';
