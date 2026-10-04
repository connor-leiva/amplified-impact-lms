// Permission checks — docs/phases/02-core-domain.md §2.6. The Owner always passes.

import { MutationError } from './mutations';
import type { Actor } from './mutations';
import type { Db, PermKey } from './types';

export function can(db: Db, a: Actor, perm: PermKey): boolean {
  if (a.kind !== 'staff') return false;
  const s = db.staff.find((x) => x.id === a.staffId);
  return !!s && (s.role === 'Owner' || db.perms[s.role]?.[perm] === 1);
}

export const requirePerm = (db: Db, a: Actor, perm: PermKey) => {
  if (!can(db, a, perm)) throw new MutationError('forbidden', 'You don’t have permission to do that.');
};
