import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { consoleCan } from '@ai/core';
import type { MenuEntry } from '../../components/r2/Menu';
import { Confirm } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { PageHead, k } from '../../components/r2/kit';
import { ConsoleError } from '../../data/console';
import { useAdminChrome } from '../../shell/admin/chrome';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsoleRecord } from './useConsoleData';
import { JOBS_COPY as C, NONE, jobsVM, runningVM } from './ops.vm';
import type { JobVM } from './ops.vm';
import s from './Ops.module.css';

// /admin/jobs on R2 (D-165, spec § 7.10): the mockup's `Jobs()`. Every scheduled job from code
// (`JOB_SCHEDULES`), its latest tick (`job_ticks`), and Run Now for the six the allowlist names (D14):
// a confirm, then one extra run of the scheduler's tick, audited. Billing never runs by hand, and its
// row says so (spec § 7.10). Support sees the list and no Run Now (D3). "Open incident" waits for the
// Incidents screen.

export function Component() {
  const gate = useConsoleGate('jobs');
  const { toast } = useAdminChrome();
  const api = gate.kind === 'ready' ? gate.api : null;
  const [reload, setReload] = useState(0);
  const rec = useConsoleRecord(api, (a) => a.jobs(), `jobs:${reload}`);
  const [running, setRunning] = useState<Readonly<Record<string, true>>>({});
  const [confirm, setConfirm] = useState<JobVM | null>(null);
  const rows = useMemo(() => (rec.data ? jobsVM(rec.data, rec.data.asOf) : []), [rec.data]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;
  // Support sees every job and no Run Now (D3).
  const canRun = gate.kind === 'ready' && consoleCan(gate.me.role, 'jobs.run_now');
  const shown = rows.map((r) => (running[r.job] ? runningVM(r) : r));

  const cols: Column<JobVM>[] = [
    {
      key: 'j',
      label: C.columns.job,
      mono: true,
      width: 'minmax(180px,1.5fr)',
      value: (r) => r.job,
      cell: (r) =>
        r.note ? (
          <>
            {r.job}
            <span className={clsx(k.me, s.note)}>{r.note}</span>
          </>
        ) : (
          r.job
        ),
    },
    { key: 'sch', label: C.columns.schedule, width: 'minmax(110px,1fr)', value: (r) => r.schedule },
    {
      key: 'st',
      label: C.columns.result,
      width: '120px',
      value: (r) => r.status?.label ?? NONE,
      cell: (r) => (r.status ? <Status tone={r.status.tone}>{r.status.label}</Status> : NONE),
    },
    { key: 'last', label: C.columns.last, width: '136px', noSort: true, value: (r) => r.lastAt, cell: (r) => r.last },
    { key: 'dur', label: C.columns.duration, num: true, noSort: true, width: '72px', hideLap: true, value: (r) => r.durationMs, cell: (r) => r.duration },
    { key: 'next', label: C.columns.next, width: '136px', noSort: true, value: (r) => r.nextAt, cell: (r) => r.next },
  ];

  const menu = (r: JobVM): MenuEntry[] => [
    ...(!canRun
      ? []
      : r.runNow === 'allowed'
        ? [{ label: C.runNow, icon: 'r2Play' as const, disabled: !!running[r.job], onSelect: () => setConfirm(r) }]
        : [{ label: C.off(r.job), disabled: true, onSelect: () => {} }]),
    ...(r.failed ? [{ label: C.openIncident, disabled: true, title: C.incidentsLater, onSelect: () => {} }] : []),
  ];

  const run = (r: JobVM) => {
    if (!api) return;
    setRunning((m) => ({ ...m, [r.job]: true }));
    toast(C.started(r.job));
    const done = () => {
      setRunning((m) => {
        const next = { ...m };
        delete next[r.job];
        return next;
      });
      setReload((n) => n + 1);
    };
    api.runJob(r.job).then(done, (e: unknown) => {
      done();
      toast(e instanceof ConsoleError ? e.message : 'The run didn’t start.');
    });
  };

  return (
    <Page>
      <PageHead title={C.title} description={C.description} />
      {gate.kind === 'error' ? (
        <LoadError failure={gate.failure} retry={gate.retry} />
      ) : rec.status === 'error' && rec.failure ? (
        <LoadError failure={rec.failure} retry={rec.retry} />
      ) : (
        <Table
          label={C.title}
          cols={cols}
          rows={shown}
          rowKey={(r) => r.key}
          loading={rec.status === 'loading' || gate.kind === 'loading'}
          menu={menu}
          empty={{ icon: 'r2Jobs', title: C.empty }}
        />
      )}
      <p className={clsx(k.p, k.me)}>{C.foot}</p>
      {confirm ? (
        <Confirm
          title={C.confirm.title(confirm.job)}
          body={C.confirm.body(confirm.schedule)}
          cta={C.confirm.cta(confirm.job)}
          audited
          onClose={() => setConfirm(null)}
          onConfirm={() => run(confirm)}
        />
      ) : null}
    </Page>
  );
}

export default Component;
