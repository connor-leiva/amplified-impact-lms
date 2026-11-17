// /admin/audit (D-157, spec § 7.8) on the Admin redesign R2 (D-160 R2-3b): the signed-off mockup's
// `Audit` (AdminRedesign.jsx). The filters, the table (cards on a phone), the detail drawer, Load
// More and Export CSV for the roles that may export, as before. Markup only: every word and time comes
// from AuditLog.vm.ts. `audit_log` stays append-only: nothing here writes to it but the export, which
// the server audits.
//
//   - The mockup's row checkboxes are drawn; its "Export selected" (D-172) exports exactly the selected
//     rows as CSV through the same export (`ids`, 1 to 500, audited, 10,000 rows at most), for the
//     roles that may export (Owner, Admin, D6). For the others the bar has no Export selected.
//   - No Outcome filter on the screen: the mockup draws none (its filter row ends at Date range), so
//     the "…" that held it is gone (the Nov 16 eye check); the API keeps `outcome`, and the entry's
//     drawer shows each row's outcome.
//   - A row (or its time, by keyboard) opens the entry's detail in the R2 drawer.

import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { AuditRow } from '@ai/core';
import { Button } from '../../components/r2/Button';
import { Box } from '../../components/r2/Card';
import { Drawer } from '../../components/r2/Drawer';
import { Empty } from '../../components/r2/Empty';
import { Page } from '../../components/r2/Page';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { ErrorState, Find, KV, PageHead, Sel, Skel, k } from '../../components/r2/kit';
import { useToaster } from '../../components/primitives/Toaster';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';
import { useDb } from '../../data/hooks';
import { clock } from '../../lib/clock';
import {
  AUDIT_COPY,
  AUDIT_R2_COPY,
  DEFAULT_FILTERS,
  RANGE_OPTIONS_R2,
  actionGroupLabel,
  actionOptionsR2,
  actorOptionsR2,
  auditFiltersFor,
  canExport,
  detailR2,
  exportFailure,
  isDefaultFilters,
  rowR2,
} from './AuditLog.vm';
import type { AuditFilterState, AuditR2Row, RangeKey } from './AuditLog.vm';
import { CONSOLE_SCREENS, errorCopy } from './console.vm';
import { Denied } from './Denied';
import { useConsoleGate } from './useConsoleGate';
import s from './AuditLog.module.css';

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

function ExportButton({ role, busy, onClick }: { role: string | null; busy?: boolean; onClick?: () => void }) {
  return canExport(role) ? (
    <Button header icon="r2Download" onClick={onClick} aria-busy={busy || undefined} aria-disabled={busy || undefined}>
      {busy ? AUDIT_COPY.exporting : AUDIT_COPY.export}
    </Button>
  ) : (
    <Button header icon="r2Lock" aria-disabled="true" title="Your role cannot do this">
      {AUDIT_COPY.export}
    </Button>
  );
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

  /** Export CSV (the filters) or, with `ids`, Export selected (exactly those rows; D-172). */
  const runExport = useCallback(async (ids?: string[]) => {
    if (exporting) return;
    setExporting(true);
    try {
      const { csv, filename } = await api.exportAudit(ids ? { ids } : query);
      download(csv, filename);
      toast(AUDIT_COPY.exported, 'success');
      setAttempt((n) => n + 1);
    } catch (e) {
      toast(exportFailure(failureOf(e), e instanceof Error ? e.message : ''), 'warn');
    } finally {
      setExporting(false);
    }
  }, [api, exporting, query, toast]);

  const set = <K extends keyof AuditFilterState>(key: K, value: AuditFilterState[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const clear = () => {
    setQ('');
    setFilters(DEFAULT_FILTERS);
  };

  const actors = useMemo(() => actorOptionsR2(db.staff), [db.staff]);
  const actions = useMemo(() => actionOptionsR2(), []);
  const byId = useMemo(() => new Map(list.kind === 'ready' ? list.rows.map((r) => [r.id, r]) : []), [list]);
  const view = (r: AuditR2Row) => setOpen(byId.get(r.key) ?? null);

  const cols: Column<AuditR2Row>[] = [
    {
      key: 'time',
      label: AUDIT_COPY.columns.time,
      width: '136px',
      noSort: true,
      value: (r) => r.time,
      cell: (r) => (
        <span className={clsx(k.mo, k.s2)}>
          <button type="button" className={clsx(k.lk, s.time)} aria-label={AUDIT_COPY.open(r.time)} onClick={() => view(r)}>
            {r.time}
          </button>
        </span>
      ),
    },
    { key: 'actor', label: AUDIT_COPY.columns.actor, width: '128px', value: (r) => r.actor },
    { key: 'action', label: AUDIT_COPY.columns.action, width: 'minmax(210px,1.2fr)', mono: true, value: (r) => r.action },
    { key: 'target', label: AUDIT_COPY.columns.target, width: 'minmax(110px,.9fr)', value: (r) => r.target },
    {
      key: 'detail',
      label: 'Detail',
      width: 'minmax(160px,1.6fr)',
      noSort: true,
      hideLap: true,
      value: (r) => r.detail,
      cell: (r) => <span className={k.s2}>{r.detail}</span>,
    },
  ];

  return (
    <Page>
      <PageHead
        title={AUDIT_COPY.title}
        description={AUDIT_R2_COPY.description}
        right={<ExportButton role={role} busy={exporting} onClick={() => void runExport()} />}
      />
      <div className={k.row}>
        <Find value={q} onChange={setQ} placeholder={AUDIT_R2_COPY.search} />
        <Sel aria-label="Actor" value={filters.actor} onChange={(e) => set('actor', e.target.value)}>
          {actors.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Sel>
        <Sel aria-label="Action" value={filters.action} onChange={(e) => set('action', e.target.value)}>
          {actions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Sel>
        <Sel aria-label="Date range" value={filters.range} onChange={(e) => set('range', e.target.value as RangeKey)}>
          {RANGE_OPTIONS_R2.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Sel>
      </div>

      {list.kind === 'error' ? (
        <Box>
          <ErrorState copy={errorCopy(list.failure)} onRetry={() => setAttempt((n) => n + 1)} />
        </Box>
      ) : list.kind === 'ready' && list.rows.length === 0 ? (
        <Box>
          {isDefaultFilters(filters) ? (
            <Empty icon="r2Audit" title={AUDIT_R2_COPY.emptyTitle} body={AUDIT_R2_COPY.emptyBody}>
              <Button className={s.cta} onClick={() => set('range', '30d')}>
                {AUDIT_COPY.widen}
              </Button>
            </Empty>
          ) : (
            <Empty icon="r2Search" title="No matches" body="Try a different search or clear the filters.">
              <Button className={s.cta} onClick={clear}>
                {AUDIT_COPY.clear}
              </Button>
            </Empty>
          )}
        </Box>
      ) : (
        <Table
          label={AUDIT_COPY.caption}
          cols={cols}
          rows={list.kind === 'ready' ? list.rows.map(rowR2) : []}
          loading={list.kind === 'loading'}
          rowKey={(r) => r.key}
          onRow={view}
          bulk={(keys) =>
            canExport(role) ? (
              <Button onClick={() => void runExport(keys)} aria-busy={exporting || undefined} aria-disabled={exporting || undefined}>
                {AUDIT_R2_COPY.exportSelected}
              </Button>
            ) : null
          }
          empty={{ icon: 'r2Audit', title: AUDIT_R2_COPY.emptyTitle, body: AUDIT_R2_COPY.emptyBody }}
          footer={
            list.kind === 'ready' && list.nextCursor ? (
              <div className={s.more2}>
                <Button onClick={loadMore} aria-busy={list.more || undefined}>
                  {list.more ? AUDIT_COPY.loadingMore : AUDIT_COPY.loadMore}
                </Button>
              </div>
            ) : null
          }
        />
      )}

      {open ? (
        <Drawer title={AUDIT_COPY.drawerTitle} description={actionGroupLabel(open.action)} width={460} onClose={() => setOpen(null)}>
          <KV
            rows={detailR2(open, role).map((p) => ({
              label: p.label,
              value: p.pre ? <pre className={s.pre}>{p.value}</pre> : <span className={p.mono ? k.mo : undefined}>{p.value}</span>,
            }))}
          />
        </Drawer>
      ) : null}
    </Page>
  );
}

export function Component() {
  const gate = useConsoleGate('audit');
  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={CONSOLE_SCREENS.audit.title} role={gate.role} />;
  if (gate.kind === 'ready') return <AuditLog api={gate.api} role={gate.me.role} />;
  return (
    <Page>
      <PageHead title={AUDIT_COPY.title} description={AUDIT_R2_COPY.description} />
      {gate.kind === 'loading' ? (
        <Skel lines={8} />
      ) : (
        <Box>
          <ErrorState copy={errorCopy(gate.failure)} onRetry={gate.retry} />
        </Box>
      )}
    </Page>
  );
}

export default Component;
