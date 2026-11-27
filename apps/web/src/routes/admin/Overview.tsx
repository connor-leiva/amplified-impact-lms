import { Fragment, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { ButtonLink } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { PageHead, Pill, k } from '../../components/r2/kit';
import { BILLING_READ } from '../../data/console';
import { PROGRAM_KEY } from '../../data/admin-shell';
import { useDb, useNow } from '../../data/hooks';
import { programLogo } from '../../home/program-logo';
import { areaTabs } from '../../shell/admin/adminNav';
import { useAdminChrome } from '../../shell/admin/chrome';
import { useConsoleGate } from '../console/useConsoleGate';
import { useConsoleRecord } from '../console/useConsoleData';
import { useAudiences } from './people/useAudiences';
import { STATUS_TONE } from './cohort/cohort.vm';
import { HOME_COPY as C, homeCohorts, homeVM } from './Overview.vm';
import { useCohortsWaiting, useOverviewFacts } from './useOverviewFacts';
import c from './cohort/Cohort.module.css';
import p from './people/People.module.css';
import s from './Overview.module.css';

// R-5 Phase 9 (D-270): the admin's Overview (`/admin`), the mockup's `Home` (handoff/admin-mockup/p3-areas.jsx), as the R2
// reference draws it (`Overview` in AdminRedesign.jsx): four tiles, each opening its page; Needs You, grouped by cohort,
// then payments and the system; Who Has a Sign-In, the audience bar; Cohorts, with New cohort; and Coming Up across
// cohorts. Markup only: every figure and word is `homeVM`'s. It replaces today's five stats, chart, feed, funnel and
// attendance (D-160 R2-3), and their Export report and New AI Employee buttons, which the mockup's `Home` doesn't have.
//
// It reads the snapshot (the roster, the cohorts and their sessions, the program's weeks, the upgrade requests), every
// cohort's facts in one request without Stripe (`GET /api/admin/overview`), People's counts (`…/users/audiences`) and
// Phase 8's Revenue summary through the Console's cached Stripe read (`…/billing/revenue`): never a Stripe call of its own.

const TILE = `data:image/svg+xml,${encodeURIComponent(programLogo(PROGRAM_KEY, { variant: 'tile', size: 32, title: '' }))}`;
const DOT: Record<string, string | undefined> = { for: p.for, ok: p.ok, mint: p.mint, info: p.info, warn: p.warn, off: p.off };

export function Component() {
  const db = useDb();
  const now = useNow(60_000);
  const { cohort, counts, role } = useAdminChrome();
  const open = useMemo(
    () => ({
      program: areaTabs('program', role).length > 0,
      cohort: areaTabs('cohort', role).length > 0,
      people: areaTabs('people', role).some((t) => t.id === 'everyone'),
      revenue: areaTabs('revenue', role).some((t) => t.id === 'summary'),
    }),
    [role],
  );
  const canPlans = useMemo(() => areaTabs('revenue', role).some((t) => t.id === 'plans'), [role]);
  const ids = useMemo(() => homeCohorts(db).map((x) => x.id), [db]);
  const facts = useOverviewFacts(open.cohort ? ids : []);
  const running = useMemo(() => homeCohorts(db).filter((x) => x.status !== 'draft').map((x) => x.id), [db]);
  const waiting = useCohortsWaiting(running, cohort.id, counts.waiting, open.cohort);
  const audiences = useAudiences(open.people);
  const gate = useConsoleGate(null);
  const api = gate.kind === 'ready' && open.revenue ? gate.api : null;
  const revenue = useConsoleRecord(api, (a) => a.revenueSummary('all'), 'revenue:all');
  // Billing was read, so the sidebar's "N failed" is known now (as Revenue › Summary does).
  useEffect(() => {
    if (revenue.data) window.dispatchEvent(new Event(BILLING_READ));
  }, [revenue.data]);

  const vm = useMemo(
    () =>
      homeVM({
        db,
        now,
        cohortId: cohort.id,
        open,
        facts,
        waiting,
        audiences,
        revenue: revenue.data,
        counts,
        canBilling: open.revenue,
        canPlans,
      }),
    [db, now, cohort.id, open, facts, waiting, audiences, revenue.data, counts, canPlans],
  );

  return (
    <Page>
      <PageHead title={C.title} description={C.description} />

      {vm.tiles.length ? (
        <div className={s.thr}>
          {vm.tiles.map((t) => (
            <Link key={t.key} to={t.to} className={clsx(k.cd, s.thl)}>
              <span className={s.tlk}>
                <span className={clsx(c.mt, s.tmt)}>
                  <Icon name={t.icon} size={14} strokeWidth={1.75} />
                </span>
                <span>{t.label}</span>
                <Icon name="r2Chev" size={12} strokeWidth={2.2} />
              </span>
              <span className={clsx(k.fig, k.el, s.fig)} data-number="">
                {t.value}
              </span>
              <span className={clsx(k.me, s.line)} data-number="">
                {t.line}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className={k.gms}>
        <div className={k.col}>
          {vm.needs.total > 0 ? (
            <section className={k.cd}>
              <div className={k.cdh}>
                <div className={clsx(k.col, k.colS, c.grow)} style={{ gap: 0 }}>
                  <h2 className={k.h2}>{C.needs.title}</h2>
                  <span className={k.me}>{C.needs.sub}</span>
                </div>
                <Pill tone="warn">{vm.needs.total}</Pill>
              </div>
              <div className={c.wkl}>
                {vm.needs.groups.map((g) => (
                  <Fragment key={g.key}>
                    <div className={s.ngl}>{g.label}</div>
                    {g.rows.map((n) => (
                      <Link key={n.key} to={n.to} className={c.nyr}>
                        <span className={clsx(c.mt, n.tone === 'bad' && c.bad, n.tone === 'warn' && c.warn)}>
                          <Icon name={n.icon} size={16} strokeWidth={1.75} />
                        </span>
                        <span className={clsx(k.col, k.col0, c.grow)}>
                          <span className={k.w5} data-number="">
                            {n.title}
                          </span>
                          <span className={k.me}>{n.detail}</span>
                        </span>
                        <Icon name="r2Chev" size={12} strokeWidth={2.2} />
                      </Link>
                    ))}
                  </Fragment>
                ))}
              </div>
            </section>
          ) : null}
          {vm.audience ? (
            <Card title={C.audience.title} sub={vm.audience.line} right={<ButtonLink to="/admin/people">{C.audience.people}</ButtonLink>}>
              <div className={clsx(k.col, k.colM)}>
                <div className={s.aub} aria-hidden="true">
                  {vm.audience.segments.map((a) => (
                    <i key={a.key} className={DOT[a.tone]} style={{ flex: a.count }} />
                  ))}
                </div>
                <div className={s.aul} role="group" aria-label={C.audience.label}>
                  {vm.audience.segments.map((a) => (
                    <Link key={a.key} to={a.to} className={s.auk}>
                      <i className={DOT[a.tone]} aria-hidden="true" />
                      <span className={clsx(k.col, k.col0)}>
                        <span className={clsx(k.w5, k.tn, s.n)} data-number="">
                          {a.count}
                        </span>
                        <span className={k.me}>{a.label}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}
        </div>
        <div className={k.col}>
          <Card
            title={C.cohorts.title}
            right={
              cohort.create ? (
                <ButtonLink icon="r2Plus" to="/admin/cohort/new">
                  {C.cohorts.create}
                </ButtonLink>
              ) : null
            }
          >
            <div className={clsx(k.col, k.colM)}>
              {vm.cohorts.map((co) => (
                <Link key={co.id} to={co.to} className={c.rnw}>
                  <img className={c.tile} src={TILE} width={32} height={32} alt="" />
                  <span className={clsx(k.col, k.col0, c.grow)}>
                    <span className={clsx(k.w5, k.el)}>{co.name}</span>
                    <span className={clsx(k.me, k.el)} data-number="">
                      {co.line}
                    </span>
                  </span>
                  <Status tone={STATUS_TONE[co.status]}>{co.status}</Status>
                </Link>
              ))}
            </div>
          </Card>
          <Card title={C.coming.title} right={<ButtonLink to={vm.schedule}>{C.coming.schedule}</ButtonLink>}>
            <div className={clsx(k.col, k.colM)}>
              {vm.coming.length ? (
                vm.coming.map((x) => (
                  <Link key={x.key} to={x.to} className={c.rnw}>
                    <span className={c.dt}>
                      <b>{x.day}</b>
                      <span>{x.mon}</span>
                    </span>
                    <span className={clsx(k.col, k.col0, c.grow)}>
                      <span className={clsx(k.w5, k.el)}>{x.title}</span>
                      <span className={clsx(k.me, k.el)}>{x.line}</span>
                    </span>
                    {x.flag ? <Pill tone="warn">{x.flag}</Pill> : null}
                  </Link>
                ))
              ) : (
                <p className={clsx(k.p, k.s2)}>{C.coming.none}</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

export default Component;
