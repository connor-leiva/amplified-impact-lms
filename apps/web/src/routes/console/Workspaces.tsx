import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router';
import { Button, ButtonLink } from '../../components/r2/Button';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Bar, Find, PageHead, Pill, Sel, Two, k, Stamp } from '../../components/r2/kit';
import { isFixture } from '../../data/boot';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsolePages, useSettled } from './useConsoleData';
import { useMasqueradeEntry } from './useMasqueradeEntry';
import {
  DEFAULT_WORKSPACE_FILTERS,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  WORKSPACES_COPY as C,
  isDefaultWorkspaceFilters,
  workspaceFiltersFor,
  workspaceRowVM,
} from './workspaces.vm';
import type { WorkspaceRowVM } from './workspaces.vm';

// /admin/workspaces on R2 (D-160 R2-1c, spec § 7.3): the mockup's `Workspaces`. Every team and solo
// account, filtered on the server by words, plan and status, a page at a time; a row opens its
// workspace. "Masquerade as owner…" opens the reason dialog for its owner (D-162 3b): Owner and Admin.

export function Component() {
  const gate = useConsoleGate('workspaces');
  const navigate = useNavigate();
  const [filters, setFilters] = useState(DEFAULT_WORKSPACE_FILTERS);
  const q = useSettled(filters.q);
  const api = gate.kind === 'ready' ? gate.api : null;
  const query = useMemo(() => workspaceFiltersFor({ ...filters, q }), [filters, q]);
  const list = useConsolePages(api, (a, cursor) => a.workspaces(query, cursor), JSON.stringify(query));
  const rows = useMemo(() => list.rows.map(workspaceRowVM), [list.rows]);
  const raw = useMemo(() => new Map(list.rows.map((w) => [w.teamId, w])), [list.rows]);
  const entry = useMasqueradeEntry(gate.kind === 'ready' ? gate.me : null);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;

  const cols: Column<WorkspaceRowVM>[] = [
    {
      key: 'n',
      label: C.columns.name,
      width: 'minmax(170px,1.3fr)',
      value: (w) => w.name,
      cell: (w, f) => {
        const name = (
          <Two a={w.name} b={f.drop ? `${w.owner} · ${w.id}` : w.id} mono={!f.drop} to={f.phone ? undefined : w.href} />
        );
        if (!w.comped) return name;
        return (
          <span className={clsx(k.row, k.nw)} style={{ gap: 8 }}>
            {name}
            <Pill tone="info">Comped</Pill>
          </span>
        );
      },
    },
    { key: 'owner', label: C.columns.owner, width: 'minmax(116px,.9fr)', hideLap: true, value: (w) => w.owner },
    { key: 'plan', label: C.columns.plan, width: 'minmax(140px,1.1fr)', value: (w) => w.plan },
    {
      key: 'seats',
      label: C.columns.seats,
      width: '132px',
      value: (w) => w.seats.pct,
      cell: (w) => (
        <span className={clsx(k.row, k.nw)} style={{ gap: 10 }}>
          <Bar pct={w.seats.pct} kind={w.seats.bar} />
          <span className={k.tn} style={{ minWidth: 60, textAlign: 'right', flex: 'none', whiteSpace: 'nowrap' }}>
            {w.seats.used} of {w.seats.cap}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      label: C.columns.status,
      width: '96px',
      value: (w) => w.status.label,
      cell: (w) => <Status tone={w.status.tone}>{w.status.label}</Status>,
    },
    {
      key: 'last',
      label: C.columns.last,
      width: '124px',
      noSort: true,
      value: (w) => w.lastAt,
      cell: (w) => <Stamp v={w.last} two />,
    },
  ];

  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <Page>
      <PageHead
        title={C.title}
        description={C.description}
        right={
          !isFixture && gate.kind === 'ready' && gate.me.caps.includes('billing.comp') ? (
            <ButtonLink kind="primary" to="/admin/people/comp">
              Comp a Team
            </ButtonLink>
          ) : undefined
        }
      />
      <div className={k.row}>
        <Find value={filters.q} onChange={(v) => set({ q: v })} placeholder={C.filter} />
        <Sel aria-label={C.plan} value={filters.plan} onChange={(e) => set({ plan: e.target.value })}>
          {PLAN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Sel>
        <Sel aria-label={C.status} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Sel>
      </div>
      {gate.kind === 'error' ? (
        <LoadError failure={gate.failure} retry={gate.retry} />
      ) : list.status === 'error' && list.failure ? (
        <LoadError failure={list.failure} retry={list.retry} />
      ) : (
        <Table
          label={C.title}
          cols={cols}
          rows={rows}
          rowKey={(w) => w.key}
          loading={list.status === 'loading' || gate.kind === 'loading'}
          onRow={(w) => navigate(w.href)}
          menu={(w) => {
            const r = raw.get(w.key);
            return [
              { label: C.open, onSelect: () => navigate(w.href) },
              ...(r?.ownerId
                ? entry.item(C.masquerade, { id: r.ownerId, name: r.ownerName ?? w.owner, workspace: r.name })
                : []),
            ];
          }}
          empty={{ icon: 'r2Workspaces', title: C.empty.title, body: C.empty.body }}
          filtered={!isDefaultWorkspaceFilters(filters)}
          footer={
            list.next ? (
              <div className={k.more}>
                <Button kind="quiet" onClick={list.more} disabled={list.loadingMore}>
                  Load more
                </Button>
              </div>
            ) : null
          }
        />
      )}
      {entry.dialog}
    </Page>
  );
}

export default Component;
