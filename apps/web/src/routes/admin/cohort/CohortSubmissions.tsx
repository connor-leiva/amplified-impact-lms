import { useMemo } from 'react';
import clsx from 'clsx';
import { useParams, useSearchParams } from 'react-router';
import { cohortRun } from '@ai/core';
import type { AIEmployee } from '@ai/core';
import { Page } from '../../../components/r2/Page';
import { PageHead, Sel, k } from '../../../components/r2/kit';
import { cohortLabel } from '../../../data/admin-shell';
import { useAct, useDb } from '../../../data/hooks';
import { SeatCardsCard } from '../SeatCardsCard';
import { SubmissionsCard } from '../SubmissionsCard';
import type { WeekDraft } from '../WeekBuilder.vm';
import { weekTitle } from '../program/program.vm';
import { cohortPath } from './cohort.vm';

// D-265 (R-5 Phase 6): the staff cards that show what teams sent for a week, `SubmissionsCard` and `SeatCardsCard`, left
// the week page for Cohort › Submissions (PLAN.md § 6.1: "Leave for Cohort › Submissions"). Here they are, unchanged
// (D-237's staff-only status and files-deleted line keep their rules), one of this cohort's weeks at a time (`?week=`).
// Phase 7 draws the tab with the mockup's four views (`CohortSubs`) and replaces this page; until then it is reached
// from a week's Basics, and its address names its cohort.

const noop = () => {};

export function Component() {
  const { cohortId = '' } = useParams();
  const db = useDb();
  const act = useAct();
  const [search, setSearch] = useSearchParams();
  const co = db.cohorts.find((c) => c.id === cohortId) ?? null;
  const weeks = useMemo(() => (co ? cohortRun(db, co.id).map((w) => ({ n: w.n, module: w.module })) : []), [db, co]);
  const asked = search.get('week');
  const pick = weeks.find((w) => w.module.id === asked) ?? weeks[0] ?? null;
  if (!co) return null;
  const draft = pick ? (pick.module as AIEmployee as WeekDraft) : null;
  return (
    <Page>
      <PageHead
        title="Submissions"
        back={{ to: cohortPath(co.id), label: cohortLabel(co) }}
        description="What teams turned in, one week at a time."
      />
      {weeks.length ? (
        <Sel
          aria-label="Week"
          value={pick?.module.id ?? ''}
          onChange={(e) => setSearch({ week: e.target.value }, { replace: true })}
        >
          {weeks.map((w) => (
            <option key={w.module.id} value={w.module.id}>
              Week {w.n} · {weekTitle(w.module)}
            </option>
          ))}
        </Sel>
      ) : null}
      {draft ? (
        <>
          <SubmissionsCard db={db} draft={draft} up={noop} act={act} />
          <SeatCardsCard db={db} draft={draft} up={noop} act={act} />
        </>
      ) : (
        <p className={clsx(k.p, k.s2)}>This cohort has no weeks yet.</p>
      )}
    </Page>
  );
}

export default Component;
