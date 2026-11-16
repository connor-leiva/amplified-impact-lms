// The Admin redesign R2 parity fixture (D-160, BUILD-SPEC § 6.1): the mockup's own data, so the app
// can be captured and compared with design-reference/admin-redesign-r2/ref/ pixel for pixel.
//
// FIXTURE ONLY. `admin-shell.ts` loads this file with a dynamic import behind
// `import.meta.env.VITE_DATA_SOURCE === 'fixture'`, which Vite replaces with a constant, so the http
// build never contains it (`admin-shell-build.test.ts` builds both ways and checks). Even in the
// fixture build it is used only when the address asks for it: `?parity=r2`, with `?as=admin`.
//
// Every value below is copied from AdminRedesign.jsx (its constants keep their names), and every
// person, workspace and ID in it is fictional, as the mockup's are. "Today" is the mockup's: Thu,
// Dec 10, 2026, about 9:30 AM MST, which the harness freezes with Playwright's clock API; the cohort
// is started (the mockup's "Cohort: Week 2"). R2-1b uses the shell's slice: the viewer, the cohort
// switcher's tile, the environment and the badge counts. Each later R2 PR adds the constants its
// screens read (`WS`, `USERS`, `PERMS0`, `AUDIT0`, `EMAILS`, `INV`, `JOBS`, …) beside these.

/** The parity fixture's switch, read in fixture builds only. */
export const PARITY_PARAM = 'parity';
export const PARITY_VALUE = 'r2';

/** `STAFF`. The viewer is the Owner, Connor Leiva. */
export const STAFF = [
  { n: 'Connor Leiva', role: 'Owner', e: 'connor@amplifiedimpact.io', last: 'Dec 10, 9:22 AM' },
  { n: 'Avery Stone', role: 'Admin', e: 'avery@amplifiedimpact.example', last: 'Dec 9, 5:48 PM' },
  { n: 'Imani Brooks', role: 'Support', e: 'imani@amplifiedimpact.example', last: 'Dec 9, 9:30 PM' },
] as const;

/** `ROLES`. */
export const ROLES = ['Owner', 'Admin', 'Support'] as const;

/** `MODS0`'s statuses, in its order (m1 … m15): Curriculum's "6 draft" counts its drafts. */
export const MODS0_STATUS = [
  'Published',
  'Published',
  'Published',
  'Published',
  'Published',
  'Scheduled',
  'Scheduled',
  'Scheduled',
  'Scheduled',
  'Draft',
  'Draft',
  'Draft',
  'Draft',
  'Draft',
  'Draft',
] as const;

/** `INCIDENTS`' ids and statuses: Incidents' "1" counts the open ones. */
export const INCIDENTS = [
  { id: 'INC-0007', st: 'Open' },
  { id: 'INC-0006', st: 'Acknowledged' },
  { id: 'INC-0005', st: 'Resolved' },
] as const;

/** Tiers' upgrade requests (`req` in its `Tiers` screen): "2" counts the pending ones. */
export const UPGRADE_REQUESTS = [
  ['Kenji Watanabe', 'Agent → Team · 16 seats', '$4,000', 'Dec 9, 3:02 PM', 'Pending'],
  ['Jordan Hale', 'Team · 16 seats → 41 seats', '$4,000', 'Dec 9, 6:12 PM', 'Pending'],
  ['Rosa Delgado', 'Agent → Team · 16 seats', '$4,000', 'Dec 4, 1:30 PM', 'Approved'],
] as const;

/** The parity fixture, as the shell reads it. */
export interface ParityR2 {
  viewer: { name: string; role: string };
  /** The cohort switcher: program and cohort. */
  program: string;
  cohort: string;
  environment: string;
  /** "Cohort: Week 2" (Week 2 of 6), not "before start". */
  started: boolean;
  counts: { drafts: number; requests: number; incidents: number };
  /** Show the mockup's whole `NAV`, built or not. */
  fullNav: true;
}

export const PARITY_R2: ParityR2 = {
  viewer: { name: STAFF[0].n, role: STAFF[0].role },
  program: 'Amplified AI Accelerator',
  cohort: 'December 2026 Cohort',
  environment: 'Production',
  started: true,
  counts: {
    drafts: MODS0_STATUS.filter((s) => s === 'Draft').length,
    requests: UPGRADE_REQUESTS.filter((r) => r[4] === 'Pending').length,
    incidents: INCIDENTS.filter((i) => i.st === 'Open').length,
  },
  fullNav: true,
};

/** The fixture when the address asks for it, or null. */
export function readParityR2(search: string = typeof location === 'undefined' ? '' : location.search): ParityR2 | null {
  return new URLSearchParams(search).get(PARITY_PARAM) === PARITY_VALUE ? PARITY_R2 : null;
}
