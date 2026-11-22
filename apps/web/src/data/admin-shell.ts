// What the admin AppShell shows besides the page (D-160 R2-1b, BUILD-SPEC § 4): who is signed in, the
// cohort switcher's tile, the environment, and the counts behind the sidebar's badges.
//
// From the snapshot in every build. The R2 parity fixture (`parity-r2.ts`, the mockup's own data)
// replaces it only in the fixture build and only for `?parity=r2`: it is loaded with a dynamic import
// behind `import.meta.env.VITE_DATA_SOURCE === 'fixture'`, which Vite makes a constant, so the http
// build has none of it (`admin-shell-build.test.ts`).

import type { Db } from '@ai/core';
import type { ProgramKey } from '../home/program-logo';
import type { ParityR2 } from './parity-r2';

/** The program the admin runs. One today. */
export const PROGRAM = 'Amplified AI Accelerator';
/** D-239: its key, for the switcher's tile: the program's own logo (`programLogo(key, { variant: 'tile' })`). */
export const PROGRAM_KEY: ProgramKey = 'accelerator';
/** The environment dot's label (BUILD-SPEC § 4). There is one environment, production. */
export const ENVIRONMENT = 'Production';
/** The cohort the admin shows when nothing else picks one (the shell's `DEFAULT_COHORT`). */
export const ADMIN_COHORT = 'dec26';

export interface AdminShellData {
  viewer: { name: string; role: string };
  program: string;
  /** D-239: the program's key, for its tile in the cohort switcher. */
  programKey: ProgramKey;
  cohort: string;
  environment: string;
  /** `waiting` (D-239): Community threads whose last word is a member's; 0 until the admin Community (R-3). */
  counts: { drafts: number; requests: number; incidents: number; waiting: number };
  /** The mockup's whole `NAV`: the parity fixture only. */
  fullNav: boolean;
}

/** Two initials, as the mockup's `ini`: "Amplified AI Accelerator" → "AA". */
export const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2);

/**
 * From the snapshot. `role` is the staff role the shell filters by (the fixture build may preview
 * another). `openIncidents` is the API's count of open incidents (D-167, `useOpenIncidents`); the badge
 * hides at zero.
 */
export function shellDataFrom(db: Db, staffId: string | null, role: string | null, openIncidents = 0): AdminShellData {
  const me = db.staff.find((x) => x.id === staffId) ?? null;
  const cohort = db.cohorts.find((c) => c.id === ADMIN_COHORT) ?? db.cohorts[0];
  return {
    viewer: { name: me?.name ?? '', role: role ?? me?.role ?? '' },
    program: PROGRAM,
    programKey: PROGRAM_KEY,
    cohort: cohort ? `${cohort.name} Cohort` : '',
    environment: ENVIRONMENT,
    counts: {
      drafts: db.modules.filter((m) => m.status === 'draft').length,
      requests: db.requests.filter((q) => q.status === 'new').length,
      incidents: openIncidents,
      waiting: 0,
    },
    fullNav: false,
  };
}

export function shellDataFromParity(p: ParityR2): AdminShellData {
  return {
    viewer: { ...p.viewer },
    program: p.program,
    programKey: PROGRAM_KEY,
    cohort: p.cohort,
    environment: p.environment,
    counts: { ...p.counts, waiting: 0 },
    fullNav: true,
  };
}

let parity: Promise<ParityR2 | null> | null = null;

/** The R2 parity fixture, when this is the fixture build and the address asks for it; else null. */
export function parityR2(): Promise<ParityR2 | null> {
  parity ??=
    import.meta.env.VITE_DATA_SOURCE === 'fixture'
      ? import('./parity-r2').then((m) => m.readParityR2()).catch(() => null)
      : Promise.resolve(null);
  return parity;
}

/** Whether a parity fixture could exist in this build at all (so the shell knows to wait for it). */
export const PARITY_POSSIBLE: boolean = import.meta.env.VITE_DATA_SOURCE === 'fixture';
