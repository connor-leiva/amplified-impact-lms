// How many of each role a team's seats hold (D-081, built in D-120). One function, read by
// `inviteMember` (which enforces it) and the Team Hub (which shows it), so the two cannot disagree.
//
// A team's seats come from its plan when it is provisioned (D-078): the Amplified Team Plan's 16 or
// 41 (the owner and 15 or 40 agents), Amplified Insiders' and the AI Accelerator's 2 (the owner and
// one operator). The prototype's fixed caps (1 owner, 1 operations lead, 5 sales agents) were short
// of the Team Plan's 15 and 40. The rule is the plan's seats, shared:
//   - one Team Owner;
//   - at most one Operations Lead;
//   - every other seat a Sales Agent: the seats, less the owner's, less an operations lead's when the
//     team has one.
// The prototype's teams have seven seats and an operations lead, so they still hold five agents and
// every portal screen reads as before. The seat count itself (`inviteMember`'s "All seats are
// assigned") stays the binding limit.

import type { Db, Team } from './types';

export type SeatRole = 'Team Owner' | 'Operations Lead' | 'Sales Agent';

export function seatCaps(db: Pick<Db, 'users'>, team: Pick<Team, 'id' | 'seats'>): Record<SeatRole, number> {
  const opsLead = db.users.some((u) => u.teamId === team.id && u.role === 'Operations Lead') ? 1 : 0;
  return { 'Team Owner': 1, 'Operations Lead': 1, 'Sales Agent': Math.max(0, team.seats - 1 - opsLead) };
}
