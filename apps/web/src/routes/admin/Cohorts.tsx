import { useCallback, useState } from 'react';
import clsx from 'clsx';
import { useToaster } from '../../components/primitives/Toaster';
import { Button } from '../../components/r2/Button';
import type { MenuEntry } from '../../components/r2/Menu';
import { Modal } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Facts, PageHead, k } from '../../components/r2/kit';
import { ADMIN_COHORT } from '../../data/admin-shell';
import { useDb, useMutate, useNow } from '../../data/hooks';
import { cohortsR2VM, sessionArgsR2, sessionFormR2 } from './Cohorts.vm';
import type { CohortsR2Row, SessionForm } from './Cohorts.vm';
import s from './Cohorts.module.css';

// Admin Cohorts & Sessions `/admin/cohorts` on the Admin redesign R2 (D-160 R2-2b): the signed-off
// mockup's `Cohorts` (AdminRedesign.jsx), drawn from `cohortsR2VM`: the current cohort's key facts and
// its sessions, every time in MST (BUILD-SPEC § 7). Each session's "…" holds what the old schedule
// offered, through the same mutations: Edit session (`updateSession`, the date and time typed in
// MST), Copy join link, and Go Live, End Session or Publish Replay when the session is at that step.
//
// Add session is drawn and does nothing (`aria-disabled`): the app cannot add a session. The old
// cohort cards (picking another cohort, New Cohort, Open Enrollment) are not drawn. Both are listed
// under Needs Connor's call (D-160 R2-2b).

export function Component() {
  const db = useDb();
  const now = useNow();
  const mutate = useMutate();
  const { toast } = useToaster();
  const vm = cohortsR2VM(db, now, ADMIN_COHORT);

  const [edit, setEdit] = useState<{ id: string; n: number; form: SessionForm; err: string } | null>(null);

  const warn = useCallback((e?: string) => e && toast(e, 'warn'), [toast]);

  const copy = useCallback(
    (url: string) => {
      try {
        void navigator.clipboard.writeText(url);
      } catch {
        /* no clipboard permission: confirm anyway, as before */
      }
      toast('Zoom link copied');
    },
    [toast],
  );

  const openEdit = (r: CohortsR2Row) => {
    const sess = db.sessions.find((x) => x.id === r.id);
    if (sess) setEdit({ id: sess.id, n: sess.n, form: sessionFormR2(sess), err: '' });
  };
  const setField = (key: keyof SessionForm, v: string) =>
    setEdit((e) => (e ? { ...e, form: { ...e.form, [key]: v }, err: '' } : e));
  const save = async () => {
    if (!edit) return;
    const out = await mutate('updateSession', sessionArgsR2(edit.id, edit.form));
    if (out.error) setEdit((e) => (e ? { ...e, err: out.error! } : e));
    else setEdit(null);
  };

  const menu = (r: CohortsR2Row): MenuEntry[] => [
    { label: 'Edit session', onSelect: () => openEdit(r) },
    ...(r.zoom ? [{ label: 'Copy join link', onSelect: () => copy(r.zoom) }] : []),
    ...(r.primary
      ? [
          'separator' as const,
          {
            label: r.primary.label,
            onSelect: () => void mutate(r.primary!.mutation, { sessionId: r.id }).then((o) => warn(o.error)),
          },
        ]
      : []),
  ];

  const cols: Column<CohortsR2Row>[] = [
    {
      key: 'title',
      label: 'Session',
      width: 'minmax(250px,1.6fr)',
      value: (r) => r.title,
      cell: (r) => <span className={clsx(k.w5, k.el, s.block)}>{r.title}</span>,
    },
    {
      key: 'when',
      label: 'When',
      width: '188px',
      noSort: true,
      value: (r) => r.when,
      cell: (r) => (
        <div className={clsx(k.col, k.col0)}>
          <span className={k.el}>{r.when}</span>
          <span className={k.me}>Live on Zoom</span>
        </div>
      ),
    },
    { key: 'week', label: 'Module', width: '68px', hideLap: true, value: (r) => r.week },
    {
      key: 'invite',
      label: 'Zoom invite',
      width: '112px',
      value: (r) => r.invite.label,
      cell: (r) => <Status tone={r.invite.tone}>{r.invite.label}</Status>,
    },
    {
      key: 'replay',
      label: 'Replay',
      width: '72px',
      value: (r) => r.replay?.label ?? '',
      cell: (r) =>
        r.replay ? <Status tone={r.replay.tone}>{r.replay.label}</Status> : <span className={k.mu}>—</span>,
    },
    {
      key: 'att',
      label: 'Attendance',
      width: '88px',
      num: true,
      value: (r) => r.attendance ?? '',
      cell: (r) => r.attendance ?? <span className={k.mu}>—</span>,
    },
  ];

  return (
    <Page>
      <PageHead
        title="Cohorts & Sessions"
        description="The cohort calendar and each live build on Zoom. All times are MST (America/Phoenix)."
        right={
          <Button header kind="primary" icon="r2Plus" aria-disabled="true" title="Sessions come with the cohort">
            Add session
          </Button>
        }
      />
      {vm ? (
        <>
          <Facts
            items={[
              { label: 'Cohort', value: vm.facts.cohort },
              { label: 'Status', value: <Status tone={vm.facts.status.tone}>{vm.facts.status.label}</Status> },
              { label: 'Opens', value: vm.facts.opens, wide: true },
              { label: 'Week', value: vm.facts.week },
              { label: 'Enrolled', value: vm.facts.enrolled },
              { label: 'Cadence', value: vm.facts.cadence, wide: true },
            ]}
          />
          <Table
            label="Sessions"
            title="Sessions"
            cols={cols}
            rows={vm.rows}
            rowKey={(r) => r.id}
            menu={menu}
            empty={{
              icon: 'r2Cohorts',
              title: 'No sessions scheduled',
              body: 'Add the first live build for this cohort.',
            }}
          />
        </>
      ) : null}

      {edit ? (
        <Modal
          title={`Edit Session ${edit.n}`}
          onClose={() => setEdit(null)}
          foot={
            <>
              <Button onClick={() => setEdit(null)}>Cancel</Button>
              <Button kind="primary" onClick={() => void save()}>
                Save session
              </Button>
            </>
          }
        >
          <label className={s.lab}>
            Title
            <input className={k.in} value={edit.form.title} onChange={(e) => setField('title', e.target.value)} />
          </label>
          <div className={clsx(k.row, s.pair)}>
            <label className={s.lab}>
              Date
              <input
                className={k.in}
                type="date"
                value={edit.form.date}
                onChange={(e) => setField('date', e.target.value)}
              />
            </label>
            <label className={s.lab}>
              Start time (MST)
              <input
                className={k.in}
                type="time"
                value={edit.form.time}
                onChange={(e) => setField('time', e.target.value)}
              />
            </label>
          </div>
          <label className={s.lab}>
            Duration (minutes)
            <input
              className={k.in}
              type="number"
              min={1}
              value={edit.form.mins}
              onChange={(e) => setField('mins', e.target.value)}
            />
          </label>
          <label className={s.lab}>
            Zoom link
            <input className={k.in} value={edit.form.zoom} onChange={(e) => setField('zoom', e.target.value)} />
          </label>
          {edit.err ? (
            <p role="alert" className={clsx(k.p, s.err)}>
              {edit.err}
            </p>
          ) : null}
        </Modal>
      ) : null}
    </Page>
  );
}

export default Component;
