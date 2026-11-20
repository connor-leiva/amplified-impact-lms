// Step rail, as recorded in interaction-demo.mp4: every step is a labeled 40px pill (number circle + title)
// in the shared horizontal scroller (.hs: snap, 44px/24px edge fades, arrows only on a side with more).
//   done     -> energy circle with a white check
//   current  -> forest pill, translucent number circle (energy-bright circle once the step is marked done)
//   upcoming -> bone number circle
//   waiting  -> dashed number circle
// Motion (Amplified Impact Motion v1): hover is a colour change, press squeezes and springs back, and when the
// current step is marked done its check draws (lesson tier). The rail rises in with the page (--i 0).
// The current step is brought into view on load (no visible change for steps 1 to 3).
import { useLayoutEffect, useRef } from 'react';
import type { MotionStyle } from '@brand/ai-motion';
import { Icon, PillCheck } from './Icons';
import { useHScroller } from './useHScroller';
import type { SpPill } from './types';

/** PillVM.status -> the mockup's data-s. */
const dataS = (p: SpPill, currentDone: boolean) => {
  if (p.on) return currentDone ? 'done' : 'current';
  return p.status === 'done' ? 'done' : p.status === 'waiting' ? 'waiting' : 'up';
};

/** The mockup's aria-label, fixed at load. */
const ariaOf = (p: SpPill) =>
  `Step ${p.n}, ${p.title}${p.on ? ', current step' : p.status === 'done' ? ', done' : p.status === 'waiting' ? ', waiting on another step' : ''}`;

/** The check that draws when the current step is marked done (pathLength 1, brand aim-draw). */
function DrawCheck() {
  return (
    <svg className="draw" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path pathLength="1" d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

function CurrentNumber({ n, done }: { n: number; done: boolean }) {
  // Done on load: the plain check (nothing to animate). Marked done here: the drawing check.
  const doneAtLoad = useRef(done);
  if (!done) { doneAtLoad.current = false; return <span>{n}</span>; }
  return doneAtLoad.current ? <PillCheck /> : <DrawCheck />;
}

export function StepRail({ pills, label, currentDone, scrollLeftLabel = 'Scroll steps left', scrollRightLabel = 'Scroll steps right' }: {
  pills: SpPill[]; label: string; currentDone: boolean; scrollLeftLabel?: string; scrollRightLabel?: string;
}) {
  const hs = useHScroller();
  const currentRef = useRef<HTMLAnchorElement | null>(null);
  useLayoutEffect(() => {
    const go = () => hs.center(currentRef.current, 'instant');
    go();
    document.fonts?.ready.then(go);
  }, []);

  return (
    <div className="hs steps aim-rise" style={{ '--i': 0 } as MotionStyle} id="pills-hs">
      <button className="icon-btn hs-prev" type="button" aria-label={scrollLeftLabel} hidden={!hs.fadeL} onClick={hs.prev}><Icon name="left" /></button>
      <nav className={'hs-row' + (hs.fadeR ? ' fade-r' : '') + (hs.fadeL ? ' fade-l' : '')} id="pills" aria-label={label} ref={hs.row}>
        {pills.map((p) => {
          const s = dataS(p, currentDone);
          return (
            <a key={p.n} ref={p.on ? currentRef : undefined} className="stp" href={p.href}
              onClick={p.href === '#' ? (e) => e.preventDefault() : undefined}
              data-s={s} data-n={p.n} aria-current={p.on ? 'step' : undefined} aria-label={ariaOf(p)}>
              <span className="stp-n" aria-hidden="true">
                {p.on ? <CurrentNumber n={p.n} done={currentDone} /> : s === 'done' ? <PillCheck /> : <span>{p.n}</span>}
              </span>
              <span className="stp-t">{p.title}</span>
            </a>
          );
        })}
      </nav>
      <button className="icon-btn hs-next" type="button" aria-label={scrollRightLabel} hidden={!hs.fadeR} onClick={hs.next}><Icon name="right" /></button>
    </div>
  );
}
