import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type { ReplayVisibility, SessionType } from '@ai/core';
import { Icon } from '../../../components/Icon';
import { useToaster } from '../../../components/primitives/Toaster';
import { Button } from '../../../components/r2/Button';
import type { MenuEntry } from '../../../components/r2/Menu';
import { Confirm, Modal } from '../../../components/r2/Modal';
import { Status } from '../../../components/r2/Status';
import { Table } from '../../../components/r2/Table';
import type { Column } from '../../../components/r2/Table';
import { Sel, k } from '../../../components/r2/kit';
import { refusal, useAct, useDb, useMutate, useNow } from '../../../data/hooks';
import { REPLAY_LABELS, SESSION_KIND_LABELS, mtInputs } from '../WeekBuilder.vm';
import { filterRows, runRowsForForm, scheduleVM } from './cohort.vm';
import type { ScheduleFilter, ScheduleRowVM } from './cohort.vm';
import { LinkFacts, Field } from './parts';
import c from './Cohort.module.css';

// D-255 (R-5 Phase 3): Cohort › Schedule (`/admin/cohort/:cohortId/schedule`), the mockup's `CohortSchedule`: the fact
// strip, the note when weeks have no sessions ("Add N sessions", `addCohortSessions`), the filter, and every session in
// the mockup's table. Sessions are edited here and nowhere else (spec § 4, rule 4): Add session and Edit session are
// today's session form (`saveSession`, the week builder's, with its kind, week, times in MT and replay), Delete is
// `deleteSession`, and Go Live, End Session, Publish Replay and Attach replay keep working. Delete turned-in files moved
// to Settings › Clean-Up.

interface SessionForm {
  id?: string;
  kind: SessionType;
  moduleId: string;
  title: string;
  date: string;
  time: string;
  mins: string;
  zoom: string;
  replayVisibility: ReplayVisibility | null;
}

const BLANK: SessionForm = {
  kind: 'office_hours',
  moduleId: '',
  title: '',
  date: '',
  time: '12:00',
  mins: '60',
  zoom: '',
  replayVisibility: null,
};

export function Component() {
  const { cohortId = '' } = useParams();
  const db = useDb();
  const now = useNow();
  const act = useAct();
  const mutate = useMutate();
  const navigate = useNavigate();
  const { toast } = useToaster();
  const vm = useMemo(() => scheduleVM(db, cohortId, now), [db, cohortId, now]);
  const weeks = useMemo(() => runRowsForForm(db, cohortId), [db, cohortId]);
  // The filter is in the address (`?show=`), so the fact strip's counts open their own lists.
  const [params, setParams] = useSearchParams();
  const shown = params.get('show') as ScheduleFilter | null;
  const filter: ScheduleFilter = shown && vm?.filters.includes(shown) ? shown : 'All sessions';
  const setFilter = (f: ScheduleFilter) => setParams(f === 'All sessions' ? {} : { show: f }, { replace: true });
  const [form, setForm] = useState<SessionForm | null>(null);
  const [error, setError] = useState('');
  const [del, setDel] = useState<ScheduleRowVM | null>(null);
  const [replay, setReplay] = useState<{ id: string; title: string; url: string; err: string } | null>(null);

  const copy = useCallback(
    (url: string) => {
      try {
        void navigator.clipboard.writeText(url);
      } catch {
        /* no clipboard permission: confirm anyway, as before */
      }
      toast('Join link copied');
    },
    [toast],
  );

  if (!vm) return null;
  const rows = filterRows(vm.rows, filter);

  const edit = (r: ScheduleRowVM) => {
    const s = db.sessions.find((x) => x.id === r.id);
    if (!s) return;
    setError('');
    setForm({
      id: s.id,
      kind: s.kind ?? 'other',
      moduleId: s.moduleId ?? '',
      title: s.title,
      ...mtInputs(s.start),
      mins: String(s.mins),
      zoom: s.zoom,
      replayVisibility: s.replayVisibility ?? null,
    });
  };
  const save = async () => {
    if (!form) return;
    const out = await act('saveSession', {
      ...(form.id ? { id: form.id } : {}),
      cohortId,
      moduleId: form.moduleId || null,
      kind: form.kind,
      title: form.title,
      date: form.date,
      time: form.time,
      mins: form.mins,
      zoom: form.zoom,
      replayVisibility: form.replayVisibility,
    });
    if (out.error) setError(out.error);
    else setForm(null);
  };
  const attach = async () => {
    if (!replay) return;
    const out = await act('attachReplay', { sessionId: replay.id, url: replay.url });
    if (out.error) setReplay((x) => (x ? { ...x, err: out.error! } : x));
    else setReplay(null);
  };

  const menu = (r: ScheduleRowVM): MenuEntry[] => [
    { label: 'Edit session', onSelect: () => edit(r) },
    ...(r.zoomUrl ? [{ label: 'Copy join link', onSelect: () => copy(r.zoomUrl) }] : []),
    ...(r.week ? [{ label: 'Open the week', onSelect: () => void navigate(r.week!.to) }] : []),
    {
      label: 'Attach replay',
      disabled: !r.ended,
      title: r.ended ? undefined : 'Attach a replay after the session ends.',
      onSelect: () => setReplay({ id: r.id, title: r.title, url: r.replayUrl, err: '' }),
    },
    ...(r.primary
      ? [
          'separator' as const,
          {
            label: r.primary.label,
            onSelect: () =>
              void mutate(r.primary!.mutation, { sessionId: r.id }).then((o) => {
                const e = refusal(o);
                if (e) toast(e, 'warn');
              }),
          },
        ]
      : []),
    'separator' as const,
    { label: 'Delete session', onSelect: () => setDel(r) },
  ];

  const cols: Column<ScheduleRowVM>[] = [
    {
      key: 'title',
      label: 'Session',
      width: 'minmax(240px,1.6fr)',
      value: (r) => r.title,
      cell: (r) => (
        <div className={clsx(k.col, k.col0)}>
          <span className={clsx(k.w5, k.el)}>{r.title}</span>
          <span className={clsx(k.me, k.el)}>{r.kind}</span>
        </div>
      ),
    },
    {
      key: 'when',
      label: 'When',
      width: '230px',
      noSort: true,
      value: (r) => r.day,
      cell: (r) => (
        <div className={clsx(k.col, k.col0)}>
          <span className={clsx(k.w5, k.el)}>{r.day}</span>
          <span className={clsx(k.me, k.el)}>{r.time}</span>
        </div>
      ),
    },
    {
      key: 'week',
      label: 'Week',
      width: 'minmax(200px,1.2fr)',
      hideLap: true,
      value: (r) => r.week?.label ?? '',
      cell: (r) =>
        r.week ? (
          <Link className={clsx(k.lk, k.el)} to={r.week.to} onClick={(e) => e.stopPropagation()}>
            {r.week.label}
          </Link>
        ) : (
          <span className={k.mu}>None</span>
        ),
    },
    {
      key: 'zoom',
      label: 'Zoom link',
      width: '160px',
      value: (r) => r.zoom.label,
      cell: (r) => <Status tone={r.zoom.tone === 'warn' ? 'warn' : 'ok'}>{r.zoom.label}</Status>,
    },
    {
      key: 'reminder',
      label: 'Reminder',
      width: '112px',
      value: (r) => r.reminder.label,
      cell: (r) => (
        <Status tone={r.reminder.tone === 'info' ? 'info' : r.reminder.tone === 'ok' ? 'ok' : 'off'}>
          {r.reminder.label}
        </Status>
      ),
    },
  ];

  return (
    <div className={k.col}>
      {/* R-5 audit (D-267, spec § 4 rule 1): every number opens the list it counts; On the calendar opens every session. */}
      <LinkFacts
        items={vm.facts.map((f) =>
          f.label === 'Without a Zoom link' || f.label === 'Same time as another cohort'
            ? { ...f, to: `?show=${encodeURIComponent(f.label)}` }
            : f.label === 'On the calendar'
              ? { ...f, to: `?show=${encodeURIComponent('All sessions')}` }
              : f,
        )}
      />
      {vm.missing ? (
        <div className={c.infoNote}>
          <Icon name="r2Cohorts" size={16} strokeWidth={1.75} />
          <span className={c.noteText}>
            <b>
              Weeks {vm.missing.first} to {vm.missing.last} have no sessions yet.
            </b>{' '}
            The rhythm is {vm.missing.rhythm}, so they can be laid out for you.
          </span>
          <Button aria-label="Add the missing sessions" onClick={() => void act('addCohortSessions', { cohortId })}>
            Add {vm.missing.add} sessions
          </Button>
        </div>
      ) : null}
      {vm.clash && !vm.clash.kept ? (
        <div className={c.warnNote}>
          <Icon name="r2Incidents" size={16} strokeWidth={1.75} />
          <span className={c.noteText}>
            <b>
              {vm.clash.n} sessions are at the same time as {vm.clash.words}.
            </b>{' '}
            Pick another day or hour, or keep them if you mean to run them together.
          </span>
          <Button onClick={() => void act('keepCohortOverlap', { cohortId })}>Keep them together</Button>
        </div>
      ) : null}
      <div className={k.row}>
        <Sel aria-label="Kind" value={filter} onChange={(e) => setFilter(e.target.value as ScheduleFilter)}>
          {vm.filters.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </Sel>
        <span className={k.sp} />
        <Button
          kind="primary"
          icon="r2Plus"
          onClick={() => {
            setError('');
            setForm({ ...BLANK, moduleId: weeks.find((w) => w.n > 0)?.id ?? '' });
          }}
        >
          Add session
        </Button>
      </div>
      <Table
        label="Sessions"
        cols={cols}
        rows={rows}
        rowKey={(r) => r.id}
        onRow={edit}
        menu={menu}
        filtered={filter !== 'All sessions'}
        empty={{ icon: 'r2Cohorts', title: 'No sessions match', body: 'Try another filter.' }}
      />
      <p className={clsx(k.p, k.me)}>
        Sessions are edited here and nowhere else. A week shows its sessions but doesn’t change them. Times are
        Mountain, with Central after each for what learners see.
      </p>

      {form ? (
        <Modal
          title={form.id ? 'Edit Session' : 'Add Session'}
          onClose={() => setForm(null)}
          foot={
            <>
              <Button onClick={() => setForm(null)}>Cancel</Button>
              <Button kind="primary" onClick={() => void save()}>
                Save session
              </Button>
            </>
          }
        >
          {error ? (
            <div role="alert" className={c.err}>
              {error.split('\n').map((e) => (
                <p key={e} className={k.p}>
                  {e}
                </p>
              ))}
            </div>
          ) : null}
          <Field label="Kind">
            <Sel
              className={k.full}
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as SessionType })}
            >
              {Object.entries(SESSION_KIND_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Sel>
          </Field>
          <Field label="Week">
            <Sel
              className={k.full}
              value={form.moduleId}
              onChange={(e) => setForm({ ...form, moduleId: e.target.value })}
            >
              <option value="">None</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {`Week ${w.n} · ${w.title}`}
                </option>
              ))}
            </Sel>
          </Field>
          <Field label="Title">
            <input className={k.in} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <div className={c.g2}>
            <Field label="Date (MT)">
              <input
                className={k.in}
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Start (MT)">
              <input
                className={k.in}
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Length (minutes)">
            <input
              className={k.in}
              inputMode="numeric"
              value={form.mins}
              onChange={(e) => setForm({ ...form, mins: e.target.value })}
            />
          </Field>
          <Field label="Zoom link">
            <input className={k.in} value={form.zoom} onChange={(e) => setForm({ ...form, zoom: e.target.value })} />
          </Field>
          <Field label="Replay">
            <Sel
              className={k.full}
              value={form.replayVisibility ?? ''}
              onChange={(e) =>
                setForm({ ...form, replayVisibility: (e.target.value || null) as ReplayVisibility | null })
              }
            >
              <option value="">Not set</option>
              {Object.entries(REPLAY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Sel>
          </Field>
        </Modal>
      ) : null}

      {replay ? (
        <Modal
          title="Attach Replay"
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
          <Field label={`Replay link for ${replay.title}`}>
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
          </Field>
          <p className={clsx(k.p, k.me)}>Learners see the replay as ready. This action is audit-logged.</p>
          {replay.err ? (
            <p role="alert" className={clsx(k.p, c.err)}>
              {replay.err}
            </p>
          ) : null}
        </Modal>
      ) : null}

      {del ? (
        <Confirm
          title={`Delete “${del.title}”?`}
          body="The session leaves the calendar now. A session that has run stays on the record and can’t be deleted."
          cta="Delete session"
          danger
          onConfirm={() => void act('deleteSession', { id: del.id })}
          onClose={() => setDel(null)}
        />
      ) : null}
    </div>
  );
}

export default Component;
