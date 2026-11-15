import { useCallback, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Drawer } from '../../components/primitives/Drawer';
import { Field, Input } from '../../components/primitives/Field';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useMutate, useNow } from '../../data/hooks';
import { cohortsVM, sessionForm, type SessionForm } from './Cohorts.vm';
import s from './Cohorts.module.css';

// Admin Cohorts & Sessions `/admin/cohorts`, ported from design-reference/Admin Cohorts.dc.html.
// Contract: SCREENS § 4.4, phase 06 § 6.1.
//
// MARKUP ONLY: every string, status, percentage and bar width comes from `cohortsVM`, and every
// write goes through `useMutate`, which already raises the toast. The screen handles `error` and
// the three things a pure model cannot do — hold the selection, hold the drawer's draft, and write
// to the clipboard.
//
// The drawer is a sibling of the page, as in the reference, and stays mounted so its 240 ms slide
// runs in both directions. Its fields are always in the DOM, again as the reference renders them;
// while closed the Drawer primitive marks the panel `inert` and `aria-hidden`, and it carries
// `data-drawer="open"` only while open (CLAUDE.md › Required landmarks).

/** The reference's initial `state = { sel: 'dec26', … }`. */
const FIRST_COHORT = 'dec26';

const EMPTY_FORM: SessionForm = { title: '', date: '', time: '', mins: '', zoom: '' };

interface Ui {
  sel: string;
  /** Set by `New Cohort`: the newest draft is always the one with the latest start. */
  latest: boolean;
  editId: string | null;
  form: SessionForm;
  err: string;
}

export function Component() {
  const db = useDb();
  const now = useNow();
  const mutate = useMutate();
  const { toast } = useToaster();

  const [ui, setUi] = useState<Ui>({
    sel: FIRST_COHORT,
    latest: false,
    editId: null,
    form: EMPTY_FORM,
    err: '',
  });

  // `createCohort` mints the id server-side, so the screen asks for "the latest one" instead of
  // guessing it. By construction the new draft starts 63+ days after every existing cohort.
  const newest = useMemo(
    () => db.cohorts.slice().sort((a, b) => b.start - a.start)[0] ?? null,
    [db.cohorts],
  );
  const selectedId = ui.latest && newest ? newest.id : ui.sel;

  const vm = useMemo(() => cohortsVM(db, now, selectedId), [db, now, selectedId]);

  const pick = useCallback((id: string) => {
    setUi((u) => ({ ...u, sel: id, latest: false }));
  }, []);

  const warn = useCallback(
    (error: string | undefined) => {
      if (error) toast(error, 'warn');
    },
    [toast],
  );

  const addCohort = useCallback(async () => {
    const r = await mutate('createCohort', {});
    if (r.error) warn(r.error);
    else setUi((u) => ({ ...u, latest: true }));
  }, [mutate, warn]);

  const openEnrollment = useCallback(
    async (cohortId: string) => {
      warn((await mutate('openEnrollment', { cohortId })).error);
    },
    [mutate, warn],
  );

  const runPrimary = useCallback(
    async (mutation: 'goLive' | 'endSession' | 'publishReplay', sessionId: string) => {
      warn((await mutate(mutation, { sessionId })).error);
    },
    [mutate, warn],
  );

  /** `act.copy` in the prototype: write the link, then confirm either way. */
  const copyZoom = useCallback(
    (url: string) => {
      try {
        void navigator.clipboard.writeText(url);
      } catch {
        /* no clipboard permission; the reference confirms regardless */
      }
      toast('Zoom link copied');
    },
    [toast],
  );

  const openEdit = useCallback(
    (sessionId: string) => {
      const sess = db.sessions.find((x) => x.id === sessionId);
      if (!sess) return;
      setUi((u) => ({ ...u, editId: sess.id, form: sessionForm(sess), err: '' }));
    },
    [db.sessions],
  );

  const closeEdit = useCallback(() => {
    setUi((u) => ({ ...u, editId: null, form: EMPTY_FORM, err: '' }));
  }, []);

  const setField = useCallback((k: keyof SessionForm, v: string) => {
    setUi((u) => ({ ...u, form: { ...u.form, [k]: v } }));
  }, []);

  const saveSession = useCallback(async () => {
    if (!ui.editId) return;
    const r = await mutate('updateSession', { id: ui.editId, ...ui.form });
    if (r.error) setUi((u) => ({ ...u, err: r.error! }));
    else closeEdit();
  }, [closeEdit, mutate, ui.editId, ui.form]);

  const editing = ui.editId ? (db.sessions.find((x) => x.id === ui.editId) ?? null) : null;
  const cohortName = vm.cohorts.find((c) => c.id === vm.selectedId)?.name ?? '';
  const f = ui.form;

  return (
    <>
      <div className={s.page}>
        <div className={s.head}>
          <div>
            <h1 className={s.h1}>Cohorts &amp; Sessions</h1>
            <p className={s.sub}>
              Each cohort runs the same six live builds on its own schedule and roster.
            </p>
          </div>
        </div>

        <div className={s.cards}>
          {vm.cohorts.map((c) => (
            <button
              key={c.id}
              type="button"
              className={s.card}
              data-selected={c.selected ? 'true' : undefined}
              aria-pressed={c.selected}
              onClick={() => pick(c.id)}
            >
              <div className={s.cardTop}>
                <span className={s.cardName}>{c.name}</span>
                <span className={s.token} data-tone={c.tone}>
                  <span aria-hidden="true" className={s.dot} />
                  {c.statusLabel}
                </span>
              </div>
              <div className={s.cardMeta}>
                {c.range} · {c.cadence}
              </div>
              <div className={s.bar}>
                <div className={s.track}>
                  <div className={s.fill} style={{ '--w': c.fill } as React.CSSProperties} />
                </div>
                <span className={s.count}>
                  {c.enrolled} / {c.capacity}
                </span>
              </div>
            </button>
          ))}
          <button type="button" className={s.newCohort} onClick={() => void addCohort()}>
            <Icon name="plus" size={16} strokeWidth={2} />
            New Cohort
          </button>
        </div>

        <section className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <div className={s.panelTitle}>{vm.head ? vm.head.title : ''}</div>
              <div className={s.panelNote}>{vm.head ? vm.head.note : ''}</div>
            </div>
            {vm.head?.canOpen ? (
              <button
                type="button"
                className={s.openEnrollment}
                onClick={() => void openEnrollment(vm.head!.cohortId)}
              >
                Open Enrollment
              </button>
            ) : null}
          </div>
          <div className={s.scroller} data-phone="tscroll">
            <div className={s.table} data-phone="tmin">
              <div className={s.tHead} data-phone="thead">
                <span>#</span>
                <span>Session</span>
                <span>Date &amp; Time</span>
                <span>Zoom</span>
                <span>Status</span>
                <span>Attendance</span>
                <span className={s.tHeadActions}>Actions</span>
              </div>
              {vm.rows.map((r) => (
                <div key={r.id} className={s.row} data-next={r.isNext ? 'true' : undefined} data-phone="card">
                  <span className={s.n}>{r.n}</span>

                  <div className={s.sessionCell} data-phone="cell-grow">
                    <div className={s.sessionTitle}>{r.title}</div>
                    <div className={s.sessionModule}>{r.module}</div>
                  </div>

                  <div className={s.whenCell} data-phone="cell" data-label="Date & Time">
                    {r.day}
                    <div className={s.whenTime}>{r.time}</div>
                  </div>

                  <button
                    type="button"
                    className={s.zoom}
                    title="Copy Zoom link"
                    data-phone="cell"
                    onClick={() => copyZoom(r.zoomUrl)}
                  >
                    <span className={s.zoomText}>{r.zoom}</span>
                    <Icon name="copy" size={12} strokeWidth={2} />
                  </button>

                  <span className={`${s.token} ${s.rowToken}`} data-tone={r.tone}>
                    <span
                      aria-hidden="true"
                      className={s.dot}
                      data-pulse={r.pulse ? 'true' : undefined}
                    />
                    {r.statusLabel}
                  </span>

                  <span className={s.att} data-phone="cell" data-label="Attendance">
                    {r.att}
                  </span>

                  <div className={s.actions} data-phone="cell-actions">
                    {r.primary ? (
                      <button
                        type="button"
                        className={s.primary}
                        data-variant={r.primary.variant}
                        onClick={() => void runPrimary(r.primary!.mutation, r.id)}
                      >
                        {r.primary.label}
                      </button>
                    ) : null}
                    <button type="button" className={s.edit} onClick={() => openEdit(r.id)}>
                      <Icon name="pencil" size={13} strokeWidth={1.9} />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Drawer
        open={ui.editId !== null}
        onClose={closeEdit}
        title={`Edit Session ${editing ? editing.n : ''}`}
        description={`${cohortName} · Changes Appear in the Portal Immediately`}
        width={440}
        variant="surface"
        footer={
          <>
            <button type="button" className={s.cancel} onClick={closeEdit}>
              Cancel
            </button>
            <button type="button" className={s.save} onClick={() => void saveSession()}>
              Save Session
            </button>
          </>
        }
      >
        <Field label="Title" variant="sunken">
          <Input value={f.title} onChange={(e) => setField('title', e.target.value)} />
        </Field>

        <div className={s.pair} data-phone="stack">
          <Field label="Date" variant="sunken">
            <Input
              type="date"
              className={s.stamp}
              value={f.date}
              onChange={(e) => setField('date', e.target.value)}
            />
          </Field>
          <Field label="Start Time (CT)" variant="sunken">
            <Input
              type="time"
              className={s.stamp}
              value={f.time}
              onChange={(e) => setField('time', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Duration (Minutes)" variant="sunken">
          <Input
            type="number"
            min={15}
            step={15}
            value={f.mins}
            onChange={(e) => setField('mins', e.target.value)}
          />
        </Field>

        <Field label="Zoom Link" variant="sunken">
          <Input
            className={s.mono}
            value={f.zoom}
            onChange={(e) => setField('zoom', e.target.value)}
          />
        </Field>

        <div className={s.info}>
          Learners with reminders on get the updated time and link automatically. The dashboard
          countdown updates as soon as you save.
        </div>

        {ui.err ? <div className={s.error}>{ui.err}</div> : null}
      </Drawer>
    </>
  );
}

export default Component;
