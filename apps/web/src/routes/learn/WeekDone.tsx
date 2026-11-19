// D-198: the first time a learner finishes Week 0. One overlay, then a preference so it does not return.
// Reduced motion gets a static banner. Staff preview never mounts this, so it never writes.

import { useEffect, useState } from 'react';
import { BrandSlot } from '../../shell/BrandSlot';
import { useMutate } from '../../data/hooks';
import s from './WeekDone.module.css';

export const WEEK_DONE = {
  line: "Week 0 done. You're at the starting line.",
  continue: 'Continue',
} as const;

const REDUCE = '(prefers-reduced-motion: reduce)';

export function WeekDone({ onDone }: { onDone: () => void }) {
  const mutate = useMutate();
  const reduce = typeof matchMedia === 'function' && matchMedia(REDUCE).matches;
  const [ready, setReady] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const id = window.setTimeout(() => setReady(true), 1800);
    return () => window.clearTimeout(id);
  }, [reduce]);
  const finish = () => {
    void mutate('setPref', { key: 'week0-done', value: '1' });
    onDone();
  };
  if (reduce) {
    return (
      <div className={s.banner} role="status">
        <p>{WEEK_DONE.line}</p>
        <button type="button" className={s.go} onClick={finish}>{WEEK_DONE.continue}</button>
      </div>
    );
  }
  return (
    <div className={s.overlay} role="dialog" aria-label={WEEK_DONE.line}>
      <div className={s.mark}>
        <span className={s.ring} aria-hidden="true" />
        <BrandSlot kind="mark" />
      </div>
      {ready ? (
        <>
          <p className={s.line}>{WEEK_DONE.line}</p>
          <button type="button" className={s.go} onClick={finish}>{WEEK_DONE.continue}</button>
        </>
      ) : null}
    </div>
  );
}
