import { useMemo } from 'react';
import { useDb } from '../../../data/hooks';
import { useAdminChrome } from '../../../shell/admin/chrome';
import { Area } from './Area';
import { AREA_COPY as C, areaCounts } from './area.vm';
import { useAudiences } from '../people/useAudiences';

// D-253: People (`/admin/people`), who has a sign-in: Everyone (today's Users), Teams (today's Workspaces) and
// Masquerade (the mockup's `PeopleArea`). A person and a team are records under their tab
// (`/admin/people/:userId`, `/admin/people/teams/:teamId`). R-5 Phase 7 (D-268): Everyone and Teams carry their counts.

export function Component() {
  const db = useDb();
  const { counts, cohort } = useAdminChrome();
  const audiences = useAudiences();
  const tabCounts = useMemo(() => areaCounts(db, 'people', cohort.id ?? '', counts, audiences), [db, cohort.id, counts, audiences]);
  return <Area area="people" cohortId={cohort.id ?? ''} title={C.people.title} description={C.people.description} counts={tabCounts} />;
}
