import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import { ics, sessionLabel } from '@ai/core';
import type { Learner } from '@ai/core';

import { Icon } from '../../components/Icon';
import { JoinButton } from '../../components/JoinButton';
import { StatusToken } from '../../components/StatusToken';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useNow, useViewer } from '../../data/hooks';
import { useJoin } from '../../data/join';
import { useShell } from '../../shell/ShellContext';
import { sessionsVM, type IcsDownload, type SessionsRowAction } from './Sessions.vm';
import s from './Sessions.module.css';

// Ported from design-reference/Portal Sessions.dc.html. Contract: SCREENS § 3.3.
//
// MARKUP ONLY: every string, state and calendar payload comes from `sessionsVM`. The screen's own
// jobs are the three things a pure model cannot do — write a Blob, raise a toast, and navigate.
//
// Phase 08 § 8.2 leaves every download here alone: all four — Add All Sessions to Calendar, each
// row's Add to Calendar and both upcoming office hours — are `.ics` files this browser serialises
// from the snapshot, with no object in the bucket to presign. § 8.4 does change Join.

/** The reference re-renders on a 15-second interval; the join window flips with it. */
const TICK_MS = 15000;

export function Component() {
  const db = useDb();
  const viewer = useViewer();
  const now = useNow(TICK_MS);
  const navigate = useNavigate();
  const { toast } = useToaster();
  const { openLocked } = useShell();
  const openJoin = useJoin();

  const actor = viewer.actor;
  const user: Learner | null =
    actor.kind === 'learner' ? (db.users.find((u) => u.id === actor.userId) ?? null) : null;

  const vm = useMemo(() => sessionsVM(db, user, now), [db, user, now]);

  /** `act.download` from the reference: serialise, hand the file over, then toast. */
  const save = useCallback(
    (d: IcsDownload) => {
      try {
        const url = URL.createObjectURL(new Blob([ics(d.events, now)], { type: 'text/calendar' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = d.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      } catch {
        /* A browser that refuses object URLs still gets the toast, exactly as the reference does. */
      }
      toast(d.toast);
    },
    [now, toast],
  );

  const run = useCallback(
    (a: SessionsRowAction) => {
      if (a.kind === 'calendar' && a.download) save(a.download);
      else if (a.kind === 'preview' && a.moduleId) openLocked(a.moduleId);
      else if (a.kind === 'watch' && a.moduleId) navigate(`/employees/${a.moduleId}`);
    },
    [navigate, openLocked, save],
  );

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div className={s.titles}>
          <h1 className={s.h1}>Sessions</h1>
          <p className={s.sub}>{vm.sub}</p>
        </div>
        <button type="button" className={s.calAll} onClick={() => save(vm.calAll)}>
          <Icon name="calPlus" size={15} strokeWidth={1.8} />
          Add All Sessions to Calendar
        </button>
      </div>

      <div className={s.body}>
        <section aria-label="Live sessions" className={s.list}>
          {vm.rows.map((r) => {
            const join = r.join;
            return (
              <div key={r.id} className={s.row} data-state={r.state} data-locked={r.locked || undefined}>
                <span className={s.ring}>
                  {r.state === 'past' ? (
                    <Icon name="check" size={15} strokeWidth={2.4} color="var(--status-success)" label="Held" />
                  ) : (
                    r.n
                  )}
                </span>

                <div className={s.mid}>
                  <div className={s.titleRow}>
                    <span className={s.title}>
                      {sessionLabel({ id: r.id, n: r.n })} · {r.title}
                    </span>
                    <StatusToken
                      kind={r.token.kind}
                      state={r.token.state}
                      tone={r.token.tone}
                      icon={r.token.icon}
                      label={r.token.label}
                    />
                  </div>
                  <div className={s.meta}>
                    <span>{r.module}</span>
                    <span>{r.when}</span>
                    <span>{r.mins} Min</span>
                    {r.extra ? <span>{r.extra}</span> : null}
                  </div>
                </div>

                <div className={s.actions}>
                  {join ? (
                    <JoinButton
                      mode={join.mode}
                      hint={join.hint}
                      url={join.url}
                      stack
                      // § 8.4: http mode resolves the URL from the server at click time; fixture
                      // mode keeps the prototype's `Opening Zoom · …` toast.
                      onJoin={() => void openJoin(r.id, () => toast(join.toast, 'info'))}
                    />
                  ) : null}
                  {r.actions.map((a) => (
                    <button
                      key={a.kind}
                      type="button"
                      className={s.action}
                      data-variant={a.variant}
                      onClick={() => run(a)}
                    >
                      <Icon name={a.icon} size={14} strokeWidth={1.9} />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <aside className={s.aside}>
          <section className={s.card}>
            <div>
              <div className={s.cardTitle}>Office Hours</div>
              <div className={s.cardSub}>
                Drop-In Build Help · {vm.ohDays} · {vm.ohTime}
              </div>
            </div>
            {vm.oh.map((o) => {
              const dl = o.download;
              return (
                <div key={o.label} className={s.ohRow} data-past={o.past || undefined}>
                  <span className={s.ohLabel}>{o.label}</span>
                  {o.posted ? <span className={s.ohPosted}>Recording Posted</span> : null}
                  {dl ? (
                    <button type="button" className={s.ohLink} onClick={() => save(dl)}>
                      Add to Calendar
                    </button>
                  ) : null}
                </div>
              );
            })}
          </section>

          <section className={clsx(s.card, s.attCard)}>
            <div className={s.cardTitle}>Your Attendance</div>
            <div className={s.attRow}>
              <span className={s.attNum}>{vm.att.attended}</span>
              <span className={s.attOf}>of {vm.att.held} Sessions Attended Live</span>
            </div>
            <div className={s.attNote}>
              Missed one? Every replay has chapters for the 6 build steps and a searchable
              transcript.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Component;
