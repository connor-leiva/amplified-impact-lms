// `/` and every address under it, with the flag on (D-182): the first portal's frame (`shell/AppShell.tsx`,
// unchanged) for staff and for a learner without the course, and for a learner with the course the
// learner portal's page for the address (`redirects.tsx`: `/` to /learn, `/sessions` to /learn/schedule,
// `/employees/:id` to its week, `/team`, `/vault`, `/team-tier`), with its query and fragment kept. Worked
// out while rendering, so nothing of the first portal is drawn on the way. Its own module so the route's
// lazy load (and its stale-chunk recovery, D-170) still carries the first portal's shell.
// D-257: with LMS v3 on, a learner without the course is sent on the same way: the LMS is theirs too.

import { cohortOfViewer, learnerOf } from '@ai/core/learner';
import { useDb, useViewer } from '../../../data/hooks';
import { Component as AppShell } from '../../../shell/AppShell';
import { hasPortal } from '../../../shell/navModel';
import { LearnerRedirect } from '../redirects';
import { LMS_V3 } from '../lms-v3/v3';

function Learner({ userId }: { userId: string }) {
  const db = useDb();
  // R-5 Phase 4 (D-261): their own cohort, whose run says which week an old `/employees/:id` address is.
  return hasPortal(db) || LMS_V3 ? <LearnerRedirect cohort={cohortOfViewer(db, learnerOf(db, userId))} /> : <AppShell />;
}

export function Component() {
  const viewer = useViewer();
  return viewer.actor.kind === 'learner' ? <Learner userId={viewer.actor.userId} /> : <AppShell />;
}

export default Component;
