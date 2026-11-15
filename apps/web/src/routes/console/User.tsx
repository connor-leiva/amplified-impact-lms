// /admin/users/:userId (D-158, spec § 7.4): one person as a support record. Profile (identity as
// existence only, and what they hold), Orders, Progress and Notes, and the existing password reset
// email. No email change (D12) and no masquerade yet (PR 3). Markup only: every word comes from
// Users.vm.ts.

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import type { ConsoleUserDetail } from '@ai/core';
import { workspacePath } from '@ai/core';
import { ConfirmDialog } from '../../components/console/ConfirmDialog';
import { ConsolePage } from '../../components/console/ConsolePage';
import { ConsoleTabs } from '../../components/console/ConsoleTabs';
import { DataTable } from '../../components/console/DataTable';
import { KeyValue } from '../../components/console/KeyValue';
import { ErrorBlock, FullState, LoadingBlock } from '../../components/console/StateBlock';
import { StatusBadge } from '../../components/console/StatusBadge';
import { Button } from '../../components/primitives/Button';
import { useToaster } from '../../components/primitives/Toaster';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';
import { NOT_FOUND_COPY, deniedCopy, errorCopy } from './console.vm';
import { ORDER_COLUMNS, RECORD_COPY, isMissing } from './records.vm';
import { StaffNotes } from './StaffNotes';
import { USERS_COPY, USER_COPY, USER_TABS, canReset, resetFailure, userTabOf, userVM } from './Users.vm';
import type { UserTab, UserVM } from './Users.vm';
import { useConsoleGate } from './useConsoleGate';
import s from './records.module.css';

type Load = { kind: 'loading' } | { kind: 'error'; failure: ConsoleFailure } | { kind: 'ready'; detail: ConsoleUserDetail };

const failureOf = (e: unknown): ConsoleFailure => (e instanceof ConsoleError ? e.kind : 'failed');

function Panel({ vm, tab, api, role }: { vm: UserVM; tab: UserTab; api: ConsoleApi; role: string }) {
  if (tab === 'profile') {
    return (
      <div className={s.grid2}>
        <div className={s.card}>
          <h2 className={s.h2}>{USER_COPY.identity}</h2>
          <KeyValue pairs={vm.identity} />
        </div>
        <div className={s.card}>
          <h2 className={s.h2}>{USER_COPY.access}</h2>
          <KeyValue pairs={vm.access} />
          {vm.workspace ? (
            <Link className={s.link} to={workspacePath(vm.workspace.teamId)}>
              {USER_COPY.openWorkspace(vm.workspace.name)}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }
  if (tab === 'orders') {
    return vm.orders.length === 0 ? (
      <p className={s.sentence}>{USER_COPY.noOrders}</p>
    ) : (
      <DataTable
        caption={USER_COPY.ordersCaption}
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
    );
  }
  if (tab === 'progress') {
    return vm.progress.length === 0 ? (
      <p className={s.sentence}>{USER_COPY.noProgress}</p>
    ) : (
      <DataTable
        caption={USER_COPY.progressCaption}
        rows={vm.progress}
        rowKey={(r) => r.key}
        columns={[
          { key: 'name', label: USER_COPY.progressColumns.name, render: (r) => r.name },
          { key: 'steps', label: USER_COPY.progressColumns.steps, render: (r) => r.steps, mono: true },
          { key: 'built', label: USER_COPY.progressColumns.built, render: (r) => r.built, nowrap: true },
          { key: 'deployed', label: USER_COPY.progressColumns.deployed, render: (r) => r.deployed, nowrap: true },
        ]}
      />
    );
  }
  return <StaffNotes api={api} role={role} targetType="user" targetId={vm.id} internal={USER_COPY.notesInternal} />;
}

function User({ api, role, userId }: { api: ConsoleApi; role: string; userId: string }) {
  const { toast } = useToaster();
  const [params, setParams] = useSearchParams();
  const tab = userTabOf(params.get('tab'));
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoad({ kind: 'loading' });
    api.user(userId).then(
      (detail) => alive && setLoad({ kind: 'ready', detail }),
      (e: unknown) => alive && setLoad({ kind: 'error', failure: failureOf(e) }),
    );
    return () => {
      alive = false;
    };
  }, [api, userId, attempt]);

  const reset = useCallback(async () => {
    setSending(true);
    try {
      const { link } = await api.resetPassword(userId);
      setConfirming(false);
      toast(link === 'reset' ? USER_COPY.sentReset : USER_COPY.sentSet, 'success');
    } catch (e) {
      toast(resetFailure(failureOf(e), e instanceof Error ? e.message : ''), 'warn');
    } finally {
      setSending(false);
    }
  }, [api, toast, userId]);

  if (load.kind === 'error' && isMissing(load.failure)) return <FullState kind="notFound" copy={NOT_FOUND_COPY} />;
  if (load.kind !== 'ready') {
    return (
      <ConsolePage title={USERS_COPY.title}>
        {load.kind === 'loading' ? <LoadingBlock /> : <ErrorBlock copy={errorCopy(load.failure)} onRetry={() => setAttempt((n) => n + 1)} />}
      </ConsolePage>
    );
  }
  const d = load.detail;
  const vm = userVM(d);
  const label = USER_TABS.find((t) => t.id === tab)!.label;
  return (
    <ConsolePage
      title={vm.title}
      actions={
        canReset(role, d.user) ? (
          <Button icon="send" onClick={() => setConfirming(true)}>
            {USER_COPY.reset}
          </Button>
        ) : null
      }
    >
      <div className={s.meta}>
        <StatusBadge {...vm.status} />
        <span className={s.mono}>{vm.email}</span>
        <span className={`${s.mono} ${s.muted}`}>{vm.id}</span>
      </div>
      <ConsoleTabs tabs={[...USER_TABS]} value={tab} label={USER_COPY.tabsLabel} onChange={(id) => setParams(id === 'profile' ? {} : { tab: id }, { replace: true })} />
      <section className={s.panel} aria-label={label}>
        <Panel vm={vm} tab={tab} api={api} role={role} />
      </section>
      <ConfirmDialog
        open={confirming}
        title={USER_COPY.resetTitle(d.user.name)}
        body={d.identity.hasPassword ? USER_COPY.resetBody(d.user.email) : USER_COPY.setBody(d.user.email)}
        confirm={USER_COPY.resetCta}
        busyLabel={USER_COPY.sending}
        cancel={USER_COPY.cancel}
        footnote={RECORD_COPY.audited}
        busy={sending}
        onConfirm={() => void reset()}
        onClose={() => setConfirming(false)}
      />
    </ConsolePage>
  );
}

export function Component() {
  const gate = useConsoleGate('users');
  const { userId = '' } = useParams();
  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <FullState kind="denied" copy={deniedCopy('users', gate.role)} />;
  if (gate.kind === 'ready') return <User api={gate.api} role={gate.me.role} userId={userId} />;
  return (
    <ConsolePage title={USERS_COPY.title}>
      {gate.kind === 'loading' ? <LoadingBlock /> : <ErrorBlock copy={errorCopy(gate.failure)} onRetry={gate.retry} />}
    </ConsolePage>
  );
}

export default Component;
