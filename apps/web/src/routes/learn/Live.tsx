// D-183: a week's live session where the learner portal v2 draws it, as one self-contained piece each
// page adds with a single line: the week page (under its header) and the step player (on a live-build
// step, above the step). Join while a session of the week can be joined (the live badge once it is
// live), the replay player once the replay is published, or the current portal's "Replay Processing"
// in between; on a step, "Watch at mm:ss" seeks the player to the step's chapter.
//
// It reads what the shell hands every screen (the course with the Console's state on its sessions, the
// snapshot, the viewer, the ticking clock), so the pages pass only which week and step. Markup only:
// every string is Replay.vm.ts's.

import { useMemo, useRef } from 'react';
import { learnerOf } from '@ai/core/learner';
import { Icon } from '../../components/Icon';
import { useLearn } from './data';
import { weekRows } from './learn.vm';
import { Replay } from './Replay';
import type { SeekRef } from './Replay';
import { stepLiveVM, weekLiveVM } from './Replay.vm';
import type { ReplayWho, WeekSessionVM } from './Replay.vm';
import { JoinStrip } from './parts';
import s from './Learn.module.css';

function useLive() {
  const { course, db, viewer, now } = useLearn();
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const payload = course.kind === 'ready' ? course.payload : null;
  const rows = useMemo(() => (payload ? weekRows(payload, db, me) : []), [payload, db, me]);
  const who: ReplayWho = { db, me };
  return { payload, rows, who, now };
}

function Session({ session, week, seekRef }: { session: WeekSessionVM; week: number; seekRef?: SeekRef }) {
  const { rows, who, now } = useLive();
  if (!session) return null;
  if (session.kind === 'join')
    return (
      <section className={`${s.cd} ${s.jcd}`} data-state={session.join.state} aria-label={session.join.badge}>
        <JoinStrip j={session.join} />
      </section>
    );
  if (session.kind === 'processing')
    return (
      <section className={`${s.cd} ${s.jcd}`} aria-label={session.badge}>
        <div className={s.jst}>
          <span className={s.ost}>
            <Icon name="clock" size={13} strokeWidth={1.9} />
            {session.badge}
          </span>
          <span className={`${s.colZ} ${s.grow}`}>
            <span className={s.w5}>{session.title}</span>
            <span className={s.me}>
              {session.when} · {session.note}
            </span>
          </span>
        </div>
      </section>
    );
  const m = rows.find((r) => r.week === week)?.module;
  return m ? <Replay key={m.id} who={who} m={m} now={now} seekRef={seekRef} /> : null;
}

/** The week page's live session, under its header. */
export function WeekLive({ week }: { week: number }) {
  const { payload, rows, who, now } = useLive();
  if (!payload) return null;
  return <Session session={weekLiveVM(payload, rows, who, week, now)} week={week} />;
}

/** A live-build step's live session, above the step: Join, the replay with "Watch at", or processing. */
export function StepLive({ week, step }: { week: number; step: number }) {
  const { payload, rows, who, now } = useLive();
  const seekRef: SeekRef = useRef(null);
  const vm = payload ? stepLiveVM(payload, rows, who, week, step - 1, now) : null;
  if (!vm || !vm.session) return null;
  return (
    <div className={s.col} style={{ gap: 8 }}>
      {vm.watch ? (
        <button type="button" className={`${s.lk} ${s.wat}`} onClick={() => seekRef.current?.(vm.watch!.at, true)}>
          <Icon name="play" size={10} filled />
          {vm.watch.label}
        </button>
      ) : null}
      <Session session={vm.session} week={week} seekRef={seekRef} />
    </div>
  );
}
