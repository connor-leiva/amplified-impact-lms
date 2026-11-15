// /admin/roles (D-157, spec § 7.16): the Console's capability matrix, read-only. It is defined in code
// (`CONSOLE_CAPS`, D11), so nothing here edits it; staff and their roles are managed on the existing
// Staff & Roles screen, which this links to. Pure; Roles.tsx only renders it.

import type { ConsoleRole, RolesMatrix } from '@ai/core';
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
