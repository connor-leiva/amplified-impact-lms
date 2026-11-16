// The Admin redesign R2's support records, as the mockup prints them (D-160 R2-1c). Pure: the
// Workspaces, Workspace, Users and User screens' view-models read the API's shapes (console-support.ts)
// and turn them into these words, so a screen never formats a time, a price or a status itself.
//
// ONE ZONE. BUILD-SPEC § 7: "One time-zone label: MST (America/Phoenix) everywhere." The R2 admin's
// stamps are the program's Arizona time with no zone suffix, as the mockup's tables print them
// ("Dec 10, 8:52 AM", "Dec 8, 2026").
//
// THE MOCKUP'S WORDS. Plan statuses are sentence case ("Past due"), as AdminRedesign.jsx writes them;
// the Console's older labels (`PLAN_STATUS_LABELS`, "Past Due") stay for the API's CSV and audit.

// R2-2 carries this file's #126-independent part only, each declaration byte for byte from R2-1c's
// aebc45b (D-160); #136 brings the rest (plans, orders, seats and MRR) with #126's console-support.

export const ADMIN_TZ = 'America/Phoenix';

const part = (t: number, o: Intl.DateTimeFormatOptions): string =>
  // Some ICU builds put a narrow no-break space before AM/PM; the mockup has a plain one.
  new Intl.DateTimeFormat('en-US', { timeZone: ADMIN_TZ, ...o }).format(new Date(t)).replace(/\u202f/g, ' ');

/** "Dec 10, 8:52 AM": a moment, in the admin's zone. */
export const adminStamp = (t: number): string =>
  `${part(t, { month: 'short', day: 'numeric' })}, ${part(t, { hour: 'numeric', minute: '2-digit' })}`;

/** "Dec 8, 2026": a day, in the admin's zone. */
export const adminDate = (t: number): string => part(t, { month: 'short', day: 'numeric', year: 'numeric' });

// ================================================================================================
// Statuses: a word and a tone (the mockup's `TONE`), never a colour alone
// ================================================================================================

export type AdminTone = 'ok' | 'info' | 'bad' | 'warn' | 'run' | 'off' | 'neutral';

export interface AdminStatus {
  label: string;
  tone: AdminTone;
}

export type SeatBar = 'ok' | 'hot' | 'full';
