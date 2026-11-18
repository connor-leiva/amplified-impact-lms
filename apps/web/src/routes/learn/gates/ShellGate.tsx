// `/` and every address under it, with the flag on (D-182): the first portal's frame (`shell/AppShell.tsx`,
// unchanged) for staff and for a learner without the course, and for a learner with the course the
// learner portal's page for the address (`redirects.tsx`: `/` to /learn, `/sessions` to /learn/schedule,
// `/employees/:id` to its week, `/team`, `/vault`, `/team-tier`), with its query and fragment kept. Worked
// out while rendering, so nothing of the first portal is drawn on the way. Its own module so the route's
// lazy load (and its stale-chunk recovery, D-170) still carries the first portal's shell.

import { useDb, useViewer } from '../../../data/hooks';
import { Component as AppShell } from '../../../shell/AppShell';
import { hasPortal } from '../../../shell/navModel';
import { LearnerRedirect } from '../redirects';

function Learner() {
  const db = useDb();
  return hasPortal(db) ? <LearnerRedirect /> : <AppShell />;
}

export function Component() {
  const viewer = useViewer();
  return viewer.actor.kind === 'learner' ? <Learner /> : <AppShell />;
}

export default Component;
