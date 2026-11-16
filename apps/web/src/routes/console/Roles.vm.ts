// /admin/roles (D-157, spec § 7.16): the Console's capability matrix, read-only. It is defined in code
// (`CONSOLE_CAPS`, D11), so nothing here edits it; staff and their roles are managed on the existing
// Staff & Roles screen, which this links to. Pure; Roles.tsx only renders it.

import { ROLES_R2_ROWS, adminStamp, fmt, isEditableRole, permissionConfirmCopy } from '@ai/core';
import type { ConsoleRole, Db, EditableRole, PermKey, RoleRowKey, RolesMatrix } from '@ai/core';
import type { TokenGlyph, TokenTone } from '../../components/StatusToken';

export const ROLES_COPY = {
  title: 'Roles & Permissions',
  description: 'Who on staff can do what in Console. Learners, agents and team owners never see Console.',
  staffNote: 'Staff members and their roles are managed in Staff & Roles.',
  staffLink: 'Go to Staff & Roles',
  matrixTitle: 'Permission Matrix',
  matrixNote: 'Set in code and read-only. The Owner always has every permission.',
  caption: 'Console permissions by role',
  capability: 'Capability',
} as const;

export interface RoleCell {
  role: ConsoleRole;
  allowed: boolean;
  text: string;
  tone: TokenTone;
  icon: TokenGlyph;
}

export interface RolesRowVM {
  key: string;
  label: string;
  cells: RoleCell[];
}

export interface RolesVM {
  roles: ConsoleRole[];
  rows: RolesRowVM[];
  noAccess: string;
  staffPath: string;
}

/** "Instructor and Content Editor have no Console access." */
export function noAccessLine(roles: readonly string[]): string {
  if (roles.length === 0) return '';
  const list = roles.length === 1 ? roles[0]! : `${roles.slice(0, -1).join(', ')} and ${roles[roles.length - 1]}`;
  return `${list} ${roles.length === 1 ? 'has' : 'have'} no Console access.`;
}

export function rolesVM(m: RolesMatrix): RolesVM {
  return {
    roles: m.roles,
    staffPath: m.staffPath,
    noAccess: noAccessLine(m.noAccess),
    rows: m.caps.map((c) => ({
      key: c.cap,
      label: c.label,
      cells: m.roles.map((role): RoleCell => {
        const allowed = c.allowed[role];
        const note = c.notes[role];
        return allowed
          ? { role, allowed, text: note ? `Yes, ${note.charAt(0).toLowerCase()}${note.slice(1)}` : 'Yes', tone: 'success', icon: 'check' }
          : { role, allowed, text: 'No', tone: 'neutral', icon: 'minus' };
      }),
    })),
  };
}

// ================================================================================================
// R2 (D-160 R2-3b): Roles & Permissions on the signed-off Admin redesign (AdminRedesign.jsx `Roles`).
// The staff table and the mockup's nine-row matrix (`ROLES_R2_ROWS`), EDITABLE by the Owner (Connor,
// Nov 16, 2026, 8:27 AM MST, superseding D11): a box the ceiling (`CONSOLE_CAPS`) allows opens the
// mockup's confirm, and the server makes the change (preview, then the confirm token) with one audit
// row. A box past the ceiling is locked, "Fixed by product rules", as the mockup draws Support's refund
// and masquerade; the `build` row is the `PermKey` matrix's (the one Staff & Roles edits), and its
// change sets those four; everyone but the Owner sees the matrix read-only.
// ================================================================================================

export const ROLES_R2_COPY = {
  description: 'Who on staff can do what. Learners, agents, and team owners never see the admin.',
  invite: 'Invite staff',
  staffTitle: 'Staff',
  matrixTitle: 'Permission matrix',
  matrixSub: 'Owner always has every permission. Locked boxes are fixed by product rules. Changes are confirmed and audit-logged.',
  changeRole: 'Change role…',
  fixed: 'Fixed by product rules',
  updated: 'Permission updated',
} as const;

/** The mockup's `guard('staff', …)` toast, as a locked box's title: "Your role (Admin) can't do this: Change Support permission". */
export const guardTitle = (viewerRole: string | null, role: string): string => `Your role (${viewerRole ?? 'none'}) can't do this: Change ${role} permission`;

export interface RolesR2Staff {
  id: string;
  /** With ` (you)` on the viewer's own row. */
  name: string;
  email: string;
  initials: string;
  role: string;
  isOwner: boolean;
  /** `Dec 10, 9:22 AM` (MST), or `Invite pending`. */
  last: string;
  lastAt: number;
}

export interface RolesR2Cell {
  role: ConsoleRole;
  on: boolean;
  /** Past the ceiling (`CONSOLE_CAPS`): the lock and "Fixed by product rules". */
  locked: boolean;
  /** Not a toggle for this viewer: the Owner's column, a locked box, or a viewer who isn't the Owner. */
  disabled: boolean;
  /** Why it is disabled, in words (none for the Owner's column, which the card's sentence explains). */
  title?: string;
  /** `Yes` / `No`, and on a phone `Allowed` / `Not allowed`. */
  word: string;
  wordPhone: string;
  /** What a click asks, when it is a toggle. */
  change?: { role: EditableRole; capability: RoleRowKey; allowed: boolean; title: string; body: string; cta: string };
}

export interface RolesStaffR2VM {
  staff: RolesR2Staff[];
  /** The viewer may manage staff (the `staff` permission), on Staff & Roles. */
  canManageStaff: boolean;
}

/** The staff table, from the snapshot: it shows before the matrix answers. */
export function rolesStaffR2(db: Pick<Db, 'staff' | 'perms'>, viewerId: string | null): RolesStaffR2VM {
  const viewer = db.staff.find((x) => x.id === viewerId) ?? null;
  return {
    staff: db.staff.map((st) => ({
      id: st.id,
      name: st.name + (st.id === viewerId ? ' (you)' : ''),
      email: st.email,
      initials: fmt.initials(st.name),
      role: st.role,
      isOwner: st.role === 'Owner',
      last: st.last ? adminStamp(st.last) : 'Invite pending',
      lastAt: st.last ?? 0,
    })),
    canManageStaff: !!viewer && (viewer.role === 'Owner' || !!db.perms[viewer.role]?.staff),
  };
}

export interface RolesR2Matrix {
  roles: ConsoleRole[];
  rows: { key: RoleRowKey; label: string; cells: RolesR2Cell[] }[];
}

/**
 * The matrix: what each role holds now (the API's `allowed`: the ceiling AND NOT the Owner's removals)
 * and the snapshot's `PermKey`s. `canEdit` is the viewer's `roles.write` (the Owner's, from `/me`).
 */
export function rolesMatrixR2(m: RolesMatrix, db: Pick<Db, 'perms'>, viewer: { canEdit: boolean; role: string | null }): RolesR2Matrix {
  const cap = (c: string) => m.caps.find((x) => x.cap === c);
  const permOn = (perm: PermKey, role: ConsoleRole) => !!db.perms[role]?.[perm];
  return {
    roles: m.roles,
    rows: ROLES_R2_ROWS.map((r) => ({
      key: r.key,
      label: r.label,
      cells: m.roles.map((role): RolesR2Cell => {
        const caps = r.caps ?? [];
        const ceiling = caps.every((c) => !!cap(c)?.ceiling[role]);
        const on = role === 'Owner' || (caps.every((c) => !!cap(c)?.allowed[role]) && (r.perms ?? []).every((p) => permOn(p, role)));
        const word = { word: on ? 'Yes' : 'No', wordPhone: on ? 'Allowed' : 'Not allowed' };
        if (role === 'Owner' || !isEditableRole(role)) return { role, on, locked: false, disabled: true, ...word };
        if (!ceiling) return { role, on: false, locked: true, disabled: true, title: ROLES_R2_COPY.fixed, word: 'No', wordPhone: 'Not allowed' };
        if (!viewer.canEdit) return { role, on, locked: false, disabled: true, title: guardTitle(viewer.role, role), ...word };
        return { role, on, locked: false, disabled: false, ...word, change: { role, capability: r.key, allowed: !on, ...permissionConfirmCopy(r.label, role, on) } };
      }),
    })),
  };
}
