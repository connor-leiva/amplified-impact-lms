// /admin/users (D-158, spec § 7.4): every person, by name, with their workspace, role, status and
// last active day. Filters, a table (cards on a phone), Load More, and Export CSV for the roles that
// may export. Markup only: every word and time comes from Users.vm.ts.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ConsoleUserRow } from '@ai/core';
import { consoleCan, userPath } from '@ai/core';
import { ConsolePage } from '../../components/console/ConsolePage';
import { DataTable } from '../../components/console/DataTable';
import type { Column } from '../../components/console/DataTable';
import { FilterBar, FilterSearch, FilterSelect } from '../../components/console/FilterBar';
import { EmptyBlock, ErrorBlock, FullState, LoadingBlock } from '../../components/console/StateBlock';
import { StatusBadge } from '../../components/console/StatusBadge';
import { Button } from '../../components/primitives/Button';
import { useToaster } from '../../components/primitives/Toaster';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';
import { downloadCsv } from './download';
import { deniedCopy, errorCopy } from './console.vm';
import { RECORD_COPY } from './records.vm';
import { DEFAULT_USER_FILTERS, KIND_OPTIONS, ROLE_OPTIONS, USERS_COPY, isDefaultUserFilters, userFiltersFor, userRowVM, usersExportFailure } from './Users.vm';
import type { UserFilterState, UserRowVM } from './Users.vm';
import { useConsoleGate } from './useConsoleGate';

type List = { kind: 'loading' } | { kind: 'error'; failure: ConsoleFailure } | { kind: 'ready'; rows: ConsoleUserRow[]; nextCursor: string | null; more: boolean };

const failureOf = (e: unknown): ConsoleFailure => (e instanceof ConsoleError ? e.kind : 'failed');

function Users({ api, role }: { api: ConsoleApi; role: string }) {
  const navigate = useNavigate();
  const { toast } = useToaster();
  const [filters, setFilters] = useState<UserFilterState>(DEFAULT_USER_FILTERS);
  const [q, setQ] = useState('');
  const [list, setList] = useState<List>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === q ? f : { ...f, q })), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useMemo(() => userFiltersFor(filters), [filters]);

  useEffect(() => {
    let alive = true;
    setList({ kind: 'loading' });
    api.users(query).then(
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
    api.users(query, list.nextCursor).then(
      (p) => setList({ kind: 'ready', rows: [...list.rows, ...p.rows], nextCursor: p.nextCursor, more: false }),
      (e: unknown) => {
        setList({ ...list, more: false });
        toast(errorCopy(failureOf(e)).title, 'warn');
      },
    );
  }, [api, list, query, toast]);

  const runExport = useCallback(async () => {
    setExporting(true);
    try {
      const { csv, filename } = await api.exportUsers(query);
      downloadCsv(csv, filename);
      toast(USERS_COPY.exported, 'success');
    } catch (e) {
      toast(usersExportFailure(failureOf(e), e instanceof Error ? e.message : ''), 'warn');
    } finally {
      setExporting(false);
    }
  }, [api, query, toast]);

  const set = <K extends keyof UserFilterState>(key: K, value: UserFilterState[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const clear = () => {
    setQ('');
    setFilters(DEFAULT_USER_FILTERS);
  };

  const columns: Column<UserRowVM>[] = [
    { key: 'name', label: USERS_COPY.columns.name, render: (r) => r.name },
    { key: 'email', label: USERS_COPY.columns.email, render: (r) => r.email, mono: true },
    { key: 'workspace', label: USERS_COPY.columns.workspace, render: (r) => r.workspace },
    { key: 'role', label: USERS_COPY.columns.role, render: (r) => r.role },
    { key: 'status', label: USERS_COPY.columns.status, render: (r) => <StatusBadge {...r.status} />, nowrap: true },
    { key: 'last', label: USERS_COPY.columns.last, render: (r) => r.last, nowrap: true },
  ];

  return (
    <ConsolePage
      title={USERS_COPY.title}
      description={USERS_COPY.description}
      actions={
        consoleCan(role, 'export') ? (
          <Button icon="download" onClick={() => void runExport()} disabled={exporting} aria-busy={exporting || undefined}>
            {exporting ? USERS_COPY.exporting : USERS_COPY.export}
          </Button>
        ) : null
      }
    >
      <FilterBar label="Filters">
        <FilterSearch label={USERS_COPY.search} value={q} onChange={setQ} />
        <FilterSelect label="Role" value={filters.role} options={ROLE_OPTIONS} onChange={(v) => set('role', v)} />
        <FilterSelect label="Kind" value={filters.kind} options={KIND_OPTIONS} onChange={(v) => set('kind', v)} />
      </FilterBar>

      {list.kind === 'loading' ? (
        <LoadingBlock />
      ) : list.kind === 'error' ? (
        <ErrorBlock copy={errorCopy(list.failure)} onRetry={() => setAttempt((n) => n + 1)} />
      ) : list.rows.length === 0 ? (
        isDefaultUserFilters(filters) ? (
          <EmptyBlock message={USERS_COPY.empty} />
        ) : (
          <EmptyBlock message={RECORD_COPY.emptyFiltered} action={{ label: RECORD_COPY.clear, onClick: clear }} />
        )
      ) : (
        <DataTable
          caption={USERS_COPY.caption}
          columns={columns}
          rows={list.rows.map(userRowVM)}
          rowKey={(r) => r.key}
          onOpen={(r) => void navigate(userPath(r.key))}
          openLabel={(r) => USERS_COPY.open(r.name)}
          loadMore={list.nextCursor ? { label: RECORD_COPY.loadMore, busyLabel: RECORD_COPY.loadingMore, busy: list.more, onClick: loadMore } : null}
        />
      )}
    </ConsolePage>
  );
}

export function Component() {
  const gate = useConsoleGate('users');
  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <FullState kind="denied" copy={deniedCopy('users', gate.role)} />;
  if (gate.kind === 'ready') return <Users api={gate.api} role={gate.me.role} />;
  return (
    <ConsolePage title={USERS_COPY.title} description={USERS_COPY.description}>
      {gate.kind === 'loading' ? <LoadingBlock /> : <ErrorBlock copy={errorCopy(gate.failure)} onRetry={gate.retry} />}
    </ConsolePage>
  );
}

export default Component;
