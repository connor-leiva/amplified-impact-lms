import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { MasqueradeView } from '@ai/core';

import '../../styles/r2.css';
import { Icon } from '../Icon';
import { Button } from '../r2/Button';
import { Modal } from '../r2/Modal';
import { k } from '../r2/kit';
import { masquerade } from '../../data/masquerade';
import { useViewportWidth } from '../../shell/hooks';
import { MASQ_COPY, announcement, bannerVM } from '../../routes/console/masquerade.vm';
import { ReasonDialog } from './ReasonDialog';
import s from './Masquerade.module.css';

// What a masquerade puts above every page (D-162 3b, spec § 6 UI), mounted by the router's root and
// only while a session runs, so no page without one changes by a pixel:
//
//   - the banner, the mockup's `.mq` (BUILD-SPEC § 3's colours, its `.b` and `.b.p`, and the frame's
//     `.ax.msq` outline), with the spec's behaviour: sticky and in flow, a region named "Masquerade
//     session", a countdown on the server's clock that is not a live region (a hidden polite node
//     speaks at 5:00, 1:00 and the end), Extend (disabled at the cap, saying why) and Exit, which
//     also runs itself at 0:00;
//   - the reason dialog for Extend;
//   - the "Blocked while masquerading" dialog, the mockup's, opened by `data/http.ts`'s event.
//
// `data-r2-scope` gives them the R2 tokens on any page, and `--ai-masquerade-h` (the banner's height)
// lets a full-height shell make room for it.

export interface LayerProps {
  session: MasqueradeView;
  skew: number;
  /** The refused attempt, when the blocked dialog is open (null: open, attempt unknown). */
  blocked: { attempt: string | null } | null;
  onCloseBlocked: () => void;
}

const exit = () => {
  void masquerade.exit().catch(() => {});
};

export default function MasqueradeLayer({ session, skew, blocked, onCloseBlocked }: LayerProps) {
  const phone = useViewportWidth() < 768;
  const [now, setNow] = useState(() => Date.now() + skew);
  const [said, setSaid] = useState('');
  const [extending, setExtending] = useState(false);
  const last = useRef<number | null>(null);
  const bar = useRef<HTMLDivElement | null>(null);
  const vm = bannerVM(session, now, phone);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + skew), 1000);
    return () => clearInterval(t);
  }, [skew]);

  // Speak at 5:00, 1:00 and the end; at 0:00 Exit, as the server would end it anyway.
  useEffect(() => {
    const words = announcement(last.current, vm.seconds);
    last.current = vm.seconds;
    if (words) setSaid(words);
    if (vm.seconds === 0) exit();
  }, [vm.seconds]);

  useLayoutEffect(() => {
    const el = bar.current;
    const root = document.documentElement;
    if (!el) return;
    const put = () => root.style.setProperty('--ai-masquerade-h', `${el.offsetHeight}px`);
    put();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(put);
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      root.style.removeProperty('--ai-masquerade-h');
    };
  }, []);

  return (
    <div data-r2-scope="" style={{ display: 'contents' }}>
      <div ref={bar} className={s.mq} role="region" aria-label={MASQ_COPY.region} data-masquerade-banner="">
        <div className={s.who}>
          <span className={clsx(s.name, s.el)}>{vm.who}</span>
          {vm.reason ? <span className={clsx(s.reason, s.el)}>{vm.reason}</span> : null}
        </div>
        <span className={s.left} role="timer" aria-label={MASQ_COPY.timeLeft}>
          {vm.left}
        </span>
        <Button
          className={s.b}
          disabled={vm.extend.disabled}
          title={vm.extend.title}
          onClick={() => setExtending(true)}
        >
          {vm.extend.label}
        </Button>
        <Button className={clsx(s.b, s.p, s.primary)} onClick={exit}>
          {vm.exit}
        </Button>
        <span className={k.srOnly} aria-live="polite">
          {said}
        </span>
      </div>
      <div className={s.frame} aria-hidden="true" />
      {extending ? (
        <ReasonDialog
          mode="extend"
          onCancel={() => setExtending(false)}
          onSubmit={async (reason) => {
            await masquerade.extend(reason);
            setExtending(false);
          }}
        />
      ) : null}
      {blocked ? (
        <Modal
          title={MASQ_COPY.blocked.title}
          onClose={onCloseBlocked}
          foot={
            <>
              <Button onClick={onCloseBlocked}>{MASQ_COPY.blocked.close}</Button>
              <Button kind="primary" className={s.primary} onClick={exit}>
                {MASQ_COPY.exit}
              </Button>
            </>
          }
        >
          {blocked.attempt ? (
            <div className={s.note}>
              <Icon name="r2Lock" size={16} strokeWidth={1.75} />
              <span className={s.attempt}>{blocked.attempt}</span>
            </div>
          ) : null}
          <p className={clsx(k.p, k.s2)}>{MASQ_COPY.blocked.body(session.target.name)}</p>
          <p className={clsx(k.p, k.me)}>{MASQ_COPY.blocked.logged}</p>
        </Modal>
      ) : null}
    </div>
  );
}
