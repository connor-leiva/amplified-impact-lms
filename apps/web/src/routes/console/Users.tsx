import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router';
import { Button } from '../../components/r2/Button';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Avatar, Find, PageHead, Sel, Two, k } from '../../components/r2/kit';
import { useAdminChrome } from '../../shell/admin/chrome';
import { consoleCan } from '@ai/core';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { downloadCsv } from './download';
import { useConsoleGate } from './useConsoleGate';
import { useConsolePages, useSettled } from './useConsoleData';
import { useMasqueradeEntry } from './useMasqueradeEntry';
import {
  DEFAULT_USER_FILTERS,
  ROLE_OPTIONS,
  USERS_COPY as C,
  isDefaultUserFilters,
  userFiltersFor,
  userRowVM,
} from './users.vm';
import type { UserRowVM } from './users.vm';

// /admin/users on R2 (D-160 R2-1c, spec § 7.4): the mockup's `Users`. Learners by words and role, a
// page at a time; a row opens the person. "Export selected" (Owner and Admin, `export`) downloads the
// chosen rows as the API's CSV, and the export is an audit row. "Masquerade…" opens the reason dialog
// (D-162 3b): Owner and Admin, a learner only.

export function Component() {
  const gate = useConsoleGate('users');
  const navigate = useNavigate();
  const { toast } = useAdminChrome();
  const [filters, setFilters] = useState(DEFAULT_USER_FILTERS);
  const [exporting, setExporting] = useState(false);
  const q = useSettled(filters.q);
  const api = gate.kind === 'ready' ? gate.api : null;
  const query = useMemo(() => userFiltersFor({ ...filters, q }), [filters, q]);
  const list = useConsolePages(api, (a, cursor) => a.users(query, cursor), JSON.stringify(query));
  const rows = useMemo(() => list.rows.map(userRowVM), [list.rows]);
  const raw = useMemo(() => new Map(list.rows.map((u) => [u.id, u])), [list.rows]);
  const entry = useMasqueradeEntry(gate.kind === 'ready' ? gate.me : null);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;
  const canExport = gate.kind === 'ready' && consoleCan(gate.me.role, 'export');

  const cols: Column<UserRowVM>[] = [
    {
      key: 'n',
      label: C.columns.name,
      width: 'minmax(220px,1.6fr)',
      value: (u) => u.name,
      cell: (u, f) => (
        <div className={clsx(k.row, k.nw)} style={{ gap: 10 }}>
          <Avatar initials={u.initials} />
          <Two a={u.name} b={f.drop ? `${u.role} · ${u.email}` : u.email} to={f.phone ? undefined : u.href} />
        </div>
      ),
    },
    { key: 'ws', label: C.columns.workspace, width: 'minmax(150px,1fr)', value: (u) => u.workspace },
    { key: 'role', label: C.columns.role, width: '104px', hideLap: true, value: (u) => u.role },
    {
      key: 'status',
      label: C.columns.status,
      width: '104px',
      value: (u) => u.status.label,
      cell: (u) => <Status tone={u.status.tone}>{u.status.label}</Status>,
    },
    { key: 'last', label: C.columns.last, width: '128px', noSort: true, value: (u) => u.lastAt, cell: (u) => u.last },
  ];

  const exportSelected = (ids: string[]) => {
    if (!api) return;
    setExporting(true);
    api.exportUsers({ ids }).then(
      ({ csv, filename }) => {
        downloadCsv(csv, filename);
        setExporting(false);
        toast(C.exported);
      },
      () => setExporting(false),
    );
  };

  return (
    <Page>
      <PageHead title={C.title} description={C.description} />
      <div className={k.row}>
        <Find value={filters.q} onChange={(v) => setFilters((f) => ({ ...f, q: v }))} placeholder={C.filter} />
        <Sel
          aria-label={C.role}
          value={filters.role}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
        >
          {ROLE_OPTIONS.map((o) => (
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
          rowKey={(u) => u.key}
          loading={list.status === 'loading' || gate.kind === 'loading'}
          onRow={(u) => navigate(u.href)}
          bulk={(ids) => (
            <Button
              disabled={!canExport || exporting}
              title={canExport ? undefined : 'Your role cannot do this'}
              onClick={() => exportSelected(ids)}
            >
              {C.exportSelected}
            </Button>
          )}
          menu={(u) => {
            const r = raw.get(u.key);
            return [
              { label: C.open, onSelect: () => navigate(u.href) },
              ...(r ? entry.item(C.masquerade, { id: r.id, name: r.name, workspace: r.workspace }, r.kind) : []),
            ];
          }}
          empty={{ icon: 'r2Users', title: C.empty }}
          filtered={!isDefaultUserFilters(filters)}
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
