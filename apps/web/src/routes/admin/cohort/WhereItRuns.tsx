import clsx from 'clsx';
import { Link } from 'react-router';
import { LAYOUT_KIND_LABEL, cohortRun, fmt } from '@ai/core';
import type { Db } from '@ai/core';
import { Icon } from '../../../components/Icon';
import { Card } from '../../../components/r2/Card';
import { k } from '../../../components/r2/kit';
import { cohortLabel } from '../../../data/admin-shell';
import { cohortPath } from './cohort.vm';
import c from './Cohort.module.css';

// D-255 (R-5 Phase 3, "one editor at a time"): a week's dates and sessions are its cohort's, so the week builder no
// longer edits them. In their place, the mockup's "Where it runs" (`WeekEdit`'s Basics): a line per cohort that runs the
// week, its number and opening there, each a link to that cohort's Dates and Release; and its sessions, read-only, each
// a link to that cohort's Schedule, where sessions are edited (spec § 4, rule 4).

export interface WhereRow {
  cohortId: string;
  n: number;
  title: string;
  line: string;
}

/** Each cohort that runs this week: "Week 2 of the January 2027 Cohort", "Opens Sun, Jan 10 · 12:00 PM MT / 1:00 PM CT · meets …". */
export function whereItRuns(db: Db, moduleId: string): WhereRow[] {
  return db.cohorts
    .filter((co) => co.archivedAt === undefined)
    .flatMap((co) => {
      const w = cohortRun(db, co.id).find((x) => x.module.id === moduleId);
      if (!w) return [];
      const meets = db.sessions
        .filter((s) => s.cohortId === co.id && s.moduleId === moduleId)
        .sort((a, b) => a.start - b.start);
      const opens = w.opensAt ?? (w.n === 0 ? (co.previewOpensAt ?? null) : null);
      return [
        {
          cohortId: co.id,
          n: w.n,
          title: `Week ${w.n} of the ${cohortLabel(co)}`,
          line: `${opens !== null ? `Opens ${fmt.mtDay(opens)} · ${fmt.mtCt(opens)}` : 'Open with the course'}${meets.length ? ` · meets ${meets.map((s) => fmt.mtDay(s.start)).join(' and ')}` : ''}${w.dueAt !== null ? ` · due ${fmt.mtDay(w.dueAt)}` : ''}`,
        },
      ];
    });
}

/** "Where it runs", the lines, for the week builder's details. */
export function WhereItRuns({ db, moduleId }: { db: Db; moduleId: string }) {
  const rows = whereItRuns(db, moduleId);
  return (
    <div className={c.lab}>
      <span>Where it runs</span>
      <span className={c.fat}>A week’s number and its date come from the cohort, not from the week.</span>
      {rows.length ? (
        <div className={clsx(k.col, k.colM)}>
          {rows.map((r) => (
            <Link key={r.cohortId} to={`${cohortPath(r.cohortId, 'settings')}#dates`} className={c.rnw}>
              <span className={clsx(c.wn, c.sm, c.pk)}>{r.n}</span>
              <span className={clsx(k.col, k.col0, c.grow)}>
                <span className={clsx(k.w5, k.el)}>{r.title}</span>
                <span className={k.me}>{r.line}</span>
              </span>
              <Icon name="r2Chev" size={12} strokeWidth={2.2} />
            </Link>
          ))}
        </div>
      ) : (
        <div className={k.note}>
          <span className={k.s2}>No cohort runs this week yet. Add it from a cohort’s Overview, under The Run.</span>
        </div>
      )}
    </div>
  );
}

/** The week's sessions, read-only, each opening its cohort's Schedule (the mockup's Live sessions). */
export function WeekSessionsReadOnly({ db, moduleId }: { db: Db; moduleId: string }) {
  const rows = db.sessions.filter((s) => s.moduleId === moduleId).sort((a, b) => a.start - b.start);
  return (
    <Card
      title={`Sessions · ${rows.length}`}
      sub="Sessions belong to the cohort. This week only says what happens in them."
    >
      <div className={clsx(k.col, k.colM)}>
        {rows.length ? (
          rows.map((s) => {
            const co = db.cohorts.find((x) => x.id === s.cohortId);
            return (
              <Link key={s.id} to={cohortPath(s.cohortId, 'schedule')} className={c.rnw}>
                <span className={c.mt}>
                  <Icon name={s.kind === 'live_build' ? 'r2Play' : 'r2Community'} size={16} strokeWidth={1.75} />
                </span>
                <span className={clsx(k.col, k.col0, c.grow)}>
                  <span className={clsx(k.w5, k.el)}>{s.title}</span>
                  <span className={k.me}>
                    {fmt.mtDay(s.start)} · {fmt.mtCt(s.start)}
                    {s.kind ? ` · ${LAYOUT_KIND_LABEL[s.kind]}` : ''}
                    {co ? ` · ${cohortLabel(co)}` : ''}
                  </span>
                </span>
                <Icon name="r2Chev" size={12} strokeWidth={2.2} />
              </Link>
            );
          })
        ) : (
          <p className={clsx(k.p, k.s2)}>No cohort has sessions for this week yet.</p>
        )}
        <p className={clsx(k.p, k.me)}>Sessions are edited in each cohort’s Schedule.</p>
      </div>
    </Card>
  );
}
