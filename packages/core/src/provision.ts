// Turning a paid order into a team with an owner (DECISIONS.md D-078).
//
// The platform had no way for a person to arrive without a team owner inviting them: `inviteMember`
// needs an owner already in a team, and staff cannot add a learner. A purchase is that missing door.
// `provisionOwner` is the pure half of it, in core beside the mutations because it changes `users`
// and `teams`, the same records every screen renders: it returns a new `Db`, and the API persists the
// difference exactly as `/api/mutate` does, so the Team Hub, the admin Learners screen and the
// snapshot all see one consistent change.
//
// It is NOT one of the 37 mutations in `mutations.ts`. Those are the reference prototype's, each with
// a schema, a route and a differential test; this one has no screen and no actor. Nobody can call it
// over `/api/mutate`.
//
// IDEMPOTENT. Run twice with the same arguments it changes nothing the second time, which is what
// lets the webhook and the staff command both call it for the same order.

import { produce } from 'immer';
import type { Db, Learner, Team, Tier } from './types';

export interface ProvisionOwnerArgs {
  /** The buyer's email. Matched case-insensitively against every learner and staff member. */
  email: string;
  name: string;
  /** The team's name: the buyer's company, or their own name when they gave none. */
  teamName: string;
  /** Logins the plan gives. A team with fewer is raised to this; one with more keeps its own. */
  seats: number;
  tier: Tier;
  cohortId: string;
  /** When true, an existing team's name becomes `teamName`. A new team already takes it. */
  applyTeamName?: boolean;
  /** When the stored name is blank or the email address, use `name`. */
  applyOwnerName?: boolean;
  /** An existing owner is placed in `cohortId`. A new owner already is. */
  placeInCohort?: boolean;
}

export type ProvisionOwnerResult =
  | {
      ok: true;
      db: Db;
      userId: string;
      teamId: string;
      createdUser: boolean;
      createdTeam: boolean;
    }
  | {
      ok: false;
      /** Why staff must look at it by hand. Never the buyer's details. */
      reason: 'staff-email' | 'member-of-another-team';
    };

const TIER_RANK: Record<Tier, number> = { agent: 0, team: 1 };

/** Find or create the buyer as the Team Owner of their own team. */
export function provisionOwner(db: Db, args: ProvisionOwnerArgs, ctx: { now: number; id: (prefix: string) => string }): ProvisionOwnerResult {
  const email = args.email.trim().toLowerCase();
  if (db.staff.some((s) => s.email.toLowerCase() === email)) return { ok: false, reason: 'staff-email' };

  const existing = db.users.find((u) => u.email.toLowerCase() === email);
  const team = existing?.teamId ? db.teams.find((t) => t.id === existing.teamId) : undefined;
  // Someone already seated on another owner's team: giving them a second team would move them out of
  // the first. Staff sort it out with the buyer.
  if (existing && team && team.ownerId !== existing.id) return { ok: false, reason: 'member-of-another-team' };

  const userId = existing?.id ?? ctx.id('u');
  const teamId = team?.id ?? ctx.id('t');

  const next = produce(db, (d) => {
    let user = d.users.find((u) => u.id === userId);
    if (!user) {
      const created: Learner = {
        id: userId,
        name: args.name.trim() || email,
        email,
        tier: args.tier,
        role: 'Team Owner',
        teamId,
        cohortId: args.cohortId,
        joined: ctx.now,
        last: null,
        status: 'invited',
        progress: {},
      };
      d.users.push(created);
      user = d.users[d.users.length - 1]!;
    } else {
      user.teamId = teamId;
      user.role = 'Team Owner';
      // A second plan can raise the tier (library, then the cohort); it never lowers it.
      if (TIER_RANK[args.tier] > TIER_RANK[user.tier]) user.tier = args.tier;
      if (args.placeInCohort && user.cohortId !== args.cohortId) user.cohortId = args.cohortId;
      if (args.applyOwnerName) {
        const given = args.name.trim();
        const current = user.name.trim();
        // An access-group sign-in stores the address until there is a name (createGroupMember).
        const placeholder = current === '' || current.toLowerCase() === email;
        if (placeholder && given !== '' && given.toLowerCase() !== email && current !== given) user.name = given;
      }
    }

    let t = d.teams.find((x) => x.id === teamId);
    if (!t) {
      const created: Team = { id: teamId, name: args.teamName.trim() || user.name, ownerId: userId, seats: args.seats };
      d.teams.push(created);
      t = d.teams[d.teams.length - 1]!;
    } else {
      if (t.seats < args.seats) t.seats = args.seats;
      if (args.applyTeamName) {
        const name = args.teamName.trim();
        if (name !== '' && t.name !== name) t.name = name;
      }
    }
  });

  return {
    ok: true,
    db: next,
    userId,
    teamId,
    createdUser: !existing,
    createdTeam: !team,
  };
}
