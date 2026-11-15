// /admin/workspaces (D-158, spec § 7.3): every team, by name, with its plan, seats and status.
// Filters, a table (cards on a phone), Load More. Net-new and not golden-pinned (D-079, D-110).
// Markup only: every word and time comes from Workspaces.vm.ts.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { WorkspaceRow } from '@ai/core';
import { workspacePath } from '@ai/core';
import { ConsolePage } from '../../components/console/ConsolePage';
import { DataTable } from '../../components/console/DataTable';
import type { Column } from '../../components/console/DataTable';
import { FilterBar, FilterSearch, FilterSelect } from '../../components/console/FilterBar';
import { EmptyBlock, ErrorBlock, FullState, LoadingBlock } from '../../components/console/StateBlock';
import { StatusBadge } from '../../components/console/StatusBadge';
import { useToaster } from '../../components/primitives/Toaster';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';
import { deniedCopy, errorCopy } from './console.vm';
import { PLAN_OPTIONS, RECORD_COPY, STATUS_OPTIONS } from './records.vm';
import { DEFAULT_WORKSPACE_FILTERS, WORKSPACES_COPY, isDefaultWorkspaceFilters, workspaceFiltersFor, workspaceRowVM } from './Workspaces.vm';
import type { WorkspaceFilterState, WorkspaceRowVM } from './Workspaces.vm';
import { useConsoleGate } from './useConsoleGate';
import s from './records.module.css';

type List = { kind: 'loading' } | { kind: 'error'; failure: ConsoleFailure } | { kind: 'ready'; rows: WorkspaceRow[]; nextCursor: string | null; more: boolean };

const failureOf = (e: unknown): ConsoleFailure => (e instanceof ConsoleError ? e.kind : 'failed');

function Workspaces({ api }: { api: ConsoleApi }) {
  const navigate = useNavigate();
  const { toast } = useToaster();
  const [filters, setFilters] = useState<WorkspaceFilterState>(DEFAULT_WORKSPACE_FILTERS);
  const [q, setQ] = useState('');
  const [list, setList] = useState<List>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === q ? f : { ...f, q })), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useMemo(() => workspaceFiltersFor(filters), [filters]);

  useEffect(() => {
    let alive = true;
    setList({ kind: 'loading' });
    api.workspaces(query).then(
      (p) => alive && setList({ kind: 'ready', rows: p.rows, nextCursor: p.nextCursor, more: false }),
      (e: unknown) => alive && setList({ kind: 'error', failure: failureOf(e) }),
    );
    return () => {
      alive = false;
    };
  }, [api, query, attempt]);

  const loadMore = useCallback(() => {
    if (list.kind !== 'ready' || !list.nextCursor) return;
    setList({ ...list, more: true });
    api.workspaces(query, list.nextCursor).then(
      (p) => setList({ kind: 'ready', rows: [...list.rows, ...p.rows], nextCursor: p.nextCursor, more: false }),
      (e: unknown) => {
        setList({ ...list, more: false });
        toast(errorCopy(failureOf(e)).title, 'warn');
      },
    );
  }, [api, list, query, toast]);

  const set = <K extends keyof WorkspaceFilterState>(key: K, value: WorkspaceFilterState[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const clear = () => {
    setQ('');
    setFilters(DEFAULT_WORKSPACE_FILTERS);
  };

  const columns: Column<WorkspaceRowVM>[] = [
    { key: 'name', label: WORKSPACES_COPY.columns.name, render: (r) => r.name },
    {
      key: 'owner',
      label: WORKSPACES_COPY.columns.owner,
      render: (r) => (
        <span className={s.stack}>
          <span>{r.owner}</span>
          {r.ownerEmail ? <span className={`${s.mono} ${s.muted}`}>{r.ownerEmail}</span> : null}
        </span>
      ),
    },
    { key: 'plan', label: WORKSPACES_COPY.columns.plan, render: (r) => r.plan },
    {
      key: 'seats',
      label: WORKSPACES_COPY.columns.seats,
      render: (r) => (
        <span className={s.inline}>
          <span className={s.mono}>{r.seats}</span>
          {r.nearCap ? <StatusBadge {...r.nearCap} /> : null}
        </span>
      ),
    },
    { key: 'status', label: WORKSPACES_COPY.columns.status, render: (r) => <StatusBadge {...r.status} />, nowrap: true },
    { key: 'last', label: WORKSPACES_COPY.columns.last, render: (r) => r.last, nowrap: true },
  ];

  return (
    <ConsolePage title={WORKSPACES_COPY.title} description={WORKSPACES_COPY.description}>
      <FilterBar label="Filters">
        <FilterSearch label={WORKSPACES_COPY.search} value={q} onChange={setQ} />
        <FilterSelect label="Plan" value={filters.plan} options={PLAN_OPTIONS} onChange={(v) => set('plan', v)} />
        <FilterSelect label="Status" value={filters.status} options={STATUS_OPTIONS} onChange={(v) => set('status', v)} />
      </FilterBar>

      {list.kind === 'loading' ? (
        <LoadingBlock />
      ) : list.kind === 'error' ? (
        <ErrorBlock copy={errorCopy(list.failure)} onRetry={() => setAttempt((n) => n + 1)} />
      ) : list.rows.length === 0 ? (
        isDefaultWorkspaceFilters(filters) ? (
          <EmptyBlock message={WORKSPACES_COPY.empty} />
        ) : (
          <EmptyBlock message={RECORD_COPY.emptyFiltered} action={{ label: RECORD_COPY.clear, onClick: clear }} />
        )
      ) : (
        <DataTable
          caption={WORKSPACES_COPY.caption}
          columns={columns}
          rows={list.rows.map(workspaceRowVM)}
          rowKey={(r) => r.key}
          onOpen={(r) => void navigate(workspacePath(r.key))}
          openLabel={(r) => WORKSPACES_COPY.open(r.name)}
          loadMore={list.nextCursor ? { label: RECORD_COPY.loadMore, busyLabel: RECORD_COPY.loadingMore, busy: list.more, onClick: loadMore } : null}
        />
      )}
    </ConsolePage>
  );
}

export function Component() {
  const gate = useConsoleGate('workspaces');
  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <FullState kind="denied" copy={deniedCopy('workspaces', gate.role)} />;
  if (gate.kind === 'ready') return <Workspaces api={gate.api} />;
  return (
    <ConsolePage title={WORKSPACES_COPY.title} description={WORKSPACES_COPY.description}>
      {gate.kind === 'loading' ? <LoadingBlock /> : <ErrorBlock copy={errorCopy(gate.failure)} onRetry={gate.retry} />}
    </ConsolePage>
  );
}

export default Component;
