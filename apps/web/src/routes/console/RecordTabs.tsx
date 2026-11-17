import { useMemo } from 'react';
import { lastDays } from '@ai/core';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Empty } from '../../components/r2/Empty';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Skel, k } from '../../components/r2/kit';
import type { ConsoleApi } from '../../data/console';
import { clock } from '../../lib/clock';
import { LoadError } from './LoadError';
import { useConsolePages, useConsoleRecord } from './useConsoleData';
import { EMAIL_COPY, emailRowVM } from './email.vm';
import type { EmailRowVM } from './email.vm';
import { StatTile } from './Usage';
import { workspaceUsageVM } from './usage.vm';
import s from './Usage.module.css';

// The two record tabs R2-1c drew as seams (D-160) and D-166 makes real, from the same R2 parts as the
// Usage and Email Log screens: a workspace's Usage tab (the last 7 days, four tiles, the mockup's `g4`)
// and a user's "Emails sent" (the mockup's table). Each reads only when its tab is open.

/** A workspace's Usage tab: sign-ins, lesson plays and guide views over 7 days, and storage. */
export function WorkspaceUsageTab({ api, teamId }: { api: ConsoleApi; teamId: string }) {
  const rec = useConsoleRecord(api, (a) => a.usage({ ...lastDays(7, clock.now()), teamId }), `usage:${teamId}`);
  const vm = useMemo(() => (rec.data ? workspaceUsageVM(rec.data) : null), [rec.data]);
  if (rec.status === 'error' && rec.failure) return <LoadError failure={rec.failure} retry={rec.retry} />;
  if (!vm) return <Skel lines={3} />;
  if (vm.state.kind !== 'data')
    return (
      <Card pad={false}>
        <Empty icon="r2Usage" title={vm.state.title} />
      </Card>
    );
  return (
    <div className={s.g4}>
      {vm.stats.map((st) => (
        <StatTile key={st.key} stat={st} />
      ))}
    </div>
  );
}

/** A user's "Emails sent": the email log for their id or address, newest first, a page at a time. */
export function UserEmailsTab({ api, userId }: { api: ConsoleApi; userId: string }) {
  const list = useConsolePages(api, (a, cursor) => a.emails({ userId }, cursor), userId);
  const rows = useMemo(() => list.rows.map(emailRowVM), [list.rows]);
  const C = EMAIL_COPY;
  if (list.status === 'error' && list.failure) return <LoadError failure={list.failure} retry={list.retry} />;
  const cols: Column<EmailRowVM>[] = [
    { key: 'sub', label: C.columns.subject, width: 'minmax(200px,2fr)', value: (e) => e.subject },
    { key: 'tpl', label: C.columns.template, mono: true, width: '136px', hideLap: true, value: (e) => e.template },
    {
      key: 'st',
      label: C.columns.status,
      width: '104px',
      value: (e) => e.status.label,
      cell: (e) => <Status tone={e.status.tone}>{e.status.label}</Status>,
    },
    { key: 't', label: C.columns.sent, width: '128px', noSort: true, value: (e) => e.at, cell: (e) => e.sent },
  ];
  return (
    <Table
      label={C.title}
      cols={cols}
      rows={rows}
      rowKey={(e) => e.key}
      loading={list.status === 'loading'}
      empty={{ icon: 'r2Email', title: C.userEmpty }}
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
  );
}
