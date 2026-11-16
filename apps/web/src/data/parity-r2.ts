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

// ---- R2-1c: the Support screens' records (Workspaces, Workspace, Users, User), verbatim --------------
// The Console fixture (`console-fixture-records.ts`) turns these into the API's shapes, in the
// mockup's own order (the API's is by name), so the screens' view-models print exactly these words.

/** `WS`. */
export const WS = [
  { id: 'ws_northshore', n: 'Northshore Group', plan: 'Team Plan · 41 seats', used: 33, cap: 41, st: 'Active', last: 'Dec 10, 8:52 AM', owner: 'Elena Vargas', mrr: '$1,495', cus: 'cus_Rk3NshoreA1', sub: 'sub_1Qn7NshoreT41' },
  { id: 'ws_halemarlowe', n: 'Hale & Marlowe Realty', plan: 'Team Plan · 16 seats', used: 15, cap: 16, st: 'Active', last: 'Dec 9, 6:10 PM', owner: 'Jordan Hale', mrr: '$695', cus: 'cus_Rm8HaleMrl02', sub: 'sub_1Qp2HaleT16' },
  { id: 'ws_redcliff', n: 'Red Cliff Collective', plan: 'Agent Plan', used: 46, cap: 50, st: 'Active', last: 'Dec 10, 12:41 AM', owner: 'Noor Haddad', mrr: '$1,450', cus: 'cus_Rj1RedClf03', sub: 'sub_1Qk9RedClfA50' },
  { id: 'ws_copperbasin', n: 'Copper Basin Realty', plan: 'AI Accelerator', used: 2, cap: 2, st: 'Active', last: 'Dec 9, 2:15 PM', owner: 'Devon Achterberg', mrr: 'One-time', cus: 'cus_Rp4CoprBsn04', sub: '—' },
  { id: 'ws_tidewater', n: 'Tidewater Property Co.', plan: 'Insiders', used: 1, cap: 1, st: 'Past due', last: 'Dec 4, 9:03 AM', owner: 'Sam Whitlock', mrr: '$97', cus: 'cus_Rg6Tidewtr05', sub: 'sub_1Qh3TidewI1' },
  { id: 'ws_lantern', n: 'Lantern Street Partners', plan: 'Team Plan · 16 seats', used: 6, cap: 16, st: 'Trialing', last: 'Dec 9, 11:27 AM', owner: 'Tessa Lindqvist', mrr: '$0', cus: 'cus_Rt2Lantern06', sub: 'sub_1Qv5LanternT16' },
  { id: 'ws_fourthmeridian', n: 'Fourth Meridian', plan: 'Team Plan · 16 seats', used: 0, cap: 16, st: 'Canceled', last: 'Nov 2, 4:40 PM', owner: 'Priya Raman', mrr: '$0', cus: 'cus_Rb9FourthM07', sub: 'sub_1Qc1FourthT16' },
] as const;

/** `USERS`. */
export const USERS = [
  { id: 'u_1042', n: 'Elena Vargas', e: 'elena@northshoregroup.example', ws: 'Northshore Group', role: 'Team owner', tier: 'Team', last: 'Dec 10, 8:52 AM', st: 'Active', pr: 4, of: 5 },
  { id: 'u_1043', n: 'Marcus Oyelaran', e: 'marcus@northshoregroup.example', ws: 'Northshore Group', role: 'Agent', tier: 'Team', last: 'Dec 9, 4:31 PM', st: 'Active', pr: 3, of: 5 },
  { id: 'u_1061', n: 'Jordan Hale', e: 'jordan@halemarlowe.example', ws: 'Hale & Marlowe Realty', role: 'Team owner', tier: 'Team', last: 'Dec 9, 6:10 PM', st: 'Active', pr: 5, of: 5 },
  { id: 'u_1077', n: 'Noor Haddad', e: 'noor@redcliffcollective.example', ws: 'Red Cliff Collective', role: 'Team owner', tier: 'Agent', last: 'Dec 10, 12:41 AM', st: 'Active', pr: 2, of: 2 },
  { id: 'u_1090', n: 'Devon Achterberg', e: 'devon@copperbasin.example', ws: 'Copper Basin Realty', role: 'Team owner', tier: 'Team', last: 'Dec 9, 2:15 PM', st: 'Active', pr: 2, of: 5 },
  { id: 'u_1104', n: 'Sam Whitlock', e: 'sam@tidewaterproperty.example', ws: 'Tidewater Property Co.', role: 'Agent', tier: 'Agent', last: 'Dec 4, 9:03 AM', st: 'Past due', pr: 1, of: 2 },
  { id: 'u_1118', n: 'Tessa Lindqvist', e: 'tessa@lanternstreet.example', ws: 'Lantern Street Partners', role: 'Team owner', tier: 'Team', last: 'Dec 9, 11:27 AM', st: 'Trialing', pr: 1, of: 5 },
  { id: 'u_1125', n: 'Priya Raman', e: 'priya@fourthmeridian.example', ws: 'Fourth Meridian', role: 'Team owner', tier: 'Team', last: 'Nov 2, 4:40 PM', st: 'Canceled', pr: 0, of: 5 },
] as const;

/** `INV`: the invoices, as the workspaces' orders. */
export const INV = [
  { id: 'in_1QxT4mNs0291', c: 'Northshore Group', amt: '$1,495.00', st: 'Paid', d: 'Dec 8, 2026', card: 'Visa ending 4242' },
  { id: 'in_1QxR9aRc0288', c: 'Red Cliff Collective', amt: '$1,450.00', st: 'Paid', d: 'Dec 6, 2026', card: 'Amex ending 1007' },
  { id: 'in_1QxQ2cCb0285', c: 'Copper Basin Realty', amt: '$3,750.00', st: 'Paid', d: 'Dec 5, 2026', card: 'Visa ending 1881' },
  { id: 'in_1QxP7tTw0283', c: 'Tidewater Property Co.', amt: '$97.00', st: 'Failed', d: 'Dec 4, 2026', card: 'Mastercard ending 5521' },
  { id: 'in_1QxN1hHm0279', c: 'Hale & Marlowe Realty', amt: '$695.00', st: 'Open', d: 'Dec 3, 2026', card: 'Visa ending 3310' },
  { id: 'in_1QxK5fFm0270', c: 'Fourth Meridian', amt: '$695.00', st: 'Refunded', d: 'Nov 1, 2026', card: 'Visa ending 9034' },
] as const;

/** The Workspace screen's staff notes (on Northshore Group), newest first. */
export const WORKSPACE_NOTES = [
  ['Imani Brooks', 'Dec 7, 3:40 PM', 'Owner asked how seats work when an agent leaves. Sent the seat reassignment guide.'],
  ['Connor Leiva', 'Nov 24, 10:05 AM', 'Onboarding call done. They want the leadership modules first.'],
] as const;

/** The User screen's note (on Elena Vargas). */
export const USER_NOTES = [['Imani Brooks', 'Dec 7, 3:40 PM', 'Prefers email over calls. Mornings MST.']] as const;

/** The User screen's identity card: "Yes, Nov 24, 2026", "Password, Google", and the access groups. */
export const IDENTITY = { verified: 'Nov 24, 2026', password: true, google: true, groups: ['library', 'agent', 'team'] } as const;

/** "Account created at checkout": the User screen's Activity, Nov 24, 9:30 AM. */
export const JOINED = 'Nov 24, 9:30 AM';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A mockup stamp ("Dec 10, 8:52 AM", or a day, "Dec 8, 2026", read as 9:00 AM) as epoch ms, in the
 * mockup's zone, MST (UTC−7 all year). The year is 2026 unless the stamp names one.
 */
export function mockStamp(s: string): number {
  const m = /^([A-Z][a-z]{2}) (\d{1,2}), (?:(\d{4})|(\d{1,2}):(\d{2}) (AM|PM))$/.exec(s);
  if (!m) throw new Error(`not a mockup stamp: ${s}`);
  const [, mon, day, year, h, min, ap] = m;
  const hour = year ? 9 : (Number(h) % 12) + (ap === 'PM' ? 12 : 0);
  return Date.UTC(year ? Number(year) : 2026, MONTHS.indexOf(mon!), Number(day), hour + 7, year ? 0 : Number(min));
}

/** A mockup amount ("$1,495.00") as cents. */
export const mockCents = (s: string): number => Math.round(Number(s.replace(/[$,]/g, '')) * 100);

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
