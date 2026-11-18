// /learn and every address under it, with the flag on (D-182): the learner portal for a learner with the
// course and for staff (as before), and for a learner without it the first portal's page for the address
// (`firstPortalPathFor`: the Skill Library, a skill's guide, the vault, the Team Hub, `/account`), with
// its query and fragment kept, so they keep exactly what `main` serves them.

import { Navigate, useLocation } from 'react-router';
import { useDb, useViewer } from '../../../data/hooks';
import { Component as LearnerShell } from '../../../shell/learner/LearnerShell';
import { hasPortal } from '../../../shell/navModel';
import { firstPortalPathFor } from '../audience';

function Learner() {
  const db = useDb();
  const { pathname, search, hash } = useLocation();
  return hasPortal(db) ? <LearnerShell /> : <Navigate to={`${firstPortalPathFor(pathname)}${search}${hash}`} replace />;
}

export function Component() {
  const viewer = useViewer();
  return viewer.actor.kind === 'learner' ? <Learner /> : <LearnerShell />;
}

export default Component;
