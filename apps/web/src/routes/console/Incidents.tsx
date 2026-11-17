import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/r2/Button';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { PageHead, Pill, Sel, Two, k } from '../../components/r2/kit';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsolePages } from './useConsoleData';
import { INCIDENTS_COPY as C, STATUS_OPTIONS, incidentFiltersFor, incidentRowVM } from './incidents.vm';
import type { IncidentRowVM } from './incidents.vm';

// /admin/incidents on R2 (D-167, spec § 7.14): the mockup's `Incidents()`. Every incident, newest
// first, by status, a page at a time; a row opens its timeline. Real incidents only: the rules open
// them (D5), staff acknowledge and resolve them. With none, the mockup's empty state.

export function Component() {
  const gate = useConsoleGate('incidents');
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const api = gate.kind === 'ready' ? gate.api : null;
  const filters = useMemo(() => incidentFiltersFor(status), [status]);
  const list = useConsolePages(api, (a, cursor) => a.incidents(filters, cursor), status);
  const rows = useMemo(() => list.rows.map(incidentRowVM), [list.rows]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;

  const cols: Column<IncidentRowVM>[] = [
    {
      key: 't',
      label: C.columns.incident,
      width: 'minmax(240px,2fr)',
      value: (r) => r.title,
      cell: (r, f) => <Two a={r.title} b={r.id} mono to={f.phone ? undefined : r.href} />,
    },
    { key: 'sev', label: C.columns.severity, width: '88px', value: (r) => r.severityRank, cell: (r) => <Pill status={r.severity} /> },
    {
      key: 'st',
      label: C.columns.status,
      width: '128px',
      value: (r) => r.status.label,
      cell: (r) => <Status tone={r.status.tone}>{r.status.label}</Status>,
    },
    { key: 'own', label: C.columns.owner, width: '128px', hideLap: true, value: (r) => r.owner },
    { key: 'o', label: C.columns.opened, width: '128px', noSort: true, value: (r) => r.openedAt, cell: (r) => r.opened },
  ];

  return (
    <Page>
      <PageHead title={C.title} description={C.description} />
      <div className={k.row}>
        <Sel aria-label={C.status} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>
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
          rowKey={(r) => r.key}
          loading={list.status === 'loading' || gate.kind === 'loading'}
          onRow={(r) => navigate(r.href)}
          empty={{ icon: 'r2Check', title: C.empty.title, body: C.empty.body }}
          filtered={status !== ''}
          footer={
            list.next ? (
              <div className={k.more}>
                <Button kind="quiet" onClick={list.more} disabled={list.loadingMore}>
                  {C.more}
                </Button>
              </div>
            ) : null
          }
        />
      )}
    </Page>
  );
}

export default Component;
