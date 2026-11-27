import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/r2/Button';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Find, PageHead, Pill, Stamp, Two, k } from '../../components/r2/kit';
import { useAdminChrome } from '../../shell/admin/chrome';
import { consoleCan } from '@ai/core';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { downloadCsv } from './download';
import { useConsoleGate } from './useConsoleGate';
import { useConsolePages, useSettled } from './useConsoleData';
import { useMasqueradeEntry } from './useMasqueradeEntry';
import { USERS_COPY } from './users.vm';
import { EVERYONE_COPY as C, audChips, everyoneRow, everyoneShowing } from '../admin/people/people.vm';
import type { EveryoneRow } from '../admin/people/people.vm';
import { useAudiences } from '../admin/people/useAudiences';
import p from '../admin/people/People.module.css';

// R-5 Phase 7 (D-268): People › Everyone (`/admin/people`), the mockup's `PeoplePg` (handoff/admin-mockup/ia-screens.jsx):
// today's Users with one new column and filter, "Got in through" (core's `gotInOf`: the team's primary plan, else a skill
// bought, else the access group). The chips are built from what exists, each person counted once
// (`GET /api/console/users/audiences`). Learners, a page at a time; a row opens the person, or an access group's member
// the group's tab, as the mockup's does. Export (Owner and Admin, `export`) downloads the list on screen as the API's
// CSV, and the export is an audit row. "Masquerade…" opens the reason dialog (D-162 3b).

const DOT: Record<string, string | undefined> = { for: p.for, ok: p.ok, mint: p.mint, info: p.info, warn: p.warn, off: p.off };

export function Component() {
  const gate = useConsoleGate('users');
  const navigate = useNavigate();
  const { toast, cohort } = useAdminChrome();
  const [gotIn, setGotIn] = useState('');
  const [text, setText] = useState('');
  const [exporting, setExporting] = useState(false);
  const q = useSettled(text);
  const api = gate.kind === 'ready' ? gate.api : null;
  const audiences = useAudiences(gate.kind === 'ready');
  const query = useMemo(() => {
    const t = q.trim().slice(0, 100);
    return { kind: 'learner' as const, ...(t ? { q: t } : {}), ...(gotIn ? { gotIn } : {}) };
  }, [q, gotIn]);
  const list = useConsolePages(api, (a, cursor) => a.users(query, cursor), JSON.stringify(query));
  const rows = useMemo(() => list.rows.map(everyoneRow), [list.rows]);
  const raw = useMemo(() => new Map(list.rows.map((u) => [u.id, u])), [list.rows]);
  const entry = useMasqueradeEntry(gate.kind === 'ready' ? gate.me : null);
  const chips = audChips(audiences);
  const cohortPeople = cohort.id ? `/admin/cohort/${encodeURIComponent(cohort.id)}/people` : '/admin/cohort';

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={USERS_COPY.title} role={gate.role} />;
  const canExport = gate.kind === 'ready' && consoleCan(gate.me.role, 'export');

  const cols: Column<EveryoneRow>[] = [
    {
      key: 'n',
      label: C.columns.person,
      width: 'minmax(220px,1.5fr)',
      value: (u) => u.name,
      cell: (u, f) => <Two a={u.name} b={u.email} to={f.phone ? undefined : u.href} />,
    },
    {
      key: 'gotIn',
      label: C.columns.gotIn,
      width: '136px',
      value: (u) => u.gotIn?.label ?? '',
      cell: (u) =>
        u.gotIn ? (
          <Pill tone="neutral">
            <i className={clsx(p.sq, DOT[u.gotIn.tone])} aria-hidden="true" />
            {u.gotIn.label}
          </Pill>
        ) : null,
    },
    {
      key: 'team',
      label: C.columns.team,
      width: 'minmax(160px,1fr)',
      hideLap: true,
      value: (u) => u.team ?? '',
      cell: (u) => (u.team ? u.team : <span className={k.mu}>{C.onOwn}</span>),
    },
    { key: 'seat', label: C.columns.seat, width: '204px', hideLap: true, value: (u) => u.seat },
    // The review's rule (D-267): a stamp in a narrow column is two lines, MT over its zones (`Stamp`).
    { key: 'last', label: C.columns.last, width: '150px', noSort: true, value: (u) => u.lastAt, cell: (u) => <Stamp v={u.last} two /> },
    {
      key: 'status',
      label: C.columns.status,
      width: '104px',
      value: (u) => u.status.label,
      cell: (u) => <Status tone={u.status.label === 'Invited' ? 'warn' : u.status.tone}>{u.status.label}</Status>,
    },
  ];

  const exportList = () => {
    if (!api) return;
    setExporting(true);
    api.exportUsers(query).then(
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
      <PageHead title={USERS_COPY.title} />
      {chips.length ? (
        <div className={p.chs} role="group" aria-label={C.audience}>
          {chips.map((c) => (
            <button key={c.key || 'all'} type="button" className={clsx(p.ch, gotIn === c.key && p.on)} aria-pressed={gotIn === c.key} onClick={() => setGotIn(c.key)}>
              {c.tone ? <i className={clsx(p.sq, DOT[c.tone])} aria-hidden="true" /> : null}
              {c.label}
              <span className={p.chn} data-number="">
                {c.count}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <div className={k.row}>
        <Find value={text} onChange={setText} placeholder={C.find} />
        <span className={k.sp} />
        <Button icon="download" disabled={!canExport || exporting} title={canExport ? undefined : 'Your role cannot do this'} onClick={exportList}>
          {C.export}
        </Button>
      </div>
      {gate.kind === 'error' ? (
        <LoadError failure={gate.failure} retry={gate.retry} />
      ) : list.status === 'error' && list.failure ? (
        <LoadError failure={list.failure} retry={list.retry} />
      ) : (
        <Table
          label={USERS_COPY.title}
          cols={cols}
          rows={rows}
          rowKey={(u) => u.key}
          loading={list.status === 'loading' || gate.kind === 'loading'}
          onRow={(u) => navigate(u.href)}
          menu={(u) => {
            const r = raw.get(u.key);
            return [
              { label: u.groupName ? C.openGroup(u.groupName) : C.openPerson, onSelect: () => navigate(u.href) },
              ...(u.inCohort ? [{ label: C.inCohort, onSelect: () => navigate(`${cohortPeople}?tab=learners`) }] : []),
              ...(r && !u.groupName ? entry.item(USERS_COPY.masquerade, { id: r.id, name: r.name, workspace: r.workspace }, r.kind) : []),
            ];
          }}
          empty={{ icon: 'r2Users', title: C.empty.title, body: C.empty.body }}
          filtered={gotIn !== '' || text.trim() !== ''}
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
      {list.status === 'ready' ? (
        <p className={clsx(k.p, k.me)}>
          {everyoneShowing(rows.length, audiences, gotIn)} {C.account}{' '}
          <Link className={p.inl} to={cohortPeople}>
            {C.cohortTab}
          </Link>
          .
        </p>
      ) : null}
      {entry.dialog}
    </Page>
  );
}

export default Component;
