// D-243: the cohort's own learners, and the ones outside the course (Connor, Nov 24: "exclude the Utah Life
// members, but I don't want it 'hardcoded'... put them in a separate category altogether").
//
// Provisioning puts every account in cohort `dec26`: a buyer of any plan (billing/provision.ts) and an access
// group's member (billing/access-groups.ts) alike. So the cohort's rows alone can't tell who is in the course
// (D-110). The plan can: the server reads it (`holdsCourse`) and hands staff's snapshot `outside`, the learners
// whose plan doesn't hold the course and the access groups they are in. Every number and list about the cohort
// then counts the learners in the course only. No rule here names a group: Utah Life's members are outside
// because their access holds no course, and so will be the members of any group added later.
//
// Absent (the fixture, and every learner's snapshot), everyone is the cohort's, so nothing a fixture draws
// changes. Pure: no clock, no I/O.

import { countsTowardEnrollment } from './release';
import type { Db, Learner, Outside, Team } from './types';

/** Whether a learner is in the course: not one of `db.outside`'s. Everyone is, without it. */
export function inCourse(db: Pick<Db, 'outside'>): (u: Pick<Learner, 'id'>) => boolean {
  const out = new Set(db.outside?.ids ?? []);
  return (u) => !out.has(u.id);
}

/** The cohort's learners: everyone but the learners outside the course. */
export const courseUsers = (db: Pick<Db, 'users' | 'outside'>): Learner[] => (db.outside?.ids.length ? db.users.filter(inCourse(db)) : db.users);

/** The cohort's teams: every team but one whose people are all outside the course (a group member's team of one). */
export function courseTeams(db: Pick<Db, 'users' | 'teams' | 'outside'>): Team[] {
  if (!db.outside?.ids.length) return db.teams;
  const isIn = inCourse(db);
  return db.teams.filter((t) => {
    const people = db.users.filter((u) => u.teamId === t.id);
    return !people.length || people.some(isIn);
  });
}

/** How many learners a cohort holds: its people, but not a seeded test account (D-202) or anyone outside the course. */
export function enrolledIn(users: readonly Learner[], cohortId: string, outside?: Pick<Outside, 'ids'>): number {
  const out = new Set(outside?.ids ?? []);
  return users.filter((u) => u.cohortId === cohortId && countsTowardEnrollment(u) && !out.has(u.id)).length;
}

/**
 * The server's snapshot once it knows who is outside the course: each cohort's `enrolled` counted again without
 * them, and `outside` kept for `scopeSnapshot`, which gives it to staff only. With nobody outside (the demo
 * database), the snapshot as it was: no field added, no count moved.
 */
export function withOutside(db: Db, outside: Outside): Db {
  if (!outside.ids.length) return db;
  return { ...db, outside, cohorts: db.cohorts.map((c) => ({ ...c, enrolled: enrolledIn(db.users, c.id, outside) })) };
}
