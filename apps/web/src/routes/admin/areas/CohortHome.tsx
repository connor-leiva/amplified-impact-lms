import { Navigate, useLocation } from 'react-router';
import { useAdminChrome } from '../../../shell/admin/chrome';
import { NotFound } from '../../console/Denied';

// D-253 (spec § 3): `/admin/cohort` goes to the cohort the admin is on: the one looked at last in this tab, else the
// one running, else the next to start, else the newest (`cohorts.ts`). With no cohort at all, the Console's 404.

export function Component() {
  const { search, hash } = useLocation();
  const { cohort } = useAdminChrome();
  if (!cohort.id) return <NotFound />;
  return <Navigate replace to={`/admin/cohort/${encodeURIComponent(cohort.id)}${search}${hash}`} />;
}
