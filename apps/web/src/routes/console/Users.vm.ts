// /admin/users and /admin/users/:userId (D-158, spec § 7.4): the words, filters, rows and tabs of the
// user list and one user. Pure; Users.tsx and User.tsx only render it.
//
// Identity is existence only (whether the address is verified, whether there is a password, whether
// Google is linked). "Last active" is `users.last`, which is daily (D-145), so it is a day, never a
// time. There is no email change (D12). The password reset is the existing "Forgot password?" email;
// a staff member's is the Owner's alone, so the button shows only to a viewer who may send it.

import { LEARNER_ROLES, STAFF_ROLES, consoleCan, isUserKind } from '@ai/core';
import type { ConsoleUserDetail, ConsoleUserRow, UserFilters } from '@ai/core';
import type { ConsoleFailure } from '../../data/console';
import { RECORD_COPY, dayOf, entitlementPairs, memberStatusBadge, orderRowVM, whenOf } from './records.vm';
import type { Badge, Option, Pair } from './records.vm';

export const USERS_COPY = {
  title: 'Users',
  description: 'Find a person by name, email, or workspace.',
  search: 'Search Name, Email, or Workspace',
  caption: 'Users',
  empty: 'No users yet.',
  export: 'Export CSV',
  exporting: 'Exporting…',
  exported: 'Export downloaded. The export is in the audit log.',
  columns: { name: 'Name', email: 'Email', workspace: 'Workspace', role: 'Role', status: 'Status', last: 'Last Active' },
  open: (name: string) => `Open ${name}`,
} as const;

export function usersExportFailure(kind: ConsoleFailure, message: string): string {
  if (kind === 'too_large') return message;
  if (kind === 'rate_limited') return 'Too many requests. Wait a minute, then try again.';
  if (kind === 'forbidden') return 'Your role can’t export users.';
  return 'The export failed. Nothing was changed.';
}

// --- the list ------------------------------------------------------------------------------------

export interface UserFilterState {
  q: string;
  role: string;
  kind: string;
}

export const DEFAULT_USER_FILTERS: UserFilterState = { q: '', role: '', kind: '' };

export const isDefaultUserFilters = (f: UserFilterState): boolean => f.q.trim() === '' && f.role === '' && f.kind === '';

export const ROLE_OPTIONS: Option[] = [{ value: '', label: 'Any Role' }, ...[...LEARNER_ROLES, ...STAFF_ROLES].map((r) => ({ value: r, label: r }))];

export const KIND_OPTIONS: Option[] = [
  { value: '', label: 'Learners and Staff' },
  { value: 'learner', label: 'Learners' },
  { value: 'staff', label: 'Staff' },
];

export function userFiltersFor(f: UserFilterState): UserFilters {
  const out: UserFilters = {};
  const q = f.q.trim().slice(0, 100);
  if (q) out.q = q;
  if ((ROLE_OPTIONS as Option[]).some((o) => o.value !== '' && o.value === f.role)) out.role = f.role;
  if (isUserKind(f.kind)) out.kind = f.kind;
  return out;
}

export interface UserRowVM {
  key: string;
  name: string;
  email: string;
  workspace: string;
  role: string;
  status: Badge;
  last: string;
}

const STAFF_BADGE: Badge = { label: 'Staff', tone: 'accent', icon: 'info' };

export const userRowVM = (u: ConsoleUserRow): UserRowVM => ({
  key: u.id,
  name: u.name,
  email: u.email,
  workspace: u.workspace ?? RECORD_COPY.none,
  role: u.role ?? RECORD_COPY.none,
  status: u.kind === 'staff' ? STAFF_BADGE : memberStatusBadge(u.status),
  last: dayOf(u.lastActive),
});

// --- one user ------------------------------------------------------------------------------------

export const USER_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'orders', label: 'Orders' },
  { id: 'progress', label: 'Progress' },
  { id: 'notes', label: 'Notes' },
] as const;
export type UserTab = (typeof USER_TABS)[number]['id'];

export const userTabOf = (raw: string | null): UserTab => (USER_TABS.find((t) => t.id === raw)?.id ?? 'profile');

export const USER_COPY = {
  tabsLabel: 'User sections',
  identity: 'Identity',
  access: 'Workspace and Entitlements',
  ordersCaption: 'Orders',
  noOrders: 'No orders for this user.',
  progressCaption: 'Progress',
  noProgress: 'No progress yet.',
  progressColumns: { name: 'AI Employee', steps: 'Steps Done', built: 'Built', deployed: 'Deployed' },
  notesInternal: 'Internal. Never shown to the user.',
  openWorkspace: (name: string) => `Open ${name}`,
  reset: 'Send Password Reset',
  resetTitle: (name: string) => `Send a password reset to ${name}?`,
  resetBody: (email: string) => `Emails a reset link to ${email}. Their current password keeps working until they use it.`,
  setBody: (email: string) => `They don’t have a password yet, so this emails a link to ${email} to set one.`,
  resetCta: 'Send Reset Email',
  sending: 'Sending…',
  audited: 'This action is audit-logged.',
  cancel: 'Cancel',
  sentReset: 'Reset email sent.',
  sentSet: 'Set-password email sent.',
} as const;

export function resetFailure(kind: ConsoleFailure, message: string): string {
  if (kind === 'rate_limited') return 'Too many requests. Wait a minute, then try again.';
  if (kind === 'forbidden') return message || 'Your role can’t send this reset.';
  return 'The email wasn’t sent. Nothing was changed.';
}

/** Whether this viewer may send this user a reset: the capability, and the Owner for a staff member. */
export const canReset = (viewerRole: string | null, target: Pick<ConsoleUserDetail['user'], 'kind'>): boolean =>
  consoleCan(viewerRole, 'user.password_reset') && (target.kind !== 'staff' || viewerRole === 'Owner');

/** How someone can sign in. The emailed link always works (D-132 keeps it). */
export function signInMethods(i: ConsoleUserDetail['identity']): string {
  return ['Email Link', ...(i.hasPassword ? ['Password'] : []), ...(i.hasGoogle ? ['Google'] : [])].join(', ');
}

export interface UserVM {
  title: string;
  id: string;
  email: string;
  status: Badge;
  identity: Pair[];
  access: Pair[];
  /** The workspace to link to, or null for Individual and staff. */
  workspace: { teamId: string; name: string } | null;
  orders: ReturnType<typeof orderRowVM>[];
  progress: { key: string; name: string; steps: string; built: string; deployed: string }[];
}

export function userVM(d: ConsoleUserDetail): UserVM {
  const u = d.user;
  const staff = u.kind === 'staff';
  return {
    title: u.name,
    id: u.id,
    email: u.email,
    status: staff ? STAFF_BADGE : memberStatusBadge(u.status),
    identity: [
      { label: 'Email', value: u.email, mono: true },
      { label: 'Email Verified', value: d.identity.emailVerifiedAt === null ? RECORD_COPY.no : `Yes, ${dayOf(d.identity.emailVerifiedAt)}` },
      { label: 'Sign-In Methods', value: signInMethods(d.identity) },
      { label: 'Last Active', value: dayOf(u.lastActive) },
      { label: 'Joined', value: u.joined === null ? RECORD_COPY.none : dayOf(u.joined) },
      { label: 'Staff Role', value: u.staffRole ?? RECORD_COPY.none },
    ],
    access: staff
      ? [{ label: 'Workspace', value: RECORD_COPY.none }]
      : [{ label: 'Workspace', value: u.workspace ?? RECORD_COPY.none }, { label: 'Role', value: u.role ?? RECORD_COPY.none }, ...entitlementPairs(d.entitlements)],
    workspace: !staff && u.teamId && u.workspace ? { teamId: u.teamId, name: u.workspace } : null,
    orders: d.orders.map(orderRowVM),
    progress: d.progress.map((p) => ({ key: p.moduleId, name: p.moduleName, steps: String(p.steps), built: p.builtAt === null ? RECORD_COPY.no : whenOf(p.builtAt), deployed: p.deployedAt === null ? RECORD_COPY.no : whenOf(p.deployedAt) })),
  };
}
