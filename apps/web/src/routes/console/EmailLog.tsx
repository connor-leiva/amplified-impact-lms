import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useLocation } from 'react-router';
import { consoleCan } from '@ai/core';
import type { EmailLogRow, EmailRollup } from '@ai/core';
import { Button } from '../../components/r2/Button';
import { Modal } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Find, KV, PageHead, Sel, Skel, Stat, Two, k } from '../../components/r2/kit';
import { useToaster } from '../../components/primitives/Toaster';
import { useAdminChrome } from '../../shell/admin/chrome';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { downloadCsv } from './download';
import { useConsoleGate } from './useConsoleGate';
import { useConsolePages, useSettled } from './useConsoleData';
import {
  EMAIL_COPY as C,
  emailDetailVM,
  emailFiltersFor,
  emailFiltersFromSearch,
  emailRollupVM,
  emailRowVM,
  isDefaultEmailFilters,
  statusOptions,
  templateOptions,
  workspaceChip,
} from './email.vm';
import type { EmailRowVM } from './email.vm';

// /admin/email on R2 (D-166, spec § 7.15): the mockup's `Email`. Every send the API logged, newest
// first, filtered on the server by words, template and status, a page at a time. A row opens its detail
// (the mockup's modal), which says the body is not kept. Export CSV and "Export selected" are the
// Owner's and Admin's (`export`): hidden for Support in the head, locked in the bulk bar; the server
// audits every export. Support reads the log (D3).
//
// D-263: each row's badge is its delivery from Resend's webhook, with its opens and clicks; the five
// tiles are the rollup over every row the filters pick, which the first page carries. Until the current
// filter's rollup arrives they are a loading card (the mockup's `Gate`), never the last filter's figures.

export function Component() {
  const gate = useConsoleGate('email');
  const location = useLocation();
  const { toast } = useAdminChrome();
  const toaster = useToaster();
  const [filters, setFilters] = useState(() => emailFiltersFromSearch(location.search));
  const [options, setOptions] = useState<{ templates: string[]; statuses: string[] }>({ templates: [], statuses: [] });
  const [open, setOpen] = useState<EmailLogRow | null>(null);
  const [rollup, setRollup] = useState<{ key: string; value: EmailRollup } | null>(null);
  const [exporting, setExporting] = useState(false);
  const q = useSettled(filters.q);
  const api = gate.kind === 'ready' ? gate.api : null;
  const query = useMemo(() => emailFiltersFor({ ...filters, q }), [filters, q]);
  const queryKey = JSON.stringify(query);
  const list = useConsolePages(
    api,
    (a, cursor) =>
      a.emails(query, cursor).then((p) => {
        setOptions({ templates: p.templates, statuses: p.statuses });
        if (p.rollup) setRollup({ key: queryKey, value: p.rollup });
        return p;
      }),
    queryKey,
  );
  const tiles = rollup && rollup.key === queryKey && list.status === 'ready' ? emailRollupVM(rollup.value) : null;
  const rows = useMemo(() => list.rows.map(emailRowVM), [list.rows]);
  const byKey = useMemo(() => new Map(list.rows.map((r) => [r.id, r])), [list.rows]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;
  const canExport = gate.kind === 'ready' && consoleCan(gate.me.role, 'export');

  const runExport = (ids?: string[]) => {
    if (!api || exporting) return;
    setExporting(true);
    api.exportEmails(ids ? { ids } : query).then(
      ({ csv, filename }) => {
        downloadCsv(csv, filename);
        setExporting(false);
        toast(C.exported);
      },
      () => {
        setExporting(false);
        toaster.toast(C.exportFailed, 'warn');
      },
    );
  };

  const cols: Column<EmailRowVM>[] = [
    {
      key: 'sub',
      label: C.columns.email,
      width: 'minmax(260px,2fr)',
      value: (e) => e.subject,
      cell: (e) => <Two a={e.subject} b={e.to} mono />,
    },
    { key: 'tpl', label: C.columns.template, mono: true, width: '160px', hideLap: true, value: (e) => e.template },
    {
      key: 'st',
      label: C.columns.status,
      width: '104px',
      value: (e) => e.status.label,
      cell: (e) => <Status tone={e.status.tone}>{e.status.label}</Status>,
    },
    // D-263: how many times it was opened and clicked, from Resend's webhook.
    { key: 'op', label: C.columns.opens, num: true, width: '72px', value: (e) => e.opens },
    { key: 'cl', label: C.columns.clicks, num: true, width: '72px', value: (e) => e.clicks },
    { key: 't', label: C.columns.sent, width: '128px', noSort: true, value: (e) => e.at, cell: (e) => e.sent },
  ];
  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch }));
  const detail = open ? emailDetailVM(open) : null;

  return (
    <Page>
      <PageHead
        title={C.title}
        description={C.description}
        right={
          canExport ? (
            <Button header icon="r2Download" aria-busy={exporting || undefined} onClick={() => runExport()}>
              {C.export}
            </Button>
          ) : undefined
        }
      />
      <div className={k.row}>
        <Find value={filters.q} onChange={(v) => set({ q: v })} placeholder={C.filter} />
        <Sel aria-label={C.template} value={filters.template} onChange={(e) => set({ template: e.target.value })}>
          {templateOptions(options.templates, filters.template).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Sel>
        <Sel aria-label={C.status} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
          {statusOptions(options.statuses.length ? options.statuses : filters.status ? [filters.status] : []).map(
            (o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ),
          )}
        </Sel>
        {filters.teamId ? (
          <Button icon="r2X" title={C.clearWorkspace} onClick={() => set({ teamId: '', workspace: '' })}>
            {workspaceChip(filters.workspace)}
          </Button>
        ) : null}
      </div>
      {gate.kind === 'error' ? (
        <LoadError failure={gate.failure} retry={gate.retry} />
      ) : list.status === 'error' && list.failure ? (
        <LoadError failure={list.failure} retry={list.retry} />
      ) : (
        <>
          {tiles ? (
            <div className={k.g5}>
              {tiles.map((t) => (
                <Stat key={t.key} label={t.label} value={t.value} sub={t.sub} tone={t.tone} />
              ))}
            </div>
          ) : (
            <Skel lines={3} />
          )}
          <Table
            label={C.title}
            cols={cols}
            rows={rows}
            rowKey={(e) => e.key}
            loading={list.status === 'loading' || gate.kind === 'loading'}
            onRow={(e) => setOpen(byKey.get(e.key) ?? null)}
            bulk={(ids) => (
              <Button
                disabled={!canExport || exporting}
                title={canExport ? undefined : 'Your role cannot do this'}
                onClick={() => runExport(ids)}
              >
                {C.exportSelected}
              </Button>
            )}
            empty={{ icon: 'r2Email', title: C.empty }}
            filtered={!isDefaultEmailFilters(filters)}
            footer={
              list.next ? (
                <div className={k.more}>
                  <Button kind="quiet" onClick={list.more} disabled={list.loadingMore}>
                    {C.loadMore}
                  </Button>
                </div>
              ) : null
            }
          />
        </>
      )}
      {detail ? (
        <Modal
          title={detail.title}
          onClose={() => setOpen(null)}
          foot={
            <Button kind="primary" onClick={() => setOpen(null)}>
              {C.detail.done}
            </Button>
          }
        >
          <KV
            rows={detail.rows.map((r) => ({
              label: r.label,
              value: r.status ? (
                <Status tone={r.status.tone}>{r.value}</Status>
              ) : (
                <span className={r.mono ? k.mo : undefined}>{r.value}</span>
              ),
            }))}
          />
          <p className={clsx(k.p, k.me)}>{detail.note}</p>
        </Modal>
      ) : null}
    </Page>
  );
}

export default Component;
