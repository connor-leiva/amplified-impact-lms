import { useCallback, useState } from 'react';
import clsx from 'clsx';
import { useParams } from 'react-router';
import { useToaster } from '../../components/primitives/Toaster';
import { Button } from '../../components/r2/Button';
import type { MenuEntry } from '../../components/r2/Menu';
import { Modal } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Facts, PageHead, k } from '../../components/r2/kit';
import { refusal, useAct, useDb, useMutate, useNow } from '../../data/hooks';
import { addSessionArgsR2, blankSessionFormR2, cohortsR2VM, sessionArgsR2, sessionFormR2 } from './Cohorts.vm';
import type { CohortsR2Row, SessionForm } from './Cohorts.vm';
import s from './Cohorts.module.css';
import { CohortFilesButton } from './CohortFiles';

// Admin Cohorts & Sessions `/admin/cohorts` on the Admin redesign R2 (D-160 R2-2b): the signed-off
// mockup's `Cohorts` (AdminRedesign.jsx), drawn from `cohortsR2VM`: the current cohort's key facts and
// its sessions, every time in MST (BUILD-SPEC § 7). Each session's "…" holds what the old schedule
// offered, through the same mutations: Edit session (`updateSession`, the date and time typed in
// MST), Copy join link, and Go Live, End Session or Publish Replay when the session is at that step.
//
// D-172: Add session opens Edit session's fields as "Add session" and adds one to the cohort on
// screen (`addSession`, the time typed in MST, audited `session.create`); a session's "…" adds the
// mockup's Attach replay, for a session that has ended (`attachReplay`: the link, validated, audited
// `session.replay_attach`; an unpublished replay is published as Publish Replay publishes it). The old
// cohort cards (picking another cohort, New Cohort, Open Enrollment) are not drawn (D-160 R2-2b).

export function Component() {
  const db = useDb();
  const now = useNow();
  const mutate = useMutate();
  const act = useAct();
  const { toast } = useToaster();
  // D-253: Cohort › Schedule. The cohort is the address's (`/admin/cohort/:cohortId/schedule`); `ADMIN_COHORT` went.
  const { cohortId = '' } = useParams();
  const vm = cohortsR2VM(db, now, cohortId);

  // `id: null` is Add session; otherwise the session Edit session changes.
  const [edit, setEdit] = useState<{ id: string | null; n: number; form: SessionForm; err: string } | null>(null);
  const [replay, setReplay] = useState<{ id: string; n: number; url: string; err: string } | null>(null);

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
    const out =
      edit.id === null
        ? await act('addSession', addSessionArgsR2(vm?.cohortId ?? cohortId, edit.form))
        : await mutate('updateSession', sessionArgsR2(edit.id, edit.form));
    if (out.error) setEdit((e) => (e ? { ...e, err: out.error! } : e));
    else setEdit(null);
  };
  const attach = async () => {
    if (!replay) return;
    const out = await act('attachReplay', { sessionId: replay.id, url: replay.url });
    if (out.error) setReplay((x) => (x ? { ...x, err: out.error! } : x));
    else setReplay(null);
  };

  const menu = (r: CohortsR2Row): MenuEntry[] => [
    { label: 'Edit session', onSelect: () => openEdit(r) },
    ...(r.zoom ? [{ label: 'Copy join link', onSelect: () => copy(r.zoom) }] : []),
    {
      label: 'Attach replay',
      disabled: !r.ended,
      title: r.ended ? undefined : 'Attach a replay after the session ends.',
      onSelect: () => {
        const n = db.sessions.find((x) => x.id === r.id)?.n ?? 0;
        setReplay({ id: r.id, n, url: r.replayUrl, err: '' });
      },
    },
    ...(r.primary
      ? [
          'separator' as const,
          {
            label: r.primary.label,
            onSelect: () => void mutate(r.primary!.mutation, { sessionId: r.id }).then((o) => warn(refusal(o))),
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
          <>
            {/* D-237: the cohort's turned-in files, deleted when it ends (the agreement's Section 7). */}
            <CohortFilesButton cohortId={vm?.cohortId ?? cohortId} />
            <Button header kind="primary" icon="r2Plus" onClick={() => setEdit({ id: null, n: 0, form: blankSessionFormR2(), err: '' })}>
              Add session
            </Button>
          </>
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
          title={edit.id === null ? 'Add session' : `Edit Session ${edit.n}`}
          onClose={() => setEdit(null)}
          foot={
            <>
              <Button onClick={() => setEdit(null)}>Cancel</Button>
              <Button kind="primary" onClick={() => void save()}>
                {edit.id === null ? 'Add session' : 'Save session'}
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

      {replay ? (
        <Modal
          title="Attach replay"
          onClose={() => setReplay(null)}
          foot={
            <>
              <Button onClick={() => setReplay(null)}>Cancel</Button>
              <Button kind="primary" disabled={!replay.url.trim()} onClick={() => void attach()}>
                Attach replay
              </Button>
            </>
          }
        >
          <label className={s.lab}>
            Replay link for Session {replay.n}
            <input
              className={k.in}
              type="url"
              inputMode="url"
              placeholder="https://"
              value={replay.url}
              onChange={(e) => {
                const url = e.target.value;
                setReplay((x) => (x ? { ...x, url, err: '' } : x));
              }}
            />
          </label>
          <p className={clsx(k.p, k.me)}>Learners see the replay as ready. This action is audit-logged.</p>
          {replay.err ? (
            <p role="alert" className={clsx(k.p, s.err)}>
              {replay.err}
            </p>
          ) : null}
        </Modal>
      ) : null}
    </Page>
  );
}

export default Component;
