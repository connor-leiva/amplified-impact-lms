// /admin/workspaces/:teamId (D-158, spec § 7.3): one workspace as a support record. Members, Plan &
// Entitlements, Billing (this app's own records; Stripe's are PR 4), Activity and Staff Notes. No
// delete (D12) and no masquerade yet (PR 3). Markup only: every word comes from Workspaces.vm.ts.

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import type { WorkspaceDetail } from '@ai/core';
import { userPath } from '@ai/core';
import { ConsolePage } from '../../components/console/ConsolePage';
import { ConsoleTabs } from '../../components/console/ConsoleTabs';
import { DataTable } from '../../components/console/DataTable';
import { KeyValue } from '../../components/console/KeyValue';
import { ErrorBlock, FullState, LoadingBlock } from '../../components/console/StateBlock';
import { StatusBadge } from '../../components/console/StatusBadge';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';
import { NOT_FOUND_COPY, deniedCopy, errorCopy } from './console.vm';
import { ORDER_COLUMNS, PLAN_COLUMNS, isMissing } from './records.vm';
import { StaffNotes } from './StaffNotes';
import { WORKSPACES_COPY, WORKSPACE_COPY, WORKSPACE_TABS, workspaceTabOf, workspaceVM } from './Workspaces.vm';
import type { WorkspaceTab, WorkspaceVM } from './Workspaces.vm';
import { useConsoleGate } from './useConsoleGate';
import s from './records.module.css';

type Load = { kind: 'loading' } | { kind: 'error'; failure: ConsoleFailure } | { kind: 'ready'; detail: WorkspaceDetail };

const failureOf = (e: unknown): ConsoleFailure => (e instanceof ConsoleError ? e.kind : 'failed');

function Panel({ vm, tab, api, role }: { vm: WorkspaceVM; tab: WorkspaceTab; api: ConsoleApi; role: string }) {
  const navigate = useNavigate();
  if (tab === 'members') {
    return vm.members.length === 0 ? (
      <p className={s.sentence}>{WORKSPACE_COPY.members.empty}</p>
    ) : (
      <DataTable
        caption={WORKSPACE_COPY.members.caption}
        rows={vm.members}
        rowKey={(r) => r.key}
        onOpen={(r) => void navigate(userPath(r.key))}
        openLabel={(r) => WORKSPACE_COPY.openMember(r.name)}
        columns={[
          { key: 'name', label: WORKSPACE_COPY.members.columns.name, render: (r) => r.name },
          { key: 'role', label: WORKSPACE_COPY.members.columns.role, render: (r) => r.role },
          { key: 'last', label: WORKSPACE_COPY.members.columns.last, render: (r) => r.last, nowrap: true },
          { key: 'status', label: WORKSPACE_COPY.members.columns.status, render: (r) => <StatusBadge {...r.status} />, nowrap: true },
        ]}
      />
    );
  }
  if (tab === 'plan') {
    return (
      <>
        <div className={s.card}>
          <KeyValue pairs={vm.planPairs} />
        </div>
        {vm.plans.length === 0 ? (
          <p className={s.sentence}>{WORKSPACE_COPY.noPlans}</p>
        ) : (
          <DataTable
            caption={WORKSPACE_COPY.plansCaption}
            rows={vm.plans}
            rowKey={(r) => r.key}
            columns={[
              { key: 'plan', label: PLAN_COLUMNS.plan, render: (r) => r.plan },
              { key: 'option', label: PLAN_COLUMNS.option, render: (r) => r.option, mono: true },
              { key: 'seats', label: PLAN_COLUMNS.seats, render: (r) => r.seats, mono: true },
              { key: 'status', label: PLAN_COLUMNS.status, render: (r) => <StatusBadge {...r.status} />, nowrap: true },
              { key: 'started', label: PLAN_COLUMNS.started, render: (r) => r.started, nowrap: true },
              { key: 'paid', label: PLAN_COLUMNS.paidThrough, render: (r) => r.paidThrough, nowrap: true },
            ]}
          />
        )}
      </>
    );
  }
  if (tab === 'billing') {
    return (
      <>
        <div className={s.card}>
          <p className={s.muted}>{WORKSPACE_COPY.billingNote}</p>
          <KeyValue pairs={vm.billingPairs} />
        </div>
        {vm.orders.length === 0 ? (
          <p className={s.sentence}>{WORKSPACE_COPY.noOrders}</p>
        ) : (
          <DataTable
            caption={WORKSPACE_COPY.ordersCaption}
            rows={vm.orders}
            rowKey={(r) => r.key}
            columns={[
              { key: 'id', label: ORDER_COLUMNS.id, render: (r) => r.id, mono: true },
              { key: 'plan', label: ORDER_COLUMNS.plan, render: (r) => r.plan },
              { key: 'status', label: ORDER_COLUMNS.status, render: (r) => <StatusBadge {...r.status} />, nowrap: true },
              { key: 'amount', label: ORDER_COLUMNS.amount, render: (r) => r.amount, mono: true },
              { key: 'created', label: ORDER_COLUMNS.created, render: (r) => r.created, nowrap: true },
            ]}
          />
        )}
      </>
    );
  }
  if (tab === 'activity') {
    return vm.activity.length === 0 ? (
      <p className={s.sentence}>{WORKSPACE_COPY.noActivity}</p>
    ) : (
      <div className={s.card}>
        <ul className={s.timeline} aria-label={WORKSPACE_COPY.activityCaption}>
          {vm.activity.map((a) => (
            <li key={a.key} className={s.timelineItem}>
              <span className={`${s.mono} ${s.muted} ${s.when}`}>{a.when}</span>
              <span className={s.what}>{a.text}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return <StaffNotes api={api} role={role} targetType="workspace" targetId={vm.id} internal={WORKSPACE_COPY.notesInternal} />;
}

function Workspace({ api, role, teamId }: { api: ConsoleApi; role: string; teamId: string }) {
  const [params, setParams] = useSearchParams();
  const tab = workspaceTabOf(params.get('tab'));
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoad({ kind: 'loading' });
    api.workspace(teamId).then(
      (detail) => alive && setLoad({ kind: 'ready', detail }),
      (e: unknown) => alive && setLoad({ kind: 'error', failure: failureOf(e) }),
    );
    return () => {
      alive = false;
    };
  }, [api, teamId, attempt]);

  if (load.kind === 'error' && isMissing(load.failure)) return <FullState kind="notFound" copy={NOT_FOUND_COPY} />;
  if (load.kind !== 'ready') {
    return (
      <ConsolePage title={WORKSPACES_COPY.title}>
        {load.kind === 'loading' ? <LoadingBlock /> : <ErrorBlock copy={errorCopy(load.failure)} onRetry={() => setAttempt((n) => n + 1)} />}
      </ConsolePage>
    );
  }
  const vm = workspaceVM(load.detail);
  const label = WORKSPACE_TABS.find((t) => t.id === tab)!.label;
  return (
    <ConsolePage title={vm.title}>
      <div className={s.meta}>
        <StatusBadge {...vm.status} />
        <span>{vm.plan}</span>
        <span className={s.mono}>{vm.seats}</span>
        {vm.nearCap ? <StatusBadge {...vm.nearCap} /> : null}
        <span className={`${s.mono} ${s.muted}`}>{vm.id}</span>
      </div>
      <ConsoleTabs tabs={[...WORKSPACE_TABS]} value={tab} label={WORKSPACE_COPY.tabsLabel} onChange={(id) => setParams(id === 'members' ? {} : { tab: id }, { replace: true })} />
      <section className={s.panel} aria-label={label}>
        <Panel vm={vm} tab={tab} api={api} role={role} />
      </section>
    </ConsolePage>
  );
}

export function Component() {
  const gate = useConsoleGate('workspaces');
  const { teamId = '' } = useParams();
  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <FullState kind="denied" copy={deniedCopy('workspaces', gate.role)} />;
  if (gate.kind === 'ready') return <Workspace api={gate.api} role={gate.me.role} teamId={teamId} />;
  return (
    <ConsolePage title={WORKSPACES_COPY.title}>
      {gate.kind === 'loading' ? <LoadingBlock /> : <ErrorBlock copy={errorCopy(gate.failure)} onRetry={gate.retry} />}
    </ConsolePage>
  );
}

export default Component;
