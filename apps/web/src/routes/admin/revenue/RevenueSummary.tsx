import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { isRevenuePeriod } from '@ai/core';
import type { RevenuePeriod } from '@ai/core';
import { ButtonLink } from '../../../components/r2/Button';
import { Card } from '../../../components/r2/Card';
import { Page } from '../../../components/r2/Page';
import { Status } from '../../../components/r2/Status';
import { Table } from '../../../components/r2/Table';
import type { Column } from '../../../components/r2/Table';
import { Bar, KV, PageHead, Sel, Skel, Stat, Two, k } from '../../../components/r2/kit';
import { BILLING_READ } from '../../../data/console';
import { useDb, useNow } from '../../../data/hooks';
import { useViewportWidth } from '../../../shell/hooks';
import { Denied } from '../../console/Denied';
import { LoadError } from '../../console/LoadError';
import { useConsoleGate } from '../../console/useConsoleGate';
import { useConsoleRecord } from '../../console/useConsoleData';
import { SkillPurchases } from '../../console/Billing';
import { billingSummaryVM } from '../../console/billing.vm';
import { REVIEW_SKILL_ROWS } from '../../console/users.vm';
import c from '../cohort/Cohort.module.css';
import { REVENUE_COPY as C, SECTION, revenueVM } from './revenue.vm';
import type { RevenueComingVM, RevenueProductVM, RevenueVM } from './revenue.vm';
import r from './Revenue.module.css';

// R-5 Phase 8 (D-269): Revenue › Summary (`/admin/revenue`), the mockup's `Revenue` (handoff/admin-mockup/ia-screens.jsx),
// as the R2 reference draws it (`Revenue` in AdminRedesign.jsx). The Period select (`?period=month`), the five figures
// (each opens the list it counts, or the section of this page that lists it), Cash By Month, a card per cohort that is
// selling or running and the Refunds card, By Product and Coming In. Every figure is the API's
// (`GET /api/console/billing/revenue`, `billing.read`); one Stripe could not give reads "Unavailable". Today's Skill
// Purchases list stays under them (D-269), drawn only when there is one.

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export function Component() {
  const gate = useConsoleGate('billing');
  const [params, setParams] = useSearchParams();
  const raw = params.get('period');
  const period: RevenuePeriod = isRevenuePeriod(raw) ? raw : 'all';
  const api = gate.kind === 'ready' ? gate.api : null;
  const db = useDb();
  const now = useNow();
  const phone = useViewportWidth() < 768;
  const record = useConsoleRecord(api, (a) => a.revenueSummary(period), `revenue:${period}`);
  // Today's Skill Purchases list (Billing's summary, D-163), kept under the mockup's sections.
  const summary = useConsoleRecord(api, (a) => a.billingSummary(), 'summary');
  const skills = useMemo(() => (summary.data ? billingSummaryVM(summary.data, null).skillPurchases : []), [summary.data]);
  const vm = useMemo(() => (record.data ? revenueVM(record.data, db, now) : null), [record.data, db, now]);
  // Billing was read, so the sidebar's "N failed" is known now.
  useEffect(() => {
    if (record.data) window.dispatchEvent(new Event(BILLING_READ));
  }, [record.data]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what="Revenue" role={gate.role} />;
  const review = import.meta.env.VITE_DATA_SOURCE === 'fixture' && params.get('review') === 'skills';
  const setPeriod = (p: string) => {
    const next = new URLSearchParams(params);
    if (p === 'month') next.set('period', 'month');
    else next.delete('period');
    setParams(next, { replace: true });
  };

  return (
    <Page>
      <PageHead
        title="Revenue"
        right={
          <Sel aria-label={C.period} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="all">{C.periods.all}</option>
            <option value="month">{C.periods.month}</option>
          </Sel>
        }
      />
      {gate.kind === 'error' ? (
        <LoadError failure={gate.failure} retry={gate.retry} />
      ) : record.status === 'error' && record.failure ? (
        <LoadError failure={record.failure} detail={record.detail} retry={record.retry} />
      ) : vm ? (
        <Summary vm={vm} phone={phone} />
      ) : (
        <Skel lines={5} />
      )}
      <SkillPurchases rows={review ? REVIEW_SKILL_ROWS : skills} />
    </Page>
  );
}

function Legend() {
  return (
    <>
      <span className={r.lg}>
        <i className={r.solid} />
        {C.chart.collected}
      </span>
      <span className={r.lg}>
        <i className={r.hat} />
        {C.chart.calendar}
      </span>
    </>
  );
}

function Summary({ vm, phone }: { vm: RevenueVM; phone: boolean }) {
  const navigate = useNavigate();
  const product: Column<RevenueProductVM>[] = [
    { key: 'product', label: C.products.product, width: 'minmax(160px,1.4fr)', value: (p) => p.product, cell: (p) => <Two a={p.product} b={p.line} /> },
    { key: 'collected', label: C.products.collected, width: '110px', num: true, value: (p) => p.collected },
    { key: 'still', label: C.products.still, width: '120px', num: true, hideLap: true, value: (p) => p.still },
    { key: 'total', label: C.products.total, width: '110px', num: true, value: (p) => p.total, cell: (p) => <span className={k.w5}>{p.total}</span> },
    { key: 'mrr', label: C.products.mrr, width: '100px', num: true, value: (p) => p.mrr },
  ];
  const coming: Column<RevenueComingVM>[] = [
    { key: 'when', label: C.coming.when, width: '120px', noSort: true, value: (x) => x.when },
    { key: 'from', label: C.coming.from, width: 'minmax(180px,1.3fr)', value: (x) => x.from, cell: (x) => <span className={clsx(k.w5, k.el, r.block)}>{x.from}</span> },
    { key: 'for', label: C.coming.for, width: 'minmax(190px,1.3fr)', hideLap: true, value: (x) => x.for },
    { key: 'amount', label: C.coming.amount, width: '96px', num: true, value: (x) => x.amount },
    { key: 'status', label: C.coming.status, width: '112px', value: (x) => x.status.label, cell: (x) => <Status tone={x.status.tone}>{x.status.label}</Status> },
  ];
  return (
    <>
      <div className={k.g5}>
        {vm.stats.map((s) => (
          <Stat
            key={s.key}
            label={s.label}
            value={s.value}
            sub={phone && s.subPhone ? s.subPhone : s.sub}
            tone={s.tone}
            {...('href' in s.to ? { to: s.to.href } : { onClick: () => scrollTo((s.to as { section: string }).section) })}
          />
        ))}
      </div>
      <div className={k.gms}>
        <Card
          title={C.chart.title}
          sub={C.chart.sub}
          right={
            phone ? undefined : (
              <span className={k.row} style={{ gap: 12 }}>
                <Legend />
              </span>
            )
          }
        >
          {vm.chart ? (
            <>
              <div className={r.rvc} role="img" aria-label={vm.chart.aria}>
                {vm.chart.months.map((m) => (
                  <div key={m.key} className={r.rvm}>
                    <span className={clsx(k.tn, k.me)}>{phone ? m.short : m.total}</span>
                    <span className={r.rvb}>
                      {m.calendar !== null ? <i className={r.hat} style={{ height: `${m.calendar}%` }} /> : null}
                      {m.collected !== null ? <i style={{ height: `${m.collected}%` }} /> : null}
                    </span>
                    <span className={clsx(k.w5, !m.now && k.mu)}>{m.label}</span>
                  </div>
                ))}
              </div>
              {phone ? (
                <div className={k.row} style={{ gap: 12, marginTop: 12 }}>
                  <Legend />
                </div>
              ) : null}
              <p className={clsx(k.p, k.me)} style={{ marginTop: 12 }}>
                {vm.chart.note}
              </p>
            </>
          ) : (
            <p className={clsx(k.p, k.me)}>Unavailable</p>
          )}
        </Card>
        <div className={k.col}>
          {vm.cards.map((cd) => (
            <Card key={cd.cohortId} title={cd.title} sub={cd.sub} right={<ButtonLink to={cd.people}>{C.card.people}</ButtonLink>}>
              <div className={clsx(k.col, k.colM)}>
                <Link to={cd.enrollment} className={c.rdy}>
                  <span className={clsx(c.rdyLabel, c.seats)}>{C.card.sold}</span>
                  <Bar pct={cd.seats.pct} kind={cd.seats.bar} />
                  <span className={clsx(k.tn, k.w5, c.rdn)} data-number="">
                    {cd.seats.text}
                  </span>
                </Link>
                <div className={c.kvTail}>
                  <KV
                    stacked
                    rows={[
                      { label: C.card.paid, value: cd.paid },
                      { label: C.card.twoPay, value: cd.twoPay },
                      { label: C.card.refunds, value: cd.refunds },
                    ]}
                  />
                </div>
              </div>
            </Card>
          ))}
          <Card title={C.refunds.title} sub={C.refunds.sub} right={<ButtonLink to="/admin/revenue/payments/refunds">{C.refunds.open}</ButtonLink>}>
            <span className={k.fig}>{vm.refunds.value}</span>
            {vm.refunds.line ? <p className={clsx(k.p, k.me)}>{vm.refunds.line}</p> : null}
          </Card>
        </div>
      </div>
      <div id={SECTION.products} className={r.anchor}>
        <Table
          title={C.products.title}
          label={C.products.title}
          cols={product}
          rows={vm.products}
          rowKey={(p) => p.key}
          onRow={(p) => navigate(p.to)}
          empty={{ icon: 'r2Billing', title: C.products.title }}
        />
      </div>
      <div id={SECTION.coming} className={r.anchor}>
        <Table
          title={C.coming.title}
          label={C.coming.title}
          right={vm.coming ? <span className={k.me}>{vm.coming.right}</span> : undefined}
          cols={coming}
          rows={vm.coming?.rows ?? []}
          rowKey={(x) => x.key}
          onRow={(x) => navigate(x.to)}
          empty={{ icon: 'r2Billing', title: vm.coming ? C.coming.empty : 'Unavailable' }}
        />
      </div>
    </>
  );
}
