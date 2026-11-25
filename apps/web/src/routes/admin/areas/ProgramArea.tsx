import { useMemo } from 'react';
import { Pill } from '../../../components/r2/kit';
import { PROGRAM_KEY } from '../../../data/admin-shell';
import { useDb } from '../../../data/hooks';
import { programLogo } from '../../../home/program-logo';
import { useAdminChrome } from '../../../shell/admin/chrome';
import { Area } from './Area';
import { AREA_COPY as C, areaCounts } from './area.vm';
import a from './Area.module.css';

// D-253: Program (`/admin/program`), what you teach: Curriculum, Course settings (D-174's page, now reachable from the
// sidebar) and the Resource Vault (the mockup's `ProgramArea`). A week (today's Module Builder) is a record of
// Curriculum's at `/admin/program/weeks/:moduleId`, outside the tabs.

const TILE = `data:image/svg+xml,${encodeURIComponent(programLogo(PROGRAM_KEY, { variant: 'tile', size: 32, title: '' }))}`;

export function Component() {
  const db = useDb();
  const { counts, cohort } = useAdminChrome();
  const tabCounts = useMemo(() => areaCounts(db, 'program', cohort.id ?? '', counts), [db, cohort.id, counts]);
  return (
    <Area
      area="program"
      cohortId={cohort.id ?? ''}
      title={
        <span className={a.programTitle}>
          <img className={a.tile} src={TILE} width={32} height={32} alt="" />
          {C.program.title}
        </span>
      }
      meta={<Pill tone="neutral">{C.program.meta}</Pill>}
      description={C.program.description}
      counts={tabCounts}
    />
  );
}
