// /admin/audit (D-157, spec § 7.8): the audit log. Filters, a table (cards on a phone), a detail
// drawer, Load More, and Export CSV for the roles that may export. Net-new and not golden-pinned
// (D-079, D-110). Markup only: every word and time comes from AuditLog.vm.ts.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuditRow } from '@ai/core';
import { ConsolePage } from '../../components/console/ConsolePage';
import { DataTable } from '../../components/console/DataTable';
import type { Column } from '../../components/console/DataTable';
import { FilterBar, FilterSearch, FilterSelect } from '../../components/console/FilterBar';
import { KeyValue } from '../../components/console/KeyValue';
import { EmptyBlock, ErrorBlock, FullState, LoadingBlock } from '../../components/console/StateBlock';
import { StatusBadge } from '../../components/console/StatusBadge';
import { Button } from '../../components/primitives/Button';
import { Drawer } from '../../components/primitives/Drawer';
import { useToaster } from '../../components/primitives/Toaster';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';
import { useDb } from '../../data/hooks';
import { clock } from '../../lib/clock';
import {
  AUDIT_COPY,
  DEFAULT_FILTERS,
  OUTCOME_OPTIONS,
  RANGE_OPTIONS,
  actionGroupLabel,
  actionOptions,
  actorOptions,
  auditFiltersFor,
  canExport,
  detailVM,
  exportFailure,
  isDefaultFilters,
  rangeLabel,
  rowVM,
} from './AuditLog.vm';
import type { AuditFilterState, AuditRowVM, RangeKey } from './AuditLog.vm';
import { deniedCopy, errorCopy } from './console.vm';
import { useConsoleGate } from './useConsoleGate';

type List =
  | { kind: 'loading' }
  | { kind: 'error'; failure: ConsoleFailure }
  | { kind: 'ready'; rows: AuditRow[]; nextCursor: string | null; more: boolean };

const failureOf = (e: unknown): ConsoleFailure => (e instanceof ConsoleError ? e.kind : 'failed');

/** Hand the browser a file. A blob URL, so nothing leaves the page. */
function download(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AuditLog({ api, role }: { api: ConsoleApi; role: string }) {
  const db = useDb();
  const { toast } = useToaster();
  const [filters, setFilters] = useState<AuditFilterState>(DEFAULT_FILTERS);
  const [q, setQ] = useState('');
  const [list, setList] = useState<List>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<AuditRow | null>(null);
  const [exporting, setExporting] = useState(false);

  // The search waits for a pause in typing, so each keystroke is not a request.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === q ? f : { ...f, q })), 300);
    return () => clearTimeout(t);
  }, [q]);

  // `attempt` is a dependency on purpose: Retry, and the refresh after an export, ask again.
  const query = useMemo(() => auditFiltersFor(filters, clock.now()), [filters, attempt]);

  useEffect(() => {
    let alive = true;
    setList({ kind: 'loading' });
    api.audit(query).then(
      (p) => alive && setList({ kind: 'ready', rows: p.rows, nextCursor: p.nextCursor, more: false }),
      (e: unknown) => alive && setList({ kind: 'error', failure: failureOf(e) }),
    );
    return () => {
      alive = false;
    };
  }, [api, query]);

  const loadMore = useCallback(() => {
    if (list.kind !== 'ready' || !list.nextCursor) return;
    setList({ ...list, more: true });
    api.audit(query, list.nextCursor).then(
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
      const { csv, filename } = await api.exportAudit(query);
      download(csv, filename);
      toast(AUDIT_COPY.exported, 'success');
      setAttempt((n) => n + 1);
    } catch (e) {
      toast(exportFailure(failureOf(e), e instanceof Error ? e.message : ''), 'warn');
    } finally {
      setExporting(false);
    }
  }, [api, query, toast]);

  const set = <K extends keyof AuditFilterState>(key: K, value: AuditFilterState[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const clear = () => {
    setQ('');
    setFilters(DEFAULT_FILTERS);
  };

  const staffOptions = useMemo(() => actorOptions(db.staff), [db.staff]);
  const actions = useMemo(() => actionOptions(), []);
  const byId = useMemo(() => new Map(list.kind === 'ready' ? list.rows.map((r) => [r.id, r]) : []), [list]);

  const columns: Column<AuditRowVM>[] = [
    { key: 'time', label: AUDIT_COPY.columns.time, render: (r) => r.time },
    { key: 'actor', label: AUDIT_COPY.columns.actor, render: (r) => r.actor },
    { key: 'action', label: AUDIT_COPY.columns.action, render: (r) => r.action, mono: true },
    { key: 'target', label: AUDIT_COPY.columns.target, render: (r) => r.target },
    { key: 'outcome', label: AUDIT_COPY.columns.outcome, render: (r) => <StatusBadge {...r.outcome} />, nowrap: true },
  ];

  return (
    <ConsolePage
      title={AUDIT_COPY.title}
      description={AUDIT_COPY.description}
      actions={
        canExport(role) ? (
          <Button icon="download" onClick={() => void runExport()} disabled={exporting} aria-busy={exporting || undefined}>
            {exporting ? AUDIT_COPY.exporting : AUDIT_COPY.export}
          </Button>
        ) : null
      }
    >
      <FilterBar label="Filters">
        <FilterSearch label={AUDIT_COPY.search} value={q} onChange={setQ} />
        <FilterSelect label="Actor" value={filters.actor} options={staffOptions} onChange={(v) => set('actor', v)} />
        <FilterSelect label="Action" value={filters.action} options={actions} onChange={(v) => set('action', v)} />
        <FilterSelect label="Outcome" value={filters.outcome} options={OUTCOME_OPTIONS} onChange={(v) => set('outcome', v as AuditFilterState['outcome'])} />
        <FilterSelect label="Date Range" value={filters.range} options={RANGE_OPTIONS} onChange={(v) => set('range', v as RangeKey)} />
      </FilterBar>

      {list.kind === 'loading' ? (
        <LoadingBlock />
      ) : list.kind === 'error' ? (
        <ErrorBlock copy={errorCopy(list.failure)} onRetry={() => setAttempt((n) => n + 1)} />
      ) : list.rows.length === 0 ? (
        isDefaultFilters(filters) ? (
          <EmptyBlock message={AUDIT_COPY.emptyRange(rangeLabel(filters.range))} action={{ label: AUDIT_COPY.widen, onClick: () => set('range', '30d') }} />
        ) : (
          <EmptyBlock message={AUDIT_COPY.emptyFiltered} action={{ label: AUDIT_COPY.clear, onClick: clear }} />
        )
      ) : (
        <DataTable
          caption={AUDIT_COPY.caption}
          columns={columns}
          rows={list.rows.map(rowVM)}
          rowKey={(r) => r.key}
          onOpen={(r) => setOpen(byId.get(r.key) ?? null)}
          openLabel={(r) => AUDIT_COPY.open(r.time)}
          loadMore={list.nextCursor ? { label: AUDIT_COPY.loadMore, busyLabel: AUDIT_COPY.loadingMore, busy: list.more, onClick: loadMore } : null}
        />
      )}

      <Drawer
        open={open !== null}
        onClose={() => setOpen(null)}
        title={AUDIT_COPY.drawerTitle}
        description={open ? actionGroupLabel(open.action) : undefined}
        width={460}
        variant="surface"
      >
        {open ? <KeyValue pairs={detailVM(open, role)} /> : null}
      </Drawer>
    </ConsolePage>
  );
}

export function Component() {
  const gate = useConsoleGate('audit');
  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <FullState kind="denied" copy={deniedCopy('audit', gate.role)} />;
  if (gate.kind === 'ready') return <AuditLog api={gate.api} role={gate.me.role} />;
  return (
    <ConsolePage title={AUDIT_COPY.title} description={AUDIT_COPY.description}>
      {gate.kind === 'loading' ? <LoadingBlock /> : <ErrorBlock copy={errorCopy(gate.failure)} onRetry={gate.retry} />}
    </ConsolePage>
  );
}

export default Component;
