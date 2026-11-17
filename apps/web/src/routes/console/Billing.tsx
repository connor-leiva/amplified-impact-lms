import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate, useParams } from 'react-router';
import { SEAT_TIER_GATED, consoleCan } from '@ai/core';
import type { BillingActionResult } from '@ai/core';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import type { MenuEntry } from '../../components/r2/Menu';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Bar, KV, Locked, PageHead, Pill, Skel, Stat, Tabs, Two, k } from '../../components/r2/kit';
import { masqueradeActive } from '../../data/console';
import type { BillingListKind, BillingRows, ConsoleApi } from '../../data/console';
import { useAdminChrome } from '../../shell/admin/chrome';
import { useViewportWidth } from '../../shell/hooks';
import { BillingActionDialog } from './BillingAction';
import { Denied, NotFound } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsolePages, useConsoleRecord } from './useConsoleData';
import {
  BILLING_COPY as C,
  BILLING_TABS,
  actionTarget,
  billingSummaryVM,
  billingTabPath,
  customerVM,
  failedVM,
  invoiceVM,
  isBillingTab,
  refundVM,
  subscriptionVM,
} from './billing.vm';
import type {
  ActionTarget,
  BillingSummaryVM,
  BillingTab,
  CustomerVM,
  FailedVM,
  InvoiceVM,
  PlanRowVM,
  RefundVM,
  SubscriptionVM,
} from './billing.vm';

// /admin/billing[/:tab] on R2 (D-163, spec § 7.6): the mockup's `Billing()`. The Summary (MRR,
// subscriptions, failed payments, refunds; the plan lines; the AI Accelerator with its D-154 seat count
// and its view-only cap) and five lists from Stripe. A row opens its workspace when one matches.
// A row's "…" is drawn only where the mockup draws one (Invoices, Failed payments; no chrome it doesn't
// draw, the shepherd's eye check), and there it also offers "View in Stripe". D-164: Invoices' "Refund…"
// and "Void invoice…" open their confirmed dialogs for Owner and Admin (danger items, as the mockup draws
// them), are hidden for Support (spec § 7.6) and locked during a masquerade; afterwards the lists and the
// summary are read again. An invoice on a Team Plan subscription's "…" also draws "Change seat tier…",
// disabled with its reason: its gate failed (spec § 15).

const stripe = (url: string | null): MenuEntry[] =>
  url ? [{ label: C.menu.stripe, onSelect: () => void window.open(url, '_blank', 'noopener') }] : [];

export function Component() {
  const { tab: raw } = useParams();
  const tab: BillingTab | null = raw === undefined ? 'summary' : isBillingTab(raw) && raw !== 'summary' ? raw : null;
  const gate = useConsoleGate('billing');
  const navigate = useNavigate();
  const phone = useViewportWidth() < 768;
  const api = gate.kind === 'ready' ? gate.api : null;
  const { toast } = useAdminChrome();
  // D-164: the open refund or void dialog, and a count that reads Billing again after one succeeds.
  const [acting, setActing] = useState<ActionTarget | null>(null);
  const [version, setVersion] = useState(0);
  const summary = useConsoleRecord(api, (a) => a.billingSummary(), `summary:${version}`);
  // The fixture's sample qualifiers (the mockup's "· sample"); the http client has none.
  const vm = useMemo(
    () => (summary.data ? billingSummaryVM(summary.data, api?.billingSample?.() ?? null) : null),
    [summary.data, api],
  );

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;
  if (tab === null) return <NotFound />;
  // Support reads billing and changes nothing (D3): the head says so, and the actions are hidden.
  const canAct = gate.kind === 'ready' && consoleCan(gate.me.role, 'billing.refund');
  const ro = gate.kind === 'ready' && !canAct;
  const can = {
    refund: canAct,
    void: gate.kind === 'ready' && consoleCan(gate.me.role, 'billing.void'),
    tier: gate.kind === 'ready' && consoleCan(gate.me.role, 'billing.seat_tier'),
  };
  const done = (r: BillingActionResult) => {
    setActing(null);
    toast(C.action.toast[r.action]);
    setVersion((n) => n + 1);
  };
  const tabs = BILLING_TABS.map((id) => ({
    id,
    label: C.tabs[id],
    ...(id === 'failed' && vm ? { count: vm.failedCount } : {}),
  }));

  return (
    <Page>
      <PageHead
        title={C.title}
        meta={ro ? <Pill tone="neutral">{C.readOnly}</Pill> : undefined}
        description={C.description}
      />
      <Tabs tabs={tabs} value={tab} onChange={(t) => navigate(billingTabPath(t))} phone={phone} label={C.sections} />
      {gate.kind === 'error' ? (
        <LoadError failure={gate.failure} retry={gate.retry} />
      ) : tab === 'summary' ? (
        summary.status === 'error' && summary.failure ? (
          <LoadError failure={summary.failure} detail={summary.detail} retry={summary.retry} />
        ) : (
          <Summary vm={vm} />
        )
      ) : api ? (
        <List key={tab} kind={tab} api={api} can={can} version={version} act={setActing} open={(href) => navigate(href)} />
      ) : (
        <Skel lines={3} />
      )}
      {acting && api ? <BillingActionDialog api={api} target={acting} onClose={() => setActing(null)} onDone={done} /> : null}
    </Page>
  );
}

function Summary({ vm }: { vm: BillingSummaryVM | null }) {
  const cols: Column<PlanRowVM>[] = [
    {
      key: 'plan',
      label: C.plans.plan,
      width: 'minmax(180px,1.4fr)',
      value: (r) => r.plan,
      cell: (r) => <span className={k.w5}>{r.plan}</span>,
    },
    { key: 'price', label: C.plans.price, width: 'minmax(160px,1fr)', value: (r) => r.price },
    { key: 'active', label: C.plans.active, width: 'minmax(110px,1fr)', value: (r) => r.active },
    { key: 'mrr', label: C.plans.mrr, width: '96px', num: true, value: (r) => r.mrr },
  ];
  const a = vm?.accelerator;
  return (
    <>
      {vm ? (
        <div className={k.g4}>
          {vm.stats.map((s) => (
            <Stat key={s.key} label={s.label} value={s.value} sub={s.sub} tone={s.tone} to={s.to} />
          ))}
        </div>
      ) : (
        <Skel lines={3} />
      )}
      <Table
        title={vm?.plansTitle ?? C.plans.title}
        label={C.plans.title}
        cols={cols}
        rows={vm?.plans ?? []}
        rowKey={(r) => r.key}
        loading={!vm}
        empty={{ icon: 'r2Billing', title: C.empty.subscriptions }}
      />
      {a ? (
        <Card
          title={C.accelerator.title}
          right={a.status ? <Status tone={a.status.tone}>{a.status.label}</Status> : undefined}
        >
          <KV
            rows={[
              { label: C.accelerator.price, value: a.price },
              {
                label: C.accelerator.sold,
                value: (
                  <span className={clsx(k.row, k.nw)} style={{ maxWidth: 260 }}>
                    <Bar pct={a.seats.pct} kind={a.seats.bar} />
                    <span className={k.tn}>{a.seats.text}</span>
                  </span>
                ),
              },
              { label: C.accelerator.cap, value: <Locked>{a.cap}</Locked> },
              { label: C.accelerator.collected, value: a.collected },
              { label: C.accelerator.second, value: a.second },
            ]}
          />
        </Card>
      ) : (
        <Skel />
      )}
    </>
  );
}

const status = (s: { label: string; tone: Parameters<typeof Status>[0]['tone'] }) => (
  <Status tone={s.tone}>{s.label}</Status>
);

function List({
  kind,
  api,
  can,
  version,
  act,
  open,
}: {
  kind: BillingListKind;
  api: ConsoleApi;
  can: { refund: boolean; void: boolean; tier: boolean };
  version: number;
  act: (t: ActionTarget) => void;
  open: (href: string) => void;
}) {
  const list = useConsolePages(api, (a, cursor) => a.billingList(kind, cursor), `${kind}:${version}`);
  if (list.status === 'error' && list.failure)
    return <LoadError failure={list.failure} detail={list.detail} retry={list.retry} />;
  const common = {
    loading: list.status === 'loading',
    empty: { icon: kind === 'failed' ? ('r2Check' as const) : ('r2Billing' as const), title: C.empty[kind] },
    footer: list.next ? (
      <div className={k.more}>
        <Button kind="quiet" onClick={list.more} disabled={list.loadingMore}>
          {C.more}
        </Button>
      </div>
    ) : null,
  };
  const openRow = (r: { href: string | null }) => (r.href ? open(r.href) : undefined);
  const customer = (r: { href: string | null }): MenuEntry[] =>
    r.href ? [{ label: C.menu.open, onSelect: () => open(r.href!) }] : [];
  /** This tab's rows (its kind's, as the API answered them), through its view-model. */
  const rows = <R extends BillingRows[BillingListKind], V>(map: (r: R) => V): V[] => (list.rows as R[]).map(map);

  if (kind === 'customers') {
    const cols: Column<CustomerVM>[] = [
      {
        key: 'n',
        label: C.columns.customer,
        width: 'minmax(180px,1.4fr)',
        value: (r) => r.name,
        cell: (r) => <Two a={r.name} b={r.id} mono />,
      },
      { key: 'plan', label: C.columns.plan, width: 'minmax(150px,1fr)', value: (r) => r.plan },
      { key: 'mrr', label: C.columns.mrr, width: '96px', num: true, value: (r) => r.mrr },
      {
        key: 'st',
        label: C.columns.status,
        width: '104px',
        value: (r) => r.status.label,
        cell: (r) => status(r.status),
      },
    ];
    return (
      <Table
        label={C.tabs.customers}
        cols={cols}
        rows={rows(customerVM)}
        rowKey={(r) => r.key}
        onRow={openRow}
        {...common}
      />
    );
  }
  if (kind === 'subscriptions') {
    const cols: Column<SubscriptionVM>[] = [
      { key: 'sub', label: C.columns.subscription, mono: true, width: 'minmax(170px,1.2fr)', value: (r) => r.id },
      { key: 'n', label: C.columns.workspace, width: 'minmax(150px,1fr)', value: (r) => r.workspace },
      { key: 'plan', label: C.columns.plan, width: 'minmax(150px,1fr)', hideLap: true, value: (r) => r.plan },
      { key: 'mrr', label: C.columns.mrr, width: '96px', num: true, value: (r) => r.mrr },
      {
        key: 'st',
        label: C.columns.status,
        width: '104px',
        value: (r) => r.status.label,
        cell: (r) => status(r.status),
      },
    ];
    // D-164: the spec's seat tier (D4), drawn on a Team Plan subscription and disabled with its reason:
    // the webhook doesn't re-derive seats on a tier change, so there is no endpoint (spec § 15).
    const tier = (r: SubscriptionVM): MenuEntry[] =>
      can.tier && r.teamPlan ? ['separator', { label: C.menu.seatTier, unavailable: SEAT_TIER_GATED, onSelect: () => {} }] : [];
    return (
      <Table
        label={C.tabs.subscriptions}
        cols={cols}
        rows={rows(subscriptionVM)}
        rowKey={(r) => r.key}
        onRow={openRow}
        {...common}
      />
    );
  }
  if (kind === 'invoices') {
    const cols: Column<InvoiceVM>[] = [
      { key: 'id', label: C.columns.invoice, mono: true, width: 'minmax(150px,1.2fr)', value: (r) => r.id },
      { key: 'c', label: C.columns.customer, width: 'minmax(150px,1.2fr)', value: (r) => r.customer },
      { key: 'card', label: C.columns.method, width: 'minmax(140px,1fr)', hideLap: true, value: (r) => r.card },
      { key: 'amt', label: C.columns.amount, width: '96px', num: true, value: (r) => r.amount },
      {
        key: 'st',
        label: C.columns.status,
        width: '104px',
        value: (r) => r.status.label,
        cell: (r) => status(r.status),
      },
      { key: 'd', label: C.columns.date, width: '104px', noSort: true, value: (r) => r.at, cell: (r) => r.date },
    ];
    // D-164: the two confirmed actions, danger items as the mockup draws them; hidden for Support (spec
    // § 7.6); locked during a masquerade, as the mockup's guarded items are (the Console is paused then).
    const item = (label: string, action: 'refund' | 'void', r: InvoiceVM): MenuEntry[] => [
      'separator',
      masqueradeActive()
        ? { label, locked: true, title: C.blocked, onSelect: () => {} }
        : { label, danger: true, onSelect: () => act(actionTarget(action, r)) },
    ];
    const actions = (r: InvoiceVM): MenuEntry[] =>
      r.refund && can.refund ? item(C.menu.refund, 'refund', r) : r.void && can.void ? item(C.menu.void, 'void', r) : [];
    return (
      <Table
        label={C.tabs.invoices}
        cols={cols}
        rows={rows(invoiceVM)}
        rowKey={(r) => r.key}
        onRow={openRow}
        menu={(r) => [...customer(r), ...stripe(r.stripe), ...actions(r)]}
        {...common}
      />
    );
  }
  if (kind === 'failed') {
    const cols: Column<FailedVM>[] = [
      {
        key: 'c',
        label: C.columns.customer,
        width: 'minmax(170px,1.2fr)',
        value: (r) => r.customer,
        cell: (r) => <span className={k.w5}>{r.customer}</span>,
      },
      { key: 'why', label: C.columns.reason, mono: true, width: 'minmax(200px,1.6fr)', value: (r) => r.reason },
      { key: 'amt', label: C.columns.amount, width: '96px', num: true, value: (r) => r.amount },
      { key: 'n', label: C.columns.attempts, width: '80px', value: (r) => r.attempts },
      { key: 'next', label: C.columns.retry, width: '136px', noSort: true, value: (r) => r.retry },
    ];
    const email: MenuEntry = { label: C.menu.email, disabled: true, title: C.later, onSelect: () => {} };
    return (
      <Table
        label={C.tabs.failed}
        cols={cols}
        rows={rows(failedVM)}
        rowKey={(r) => r.key}
        onRow={openRow}
        menu={(r) => [...customer(r), email, ...stripe(r.stripe)]}
        {...common}
      />
    );
  }
  const cols: Column<RefundVM>[] = [
    { key: 'id', label: C.columns.refund, mono: true, width: 'minmax(120px,1fr)', value: (r) => r.id },
    {
      key: 'inv',
      label: C.columns.invoice,
      mono: true,
      width: 'minmax(140px,1fr)',
      hideLap: true,
      value: (r) => r.invoice,
    },
    { key: 'why', label: C.columns.refundReason, width: 'minmax(180px,1.6fr)', value: (r) => r.reason },
    { key: 'by', label: C.columns.by, width: '120px', value: (r) => r.by },
    { key: 'amt', label: C.columns.amount, width: '96px', num: true, value: (r) => r.amount },
    { key: 'when', label: C.columns.when, width: '128px', noSort: true, value: (r) => r.at, cell: (r) => r.when },
  ];
  return <Table label={C.tabs.refunds} cols={cols} rows={rows(refundVM)} rowKey={(r) => r.key} {...common} />;
}

export default Component;
