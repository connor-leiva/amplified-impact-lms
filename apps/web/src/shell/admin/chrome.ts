import { createContext, useContext, useEffect } from 'react';
import type { NavCounts } from './adminNav';
import type { CohortChoice } from './cohorts';

// What the R2 admin shell offers the page inside it (D-160 R2-1c): the ⌘K palette, the breadcrumb's
// record name (a Workspace's or a User's page names itself, as the mockup's `PARENT` crumb does) and
// the R2 toast. D-253: the staff role the sidebar is filtered by (the four pages draw the tabs it may
// open), the counts behind the sidebar's roll-ups (the tabs' counts are the same ones), and the cohort
// the admin is on with the pickers' list.

export interface AdminCohort {
  /** The cohort the admin is on: the address's, else the one looked at last, else the default. Null with no cohort. */
  id: string | null;
  /** "December 2026 Cohort". */
  label: string;
  choices: CohortChoice[];
  /** Picking one (the mockup's `CtxSwitch`): the same tab of it on a cohort's page, its page elsewhere. */
  pick: (id: string) => void;
  /** D-255: "New cohort…" after the cohorts, for a role with the `cohorts` permission; null otherwise. */
  create: (() => void) | null;
}

export interface AdminChrome {
  openPalette: () => void;
  setRecord: (name: string | null) => void;
  toast: (message: string) => void;
  role: string | null;
  counts: NavCounts;
  cohort: AdminCohort;
}

const Ctx = createContext<AdminChrome>({
  openPalette: () => {},
  setRecord: () => {},
  toast: () => {},
  role: null,
  counts: { drafts: 0, requests: 0, incidents: 0, waiting: 0 },
  cohort: { id: null, label: '', choices: [], pick: () => {}, create: null },
});

export const AdminChromeProvider = Ctx.Provider;
export const useAdminChrome = (): AdminChrome => useContext(Ctx);

/** A record's page puts its name in the breadcrumb while it is open. */
export function useRecordCrumb(name: string | null): void {
  const { setRecord } = useAdminChrome();
  useEffect(() => {
    setRecord(name);
    return () => setRecord(null);
  }, [name, setRecord]);
}
