// /admin/roles (D-157, spec § 7.16): the Console's capability matrix, read-only. It is defined in code
// (`CONSOLE_CAPS`, D11), so nothing here edits it; staff and their roles are managed on the existing
// Staff & Roles screen, which this links to. Pure; Roles.tsx only renders it.

import { FIXED_BY_PRODUCT, ROLES_R2_ROWS, adminStamp, fmt } from '@ai/core';
import type { ConsoleRole, Db, PermKey, RolesMatrix } from '@ai/core';
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
// The staff table and the mockup's nine-row matrix (`ROLES_R2_ROWS`), each row read from the API's
// matrix (`CONSOLE_CAPS`) or the snapshot's `PermKey`s. READ-ONLY, as D11 and spec § 7.16 require:
// every box is drawn disabled, and the mockup's confirm and its audit row (BUILD-SPEC § 7) are not
// built, since no write endpoint may exist (Needs Connor's call, D-160 R2-3b).
// ================================================================================================

export const ROLES_R2_COPY = {
  description: 'Who on staff can do what. Learners, agents, and team owners never see the admin.',
  invite: 'Invite staff',
  staffTitle: 'Staff',
  matrixTitle: 'Permission matrix',
  matrixSub: 'Owner always has every permission. Locked boxes are fixed by product rules. This matrix is read-only.',
  changeRole: 'Change role…',
} as const;

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
  /** Fixed by product rules: Support's refund and masquerade. */
  locked: boolean;
  /** `Yes` / `No`, and on a phone `Allowed` / `Not allowed`. */
  word: string;
  wordPhone: string;
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
  rows: { key: string; label: string; cells: RolesR2Cell[] }[];
}

/** The matrix: the API's capabilities (`CONSOLE_CAPS`) and the snapshot's `PermKey`s, read-only. */
export function rolesMatrixR2(m: RolesMatrix, db: Pick<Db, 'perms'>): RolesR2Matrix {
  const capOn = (cap: string, role: ConsoleRole) => !!m.caps.find((c) => c.cap === cap)?.allowed[role];
  const permOn = (perm: PermKey, role: ConsoleRole) => !!db.perms[role]?.[perm];
  return {
    roles: m.roles,
    rows: ROLES_R2_ROWS.map((r) => ({
      key: r.key,
      label: r.label,
      cells: m.roles.map((role): RolesR2Cell => {
        const on =
          role === 'Owner' || ((r.caps ?? []).every((c) => capOn(c, role)) && (r.perms ?? []).every((p) => permOn(p, role)));
        return {
          role,
          on,
          locked: !!FIXED_BY_PRODUCT[role]?.includes(r.key),
          word: on ? 'Yes' : 'No',
          wordPhone: on ? 'Allowed' : 'Not allowed',
        };
      }),
    })),
  };
}
