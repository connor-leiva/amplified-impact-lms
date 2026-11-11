import { useEffect, useRef, useState } from 'react';
import { sessionLabel } from '@ai/core';
import type { SessionVM } from '@ai/core';
import { Icon } from './Icon';
import { JoinButton } from './JoinButton';
import s from './SessionCard.module.css';

// Ported from design-reference/Session Card.dc.html. Contract: SCREENS § 5.4.
//
// The card renders `sessionVM` and nothing else: every string, the countdown units and the
// primary action are decided in @ai/core, never here.

export type CalKind = 'google' | 'outlook' | 'ics';

export interface SessionCardProps {
  vm: SessionVM;
  onJoin(): void;
  onCal(kind: CalKind): void;
  onWatch(): void;
  onKit(): void;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

/** The calendar menu, verbatim from the reference. SCREENS § 5.4 writes these differently. */
const CAL_ITEMS: { kind: CalKind; label: string; hint: string }[] = [
  { kind: 'google', label: 'Google Calendar', hint: 'New Tab' },
  { kind: 'outlook', label: 'Outlook', hint: 'New Tab' },
  { kind: 'ics', label: 'Apple or Other', hint: '.Ics File' },
];

export function SessionCard({ vm, onJoin, onCal, onWatch, onKit, force = '' }: SessionCardProps) {
  const [calOpen, setCalOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const jt = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (jt.current) clearTimeout(jt.current);
    },
    [],
  );

  // The join handshake: 900 ms of `loading` stands in for resolving the Zoom URL (phase 08).
  const join = () => {
    setJoining(true);
    if (jt.current) clearTimeout(jt.current);
    jt.current = setTimeout(() => {
      setJoining(false);
      onJoin();
    }, 900);
  };

  const pick = (kind: CalKind) => {
    setCalOpen(false);
    onCal(kind);
  };

  const fb = force === 'hover' || force === 'focus' ? force : undefined;
  const hasCountdown = !!vm.countdown?.length;
  const noteIcon = vm.variant === 'ended_processing' ? 'clock' : 'checkCircle';

  return (
    <section
      aria-label={`${vm.kicker}: ${sessionLabel({ id: vm.sessionId, n: vm.n })}`}
      className={s.card}
      data-variant={vm.variant}
      data-force={force || undefined}
    >
      <div className={s.left}>
        <div className={s.kickerRow}>
          {vm.live ? (
            <span className={s.liveBadge}>
              <span className={s.pulse} />
              LIVE
            </span>
          ) : null}
          <span className={s.kicker}>{vm.kicker}</span>
          {vm.live ? (
            <span role="timer" aria-live="off" className={s.elapsed}>
              {vm.elapsed} Elapsed
            </span>
          ) : null}
        </div>
        <div className={s.title}>
          {sessionLabel({ id: vm.sessionId, n: vm.n })} · {vm.title}
        </div>
        <div className={s.meta}>
          <span>{vm.module}</span>
          <span>{vm.when}</span>
          <span>
            {vm.mins} Min with {vm.instructor}
          </span>
        </div>
        {vm.note ? (
          <div className={s.note}>
            <Icon name={noteIcon} size={15} strokeWidth={1.8} color="var(--text-tertiary)" />
            {vm.note}
          </div>
        ) : null}
      </div>

      {hasCountdown ? (
        <>
          <div role="timer" aria-live="off" aria-label={vm.aria} className={s.countdown}>
            {vm.countdown!.map((u) => (
              <div key={u.l} className={s.unit}>
                <div className={s.digits}>{u.v}</div>
                <div className={s.unitLabel}>{u.l}</div>
              </div>
            ))}
          </div>
          {/* Announces at the hour, 10-minute and 1-minute boundaries. The tiles above are
              aria-live="off" so the seconds never speak. */}
          <span aria-live="polite" className={s.srOnly}>
            {vm.aria}
          </span>
        </>
      ) : null}

      <div className={s.actions}>
        {vm.primary === 'calendar' ? (
          <div className={s.calWrap}>
            <button
              type="button"
              className={s.calBtn}
              data-force={fb}
              aria-expanded={calOpen ? 'true' : 'false'}
              onClick={() => setCalOpen((o) => !o)}
            >
              <Icon name="calPlus" size={16} strokeWidth={1.9} />
              Add to Calendar
              <Icon name="chevD" size={14} strokeWidth={2} className={s.chev} />
            </button>
            {calOpen ? (
              <div role="menu" className={s.menu}>
                {CAL_ITEMS.map((ci) => (
                  <button
                    key={ci.kind}
                    type="button"
                    role="menuitem"
                    className={s.menuItem}
                    onClick={() => pick(ci.kind)}
                  >
                    {ci.label}
                    <span className={s.menuHint}>{ci.hint}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {vm.join ? (
          <JoinButton
            mode={joining ? 'loading' : vm.join}
            hint={vm.hint}
            url={vm.zoom}
            stack
            force={force}
            onJoin={join}
          />
        ) : null}

        {vm.primary === 'watch' ? (
          <button type="button" className={s.watchBtn} data-force={fb} onClick={onWatch}>
            <Icon name="play" size={14} filled />
            Watch Replay
          </button>
        ) : null}

        {vm.primary === 'kit' ? (
          <button type="button" className={s.kitBtn} data-force={fb} onClick={onKit}>
            Open the Build Kit
          </button>
        ) : null}
      </div>
    </section>
  );
}
