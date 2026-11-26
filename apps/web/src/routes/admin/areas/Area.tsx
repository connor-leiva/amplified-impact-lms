import type { ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Page } from '../../../components/r2/Page';
import { AreaProvider } from '../../../components/r2/area-context';
import { PageHead, Tabs } from '../../../components/r2/kit';
import { AREAS, areaTabs, placeOf, tabPath } from '../../../shell/admin/adminNav';
import type { AreaId } from '../../../shell/admin/adminNav';
import { useAdminChrome } from '../../../shell/admin/chrome';
import { useViewportWidth } from '../../../shell/hooks';
import type { TabCounts } from './area.vm';
import a from './Area.module.css';

// D-253 (R-5 Phase 1, ADMIN-RESTRUCTURE-SPEC.md § 3): one of the four pages (the mockup's `Area`). Its head carries the
// title, and its tabs with their counts; the tab's page is drawn under them, inside the area (`AreaProvider`), where it
// shows its title once: it keeps its description and its actions and drops its own h1, and its own tabs become a
// segmented control (`PageHead`, `Tabs`). A tab the viewer's role can't open is not drawn (rule 5); its page still
// answers at its address, as it did before (Denied, or Masquerade's lock card for Support).

export function Area({
  area,
  title,
  meta,
  description,
  right,
  cohortId,
  counts,
}: {
  area: AreaId;
  title: ReactNode;
  meta?: ReactNode;
  description?: string;
  /** D-255: the page's own actions, beside its title (the Cohort page's Preview and its menu). */
  right?: ReactNode;
  cohortId: string;
  counts: TabCounts;
}) {
  const { role } = useAdminChrome();
  const phone = useViewportWidth() < 768;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tabs = areaTabs(area, role);
  // A page's own address is its first tab the role may open.
  const value = placeOf(pathname)?.tab ?? tabs[0]?.id ?? '';
  // A tab the role may not open isn't drawn, but its address still answers as it did before D-253 (Denied, or
  // Masquerade's lock card for Support): the page alone, as it was, with its own title, under no frame of tabs it
  // isn't one of. Nothing a role could open is closed to it, and nothing is newly open.
  if (!tabs.some((t) => t.id === value)) return <Outlet />;
  return (
    <Page>
      <PageHead title={title} meta={meta} description={description} right={right} />
      <Tabs
        className={a.tabs}
        label={AREAS[area].label}
        phone={phone}
        value={value}
        onChange={(t) => navigate(tabPath(area, t, cohortId))}
        tabs={tabs.map((t) => ({ id: t.id, label: t.label, ...(counts[t.id] !== undefined ? { count: counts[t.id] } : {}) }))}
      />
      <AreaProvider value={true}>
        <div className={a.atb}>
          <Outlet />
        </div>
      </AreaProvider>
    </Page>
  );
}
