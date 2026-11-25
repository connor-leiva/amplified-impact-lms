import { useMemo } from 'react';
import { useDb } from '../../../data/hooks';
import { useAdminChrome } from '../../../shell/admin/chrome';
import { Area } from './Area';
import { AREA_COPY as C, areaCounts } from './area.vm';

// D-253: Revenue (`/admin/revenue`), what was paid: Summary (Billing's own Summary until Phase 8), Payments (Billing's
// five lists, each at its own address, `/admin/revenue/payments/:tab`), Plans & upgrades (today's Tiers & Upgrades)
// and Usage (the mockup's `RevenueArea`).

export function Component() {
  const db = useDb();
  const { counts, cohort } = useAdminChrome();
  const tabCounts = useMemo(() => areaCounts(db, 'revenue', cohort.id ?? '', counts), [db, cohort.id, counts]);
  return <Area area="revenue" cohortId={cohort.id ?? ''} title={C.revenue.title} description={C.revenue.description} counts={tabCounts} />;
}
