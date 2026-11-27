// /admin/users and /admin/users/:userId on R2 (D-160 R2-1c; spec § 7.4, D-158's API): the words,
// filters, rows, facts, tabs and the staff password reset of the mockup's `Users` and `User`. Pure;
// Users.tsx and User.tsx only render it. Ported from #128's view-models.
//
// The list shows learners (the mockup's Users are the customers; staff are on Roles & Permissions),
// and "Last sign-in" is `users.last` (D-145: written at each real sign-in, and when a session rolls).

import {
  LEARNER_ROLES,
  adminDate,
  adminStamp,
  consoleCan,
  initialsOf,
  orderStatusOf,
  tierLabel,
  usdCents,
  userStatusOf,
} from '@ai/core';
import type { AdminStatus, ConsoleUserDetail, ConsoleUserRow, UserFilters } from '@ai/core';
import { NONE, stampOrNever, welcomeWords } from './workspaces.vm';
import type { Option } from './workspaces.vm';
import { personPath, teamPath } from '../../shell/admin/addresses';

export const USERS_COPY = {
  title: 'Users',
  description: 'Find a person by name, email, or workspace.',
  filter: 'Filter name, email, workspace',
  role: 'Role',
  columns: { name: 'User', workspace: 'Workspace', role: 'Role', status: 'Status', last: 'Last sign-in' },
  empty: 'No users yet',
  open: 'Open user',
  masquerade: 'Masquerade…',
  exportSelected: 'Export selected',
  exported: 'Export started. It is in the audit log.',
} as const;

/**
 * The role filter, in the mockup's words: "Team owner" and "Agent", the two roles a workspace's people
 * hold, as `users.role` spells them. (Operations Lead and Sales Agent are found by name.)
 */
export const ROLE_OPTIONS: readonly Option[] = [
  { value: '', label: 'Any role' },
  { value: 'Team Owner', label: 'Team owner' },
  { value: 'Agent', label: 'Agent' },
];

export interface UserFilterState {
  q: string;
  role: string;
}

export const DEFAULT_USER_FILTERS: UserFilterState = { q: '', role: '' };

export const isDefaultUserFilters = (f: UserFilterState): boolean => f.q.trim() === '' && f.role === '';

/** The list's filters as the API reads them: learners, by words and role. */
export function userFiltersFor(f: UserFilterState): UserFilters {
  const out: UserFilters = { kind: 'learner' };
  const q = f.q.trim().slice(0, 100);
  if (q) out.q = q;
  if ((LEARNER_ROLES as readonly string[]).includes(f.role)) out.role = f.role;
  return out;
}

export interface UserRowVM {
  key: string;
  name: string;
  email: string;
  initials: string;
  workspace: string;
  role: string;
  status: AdminStatus;
  last: string;
  lastAt: number;
  href: string;
}

export const userRowVM = (u: ConsoleUserRow): UserRowVM => ({
  key: u.id,
  name: u.name,
  email: u.email,
  initials: initialsOf(u.name),
  workspace: u.workspace ?? NONE,
  role: u.role ?? NONE,
  status: userStatusOf(u.status),
  last: stampOrNever(u.lastActive),
  lastAt: u.lastActive ?? 0,
  href: personPath(u.id),
});

// --- one user ------------------------------------------------------------------------------------

export const USER_TABS = ['orders', 'progress', 'emails', 'activity'] as const;
export type UserTab = (typeof USER_TABS)[number];

export const USER_COPY = {
  /** D-253: a person's way back is People (the mockup's third pass). */
  back: 'People',
  masquerade: 'Masquerade',
  masqueradeLater: 'Masquerade arrives with the Masquerade screen.',
  more: 'More actions',
  sections: 'Section',
  tabs: { orders: 'Orders', progress: 'Progress', emails: 'Emails sent', activity: 'Activity' } as Record<
    UserTab,
    string
  >,
  facts: { id: 'User ID', email: 'Email', workspace: 'Workspace', role: 'Role', tier: 'Tier', last: 'Last sign-in', welcome: 'Welcome', comp: 'Comped' },
  orders: {
    label: 'Orders',
    invoice: 'Invoice',
    amount: 'Amount',
    status: 'Status',
    date: 'Date',
    empty: 'No orders for this user',
  },
  skills: {
    label: 'Skill Purchases',
    skill: 'Skill',
    amount: 'Amount',
    date: 'Date',
    session: 'Session',
    refunded: 'Refunded',
    open: 'No',
  },
  progress: { empty: 'No builds started yet', deployed: 'Deployed', building: 'In progress', none: 'Not started' },
  noActivity: 'No activity yet',
  identity: {
    title: 'Identity',
    verified: 'Email verified',
    signIn: 'Sign-in',
    staff: 'Staff role',
    groups: 'Access groups',
    yes: (d: string) => `Yes, ${d}`,
    no: 'No',
  },
  notes: { title: 'Notes', sub: 'Internal. Never shown to the user.', none: 'No notes yet.' },
  reset: {
    item: 'Send password reset…',
    title: (name: string) => `Send a password reset to ${name}?`,
    body: (email: string) => `Emails a reset link to ${email}. Their current password keeps working until they use it.`,
    cta: 'Send reset email',
    sent: 'Reset email sent',
    setSent: 'Set-password email sent',
    failed: 'The reset email didn’t go out. Nothing was changed.',
  },
  changeEmail: 'Change email…',
} as const;

/** How they sign in: "Password, Google", or the email link alone. */
export function signInOf(i: ConsoleUserDetail['identity']): string {
  const ways = [i.hasPassword ? 'Password' : null, i.hasGoogle ? 'Google' : null].filter(Boolean);
  return ways.length ? ways.join(', ') : 'Email link';
}

/**
 * Whether the viewer may send this user a password reset (spec § 7.4): `user.password_reset`, and a
 * staff member's only by the Owner.
 */
/** Fixture screenshots only. Production never reads this. */
export const REVIEW_SKILL_ROWS = [
  { key: 'skp_review', skill: 'Team P&L Review', amount: '$37.00', date: 'Nov 23, 2026', session: 'cs_review_skill', refunded: 'No' },
];

export const canReset = (role: string | null, target: ConsoleUserDetail['user']): boolean =>
  consoleCan(role, 'user.password_reset') && (target.kind !== 'staff' || role === 'Owner');

export interface UserVM {
  title: string;
  comped: boolean;
  status: AdminStatus;
  facts: {
    id: string;
    email: string;
    workspace: string;
    workspaceHref: string | null;
    role: string;
    tier: string;
    last: string;
    welcome: string | null;
  };
  orders: {
    key: string;
    id: string;
    amount: string;
    cents: number;
    status: AdminStatus;
    comped: boolean;
    date: string;
    at: number;
    href: string | null;
  }[];
  skillPurchases: {
    key: string;
    skill: string;
    amount: string;
    date: string;
    session: string;
    refunded: string;
  }[];
  progress: { key: string; name: string; status: AdminStatus }[];
  activity: { key: string; text: string; when: string }[];
  identity: { verified: string; signIn: string; staff: string; groups: string[] };
}

export function userVM(d: ConsoleUserDetail): UserVM {
  const u = d.user;
  const activity: { at: number; text: string }[] = [];
  if (u.lastActive !== null) activity.push({ at: u.lastActive, text: 'Signed in' });
  for (const p of d.progress) {
    if (p.deployedAt !== null) activity.push({ at: p.deployedAt, text: `Deployed ${p.moduleName}` });
    else if (p.builtAt !== null) activity.push({ at: p.builtAt, text: `Started ${p.moduleName}` });
  }
  for (const o of d.orders) {
    if (o.origin === 'comp') {
      activity.push({ at: o.paidAt ?? o.createdAt, text: `${o.planLabel} comped` });
      continue;
    }
    activity.push({ at: o.createdAt, text: `${o.planLabel} order started` });
    if (o.paidAt !== null) activity.push({ at: o.paidAt, text: `${o.planLabel} order paid` });
  }
  if (u.joined !== null) activity.push({ at: u.joined, text: 'Account created' });
  return {
    title: u.name,
    comped: d.orders.some((o) => o.origin === 'comp'),
    status: userStatusOf(u.status),
    facts: {
      id: u.id,
      email: u.email,
      workspace: u.workspace ?? NONE,
      workspaceHref: u.teamId ? teamPath(u.teamId) : null,
      role: u.staffRole ?? u.role ?? NONE,
      tier: tierLabel(u.tier),
      last: stampOrNever(u.lastActive),
      welcome: welcomeWords(d.welcome),
    },
    orders: d.orders.map((o) => ({
      key: o.id,
      id: o.id,
      amount: o.amountTotal === null ? NONE : usdCents(o.amountTotal),
      cents: o.amountTotal ?? 0,
      status: orderStatusOf(o.status),
      comped: o.origin === 'comp',
      date: adminDate(o.createdAt),
      at: o.createdAt,
      href: o.accountId && u.teamId ? teamPath(u.teamId) : null,
    })),
    skillPurchases: (d.skillPurchases ?? []).map((p) => ({
      key: p.id,
      skill: p.skill,
      amount: p.amount === null ? NONE : usdCents(p.amount),
      date: adminDate(p.purchasedAt),
      session: p.stripeSessionId,
      refunded: p.refundedAt === null ? USER_COPY.skills.open : adminDate(p.refundedAt),
    })),
    progress: d.progress.map((p) => ({
      key: p.moduleId,
      name: p.moduleName,
      status:
        p.deployedAt !== null
          ? { label: USER_COPY.progress.deployed, tone: 'ok' }
          : p.builtAt !== null
            ? { label: USER_COPY.progress.building, tone: 'info' }
            : { label: USER_COPY.progress.none, tone: 'neutral' },
    })),
    activity: activity
      .sort((a, b) => b.at - a.at)
      .map((a, i) => ({ key: `${a.at}:${i}`, text: a.text, when: adminStamp(a.at) })),
    identity: {
      verified:
        d.identity.emailVerifiedAt === null
          ? USER_COPY.identity.no
          : USER_COPY.identity.yes(adminDate(d.identity.emailVerifiedAt)),
      signIn: signInOf(d.identity),
      staff: u.staffRole ?? 'None',
      groups: d.entitlements.groups.map((g) => g.name),
    },
  };
}
