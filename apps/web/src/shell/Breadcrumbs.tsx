import { Fragment } from 'react';

import s from './Breadcrumbs.module.css';

// Ported from the `crumbs` block of `renderVals()` and the `nav[aria-label="Breadcrumb"]` template
// in design-reference/Amplified Impact LMS.dc.html. Contract: SCREENS § 2.2.
//
// `nav[aria-label="Breadcrumb"]` inside the `header` is a required landmark (CLAUDE.md): it is how
// the compliance harness finds the header region at all.
//
// The prototype keys its table off its single `route.s` screen name; this keys off the pathname,
// which is the same table (SCREENS § 2.2) read through React Router. Every crumb is a button, as
// in the reference — the last one has nowhere to go and does nothing.

export interface Crumb {
  label: string;
  /** Earlier crumbs navigate. The last crumb has no destination. */
  to?: string;
}

/** The portal routes that are a single crumb. */
const PORTAL: Record<string, string> = {
  '/': 'Dashboard',
  '/sessions': 'Sessions',
  '/team': 'Team Hub',
  '/vault': 'Resource Vault',
  '/team-tier': 'Team Tier',
};

/** The admin routes. Every one of them gets `Admin` in front (the reference's `unshift`). */
const ADMIN: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/curriculum': 'Curriculum',
  '/admin/cohorts': 'Cohorts & Sessions',
  '/admin/learners': 'Learners & Teams',
  '/admin/vault': 'Resource Vault',
  '/admin/announcements': 'Announcements',
  '/admin/tiers': 'Tiers & Upgrades',
  '/admin/staff': 'Staff & Roles',
  // The Admin Console (D-157).
  '/admin/audit': 'Audit Log',
  '/admin/roles': 'Roles & Permissions',
};

/** The crumb on the Console 404 (D-157): an `/admin/…` address that is no screen. */
export const ADMIN_NOT_FOUND = 'Page Not Found';

/** Trailing slashes are not a different screen. */
const norm = (pathname: string): string => {
  const p = pathname.replace(/\/+$/, '');
  return p === '' ? '/' : p;
};

/**
 * The route → crumbs table of SCREENS § 2.2.
 *
 * `employeeName` is the AI Employee the shell resolved for `/employees/:id` and for the Module
 * Builder, where an unsaved AI Employee is `New AI Employee` — the reference's `m ? m.name : …`.
 */
export function crumbsFor(pathname: string, employeeName = ''): Crumb[] {
  const p = norm(pathname);

  if (p.startsWith('/employees/')) {
    return [{ label: 'AI Employees', to: '/' }, { label: employeeName }];
  }
  if (p.startsWith('/admin/curriculum/')) {
    return [
      { label: 'Admin', to: '/admin' },
      { label: 'Curriculum', to: '/admin/curriculum' },
      { label: employeeName || 'New AI Employee' },
    ];
  }
  const admin = ADMIN[p];
  if (admin) return [{ label: 'Admin', to: '/admin' }, { label: admin }];
  // Any other `/admin/…` address renders the Console 404 inside the shell (D-157).
  if (p.startsWith('/admin/')) return [{ label: 'Admin', to: '/admin' }, { label: ADMIN_NOT_FOUND }];

  // Any other unknown path cannot render: the router redirects it to `/` (phase 04 § 4.1).
  return [{ label: PORTAL[p] ?? 'Dashboard' }];
}

export interface BreadcrumbsProps {
  pathname: string;
  /** The AI Employee name for `/employees/:id` and `/admin/curriculum/:id`. */
  employeeName?: string;
  /** The shell's navigate: it also scrolls `main` to the top and closes the drawer. */
  onNavigate: (to: string) => void;
}

export function Breadcrumbs({ pathname, employeeName = '', onNavigate }: BreadcrumbsProps) {
  const crumbs = crumbsFor(pathname, employeeName);

  return (
    <nav aria-label="Breadcrumb" className={s.root}>
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        const to = c.to;
        return (
          <Fragment key={`${i}:${c.label}`}>
            {i > 0 ? (
              <span aria-hidden="true" className={s.sep}>
                /
              </span>
            ) : null}
            <button
              type="button"
              className={s.crumb}
              data-last={last ? 'true' : undefined}
              onClick={to ? () => onNavigate(to) : undefined}
            >
              {c.label}
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
