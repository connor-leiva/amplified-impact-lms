import { Navigate, useLocation } from 'react-router';
import { useDb, useNow } from '../../../data/hooks';
import { movedAdminPath } from '../../../shell/admin/addresses';
import { defaultCohortId } from '../../../shell/admin/cohorts';
import { useAdminChrome } from '../../../shell/admin/chrome';
import { NotFound } from '../../console/Denied';

// D-253 (spec § 3): yesterday's admin addresses. Each lands on its new one, its query string and hash kept, so a
// bookmark, an audit entry, an email link or an API search result still lands. A cohort's page goes to the cohort the
// admin is on (`/admin/cohort`: the one looked at last in this tab, else the running one, else the next, else the
// newest).

export function Component() {
  const { pathname, search, hash } = useLocation();
  const { cohort } = useAdminChrome();
  const db = useDb();
  const now = useNow();
  const cohortId = cohort.id ?? defaultCohortId(db.cohorts, now) ?? '';
  const to = movedAdminPath(pathname, cohortId);
  if (!to) return <NotFound />;
  return <Navigate replace to={`${to}${search}${hash}`} />;
}
