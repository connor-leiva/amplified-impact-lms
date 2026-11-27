import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useParams } from 'react-router';
import { Icon } from '../../../components/Icon';
import { Button, ButtonLink } from '../../../components/r2/Button';
import { Card } from '../../../components/r2/Card';
import { Bar, KV, Pill, k } from '../../../components/r2/kit';
import { useDb, useNow } from '../../../data/hooks';
import { cohortPath, enrollmentPath, overviewVM } from './cohort.vm';
import { LinkFacts, Wn } from './parts';
import { WeeksDialog } from './dialogs';
import { useCohortFacts } from './useCohortFacts';
import c from './Cohort.module.css';

// D-255 (R-5 Phase 3): Cohort › Overview (`/admin/cohort/:cohortId`), the mockup's `CohortOverview`: the fact strip; "Before
// it opens" for a draft (Open enrollment's refusals, in order, each opening where to fix it) or "Needs you" for a cohort
// with people in it; the run; Readiness or Seats; Coming up; This Cohort's Shape. Every number opens what it counts.

export function Component() {
  const { cohortId = '' } = useParams();
  const db = useDb();
  const now = useNow();
  const facts = useCohortFacts(cohortId);
  const vm = useMemo(() => overviewVM(db, cohortId, now, facts), [db, cohortId, now, facts]);
  const [weeks, setWeeks] = useState(false);
  if (!vm) return null;
  return (
    <div className={k.col}>
      <LinkFacts items={vm.facts} />
      <div className={k.gms}>
        <div className={k.col}>
          {vm.before ? (
            <section className={k.cd}>
              <div className={k.cdh}>
                <div className={clsx(k.col, k.colS, c.grow)} style={{ gap: 0 }}>
                  <h2 className={k.h2}>Before It Opens</h2>
                  <span className={k.me}>
                    {vm.before.done} of {vm.before.total} done
                  </span>
                </div>
                {vm.before.left > 0 ? <Pill tone="warn">{vm.before.left} left</Pill> : <Pill tone="ok">Ready</Pill>}
              </div>
              <div className={c.wkl}>
                {vm.before.lines.map((l) => (
                  <Link key={l.key} to={l.to} className={clsx(c.nyr, c.tdo, l.done && (l.warn ? c.warn : c.ok))}>
                    <span className={c.tdc}>
                      {l.done ? <Icon name={l.warn ? 'r2Incidents' : 'r2Check'} size={12} strokeWidth={2.6} /> : null}
                    </span>
                    <span className={clsx(k.col, k.col0, c.grow)}>
                      <span className={clsx(k.w5, c.tdLabel)}>{l.label}</span>
                      <span className={k.me}>{l.detail}</span>
                    </span>
                    <Icon name="r2Chev" size={12} strokeWidth={2.2} />
                  </Link>
                ))}
              </div>
            </section>
          ) : vm.needs && vm.needs.length ? (
            <section className={k.cd}>
              <div className={k.cdh}>
                <div className={clsx(k.col, k.colS, c.grow)} style={{ gap: 0 }}>
                  <h2 className={k.h2}>Needs You</h2>
                  <span className={k.me}>Before the next live build</span>
                </div>
                <Pill tone="warn">{vm.needs.length}</Pill>
              </div>
              <div className={c.wkl}>
                {vm.needs.map((n) => (
                  <Link key={n.title} to={n.to} className={c.nyr}>
                    <span className={clsx(c.mt, n.tone === 'bad' && c.bad, n.tone === 'warn' && c.warn)}>
                      <Icon name={n.icon} size={16} strokeWidth={1.75} />
                    </span>
                    <span className={clsx(k.col, k.col0, c.grow)}>
                      <span className={k.w5}>{n.title}</span>
                      <span className={k.me}>{n.detail}</span>
                    </span>
                    <Icon name="r2Chev" size={12} strokeWidth={2.2} />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          <section className={k.cd}>
            <div className={k.cdh}>
              <div className={clsx(k.col, k.colS, c.grow)} style={{ gap: 0 }}>
                <h2 className={k.h2}>The Run</h2>
                <span className={k.me}>The weeks this cohort takes, when each opens, and when you meet</span>
              </div>
              <Button aria-label="Change this cohort’s weeks" onClick={() => setWeeks(true)}>
                Change weeks
              </Button>
            </div>
            <div className={c.wkl}>
              {vm.run.map((w) => (
                <Link key={w.id} to={w.to} className={clsx(c.nyr, c.rn, w.now && c.now)}>
                  <Wn n={w.n} draft={!w.published} />
                  <span className={clsx(k.col, k.col0, c.grow)}>
                    <span className={clsx(k.w5, k.el)}>{w.title}</span>
                    <span className={clsx(k.me, k.el)}>{w.line}</span>
                  </span>
                  {w.now ? (
                    <Pill tone="ok">{w.now}</Pill>
                  ) : !w.published ? (
                    <Pill>Draft</Pill>
                  ) : (
                    <span className={k.me}>Published</span>
                  )}
                  <Icon name="r2Chev" size={12} strokeWidth={2.2} />
                </Link>
              ))}
            </div>
          </section>
        </div>
        <div className={k.col}>
          {vm.readiness ? (
            <Card title="Readiness" sub={`Out of ${vm.teams} teams`}>
              <div className={clsx(k.col, k.colM)}>
                {vm.readiness.map((r) => (
                  <Link key={r.label} to={r.to} className={c.rdy}>
                    <span className={c.rdyLabel}>{r.label}</span>
                    <Bar pct={vm.teams ? (100 * r.n) / vm.teams : 0} />
                    <span className={clsx(k.tn, k.w5, c.rdn)}>
                      {r.n} of {vm.teams}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          ) : (
            <Card title="Seats" right={<ButtonLink to={cohortPath(cohortId, 'people')}>People</ButtonLink>}>
              <div className={clsx(k.col, k.colM)}>
                <Link to={enrollmentPath(cohortId)} className={c.rdy}>
                  <span className={clsx(c.rdyLabel, c.seats)}>Seats taken</span>
                  <Bar pct={vm.seats.cap ? (100 * (vm.seats.taken ?? 0)) / vm.seats.cap : 0} />
                  <span className={clsx(k.tn, k.w5, c.rdn)}>
                    {vm.seats.taken ?? 0} of {vm.seats.cap}
                  </span>
                </Link>
                <p className={clsx(k.p, k.me)}>{vm.seats.note}</p>
              </div>
            </Card>
          )}
          <Card title="Coming Up" right={<ButtonLink to={cohortPath(cohortId, 'schedule')}>Schedule</ButtonLink>}>
            <div className={clsx(k.col, k.colM)}>
              {vm.coming.length ? (
                vm.coming.map((s) => (
                  <Link key={s.id} to={cohortPath(cohortId, 'schedule')} className={c.rnw}>
                    <span className={c.dt}>
                      <b>{s.day}</b>
                      <span>{s.mon}</span>
                    </span>
                    <span className={clsx(k.col, k.col0, c.grow)}>
                      <span className={clsx(k.w5, k.el)}>{s.title}</span>
                      <span className={k.me}>{s.line}</span>
                    </span>
                    {s.flag ? <Pill tone="warn">{s.flag}</Pill> : null}
                  </Link>
                ))
              ) : (
                <p className={clsx(k.p, k.s2)}>No sessions yet.</p>
              )}
            </div>
          </Card>
          <Card
            title="This Cohort’s Shape"
            right={<ButtonLink to={cohortPath(cohortId, 'settings')}>Settings</ButtonLink>}
          >
            <div className={c.kvTail}>
              <KV
                stacked
                rows={[
                  { label: 'Promise', value: vm.shape.promise },
                  { label: 'Meets', value: vm.shape.meets },
                  {
                    label: 'Seats',
                    value: (
                      <Link className={k.lk} to={enrollmentPath(cohortId)}>
                        {vm.shape.seats}
                      </Link>
                    ),
                  },
                  { label: 'Price', value: vm.shape.price ?? <Pill tone="warn">Not set</Pill> },
                ]}
              />
            </div>
          </Card>
        </div>
      </div>
      {weeks ? <WeeksDialog cohortId={cohortId} onClose={() => setWeeks(false)} /> : null}
    </div>
  );
}

export default Component;
