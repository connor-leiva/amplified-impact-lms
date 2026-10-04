// Tier changes, ported verbatim from design-reference/lms-data.js (lines 331-341).
// These two MUTATE the db they are handed and return the user (or null). That is the reference
// contract, and mutations.ts relies on it to call them inside an immer draft.

import type { Db, Learner } from './types';

export function upgradeUser(d: Db, uid: string): Learner | null {
  const u = d.users.find((x) => x.id === uid);
  if (!u) return null;
  u.tier = 'team';
  if (!u.teamId) {
    const id = 't_' + uid;
    if (!d.teams.find((t) => t.id === id))
      d.teams.push({ id, name: u.name.split(' ').slice(-1)[0]! + ' Team', ownerId: uid, seats: 7 });
    u.teamId = id;
    u.role = 'Team Owner';
  }
  return u;
}

export function downgradeUser(d: Db, uid: string): Learner | null {
  const u = d.users.find((x) => x.id === uid);
  if (!u) return null;
  u.tier = 'agent';
  u.role = 'Agent';
  u.teamId = null;
  return u;
}
