// What the admin AppShell shows besides the page (D-160 R2-1b, BUILD-SPEC § 4): who is signed in, the
// cohort switcher's tile, the environment, and the counts behind the sidebar's badges.
//
// From the snapshot in every build. The R2 parity fixture (`parity-r2.ts`, the mockup's own data)
// replaces it only in the fixture build and only for `?parity=r2`: it is loaded with a dynamic import
// behind `import.meta.env.VITE_DATA_SOURCE === 'fixture'`, which Vite makes a constant, so the http
// build has none of it (`admin-shell-build.test.ts`).

import type { Db } from '@ai/core';
import type { ParityR2 } from './parity-r2';

/** The program the admin runs. One today; the switcher's tile shows its initials. */
export const PROGRAM = 'Amplified AI Accelerator';
/** The environment dot's label (BUILD-SPEC § 4). There is one environment, production. */
export const ENVIRONMENT = 'Production';
/** The cohort the admin shows when nothing else picks one (the shell's `DEFAULT_COHORT`). */
export const ADMIN_COHORT = 'dec26';

export interface AdminShellData {
  viewer: { name: string; role: string };
  program: string;
  cohort: string;
  environment: string;
  counts: { drafts: number; requests: number; incidents: number };
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
 * another). There are no incidents before Console PR 8, so their count is 0 and the badge hides.
 */
export function shellDataFrom(db: Db, staffId: string | null, role: string | null): AdminShellData {
  const me = db.staff.find((x) => x.id === staffId) ?? null;
  const cohort = db.cohorts.find((c) => c.id === ADMIN_COHORT) ?? db.cohorts[0];
  return {
    viewer: { name: me?.name ?? '', role: role ?? me?.role ?? '' },
    program: PROGRAM,
    cohort: cohort ? `${cohort.name} Cohort` : '',
    environment: ENVIRONMENT,
    counts: {
      drafts: db.modules.filter((m) => m.status === 'draft').length,
      requests: db.requests.filter((q) => q.status === 'new').length,
      incidents: 0,
    },
    fullNav: false,
  };
}

export function shellDataFromParity(p: ParityR2): AdminShellData {
  return {
    viewer: { ...p.viewer },
    program: p.program,
    cohort: p.cohort,
    environment: p.environment,
    counts: { ...p.counts },
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
