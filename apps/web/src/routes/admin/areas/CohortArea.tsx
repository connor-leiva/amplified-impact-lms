import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Icon } from '../../../components/Icon';
import { Menu } from '../../../components/r2/Menu';
import { cohortLabel } from '../../../data/admin-shell';
import { useDb } from '../../../data/hooks';
import { useAdminChrome } from '../../../shell/admin/chrome';
import { NotFound } from '../../console/Denied';
import { Area } from './Area';
import { areaCounts } from './area.vm';
import a from './Area.module.css';

// D-253: Cohort (`/admin/cohort/:cohortId`), one group going through the program: Schedule (today's Cohorts &
// Sessions), People (today's Learners & Teams), Community (D-238) and Announcements (the mockup's `CohortArea`). The
// cohort is in the address, so a link names its cohort; the title is the picker, the same choice as the sidebar's
// switcher, and picking one keeps the tab. A thread is a record of Community's (`…/community/:id`). Overview,
// Submissions and Settings, and the head's status, shape line and actions, arrive in Phase 3.

/** The cohort picker in the Cohort page's title (the mockup's `CohortPick big`). */
function CohortPick({ label }: { label: string }) {
  const { cohort } = useAdminChrome();
  return (
    <Menu
      label="Cohorts"
      placement="below-left"
      className={a.pickMenu}
      items={cohort.choices.map((c) => ({ label: c.label, checked: c.current, onSelect: () => cohort.pick(c.id) }))}
      trigger={(t) => (
        <button type="button" className={a.pick} aria-label={`Switch cohort. ${label}`} onClick={t.toggle} {...t.props}>
          <span className={a.pickName}>{label}</span>
          <Icon name="r2Updown" size={18} strokeWidth={1.75} />
        </button>
      )}
    />
  );
}

export function Component() {
  const { cohortId = '' } = useParams();
  const db = useDb();
  const { counts } = useAdminChrome();
  const co = db.cohorts.find((c) => c.id === cohortId) ?? null;
  const tabCounts = useMemo(() => (co ? areaCounts(db, 'cohort', co.id, counts) : {}), [db, co, counts]);
  // An address that names no cohort is the Console's 404, as any unknown admin address is.
  if (!co) return <NotFound />;
  return <Area area="cohort" cohortId={co.id} title={<CohortPick label={cohortLabel(co)} />} counts={tabCounts} />;
}
