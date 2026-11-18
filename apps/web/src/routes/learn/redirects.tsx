// Where the first learner portal's addresses go now (D-182). The learner portal at /learn replaced the
// dashboard, the AI Employee pages, Sessions, the course pages and the first Skill Library, so every old
// learner address still works by sending its visitor to the new page that does the same job. Emails
// already sent, reminders, bookmarks, www's links and the seed's own words keep landing somewhere real.
//
//   /                          /learn
//   /sessions                  /learn/schedule
//   /employees/:id             /learn/week/:n for a course week's module (`accelerator-week-N`), else /learn
//   /team                      /learn/team (the Team Hub, D-182)
//   /vault                     /learn/vault (the Resource Vault, D-182)
//   /team-tier                 /learn (the prototype's upsell; no plan sells it, D-182)
//   /course                    /learn
//   /course/:week              /learn/week/:n (`/course/week-3` is Week 3), else /learn
//   /skill-library             /learn/skills
//   /skill-library/:slug       /learn/skills/:slug
//   anything else a learner    /learn
//   meets in the old shell
//
// Each keeps the address's query and fragment (`?as=`, `?now=` and `?preview=` among them). PURE, apart
// from the three small route components at the end, and none of it reads data.

import { Navigate, useLocation, useParams } from 'react-router';
import { ACCELERATOR_WEEKS, acceleratorModuleId } from '@ai/core/accelerator';
import { weekFromParam } from '../course/Course.vm';
import { learnHome, learnSchedule, learnSkill, learnSkills, learnTeam, learnVault, learnWeek } from './routes';

/**
 * A course week's page, from its module's id (`accelerator-week-3` is Week 3), or null for any other id.
 * By the id alone, not the snapshot: a learner's snapshot carries a week's module without its course
 * words, and the week's page itself says whether it is open, locked or not theirs.
 */
export function weekOfModule(moduleId: string): string | null {
  const week = ACCELERATOR_WEEKS.find((w) => acceleratorModuleId(w) === moduleId);
  return week === undefined ? null : learnWeek(week);
}

const EMPLOYEE = /^\/employees\/([^/]+)\/?$/;

/**
 * Where a learner goes from an address of the first portal's shell (`/`, `/sessions`, `/employees/:id`,
 * `/team`, `/vault`, `/team-tier`, or anything else it used to catch). Staff never come here: the admin
 * shell keeps them.
 */
export function learnerPathFor(pathname: string): string {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (p === '/sessions') return learnSchedule();
  if (p === '/team') return learnTeam();
  if (p === '/vault') return learnVault();
  const emp = EMPLOYEE.exec(p);
  if (emp) return weekOfModule(decoded(emp[1]!)) ?? learnHome();
  return learnHome();
}

const decoded = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** `/course` and `/course/:week`: the week's page for `week-N`, else Home. */
export const coursePathFor = (week: string | undefined): string => {
  const n = weekFromParam(week);
  return n === null ? learnHome() : learnWeek(n);
};

/** `/skill-library` and `/skill-library/:slug`: the Skill Library, or the skill's page (the same slug). */
export const libraryPathFor = (slug: string | undefined): string => (slug ? learnSkill(slug) : learnSkills());

/** A redirect that keeps the address's query and fragment. */
function Keep({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}

/** The route element for `/course` and `/course/:week`. */
export function CourseRedirect() {
  const { week } = useParams();
  return <Keep to={coursePathFor(week)} />;
}

/** The route element for `/skill-library` and `/skill-library/:slug`. */
export function LibraryRedirect() {
  const { slug } = useParams();
  return <Keep to={libraryPathFor(slug)} />;
}

/** A learner in the first portal's shell, sent on (`learnerPathFor`). */
export function LearnerRedirect() {
  const { pathname } = useLocation();
  return <Keep to={learnerPathFor(pathname)} />;
}
