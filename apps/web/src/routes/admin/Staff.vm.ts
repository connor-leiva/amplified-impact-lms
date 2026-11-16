// Admin Staff & Roles view-model — ported from `renderVals()` in
// design-reference/Admin Staff.dc.html. Contract: SCREENS § 4.9, phase 06 § 6.1.
//
// Pure: `(db, now, ui) => StaffVM`. No React, no hooks, no Date.now(). Every rule it needs comes
// from @ai/core — `fmt.initials` via `<Avatar>`, `fmt.agoInline`, `PERMS` and `STAFF_ROLES` — so the
// screen above it is markup only and the matrix cannot disagree with `requirePerm` in the API.
//
// phase 06 § 6.2: this is the one admin screen with no aggregate figure on it. Staff are modelled
// one by one and permissions are a fixed 8 × 5 grid, so there is nothing for `db.base` to add to.
// Nothing here reads `db.base` and nothing branches on the data source, which is exactly what the
// rule asks for — `Staff.vm.test.ts` pins that by running the identical VM over `ZERO_BASE` (what
// the API returns in http mode) and asserting the output is byte-for-byte the same.
//
// The reference's inline colours become semantic tones the stylesheet keys off: `rmFg` is
// `removeTone`, and `bd`/`bg`/`cursor`/`op` collapse into the `on` and `fixed` booleans.

import { adminStamp, fmt, PERMS, STAFF_ROLES } from '@ai/core';
import type { Db, PermKey, StaffRole } from '@ai/core';

/**
 * The invite select offers every role but Owner. There is exactly one Owner, it is seeded, and
 * `inviteStaff` has no way to create another.
 */
export type InviteRole = Exclude<StaffRole, 'Owner'>;

/** Everything the screen's own React state contributes. The VM reads it; it never writes it. */
export interface StaffUi {
  /** The invite row's email input. */
  email: string;
  /** The invite row's role select. The reference opens on `Instructor`. */
  newRole: InviteRole;
  /** `Enter a valid email address.` or `That person is already on staff.`, from `inviteStaff`. */
  err: string;
}

export const STAFF_UI: StaffUi = { email: '', newRole: 'Instructor', err: '' };

export interface StaffRow {
  id: string;
  /** The person's name, with ` (you)` appended for the signed-in Owner. */
  name: string;
  /** The name alone, without the ` (you)` suffix — the accessible names on the row read from this. */
  plainName: string;
  email: string;
  role: StaffRole;
  /** The Owner's role select is disabled and their remove button only raises a toast. */
  isOwner: boolean;
  /** The invite has not been accepted: a dashed avatar and no activity timestamp. */
  invited: boolean;
  /** `Invite pending`, or `Active {relative}`. */
  last: string;
  /** Every row but the first carries a `--line-subtle` top border. */
  divider: boolean;
  /** The remove button is `--text-disabled` for the Owner and `--text-tertiary` for everyone else. */
  removeTone: 'disabled' | 'default';
}

export interface PermCell {
  role: StaffRole;
  /** Drawn filled with a check when on, an empty `--line-strong` box when off. */
  on: boolean;
  /** The Owner column: 60% opacity, a default cursor, and a click that does nothing. */
  fixed: boolean;
}

export interface PermRow {
  key: PermKey;
  /** The `PERMS` label, sentence case as the reference has it. */
  label: string;
  cells: PermCell[];
}

export interface StaffVM {
  rows: StaffRow[];
  /** The matrix columns, and the options on a row's role select. */
  roles: StaffRole[];
  /** The options on the invite select. */
  inviteRoles: InviteRole[];
  perms: PermRow[];
  email: string;
  newRole: InviteRole;
  err: string;
}

export function staffVM(db: Db, now: number, ui: StaffUi = STAFF_UI): StaffVM {
  // The reference marks the FIRST row `(you)`, not the viewer's own row. The seed's first staff
  // member is Casey Lin (`st1`, Owner), which is the admin persona, so the two agree — and the
  // golden fingerprint was captured from this behaviour, so the index is what gets ported.
  const rows: StaffRow[] = db.staff.map((st, i) => {
    const invited = !st.last;
    const isOwner = st.role === 'Owner';
    return {
      id: st.id,
      name: st.name + (i === 0 ? ' (you)' : ''),
      plainName: st.name,
      email: st.email,
      role: st.role,
      isOwner,
      invited,
      last: invited ? 'Invite pending' : `Active ${fmt.agoInline(st.last ?? 0, now)}`,
      divider: i > 0,
      removeTone: isOwner ? 'disabled' : 'default',
    };
  });

  const roles = [...STAFF_ROLES];

  return {
    rows,
    roles,
    inviteRoles: roles.filter((r): r is InviteRole => r !== 'Owner'),
    perms: PERMS.map(([key, label]) => ({
      key,
      label,
      cells: roles.map((role) => ({
        role,
        // The optional chain is the reference's `(db.perms[r] || {})[k]`: a snapshot that has not
        // been migrated, or one scoped by the API, may not carry every role.
        on: !!db.perms[role]?.[key],
        fixed: role === 'Owner',
      })),
    })),
    email: ui.email,
    newRole: ui.newRole,
    err: ui.err,
  };
}

// ================================================================================================
// R2 (D-160 R2-3): Staff & Roles on the Admin redesign's components. The mockup draws no Staff screen
// (its `NAV` has none; D11 keeps roles and the `PermKey` matrix here), so this is the old screen's
// content in the R2 kit: the same rows, roles and matrix as `staffVM`, the viewer's own row marked
// "(you)", and times MST (`adminStamp`, BUILD-SPEC § 7).
// ================================================================================================

export interface StaffR2Row {
  id: string;
  /** With ` (you)` on the viewer's own row. */
  name: string;
  plainName: string;
  email: string;
  initials: string;
  role: StaffRole;
  isOwner: boolean;
  /** `Dec 10, 9:22 AM`, or `Invite pending`. */
  last: string;
  lastAt: number;
}

export interface StaffR2VM {
  rows: StaffR2Row[];
  roles: StaffRole[];
  inviteRoles: InviteRole[];
  perms: PermRow[];
}

export function staffR2VM(db: Db, viewerId: string | null): StaffR2VM {
  const base = staffVM(db, 0);
  return {
    rows: db.staff.map((st) => ({
      id: st.id,
      name: st.name + (st.id === viewerId ? ' (you)' : ''),
      plainName: st.name,
      email: st.email,
      initials: fmt.initials(st.name),
      role: st.role,
      isOwner: st.role === 'Owner',
      last: st.last ? adminStamp(st.last) : 'Invite pending',
      lastAt: st.last ?? 0,
    })),
    roles: base.roles,
    inviteRoles: base.inviteRoles,
    perms: base.perms,
  };
}
