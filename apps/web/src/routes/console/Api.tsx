import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate, useParams } from 'react-router';
import { consoleCan } from '@ai/core';
import type { MenuEntry } from '../../components/r2/Menu';
import { Confirm } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { PageHead, Pill, Sel, Skel, Stat, Tabs, k, Stamp } from '../../components/r2/kit';
import { ConsoleError } from '../../data/console';
import { useAdminChrome } from '../../shell/admin/chrome';
import { useViewportWidth } from '../../shell/hooks';
import { Denied, NotFound } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsoleRecord } from './useConsoleData';
import {
  API_COPY as C,
  API_TABS,
  SOURCE_OPTIONS,
  apiStatsVM,
  apiTabPath,
  deliveriesFor,
  deliveryVM,
  endpointVM,
} from './ops.vm';
import type { ApiTab, DeliveryVM, EndpointVM, SourceOption } from './ops.vm';
import s from './Ops.module.css';

// /admin/api[/:tab] on R2 (D-165, spec § 7.9): the mockup's `Api()`. Four stats over the last 24 hours
// (`api_metrics`), then Endpoints (latency and error rate by route template) and Webhook deliveries (GHL
// from the CRM sync log, Stripe from `stripe_events`, Zoom not configured). "Retry now…" on a GHL row
// failing or retrying is the CRM sync's own reset (Owner and Admin; hidden for Support); a Stripe row
// is view-only, with "View in Stripe" (D13). "Related incidents" opens the Incidents screen (D-167).

export function Component() {
  const { tab: raw } = useParams();
  const tab: ApiTab | null = raw === undefined ? 'endpoints' : raw === 'hooks' ? 'hooks' : null;
  const gate = useConsoleGate('api');
  const navigate = useNavigate();
  const phone = useViewportWidth() < 768;
  const { toast } = useAdminChrome();
  const api = gate.kind === 'ready' ? gate.api : null;
  const [reload, setReload] = useState(0);
  const endpoints = useConsoleRecord(api, (a) => a.apiEndpoints(), 'endpoints');
  const hooks = useConsoleRecord(api, (a) => a.webhooks(), `hooks:${reload}`);
  const [source, setSource] = useState<SourceOption>('All sources');
  const [confirm, setConfirm] = useState<DeliveryVM | null>(null);
  const stats = useMemo(
    () => (endpoints.data ? apiStatsVM(endpoints.data, hooks.data) : null),
    [endpoints.data, hooks.data],
  );
  const endpointRows = useMemo(() => endpoints.data?.rows.map(endpointVM) ?? [], [endpoints.data]);
  const deliveries = useMemo(() => hooks.data?.rows.map(deliveryVM) ?? [], [hooks.data]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;
  if (tab === null) return <NotFound />;
  // Support sees both lists and no Retry (D3).
  const canRetry = gate.kind === 'ready' && consoleCan(gate.me.role, 'webhooks.retry');
  const tabs = API_TABS.map((id) => ({
    id,
    label: C.tabs[id],
    ...(id === 'hooks' && hooks.data ? { count: hooks.data.rows.length } : {}),
  }));

  const endpointCols: Column<EndpointVM>[] = [
    { key: 'p', label: C.endpoints.endpoint, mono: true, width: 'minmax(220px,2fr)', value: (r) => r.route },
    {
      key: 'req',
      label: C.endpoints.requests,
      num: true,
      noSort: true,
      width: '88px',
      value: (r) => r.requestsN,
      cell: (r) => r.requests,
    },
    { key: 'p50', label: C.endpoints.p50, num: true, noSort: true, width: '80px', value: (r) => r.p50 },
    { key: 'p95', label: C.endpoints.p95, num: true, noSort: true, width: '80px', value: (r) => r.p95 },
    {
      key: 'er',
      label: C.endpoints.errorRate,
      width: '136px',
      value: (r) => r.errorRateN,
      cell: (r) => (
        <span className={clsx(k.row, k.nw)}>
          <span className={clsx(k.tn, s.rate)}>{r.errorRate}</span>
          {r.pill ? <Pill tone={r.pill.tone}>{r.pill.label}</Pill> : null}
        </span>
      ),
    },
  ];

  const hookCols: Column<DeliveryVM>[] = [
    {
      key: 'ev',
      label: C.hooks.event,
      width: 'minmax(200px,1.6fr)',
      value: (r) => r.event,
      cell: (r) => (
        <div className={clsx(k.col, k.col0)}>
          <span className={clsx(k.w5, k.el)}>
            <span className={k.mo}>{r.event}</span>
          </span>
          <span className={clsx(k.me, k.el)}>{r.line}</span>
        </div>
      ),
    },
    {
      key: 'st',
      label: C.hooks.status,
      width: '128px',
      value: (r) => r.status.label,
      cell: (r) => <Status tone={r.status.tone}>{r.status.label}</Status>,
    },
    { key: 'att', label: C.hooks.attempts, width: '80px', value: (r) => r.attempts },
    {
      key: 'next',
      label: C.hooks.next,
      width: '152px',
      noSort: true,
      hideLap: true,
      value: (r) => r.next,
      cell: (r) => <Stamp v={r.next} two />,
    },
    {
      key: 'err',
      label: C.hooks.error,
      width: 'minmax(160px,1.4fr)',
      noSort: true,
      value: (r) => r.error,
      cell: (r) => <span className={k.s2}>{r.error}</span>,
    },
  ];

  const hookMenu = (r: DeliveryVM): MenuEntry[] => [
    ...(canRetry
      ? [
          {
            label: C.menu.retry,
            disabled: !r.canRetry,
            ...(r.source === 'stripe' ? { title: C.menu.stripeViewOnly } : {}),
            onSelect: () => setConfirm(r),
          },
        ]
      : []),
    // D-167: the Incidents screen exists now (the mockup's `go('incidents')`).
    { label: C.menu.related, onSelect: () => navigate('/admin/incidents') },
    ...(r.stripeUrl
      ? [{ label: C.menu.stripe, onSelect: () => void window.open(r.stripeUrl!, '_blank', 'noopener') }]
      : []),
  ];

  const retry = (r: DeliveryVM) => {
    if (!api || !r.retry) return;
    api.retryWebhook(r.retry.kind, r.retry.id).then(
      () => {
        toast(C.retry.done);
        setReload((n) => n + 1);
      },
      (e: unknown) => toast(e instanceof ConsoleError ? e.message : 'The retry didn’t go through.'),
    );
  };

  return (
    <Page>
      <PageHead title={C.title} description={C.description} />
      {gate.kind === 'error' ? (
        <LoadError failure={gate.failure} retry={gate.retry} />
      ) : endpoints.status === 'error' && endpoints.failure ? (
        <LoadError failure={endpoints.failure} retry={endpoints.retry} />
      ) : stats ? (
        <div className={k.g4}>
          {stats.map((x) => (
            <Stat key={x.key} label={x.label} value={x.value} sub={x.sub} tone={x.tone} to={x.to} />
          ))}
        </div>
      ) : (
        <Skel lines={3} />
      )}
      <Tabs tabs={tabs} value={tab} onChange={(t) => navigate(apiTabPath(t))} phone={phone} label={C.sections} />
      {tab === 'endpoints' ? (
        endpoints.status === 'error' ? null : (
          <Table
            label={C.tabs.endpoints}
            cols={endpointCols}
            rows={endpointRows}
            rowKey={(r) => r.key}
            loading={endpoints.status === 'loading'}
            empty={{ icon: 'r2Api', title: C.endpoints.empty }}
          />
        )
      ) : hooks.status === 'error' && hooks.failure ? (
        <LoadError failure={hooks.failure} retry={hooks.retry} />
      ) : (
        <>
          <div className={k.row}>
            <Sel aria-label={C.hooks.source} value={source} onChange={(e) => setSource(e.target.value as SourceOption)}>
              {SOURCE_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Sel>
          </div>
          <Table
            label={C.tabs.hooks}
            cols={hookCols}
            rows={deliveriesFor(deliveries, source)}
            rowKey={(r) => r.key}
            loading={hooks.status === 'loading'}
            menu={hookMenu}
            empty={{ icon: 'r2Api', title: C.hooks.empty }}
            filtered={source !== 'All sources'}
          />
          <p className={clsx(k.p, k.me)}>{C.hooks.foot}</p>
        </>
      )}
      {confirm && confirm.retry ? (
        <Confirm
          title={C.retry.title(confirm.event, confirm.retry.id)}
          body={C.retry.body(confirm.sourceLabel)}
          cta={C.retry.cta}
          audited
          onClose={() => setConfirm(null)}
          onConfirm={() => retry(confirm)}
        />
      ) : null}
    </Page>
  );
}

export default Component;
