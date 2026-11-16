// What every Console screen shares (D-157): which capability opens each screen, and the words of the
// shared states (spec § 7): loading, empty, error (with "Too many requests" on a 429), Denied and the
// Console 404. Pure; the components only render these.
//
// "Go to Overview": spec § 7 names the Denied state's way out "Go to Health", but `/admin/health` is
// Console PR 10. Until it exists the action goes to the existing `/admin` Overview and says so, as the
// mockup's own Denied and 404 do; PR 10 points it at Health.

import type { ConsoleCap } from '@ai/core';
import type { ConsoleFailure } from '../../data/console';

export type ConsoleScreen = 'audit' | 'roles' | 'workspaces' | 'users' | 'search';

export const CONSOLE_SCREENS: Record<ConsoleScreen, { title: string; cap: ConsoleCap; path: string }> = {
  audit: { title: 'Audit Log', cap: 'audit.read', path: '/admin/audit' },
  roles: { title: 'Roles & Permissions', cap: 'ops.read', path: '/admin/roles' },
  // D-160 R2-1c (spec §§ 7.3–7.5).
  workspaces: { title: 'Workspaces', cap: 'workspaces.read', path: '/admin/workspaces' },
  users: { title: 'Users', cap: 'users.read', path: '/admin/users' },
  search: { title: 'Search', cap: 'console.view', path: '/admin/search' },
};

/** The way out of Denied and the 404. */
export const CONSOLE_HOME = { label: 'Go to Overview', to: '/admin' } as const;

/**
 * Denied and the Console 404 (D-160 R2-1b): the R2 mockup's `Denied` and `NotFound`, word for word.
 * They replaced D-157's copy ("Permission Needed", "Your role can’t open … .", "That Console page
 * doesn’t exist.", "… was deleted."); the mockup is Connor's signed-off design, so its strings win,
 * straight apostrophes and all.
 */
export interface FullStateCopy {
  title: string;
  body: string;
  action: { label: string; to: string };
}

/**
 * Denied: the viewer's role lacks the page's capability. `what` names the page (`Roles & Permissions`);
 * a page with no name of its own is "this page".
 */
export function deniedCopy(what: string | null, role: string | null): FullStateCopy {
  return {
    title: `Your role can't open ${what ?? 'this page'}`,
    body: role ? `You are signed in as ${role}. An Owner can change this in Roles & Permissions.` : 'An Owner can change this in Roles & Permissions.',
    action: { ...CONSOLE_HOME },
  };
}

/** The Console 404: an `/admin/…` address that is no screen. */
export const NOT_FOUND_COPY: FullStateCopy & { search: string } = {
  title: "This page doesn't exist",
  body: 'The link may be old, or the record was removed. Error 404.',
  action: { ...CONSOLE_HOME },
  search: 'Search the admin',
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
