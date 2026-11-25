// D-253 (R-5 Phase 1, ADMIN-RESTRUCTURE-SPEC.md § 3): yesterday's admin addresses and where each one lands now, so a
// bookmark, an audit entry, an email link or an API search result (whose `href`s the server still writes the old way)
// still lands. PURE: the router's redirects and the palette's links both read it.
//
// Every old address redirects; none is kept (a redirect here costs one route). The learner view keeps its address
// (`/admin/masquerade/learner-view`, spec § 3), and so does every Operations and Access page, which did not move.

/** An old address's new one, or null when the address did not move. The query string and hash are the caller's. */
export function movedAdminPath(pathname: string, cohortId: string): string | null {
  const p = pathname.replace(/\/+$/, '');
  const s = p.split('/').filter(Boolean);
  if (s[0] !== 'admin') return null;
  const [, a, b, c] = s;
  const cohort = `/admin/cohort/${encodeURIComponent(cohortId)}`;
  switch (a) {
    // Build: Curriculum and its pages, the Module Builder, the Resource Vault, and the Build hub (D-169).
    case 'curriculum':
      if (b === undefined) return '/admin/program';
      if (c !== undefined) return null;
      if (b === 'course') return '/admin/program/course';
      // `new` is the blank draft; anything else edits that AI Employee or week (D-174's one route for both).
      return `/admin/program/weeks/${b}`;
    case 'vault':
      return b === undefined ? '/admin/program/vault' : null;
    case 'build':
      return b === undefined ? '/admin/program' : null;
    // Cohorts & Sessions, Learners & Teams, Community and a thread (D-238), Announcements: the cohort's tabs.
    case 'cohorts':
      return b === undefined ? `${cohort}/schedule` : null;
    case 'learners':
      return b === undefined ? `${cohort}/people` : null;
    case 'community':
      if (b === undefined) return `${cohort}/community`;
      return c === undefined ? `${cohort}/community/${b}` : null;
    case 'announcements':
      return b === undefined ? `${cohort}/announcements` : null;
    // Support: Users (Everyone), Workspaces (Teams), Masquerade. The learner view keeps its address.
    case 'users':
      if (b === undefined) return '/admin/people';
      return c === undefined ? `/admin/people/${b}` : null;
    case 'workspaces':
      if (b === undefined) return '/admin/people/teams';
      return c === undefined ? `/admin/people/teams/${b}` : null;
    case 'masquerade':
      return b === undefined ? '/admin/people/masquerade' : null;
    // Revenue: Billing's Summary is Revenue's (until Phase 8), its lists Payments (D-163's tab addresses kept as tabs);
    // Tiers & Upgrades is Plans & upgrades; Usage.
    case 'billing':
      if (b === undefined) return '/admin/revenue';
      return c === undefined ? `/admin/revenue/payments/${b}` : null;
    case 'tiers':
      return b === undefined ? '/admin/revenue/plans' : null;
    case 'usage':
      return b === undefined ? '/admin/revenue/usage' : null;
    default:
      return null;
  }
}

/** A person's page (People › Everyone): `@ai/core`'s `userPath` is the API's, which still writes the old address. */
export const personPath = (userId: string): string => `/admin/people/${encodeURIComponent(userId)}`;
/** A team's page (People › Teams): `@ai/core`'s `workspacePath` is the API's, as `userPath` is. */
export const teamPath = (teamId: string): string => `/admin/people/teams/${encodeURIComponent(teamId)}`;
/** A week's page (Program › Curriculum; today's Module Builder). `new` is the blank draft. */
export const weekPath = (moduleId: string): string => `/admin/program/weeks/${encodeURIComponent(moduleId)}`;

/** A link the server wrote (an API search result's `href`), at its new address when it moved. */
export function currentAdminHref(href: string, cohortId: string): string {
  const i = href.search(/[?#]/);
  const path = i < 0 ? href : href.slice(0, i);
  const moved = movedAdminPath(path, cohortId);
  return moved ? moved + (i < 0 ? '' : href.slice(i)) : href;
}
