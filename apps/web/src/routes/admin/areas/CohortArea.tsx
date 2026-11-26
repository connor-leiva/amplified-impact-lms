import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Icon } from '../../../components/Icon';
import { Button, buttonClass } from '../../../components/r2/Button';
import { Menu } from '../../../components/r2/Menu';
import { Status } from '../../../components/r2/Status';
import { useDb, useNow } from '../../../data/hooks';
import { useAdminChrome } from '../../../shell/admin/chrome';
import { NotFound } from '../../console/Denied';
import { NEW_COHORT_PATH, cohortHeadVM, cohortPath } from '../cohort/cohort.vm';
import { Area } from './Area';
import { areaCounts } from './area.vm';
import a from './Area.module.css';

// D-253: Cohort (`/admin/cohort/:cohortId`), one group going through the program (the mockup's `CohortArea`). The cohort
// is in the address, so a link names its cohort; the title is the picker, the same choice as the sidebar's switcher,
// and picking one keeps the tab. D-255 (Phase 3): Overview first and Settings last; the head's status word (Draft,
// Scheduled, Active, Finished), its shape line, Preview (the staff preview of this cohort's course) and its menu (New
// cohort…, All settings). Open enrollment is Phase 5's and is not drawn.

/** The cohort picker in the Cohort page's title (the mockup's `CohortPick big`), with "New cohort…" after the cohorts. */
function CohortPick({ label }: { label: string }) {
  const { cohort } = useAdminChrome();
  return (
    <Menu
      label="Cohorts"
      placement="below-left"
      className={a.pickMenu}
      items={[
        ...cohort.choices.map((c) => ({ label: c.label, checked: c.current, onSelect: () => cohort.pick(c.id) })),
        ...(cohort.create ? (['separator', { label: 'New cohort…', onSelect: cohort.create }] as const) : []),
      ]}
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
  const now = useNow();
  const navigate = useNavigate();
  const { counts } = useAdminChrome();
  const co = db.cohorts.find((c) => c.id === cohortId) ?? null;
  const tabCounts = useMemo(() => (co ? areaCounts(db, 'cohort', co.id, counts) : {}), [db, co, counts]);
  const head = useMemo(() => (co ? cohortHeadVM(db, co.id, now) : null), [db, co, now]);
  // An address that names no cohort is the Console's 404, as any unknown admin address is.
  if (!co || !head) return <NotFound />;
  return (
    <Area
      area="cohort"
      cohortId={co.id}
      title={<CohortPick label={head.label} />}
      meta={<Status tone={head.status.tone}>{head.status.label}</Status>}
      description={head.line}
      right={
        <>
          <a className={buttonClass({ header: true })} href={`/course?cohort=${encodeURIComponent(co.id)}`} target="_blank" rel="noopener">
            <Icon name="r2Eye" size={16} strokeWidth={1.75} />
            Preview
          </a>
          <Menu
            label={`More for the ${head.label}`}
            items={[
              { label: 'New cohort…', onSelect: () => void navigate(NEW_COHORT_PATH) },
              { label: 'All settings', onSelect: () => void navigate(cohortPath(co.id, 'settings')) },
            ]}
            trigger={(t) => (
              <Button header style={{ width: 'var(--r2-cp)', padding: 0 }} aria-label={`More for the ${head.label}`} {...t.props} onClick={t.toggle}>
                <Icon name="r2More" size={16} strokeWidth={2.6} />
              </Button>
            )}
          />
        </>
      }
      counts={tabCounts}
    />
  );
}
