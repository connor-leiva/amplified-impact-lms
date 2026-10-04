// Program-wide constants, ported from design-reference/lms-data.js (lines 2-4 and 101-117).
// `DEMO_NOW` and the `PHASES` instants are module-level `Date.parse` calls of literal strings:
// compile-time constants, not clock reads, so the purity rule still holds.
import type { Phase, PermKey, StaffRole } from './types';

const TZ = 'America/Chicago';
/** The reference's local date helper: a bare `YYYY-MM-DDTHH:MM` is read as Central Time. */
const T = (s: string): number => Date.parse(s.length <= 16 ? s + ':00-06:00' : s);

export const DB_KEY = 'amplified-impact-lms-db';
export const DB_V = 3;
export const DEMO_NOW = Date.parse('2026-12-07T10:42:00-06:00');
export const PROGRAM_TZ = TZ;
export const STEPS = 6;

export const CATEGORIES: readonly string[] = ['MLS & Fair Housing Compliance', 'Lead Generation Scripts', 'Sisu & CRM Webhook Guides', 'TC Automation Workflows'];
export const EXEC_CATEGORIES: readonly string[] = ['Organizational SOPs', 'Leadership Meeting Frameworks', 'Finance Tracker Integrations'];
// Sentence case for 'Prompt pack' and 'PDF guide' is what the reference has; the reference wins.
export const TYPES: readonly string[] = ['Claude Project', 'Workflow JSON', 'Prompt pack', 'PDF guide', 'Notion template'];
export const STAFF_ROLES: readonly StaffRole[] = ['Owner', 'Admin', 'Instructor', 'Content Editor', 'Support'];
export const PERMS: readonly [PermKey, string][] = [
  ['curriculum', 'Edit curriculum'], ['publish', 'Publish modules'], ['cohorts', 'Manage cohorts & sessions'], ['viewLearners', 'View learners'],
  ['seats', 'Manage learners & seats'], ['announce', 'Send announcements'], ['billing', 'Manage pricing & upgrades'], ['staff', 'Manage staff'],
];
export const PHASES: readonly { id: Phase; label: string; now: number }[] = [
  { id: 'week0', label: 'Week 0', now: T('2026-11-27T10:42') },
  { id: 'live', label: 'Week 2', now: T('2026-12-07T10:42') },
  { id: 'post', label: 'After Cohort', now: T('2027-01-12T10:42') },
];
export const phaseNow = (id: string): number => (PHASES.find((p) => p.id === id) || PHASES[1]!).now;
