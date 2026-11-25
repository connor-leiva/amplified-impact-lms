import { useMemo } from 'react';
import { useDb } from '../../../data/hooks';
import { useAdminChrome } from '../../../shell/admin/chrome';
import { Area } from './Area';
import { AREA_COPY as C, areaCounts } from './area.vm';

// D-253: People (`/admin/people`), who has a sign-in: Everyone (today's Users), Teams (today's Workspaces) and
// Masquerade (the mockup's `PeopleArea`). A person and a team are records under their tab
// (`/admin/people/:userId`, `/admin/people/teams/:teamId`). Utah Life arrives in Phase 7.

export function Component() {
  const db = useDb();
  const { counts, cohort } = useAdminChrome();
  const tabCounts = useMemo(() => areaCounts(db, 'people', cohort.id ?? '', counts), [db, cohort.id, counts]);
  return <Area area="people" cohortId={cohort.id ?? ''} title={C.people.title} description={C.people.description} counts={tabCounts} />;
}
